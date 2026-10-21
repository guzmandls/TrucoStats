-- Cancelación de partidas. Una partida cancelada no se borra: queda en el
-- historial marcada como cancelada y no cuenta para puntos ni estadísticas.
-- Estas columnas guardan el estado actual.
ALTER TABLE matches ADD COLUMN canceled_at TEXT;
-- Cuenta (usuario) que la canceló.
ALTER TABLE matches ADD COLUMN canceled_by TEXT;
ALTER TABLE matches ADD COLUMN cancel_reason TEXT;

-- Registro de todo lo que pasó con la partida (cancelaciones y restauraciones),
-- para que nadie pueda ocultar una partida sin dejar rastro.
CREATE TABLE match_events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id   TEXT NOT NULL REFERENCES matches (id) ON DELETE CASCADE,
  action     TEXT NOT NULL CHECK (action IN ('cancel', 'restore')),
  user_id    TEXT NOT NULL,
  reason     TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_match_events_match ON match_events (match_id);
