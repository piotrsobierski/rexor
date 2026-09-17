# Pokrycie wyników ręcznych skryptami Playwright/API

Status `POTWIERDZONE` oznacza ten sam wynik ponowiony skryptem. `DO DOROBIENIA`
oznacza, że istnieje wyłącznie historyczny wynik ręczny — nie wolno go ponownie
uznawać za automatycznie zweryfikowany.

| Scenariusz | Wynik ręczny | Skrypt | Stan automatyzacji |
| --- | --- | --- | --- |
| API-01/02 | PASS | `run-api-smoke.cjs` | POTWIERDZONE (200/200/401/422) |
| PUB-01/02 | PASS | `run-public-navigation.cjs` | POTWIERDZONE częściowo: menu; filtr wymaga dopisania asercji modeli |
| PUB-03 | PASS | `qa/playwright/test-visual.spec.ts` (`VIS-01`) | POTWIERDZONE |
| PUB-04 | PASS | `run-public-pages.cjs` | DO PONOWNEGO URUCHOMIENIA |
| PUB-05/06 | PASS | — | DO DOROBIENIA |
| CFG-01–03 | PASS/PARTIAL | — | DO DOROBIENIA |
| CFG-04 | PASS | `qa/playwright/test-visual.spec.ts` (`VIS-04`) | POTWIERDZONE (na E55; E82 bez danych renderów) |
| CFG-05 | PASS lokalnie | — | DO DOROBIENIA po wdrożeniu |
| CFG-06 | PASS (zapis + dziennik + e-mail) | `run-configuration-save.cjs`, `qa/playwright/test-visual.spec.ts` (`VIS-05`, `VIS-07`) | Wszystko POTWIERDZONE. E-mail pierwotnie nie docierał (`.env` testowy: `MAIL_TRANSPORT=log`) — naprawione wdrożeniem poprawnego `SMTP_HOST` (patrz `VIS-07/WYNIK.md`) |
| CFG-07 | PARTIAL (modal OK, karuzela/akordeon do zrobienia) | `qa/playwright/test-visual.spec.ts` (`VIS-06`) | POTWIERDZONE częściowo: pułapka fokusu modalu lakieru |
| ADM-01 | PASS | `run-admin-session.cjs` | DO PONOWNEGO URUCHOMIENIA po poprawce |
| ADM-07 | PASS | — | DO DOROBIENIA |
| ADM-10 | PASS | `qa/playwright/test-visual.spec.ts` (`VIS-05`) | POTWIERDZONE |

Kolejność pracy: najpierw skrypty oznaczone `DO DOROBIENIA` dla już wykonanych
scenariuszy, potem ich uruchomienie i aktualizacja tej tabeli z linkiem do
konkretnego katalogu dowodów. Skrypt bez uruchomienia nie zmienia statusu.

## `test:visual` — pakiet Playwright dla zgłoszeń z panelu (2026-09-17)

W przeciwieństwie do skryptów powyżej (playwright-core, jednorazowe
skrypty diagnostyczne), `qa/playwright/test-visual.spec.ts` to właściwy
pakiet testów `@playwright/test` z asercjami, uruchamiany przez
`npm run test:visual` (wymaga `QA_ADMIN_EMAIL`/`QA_ADMIN_PASSWORD`,
Playwright zainstalowany globalnie + `@playwright/test` jako
devDependency dla rozwiązywania modułu w `playwright.config.ts`).
`VIS-07` dodatkowo wymaga `QA_MAILBOX_EMAIL`/`QA_MAILBOX_PASSWORD` (bez nich
jest pomijany) — logika połączenia IMAP jest w reużywalnym helperze
`qa/playwright/lib/mailbox.ts` (obchodzi Cloudflare-proxy na
`mail.sobierski.com`, łącząc się bezpośrednio z adresem IP z rekordu MX).

| Scenariusz | Zgłoszenie | Wynik automatu (2026-09-17, test) | Stan |
| --- | --- | --- | --- |
| VIS-01 | Zdjęcie główne na `/rowery` nie aktualizuje się po zmianie kolejności w panelu | PASS — nie odtworzono; zobacz `qa/evidence/2026-09-17/test/VIS-01/WYNIK.md` (hipoteza: cache klienta przy otwartej karcie, nie sprawdzone) | POTWIERDZONE (brak reprodukcji); domyka też PUB-03 |
| VIS-02 | Zakładka „Rowery” w panelu nie ma filtrowania po kategorii jak „Ramy” | FAIL (oczekiwane) — ani „Rowery”, ani „Ramy” nie mają filtra kategorii; zobacz `qa/evidence/2026-09-17/test/VIS-02/WYNIK.md` | POTWIERDZONE jako brakująca funkcja, nie regresja |
| VIS-03 | Błąd przy podglądzie zapisanej konfiguracji z panelu | PASS — nie odtworzono dla standardowej ścieżki (E82, domyślne opcje); zobacz `qa/evidence/2026-09-17/test/VIS-03/WYNIK.md` | POTWIERDZONE (brak reprodukcji); do sprawdzenia: wariant „Dostarczam własną część” |
| VIS-04 | Dopełnienie CFG-04: powiększenie renderu lakieru | PASS na E55 (229/680 kolorów z renderem); E82 ma 0/680 w danych testowych | POTWIERDZONE — brak danych dla E82, nie błąd kodu |
| VIS-05 | Dopełnienie CFG-06 + ADM-10: pełny zapis → Dziennik aktywności → „Zapytania” → „Szczegóły” | PASS — cały przepływ działa przez prawdziwe UI, bez ponownego logowania i bez błędu | POTWIERDZONE dla zapisu/podglądu; dostarczenie e-maila NIE potwierdzone (IMAPS `mail.sobierski.com:993` → `CONNECT_TIMEOUT`, także poza sandboxem) |
| VIS-06 | Dopełnienie CFG-07: pułapka fokusu w modalu lakieru | PASS — 25× Tab nie wyprowadza fokusu poza `[role="dialog"]`; Escape oddaje fokus | POTWIERDZONE dla modalu lakieru; karuzela i akordeon opisu poza zakresem tego testu |
| VIS-07 | Dopełnienie CFG-06: rzeczywiste dostarczenie e-maila zamówienia | Pierwszy przebieg **FAIL** (`.env` testowy: `MAIL_TRANSPORT=log`, `SMTP_HOST` pusty). Naprawione: `.env.remote` → `MAIL_TRANSPORT=smtp`, `SMTP_HOST=de1.sohost.pl` (realny host, nie Cloudflare-proxowany `mail.sobierski.com`), wdrożone tylko dla `.env` przez FTP. Drugi przebieg **PASS** (~8 s); zobacz `qa/evidence/2026-09-17/test/VIS-07/WYNIK.md` | NAPRAWIONE i POTWIERDZONE na teście. Produkcja (`rexorbikes.com`, osobne `.env.production`) miała już poprawny, nieproxowany `SMTP_HOST` — prawdopodobnie nie dotyczył jej ten problem, ale nie zweryfikowano z tej sesji |
