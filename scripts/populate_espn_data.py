"""Fetch ESPN logos/venue/event-IDs for finished World Cup matches and update DB."""
import json, urllib.request, os, subprocess, unicodedata, re
from collections import defaultdict
from datetime import datetime, timedelta

# Read env
env = {}
with open(os.path.join(os.path.dirname(__file__), '..', '.env')) as f:
    for line in f:
        line = line.strip()
        if '=' in line and not line.startswith('#'):
            k, v = line.split('=', 1)
            env[k] = v

SUPABASE_URL = env['VITE_SUPABASE_URL']
SERVICE_KEY = env['SUPABASE_SERVICE_ROLE_KEY']
ESPN_CODES = {'World Cup 2026': 'fifa.world', 'Champions League': 'uefa.champions', 'Süper Lig': 'tur.1'}

def clean_name(name):
    if not name: return ""
    return re.sub(r'[^a-z0-9]', '', unicodedata.normalize('NFD', name.lower()).replace('ı', 'i'))

def supabase_get(path):
    cmd = ['curl', '-s', f'{SUPABASE_URL}/rest/v1/{path}',
           '-H', f'apikey: {SERVICE_KEY}', '-H', f'Authorization: Bearer {SERVICE_KEY}']
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode == 0 and r.stdout.strip():
        return json.loads(r.stdout)
    return None

def supabase_patch(match_id, payload):
    cmd = ['curl', '-s', '-X', 'PATCH',
           f'{SUPABASE_URL}/rest/v1/matches?id=eq.{match_id}',
           '-H', f'apikey: {SERVICE_KEY}',
           '-H', f'Authorization: Bearer {SERVICE_KEY}',
           '-H', 'Content-Type: application/json',
           '-H', 'Prefer: return=minimal',
           '-d', json.dumps(payload)]
    r = subprocess.run(cmd, capture_output=True, text=True)
    return r.returncode == 0

# 1. Get all matches without ESPN logos
print("Fetching matches without ESPN data...")
matches = supabase_get('matches?select=id,heim_team,gast_team,spieltag,tournament,anpfiff&or=(spieltag.eq.4,spieltag.eq.5)&heim_logo=is.null&order=spieltag,anpfiff')

if not matches:
    print("No matches to update")
    exit()

print(f"Found {len(matches)} matches without logos")

# 2. Group by tournament and date
by_key = defaultdict(list)
for m in matches:
    dt = datetime.fromisoformat(m['anpfiff'].replace('Z', '+00:00'))
    start = dt - timedelta(days=2)
    end = dt + timedelta(days=1)
    ds = f"{start.year}{start.month:02d}{start.day:02d}-{end.year}{end.month:02d}{end.day:02d}"
    key = (m['tournament'], ds)
    by_key[key].append(m)

# 3. Fetch ESPN and match
updates = []
for (tournament, ds), match_list in sorted(by_key.items()):
    code = ESPN_CODES.get(tournament, 'fifa.world')
    espn_url = f'http://site.api.espn.com/apis/site/v2/sports/soccer/{code}/scoreboard?dates={ds}'
    print(f'Fetching ESPN: {ds} ({tournament})...')
    try:
        req = urllib.request.Request(espn_url)
        with urllib.request.urlopen(req, timeout=15) as resp:
            espn_data = json.loads(resp.read())
    except Exception as e:
        print(f'  Error: {e}')
        continue

    if not espn_data.get('events'):
        print('  No events found')
        continue

    # Build lookup
    espn_lookup = {}
    for ev in espn_data['events']:
        comp = ev['competitions'][0]
        home = next((c for c in comp['competitors'] if c['homeAway'] == 'home'), None)
        away = next((c for c in comp['competitors'] if c['homeAway'] == 'away'), None)
        if home and away:
            pair_key = f"{clean_name(home['team']['name'])}_vs_{clean_name(away['team']['name'])}"
            espn_lookup[pair_key] = {
                'home_logo': home['team'].get('logo', ''),
                'away_logo': away['team'].get('logo', ''),
                'venue': comp.get('venue', {}).get('fullName', ''),
                'espn_id': str(ev['id']),
            }

    for m in match_list:
        pair = f"{clean_name(m['heim_team'])}_vs_{clean_name(m['gast_team'])}"
        espn = espn_lookup.get(pair)
        if not espn or not espn['home_logo']:
            pair_rev = f"{clean_name(m['gast_team'])}_vs_{clean_name(m['heim_team'])}"
            espn = espn_lookup.get(pair_rev)
            if espn and espn['home_logo']:
                espn = {**espn, 'home_logo': espn['away_logo'], 'away_logo': espn['home_logo']}
        
        if espn and espn['home_logo']:
            updates.append((m['id'], espn))
            print(f'  ✓ {m["heim_team"]} vs {m["gast_team"]} -> espn={espn["espn_id"]} venue={espn["venue"][:40] if espn["venue"] else "-"}')
        else:
            print(f'  ✗ {m["heim_team"]} vs {m["gast_team"]} — no match')

# 4. Update DB
print(f'\n=== Updating {len(updates)} matches ===')
success = 0
for match_id, espn in updates:
    payload = {'heim_logo': espn['home_logo'], 'gast_logo': espn['away_logo'],
               'venue': espn['venue'], 'espn_id': espn['espn_id']}
    if supabase_patch(match_id, payload):
        success += 1
    else:
        print(f'  ✗ Failed {match_id[:8]}...')

print(f'\nDone! {success}/{len(updates)} matches updated with ESPN data.')
