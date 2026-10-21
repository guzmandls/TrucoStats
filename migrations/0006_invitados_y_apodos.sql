-- Jugadores invitados: personas que jugaron una partida del grupo sin ser
-- integrantes (se anotan solo con su nombre). Su member_id es un id propio de la
-- partida, no el de un integrante.
ALTER TABLE match_players ADD COLUMN is_guest INTEGER NOT NULL DEFAULT 0 CHECK (is_guest IN (0, 1));

-- Apodos de un integrante: los nombres con los que pudieron anotarlo en partidas
-- anteriores como invitado. Las partidas de invitados con ese nombre pasan a
-- contar para el integrante. Un apodo no puede repetirse dentro de un grupo
-- (alias_norm es el nombre en minúsculas y sin tildes).
CREATE TABLE member_aliases (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id   TEXT NOT NULL REFERENCES groups (id) ON DELETE CASCADE,
  member_id  TEXT NOT NULL REFERENCES members (id) ON DELETE CASCADE,
  alias      TEXT NOT NULL,
  alias_norm TEXT NOT NULL,
  UNIQUE (group_id, alias_norm)
);

CREATE INDEX idx_member_aliases_member ON member_aliases (member_id);
