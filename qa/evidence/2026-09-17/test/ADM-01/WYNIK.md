# ADM-01 — Dostęp do panelu i sesja

- Data i czas: 2026-09-17
- Środowisko: test (`https://rexor.sobierski.com/admin`)
- Przeglądarka / viewport: Google Chrome / 1440 × 1000
- Sesja administratora: początkowo brak; następnie konto przekazane przez właściciela

| Krok | Wynik | Dowód | Uzasadnienie |
| --- | --- | --- | --- |
| 1. Otwarcie `/admin` bez sesji | PASS | `01-login-without-session.png` | Widoczny jest wyłącznie formularz logowania z e-mailem i hasłem. |
| 2. Brak dostępu do katalogu panelu | PASS | `01-login-without-session.png` | Nagłówek „Treść, oferta i wygląd” nie jest widoczny. |
| 3. Logowanie | PASS | `05-admin-dashboard.png` | Panel „Treść, oferta i wygląd” oraz modele i galerie załadowały się poprawnie. |
| 4. Odświeżenie sesji i wylogowanie | PASS | `06-logout.png` | Sesja przetrwała odświeżenie; po wylogowaniu wrócił sam formularz logowania. |

## Konsola i wniosek

Brak ostrzeżeń i błędów konsoli. Uwaga dla automatu: należy wpisywać dane znak
po znaku; szybkie `fill()` może wysłać pusty stan hasła w tej aplikacji.
