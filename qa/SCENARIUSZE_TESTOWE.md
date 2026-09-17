# Scenariusze testów przeglądarkowych

## Cel i kolejność

Scenariusze są podzielone tak, by osobny agent mógł wykonać jeden lub kilka
niezależnych bloków bez powielania zapisów w panelu. Każdy blok zaczyna się od
logowania stanu i kończy zrzutem rezultatu. Priorytet **P0** blokuje wdrożenie,
**P1** obejmuje kluczową funkcję biznesową, a **P2** jest kontrolą regresji.

Przed testami zapisu należy uzgodnić konto administratora, testowy adres e-mail
i dopuszczalność wysyłki wiadomości. Brak tych danych oznacza **BLOCKED**, nie
zgadywanie danych ani pomijanie zapisu w raporcie.

## Stan wykonania

| ID | Stan | Środowisko / dowód | Dlaczego |
| --- | --- | --- | --- |
| API-01 | PASS | test — `qa/evidence/2026-09-16/test/API-01/` | Health i katalog publiczny odpowiadają poprawnie. |
| PUB-01 | PASS | test — `qa/evidence/2026-09-16/test/PUB-01/`, `qa/evidence/2026-09-17/test/PUB-01/`, `VIS-11/` | Menu na desktopie i telefonie nie zawiera „Części”; aktualny test potwierdza też otwieranie oraz przejście z menu mobilnego. `VIS-11` dopełnia dokładną asercją modeli na filtrze kategorii. |
| PUB-02 | PASS | test — `qa/evidence/2026-09-16/test/PUB-02/`, `VIS-11/` | Filtry kategorii zawężają listę modeli; `VIS-11` sprawdza dokładny zestaw modeli per kategoria względem `GET /api/catalog`, nie tylko stan aktywnego filtra. |
| PUB-03 | PASS | test — `qa/evidence/2026-09-17/test/PUB-03/`, `VIS-01/` | Reorder zdjęć E82 w panelu i zdjęcie główne na `/rowery`/detalu zgodne od razu po zmianie (dopełnione przez `VIS-01`). |
| PUB-04 | PASS | test — `qa/evidence/2026-09-17/test/PUB-04/` | Wszystkie zbadane strony i dwa detale odpowiadają bez błędów konsoli. |
| PUB-05 | PASS | test — `qa/evidence/2026-09-17/test/PUB-05/` | Komunikat prawny poprzedza ofertę elektryczną i po potwierdzeniu filtruje modele. |
| PUB-06 | PASS | test — `qa/evidence/2026-09-17/test/PUB-06/` | Puste wymagane pola kontaktu zatrzymują wysyłkę w przeglądarce; nie wykonano POST. |
| CFG-01 | PASS | test — `qa/evidence/2026-09-16/test/CFG-01/` | Wybór baterii E82 przetrwał przełączenie E82 → E55 → E82. |
| CFG-02 | PASS | test — `qa/evidence/2026-09-16/test/CFG-02/` | Cztery kontrolne ceny zmieniły się o oczekiwane kwoty. |
| CFG-03 | PASS | test — `qa/evidence/2026-09-16/test/CFG-03/` | Bateria zmienia wspólnie pojemność, cenę i zasięg. |
| CFG-04 | PASS | test — `qa/evidence/2026-09-16/test/CFG-04/`, `qa/evidence/2026-09-17/test/VIS-04/` | Picker, wyszukiwanie, dopłata i powiększenie renderu działają (E82 ma 0 kolorów z renderem w danych testowych — powiększenie dopełniono na E55, który ma 229/680). |
| CFG-05 | PASS | test — `qa/evidence/2026-09-16/local/CFG-05/`, `qa/evidence/2026-09-17/test/VIS-12/` | „Rozwiń/Zwiń” działa; `VIS-12` potwierdza na środowisku testowym: domyślnie zwinięte na telefonie (390×844), rozwinięte na desktopie (1440×1000), etykieta i stan `<details>` przełączają się poprawnie w obie strony. |
| CFG-06 | PASS (po naprawie) | test — `qa/evidence/2026-09-17/test/CFG-06/`, `VIS-05/`, `VIS-07/` | Walidacja i zapis działają (`VIS-05`). `VIS-07` wykrył, że e-mail „Nowe zapytanie ofertowe” nie docierał (`.env` środowiska testowego miał `MAIL_TRANSPORT=log`) — naprawiono wdrożeniem `SMTP_HOST=de1.sohost.pl` (nie Cloudflare-proxowany `mail.sobierski.com`) do `.env.remote`; po naprawie e-mail dociera (~8 s). |
| CFG-07 | PASS | test — `qa/evidence/2026-09-17/test/CFG-07/`, `VIS-06/`, `VIS-13/` | Enter i Escape działają; `VIS-06` potwierdza pułapkę fokusu w modalu lakieru (25× Tab); `VIS-13` dopełnia audytem karuzeli zdjęć (Next + Enter) i akordeonu opisu (Enter/Spacja na `<summary>`) poza modalem — fokus nigdy nie znika ani nie trafia na `<body>`. |
| API-02 | PASS | test — `qa/evidence/2026-09-17/test/API-02/` | API odrzuca brak/zły token oraz niepełny payload zapisu. |
| ADM-01 | PASS | test — `qa/evidence/2026-09-17/test/ADM-01/` | Logowanie na podane konto działa; panel modeli i galerie są widoczne bez błędów konsoli. |
| ADM-07 | PASS | test — `qa/evidence/2026-09-17/test/ADM-07/` | Edytor modelu zachowuje zaznaczenie przy użyciu „Pogrubienia”; zmiana pozostała niezapisana i została odrzucona odświeżeniem. |
| ADM-10 | PASS | test — `qa/evidence/2026-09-17/test/ADM-10/`, `VIS-05/` | `VIS-05` tworzy własną konfigurację testową i otwiera ją przez prawdziwy przepływ „Zapytania” → „Szczegóły”, oraz potwierdza wpis w „Dzienniku aktywności” — bez ponownego logowania, bez błędu. |
| ADM-02–06, ADM-08–09, REL-01 | NOT RUN | — | Do wykonania według kolejności i wymaganych uprawnień. |
| VIS-01 | PASS | test — `qa/evidence/2026-09-17/test/VIS-01/` (`npm run test:visual`) | Zdjęcie główne na `/rowery` nie odtworzyło zgłoszonego błędu; zgodne z detalem od razu po reorderze w panelu. |
| VIS-02 | FAIL (oczekiwane) | test — `qa/evidence/2026-09-17/test/VIS-02/` (`npm run test:visual`) | Ani „Rowery”, ani „Ramy” nie mają filtra kategorii w panelu — brakująca funkcja, nie regresja jednej zakładki. |
| VIS-03 | PASS | test — `qa/evidence/2026-09-17/test/VIS-03/` (`npm run test:visual`) | Podgląd świeżo zapisanej konfiguracji w panelu otworzył się bez błędu dla ścieżki standardowej (E82, domyślne opcje). |
| VIS-04 | PASS | test — `qa/evidence/2026-09-17/test/VIS-04/` (`npm run test:visual`) | Dopełnia CFG-04: filtr „Z wizualizacją”, wybór koloru i powiększenie renderu działają na E55 (E82 nie ma renderów w danych testowych). |
| VIS-05 | PASS | test — `qa/evidence/2026-09-17/test/VIS-05/` (`npm run test:visual`) | Dopełnia CFG-06 (zapis) + ADM-10: pełny zapis konfiguracji, wpis w Dzienniku aktywności, otwarcie przez „Zapytania” → „Szczegóły”. |
| VIS-06 | PASS | test — `qa/evidence/2026-09-17/test/VIS-06/` (`npm run test:visual`) | Dopełnia CFG-07 (część modalu lakieru): 25× Tab w otwartym modalu nie wyprowadza fokusu poza niego; Escape wraca fokus w sensowne miejsce. |
| VIS-07 | PASS (po naprawie) | test — `qa/evidence/2026-09-17/test/VIS-07/` (`npm run test:visual -- -g VIS-07`, wymaga `QA_MAILBOX_EMAIL`/`QA_MAILBOX_PASSWORD`) | Dopełnia CFG-06 (e-mail). Pierwszy przebieg: FAIL — `.env` środowiska testowego miał `MAIL_TRANSPORT=log`. Naprawiono (`.env.remote` → `MAIL_TRANSPORT=smtp`, `SMTP_HOST=de1.sohost.pl`, wdrożone przez FTP tylko dla `.env`). Drugi przebieg: PASS, e-mail dociera w ~8 s. |
| VIS-11 | PASS | test — `qa/evidence/2026-09-17/test/VIS-11/` (`npm run test:visual`) | Dopełnia PUB-01/02: dokładny zestaw modeli per kategoria na `/rowery` (nie tylko stan aktywnego filtra), porównany z `GET /api/catalog`; powrót do „Wszystkie” przywraca pełną listę. |
| VIS-12 | PASS | test — `qa/evidence/2026-09-17/test/VIS-12/` (`npm run test:visual`) | Dopełnia CFG-05 na środowisku testowym: opis modelu domyślnie zwinięty na telefonie (390×844), rozwinięty na desktopie; przełączanie „Rozwiń”/„Zwiń” działa w obie strony. |
| VIS-13 | PASS | test — `qa/evidence/2026-09-17/test/VIS-13/` (`npm run test:visual`) | Dopełnia CFG-07 poza modalem lakieru: audyt fokusu klawiatury karuzeli zdjęć i akordeonu opisu — fokus pozostaje widoczny, nigdy nie znika ani nie trafia na `<body>`. |

