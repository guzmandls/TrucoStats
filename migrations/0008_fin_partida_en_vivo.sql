-- Una partida en vivo ahora no desaparece al cerrar el contador: se mantiene hasta
-- que termina o se cancela, y entonces queda un rato con ese estado para que
-- quien la estaba mirando vea el mensaje que corresponde.
ALTER TABLE live_matches ADD COLUMN status TEXT NOT NULL DEFAULT 'live'
  CHECK (status IN ('live', 'finished', 'canceled'));
ALTER TABLE live_matches ADD COLUMN ended_at TEXT;
ALTER TABLE live_matches ADD COLUMN end_reason TEXT;
