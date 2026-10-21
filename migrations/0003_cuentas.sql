-- Cuentas de usuario. La contraseña nunca se guarda: solo su hash con sal.
-- "username" es el identificador para entrar (en minúsculas); no tiene por qué
-- ser el nombre de la persona. El correo es opcional: sirve para recuperar la
-- contraseña. Una cuenta invitada (la que se crea al unirse a un grupo) no tiene
-- usuario, correo ni contraseña hasta que la persona se registra.
CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  username      TEXT,
  email         TEXT,
  name          TEXT NOT NULL,
  password_hash TEXT,
  password_salt TEXT,
  created_at    TEXT NOT NULL
);

CREATE UNIQUE INDEX idx_users_username ON users (username);
CREATE UNIQUE INDEX idx_users_email ON users (email);

-- Sesiones abiertas. Se guarda el hash del token, no el token: si alguien lee
-- la base de datos no puede usar las sesiones.
CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX idx_sessions_user ON sessions (user_id);

-- Vínculo integrante <-> usuario (auto-declarado, el administrador puede corregirlo).
ALTER TABLE members ADD COLUMN user_id TEXT REFERENCES users (id);

-- Quién registró cada partida.
ALTER TABLE matches ADD COLUMN created_by TEXT;
