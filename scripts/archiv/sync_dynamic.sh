#!/data/data/com.termux/files/usr/bin/bash
# ============================================================
#  SuperBET WM 2026 — Dynamic Sync
#  Edge Function diktiert sleep-Intervall via nextSyncSeconds
# ============================================================

URL="https://ynkdtqhhnxmpqvdbzzqk.supabase.co/functions/v1/sync-match-results"
SERVICE_KEY="PASTE_YOUR_KEY_HERE"

echo "SuperBET Dynamic Sync gestartet — $(date)"
echo "Intervall wird von der Edge Function gesteuert"
echo "├─ ⚽ Live:      450s (7,5 Min)"
echo "├─ 🔥 Crunch (80-130'): 90s"
echo "├─ ☕ Halbzeit:  600s (10 Min)"
echo "└─ 💤 Kein Spiel: dynamisch bis max 1800s"

sync() {
  TS=$(date +%H:%M:%S)
  RESP=$(curl -s -X POST "$URL" \
    -H "apikey: ${SERVICE_KEY}" \
    -H "Authorization: Bearer *** \
    -H "Content-Type: application/json")

  HTTP=$(echo "$RESP" | grep -o '"success"[ :]*true' | head -1)
  
  # Extrahiere nextSyncSeconds aus JSON (ohne jq-Abhängigkeit)
  SLEEP=$(echo "$RESP" | sed 's/.*"nextSyncSeconds": *\([0-9]*\).*/\1/' 2>/dev/null)
  
  # Fallback falls Extraktion fehlschlägt
  if ! [ "$SLEEP" -eq "$SLEEP" ] 2>/dev/null || [ -z "$SLEEP" ]; then
    SLEEP=480
  fi

  # Kurze Statuszeile
  MSG=$(echo "$RESP" | sed 's/.*"message":"\([^"]*\)".*/\1/' | head -c 60)
  echo "[$TS] $MSG | Nächster Call: ${SLEEP}s"
}

while true; do
  sync
  sleep $SLEEP
done
