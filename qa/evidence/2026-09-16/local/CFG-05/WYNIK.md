# CFG-05 — Opis i specyfikacja w konfiguratorze

- Data i czas: 2026-09-16
- Środowisko: lokalne (`http://localhost:3000/konfigurator?model=e82`)
- Przeglądarka: Google Chrome uruchomiony automatycznie
- Viewporty: 390 × 844 oraz 1440 × 1000
- Dane testowe: brak; test wyłącznie odczytowy

| Krok | Wynik | Dowód | Uwagi |
| --- | --- | --- | --- |
| 1. Telefon, stan początkowy | PASS | `01-mobile-closed-expand.png` | Sekcja jest zamknięta; po prawej widoczne są „Rozwiń” i strzałka. |
| 2. Telefon, kliknięcie kontrolera | PASS | `02-mobile-open-collapse.png` | Sekcja jest otwarta; po zakończeniu renderowania etykieta zmienia się na „Zwiń”. |
| 3. Desktop, stan początkowy | PASS | `03-desktop-open.png` | Sekcja jest otwarta, zgodnie z zachowaniem desktopowym; kontroler mówi „Zwiń”. |

## Konsola i sieć

- Console: brak ostrzeżeń i błędów.
- Uwagi do automatyzacji: po kliknięciu `details` otwiera się natywnie od razu,
  a tekst kontrolowany przez React aktualizuje się w kolejnym cyklu renderowania.
  Test czekał 250 ms przed oceną widocznego tekstu.

## Wniosek

Scenariusz zaliczony lokalnie. Do pełnego zaliczenia na serwerze należy po
wdrożeniu powtórzyć te same trzy kroki na środowisku testowym.
