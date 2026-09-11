# Dziennik zmian

Zapis prac: co zostało zrobione, dlaczego i jakie pliki objęła zmiana.
Nowe wpisy dopisujemy na górze.

---

## 2026-09-11 — Bateria jako wybór w konfiguracji

### Zgłoszenie

Bateria ma być wybierana jak każda inna część konfiguracji i edytowalna
w panelu administracyjnym osobno dla każdego modelu.

### Stan zastany

Schemat bazy miał już tabelę `model_batteries` powiązaną z modelem oraz
kolumnę `configurations.model_battery_id`, ale API brało wyłącznie pakiet
oznaczony jako domyślny. Konfigurator pokazywał baterię jako stały opis
modelu, a panel nie miał żadnego ekranu do jej edycji.

### Wprowadzone zmiany

- `database/migrations/001_battery_selection.sql`: kolumny `code`,
  `short_label` i `sort_order` w `model_batteries`, unikalny klucz
  `(model_id, code)`, uzupełnienie istniejących rekordów oraz przykładowe
  drugie pakiety dla E82 i E55. Kod jest potrzebny, bo identyfikator liczbowy
  nie nadaje się do snapshotu konfiguracji ani do katalogu zapasowego frontendu.
- `database/migrations/002_battery_label_format.sql`: etykiety pakietów
  w polskim formacie liczb, zgodnie z zapisem z panelu.
- `apps/api/src/CatalogService.php`: publiczny katalog zwraca listę aktywnych
  pakietów modelu razem z ceną i flagą pakietu domyślnego.
- `apps/api/src/ConfigurationService.php`: przyjmuje `batteryCode`, sprawdza
  przynależność pakietu do modelu, liczy dopłatę względem pakietu domyślnego
  i zapisuje wybór w snapshotcie oraz w `model_battery_id`.
- `apps/api/src/AdminService.php` i `apps/api/public/index.php`: odczyt listy
  baterii w panelu, `POST /admin/batteries` oraz `PATCH /admin/batteries/{id}`.
  Pojemność pakietu i energia są liczone po stronie serwera z liczby ogniw
  i napięcia, więc panel nie zapisze parametrów, które się nie zgadzają.
  Ustawienie pakietu domyślnego zdejmuje tę flagę z pozostałych pakietów modelu.
- `apps/web`: sekcja „Bateria" w konfiguratorze wraz z wpływem na cenę,
  pakiet w podsumowaniu konfiguracji, zakładka „Baterie" w panelu z edycją
  i dodawaniem pakietów per model.

### Sprawdzone

Migracje wykonane lokalnie. Zapis konfiguracji E82 z lżejszym pakietem daje
14 400 zł zamiast 15 000 zł, nieznany kod baterii kończy się komunikatem
walidacji, a snapshot konfiguracji zawiera wybrany pakiet.

---

## 2026-09-11 — Warstwa designu, prezentacja zdjęć i klikalne kafle

### Zgłoszone problemy

1. Na desktopie scena ze zdjęciem roweru ma dużo pustego szarego tła.
2. Na mobile zdjęcie nie skaluje się do kontenera.
3. Nazwa modelu jest nadrukowana na zdjęciu, kontrast jest zły.
4. Tekst w przyciskach rozmiaru ramy nie jest wyśrodkowany.
5. Kafle modeli do wyboru nie są klikalne w całości.
6. Brak realnie używanego systemu designu, style są rozsypane po komponentach.

### Diagnoza

1. i 2. Scena miała wysokość `calc(100vh-112px)` przy zdjęciach o proporcji
   3:2. Kontener o innej proporcji niż zdjęcie plus `object-contain` zawsze
   zostawia pas pustego tła. Dodatkowo padding `pt-28 pb-24` rezerwował miejsce
   na nakładki, co na mobile odbierało zdjęciu wysokość. Klasa `w-full` na
   `img` rozciągała szerokość zamiast wpisać zdjęcie w kontener.
3. Nagłówek modelu i pigułki specyfikacji były pozycjonowane absolutnie na
   zdjęciu, więc kontrast zależał od tego, co akurat jest pod tekstem.
4. `RadioGroupItem` dostawał klasę `sr-only`, ale komponent scala klasy przez
   `tailwind-merge`, a bazowa klasa `relative` nie należy do tej samej grupy co
   `sr-only`. Element zostawał w układzie jako kwadrat 16 px i zajmował wiersz
   w siatce `place-items-center`, więc etykieta schodziła z osi.
5. Kafle modeli na stronie głównej i na `/rowery` były zwykłymi `article`,
   klikalny był tylko przycisk w środku.
6. W projekcie jest shadcn/ui i Tailwind v4, ale kolory były wpisywane wprost
   jako `text-black/58`, `border-black/10` itd.

### Wprowadzone zmiany

- `apps/web/app/globals.css`: tokeny semantyczne (`ink`, `ink-muted`,
  `ink-subtle`, `line`, `surface`, `stage`) wystawione do Tailwinda przez
  `@theme inline`, wspólne klasy komponentów sceny, kafli i pól wyboru, klasa
  `.choice-input` do pewnego chowania natywnego inputa oraz jednolite stany
  `hover` i `focus-visible`.
- `apps/web/components/bike-configurator.tsx`: scena zdjęcia dostała proporcję
  zgodną ze zdjęciami, nagłówek modelu i pigułki specyfikacji wyszły spod
  zdjęcia na własne pasy, przyciski rozmiaru i opcji używają `.choice-input`.
- `apps/web/components/home-page.tsx`, `apps/web/components/static-pages.tsx`:
  kafle modeli klikalne na całej powierzchni.
