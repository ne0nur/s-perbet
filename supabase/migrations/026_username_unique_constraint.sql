-- Username Unique-Constraint als Fallback für Race Conditions
-- Der Client prüft bereits auf Existenz, aber zwischen Check und Insert
-- könnte ein anderer User den gleichen Namen beanspruchen.

-- Falls der Constraint bereits existiert, tut ALTER nichts (idempotent via DO)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_username_unique'
    AND conrelid = 'profiles'::regclass
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_username_unique UNIQUE (username);
  END IF;
END $$;
