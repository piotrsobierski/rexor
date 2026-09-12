# Pytania otwarte do właściciela / decydenta

Lista pytań biznesowych, których nie da się rozstrzygnąć samym kodem — potrzebna decyzja
osoby odpowiedzialnej za ofertę i treść strony. Zebrane podczas prac nad edycją treści
w panelu administratora (wrzesień 2026).

## 1. „Ramy” vs „Rowery” — czym się różnią?

Dziś obie zakładki (`/ramy` i `/rowery`) pokazują dokładnie te same modele (E82, E55,
CFR707) — `/rowery` jako pełny katalog z cenami i przejściem do konfiguratora, `/ramy`
jako te same modele w formie kafelków z krótką specyfikacją ramy (materiał, skok,
mocowania). To realna duplikacja: klient nie ma jasnego powodu, żeby wejść akurat w
„Ramy” zamiast w „Rowery”.

Pytania:
- Czy „Ramy” mają w ogóle zostać jako osobna zakładka, czy scalić je z „Rowery"
  (np. jako sekcja „Specyfikacja ramy" na stronie modelu, zamiast osobnej podstrony)?
- Jeśli zostają osobno — co ma być ich unikalnym celem? Warianty do rozważenia:
  a) **Sama rama jako osobny produkt** — klient może kupić samą ramę (bez osprzętu,
     silnika, koła) i zbudować rower samodzielnie lub u innego mechanika.
  b) **Katalog ram spoza własnej oferty Rexor** — ramy innych producentów/sklepów,
     które Rexor poleca lub z którymi ma kontakt w fabryce (patrz pytanie #2 niżej),
     pokazywane obok/zamiast własnych modeli.
  c) **Czysto informacyjna strona „o naszych ramach"** (geometria, materiały) bez
     żadnej ścieżki zakupowej — commercial content, nie osobny katalog produktowy.

## 2. Ramy „z internetu” — jak dokładnie ma to działać?

Padło, że chcesz móc dodawać do zakładki „Ramy” ramy, które nie są własnym katalogiem
Rexor — ramy, które znasz i masz kontakt z fabryką, żeby dać klientowi większy wybór.
To zależy od odpowiedzi na pytanie #1 (czym są „Ramy"), ale niezależnie od tego:

- Czy admin ma **ręcznie wypełniać formularz** dla każdej takiej ramy (nazwa, zdjęcie
  wgrywane jak dziś modele, krótki opis, link do producenta/źródła, orientacyjna cena)?
  To jest prostsze i bardziej niezawodne do zbudowania.
- Czy chcesz **wklejać link**, a system ma próbować automatycznie ściągnąć nazwę/zdjęcie/
  cenę ze strony producenta? To wymaga dużo więcej pracy i jest kruche (zależy od
  struktury każdej strony z osobna, może się psuć przy zmianach na stronie źródłowej).
- Skąd mają pochodzić **zdjęcia** tych ram — czy wolno pobierać zdjęcia ze stron
  producentów/sklepów (kwestia praw autorskich — zwykle NIE wolno bez zgody), czy admin
  ma sam robić/wgrywać własne zdjęcia?
- Czy przy takiej ramie ma być widoczna informacja „dostępne u [nazwa źródła]” / link
  wyjściowy, czy ma wyglądać identycznie jak własny katalog Rexor?
- Gwiazdka „nasza rekomendacja” — czy to ma być zwykła plakietka tekstowa przy ramie,
  czy też sortowanie ma automatycznie promować oznaczone ramy na górę listy?

## 3. Kafelek „Pojazdy elektryczne” — zakres

Kategorię już wdrożyłem (E82 i E55 przeniesione tam z MTB, bramka ostrzeżenia prawnego
przy wejściu, tekst edytowalny w panelu). Do potwierdzenia:
- Czy bramka ostrzeżenia ma też pojawiać się przy wejściu bezpośrednio na stronę
  konkretnego modelu (np. link z reklamy prosto na `/rowery/mtb/e82`), czy tylko przy
  wejściu przez listę kategorii — dziś działa tylko to drugie.
- Czy treść ostrzeżenia („Uwaga! Pojazdy elektryczne nie spełniają obecnych norm...")
  wymaga zatwierdzenia przez prawnika przed publikacją na docelowo większą skalę.

## 4. Regulamin / Polityka prywatności / Kontakt

Strony już działają i są opublikowane pod `/regulamin`, `/polityka-prywatnosci`,
`/kontakt`, edytowalne w panelu (zakładka „Strony"). Treść regulaminu i polityki to
kompletny, standardowy szablon dla sklepu z konfiguratorem — ale **nie jest to porada
prawna** i wymaga przeglądu. Do uzupełnienia realnymi danymi (obecnie w nawiasach
kwadratowych w treści strony „Kontakt" i w stopkach regulaminu/polityki):
- Pełna nazwa firmy, adres siedziby, NIP, REGON
- Adres e-mail i telefon kontaktowy do zgłoszeń/reklamacji
- Rzeczywisty termin rozpatrywania reklamacji (jeśli inny niż ustawowe 14 dni)

## 5. Zdjęcia kategorii

Wstawiłem tymczasowe zdjęcia z darmowych banków (Unsplash/Pexels, licencja komercyjna,
bez wymogu podania autora) dla każdej kategorii, żeby było widać, że mogą się różnić
wizualnie. Do potwierdzenia:
- Czy te zdjęcia zostają na stałe, czy to tylko placeholder do czasu własnej sesji
  zdjęciowej / zdjęć od producenta ram?
- Czy chcesz też zdjęcia poszczególnych **ram z internetu** (patrz pytanie #2) — tam
  kwestia praw autorskich jest inna niż przy bankach zdjęć wolnych od tantiem.

## 6. Kategoria MTB została pusta

Po przeniesieniu E82 i E55 do „Pojazdy elektryczne" (oba mają silnik >250 W), kategoria
„MTB" nie ma już żadnego przypisanego modelu — kafelek na stronie głównej pokaże „W
przygotowaniu". Zostaje tak (czeka na przyszłe modele w normach roweru elektrycznego),
czy wolisz inaczej rozwiązać (np. ukryć kafelek do czasu pojawienia się modelu)?

## 7. Strona „Instrukcje” w stopce

Przy pytaniu o strony w stopce padły: Regulamin, Polityka prywatności, Kontakt —
„Instrukcje” nie zostały wybrane. Dodać teraz, czy to było świadome pominięcie na razie?
