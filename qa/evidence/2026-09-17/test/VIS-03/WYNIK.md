# VIS-03 — Panel: podgląd świeżo zapisanej konfiguracji

- Data i czas: 2026-09-17, uruchomienie automatyczne (Playwright)
- Środowisko: test — https://rexor.sobierski.com
- Adres: /konfigurator?model=e82 → /konfiguracja/{token} → /admin/konfiguracje/{publicId}
- Viewport / przeglądarka: 1440 × 1000 / Chromium (Playwright)
- Dane testowe: zgłoszenie `[QA] test:visual VIS-03`, e-mail `qa-configurator@example.invalid`

| Krok | Wynik | Dowód | Uwagi |
| --- | --- | --- | --- |
| 1 | PASS | `01-configurator-before-submit.png` | Formularz kontaktowy konfiguratora przed wysyłką, zgoda zaznaczona. |
| 2 | PASS | `02-configurator-confirmation.png` | Strona potwierdzenia z numerem projektu (publicId). |
| 3 | PASS | `03-admin-configuration-detail.png` | Widok szczegółów w panelu otwiera się bez komunikatu błędu. |

## Wynik testu skryptowego

`npm run test:visual` — test `VIS-03`: **PASS**. Podgląd świeżo utworzonej
konfiguracji w panelu admina otworzył się poprawnie, bez komunikatu błędu
i bez błędów konsoli.

## Konsola i sieć

- Console: brak błędów podczas wypełniania konfiguratora ani podglądu w panelu
- Żądania: `POST /api/configurations` (zapis) i `GET /admin/configurations/{publicId}` (odczyt) odpowiedziały bez błędu

## Jeśli wykryto błąd

Zgłoszony błąd „pokazuje się błąd jeżeli z panelu administratora chciałbym
ją sprawdzić” **nie odtworzył się** dla standardowej ścieżki konfiguracji
(model E82, domyślny rozmiar/bateria, bez własnej części). Kod odczytu
(`apps/api/src/ConfigurationService.php:324` `getConfigurationForAdmin()`,
render w `apps/web/components/configuration-snapshot-view.tsx`) poprawnie
zabezpiecza opcjonalne pola (`battery`, `paint`, `customerNotes`).

Zidentyfikowano jednak nieblokujący, utajony problem: dopasowanie zdjęcia
zapasowego w `configuration-snapshot-view.tsx:44` odbywa się po **nazwie**
modelu (`bikeModels.find(item => item.name === snapshot.model.name)`), nie
po slugu/id — zmiana nazwy modelu w katalogu po zapisaniu konfiguracji
cicho podmieni zdjęcie na ogólne zamiast rzucić błąd. To nie tłumaczy
zgłoszonego objawu, ale warto to poprawić przy okazji.

Możliwe, że zgłoszony błąd występuje tylko dla konkretnej kombinacji
wyborów (np. „Dostarczam własną część”, gdzie `part_id` jest `NULL`) albo
w innym środowisku/przeglądarce niż użyte tutaj. Automat nie sprawdził
jeszcze tej kombinacji — rekomendacja: jeśli błąd wystąpi ponownie, zebrać
zrzut ekranu / treść błędu i identyfikator konfiguracji, żeby zawęzić
przyczynę. Naprawa nie została wykonana, bo błąd się nie potwierdził.
