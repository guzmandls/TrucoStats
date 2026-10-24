-- Unirse a un grupo ahora exige una cuenta registrada. Los integrantes que
-- habían quedado vinculados a cuentas invitadas (sin usuario ni contraseña) se
-- liberan, para que esas personas los elijan de nuevo con su cuenta. Sus
-- partidas se conservan. Las sesiones de esas cuentas se cierran: en ese
-- celular la app pide iniciar sesión.
UPDATE members SET user_id = NULL, is_admin = 0
WHERE user_id IN (SELECT id FROM users WHERE username IS NULL);

DELETE FROM sessions
WHERE user_id IN (SELECT id FROM users WHERE username IS NULL);

-- Si algún grupo se quedó sin administrador, el rol pasa al integrante con
-- cuenta más antiguo (o, si no hay, al más antiguo), como en ensureAdmin.
UPDATE members SET is_admin = 1
WHERE id IN (
  SELECT (
    SELECT m.id FROM members m
    WHERE m.group_id = g.id AND m.active = 1
    ORDER BY (m.user_id IS NULL), m.rowid
    LIMIT 1
  )
  FROM groups g
  WHERE NOT EXISTS (
    SELECT 1 FROM members a
    WHERE a.group_id = g.id AND a.active = 1 AND a.is_admin = 1
  )
);
