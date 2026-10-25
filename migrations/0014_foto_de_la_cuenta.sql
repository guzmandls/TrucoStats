-- La foto pasa a ser de la cuenta: una sola para todos sus grupos. Cada
-- integrante vinculado a una cuenta guarda una copia (así los grupos la leen
-- como siempre), y cambiarla en la cuenta la cambia en todos.
ALTER TABLE users ADD COLUMN avatar TEXT;

-- La foto de cada cuenta: la de su integrante más reciente que tenga foto.
UPDATE users SET avatar = (
  SELECT m.avatar FROM members m
  WHERE m.user_id = users.id AND m.active = 1 AND m.avatar IS NOT NULL
  ORDER BY m.rowid DESC LIMIT 1
);

-- Todos sus integrantes muestran esa misma foto.
UPDATE members SET avatar = (SELECT u.avatar FROM users u WHERE u.id = members.user_id)
WHERE user_id IS NOT NULL;
