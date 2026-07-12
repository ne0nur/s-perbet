#!/data/data/com.termux/files/usr/bin/bash
# ============================================================
#  SuperBET WM 2026 — Smart Sync
#  Passt Frequenz an echten Spielplan an (~80 API-Calls/Tag)
# ============================================================

URL="https://ynkdtqhhnxmpqvdbzzqk.supabase.co/functions/v1/sync-match-results"

# KEY von CachyOS holen und hier einfügen:
#    cat ~/Projekte/fussball-tipprunde/.env | grep SERVICE_ROLE
SERVICE_KEY="PASTE_YOUR_KEY_HERE"

# Off days (keine WM-Spiele an diesen Tagen)
OFF_DAYS="2026-07-08 2026-07-13 2026-07-16 2026-07-17"

echo "WM Smart Sync gestartet — $(date)"
echo "Fenster: 15-05 UTC = LIVE (10min) | 05-15 UTC = RUHE | Off-Days = 2h"

sync_call() {
  TS=$(date +%H:%M:%S)
  RESP=$(curl -s -w "\n%{http_code}" -X POST "$URL" \
    -H "apikey: ${SERVICE_KEY}" \
    -H "Authorization: Bearer ${SERVICE_KEY}" \
    -H "Content-Type: application/json")
  HTTP=$(echo "$RESP" | tail -1)
  BODY=$(echo "$RESP" | sed '$d' | head -c 80)
  echo "[$TS] HTTP $HTTP $BODY"
}

while true; do
  H=$(date -u +%H)
  TODAY=$(date -u +%Y-%m-%d)

  # Off-Day Check
  for d in $OFF_DAYS; do
    if [ "$TODAY" = "$d" ]; then
      echo "[$(date +%H:%M)] OFF-DAY — 2h Takt"
      sync_call
      sleep 7200
      continue 2
    fi
  done

  # Match-Day: LIVE 15:00-07:00 UTC (16h), RUHE 07:00-15:00 UTC (8h)
  #  LIVE: 4 calls/h × 16h = 64  |  RUHE: 1 call/h × 8h = 8  |  Total: 72
  if [ $H -ge 15 ] || [ $H -lt 7 ]; then
    sync_call
    sleep 900  # 15 Minuten
  else
    sync_call
    sleep 3600  # 1 Stunde
  fi
done
