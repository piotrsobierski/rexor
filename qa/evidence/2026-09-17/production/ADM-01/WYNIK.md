# ADM-01 — próba kontrolowanego logowania

- Środowisko: produkcja — `https://rexorbikes.com/admin`
- Data: 2026-09-17
- Wynik: **PARTIAL / BLOCKED**

## Kroki i wynik

1. Otworzono formularz administratora.
2. Pozostawiono adres podpowiedziany przez aplikację: `admin@rexor.local`.
3. Wprowadzono przekazane przez właściciela hasło i wybrano „Zaloguj”.
4. Serwer odpowiedział `401`, a formularz poprawnie pokazał komunikat
   „Nieprawidłowy e-mail lub hasło.” Nie pojawiły się dane panelu ani błędy
   konsoli.

Zrzut: `01-login-result.png`.

Nie próbowano innych adresów e-mail. Aby kontynuować scenariusze administratora,
potrzebny jest dokładny adres przypisany do tego hasła.
