#!/data/data/com.termux/files/usr/bin/bash
# SuperBET Sync-Loop — S4 Mini Edition
# Alle 480s (8 Min) → Edge Function

KEY="PASTE_YOUR_KEY_HERE"
URL="https://ynkdtqhhnxmpqvdbzzqk.supabase.co/functions/v1/sync-match-results"

echo "SuperBET Sync gestartet"
echo "Intervall: 8 Minuten"
echo ""

while true; do
  TS=$(date +%H:%M:%S)
  RESP=$(curl -s -w "\n%{http_code}" -X POST "$URL" \
    -H "Authorization: Bearer ***    -H "Content-Type: application/json")
  HTTP=$(echo "$RESP" | tail -1)
  BODY=$(echo "$RESP" | sed '$d' | head -c 150)
  if [ "$HTTP" = "200" ]; then
    echo "[$TS] OK   $BODY"
  else
    echo "[$TS] FAIL $HTTP"
  fi
  sleep 480
done
