# Architektura lakierów: palety, cenniki i powiązania

Dokument referencyjny: **co** jest w systemie i **jak** jest połączone.
Uzasadnienie decyzji („dlaczego tak, a nie inaczej") leży osobno
w `docs/PLAN_LAKIERY.md`. Reguła cenowa w szerszym kontekście całej wyceny:
`docs/CENY_I_DOPLATY.md`.

Stan na 15 września 2026 r., migracja `028_paint_colors.sql`.

---

## 1. Mapa bytów

```text
                    ┌──────────────────┐
                    │  paint_palettes  │  paleta: marka + cena + reguła procesu
                    │                  │  (Rexor, Porsche PTS, Volkswagen)
                    └────────┬─────────┘
                             │ 1:N
              ┌──────────────┼───────────────────────────┐
              │              │                           │
    ┌─────────▼────────┐     │                 ┌─────────▼──────────┐
    │   paint_colors   │     │                 │ model_paint_       │
    │                  │     │                 │ palettes           │──► bike_models
    │ nazwa, kod, hex, │     │                 │ (dostępność+cena)  │
    │ finish, synonimy │     │                 └────────────────────┘
    │ + zdjęcie ref.   │     │                 ┌────────────────────┐
    └─────────┬────────┘     └────────────────►│ frame_paint_       │──► frames
              │ 1:N                            │ palettes           │
              │                                └────────────────────┘
    ┌─────────▼────────┐
    │  paint_renders   │  obraz PARY kolor × produkt
    │                  │──► bike_models  (model_id)
    │ standard / ultra │──► frames       (frame_id)
    │ / photo          │
    └──────────────────┘

    ┌────────────────────────┐
    │  configuration_paint   │  migawka wyboru w zapisanej konfiguracji
    │  1:1 z configurations  │──► paint_colors (SET NULL)
    └────────────────────────┘
```

Jedno zdanie na byt:

| tabela | co trzyma | kardynalność |
|---|---|---|
| `paint_palettes` | marka, cena dostępu do lakieru, reguła wymuszania procesu | 3 wiersze |
| `paint_colors` | pojedynczy lakier + zdjęcie referencyjne auta | 686 |
| `model_paint_palettes` | które palety widać przy którym modelu | model × paleta |
| `frame_paint_palettes` | to samo dla ram sprzedawanych osobno | rama × paleta |
| `paint_renders` | obraz produktu w tym kolorze - render albo zdjęcie | kolor × produkt × wariant (zdjęć wiele) |
| `configuration_paint` | co klient wybrał i za ile, na zawsze | 1:1 z konfiguracją |

---

## 2. Dlaczego mapujemy paletę, a nie kolor

To jest najważniejsza decyzja strukturalna i widać ją w kardynalności:

```text
źle:   model ──< model_paint_colors >── kolor      →  636 wierszy na model
dobrze: model ──< model_paint_palettes >── paleta  →  3 wiersze na model
```

Przypisanie Porsche do E55 to **jeden** wiersz. Wyłączenie jednego lakieru
globalnie to `paint_colors.is_active = FALSE`. Wyłączenie całej palety dla
jednego modelu to `model_paint_palettes.is_active = FALSE`.

Nie ma mechanizmu „wyłącz lakier nr 317 tylko dla E82" i to jest świadome —
do dziś nie pojawiła się potrzeba, a tabela wyjątków kosztowałaby więcej niż
wnosi. Gdyby zaszła, dochodzi `model_paint_color_exclusions(model_id, color_id)`
i jedno `NOT EXISTS` w zapytaniu; reszta zostaje bez zmian.

### Model vs rama: dwie tabele zamiast jednej

`model_paint_palettes` i `frame_paint_palettes` to bliźniacze tabele. Wersja
z jedną tabelą i dwiema kolumnami `NULL` (`model_id`, `frame_id`) wygląda
oszczędniej, ale w MySQL **UNIQUE nie dedupikuje wierszy z NULL** — klucz nie
chroniłby wtedy przed duplikatem. Dwie tabele mają prawdziwy klucz główny
`(owner_id, palette_id)` i `ON DUPLICATE KEY UPDATE` działa bez sztuczek.

W kodzie różnicę zdejmuje whitelista w jednym miejscu:

```php
// PaintService.php — nazwa tabeli NIGDY nie pochodzi z żądania
$definitions = [
    'model' => ['table' => 'model_paint_palettes', 'column' => 'model_id'],
    'frame' => ['table' => 'frame_paint_palettes', 'column' => 'frame_id'],
];
```

`paintPalettesFor($pdo, $resource, $ownerId)` obsługuje oba przypadki jedną
ścieżką kodu. Dokładanie trzeciego rodzaju produktu to jeden wpis w tablicy.

---

## 3. Cennik: trzy poziomy i dwie osie

### 3.1 Dwie osie ceny

Lakierowanie ma dwa niezależne składniki, które łatwo pomylić:

```text
cena malowania = opcja PROCESU              +  dopłata za KOLOR
                 (część z grupy `paint`)       (paleta / kolor)
                 robocizna lakierni            dostęp do lakieru
                 zwykły cennik `parts`         paint_palettes
                 przechodzi przez narzut       NIE przechodzi przez narzut
```

Dlaczego kolor omija narzut: dopłata za paletę jest **ceną sprzedaży**
ustaloną wprost („ten pigment kosztuje X"), a nie kosztem składnika, który
dopiero trzeba obłożyć marżą. Mnożenie jej przez `margin_percent` dałoby cenę,
której nikt nie ustalał.

### Ile dziś kosztuje kolor: zero

Obowiązujący cennik (migracja `030`) obsadza całą kwotę na osi procesu:

| opcja z grupy `paint` | cena | co obejmuje |
| --- | --- | --- |
| Lakierowanie standardowe | 0 zł | kolor z palety producenta (`rexor-standard`) |
| Lakierowanie jednokolorowe | +800 zł | **dowolny** kolor z palet Porsche PTS i Volkswagen |
| Lakierowanie indywidualne | wycena | dwa kolory, przejścia, wzory - poza konfiguratorem |

Wszystkie trzy palety mają więc `price_gross = 0`, a `porsche-pts`
i `volkswagen` mają `requires_part_sku = 'paint-single-color'`. Klient płaci
raz, za proces. Wcześniejsze 2500 zł przy palecie było założeniem roboczym
i liczyło ten sam koszt dwa razy.

Oś „dopłata za kolor" zostaje w schemacie mimo zerowych kwot, bo jest jedynym
miejscem, gdzie da się wycenić **pojedynczy** lakier (rzadki pigment, płatek,
paleta premium) bez tworzenia nowej opcji procesu. Interfejs pokazuje wtedy
kwotę palety, a gdy jest zerowa - koszt wymaganego procesu, nigdy mylącego
„w cenie" przy lakierze za 800 zł.

Miejsce w formule całej wyceny (`PricingService::priceConfiguration`):

```text
  rama (+ dopłata rozmiaru)
+ bateria
+ suma cen wybranych części        ← tu siedzi opcja procesu lakierowania
+ składanie
─────────────────────────────
= podsuma
× (1 + narzut modelu %)
+ dopłaty modelu (model_price_adjustments)
+ dopłata za kolor lakieru         ← tu siedzi kolor, na samym końcu
─────────────────────────────
= cena brutto konfiguracji
```

Ta sama kolejność obowiązuje w `apps/web/lib/pricing.ts`, żeby cena pokazywana
w przeglądarce nie mogła rozjechać się z ceną liczoną przez API.

### 3.2 Trzy poziomy dopłaty za kolor

Cena koloru rozstrzyga się kaskadowo, od najbardziej szczegółowej:

| # | źródło | zastosowanie |
|---|---|---|
| 1 | `paint_colors.price_gross_override` | jeden lakier drożej niż reszta palety (np. kolor efektowy wielowarstwowy) |
| 2 | `model_paint_palettes.price_gross_override` / `frame_paint_palettes.…` | ta sama paleta w innej cenie dla jednego produktu |
| 3 | `paint_palettes.price_gross` | cena palety — domyślna dla wszystkiego |

W SQL poziom 2 wchodzi już przy pobieraniu palety, poziom 1 przy kolorze:

```sql
-- poziom 2 nadpisuje poziom 3
COALESCE(link.price_gross_override, pp.price_gross) AS price_gross
```

```php
// poziom 1 nadpisuje wynik powyższego
'priceGross' => $color['price_gross_override'] !== null
    ? (float) $color['price_gross_override']
    : $palettePrice,
```

Efekt: `priceGross` w odpowiedzi API to zawsze **cena gotowa do pokazania**.
Ani frontend, ani panel nie odtwarzają tej kaskady u siebie.

### 3.3 Stan startowy

| paleta | rodzaj | dopłata | wymaga opcji |
|---|---|---|---|
| Kolory Rexor | `factory` | 0 zł | — |
| Porsche Paint to Sample | `custom` | 2 500 zł * | `paint-single-color` |
| Volkswagen | `custom` | 2 500 zł * | `paint-single-color` |

\* wartość robocza do zatwierdzenia — `docs/BRAKI_DANYCH.md`.

---

## 4. Reguła spójności: kolor wymusza proces

Bez reguły dałoby się zestawić „lakierowanie standardowe" (0 zł) z lakierem
Paint to Sample — rower wyjechałby w kolorze, za który nikt nie zapłacił
robocizny.

Nośnikiem reguły jest jedna kolumna: `paint_palettes.requires_part_sku`.
Wskazuje **minimalną** opcję z grupy `paint`, jakiej wymaga kolor z tej palety.

Warunek akceptacji (`PaintService::validatePaintSelection`):

```text
przejdź, jeżeli   wybrana opcja == requires_part_sku
       albo       wybrana opcja != opcja domyślna grupy `paint`
```

Drugi człon jest celowy: „cokolwiek szerszego niż lakierowanie standardowe"
przechodzi. Dzięki temu dołożenie w panelu droższej opcji lakierowania nie
wymaga dopisywania nowej reguły ani migracji.

Reguła działa w dwóch miejscach, niezależnie:

| gdzie | zachowanie |
|---|---|
| konfigurator (`choosePaint`) | **podnosi** opcję procesu sam i mówi o tym w UI |
| API (`createConfiguration`) | **odrzuca** niespójny zapis, HTTP 422 |

Frontend jest wygodą, API jest prawdą. Serwer nie zakłada, że przeglądarka
zrobiła swoją robotę:

```
422 → Kolor Riviera Blue wymaga opcji „Lakierowanie jednokolorowe"
      w grupie Lakierowanie.
```

### Dlaczego nie `compatibility_rules`

Istniejąca tabela `compatibility_rules` wiąże `part_id` z `part_id`. Kolor nie
jest częścią, więc nie da się w niej zapisać „kolor → wymaga części". Jedna
kolumna na palecie okazała się tańsza niż rozszerzanie silnika reguł o drugi
typ bytu.

---

## 5. Zdjęcia: dwie klasy, różna kardynalność

To rozróżnienie przesądziło o schemacie:

| | zdjęcie referencyjne | render | zdjęcie produktu |
|---|---|---|---|
| **co to jest** | prawdziwe auto w tym lakierze | wizualizacja ramy w tym lakierze | prawdziwy rower w tym lakierze |
| **zależy od** | wyłącznie koloru | pary **kolor × produkt** | pary **kolor × produkt** |
| **ile** | jedno na kolor | jedno na kolor × produkt × wariant | ile ujęć zrobimy |
| **gdzie** | `paint_colors.reference_image_path` | `paint_renders` (`standard`, `ultra`) | `paint_renders` (`photo`) |
| **plik** | `storage/paint-reference/` (poza public) | `public/media/paints/renders/{model}/` | `/uploads/…` z panelu |
| **publiczne** | nie, dopóki `reference_is_public = FALSE` | tak (`is_public`) | tak (`is_public`) |
| **ile mamy** | 664 | 457 (228 standard + 229 ultra) | tyle, ile wgramy |

Zdjęcie produktu siedzi w `paint_renders`, a nie w osobnej tabeli, bo ma
dokładnie tę samą kardynalność, ścieżkę pliku, flagę publiczności i trasę
serwującą co render. Różnica jest jedna i siedzi w kodzie: render trzymamy
po jednym na wariant (kolejny upload podmienia poprzedni), a zdjęć wiele -
stąd kolumna `sort_order`, która przy jednym renderze nie miała czego
porządkować.

Render ramy E55 nie pokazuje, jak lakier wygląda na E82 — dlatego
`paint_renders` ma `model_id` / `frame_id`, a zdjęcie auta jest wspólne dla
wszystkich produktów i siedzi wprost przy kolorze.

Rozważaliśmy tańszy wariant: żadnego `model_id`, a osobne rendery dla innego
roweru robi się przez osobną **paletę** przypiętą tylko do tego modelu.
Odrzucony, bo paleta odpowiada na pytanie „jakie kolory wolno tu wybrać", a nie
„jak ten kolor wygląda na tej ramie". Rozdzielenie palet per model dawałoby
686 kolorów powielonych tyle razy, ile mamy produktów, każdy ze swoim wpisem
dostępności i własną ceną do pilnowania — a i tak trzeba by czegoś, co wiąże
render z produktem. Klucz `(color_id, produkt, variant)` robi to wprost
i zostawia paletę przy jej jednej roli.

Konsekwencja dla panelu: lista renderów przy kolorze idzie za wyborem produktu.
Bez tego pokazywała komplet renderów koloru i przełączenie modelu nic nie
zmieniało, co wyglądało jak brak przeładowania.

### Ścieżki plików zamiast wierszy w `media`

Rendery **nie** są wpisywane do tabeli `media`. To setki obrazów generowanych
maszynowo: bez tekstu alternatywnego, podpisu i kolejności w galerii. Wiersz
w `media` nie wnosiłby nic poza kosztem, a wciągałby je w logikę sprzątania
sierot (`deleteOrphanMedia`, `mediaLinkTables`).

Obie drogi zapisują to samo pole `image_path`:

```text
import zbiorczy  →  /media/paints/renders/e55/riviera-blue-s8-ultra.jpg
upload w panelu  →  /uploads/2026/09/{32 znaki hex}.jpg
```

Serwują je dwie wąskie trasy w `apps/api/public/index.php`. Wzorzec renderów
nie dopuszcza kropki poza rozszerzeniem, więc nie da się nim wyjść z katalogu:

```php
'~^/media/(paints/renders/[a-z0-9-]+/[a-z0-9_-]+\.(?:jpg|jpeg|png|webp|avif))$~'
```

### Zdjęcie bije render, `ultra` bije `standard`

Gdziekolwiek pokazujemy jeden obraz, kolejność jest ta sama:
`photo` → `ultra` → `standard` → płaska próbka `hex`. W kodzie jedna funkcja,
`paintImages()` / `bestRender()` po stronie web i to samo rozstrzygnięcie
w `PaintService::resolvePaintSelection` dla migawki.

Zdjęcie idzie pierwsze, bo odpowiada na inne pytanie niż render: nie „jak to
mniej więcej wygląda", tylko „tak ten rower wygląda naprawdę". Dlatego web
**nazywa** to, co pokazuje - plakietka „zdjęcie" na podglądzie w pickerze,
podpis slajdu w konfiguratorze i osobna nota pod próbką („prawdziwe zdjęcie
roweru w tym lakierze, a nie wizualizacja"). Bez tego zdjęcie i render byłyby
dla klienta tym samym obrazkiem, a obiecują różne rzeczy.

Kolorów ze zdjęciem jest i będzie mało, więc mają własny filtr („Ze zdjęciem")
obok filtru wizualizacji, a próbka w siatce dostaje grubszą obwódkę kropki.

---

## 6. Przepływ danych

### 6.1 Konfigurator

```text
otwarcie strony
  └─ GET /api/catalog            (bez lakierów — 680 kolorów tu nie jedzie)

klik „Wybierz kolor"                          ← dopiero teraz
  └─ GET /api/paints/model/e55   ~216 kB, po gzipie ~50 kB
       └─ paintPalettesFor('model', id)
            ├─ palety aktywne dla modelu + cena (poziom 2/3)
            ├─ kolory aktywne + cena (poziom 1)
            └─ rendery dla TEGO produktu

wybór koloru
  ├─ podgląd w modalu (stan lokalny, ceny nie rusza)
  ├─ potwierdzenie → choosePaint()
  │    ├─ zapis w paintByModel
  │    ├─ podniesienie opcji procesu, jeśli paleta tego wymaga
  │    └─ log zdarzenia do dziennika aktywności
  └─ zdjęcia i render wchodzą na początek galerii (zdjęcia pierwsze)

zapis projektu
  └─ POST /api/configurations { paintPaletteSlug, paintColorSlug, … }
       ├─ resolvePaintSelection()   ← dostępność i cena WYŁĄCZNIE z serwera
       ├─ validatePaintSelection()  ← reguła procesu, drugi raz
       ├─ priceConfiguration(…, $paint)
       └─ storeConfigurationPaint() ← migawka
```

Klient przysyła **dwa slugi**, nigdy ceny ani identyfikatorów liczbowych.

### 6.2 Endpointy

| metoda | ścieżka | kto | po co |
|---|---|---|---|
| GET | `/api/paints/{model\|frame}/{slug}` | publiczny | palety + kolory + rendery dla produktu |
| GET | `/api/media/paints/renders/…` | publiczny | plik renderu |
| GET | `/api/admin/paints` | admin | pełny stan sekcji „Lakiery" |
| POST/PATCH/DELETE | `/api/admin/paint-palettes[/{id}]` | admin | palety |
| POST/PATCH/DELETE | `/api/admin/paint-colors[/{id}]` | admin | kolory |
| POST | `/api/admin/paint-availability` | admin | przypnij/odepnij paletę do produktu |
| POST | `/api/admin/paint-settings` | admin | globalne ustawienia palet |
| POST/DELETE | `/api/admin/paint-renders[/{id}]` | admin | rendery |
| GET | `/api/admin/paint-reference/…?token=` | admin | zdjęcie referencyjne |

Ostatnia trasa jako jedyna przyjmuje token w adresie, bo `<img>` nie wyśle
nagłówka `Authorization`. Jest wyłącznie odczytem pliku i nie wolno jej
rozszerzać o operacje zmieniające dane — tak samo mówi komentarz przy
`requireAdminToken()` w `bootstrap.php`.

---

## 7. Migawka: co przeżywa zmianę cennika

`configuration_paint` trzyma komplet danych **w postaci tekstowej**, nie przez
klucze obce:

```text
palette_name_snapshot   „Porsche Paint to Sample"
color_name_snapshot     „Riviera Blue"
color_code_snapshot     „S8"
color_hex_snapshot      „#359BD0"
finish_snapshot         „uni"
gross_price_snapshot    0.00     ← dopłata za sam kolor; proces siedzi w częściach
render_path_snapshot    /media/paints/renders/e55/riviera-blue-s8-ultra.jpg
color_id                → paint_colors  ON DELETE SET NULL
```

`color_id` jest wygodą (podgląd „ten sam lakier dziś"), nie źródłem prawdy.
Skasowanie koloru zeruje klucz, ale migawka zostaje czytelna.

Te same dane trafiają do JSON-owej migawki konfiguracji pod kluczem `paint`,
a kwota osobno do `pricing.paintPriceGross` — dzięki temu rozbicie ceny
w podsumowaniu klienta pokazuje lakier jako własną pozycję.

Kasowanie palety lub koloru użytego w zapisanej konfiguracji jest **blokowane**
(HTTP 422, „zamiast kasować, wyłącz"). `ON DELETE SET NULL` to zabezpieczenie
na poziomie bazy, nie zaproszenie do kasowania.

---

## 7a. Globalne ustawienia palet

Jeden dokument w `site_settings` pod kluczem `paint_visibility`, czytany
z domyślnymi wartościami - brak wiersza znaczy „ustawienia fabryczne”, więc
funkcja nie wymagała migracji.

```json
{ "colorFilter": "all" | "with_image" | "with_photo" }
```

`colorFilter` rozstrzyga, **które kolory w ogóle jadą do klienta**:

| wartość | co widzi klient |
|---|---|
| `all` | każdy włączony kolor z palet przypiętych do produktu (domyślnie) |
| `with_image` | tylko kolory, dla których mamy zdjęcie ALBO render tego produktu |
| `with_photo` | tylko kolory ze zdjęciem realnego roweru |

Dlaczego ustawienie, a nie wyłączanie kolorów po jednym: paleta ma 686 pozycji,
a renderów przybywa partiami. Właściciel, który chce pokazywać wyłącznie to, co
ma obraz, potrzebuje jednego przełącznika, a nie 450 kliknięć - i drogi powrotnej
w tę samą stronę, gdy renderów przybędzie.

Trzy rzeczy, które trzymają to ustawienie uczciwym:

1. **Filtruje serwer**, w `paintPalettesFor()`. Ta sama funkcja stoi pod
   `resolvePaintSelection()`, więc ukrytego koloru nie da się zamówić
   z pominięciem interfejsu - zapis konfiguracji odpowiada „kolor nie jest
   dostępny dla tego produktu”, tak samo jak dla koloru wyłączonego.
2. **Liczy się per produkt**, bo obraz należy do pary kolor + produkt. Ten sam
   lakier bywa widoczny przy E55 i ukryty przy E82. Panel pokazuje to wprost
   tabelką „co to znaczy dla poszczególnych produktów” i ostrzega na czerwono,
   gdy któryś produkt zostaje bez ani jednego koloru.
3. **Panel widzi komplet.** `adminPaints()` nie przechodzi przez filtr -
   ukrywanie kolorów przed tym, kto ma im wgrać zdjęcia, byłoby absurdem.

Paleta, której po filtrowaniu nie został żaden kolor, wypada z odpowiedzi -
pusty chip filtra w pickerze to tylko zagadka dla klienta.

Wartość jedzie też do przeglądarki (`colorFilter` w `/api/paints/…`), ale nie po
to, żeby cokolwiek filtrowała - to już zrobił serwer - tylko żeby picker napisał
klientowi, dlaczego widzi wycinek palety zamiast kompletu
(`COLOR_FILTER_NOTES` w `lib/paints.ts`).

---

## 8. Niezmienniki

Rzeczy, które muszą zostać prawdziwe przy każdej zmianie w tym obszarze:

1. **Cena powstaje na serwerze.** Przeglądarka nie przysyła kwot, tylko slugi.
   `apps/web/lib/pricing.ts` liczy to samo wyłącznie po to, żeby pokazać
   wynik od razu; rozstrzyga `PricingService`.
2. **Dopłata za kolor nie przechodzi przez narzut.** Zmiana kolejności
   w `priceConfiguration` musi iść razem ze zmianą w `lib/pricing.ts`.
3. **Reguła procesu jest sprawdzana po stronie API**, niezależnie od tego, co
   zrobił konfigurator.
4. **Nazwa tabeli nigdy nie pochodzi z żądania** — `model`/`frame` przechodzi
   przez whitelistę w `PaintService` i `AdminPaintService`.
5. **Zdjęcie referencyjne nie wycieka publicznie.** Publiczna odpowiedź
   `/api/paints/…` nie niesie nawet ścieżki, dopóki `reference_is_public`
   jest `FALSE`.
6. **Filtr widoczności działa po stronie serwera.** Nowa reguła „które kolory
   pokazujemy” wchodzi do `paintPalettesFor()`, nigdy do samego komponentu -
   inaczej rozjedzie się z tym, co wolno zamówić.
7. **Migawka jest tekstem.** Nowe pole opisujące wybór lakieru dokładamy do
   `configuration_paint` jako `*_snapshot`, nie jako join.
8. **Import jest idempotentny.** Kluczem naturalnym koloru jest
   `(palette_id, slug)`, renderu — `(color_id, produkt, variant)`. Zdjęcia
   (`variant = 'photo'`) są poza tą regułą: wgrywa się je ręcznie i każde jest
   osobnym wierszem.

---

## 9. Mapa plików

```text
database/migrations/028_paint_colors.sql   schemat + dane startowe
apps/api/scripts/import-paints.php         import z e55-paint-to-sample
apps/api/src/PaintService.php              dostępność, cena, reguła, migawka
apps/api/src/AdminPaintService.php         CRUD panelu
apps/api/src/PricingService.php            +$paint w priceConfiguration()
apps/api/src/ConfigurationService.php      wpięcie w zapis konfiguracji
apps/api/public/index.php                  trasy publiczne i panelu
apps/web/lib/paints.ts                     typy, pobranie, wyszukiwarka
apps/web/components/paint-picker.tsx       sekcja + modal wyboru koloru
apps/web/components/admin-paints.tsx       zakładka „Lakiery"
apps/web/lib/pricing.ts                    ta sama formuła po stronie klienta
```

---

## 10. Gdzie to się rozbuduje

Punkty, w których architektura już przewiduje ruch, i czego każdy wymaga:

| potrzeba | co dochodzi |
|---|---|
| picker na podstronie ramy | wyłącznie UI; `frame_paint_palettes` zasiane migracją `030`, `GET /api/paints/frame/{slug}` zwraca komplet palet |
| trzeci rodzaj produktu | jeden wpis w whiteliście + bliźniacza tabela |
| wykluczenie pojedynczego lakieru dla modelu | `model_paint_color_exclusions` + `NOT EXISTS` |
| generowanie renderów AI | narzędzie **w panelu**, nie w konfiguratorze — inaczej wracają koszt, limity na IP i kilkanaście sekund ciszy u klienta |
| drugi kolor / wzory | dziś świadomie poza konfiguratorem (zasada 27); wymagałby `configuration_paint` z kolumną `slot` i osobnej wyceny |
