import os, sys, requests, json

# Read env
env = {}
with open(os.path.expanduser('~/Projekte/fussball-tipprunde/.env')) as f:
    for line in f:
        if '=' in line and not line.startswith('#'):
            k, v = line.strip().split('=', 1)
            env[k.strip()] = v.strip()

URL = env['VITE_SUPABASE_URL']
KEY = env['SUPABASE_SERVICE_ROLE_KEY']

# Read migration
with open(os.path.expanduser('~/Projekte/fussball-tipprunde/supabase/migrations/028_distance_based_scoring.sql')) as f:
    sql = f.read()

headers = {
    'apikey': KEY,
    'Authorization': f'Bearer ***    'Content-Type': 'application/json',
    'Prefer': 'params=single-object'
}

# Try management API SQL endpoint
mgmt_url = f'{URL}/rest/v1/'

# Use Supabase Management API to run SQL
# The SQL endpoint is at /pg/query for newer Supabase or we try the REST API
# Actually, let's use the supabase-py approach through the REST API

# Split SQL into individual statements
import re
statements = [s.strip() for s in re.split(r';(?:\s*\n)+', sql) if s.strip() and not s.strip().startswith('--')]

print(f"Executing {len(statements)} statements...")

for i, stmt in enumerate(statements):
    short = stmt[:100].replace('\n', ' ')
    print(f"\n[{i+1}/{len(statements)}] {short}...")
    
    # Try exec_sql RPC if it exists
    try:
        r = requests.post(
            f'{URL}/rest/v1/rpc/exec_sql',
            headers=headers,
            json={'query': stmt},
            timeout=30
        )
        print(f"  exec_sql: {r.status_code} {r.text[:200]}")
    except Exception as e:
        print(f"  exec_sql failed: {e}")
    
    # Fallback: try raw SQL endpoint
    try:
        r2 = requests.post(
            f'{URL}/pg/query',
            headers={'apikey': KEY, 'Authorization': f'Bearer ***            'Content-Type': 'application/json'},
            json={'query': stmt},
            timeout=30
        )
        if r2.status_code < 500:
            print(f"  pg/query: {r2.status_code} {r2.text[:200]}")
    except Exception as e:
        print(f"  pg/query failed: {e}")

print("\nDone.")
