-- Cap gesamt_punkte at minimum -5
-- Spieler können nicht weniger als -5 Gesamtpunkte haben
CREATE OR REPLACE FUNCTION aktualisiere_tipp_punkte()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_current_season INTEGER;
  v_match_id UUID;
  v_season INTEGER;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_match_id := OLD.id;
    v_season := OLD.season;
  ELSE
    v_match_id := NEW.id;
    v_season := NEW.season;
  END IF;

  IF TG_OP != 'DELETE' AND NEW.status = 'finished' AND NEW.tore_heim IS NOT NULL AND NEW.tore_gast IS NOT NULL THEN
    UPDATE tips
    SET punkte = berechne_punkte(tipp_heim, tipp_gast, NEW.tore_heim, NEW.tore_gast)
    WHERE match_id = v_match_id;
  END IF;

  IF TG_OP != 'DELETE' AND NEW.status != 'finished' AND OLD.status = 'finished' THEN
    UPDATE tips SET punkte = 0 WHERE match_id = v_match_id;
  END IF;

  SELECT id INTO v_current_season FROM public.seasons WHERE is_current = true LIMIT 1;

  IF v_season = v_current_season THEN
    UPDATE profiles p
    SET gesamt_punkte = GREATEST(-5, (SELECT COALESCE(SUM(t.punkte), 0)
        FROM tips t JOIN matches m ON t.match_id = m.id
        WHERE t.user_id = p.id AND m.status = 'finished' AND m.season = v_current_season))
    WHERE p.id IN (SELECT user_id FROM tips WHERE match_id = v_match_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;
