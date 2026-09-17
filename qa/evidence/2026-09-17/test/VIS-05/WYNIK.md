# VIS-05 — CFG-06 + ADM-10 dopełnienie: pełny zapis, dziennik, podgląd przez UI

- Data i czas: 2026-09-17, uruchomienie automatyczne (Playwright)
- Środowisko: test — https://rexor.sobierski.com
- Adres: /konfigurator?model=e82 → panel admina → „Dziennik aktywności” → „Zapytania” → „Szczegóły”
- Viewport / przeglądarka: 1440 × 1000 / Chromium (Playwright)
- Dane testowe: zgłoszenie `[QA] test-visual VIS-05 <timestamp>`, e-mail `qa-configurator@example.invalid`

| Krok | Wynik | Dowód | Uwagi |
| --- | --- | --- | --- |
| 1 | PASS | — | Konfiguracja zapisana, otrzymano `publicId`. |
| 2 | PASS | `01-activity-log.png` | Wpis „Nowa konfiguracja” widoczny w Dzienniku aktywności dla tego zgłoszenia. |
| 3 | PASS | `02-zapytania-row.png` | Rekord widoczny w tabeli „Zapytania klientów”. |
| 4 | PASS | `03-configuration-detail.png` | Kliknięcie „Szczegóły” (prawdziwy przepływ UI, nie bezpośredni URL) otwiera podgląd bez błędu. |

## Wynik testu skryptowego

`npm run test:visual` — test `VIS-05`: **PASS**.

## Dlaczego wcześniej PARTIAL i co dokładnie odblokowano

- **CFG-06** było PARTIAL, bo brakowało testowej skrzynki do potwierdzenia
  końcowego zapisu. Ten test teraz przechodzi cały przepływ zapisu i
  **potwierdza zapis rekordu** przez Dziennik aktywności (zdarzenie
  `configuration_created` / „Nowa konfiguracja” pojawia się natychmiast po
  zapisie z poprawnymi danymi klienta).
- **ADM-10** było PARTIAL, bo środowisko testowe nie miało zapisanej
  konfiguracji do otwarcia. Teraz test tworzy ją sam i otwiera przez
  prawdziwy przepływ panelu: zakładka „Zapytania” → przycisk „Szczegóły”
  (nie przez wpisanie adresu wprost) — dokładnie ta ścieżka, której dotyczyło
  zgłoszenie użytkownika.

## Czego NIE udało się potwierdzić (pozostały blocker)

**Rzeczywiste dostarczenie e-maila** (potwierdzenie do klienta i
powiadomienie na adres zamówień) pozostaje niepotwierdzone. Kod
(`apps/api/src/MailService.php`) zapisuje próbę wysyłki w tabeli
`email_outbox` (`status: sent|failed`) i próbuje SMTP „best effort” poza
transakcją zapisu — ale:

- Nie ma w panelu admina widoku statusu `email_outbox` (tylko „Poczta —
  adresaci zgłoszeń”, czyli konfiguracja adresów, nie log wysyłek).
- Test mailbox `rexor@sobierski.com` (IMAP `mail.sobierski.com:993`)
  **odpowiada timeoutem połączenia** (`CONNECT_TIMEOUT`) zarówno w
  sandboxie Claude Code, jak i z wyłączonym sandboxem — więc problem nie
  jest ograniczeniem środowiska agenta, tylko realną niedostępnością tego
  portu/hosta stąd.

Rekomendacja: jeśli zależy nam na automatycznym potwierdzeniu dostarczenia
e-maila, albo dodać w panelu admina widok statusu `email_outbox` (łatwe do
przetestowania przez Playwright), albo zweryfikować IMAP ręcznie z innej
sieci / poprosić hosting o dostęp do innego portu (np. 143 + STARTTLS).

## Konsola i sieć

- Console: brak błędów
- Żądania: `POST /api/configurations` 200, `GET /admin/activity-log` 200, `GET /admin/configurations/{publicId}` 200
