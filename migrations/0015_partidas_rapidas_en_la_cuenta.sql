-- Las partidas rápidas se guardan en la cuenta de quien las jugó: así se ven
-- desde cualquier celular y cuentan para las estadísticas personales que ven
-- los demás. Van en la misma tabla de partidas (type = 'quick', sin grupo).
ALTER TABLE matches ADD COLUMN user_id TEXT REFERENCES users (id) ON DELETE CASCADE;

CREATE INDEX idx_matches_user_played ON matches (user_id, played_at);
