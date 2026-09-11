-- /admin/login nie miał żadnego limitu prób: dowolna liczba żądań z różnymi
-- hasłami mogła lecieć bez throttlingu wprost na jedyne uprzywilejowane konto.
-- Tabela trzyma tylko nieudane próby (per e-mail), żeby loginAdmin() mógł
-- zablokować logowanie po serii błędów zamiast pozwalać na brute-force.

CREATE TABLE admin_login_attempts (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(254) NOT NULL,
    ip_address VARCHAR(45) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_admin_login_attempts_email_created (email, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
