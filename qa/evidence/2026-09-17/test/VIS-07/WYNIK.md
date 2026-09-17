# VIS-07 — CFG-06 dopełnienie: rzeczywiste dostarczenie e-maila zamówienia

- Data i czas: 2026-09-17, uruchomienie automatyczne (Playwright)
- Środowisko: test — https://rexor.sobierski.com
- Adres: /admin (Poczta) → /konfigurator?model=e82 → skrzynka IMAP `rexor@sobierski.com`
- Viewport / przeglądarka: 1440 × 1000 / Chromium (Playwright)
- Dane testowe: tymczasowa zmiana `order_email` na `rexor@sobierski.com` (przywrócona na `biuro@rexorbikes.com` w bloku `finally`, potwierdzone ręcznie po teście)

| Krok | Wynik | Dowód | Uwagi |
| --- | --- | --- | --- |
| 1 | PASS | `01-mail-routing-before.png` | Oryginalny adres: `biuro@rexorbikes.com`. |
| 2 | PASS | — | Adres tymczasowo zmieniony na skrzynkę QA, zapisany. |
| 3 | PASS | — | Nowa konfiguracja `[QA] test-visual VIS-07 …` zapisana (publicId zwrócony). |
| 4 | **PASS** | `02-mail-received.png` | E-mail „Nowe zapytanie ofertowe — Rexor E82” dotarł do skrzynki w ~8 s. |
| 5 | PASS | `03-mail-routing-restored.png` | Adres przywrócony na `biuro@rexorbikes.com`, potwierdzone ręcznym odczytem po teście. |

## Wynik testu skryptowego

`npm run test:visual -- -g VIS-07` (wymaga `QA_MAILBOX_EMAIL`/`QA_MAILBOX_PASSWORD`,
pomijany bez nich): **PASS**.

## Historia: było FAIL, znaleziono i naprawiono przyczynę na środowisku testowym

Pierwszy przebieg tego testu (2026-09-17, wcześniej tego dnia) wykazał
realny brak: e-mail „Nowe zapytanie ofertowe” nie docierał mimo poprawnie
zapisanej konfiguracji i poprawnie ustawionego odbiorcy. Przyczyna:
`.env.remote` (plik wdrażany jako `.env` na `rexor.sobierski.com`) miał
`MAIL_TRANSPORT=log` i pusty `SMTP_HOST` — e-mail nigdy nie był realnie
wysyłany na tym środowisku, tylko (w teorii) zapisywany do
`storage/logs/mail.log`. To nie był problem samego IMAP-a ani środowiska
testowego agenta — to była literalnie brakująca konfiguracja SMTP na
serwerze testowym.

### Naprawa (wykonana, wdrożona)

1. `.env.remote` zaktualizowany: `MAIL_TRANSPORT=smtp`,
   `SMTP_HOST=de1.sohost.pl` (realny host hostingowy — **nie**
   `mail.sobierski.com`, który jest za Cloudflare i nie przepuszcza
   portu 587/993 z żadnej sieci), `SMTP_USER=rexor@sobierski.com`,
   `MAIL_FROM_ADDRESS=rexor@sobierski.com` (zgodne z `SMTP_USER` — część
   hostingów wymaga zgodności From/auth user), `QUOTE_RECIPIENT` ustawiony
   jako fallback.
2. Wdrożono **tylko ten jeden plik** przez FTP (`.env` → `/public_html/.env`
   na `de1.sohost.pl`), bez pełnego `scripts/deploy-ftp.sh` (który
   nadpisałby też frontend/backend — a inna, równoległa sesja aktywnie nad
   nimi pracowała w tym samym repo w trakcie tej sesji QA).
3. Ponowiono `VIS-07` — **PASS**, e-mail dotarł w ~8 s.
4. Lokalny `.env` (dev) zaktualizowany tym samym poprawnym `SMTP_HOST`, żeby
   ktoś przełączający `MAIL_TRANSPORT=smtp` lokalnie nie trafił na ten sam
   błąd Cloudflare.

### Efekt uboczny (nieszkodliwy)

W skrzynce QA pojawił się też bounce „Mail delivery failed” od
`Mailer-Daemon@de1.sohost.pl` — to odbicie e-maila potwierdzającego do
klienta, wysłanego na fikcyjny adres testowy `qa-configurator@example.invalid`
używany w skryptach QA. Oczekiwane: teraz, gdy SMTP faktycznie wysyła,
próba dostarczenia do nieistniejącej domeny faktycznie się odbija (wcześniej,
przy `MAIL_TRANSPORT=log`, nic nie było realnie wysyłane, więc nie było
bounce'ów). Rekomendacja dla przyszłych skryptów QA na tym środowisku: użyć
adresu klienta, który realnie coś akceptuje (np. też skrzynki QA), żeby nie
zaśmiecać jej odbiciami.

## Ryzyko biznesowe (zamknięte na teście, do sprawdzenia na produkcji)

Zanim to naprawiono, każde zapytanie ofertowe zapisane na środowisku
testowym było cicho gubione — panel „Poczta — adresaci zgłoszeń” sugerował,
że wiadomość pójdzie, a nic nie wychodziło. `.env.production` (osobne,
prawdziwe środowisko `rexorbikes.com`) ma poprawnie ustawiony
`MAIL_TRANSPORT=smtp` z własnym `SMTP_HOST` hostingu (nie
Cloudflare-proxowany), więc **produkcja prawdopodobnie nie miała tego
problemu** — ale nie zweryfikowano tego z tej sesji (zgodnie z zasadą, że
zmiany/testy na produkcji wymagają osobnego, wyraźnego polecenia). Warto to
kiedyś potwierdzić analogicznym testem na `rexorbikes.com`.
