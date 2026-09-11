# Zasady prowadzenia projektu

Ustalone 11 września 2026 r.

1. Każdą istotną decyzję, nowe dane i zmianę wymagań zapisujemy w dokumentacji projektu, a nie tylko w rozmowie.
2. Rozróżniamy dane potwierdzone, założenia robocze i pytania otwarte.
3. Jeśli nowe informacje są sprzeczne z wcześniejszymi albo mogą zmienić architekturę, nie zgadujemy - wskazujemy rozbieżność i pytamy właściciela projektu.
4. Braki danych zgłaszamy stopniowo, zaczynając od tych, które blokują najbliższy etap.
5. Projektujemy mobile-first.
6. Panel administracyjny jest osobnym interfejsem do zarządzania kategoriami, modelami, częściami, zdjęciami, opisami, cenami i podstawowymi regułami.
7. Unikamy nadmiernej granulacji parametrów. Osobne pola tworzymy dla danych używanych do filtrowania, kompatybilności lub wyceny; pozostałe szczegóły mogą początkowo być opisem lub JSON.
8. Kategorie i modele mają jakościowe opisy, które w przyszłości mogą zostać wykorzystane przez agenta AI.
9. Materiały wizualne są inspiracją, nie poleceniem wiernego odwzorowania. Docelowy interfejs ma być czystszy i bardziej dopracowany.
10. Indywidualne zamówienia oraz ich ceny są danymi referencyjnymi do prototypu, dopóki właściciel nie zatwierdzi ich jako oferty produkcyjnej.
11. Opisy kategorii i modeli edytujemy przez WYSIWYG z możliwością dodawania obrazów; media zachowują tekst alternatywny i nie są przechowywane bezpośrednio jako base64 w bazie.
12. Dla Rexor E55 obowiązuje tylko damper 210x55 z łącznikiem 70 mm.
13. Dla Rexor E82 obowiązuje wyłącznie silnik Bafang M560 750 W; M500/M510 nie są opcjami konfiguratora.
14. Przypisanie części do kategorii oznacza ogólną zgodność/reużywalność, ale lista `model_parts` jest ostatecznym źródłem części dostępnych w konkretnym modelu. Zapobiega to przypadkowemu pokazaniu części we wszystkich modelach kategorii.
15. MVP kończy się zapytaniem ofertowym bez płatności. Konfiguracja zachowuje pełną migawkę i ma osobny link do podsumowania oraz bezpieczny link do ponownego otwarcia konfiguratora.
16. Klient otrzymuje e-mail z podsumowaniem i linkami; zapis zapytania nie może zależeć od powodzenia wysyłki SMTP.
17. Każda część/opcja ma cenę sprzedaży brutto. Dopłata jest obliczana w locie jako różnica ceny wybranej i domyślnej części; nie utrzymujemy ręcznie drugiego, niezależnego cennika dopłat.
18. Cena, użyte ceny składowe oraz obliczone różnice są utrwalane w migawce zapisanej konfiguracji.
19. Ceny znalezione w sklepach internetowych są wyłącznie danymi roboczymi do preseedu i muszą być zatwierdzone lub zastąpione cennikiem Rexor przed publikacją.
20. Na etapie lokalnym backup jest przygotowany, ale nie jest podłączony do CRON. Produkcyjne uruchomienie wymaga wskazania miejsca przechowywania, retencji i testu odtworzenia.
21. Zdjęcia kategorii, modeli i części nie są zaszyte w interfejsie. Administrator zarządza zdjęciem głównym, galerią, kolejnością, podpisem i tekstem alternatywnym.
22. Główne menu zawiera: Rowery, Ramy, Części i Serwis oraz wyróżnione przejście do konfiguratora. Nie tworzymy osobnej pozycji „Pojazdy elektryczne”, ponieważ dublowałaby ofertę rowerów.
23. Kolory motywu są zmiennymi systemu projektowego zapisanymi w `site_settings` i edytowanymi w panelu, bez ręcznego poprawiania każdego komponentu.
24. Podstrona Serwis jest normalną edytowalną stroną w `site_pages`; jej treść korzysta z tego samego WYSIWYG z obrazami co opisy modeli i kategorii.
25. Do typowych interakcji używamy sprawdzonych komponentów systemu projektowego: przycisków, menu, karuzeli, dialogów, formularzy i tabel. Kod własny służy układowi oraz funkcjom specyficznym dla konfiguratora.

Aktualna lista braków i sprzeczności znajduje się w `docs/BRAKI_DANYCH.md`.
