-- Partidas en vivo: el contador de una partida de grupo publica su estado para
-- que los demás integrantes puedan mirarla desde su celular. Puede haber varias
-- a la vez en un grupo (cada celular que cuenta tiene su propio id de partida
-- en vivo). Se borra al terminar o al salir del contador; si nadie la
-- actualiza, se ignora.
CREATE TABLE live_matches (
  id         TEXT PRIMARY KEY,
  group_id   TEXT NOT NULL REFERENCES groups (id) ON DELETE CASCADE,
  state      TEXT NOT NULL,
  started_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_live_matches_group ON live_matches (group_id);
