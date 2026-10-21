-- Varios administradores por grupo: el rol pasa a ser una marca del integrante.
-- groups.admin_member_id queda como dato histórico (el creador) y ya no se usa
-- para decidir permisos.
ALTER TABLE members ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0 CHECK (is_admin IN (0, 1));

UPDATE members
SET is_admin = 1
WHERE id IN (SELECT admin_member_id FROM groups);
