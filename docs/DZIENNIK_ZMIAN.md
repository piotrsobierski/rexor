# Dziennik zmian

Zapis prac: co zostało zrobione, dlaczego i jakie pliki objęła zmiana.
Nowe wpisy dopisujemy na górze.

---

## 2026-09-16 — Cennik lakieru, filtry grafik i kolory ram

### Zakres

Poprawki po pierwszym przejściu właściciela przez gotowy wybór koloru.

### Cennik

Kolor nie ma własnej ceny. „Lakierowanie standardowe" to kolor producenta,
a „Lakierowanie jednokolorowe" (+800 zł) obejmuje dowolny kolor z palet
Porsche PTS i Volkswagen. Robocze 2500 zł przy palecie liczyło ten sam koszt
drugi raz, więc migracja `030` zeruje `price_gross` obu palet i nadpisania
per produkt. Oś dopłaty za kolor zostaje w schemacie - jest jedynym miejscem,
gdzie da się wycenić pojedynczy, rzadki lakier bez nowej opcji procesu.
Interfejs przestał przez to pisać „w cenie" przy lakierze za 800 zł: pokazuje
koszt wymaganego procesu (`paletteNote()` w `paint-picker.tsx`).

### Rendery: filtr zamiast szukania kropki

Renderów jest 457 na 686 kolorów, a jedyną oznaką był biały punkt na próbce.
Picker dostał chip „Z wizualizacją" z licznikiem, panel - listę wyboru
(wszystkie / z renderem / ze zdjęciem referencyjnym / z dowolną grafiką /
bez grafiki) w miejsce pojedynczego checkboxa.

### Rendery w panelu: pełny obraz zamiast kadru

Kafelek renderu brał `thumb_path`, czyli miniaturę 96 px z importu, i kadrował
ją przez `object-cover` - stąd wrażenie mocnego zoomu. Teraz bierze pełny plik
z `object-contain`, a klik otwiera podgląd na pełnym ekranie
(`ImagePreviewDialog`).

### Ramy

Migracja `028` zasiała dostępność palet tylko dla modeli, więc
`frame_paint_palettes` było puste i `GET /api/paints/frame/{slug}` zwracało
pustą listę mimo gotowego schematu. Migracja `030` zasiewa ramy z
`paint_available = TRUE`. Picker na podstronie ramy nadal czeka na decyzję.

### Dostępność palet

`activeFor()` w panelu porównywało `is_active === 1`, co odznaczało wszystkie
pola, gdy PDO zwracał `'1'` jako tekst (zależnie od emulacji przygotowanych
zapytań na hostingu). Porównanie idzie teraz przez `Number()`. Paleta
niedostępna nigdzie dostała wyraźną etykietę, a konfigurator przy zerowej
liczbie palet nie pokazuje już pustego wyboru koloru, tylko informację, że
kolor ustalamy indywidualnie.

### Pliki

`database/migrations/030_paint_pricing_and_frames.sql`,
`apps/web/components/paint-picker.tsx`,
`apps/web/components/admin-paints.tsx`,
`docs/ARCHITEKTURA_LAKIEROW.md`, `docs/BRAKI_DANYCH.md`, `docs/MIGRACJE.md`.

## 2026-09-15 — Wybór koloru lakieru w konfiguratorze

### Zakres

Kolor lakieru stał się osobnym wymiarem konfiguracji: palety, kolory, dopłaty,
rendery i wybór w konfiguratorze. Decyzje i uzasadnienie: `docs/PLAN_LAKIERY.md`.

### Co powstało

- migracja `028_paint_colors.sql`: `paint_palettes`, `paint_colors`,
  `model_paint_palettes`, `frame_paint_palettes`, `paint_renders`,
  `configuration_paint`, plus paleta fabryczna Rexor i dwie palety płatne;
- `apps/api/scripts/import-paints.php` — import 680 lakierów, 457 renderów
  i 664 zdjęć referencyjnych z projektu `e55-paint-to-sample`;
- `apps/api/src/PaintService.php` — dostępność, cena, reguła wymuszania opcji
  lakierowania i migawka wyboru;
- `apps/api/src/AdminPaintService.php` + zakładka „Lakiery” w panelu;
- `apps/web/components/paint-picker.tsx` — sekcja i modal wyboru koloru.

### Dwie osie ceny

Grupa części `paint` dalej wycenia proces (robociznę). Paleta wycenia dostęp do
lakieru. Dopłata za kolor jest ceną sprzedaży, więc nie przechodzi przez narzut
modelu — doliczana jest po nim, tak samo jak `model_price_adjustments`.

