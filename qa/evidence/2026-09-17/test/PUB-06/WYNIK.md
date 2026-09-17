# PUB-06 — walidacja formularza kontaktowego

- Środowisko: test — `https://rexor.sobierski.com/kontakt`
- Data: 2026-09-17
- Wynik: **PASS**

## Kroki i dowody

1. Otworzono formularz kontaktowy i wybrano „Wyślij wiadomość”, pozostawiając
   wymagane pola puste.
2. Przeglądarka wskazała wymagane pola: `contact-name`, `contact-email` i
   `contact-message`.
3. Obserwacja sieci nie wykazała żadnego `POST /contact`.

Zrzut: `01-contact-required-validation.png`.

Nie wysyłano poprawnego formularza: nie ma wyznaczonej skrzynki testowej ani
autoryzacji na dostarczenie wiadomości. Brak błędów i ostrzeżeń konsoli.
