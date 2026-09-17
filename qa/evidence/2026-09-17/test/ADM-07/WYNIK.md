# ADM-07 — edytor tekstu modelu

- Środowisko: test — `https://rexor.sobierski.com/admin`
- Data: 2026-09-17
- Wynik: **PASS**

1. Zalogowano się i ustawiono fokus w pierwszym edytorze HTML modelu.
2. Zaznaczono tekst, wybrano „Pogrubienie” i sprawdzono HTML edytora.
3. Stan HTML zmienił się — polecenie wykonało się na istniejącym zaznaczeniu,
   nie utracono fokusu przed akcją.
4. Nie użyto „Zapisz model”; odświeżenie strony odrzuciło lokalną zmianę.

Zrzut: `01-bold-without-save.png`. Brak błędów i ostrzeżeń konsoli.