Spójności pilnuje `paint_palettes.requires_part_sku`: kolor z palety płatnej nie
może stanąć obok lakierowania standardowego. Konfigurator podnosi opcję sam,
API sprawdza to jeszcze raz przy zapisie.

### Jeden kolor, nie wiele

Konfigurator prowadzi do jednego koloru. `paint-custom-two-color` przestał być
wyborem klienta (`is_customer_configurable = FALSE`), a pod sekcją stoi notka
kierująca malowanie wielokolorowe do uwag i do ustalenia z obsługą.

### Zdjęcia referencyjne poza katalogiem publicznym

664 zdjęcia aut pochodzą z cudzej galerii. Leżą w `storage/paint-reference/`
i są widoczne wyłącznie po zalogowaniu, przez `GET /api/admin/paint-reference/…`.
Publikację każdego z osobna włącza administrator — patrz `docs/BRAKI_DANYCH.md`.

---

## 2026-09-15 — Odznaczone pole wyboru wywracało zapis w panelu

### Zgłoszenie

Zapis ramy w nowej zakładce panelu nie przechodził. Okazało się, że problem
jest starszy niż ramy i dotyczy każdego zapisu niosącego wartość `false`.

### Przyczyna

`updateAdminRecord()` wiązało wartości przez PDO bez jawnego typu. PHP-owe
`false` idzie wtedy do MySQL-a jako pusty ciąg, a serwer w trybie ścisłym
odrzuca `''` dla kolumny `TINYINT(1)`:

```
SQLSTATE[HY000]: General error: 1366 Incorrect integer value: ''
for column 'is_recommended' at row 1
```

`UPDATE` jest jednym zapytaniem, więc wywracał się cały zapis — nie zapisywało
się żadne z pozostałych pól formularza. Dotyczyło to tak samo odznaczenia
„Opublikowana” na stronie i w kategorii oraz `is_active` części; te ścieżki
były zepsute od początku, tylko nikt nie odznaczał tych pól. Nowe zakładki
uwidoczniły błąd, bo mają po dwa pola wyboru w domyślnym formularzu.

Pozostałe miejsca w `AdminService.php` (baterie, `model_parts`, ustawienia
grup) rzutowały już jawnie przez `? 1 : 0` — brakowało tego wyłącznie
w `updateAdminRecord()`.

### Wprowadzone zmiany

- `apps/api/src/AdminService.php`: rzutowanie `is_bool($value)` na `0/1` przed
  związaniem parametru, wspólne dla wszystkich zasobów i pól.

### Weryfikacja

`PATCH /admin/frames/{id}` z `is_recommended: false` zapisuje komplet pól;
`PATCH /admin/pages/{id}` z `is_published: false` (ścieżka sprzed zmiany)
przechodzi w obie strony.

---

## 2026-09-15 — Backend ram i realizacji

### Zgłoszenie

Mail klienta z 13 września: ramy mają być sprzedawane osobno, z własną ceną
i formularzem zapytania, a zrealizowane budowy mają dostać własne podstrony.
Zakres i kontrakt pól ustalone w `docs/PLAN_RAMY_REALIZACJE.md`. To jest
wątek backendowy; front publiczny i panel admina powstają równolegle.

### Stan zastany

Katalog znał wyłącznie modele konfiguratora. Rama istniała jako kolumna ceny
w `bike_models` (`frame_price_gross`), czyli składnik wyceny roweru, a nie
pozycja, którą można kupić. Realizacji nie było w ogóle. Czatbot budował
kontekst z kategorii, modeli i strony serwisu, więc na pytanie „jakie macie
ramy” odpowiadał rowerami w całości.

### Wprowadzone zmiany

- `database/migrations/025_frames_and_projects.sql`: tabele `frames`,
  `frame_media`, `projects`, `project_media` oraz kategoria `inne`.
  Kategorie są wspólne z rowerami - ramy trafiają do `bike_categories`,
  a nie do własnego słownika.
- `apps/api/src/FramesService.php`, `ProjectsService.php`: odczyt publiczny
  (tylko pozycje opublikowane) i operacje panelu. Kształt odpowiedzi jest
  1:1 z `ApiFrame`/`ApiProject` z `apps/web/lib` - to kontrakt z frontem.
- `apps/api/src/MediaLinkService.php`: obsługa tabel `*_media` zebrana raz,
  sparametryzowana whitelistą zasobów. Nazwa tabeli i kolumny nigdy nie
  pochodzi z żądania.
