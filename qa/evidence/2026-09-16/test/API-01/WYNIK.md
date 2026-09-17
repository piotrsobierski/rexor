# API-01 — Health i katalog publiczny

- Data i czas: 2026-09-16
- Środowisko: test (`https://rexor.sobierski.com/api`)
- Tryb: odczyt publicznych endpointów, bez danych uwierzytelniających

| Krok | Wynik | Dowód | Uwagi |
| --- | --- | --- | --- |
| 1. `GET /health` | PASS | Odpowiedź zanotowana poniżej | `status: ok`, `database: connected`. |
| 2. `GET /catalog` | PASS | Odpowiedź zanotowana poniżej | JSON zawiera 3 modele, 6 kategorii i 14 pozycji mediów. |
| 3. Zgodność z `/rowery` | PASS | `../PUB-02/01-all-bikes.png` | Modele E82, E55 i CFR707 są widoczne na stronie katalogu. |

## Bezpieczny skrót odpowiedzi

```text
health={"status":"ok","database":"connected"}
models=3; categories=6; media_items=14
model_names=Rexor E82, Rexor E55, Rexor CFR707
```

## Wniosek

Scenariusz zaliczony. Nie zapisywano pełnej odpowiedzi katalogu ani danych
potencjalnie wrażliwych; endpointy nie wymagały uwierzytelnienia.