## Publiczna strona i konfigurator

| ID / priorytet | Kroki | Oczekiwany rezultat i dowody |
| --- | --- | --- |
| PUB-01 / P0 | 1. Otwórz stronę główną oraz `/rowery` na 1440 px, 768 px i 390 px. 2. Zrób zrzut nagłówka. 3. Przejdź każdym linkiem głównego menu. | Menu ma tylko czynne i opisane pozycje: Rowery, Ramy, Realizacje, Serwis. Nie ma pustej pozycji ani „Części”. Każdy adres odpowiada bez błędu; zrzut dla każdego breakpointu. |
| PUB-02 / P0 | 1. Otwórz `/rowery`. 2. Zrób zrzut listy. 3. Klikaj kolejno „Wszystkie” i każdą dostępną kategorię. 4. Zanotuj widoczne modele. | Filtr ma stan aktywny i pokazuje wyłącznie modele należące do kategorii; powrót do „Wszystkie” przywraca całą listę. Zrzut przed filtrem i po każdym filtrze. |
| PUB-03 / P1 | 1. Porównaj kartę E82 na `/rowery` ze stroną szczegółów E82. 2. W panelu testowym zmień kolejność/zdjęcie główne testowego modelu. 3. Odśwież obie strony. | Pierwsze zdjęcie galerii jest głównym zdjęciem zarówno karty, jak i detalu. Dowód „przed” i „po”; po teście przywróć dane, jeśli nie są przeznaczone do zachowania. |
| PUB-04 / P1 | 1. Otwórz publiczne strony: Ramy, Realizacje, Serwis, Kontakt, regulamin i prywatność. 2. Otwórz po jednym szczególe ramy i realizacji. 3. Przetestuj powrót. | Treść, zdjęcia, CTA i nawigacja działają; brak błędów konsoli oraz niedziałających obrazów. Zrzut każdego typu strony. |
| PUB-05 / P1 | 1. Otwórz `/rowery/elektryczne` w świeżej sesji. 2. Zrób zrzut komunikatu prawnego. 3. Potwierdź go. 4. Zrób zrzut dostępnej oferty. | Komunikat jest widoczny przed ofertą; po potwierdzeniu widoczne są wyłącznie modele kategorii elektrycznej. |
| PUB-06 / P1 | 1. Otwórz `/kontakt`. 2. Spróbuj wysłać pusty formularz. 3. Zapisz komunikaty walidacji i sieć. 4. Nie wysyłaj prawidłowego zgłoszenia bez wskazanej skrzynki testowej. | Wymagane imię, e-mail i wiadomość zatrzymują formularz przed API; zrzut walidacji i brak `POST /contact`. |
| CFG-01 / P0 | 1. Otwórz `/konfigurator?model=e82`. 2. Zrób zrzut stanu początkowego. 3. Wybierz drugi model i wróć do pierwszego. 4. Ustaw rozmiar i po jednym wyborze w kilku grupach. | Model, zdjęcia, cena i dostępne opcje odpowiadają wybranemu modelowi. Wybory nie przechodzą błędnie między modelami; wycena jest czytelna. Zrzut po zmianie modelu i wyborach. |
| CFG-02 / P0 | 1. Zapisz cenę początkową. 2. Zmień opcję dodatnią, ujemną, opcjonalną i — gdzie dozwolone — „Dostarczam własną część”. 3. Po każdej zmianie zapisz cenę oraz podsumowanie. | Cena brutto i różnica aktualizują się natychmiast, bez podwójnego naliczania; wybór własnej części ma poprawną informację o zgodności. Zrzut każdej zmiany oraz stanu końcowego. |
| CFG-03 / P1 | 1. Zmień baterię na każdą dostępną pozycję. 2. Sprawdź pojemność, masę, cenę i tabelę zasięgu. 3. Wróć do baterii domyślnej. | Etykieta, wycena i estymacje zasięgu są zgodne z wybraną baterią; powrót odtwarza cenę domyślną. Zrzut dla baterii domyślnej i alternatywnej. |
| CFG-04 / P1 | 1. Otwórz wybór lakieru. 2. Wyszukaj kolor, użyj filtrów i otwórz render. 3. Wybierz paletę płatną, potem standardową. | Filtry i powiększenie działają, render odpowiada modelowi. Dopłata jest dodawana i cofana tylko wtedy, gdy była ustawiona automatycznie przez paletę. Zrzut listy, renderu i obu podsumowań cen. |
| CFG-05 / P0 | 1. Ustaw 390 × 844. 2. Wybierz E82 i zrób zrzut obszaru pod galerią. 3. Kliknij „Rozwiń” przy opisie. 4. Zrób zrzut rozwiniętej treści, kliknij „Zwiń”. 5. Powtórz na desktopie. | Na telefonie wyraźny przycisk z etykietą „Rozwiń” i strzałką pokazuje interakcję; opis jest początkowo zamknięty i nie zasłania wyborów. Tekst oraz strzałka zmieniają stan po kliknięciu. Desktop startuje otwarty. |
| CFG-06 / P0 | 1. Zostaw wymagany wybór nieustawiony, spróbuj przejść dalej. 2. Uzupełnij konfigurację. 3. Wprowadź błędny e-mail i brak zgody, potem poprawne testowe dane. 4. Zapisz konfigurację tylko na środowisku testowym. 5. Otwórz link wznowienia i publicznego podsumowania. | Walidacja wskazuje konkretny brak i blokuje zapis. Poprawny zapis daje działający link; wznowienie odtwarza model, cenę i wybory. Zrzut komunikatów oraz podsumowania. |
| CFG-07 / P2 | 1. Przejdź cały konfigurator klawiaturą (Tab, spacja, Enter, Escape). 2. Sprawdź fokus przy modalu lakierów, karuzeli i opisie. 3. Otwórz stronę na telefonie i desktopie. | Fokus jest widoczny i nie ucieka pod modal; wszystkie działania mają osiągalną nazwę. Zrzut kluczowych stanów fokusu, błędów konsoli i ostrzeżeń dostępności, jeśli narzędzie je raportuje. |

