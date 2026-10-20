-- Esquema inicial de TrucoStats (Cloudflare D1, SQLite).
-- Refleja los tipos Group, Member y Match de la app.

CREATE TABLE groups (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  admin_member_id TEXT NOT NULL,
  created_at      TEXT NOT NULL
);

-- Integrantes de un grupo. "avatar" guarda la foto como texto (data URL).
-- Dar de baja a un integrante lo oculta (active = 0) sin borrar sus partidas.
CREATE TABLE members (
  id       TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES groups (id) ON DELETE CASCADE,
  name     TEXT NOT NULL,
  avatar   TEXT,
  active   INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1))
);

CREATE INDEX idx_members_group ON members (group_id);

-- Partidas finalizadas. group_id no es clave foránea a propósito: al eliminar
-- un grupo se conservan sus partidas para el perfil personal.
CREATE TABLE matches (
  id               TEXT PRIMARY KEY,
  type             TEXT NOT NULL CHECK (type IN ('quick', 'group')),
  group_id         TEXT,
  modality         TEXT CHECK (modality IN ('1v1', '2v2', '3v3')),
  played_at        TEXT NOT NULL,
  duration_seconds INTEGER,
  target           INTEGER NOT NULL,
  winner           TEXT NOT NULL CHECK (winner IN ('nos', 'ellos')),
  nos_score        INTEGER NOT NULL,
  ellos_score      INTEGER NOT NULL
);

CREATE INDEX idx_matches_group_played ON matches (group_id, played_at);

-- Quién jugó en cada equipo. El nombre se guarda tal como estaba en la partida.
CREATE TABLE match_players (
  match_id  TEXT NOT NULL REFERENCES matches (id) ON DELETE CASCADE,
  member_id TEXT NOT NULL,
  name      TEXT NOT NULL,
  team      TEXT NOT NULL CHECK (team IN ('nos', 'ellos')),
  PRIMARY KEY (match_id, member_id)
);

CREATE INDEX idx_match_players_member ON match_players (member_id);
