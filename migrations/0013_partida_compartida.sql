-- Partidas rápidas compartidas en vivo: quien cuenta (con cuenta) publica el
-- estado y cualquiera con el enlace (o el QR) la mira, sin cuenta. El id es
-- secreto y difícil de adivinar: es lo único que da acceso para mirarla.
CREATE TABLE shared_lives (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  state      TEXT NOT NULL,
  started_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'live'
    CHECK (status IN ('live', 'finished', 'canceled')),
  ended_at   TEXT,
  end_reason TEXT
);

CREATE INDEX idx_shared_lives_user ON shared_lives (user_id);
