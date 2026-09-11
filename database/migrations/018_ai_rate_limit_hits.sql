-- /chat i /admin/ai/rich-content wołają płatne OpenRouter API bez żadnego
-- limitu - jeden klient mógł zapętlić żądania i wyczerpać budżet. Tabela
-- trzyma znaczniki czasu trafień per IP i per endpoint ("bucket"), żeby
-- enforceAiRateLimit() mogło odciąć nadmiar żądań w oknie jednej minuty.

CREATE TABLE ai_rate_limit_hits (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    bucket VARCHAR(40) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ai_rate_limit_hits_bucket_ip_created (bucket, ip_address, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
