-- Enlaces de un solo uso que se mandan por correo: recuperar la contraseña
-- ('reset') y confirmar un correo nuevo ('confirm', con el correo a confirmar).
-- Igual que las sesiones, se guarda el hash del token, no el token: si alguien
-- lee la base de datos no puede usar los enlaces.
CREATE TABLE email_tokens (
  token_hash TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  purpose    TEXT NOT NULL CHECK (purpose IN ('reset', 'confirm')),
  email      TEXT,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX idx_email_tokens_user ON email_tokens (user_id, purpose);
