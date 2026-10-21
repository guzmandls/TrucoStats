-- Partida en vivo: el contador de una partida de grupo publica su estado para
-- que los demás integrantes puedan mirarla desde su celular. Hay una por grupo
-- (como en cada celular, que tiene una sola partida de grupo en curso). Se
-- borra al terminar o al salir del contador; si nadie la actualiza, se ignora.
CREATE TABLE live_matches (
  group_id   TEXT PRIMARY KEY REFERENCES groups (id) ON DELETE CASCADE,
  state      TEXT NOT NULL,
  started_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