- `apps/api/public/index.php`: `GET /frames`, `GET /frames/{slug}`,
  `GET /projects`, `GET /projects/{slug}` oraz komplet tras adminowych
  (tworzenie, PATCH, usuwanie, przypisanie zdjęcia z rolą, kolejność
  galerii) wzorowanych na trasach modeli.
- `apps/api/src/AdminService.php`: `GET /admin/catalog` dostaje klucze
  `frames`, `frameMedia`, `projects`, `projectMedia`; `updateAdminRecord()`
  rozszerzone o oba zasoby wraz z listą pól, dla których puste pole panelu
  znaczy `NULL` (m.in. `price_gross`, czyli „wymaga wyceny”).
- `apps/api/src/ChatService.php`: sekcje `### RAMY DOSTĘPNE OSOBNO`
  i `### ZREALIZOWANE PROJEKTY` w prompcie czatbota, przed wiedzą
  o zasięgach.
- `apps/api/src/ContactService.php`: `type: 'frame'` w istniejącym
  `POST /contact`, adresat `order_email`, temat
  `Zapytanie o ramę — {frameName} — {name}`, zdarzenie `frame_message`.

### Przy okazji

`deleteModelMedia()` sprawdzało, czy zdjęcie jest jeszcze gdzieś używane,
tylko w trzech tabelach łączących. Po dołożeniu `frame_media`
i `project_media` usunięcie zdjęcia z modelu kasowałoby plik nadal używany
przez ramę albo realizację. Lista tabel jest teraz jedna, w
`mediaLinkTables()`, i każda nowa tabela `*_media` musi tam trafić.

### Weryfikacja

Migracja wykonana lokalnie (MySQL 8.0). Każda nowa trasa sprawdzona curlem
na realnych danych: publiczne wprost, adminowe z tokenem z
`POST /admin/login`. Sprawdzone też, że pozycje nieopublikowane nie wychodzą
publicznie ani nie trafiają do promptu czatbota, że `GET /catalog`
i `GET /admin/catalog` działają bez zmian oraz że `type: 'contact'`
i `type: 'service'` nadal idą na swoje adresy.

---

## 2026-09-11 — Mignięcie starej treści przy wejściu na stronę

### Zgłoszenie

Po edycji treści serwisu w panelu wejście na `/serwis` pokazywało na ułamek
sekundy starą treść i dopiero potem nową. Za każdym razem.

### Stan zastany

`ServicePage` był komponentem klienckim: startował od treści zapisanej na
stałe w kodzie, a prawdziwą dociągał w `useEffect`. Pierwszy render zawsze
pokazywał więc tekst z kodu. Ten sam wzorzec dotyczył dwóch innych rzeczy:

- kolory motywu ustawiał `useEffect` po pobraniu z API, więc strona najpierw
  malowała kolory z arkusza,
- katalog modeli pobierał `usePublicCatalog` po pierwszym renderze, więc ceny
  „od” pojawiały się z opóźnieniem po „Cena w przygotowaniu”.

### Wprowadzone zmiany

- `apps/web/lib/server-catalog.ts`: pobieranie treści strony, motywu
  i katalogu po stronie serwera z `cache: 'no-store'`. Brak API nie wywraca
  strony, tylko włącza treść zapasową. Osobna zmienna `API_BASE_URL` pozwala
  wskazać serwerowi inny adres API niż przeglądarce.
- `apps/web/lib/catalog-merge.ts`: scalanie odpowiedzi API ze statycznymi
  treściami marketingowymi wydzielone do modułu bez `'use client'`, żeby
  serwer i klient liczyły to samo.
- `app/serwis/page.tsx`, `app/page.tsx`, `app/rowery/page.tsx`,
  `app/ramy/page.tsx`, `app/konfigurator/page.tsx`: komponenty serwerowe
  pobierają dane i przekazują je w propsach.
- `components/theme-runtime.tsx`: zamiast ustawiania zmiennych CSS po
  załadowaniu, `<style>` z kolorami w pierwszym renderze.
- `usePublicCatalog` przyjmuje dane z serwera; pobranie po stronie klienta
  zostaje jako zabezpieczenie, gdy serwer nie dostał odpowiedzi z API.

### Weryfikacja

W pierwszym HTML są: treść serwisu z bazy (z pozycją „serwis silnika”, której
nie ma w treści zapasowej), kolory motywu w `<style>` w `<head>`, ceny
„od 21 179 zł” i „od 22 329 zł” oraz nazwy grup opcji konfiguratora.
Wszystkie strony odpowiadają 200.

---

## 2026-09-11 — Wysyłanie zdjęć z telefonu i błędy w odpowiedziach API

### Zgłoszenie

