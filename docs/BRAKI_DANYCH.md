# Braki danych i pytania otwarte

Lista będzie aktualizowana w miarę dostarczania materiałów. Warto odpowiadać partiami; nie trzeba przygotowywać wszystkiego naraz.

## Priorytet 1 - potrzebne do modelu danych i prototypu

Brak decyzji blokujących rozpoczęcie prac. Przyjmujemy zapytanie ofertowe bez płatności, zapis konfiguracji pod bezpiecznym linkiem, jedno konto administratora, jawne zatwierdzanie części per model oraz demonstracyjne ceny brutto 15 000 PLN i 16 500 PLN.

## Priorytet 2 - lakiery

Model danych i konfigurator są gotowe (`docs/PLAN_LAKIERY.md`), ale trzy rzeczy
są wpisane roboczo i czekają na decyzję właściciela:

- **paleta fabryczna Rexor** - sześć kolorów w migracji `028` (surowy karbon,
  czarny mat, czarny połysk, biały, antracyt, czerwony) jest propozycją, nie
  ofertą. Potrzebna prawdziwa lista kolorów w cenie wraz z wykończeniem.
- **dopłata za palety Porsche i Volkswagen** - przyjęto 2500 zł brutto jako
  wartość roboczą. Trzeba ją oprzeć na realnym koszcie lakieru mieszanego na
  zamówienie i czasie realizacji. Cena jest edytowalna w panelu, także osobno
  dla pojedynczego lakieru i dla pojedynczego modelu.
- **prawa do zdjęć referencyjnych** - 664 zdjęcia aut pochodzą z galerii
  Rennbow. Do czasu potwierdzenia praw są widoczne wyłącznie w panelu
  (`storage/paint-reference/`, trasa `GET /api/admin/paint-reference/…`).
  Do rozstrzygnięcia: publikować z atrybucją, pozyskać własne zdjęcia, czy
  zostać przy samych renderach.

Poza tym renderów jest 228 z 680 lakierów - reszta lakierów pokazuje się jako
płaska próbka z jawną informacją, że wizualizacji nie ma. Uzupełnianie idzie
przez upload w panelu (zakładka „Lakiery”), bez udziału programisty.

## Priorytet 2 - ramy

Dla ram E82 i E55 brakuje:

- pełnego opisu handlowego i technicznego,
- tabeli geometrii dla każdego rozmiaru,
- zakresu wzrostu użytkownika dla rozmiarów,
- materiału, masy i dopuszczalnej masy całkowitej,
- standardu główki, suportu, osi i mocowania hamulca,
- skoku/zakresu pracy zawieszenia,
- kompatybilnych wymiarów dampera i widelca,
- maksymalnego rozmiaru koła i szerokości opony,
- prowadzenia przewodów, miejsca na baterię i mocowań,
- kolorów standardowych, zdjęć bocznych i zdjęć detali,
- statusu produkcyjnego E82 oraz zasad dopłaty 100 USD.

## Priorytet 3 - niejasności w przekazanych częściach

- E55: zapis „Maxxis 2.6 DHR DFR” - czy chodzi o komplet DHR II z tyłu i DHF z przodu?
- E55: „Linkglide XT” - potrzebne dokładne symbole kasety, przerzutki, manetki i łańcucha.
- E55: producent publikuje również 230x60, ale decyzja Rexor jest zamknięta - w systemie występuje wyłącznie 210x55 z łącznikiem 70 mm.
- E82: „Magura lub Shimano” dla tarcz - czy klient wybiera markę, czy zależy ona od hamulców?
- E82: lakier indywidualny miał zakres 1000-1200 zł; w preseedzie przyjęto roboczo 1100 zł, ale cena wymaga zatwierdzenia.
- Dopłata do nieprodukowanej ramy jest w USD, podczas gdy reszta cennika jest w PLN - potrzebna zasada kursu lub ręczna wycena.
- E82: producent wspomina M500/M510, ale nie są one opcjami Rexor. Jedynym silnikiem modelu jest M560 750 W.
- E82: tabela geometrii zawiera rozmiar S, ale selektor sprzedażowy producenta zaczyna się od M/17 cali.
- Trzeba zatwierdzić, czy wartość rozliczeniowa „Dostarczam własną część” zawsze wynosi 0 zł. W preseedzie tak przyjęto, a obniżka wynika automatycznie z ceny zastępowanej części.

## Treści i media

- opisy pięciu kategorii widocznych w szkicu: Szosa, Gravel, MTB, Miejski i turystyczny, Rower elektryczny,
- finalne nazwy kategorii i kolejność,
- zdjęcie domyślne oraz opcjonalna ikona każdej kategorii,
- zatwierdzenie praw do publikacji dostarczonych zdjęć modeli i przygotowanie jednolitego stylu zdjęć części,
- dane firmy, kontakt, linki prawne i treść CTA,
- księga znaku albo potwierdzone kolory oraz fonty.

## Hosting i integracje

- dostępność SSH/SFTP i CRON,
- sposób przechowywania sekretów poza katalogiem publicznym,
- aktywacja SSL,
- konto/nadawca poczty i konfiguracja SMTP,
- zewnętrzne miejsce przechowywania backupów, retencja i harmonogram CRON; sam skrypt bazy i mediów jest już przygotowany, ale celowo niepodłączony.

## Potwierdzone decyzje

- E82 i E55 są modelami referencyjnymi w kategorii MTB.
- CFR707 jest trzecim modelem w kategorii Gravel.
- Pozostałe kategorie na razie nie mają modeli.
- Wszystkie ceny w produkcie mają być brutto.
- Nie wdrażamy globalnego rabatu za części klienta.
- E55 ma tylko wariant dampera 210x55.
- Opisy modeli i kategorii mają edytor WYSIWYG z obrazami.
- E82 ma wyłącznie silnik Bafang M560 750 W.
- Część może należeć do wielu kategorii, ale administrator jawnie zatwierdza ją dla konkretnego modelu.
- Konfiguracja kończy się zapytaniem ofertowym bez płatności, ma stronę podsumowania oraz link umożliwiający ponowne otwarcie tych samych wyborów.
- Dopłaty są obliczane z cen brutto części, a nie przechowywane ręcznie jako osobny cennik.
- Do preseedu włączono 5 zdjęć E82, 4 zdjęcia E55 i 5 zdjęć CFR707 z katalogu `Downloads`; panel ma umożliwiać ich pełną edycję i wymianę.