## Panel administracyjny

| ID / priorytet | Kroki | Oczekiwany rezultat i dowody |
| --- | --- | --- |
| ADM-01 / P0 | 1. Otwórz `/admin` bez sesji. 2. Zaloguj się poprawnym kontem testowym. 3. Odśwież stronę i przejdź między zakładkami. 4. Wyloguj się, spróbuj otworzyć chronioną zakładkę. | Brak dostępu bez sesji, aktywna sesja przetrwa odświeżenie, wylogowanie blokuje dane. Zrzut stanu przed logowaniem, po logowaniu i po wylogowaniu. |
| ADM-02 / P0 | 1. W „Modele i zdjęcia” edytuj wyłącznie model testowy: nazwa/opis/specyfikacja, kategoria, dostępność. 2. Dodaj obraz, zmień kolejność, usuń obraz testowy. 3. Otwórz publiczną kartę oraz detal. | Zapis daje potwierdzenie, odświeżenie zachowuje dane; kolejność zdjęć aktualizuje główny obraz na liście i detalu. Zrzut formularza, toastu, listy publicznej i detalu. |
| ADM-03 / P1 | 1. W „Ramy”, „Kategorie” i „Realizacje” utwórz lub edytuj dane testowe. 2. Dodaj oraz uporządkuj media. 3. Sprawdź ich stronę publiczną, następnie posprzątaj dane testowe. | Powiązania kategorii, widoczność, galerie i kolejność mediów działają bez utraty innych danych. Zrzut panelu, wyniku publicznego oraz potwierdzenia sprzątania. |
| ADM-04 / P0 | 1. W „Części i ceny” utwórz/edytuj część testową. 2. W „Osprzęt i cena modelu” przypisz ją do modelu, ustaw domyślną i opcjonalną. 3. Przelicz ceny, otwórz konfigurator. | Właściwa część i cena pojawia się tylko w zgodnym modelu; cena „od” oraz konfigurator odzwierciedlają aktualne wartości. Zrzut każdego etapu i końcowego podsumowania. |
| ADM-05 / P1 | 1. W „Baterie” dodaj/edytuj testowy pakiet oraz przypisz go do modelu. 2. Przejdź do konfiguratora. 3. Usuń lub odłącz dane testowe. | Dane elektryczne, masa, cena i pojemność są walidowane; bateria jest widoczna tylko dla przypisanego modelu, a zasięg oraz wycena się zmieniają. |
| ADM-06 / P1 | 1. W „Lakiery” utwórz/edytuj paletę i kolor testowy. 2. Ustaw dostępność osobno dla modelu i ramy. 3. Dodaj render testowy. 4. Otwórz picker modelu i strony ram. | Palety modelu i ramy nie mieszają się; wyszukiwanie, filtr, render i dopłata działają. Zrzut panelu, obu pickerów i wyceny. |
| ADM-07 / P0 | 1. W „Strony” oraz „Teksty” edytuj tekst testowy. 2. Zaznacz fragment, użyj pogrubienia, kursywy, nagłówka i listy. 3. Zapisz, odśwież panel oraz stronę publiczną. 4. Cofnij treść testową. | Każdy przycisk WYSIWYG formatuje zaznaczony fragment, a nie pusty kursor; zapis zachowuje HTML i poprawnie renderuje go publicznie. Zrzut zaznaczenia, wyniku w edytorze, toastu i strony. |
| ADM-08 / P1 | 1. W „Kolory” i brandingu zmień tylko wcześniej uzgodnioną wartość testową. 2. Sprawdź kontrast, nagłówek, przyciski i widok mobilny. 3. Przywróć wartość. | Motyw i branding aktualizują się bez utraty czytelności, obraz logo się ładuje. Zrzut przed/po na desktopie i telefonie. |
| ADM-09 / P1 | 1. W „Chatbot AI” zmień tylko tekst testowy lub użyj istniejącego. 2. W „Poczta” sprawdź walidację adresów i szablon wiadomości. 3. Wysyłkę wykonaj wyłącznie po zgodzie i na testową skrzynkę. | Konfiguracja zapisuje się, nie ujawnia sekretów, a wiadomość testowa ma poprawny temat, treść i dane konfiguracji. Zrzut ustawień oraz otrzymanej wiadomości po zamazaniu danych prywatnych. |
| ADM-10 / P0 | 1. Utwórz konfigurację testową zgodnie z CFG-06. 2. W „Zapytania” znajdź ją i kliknij „Szczegóły”. 3. Sprawdź „Dziennik aktywności”. | Szczegóły otwierają się w tej samej zalogowanej karcie i pokazują dane bez ponownego logowania. Dziennik zawiera istotne zdarzenia bez tokenów lub haseł. Zrzut tabeli, widoku szczegółów i wpisu logu. |