Wysłanie zdjęcia `IMG_0203.jpg` z panelu kończyło się komunikatem
„Wybierz plik obrazu”, mimo że plik był wybrany.

### Stan zastany

- PHP miał domyślne limity: `upload_max_filesize` 2 MB i `post_max_size` 8 MB.
  Kod twierdził, że przyjmuje 8 MB, więc komunikat obiecywał więcej, niż PHP
  w ogóle przyjmował. Zdjęcie miało 14 MB.
- Przy przekroczeniu `post_max_size` PHP odrzuca żądanie przed wejściem do
  kodu: `$_FILES` i `$_POST` są puste. Stary warunek uznawał to za brak
  wybranego pliku, więc komunikat wskazywał na niewłaściwą przyczynę.
- Limit wymiarów 8000 px odrzucał zdjęcia z aparatów 48 Mpix (8064x6048).
- Ostrzeżenia PHP były wypisywane do treści odpowiedzi, przed nagłówkami.
  Psuło to status HTTP, nagłówki CORS i parsowanie JSON po stronie panelu.

### Wprowadzone zmiany

- `docker/php/php.ini`: `upload_max_filesize` 32M, `post_max_size` 36M,
  `memory_limit` 256M oraz `display_errors = Off` z `log_errors = On`.
  Ten sam plik dostaje obraz Dockera i wbudowany serwer deweloperski
  uruchamiany z `php -c docker/php/php.ini -S ...`.
- `apps/api/src/AdminService.php`: rozpoznanie żądania odrzuconego przez
  `post_max_size`, osobne komunikaty dla `UPLOAD_ERR_INI_SIZE` i przesyłki
  przerwanej, limit aplikacji wyprowadzony z limitu serwera oraz wymiar
  maksymalny podniesiony do 12000 px.
- `docs/SRODOWISKO.md`, `README.md`: polecenie uruchomienia API z plikiem ini.

### Weryfikacja

Zdjęcie 5000x3000 o rozmiarze 7,2 MB przechodzi (HTTP 201). Plik 50,8 MB
zwraca HTTP 422 i czysty JSON: „Plik ma 50,8 MB, a serwer przyjmuje wysyłki
do 36,0 MB”. Wcześniej ta sama sytuacja zwracała ostrzeżenia HTML przed
treścią JSON. Testowe zdjęcia zostały usunięte z bazy i z dysku.

### Do rozważenia

Zdjęcia są zapisywane w oryginalnym rozmiarze i w takim trafiają na stronę.
Plik 7 MB na karcie modelu to realny koszt ładowania. Przeskalowanie przy
wysyłce i warianty rozmiarowe to osobne zadanie.

---

## 2026-09-11 — Cena roweru jako suma składników

### Zgłoszenie

Każdy model ma cenę składania i cenę części, i to one definiują cenę całego
roweru, a nie kwota wpisana ręcznie. Do tego modele mają części
niekompatybilne między sobą — trzeba rozstrzygnąć, czy dostępność części
definiuje się na poziomie modelu czy kategorii, tak żeby było to łatwe
w panelu i obsłużone w konfiguratorze.

### Stan zastany

- `bike_models.base_price` było wpisywane ręcznie: 15 000 zł dla E82 przy
  sumie części domyślnych 16 880 zł i baterii 2400 zł. Cena sprzedaży była
  niższa od wartości samych komponentów i nic tego nie pokazywało.
- Dopłaty liczone jako różnica wobec pozycji domyślnej były poprawne, ale
  liczone od błędnego punktu startu.
- Grupa części `frame` dublowała model i rozmiar; w seedzie istniała rama
  „E55 rozmiar 19”, której nie ma w tabeli rozmiarów.
- `category_parts` przypisywało w seedzie wszystkie części do MTB i nie było
  używane ani w wycenie, ani w konfiguratorze.
- Grupy opcji i ceny części były zapisane na stałe w `apps/web/lib/catalog.ts`,
  więc panel nie miał wpływu na to, co widzi klient. Publiczny `/catalog`
  nie zwracał nawet listy części.
- Panel nie miał ekranu do definiowania osprzętu modelu.

### Decyzje

1. Cena wynika z sumy: rama (+ dopłata rozmiaru) + bateria + wybrane części
   + składanie + narzut + dopłaty modelu. `base_price` zmienia się w
   `computed_base_price_gross` zapisywane tylko przez serwer.
2. Dostępność części definiuje wyłącznie model, bo zgodność wynika z ramy
   i silnika, a nie z kategorii. Kategoria zostaje elementem nawigacji.
   Żmudność per model rozwiązują atrybuty zgodności części, wymagania modelu
   i kopiowanie osprzętu między modelami — nie szablon kategorii, bo modele
   w jednej kategorii i tak różnią się wymiarami.
