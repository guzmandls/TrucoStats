-- El usuario se guarda como lo escribe la persona (puede tener mayúsculas), pero
-- "Guzman" y "guzman" siguen siendo el mismo usuario: el índice único compara
-- sin distinguir mayúsculas (COLLATE NOCASE). Los usuarios existentes ya están en
-- minúsculas, así que no hay repetidos.
DROP INDEX idx_users_username;
CREATE UNIQUE INDEX idx_users_username ON users (username COLLATE NOCASE);
