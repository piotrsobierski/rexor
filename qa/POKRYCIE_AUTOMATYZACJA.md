# Pokrycie wyników ręcznych skryptami Playwright/API

Status `POTWIERDZONE` oznacza ten sam wynik ponowiony skryptem. `DO DOROBIENIA`
oznacza, że istnieje wyłącznie historyczny wynik ręczny — nie wolno go ponownie
uznawać za automatycznie zweryfikowany.

| Scenariusz | Wynik ręczny | Skrypt | Stan automatyzacji |
| --- | --- | --- | --- |
| API-01/02 | PASS | `run-api-smoke.cjs` | POTWIERDZONE (200/200/401/422) |
| PUB-01/02 | PASS | `run-public-navigation.cjs` | POTWIERDZONE częściowo: menu; filtr wymaga dopisania asercji modeli |
| PUB-03 | PARTIAL | — | DO DOROBIENIA |
| PUB-04 | PASS | `run-public-pages.cjs` | DO PONOWNEGO URUCHOMIENIA |
| PUB-05/06 | PASS | — | DO DOROBIENIA |
| CFG-01–04 | PASS/PARTIAL | — | DO DOROBIENIA |
| CFG-05 | PASS lokalnie | — | DO DOROBIENIA po wdrożeniu |
| CFG-06 | PARTIAL | `run-configuration-save.cjs` | POTWIERDZONE: walidacja; zapis pełny wymaga osobnej asercji |
| CFG-07 | PARTIAL | — | DO DOROBIENIA |
| ADM-01 | PASS | `run-admin-session.cjs` | DO PONOWNEGO URUCHOMIENIA po poprawce |
| ADM-07 | PASS | — | DO DOROBIENIA |
| ADM-10 | PARTIAL | — | DO DOROBIENIA; rekord QA musi istnieć |

Kolejność pracy: najpierw skrypty oznaczone `DO DOROBIENIA` dla już wykonanych
scenariuszy, potem ich uruchomienie i aktualizacja tej tabeli z linkiem do
konkretnego katalogu dowodów. Skrypt bez uruchomienia nie zmienia statusu.
