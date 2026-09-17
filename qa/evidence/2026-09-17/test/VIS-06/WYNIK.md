# VIS-06 — CFG-07 dopełnienie: fokus w modalu lakieru

- Data i czas: 2026-09-17, uruchomienie automatyczne (Playwright)
- Środowisko: test — https://rexor.sobierski.com
- Adres: /konfigurator?model=e82
- Viewport / przeglądarka: 1440 × 1000 / Chromium (Playwright)
- Dane testowe: brak (tylko odczyt)

| Krok | Wynik | Dowód | Uwagi |
| --- | --- | --- | --- |
| 1 | PASS | `01-dialog-open.png` | Otwarcie modalu klawiaturą (fokus na „Wybierz kolor” + Enter). |
| 2 | PASS | — | 25× Tab — fokus caly czas wewnątrz `[role="dialog"]`, nie ucieka pod modal. |
| 3 | PASS | `02-dialog-closed.png` | Escape zamyka modal, fokus nie ląduje na `<body>`. |

## Wynik testu skryptowego

`npm run test:visual` — test `VIS-06`: **PASS**.

## Dlaczego wcześniej PARTIAL i co dokładnie odblokowano

CFG-07 (`qa/evidence/2026-09-17/test/CFG-07/`) potwierdzało już, że Enter i
Escape działają, ale zaznaczało: „pełny audyt Tab nadal do wykonania” —
konkretnie czy fokus może „uciec pod modal” przy otwartym pickerze lakieru
(główne ryzyko wymienione w opisie scenariusza). Ten test domyka dokładnie
tę lukę: 25 kolejnych Tab w otwartym modalu nie wyprowadziło fokusu poza
`[role="dialog"]` ani razu.

Nie jest to pełny audyt WSZYSTKICH interaktywnych elementów konfiguratora
(karuzela zdjęć, akordeon opisu) — tylko modal lakieru, czyli element
najbardziej narażony na „ucieczkę" fokusu. Reszta (Enter/Escape na
akordeonie, karuzela) była już pokryta wcześniejszym CFG-07/CFG-05.

## Konsola i sieć

- Console: brak błędów