## Kontrakty API i regresja wdrożenia

| ID / priorytet | Kroki | Oczekiwany rezultat i dowody |
| --- | --- | --- |
| API-01 / P0 | Odczytaj `GET /api/health` i `GET /api/catalog`; porównaj liczbę modeli, kategorii, mediów i cen z widokiem publicznym. | Health zwraca połączenie z bazą, katalog jest poprawnym JSON-em, a publiczna strona nie używa starych zdjęć/cen. Zachowaj bezpieczny skrót odpowiedzi w `WYNIK.md`, nie pełne dane wrażliwe. |
| API-02 / P1 | Bez tokenu wywołaj odczyt i zapis admina; z nieprawidłowym tokenem spróbuj tego samego. Następnie sprawdź walidację niepoprawnego payloadu na środowisku testowym. | Endpointy publiczne działają zgodnie z przeznaczeniem, administracyjne odrzucają brak/zły token, a walidacja zwraca bezpieczny błąd bez zmiany danych. |
| REL-01 / P0 | Po każdym wdrożeniu wykonaj PUB-01, PUB-02, CFG-05, CFG-06 (bez wysyłki na produkcji), ADM-01 i API-01. Sprawdź konsolę oraz żądania 4xx/5xx. | Krótki pakiet smoke potwierdza najważniejszy przepływ publiczny, sesję admina i API. Dowody zapisuj w osobnym katalogu wdrożenia. |

## Kolejność uruchamiania przez osobnych agentów

1. Agent A: `API-01`, `PUB-01`–`PUB-04`, `CFG-05`, `CFG-07` — testy bez zapisu.
2. Agent B: `CFG-01`–`CFG-04` — testy konfiguratora bez finalnego zgłoszenia.
3. Agent C: `CFG-06`, `ADM-01`, `ADM-10` — wspólny przepływ konfiguracja → panel.
4. Agent D: `ADM-02`–`ADM-06` — katalog, media, ceny, baterie i lakiery na danych `[QA …]`.
5. Agent E: `ADM-07`–`ADM-09`, `API-02`, `REL-01` — treści, motyw, komunikacja i regresja.

Agenci z bloków C–E nie pracują równolegle na tych samych rekordach. Każdy po
swoim bloku przekazuje ID danych testowych, wynik, folder dowodów i wszystkie
otwarte ryzyka następnemu agentowi.
