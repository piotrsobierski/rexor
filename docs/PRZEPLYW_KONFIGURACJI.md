# Zapis, linki i e-mail konfiguracji

## Przepływ klienta

1. Klient wybiera model, rozmiar, baterię i dostępne części.
2. Frontend pokazuje wyliczenie na bieżąco, a API ponownie sprawdza wybory, kompatybilność i ceny.
3. Na końcu klient podaje imię i e-mail; telefon i uwagi są opcjonalne.
4. API zapisuje konfigurację wraz z pełną migawką nazw, specyfikacji i cen.
5. Powstaje zapytanie ofertowe dla administratora.
6. Klient widzi stronę podsumowania i otrzymuje e-mail z dwoma linkami.

## Dwa linki

- `/konfiguracja/{token}` — podsumowanie tylko do odczytu, przeznaczone również do udostępniania.
- `/konfigurator/wznow/{token}` — ponowne otwarcie konfiguratora z dokładnymi wyborami i możliwością zapisania kolejnej wersji.

Tokeny muszą mieć co najmniej 256 bitów losowości. W bazie zapisujemy tylko ich skróty SHA-256. Publiczny identyfikator służy obsłudze i wyszukiwaniu, ale sam nie daje dostępu do konfiguracji. Link można unieważnić lub ograniczyć terminem ważności.

Publiczne podsumowanie nie pokazuje adresu e-mail, telefonu ani wewnętrznych uwag. Dane kontaktowe widzi tylko uprawniony administrator.

Edycja nie zmienia historycznie wysłanego zapytania. Wznowienie tworzy nową wersję/konfigurację powiązaną z poprzednią; szczegół relacji dodamy podczas implementacji API.

## E-mail

Wiadomość zawiera imię klienta, nazwę modelu, cenę brutto, skrócone zestawienie, link podglądu i link wznowienia. E-mail trafia najpierw do `email_outbox`. Niepowodzenie SMTP jest ponawiane i nie powoduje utraty zapytania.

Lokalnie `MAIL_TRANSPORT=log`, więc wiadomość nie opuszcza komputera. SMTP zostanie ustawione dopiero przez sekrety produkcyjne.


## Lakier w migawce

Kolor nie jest pozycją w `configuration_items`, bo nie jest częścią z cennika.
Ma własną tabelę `configuration_paint` z pełną migawką: nazwa palety, nazwa
i kod lakieru, hex, rodzaj wykończenia, dopłata i ścieżka renderu użytego jako
obraz konfiguracji. Te same dane wchodzą do JSON-owej migawki pod kluczem
`paint`, a kwota osobno do `pricing.paintPriceGross`.

Dzięki temu zmiana cennika lakierów ani wyłączenie koloru w panelu nie ruszają
historii: zapisana konfiguracja dalej pokazuje, co i za ile klient wybrał.
Podsumowanie klienta pokazuje wtedy render zamiast fabrycznego zdjęcia modelu,
a powiadomienie do sklepu ma nazwę lakieru w treści.
