# Kierunek wizualny i UX

Załączony ekran jest inspiracją układu, a nie projektem do wiernego kopiowania. Docelowa realizacja ma być nowoczesna, czysta i dopracowana wizualnie.

Materiał referencyjny zapisano w `assets/references/homepage-layout-inspiration.png`.

## Co zachowujemy z inspiracji

- jasny, przestronny nagłówek z logo po lewej,
- prosta nawigacja główna: Rowery, Ramy, Części i Serwis; bez osobnej pozycji „Pojazdy elektryczne”,
- wyróżnione obramowaniem CTA „Stwórz własny projekt”,
- prezentacja kategorii rowerów za pomocą dużych zdjęć/sylwetek,
- nazwa i prosty znak graficzny kategorii,
- dużo białej przestrzeni i ograniczona liczba elementów na ekranie.

## Co poprawiamy

- mobile-first zamiast desktopowego rzędu pięciu małych kategorii,
- ostrzejsze, jednolite zdjęcia produktowe na wspólnym tle,
- wyraźniejsza hierarchia nagłówków i większy kontrast tekstu,
- spójny rytm odstępów, promieni narożników oraz obramowań,
- krótsza nawigacja mobilna z menu i zawsze czytelnym CTA,
- pełne kafle kategorii zamiast samego obrazu i małej etykiety,
- stany hover, focus, aktywny, ładowanie, brak zdjęcia i błąd,
- dostępność klawiaturowa oraz widoczny focus,
- bez dekoracji przypominających roboczy edytor lub obrys zaznaczonego komponentu.

## Proponowany język wizualny

- baza: biel, grafit i bardzo jasne szarości,
- akcent roboczy: energetyczna limonka; cały zestaw kolorów jest edytowalny w panelu i zapisany w bazie,
- typografia: nowoczesny grotesk o wysokiej czytelności,
- zdjęcia: rower pokazany w jednolitym ujęciu bocznym, bez przypadkowego tła,
- komponenty: lekkie karty, subtelne obramowania i niewielkie cienie,
- charakter: techniczny i premium, ale nie przeładowany.

Dokładne kolory, fonty i zasady logo wymagają zatwierdzenia lub księgi znaku. Przekazane pliki logo są bitmapami PNG mimo `SVG` w pierwotnej nazwie.

## Strona główna - szkic informacji

1. Nagłówek: logo, podstawowa nawigacja, CTA konfiguratora.
2. Krótkie otwarcie marki i główna korzyść.
3. Kategorie rowerów pobierane z API.
4. Sekcja „Jak wygląda konfiguracja” w 3 krokach.
5. Wybrane realizacje lub modele.
6. Serwis / kontakt / zaufanie.
7. Stopka z danymi firmy, polityką prywatności i kontaktem.

## Widok kategorii

Każda kategoria ma nazwę, slug, opis krótki, opis pełny, domyślne zdjęcie, opcjonalną ikonę, kolejność oraz status publikacji. Opis nie powinien być pustym tekstem marketingowym: ma wyjaśniać przeznaczenie rowerów, styl jazdy, typowy teren i cechy wyróżniające.

## Konfigurator mobilny

- jeden główny wybór na ekranie lub czytelne sekcje kroków,
- pasek postępu i możliwość powrotu bez utraty danych,
- przyklejone podsumowanie ceny oraz przycisk „Dalej”,
- duże kafle opcji ze zdjęciem, nazwą, krótką specyfikacją i dopłatą,
- konflikty kompatybilności tłumaczone prostym językiem,
- pełne podsumowanie przed wysłaniem zapytania.
- galeria zdjęć korzysta z gotowej karuzeli ze strzałkami, gestem przesunięcia i obsługą klawiatury.
