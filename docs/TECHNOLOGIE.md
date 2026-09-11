# Dostępne technologie i ograniczenia hostingu

Stan informacji: 11 września 2026 r.

Źródłem części potwierdzonej jest jednostronicowy zrzut panelu administracyjnego home.pl z 10 września 2026 r. Informacje przekazane opisowo przez właściciela projektu, których nie widać na zrzucie, zapisano osobno jako wymagające potwierdzenia.

## Potwierdzone w panelu

| Obszar | Dostępność / stan | Znaczenie dla projektu |
|---|---|---|
| Hosting | Hosting Biznes, Apache | Może obsłużyć statyczny frontend i backend PHP. |
| PHP | 8.5 | Naturalny wybór dla API działającego na tym hostingu. |
| MySQL | 8.0, 0 z 50 baz użytych | Rekomendowana baza dla pierwszej wersji. |
| PostgreSQL | 0 z 5 baz użytych | Dostępna alternatywa, ale MVP nie potrzebuje dwóch silników baz. |
| Domena | `rexorbikes.com` | Docelowy adres aplikacji. |
| Przestrzeń | 1 GB z 100 GB wykorzystane | Wspólna przestrzeń usługi; duży zapas na start. |
| Część WWW | 0 GB z 20 GB | Wskazany w panelu limit dla serwera WWW. |
| Pliki | 11 z 1 000 000 | Hosting jest praktycznie pusty. |
| SSL | nieaktywny | Musi zostać uruchomiony przed publikacją i logowaniem użytkowników. |
| HTTP/3 | nieaktywny | Nie blokuje MVP; można włączyć później. |
| FTP | port 21, brak utworzonych kont FTP | Dostępny kanał wdrożenia, ale preferowane jest SFTP/SSH, jeśli dostępne. |
| Poczta | 0 kont, 0,5 GB z 80 GB | Skrzynki nie są skonfigurowane; wysyłkę wiadomości trzeba osobno ustalić. |

Panel pokazuje łącznie 55 dostępnych baz: 50 MySQL i 5 PostgreSQL.

## Informacje przekazane, ale niepotwierdzone na zrzucie

- Apache 2.4,
- Python,
- Perl / CGI,
- CRON,
- SSH,
- autoinstalator CMS (m.in. WordPress, Joomla, Drupal),
- możliwość obsługi HTTP/3 / QUIC po aktywacji.

Przed zaplanowaniem procesu wdrożeniowego i zadań cyklicznych należy sprawdzić dostęp SSH, SFTP, CRON, limity czasu PHP, pamięci, rozmiaru uploadu oraz możliwość ustawienia katalogu publicznego domeny.

## Proponowany stack projektu

| Warstwa | Propozycja | Uzasadnienie |
|---|---|---|
| Frontend | React + TypeScript + Vite | Szybki interfejs konfiguratora, prosty build do statycznych plików. |
| UI | CSS Modules lub Tailwind CSS | Decyzja po przygotowaniu makiet i systemu wizualnego. |
| Formularze i walidacja | React Hook Form + Zod | Jednoznaczna walidacja konfiguracji i danych kontaktowych. |
| Backend | PHP 8.5 + Composer, API JSON | Bezpośrednia zgodność z hostingiem; brak potrzeby utrzymywania procesu Node.js. |
| Baza | MySQL 8.0, kodowanie `utf8mb4` | Wystarczająca i potwierdzona w panelu. |
| Dostęp do bazy | PDO + migracje | Zapytania parametryzowane i powtarzalne wdrożenia schematu. |
| Testy frontendu | Vitest + Testing Library | Testy logiki konfiguratora i komponentów. |
| Testy backendu | PHPUnit | Testy reguł zgodności, cen i endpointów. |
| Jakość kodu | ESLint, Prettier, PHP-CS-Fixer | Spójne formatowanie i szybsze wychwytywanie błędów. |

Node.js jest potrzebny lokalnie i w CI do budowania Reacta, ale nie musi działać na serwerze produkcyjnym.

## Decyzja robocza

Na start wybieramy MySQL zamiast PostgreSQL, ponieważ oba silniki spełnią potrzeby projektu, a MySQL jest najbardziej oczywistą ścieżką dla tego hostingu. Nie należy używać obu baz równocześnie.
