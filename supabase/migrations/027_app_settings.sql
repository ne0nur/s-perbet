-- Globale App-Einstellungen (Key-Value)
-- Ermöglicht Admin-Toggle für Tipp-Freigabe ohne Redeploy

CREATE TABLE IF NOT EXISTS app_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- RLS: Nur authentifizierte User lesen, nur Admin schreiben
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Settings lesbar fuer alle"
  ON app_settings FOR SELECT
  USING (true);

CREATE POLICY "Settings schreibbar fuer Admin"
  ON app_settings FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "Settings aktualisierbar fuer Admin"
  ON app_settings FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- Default: Tipps gesperrt (wird vom Admin manuell freigegeben)
INSERT INTO app_settings (key, value)
VALUES ('tipps_freigeschaltet', 'false')
ON CONFLICT (key) DO NOTHING;
