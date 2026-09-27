# Dziennik zmian

Zapis prac: co zostało zrobione, dlaczego i jakie pliki objęła zmiana.
Nowe wpisy dopisujemy na górze.

## Zasada kontynuacji pracy

Każdy agent, który zmienia kod lub dane projektu, dopisuje przed zakończeniem
pracy wpis do tego pliku. Wpis ma zawierać: zgłoszony objaw, potwierdzoną
przyczynę, zmianę wraz z uzasadnieniem decyzji, objęte pliki, wykonane testy
oraz świadomie nierozwiązane ryzyka. Dzięki temu następny agent może odróżnić
fakty sprawdzone od założeń i nie powtarza diagnostyki.

---

## 2026-09-21 — Teksty z panelu nie wgrywały się na wyeksportowanej stronie; szkielety zamiast mignięć

### Objaw

Na produkcji (eksport statyczny) teksty nadpisane w panelu („Teksty") nie
pojawiały się w treści stron — HTML miał wartości domyślne z builda, a API
zwracało nadpisania (potwierdzone: hero z builda „Zbudowany dla Twojej trasy"
vs `Spersonalizowane dla Ciebie11` z API). Nagłówek i stopka pobierały copy
każde z osobna po stronie klienta i migały: najpierw „Rowery", po sekundie
„Rowery111".

### Przyczyna

Przy `STATIC_EXPORT=1` `fetchJson()` z `server-catalog.ts` celowo zwraca null,
więc strony przekazywały `copy={null}`. `usePublicCopy()` traktował `null`
jak dane startowe (`initial !== undefined`), więc nie pobierał nic z API i
teksty zostawały zamrożone z builda. Komponenty bez `initial` (nagłówek,
stopka) pobierały copy niezależnie — stąd mignięcie. Dodatkowo każda strona
i każdy komponent robił własne pobranie `/settings/copy`.

### Zmiana

- Nowy `apps/web/components/copy-provider.tsx`: `CopyProvider` w
  `app/layout.tsx` pobiera copy raz dla całej strony. Z realnym `initial`
  (SSR) teksty są gotowe od razu; bez niego (eksport statyczny) jedno
  pobranie `/api/settings/copy` po stronie klienta, a do czasu odpowiedzi
  `usePublicCopyReady()` zwraca false.
- `apps/web/lib/use-public-copy.ts`: hook czyta z kontekstu providera;
  naprawione rozróżnienie null/undefined (null = „dociągnij sam");
  dodany `usePublicCopyReady()`.
- Szkielety (`Skeleton`) zamiast tekstów z builda, dopóki copy nie jest
  potwierdzone: nagłówek (menu, CTA), stopka, hero strony głównej i jej
  sekcje, nagłówki /rowery, kategorii, modelu, części, ram, realizacji,
  serwisu i konfiguratora, breadcrumby. Tekst renderuje się raz — żadnego
  mignięcia „default -> nadpisanie".
- Strony (`app/**/page.tsx`) i komponenty stron przestały przekazywać
  `copy` propem — jedno źródło: layout. Wyjątkiem pozostaje przekazywanie
  już scalonego obiektu copy do małych komponentów prezentacyjnych
  (BikePickCard, FilteredCollection, FrameDetail, ProjectDetail).

### Testy

- `tsc --noEmit` czysto; build `STATIC_EXPORT=1` przechodzi.
- Wyeksportowany `index.html` nie zawiera domyślnych tekstów hero ani
  „Rowery" w menu — jest markup szkieletów i chunk `copy-provider`.
- Cross-check 202 użyć `copy.*` w komponentach: wszystkie mają klucz w
  `defaultCopy`; brak martwych kluczy w `site_settings.copy`.
- QA (`rexor.sobierski.com`): przed deploy wpisano nadpisania z produkcji
  przez `PATCH /api/admin/settings/copy` (login `admin@rexor.local`, dane
  w `docs/CREDS.md`), po deploy do weryfikacji: szkielety bez mignięcia,
  teksty z API widać po odświeżeniu bez rebuildu.

### Drugi przebieg: audyt „wszystkie teksty z copy" (2026-09-21, wieczór)

Pytanie właściciela „na pewno WSZYSTKIE teksty lecą z copy?" ujawniło dwie
grupy problemów, poprawione tym samym deployem na QA:

- **Martwe klucze** (edytowalne w panelu, nigdzie nie renderowane):
  usunięto z `copy.ts` `frames.loading`, `frames.factsTitle`,
  `projects.loading` i `collection.loading` (zastąpiły je szkielety).
  W bazach QA/produkcji stare wartości jeszcze leżą, ale są obojętne
  (deepMerge bierze klucze z bazowej struktury) i znikną przy najbliższym
  zapisie z zakładki „Teksty".
- **Teksty na sztywno przeniesione do copy**: cały wspólny formularz
  kontaktowy (nowa sekcja `contact` — etykiety, CTA, komunikaty), cała
  obudowa czatu AI (nowa sekcja `chat` — dymek, nagłówek, placeholder,
  hinty, powitanie; prompt asystenta pozostaje osobnym ustawieniem panelu)
  oraz arie nawigacji w nagłówku (`nav.homeAria`, `nav.navigationAria`).

Świadomie pozostały poza copy (do decyzji właściciela):
- `nav.czesci` — martwe pole w panelu; ZASADY nr 22 mówią, że menu ma
  zawierać „Części", a dziennik z 2026-09-16 odnotował celowe usunięcie
  tego linku z nawigacji. Rozbieżność do rozstrzygnięcia (podpiąć link
  albo usunąć klucz).
- mikroteksty przeglądarki lakierów (`paint-picker.tsx`) — ~25 napisów
  silnie sprzężonych z interpolacją; kandydat na osobny wpis, jeśli mają
  być edytowalne.
- zapasowa treść serwisu (`serviceFallbackContent`) — celowo w kodzie,
  używana tylko przy braku odpowiedzi API.
- `title="Napisz do nas"` na ikonie kontaktu (tooltip).

### Wdrożenie

2026-09-21: QA (`rexor.sobierski.com`) — dwa przebiegi (fix szkieletów,
potem audyt tekstów). Produkcja (`rexorbikes.com`): wdrożono pełny fix
(`REMOTE_ENV_FILE=.env.production DEPLOY_ENV_FILE=.deploy.env.production
scripts/deploy-ftp.sh --apply`), wcześniej zdjęto zrzut bazy
(`scripts/download-db-backup.sh --prod`, `storage/backups/prod/20260921T131719Z`).
Klucz `nav.czesci` usunięty z `copy.ts` po decyzji właściciela (link „Części"
pozostaje poza menu — aktualna praktyka wygrywa z ZASADAMI nr 22, które
warto zaktualizować przy najbliższej rewizji). Po wdrożeniu: HTML produkcji
nie ma zapieczonych tekstów (szkielety), `/api/health` OK, dane w
`site_settings.copy` nietknięte.

### Trzeci przebieg: tytuł panelu „Strony" vs treść strony (2026-09-21, wieczór)

Pytanie właściciela: czy tytuł strony zdefiniowany w panelu („Strony") jest
faktycznie używany na każdej stronie? Audyt: NIE.

- `/serwis`: tytuł „Serwis rowerów Rexor" z panelu był ignorowany — hero brał
  `copy.service.title` z zakładki „Teksty". Naprawione: tytuł i lead hero
  biorą teraz `site_pages.title` i `site_pages.excerpt`, a gdy są puste
  (albo API nie odpowiada) — `copy.service.title`/`subtitle`; do czasu
  rozstrzygnięcia szkielet. `excerpt` przestał być martwym polem.
- `/kontakt`, `/regulamin`, `/polityka-prywatnosci`: tytuł z panelu był
  używany, ale na wyeksportowanej stronie mignął hardcoded fallbackiem z
  builda („Kontakt", „Regulamin") — teraz szkielet do czasu odpowiedzi API.
- `hero_image_path` w site_pages pozostaje bez renderu w interfejsie publicznym
  (pole w panelu obecnie martwe) — do decyzji projektowej.
- `navigation_label` to etykieta panelowa, nie publiczna — bez zmian.

Wdrożono na QA i zweryfikowano: HTML `/serwis` bez zapieczonych tytułów,
tytuł z panelu (wraz z testowym „!x") dojdzie z API. Produkcja: ten sam fix
wdrożony 2026-09-21 bez zmian w bazie (potwierdzone: `/api/pages/serwis`
zwraca „Serwis rowerów Rexor" bez testowego „!x", `/api/health` OK).

Czwarta poprawka (ten sam dzień): nagłówek i opis formularza na /kontakt
(„Napisz do nas" / „Odpowiemy najszybciej…") były wpisane na sztywno w
`kontakt-page.tsx` i nie reagowały na zakładkę „Teksty". Przeniesione do
`copy.contact.asideTitle`/`asideDescription`; cały wspólny formularz
(etykiety, CTA, tytuł/lead obok formularza) dostaje szkielet do czasu
potwierdzenia tekstów z API, więc nadpisania z panelu pojawiają się bez
mignięcia. Wdrożone na QA; produkcja czeka na decyzję właściciela.

Piąta poprawka (ten sam dzień): powitanie czatu było zamrożone w stanie
komponentu (`useState` inicjalizowany raz), więc przy eksporcie statycznym
nie podążało za tekstami z panelu — nagłówek okna tak, a pierwsza wiadomość
nie. Powitanie jest teraz pochodną copy i odświeża się, dopóki rozmowa nie
zaczęła się (flaga `conversationStarted`; reset czatu wraca do trybu
podążania). Przy okazji odkryto i naprawiono ryzyko w API:
`updateSiteCopy` zapisywał payload bez scalania, więc częściowy zapis
(zawierający tylko jedną sekcję) wyzerowałby pozostałe sekcje w
`site_settings.copy`. Teraz `array_replace_recursive` z obecną wartością
(pełny draft z panelu daje identyczny wynik). Podczas testów częściowy
zapis faktycznie skrócił copy na QA — odtworzono pełny dokument z żywego
stanu produkcji + sekcje chat/contact z `defaultCopy` (19 sekcji;
weryfikacja: partial PATCH zachowuje pozostałe sekcje).

Szósta poprawka (ten sam dzień): czat nie miał szkieletów — dymek
powitalny i otwarte okno mogły pokazać teksty z builda i podmienić je na
panelowe. Dymek pokazuje się dopiero po potwierdzeniu tekstów (`copyReady`),
a w oknie szkielety obejmują tytuł, plakietkę Online, podtytuł, powitanie,
hint i stopkę; placeholder pola jest pusty do czasu. Wdrożone na QA, a po
zatwierdzeniu właściciela także na produkcję (2026-09-21: pakiet piąta +
szósta poprawka; baza nietknięta, copy prod = 17 sekcji, `nav.rowery`
już oczyszczone przez właściciela w panelu, homepage: 44 szkielety,
0 defaultów w HTML).

### Nierozwiązane ryzyka


- Silnik SEO czyta treść po JS: w wyeksportowanym HTML hero ma szkielet
  zamiast tekstu (jak już wcześniej listy katalogu). `<title>`/`description`
  pozostają w meta z builda.
- Ten sam wzorzec „null z eksportu statycznego" dotyczy motywu i favicony
  (`ThemeClientRuntime`, `FaviconRuntime`) — kolory mogą mignąć; do
  rozważenia analogiczny provider w osobnym kroku.
- Nadpisania testowe w bazie („Rowery111", „Ramy!!!", „Realizacje!!!!!"
  itd.) celowo pozostały na QA i produkcji do ręcznej weryfikacji ładowania;
  decyzja o przywróceniu defaultów należy do właściciela.

---

## 2026-09-17 — Domyślny silnik E82

Automatyczny przebieg CFG-06 wykazał, że E82 nie miał domyślnej pozycji w
stałej grupie „Silnik”, więc API prawidłowo odrzucało zapis jako konfigurację
wymagającą wyceny indywidualnej. W panelu administratora przypisano i ustawiono
jako domyślny „Silnik Bafang M510 250 W / 95 Nm” (`motor-m510-250w`, 3 700 zł).
Katalog po zmianie zwraca cenę bazową E82 20 680 zł; ponowiony CFG-06 utworzył
rekord (HTTP 201), a ADM-10 otworzył jego szczegóły w tej samej sesji.

## 2026-09-17 — Dalsze testy publiczne: menu i kontakt

### Wynik

- `PUB-01`: menu mobilne otwiera się, zawiera wyłącznie Rowery, Ramy,
  Realizacje i Serwis, a link „Rowery” prowadzi do właściwej strony. Nie było
  ostrzeżeń ani błędów konsoli.
- `PUB-06`: natywna walidacja oznacza puste pola imienia, e-maila i wiadomości;
  automat nie zaobserwował `POST /contact`. To bezpiecznie potwierdza blokadę
  przed przypadkową wysyłką.

Dowody: `qa/evidence/2026-09-17/test/PUB-01/` i
`qa/evidence/2026-09-17/test/PUB-06/`. Aktualny stan scenariuszy z
uzasadnieniami jest w `qa/SCENARIUSZE_TESTOWE.md`.

Nie wykonano celowo prawidłowej wysyłki kontaktu: wymaga ona uzgodnionej
skrzynki testowej oraz zgody na wysłanie wiadomości.

---

## 2026-09-17 — Weryfikacja dostępu administratora i renderów

Logowanie na `https://rexor.sobierski.com/admin` działa poprawnie z kontem
przekazanym przez właściciela. Wcześniejsze `401` było artefaktem automatu:
szybkie `fill()` wysłało pustą wartość stanu hasła. Dla tego formularza testy
muszą używać wpisywania znak po znaku; regułę zapisano w `qa/OBSERWACJE.md`.
Panel modeli i galerii otworzył się bez błędów konsoli (`ADM-01`: **PASS**).

Bez zapisu danych sprawdzono też pierwszy edytor HTML modelu: zaznaczenie
pozostało aktywne po kliknięciu „Pogrubienie”, a HTML edytora uległ zmianie.
Następnie strona została odświeżona bez użycia „Zapisz model”, więc test nie
zmienił danych na serwerze (`ADM-07`: **PASS**).

Ponowny odczyt publicznego katalogu produkcyjnego potwierdził, że modele mają
media galerii, ale żadna opcja konfiguratora nie ma przypisanego
`render_path`, `image_path` ani `photo_path`. Dlatego `CFG-04` pozostaje
**PARTIAL**: nie można rzetelnie sprawdzić powiększenia renderu lakieru bez
danych wejściowych. Nie zmieniano kodu ani danych.

Zakładka „Zapytania” otwiera się bez błędów, ale testowa baza nie zawiera
rekordu konfiguracji, więc nie można było kliknąć „Szczegóły” i odtworzyć
zgłoszonego błędu podglądu (`ADM-10`: **PARTIAL**). Dowody są w
`qa/evidence/2026-09-17/test/ADM-01/` i `qa/evidence/2026-09-17/test/ADM-10/`.

---

## 2026-09-17 — Kontynuacja testów konfiguratora i API

### Wynik wykonanych scenariuszy

Na środowisku testowym zapisano dowody i raporty `CFG-01`–`CFG-04`,
`CFG-06`–`CFG-07`, `PUB-03`–`PUB-04` oraz `API-02` w
`qa/evidence/2026-09-16/` i `qa/evidence/2026-09-17/`. Pełny, aktualny
rejestr PASS/PARTIAL/BLOCKED/NOT RUN znajduje się w
`qa/SCENARIUSZE_TESTOWE.md`.

- PASS: pamięć wyboru baterii między modelami, cztery kontrolne wyceny,
  przeliczenie zasięgów, picker i dopłata lakieru, strony publiczne, bieżąca
  spójność obrazu E82, walidacja zgody, podstawowa obsługa klawiatury i
  autoryzacja API;
- PARTIAL: brak renderów/zdjęć lakieru blokuje powiększenie, brak kontrolowanej
  skrzynki blokuje pełny zapis konfiguracji, a brak sesji administratora
  blokuje propagację nowego zdjęcia i panel;
- nie potwierdzono nowego błędu aplikacji. Jedno początkowe wejście automatu
  na `/rowery` utknęło w stanie ładowania, lecz pięć kolejnych niezależnych
  świeżych sesji zwróciło katalog HTTP 200, modele i filtry poprawnie —
  obserwację zapisano, ale nie uznano jej za reprodukowalny defekt.

### Narzędzia przekazane dalej

`qa/scripts/capture-page.cjs` zapisuje bezpieczny odczytowy PNG jednej strony,
a `qa/scripts/run-public-pages.cjs` wykonuje i dokumentuje pakiet `PUB-04`.
Instrukcje zależności i użycia są w `qa/scripts/README.md`.

`ADM-01` jest PARTIAL: anonimowe wejście na `/admin` pokazuje tylko formularz
logowania i nie renderuje katalogu CMS, bez błędów konsoli. Logowanie,
odświeżenie sesji i wylogowanie są zablokowane brakiem kontrolowanego konta
testowego; nie podjęto próby zgadywania danych logowania.

`API-02` jest PASS: `GET /admin/catalog` bez tokenu i z błędnym tokenem
zwraca 401, zaś niepełny `POST /configurations` zwraca 422 przed utworzeniem
konfiguracji. `PUB-05` jest PASS: kategoria elektryczna najpierw pokazuje
komunikat prawny, a po potwierdzeniu wyświetla E82 i E55 bez CFR707. Dowody
są w `qa/evidence/2026-09-17/test/API-02/` i `PUB-05/`.

Założono `qa/OBSERWACJE.md`: klientowe ładowanie katalogu po eksporcie
statycznym czasem pozostawia stronę główną bez widocznej karty przez ponad
3 s, mimo poprawnego HTTP 200 i danych katalogu. To obserwacja wydajnościowa,
nie potwierdzony błąd — pomiary i kryterium ponownej weryfikacji są w pliku.

---

## 2026-09-16 — Pierwsze wykonanie testów przeglądarkowych

### Zakres

Na środowisku testowym wykonano odczytowe scenariusze `PUB-01`, `PUB-02` i
`API-01` z nowego protokołu QA. Dowody są zapisane w
`qa/evidence/2026-09-16/test/`; każdy scenariusz ma własny `WYNIK.md` i PNG.

### Wynik

- menu na desktopie i telefonie pokazuje wyłącznie Rowery, Ramy, Realizacje i
  Serwis — brak „Części” i pustej pozycji;
- `/rowery` poprawnie filtruje: Gravel → tylko CFR707, Pojazdy elektryczne →
  E82 i E55 bez CFR707;
- `GET /api/health` zwrócił połączenie z bazą, a katalog: 3 modele, 6
  kategorii i 14 elementów mediów;
- w czasie badanych wejść i kliknięć nie było ostrzeżeń ani błędów konsoli.

Dodatkowo lokalnie wykonano `CFG-05` dla niewdrożonego jeszcze kontrolera
„Rozwiń/Zwiń”; dowody są w `qa/evidence/2026-09-16/local/CFG-05/`. Telefon
startuje z zamkniętym opisem i etykietą „Rozwiń”, po kliknięciu widoczna jest
etykieta „Zwiń”, a desktop startuje z opisem otwartym.

Następnie na środowisku testowym wykonano `CFG-01`, `CFG-02` i `CFG-03`.
Wybór baterii E82 przetrwał przełączenie modelu E82 → E55 → E82. Kontrola
ceny: 16 980 zł (domyślna), 16 380 zł (-600 zł bateria), 17 380 zł (+1000 zł
FOX) i 15 380 zł (własna część zamiast FOX) dała dokładnie oczekiwane różnice.
Zmiana 982,8 Wh → 655,2 Wh zmieniła także zasięgi Eco/asfalt z 140–246 km na
94–164 km. Wszystkie trzy scenariusze PASS, bez błędów konsoli; raporty i PNG
są w odpowiadających katalogach `qa/evidence/2026-09-16/test/CFG-0*/`.

`CFG-04` potwierdził działanie pickera lakierów, wyszukiwania Riviera Blue,
chipa Porsche oraz automatycznej dopłaty +800 zł (16 980 zł → 17 780 zł).
Krok powiększenia renderu ma status BLOCKED: środowisko testowe zwraca 0
renderów i 0 zdjęć dla dostępnych lakierów, więc interfejs poprawnie nie
pokazuje filtrów „Z wizualizacją” i „Ze zdjęciem”. Jest to brak danych do
testu, nie błąd kodu. Dodano też `qa/scripts/capture-page.cjs` i instrukcję
uruchamiania, aby kolejne agenty mogły powtarzalnie tworzyć odczytowe PNG.

Kolejna tura przyniosła `PUB-03` (PARTIAL) i `PUB-04` (PASS). Karta E82 oraz
detal używają aktualnie tego samego obrazu `/models/e82/01.jpg`; wgranie i
przełożenie nowego obrazu jest świadomie zablokowane bez sesji administratora.
`PUB-04` obejmuje Ramy, Realizacje, Serwis, Kontakt, Regulamin, Politykę
prywatności oraz detale `/ramy/scott-spark-test` i
`/realizacje/scott-spark-konwersja-test` — wszystkie PASS, bez błędów konsoli.
Dodano powtarzalny `qa/scripts/run-public-pages.cjs`, który zapisuje ten pakiet
odczytowy i JSON wyników.

`CFG-06` (PARTIAL) potwierdził, że brak zgody prywatności wyświetla komunikat
walidacyjny i nie wysyła `POST /api/configurations`; pełny zapis wymaga
kontrolowanej skrzynki testowej. `CFG-07` (PARTIAL) potwierdził fokus na
`summary`, przełączenie opisu Enterem, otwieranie pickera lakierów Enterem i
zamykanie Escapem. Pełne przejście klawiszem Tab i test czytnika ekranu są
świadomie odłożone do osobnego audytu dostępności.

Nie znaleziono błędu wymagającego naprawy. Test nie dotykał zapisu, sesji
administratora, konfiguracji ani danych klientów; są one kolejnymi blokami
scenariuszy.

---

## 2026-09-16 — Czytelne rozwijanie opisu i protokół testów E2E

### Wskazówka rozwijania na telefonie

Pierwsza wersja mobilnej sekcji `details` miała jedynie tytuł oraz mały opis
„Opis i specyfikacja”. Technicznie była klikalna, ale nie komunikowała
jednoznacznie, że użytkownik może ją rozwinąć. Podsumowanie sekcji ma teraz
wyraźny, obramowany kontroler „Rozwiń” ze strzałką; po otwarciu pokazuje
„Zwiń” i odwróconą strzałkę. Zachowano natywny element `summary`, więc działa
on również z klawiatury i technologiami asystującymi.

Teksty kontrolera są częścią `defaultCopy`, zamiast być zaszytym napisem w
komponencie. Dzięki temu panel „Teksty” może je później zmienić bez nowego
wdrożenia, a stare nadpisania tekstów bez tych pól dostają bezpieczne wartości
domyślne przez `mergeCopy`.

### Przekazywalne scenariusze testów

Dodano `qa/SCENARIUSZE_TESTOWE.md` oraz `qa/README.md`. Dokumenty dzielą testy
na niezależne bloki dla osobnych agentów i obejmują stronę publiczną,
konfigurator, wszystkie zakładki administratora, API oraz smoke test po
wdrożeniu. Każdy scenariusz ma kroki, kryterium zaliczenia i wymagany dowód.
`qa/README.md` wymaga zapisu zrzutu dla każdego kroku w
`qa/evidence/RRRR-MM-DD/<srodowisko>/<ID>/`, pliku `WYNIK.md`, ochrony haseł
i danych klientów, pracy najpierw na testowym środowisku oraz opisania
potwierdzonej przyczyny przed ewentualną naprawą.

### Pliki

`apps/web/components/bike-configurator.tsx`, `apps/web/lib/copy.ts`,
`qa/README.md`, `qa/SCENARIUSZE_TESTOWE.md`, `qa/evidence/README.md`.

### Weryfikacja

- `npm --prefix apps/web run build`: sukces;
- przeglądarka, lokalnie przy 390 × 844: opis E82 startuje zamknięty, pokazuje
  „Rozwiń”, po kliknięciu otwiera treść i zmienia etykietę na „Zwiń”.

### Status wdrożenia

Te ostatnie zmiany są gotowe lokalnie, ale **nie zostały jeszcze wdrożone** na
środowisko testowe ani produkcję. Wdrożenie wymaga osobnej decyzji, aby nie
zmieniać publicznej strony bez wyraźnego polecenia.

---

## 2026-09-16 — Wdrożenie poprawek katalogu, konfiguratora i panelu

### Cele i wynik

Pakiet wdrożono kolejno na środowisko testowe `https://rexor.sobierski.com`
i na produkcję `https://rexorbikes.com`, zawsze z osobnym plikiem środowiska
i bazą danych właściwą dla danego celu. Przed wdrożeniem dla obu celów wykonano
dry-run FTP; po nim właściwe przesłanie, migracje i kontrolę `GET /api/health`.
Oba endpointy zwróciły `status: ok` oraz `database: connected`.

### Testy po wdrożeniu

- środowisko testowe: brak „Części” w menu; filtry `/rowery` działają
  (po wybraniu „Gravel” widoczny jest tylko CFR707); na 390 px opis E82 jest
  domyślnie zwinięty; bez ostrzeżeń i błędów konsoli;
- produkcja: powtórzono test menu, filtrów i konfiguratora przy 390 px;
  karta E82 używa aktualnego obrazu z API `/api/uploads/...webp`, a nie
  historycznego pliku statycznego; bez ostrzeżeń i błędów konsoli.

### Świadomie poza zakresem

Nie wykonano testu autoryzowanego podglądu konfiguracji ani ręcznego zapisu w
edytorze WYSIWYG na serwerze, ponieważ wymaga to zalogowanej sesji administratora.
Przyczynę błędu i poprawkę zweryfikowano w kodzie oraz w kompilacji; test ten
warto wykonać podczas najbliższej pracy w panelu.

---

## 2026-09-16 — Poprawki po przeglądzie produkcyjnym: katalog, konfigurator i panel

### Zakres i status wdrożenia

Przegląd wykonano odczytowo na `https://rexorbikes.com`; opisane poprawki
zostały następnie wdrożone na środowisko testowe i produkcję. Wynik wdrożenia
i testów jest zapisany we wpisie bezpośrednio powyżej.

### Menu „Części"

Po wyczyszczeniu etykiety „Części" w panelu publiczne menu nadal zawsze
tworzyło link `/czesci`. Efektem była pusta, klikalna pozycja między
„Realizacje" a „Serwis". Usunięto ten link z listy nawigacji, a nie ukryto
go warunkowo po pustym tekście: obecna decyzja biznesowa mówi o wyłączeniu
zakładki z nawigacji, a przyszłe przywrócenie sklepu powinno być jawną decyzją
i własnym wdrożeniem. Sama trasa `/czesci` pozostaje w projekcie.

### Filtrowanie listy „Rowery"

Strona `/rowery` wyświetlała wszystkie modele, mimo że `/ramy` miały już
filtry kategorii. Lista rowerów buduje teraz przyciski wyłącznie dla kategorii
z co najmniej jednym modelem i filtruje lokalnie pobrany katalog. Wybrany
filtr sam wraca do „Wszystkie", gdy administrator usunie ostatni model danej
kategorii — użytkownik nie zostaje na pustym ekranie.

### Opis modelu w konfiguratorze mobilnym

Na ekranie 390 px opis E82 wraz z tabelą specyfikacji był od razu rozwinięty
przed wszystkimi wyborami. Sekcja nadal jest semantycznym `details`, ale na
telefonie startuje zwinięta; na desktopie (od 1024 px) otwiera się domyślnie.
To zachowuje istniejący układ komputerowy i skraca drogę do konfiguracji na
telefonie bez usuwania informacji.

### Zdjęcie główne na liście i karcie modelu

Katalog produkcyjny dla E82 zwracał nowe zdjęcie jako pierwsze w galerii, ale
`default_image_path` nadal wskazywał stary plik. Karta szczegółów używała
pierwszego zdjęcia galerii, natomiast lista `/rowery` — starego pola default.
Reguła wyboru obrazu jest teraz jedna: pierwszy obraz galerii, potem
`default_image_path`, potem obraz zapasowy. Dzięki temu nowe zdjęcie dodane
przez panel jest identyczne na liście i na stronie modelu.

### Podgląd konfiguracji z panelu

Przycisk „Szczegóły" otwierał konfigurację w nowej karcie z `noopener`.
Autoryzacja administratora jest przechowywana w `sessionStorage`, które przy
takim otwarciu nie jest dostępne w nowym kontekście, więc podgląd zgłaszał
błąd logowania. Link otwiera się teraz w tej samej karcie, przez co zachowuje
aktywną sesję. Nie przeniesiono tokenu do `localStorage` ani do adresu URL,
bo pogarszałoby to bezpieczeństwo sesji.

### Edytory WYSIWYG

Przy klikaniu narzędzi formatowania przeglądarka przenosiła fokus z edytora
na przycisk. Chromium tracił wtedy zaznaczenie i wykonywał komendę na pustym
fragmencie, co wyglądało jak niedziałający edytor. Przyciski pogrubienia,
kursywy, nagłówka, akapitu i listy zachowują teraz zaznaczenie podczas
kliknięcia; użyty nadal jest ten sam wspólny edytor dla stron, modeli, ram,
realizacji i szablonu e-maila.

### Pliki

`apps/web/components/site-header.tsx`,
`apps/web/components/static-pages.tsx`,
`apps/web/components/bike-configurator.tsx`,
`apps/web/lib/catalog-merge.ts`,
`apps/web/components/admin-panel.tsx`.

### Weryfikacja

- produkcja: ręczny test strony głównej, `/rowery`, `/konfigurator?model=e82`
  przy szerokości 390 px oraz odczyt `GET /api/catalog`; potwierdzono opisane
  objawy i brak błędów konsoli na badanych stronach;
- `npm --prefix apps/web run build`: sukces;
- `php -l` dla wszystkich plików `apps/api`: sukces;
- pełny `npm --prefix apps/web run lint` nadal zgłasza istniejące błędy w wielu
  niezwiązanych komponentach (m.in. dostępność i stare reguły React); nie jest
  obecnie testem blokującym dla tego pakietu zmian.

## 2026-09-16 — Przeglądanie kolorów na podstronie ramy

### Zakres

Podstrona ramy nie pokazywała kolorów w ogóle, mimo że `frame_paint_palettes`
i `GET /api/paints/frame/{slug}` działały od migracji 030.

### Tryb „browse" zamiast drugiego komponentu

`PaintDialog` dostał tryb: `select` (konfigurator - cena i potwierdzenie)
oraz `browse` (rama - samo oglądanie). Wyszukiwarka, filtry, siatka
i powiększenie są wspólne, więc klient, który obejrzał kolory przy ramie,
znajduje ten sam ekran w konfiguratorze. Rama nie jest konfiguratorem: wybór
nie wchodzi do wyceny, a zakres lakierowania ustalamy w rozmowie, dlatego
w trybie `browse` nie pokazujemy ceny procesu.

### Pobieranie palet

`usePaints` przyjmuje teraz `resource` (`model` albo `frame`) i pyta właściwą
trasę - modele i ramy mają osobne tabele dostępności. Na podstronie ramy palety
dociągamy, gdy sekcja wchodzi w widok (`IntersectionObserver`, margines 200 px):
próbki są na miejscu przed kliknięciem, ale 690 kolorów nie jedzie przy każdym
wejściu na stronę.

### Pliki

`apps/web/components/frames-pages.tsx`, `apps/web/components/paint-picker.tsx`,
`apps/web/components/bike-configurator.tsx`, `apps/web/lib/paints.ts`,
`apps/web/lib/copy.ts`.

## 2026-09-16 — Poprawki po przeglądzie wyboru koloru

### Dopłata za lakierowanie nie wracała w dół

Wybór koloru z palety płatnej podnosi zakres lakierowania do wymaganego SKU,
ale powrót na paletę bez wymagań nic nie cofał - po zmianie Porsche → Rexor
konfigurator dalej liczył +800 zł przy etykiecie „w cenie". Doszła pamięć
`paintAutoPartByModel`: cofamy tylko to, co sami podnieśliśmy. Ręczny wybór
zakresu przez klienta kasuje ten znacznik, więc żadna zmiana koloru go nie
nadpisze.

### Powiększenie wizualizacji w pickerze

Panel podglądu ma ok. 340 px, więc render roweru był tam znaczkiem i nie dało
się go obejrzeć. Render jest teraz przyciskiem otwierającym warstwę nad
modalem; Escape zamyka powiększenie, nie cały picker.

### Rendery w panelu idą za wyborem produktu

Lista renderów przy kolorze pokazywała wszystkie rendery tego koloru, więc
przełączenie modelu nie zmieniało nic - wyglądało to jak brak przeładowania.
Lista filtruje się teraz po wybranym produkcie, ta sama lista wyboru steruje
celem wgrywania, a rendery innych produktów da się dołączyć jednym kliknięciem.
Przy okazji `docs/ARCHITEKTURA_LAKIEROW.md` notuje, czemu render wisi na parze
kolor × produkt, a nie na osobnej palecie per model.

### Pliki

`apps/web/components/bike-configurator.tsx`,
`apps/web/components/paint-picker.tsx`,
`apps/web/components/admin-paints.tsx`,
`docs/ARCHITEKTURA_LAKIEROW.md`.

## 2026-09-16 — Rama testowa Scott Spark

### Zakres

Tabela `frames` była pusta, więc `/ramy`, `/ramy/{slug}` i seed
`frame_paint_palettes` z migracji 030 nie miały na czym zadziałać - nie dało
się sprawdzić listy ram, galerii ani palet lakierów dla ramy.

### Rama

Migracja `031` dodaje ramę „Scott Spark (rama testowa)" w kategorii MTB:
cztery zdjęcia prywatnej konwersji Sparka na napęd CYC Motor, fakty, cena
6900 zł i komplet aktywnych palet. Rama nie ma nic wspólnego z modelami
konfiguratora - `frames` wiąże się wyłącznie z `bike_categories`, więc Scott
Spark istnieje bez modelu „Spark".

To dane testowe. Nazwa i slug mówią o tym wprost, żeby wpis rzucał się
w oczy, gdyby dojechał na produkcję - `docs/MIGRACJE.md` podaje polecenie
usuwające go.

### Ścieżka zdjęć ram

`publicMediaUrl()` mapowało na statyczny eksport tylko `/media/models/`
i `/media/categories/`, więc `/media/frames/…` wracało bez zmiany i dawało 404.
Doszła trzecia reguła, a trasa awaryjna `GET /media/…` w `index.php` przyjmuje
teraz również `frames/`. Pliki leżą, jak zdjęcia modeli, w dwóch miejscach:
`public/media/frames/` (dla PHP) i `apps/web/public/frames/` (dla eksportu).

### Pliki

`database/migrations/031_test_frame_scott_spark.sql`,
`apps/web/lib/catalog-merge.ts`, `apps/api/public/index.php`,
`public/media/frames/scott-spark/`, `apps/web/public/frames/scott-spark/`,
`docs/MIGRACJE.md`.

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
