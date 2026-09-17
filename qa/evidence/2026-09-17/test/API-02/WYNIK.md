# API-02 — Autoryzacja i walidacja API

- Data i czas: 2026-09-17
- Środowisko: test (`https://rexor.sobierski.com/api`)
- Tryb: żądania bez danych osobowych i bez tokenu administratora

| Krok | Wynik | Odpowiedź | Uzasadnienie |
| --- | --- | --- | --- |
| 1. `GET /admin/catalog` bez tokenu | PASS | 401, „Brak autoryzacji.” | Dane panelu nie są publiczne. |
| 2. `GET /admin/catalog` z błędnym tokenem | PASS | 401, „Sesja wygasła lub jest nieprawidłowa.” | Serwer nie akceptuje dowolnego nagłówka Bearer. |
| 3. `POST /configurations` z niepełnym payloadem | PASS | 422, „Podaj imię i nazwisko.” | Walidacja zatrzymuje zapis przed utworzeniem konfiguracji. |

## Wniosek

Scenariusz zaliczony. Żądanie zapisu miało celowo niepoprawny model i brak
danych wymaganych; serwer przerwał je na walidacji bez tworzenia konfiguracji.
