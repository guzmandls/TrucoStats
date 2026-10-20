-- Código secreto de invitación de cada grupo: quien lo tiene puede entrar.
ALTER TABLE groups ADD COLUMN invite_code TEXT;

CREATE UNIQUE INDEX idx_groups_invite_code ON groups (invite_code);
