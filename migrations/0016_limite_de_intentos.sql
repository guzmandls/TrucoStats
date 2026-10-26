-- Límite de intentos: cuenta los fallos (contraseñas incorrectas, cuentas nuevas)
-- por usuario o por dirección IP. Al pasar el máximo dentro de la ventana de
-- tiempo, se bloquea un rato. Frena a quien prueba contraseñas sin parar
-- (fuerza bruta) o crea cuentas en masa.
CREATE TABLE attempts (
  key          TEXT PRIMARY KEY,
  failures     INTEGER NOT NULL,
  first_at     TEXT NOT NULL,
  locked_until TEXT
);
