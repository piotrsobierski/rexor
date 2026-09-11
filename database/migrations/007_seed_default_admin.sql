-- Konto admina domyślnego. Hasło: rexor (bcrypt, password_hash PASSWORD_DEFAULT).
-- Zmień hasło po pierwszym zalogowaniu.
INSERT INTO admin_users (email, display_name, password_hash, is_active)
VALUES ('admin@rexor.local', 'Administrator Rexor', '$2y$12$501qTMmrPev4vmRBS84D0OjmL2EQJrwo5yRdRn9PZKeLYuJVdMFM2', TRUE)
ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), is_active = TRUE;
