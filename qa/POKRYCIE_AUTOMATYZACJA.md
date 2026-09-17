# Pokrycie wyników ręcznych skryptami Playwright/API

Status `POTWIERDZONE` oznacza ten sam wynik ponowiony skryptem. `DO DOROBIENIA`
oznacza, że istnieje wyłącznie historyczny wynik ręczny — nie wolno go ponownie
uznawać za automatycznie zweryfikowany.

| Scenariusz | Wynik ręczny | Skrypt | Stan automatyzacji |
| --- | --- | --- | --- |
| API-01/02 | PASS | `run-api-smoke.cjs` | POTWIERDZONE (200/200/401/422) |
| PUB-01/02 | PASS | `run-public-navigation.cjs`, `qa/playwright/test-visual.spec.ts` (`VIS-11`) | POTWIERDZONE (menu + filtr obie części, `VIS-11` sprawdza dokładny zestaw modeli per kategoria) |
| PUB-03 | PASS | `qa/playwright/test-visual.spec.ts` (`VIS-01`) | POTWIERDZONE |
| PUB-04 | PASS | `run-public-pages.cjs` | DO PONOWNEGO URUCHOMIENIA |
| PUB-05/06 | PASS | — | DO DOROBIENIA |
| CFG-01–03 | PASS/PARTIAL | — | DO DOROBIENIA |
| CFG-04 | PASS | `qa/playwright/test-visual.spec.ts` (`VIS-04`) | POTWIERDZONE (na E55; E82 bez danych renderów) |
| CFG-05 | PASS | `qa/playwright/test-visual.spec.ts` (`VIS-12`) | POTWIERDZONE na środowisku testowym (mobile zwinięty / desktop rozwinięty) |
| CFG-06 | PASS (zapis + dziennik + e-mail) | `run-configuration-save.cjs`, `qa/playwright/test-visual.spec.ts` (`VIS-05`, `VIS-07`) | Wszystko POTWIERDZONE. E-mail pierwotnie nie docierał (`.env` testowy: `MAIL_TRANSPORT=log`) — naprawione wdrożeniem poprawnego `SMTP_HOST` (patrz `VIS-07/WYNIK.md`) |
| CFG-07 | PASS | `qa/playwright/test-visual.spec.ts` (`VIS-06`, `VIS-13`) | POTWIERDZONE: modal lakieru (`VIS-06`), karuzela zdjęć i akordeon opisu poza modalem (`VIS-13`) |
| ADM-01 | PASS | `run-admin-session.cjs` | DO PONOWNEGO URUCHOMIENIA po poprawce |
| ADM-02 | PASS | `qa/playwright/test-adm-catalog.spec.ts` (`VIS-14`) | POTWIERDZONE |
| ADM-03 | PASS | `qa/playwright/test-adm-catalog.spec.ts` (`VIS-15`) | POTWIERDZONE |
| ADM-06 | PASS | `qa/playwright/test-adm-paints.spec.ts` (`VIS-18`) | POTWIERDZONE |
| ADM-08 | PASS | `qa/playwright/test-adm-settings.spec.ts` (`VIS-19`) | POTWIERDZONE |
| ADM-09 | PASS | `qa/playwright/test-adm-settings.spec.ts` (`VIS-20`) | POTWIERDZONE (walidacja + rzeczywista wysyłka) |
| REL-01 | PASS | `qa/playwright/test-adm-settings.spec.ts` (`VIS-21`, tag `@smoke`) | POTWIERDZONE |
| ADM-04 | PASS | `qa/playwright/test-adm-parts-batteries.spec.ts` (`VIS-16`) | POTWIERDZONE |
| ADM-05 | PASS | `qa/playwright/test-adm-parts-batteries.spec.ts` (`VIS-17`) | POTWIERDZONE |
| ADM-07 | PASS | `qa/playwright/test-visual.spec.ts` (`VIS-08`, `VIS-09`, `VIS-10`) | POTWIERDZONE: formatowanie zaznaczenia (`VIS-08`), pełny zapis widoczny publicznie (`VIS-09`), zmiana rozmiaru zdjęcia respektowana publicznie po naprawie sanitizera (`VIS-10`) |
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
| VIS-08 | Dopełnienie ADM-07: przycisk „Akapit” faktycznie zamienia nagłówek z powrotem na `<p>` | PASS | POTWIERDZONE |
| VIS-09 | Dopełnienie ADM-07: prawdziwa edycja z klawiatury zapisana w „Strony” trafia na stronę publiczną | PASS | POTWIERDZONE (pełny round-trip zapis → odczyt publiczny) |
| VIS-10 | Dopełnienie ADM-07: zmiana rozmiaru zdjęcia w edytorze WYSIWYG jest respektowana na stronie publicznej po zapisie | Pierwszy przebieg **FAIL** — sanitizer HTML (`bootstrap.php`) usuwał atrybut `style` z `<img>`, więc rozmiar nigdy nie przetrwał zapisu; dodatkowo `outline-offset` z podświetlenia zaznaczenia w edytorze zostawał w zapisanym stylu. Naprawione: dopuszczono `width`/`height` w stylu `<img>` (parsowanie per-deklaracja, nie dopasowanie całego atrybutu) + poprawiono `emitChange()`, by czyścił też `outlineOffset`. Drugi przebieg **PASS** | NAPRAWIONE i POTWIERDZONE na teście |
| VIS-11 | Dopełnienie PUB-01/02: dokładny zestaw modeli per kategoria na `/rowery` (nie tylko stan aktywnego filtra) | PASS | POTWIERDZONE |
| VIS-12 | Dopełnienie CFG-05 na środowisku testowym: opis modelu zwinięty na telefonie / rozwinięty na desktopie | PASS | POTWIERDZONE |
| VIS-13 | Dopełnienie CFG-07 poza modalem lakieru: fokus klawiatury w karuzeli zdjęć i akordeonie opisu | PASS | POTWIERDZONE |
| VIS-14 | ADM-02: edycja modelu E82 (nazwa/opis/spec/kategoria/status) + galeria (dodanie/reorder/usunięcie) | PASS | POTWIERDZONE |
| VIS-15 | ADM-03: testowa rama/realizacja (tworzenie+media+publikacja+usunięcie), edycja opisu kategorii | PASS | POTWIERDZONE |
| VIS-18 | ADM-06: palety/kolory lakierów — CRUD, izolacja dostępności model/rama, render+zoom, dopłata w cenie | PASS | POTWIERDZONE |
| VIS-19 | ADM-08: zmiana koloru akcentu, widoczna publicznie, przywrócona | PASS | POTWIERDZONE |
| VIS-20 | ADM-09: walidacja Poczta/Chatbot AI + rzeczywista wysyłka testowa (temat+treść) | PASS | POTWIERDZONE |
| VIS-21 | REL-01: pakiet smoke po wdrożeniu, tag `@smoke` | PASS | POTWIERDZONE |
| VIS-16 | ADM-04: testowa część w „Osprzęt i cena modelu” (opcjonalna/domyślna, przeliczenie ceny, zakres modelu) | PASS | POTWIERDZONE |
| VIS-17 | ADM-05: testowy pakiet baterii przypisany do jednego modelu (Wh, cena, zakres) | PASS | POTWIERDZONE |
