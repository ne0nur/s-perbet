-- Dubletten sauber entfernen: behalte pro (spieltag, heim_team, gast_team) nur die erste ID
DELETE FROM matches
WHERE id NOT IN (
  SELECT DISTINCT ON (spieltag, heim_team, gast_team) id
  FROM matches
  ORDER BY spieltag, heim_team, gast_team, created_at
);