3. Rama przestaje być częścią z katalogu: jej cena jest polem modelu.

### Wprowadzone zmiany

- `database/migrations/004_split_bundle_groups.sql`: grupy `cockpit` i `wheels`
  były workami na kilka osobnych komponentów — sześć pozycji domyślnych w jednej
  grupie kokpitu. Przy dopłatach liczonych jako różnica było to niewidoczne
  (każda dopłata 0 zł), przy sumie składników rower gubił około 1380 zł. Nowe
  grupy: siodło, sztyca, kierownica, gripy, mostek, pedały, piasta przednia
  i tylna.
- `database/migrations/003_component_pricing.sql`: `computed_base_price_gross`,
  `frame_price_gross`, `assembly_price_gross`, `margin_percent`,
  `fit_requirements` w `bike_models`, `price_delta_gross` w `model_sizes`,
  `fit_attributes` w `parts`, usunięcie grupy `frame` i tabeli
  `category_parts`, atrybuty zgodności i wymagania dla obu modeli e-MTB oraz
  robocza cena składania 1500 zł. `schema.sql` i `seed.sql` pozostają bez
  zmian, bo są zapisaną migracją bazową — migracja 003 wykonuje się po nich.
- `apps/api/src/PricingService.php`: jedna funkcja `priceConfiguration` liczy
  cenę katalogową i cenę wysłanej konfiguracji, plus `recomputeModelBasePrice`
  i zachowawcze sprawdzanie zgodności `partFitStatus`.
- `apps/api/src/CatalogService.php`: publiczny katalog zwraca grupy opcji,
  ceny, rozmiary i składniki ceny modelu.
- `apps/api/src/ConfigurationService.php`: wycena wysłanej konfiguracji przez
  `PricingService`, rozbicie ceny w migawce, pozycja „wycena indywidualna”
  zamiast przemilczanego braku ceny.
- `apps/api/src/AdminService.php` i `public/index.php`: edycja ramy, składania
  i narzutu zamiast ceny bazowej, rozbicie ceny każdego modelu, endpointy
  `/admin/model-parts`, `/admin/model-group-settings`,
  `/admin/models/{id}/copy-parts` i `/admin/recompute-prices`, przeliczanie
  ceny po każdej zmianie części, rozmiaru, baterii lub modelu.
- `apps/web/lib/catalog.ts` i `lib/pricing.ts`: statyczna lista trzyma tylko
  treści marketingowe, a cena liczy się tą samą formułą co na serwerze.
- `apps/web/components/bike-configurator.tsx`: wybory kluczowane slugiem grupy
  i SKU części, grupy `fixed` ukryte, „własna część” jako tryb grupy.
- `apps/web/components/admin-panel.tsx`: zakładka „Osprzęt i cena modelu”
  z trybem grupy, podpowiedziami zgodności, rozbiciem ceny i kopiowaniem
  osprzętu.
- `apps/web/components/configuration-snapshot-view.tsx`: podsumowanie pokazuje
  cenę pozycji i składniki ceny, nie tylko dopłaty.
- `docs/CENY_I_DOPLATY.md`, `docs/WYMAGANIA.md`: nowa reguła cenowa i usunięcie
  `category_parts` z opisu schematu.

### Do potwierdzenia

Ceny „od” wzrosły: E82 z 15 000 zł do około 20 800 zł, E55 z 16 500 zł do
około 22 300 zł. Wynikają z roboczych cen części w seedzie i roboczej ceny
składania 1500 zł. Przed publikacją trzeba zatwierdzić cenę ramy, cenę
składania i narzut każdego modelu razem z cenami części.

### Weryfikacja

Migracje 003 i 004 wykonane na lokalnym MySQL. Po nich każda grupa w każdym
modelu ma dokładnie jedną pozycję domyślną, a ceny „od” wynoszą 21 179 zł dla
E82 i 22 329 zł dla E55; CFR707 nadal nie ma składników i pozostaje bez ceny.
Sprawdzone przez API: zmiana domyślnych hamulców z Shimano na Magurę podnosi
cenę „od” o 300 zł i wraca po cofnięciu, zmiana ceny składania o 100 zł zmienia
cenę o 100 zł. Wysłana konfiguracja E82 z Magurą i własnym widelcem dała
20 479 zł, czyli 21 179 + 300 − 1000. Testowa konfiguracja została usunięta
z bazy.

Ceny robocze w seedzie nadal wymagają zatwierdzenia — zmieniła się metoda
liczenia, nie źródło danych cenowych.

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
