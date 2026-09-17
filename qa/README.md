# Testy przeglądarkowe Rexor

Ten katalog jest trwałym miejscem dla dowodów testów wykonywanych przez
agentów. Scenariusze, kolejność i warunki akceptacji są w
[`SCENARIUSZE_TESTOWE.md`](SCENARIUSZE_TESTOWE.md).

## Obowiązek agenta wykonującego test

> **Kluczowa reguła powtarzalności:** każda akcja QA — także jednorazowa
> zmiana danych przygotowująca test — musi najpierw dostać wersjonowalny skrypt
> w `qa/scripts/`, następnie zostać uruchomiona tym skryptem i mieć dowód w
> `qa/evidence/`. Wspólną logikę (logowanie, zrzuty, bezpieczne maskowanie i
> odczyty API) dodajemy jako małe funkcje w `qa/scripts/lib/`, zamiast kopiować
> ją między scenariuszami. Komendy ad-hoc są tylko diagnostyką: nie są dowodem
> testu ani substytutem skryptu.
>
> **Kluczowa reguła identyfikatorów i wdrożeń:** gdy semantyczny locator
> (rola, nazwa lub etykieta) nie jest stabilny albo jednoznaczny, agent może
> dodać do kodu elementu celowany `data-testid` i użyć go w skrypcie. Nie
> używamy selektorów zależnych od układu, indeksu ani przypadkowej treści.
> Jeżeli test wymaga poprawki aplikacji, agent może wdrożyć ją na środowisko
> deweloperskie i ponowić automat. Wdrożenie na produkcję wymaga oddzielnego,
> wyraźnego polecenia.

1. Pracuj najpierw na `https://rexor.sobierski.com`. Produkcja służy wyłącznie
   do końcowej kontroli odczytowej, chyba że zlecenie wprost pozwala na zapis.
2. Przed pierwszym krokiem utwórz katalog:
   `qa/evidence/RRRR-MM-DD/<test|production>/<ID_SCENARIUSZA>/`.
3. Dla każdego kroku zapisz zrzut ekranu w tym katalogu. Nazwa ma postać
   `NN-opis-stanu.png`, np. `03-gravel-tylko-cfr707.png`. Użyj pełnego widoku
   strony, gdy potwierdza on układ; dla modala lub komunikatu użyj czytelnego
   kadru tego elementu. Sam odczyt DOM-u nie zastępuje zrzutu.
4. Dopisz w tym samym katalogu `WYNIK.md`: adres, viewport, czas, wykonane
   kroki, rezultat każdego kroku, ścieżki zrzutów i błędy konsoli/sieci.
   Nie zapisuj haseł, tokenów ani danych prawdziwych klientów.
5. Gdy test wymaga utworzenia danych, użyj prefiksu `[QA RRRR-MM-DD]` i
   testowej skrzynki podanej poza repozytorium. Nie usuwaj danych produkcyjnych.
6. Po błędzie najpierw zachowaj dowód i opis reprodukcji. Naprawa jest
   dozwolona wyłącznie wtedy, gdy przyczyna jest jednoznaczna i zakres zmiany
   wynika ze zlecenia. W przeciwnym razie zakończ scenariusz raportem.
7. Po zakończeniu scenariusza (dowód i `WYNIK.md` zapisane) zrób commit,
   zanim przejdziesz do kolejnego testu. Commit po każdym teście, a nie
   zbiorczo na koniec sesji, bo pojedynczy padnięty scenariusz albo przerwana
   sesja agenta nie mają wtedy szansy skasować dowodów wcześniejszych, już
   zaliczonych testów.

## Szablon `WYNIK.md`

```md
# CFG-03 — Bateria i wycena

- Data i czas: 2026-09-16 14:20 CEST
- Środowisko: test
- Adres: https://rexor.sobierski.com/konfigurator?model=e82
- Viewport / przeglądarka: 390 × 844 / Chromium
- Dane testowe: brak

| Krok | Wynik | Dowód | Uwagi |
| --- | --- | --- | --- |
| 1 | PASS | `01-model-e82.png` | Model i cena widoczne. |
| 2 | FAIL | `02-bateria.png` | Cena nie zmieniła się po wyborze. |

## Konsola i sieć

- Console: brak błędów / opis błędu
- Żądania: endpoint, status HTTP, skrócony bezpieczny opis odpowiedzi

## Jeśli wykryto błąd

- Objaw i kroki reprodukcji:
- Oczekiwane / faktyczne zachowanie:
- Wstępna przyczyna (tylko gdy potwierdzona):
- Czy dokonano naprawy, dlaczego i jak zweryfikowano:
```

## Zasada naprawy

Raport błędu zawiera: identyfikator scenariusza, dokładne kroki, środowisko,
zrzut, wynik konsoli/sieci oraz ocenę wpływu. Jeśli agent naprawia błąd,
przed zmianą zapisuje potwierdzoną przyczynę i argumentuje minimalny wybór
techniczny; potem powtarza scenariusz, uruchamia właściwy build/lint lub test
API i aktualizuje `docs/DZIENNIK_ZMIAN.md`. Screenshoty „przed” i „po” muszą
pozostać obok siebie w katalogu dowodów.
