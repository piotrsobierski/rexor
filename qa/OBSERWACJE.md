# Obserwacje z wykonywania testów

Ten plik zawiera fakty zauważone podczas testów, które nie są jeszcze błędami
potwierdzonymi powtarzalną reprodukcją. Kolejny agent ma je sprawdzić przed
rozpoczęciem nowej diagnozy.

## 2026-09-17 — Logowanie automatem

- `locator.fill()` dla kontrolowanego przez React pola hasła może wysłać login
  zanim aplikacja zapisze stan; w jednym przebiegu payload miał długość hasła
  `0`, mimo widocznej wartości w polu.
- Do testów logowania używaj `pressSequentially()` dla e-maila i hasła, a potem
  kliknij „Zaloguj”. Na `rexor.sobierski.com` konto przekazane przez właściciela
  zalogowało poprawnie.
- To ograniczenie narzędzia testowego, nie potwierdzony defekt formularza.

## 2026-09-17 — Początkowe ładowanie modeli na stronie głównej

- Dowód: `qa/evidence/2026-09-16/test/PUB-01/02-mobile-home-menu.png`
  uchwycił nagłówek „Wybierz swoją bazę” zanim pojawiły się karty modeli.
- Kod: podczas `STATIC_EXPORT=1` `fetchJson()` celowo zwraca `null`, więc
  `HomePage` oczekuje na klientowe `GET /api/catalog` i do tego czasu renderuje
  `CardGridSkeleton`.
- Pomiar 2026-09-17: pięć świeżych sesji otrzymało `/api/catalog` HTTP 200 z
  3 modelami i 6 kategoriami; po 4 s wszystkie pokazały E82. Dwa wcześniejsze
  wejścia nie pokazały modelu jeszcze po 3 s, a kolejne trzy były szybsze.
- Wniosek: nie ma dowodu utraty danych ani błędnej odpowiedzi API, ale warto
  monitorować czas widoczności pierwszej karty (docelowo < 2 s) i kontrast
  szkieletu. Nie zmieniono kodu bez stabilnej reprodukcji lub ustalonego celu
  wydajnościowego.
