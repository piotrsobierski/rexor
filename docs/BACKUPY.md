# Backup bazy i mediów

Skrypt `scripts/backup.sh` przygotowuje jeden spójnie oznaczony zestaw:

- skompresowany zrzut MySQL z procedurami, triggerami i zdarzeniami,
- archiwum przesłanych mediów,
- plik `SHA256SUMS` do kontroli integralności.

Domyślnie działa jako bezpieczny podgląd:

```bash
scripts/backup.sh
scripts/backup.sh --apply
```

Hasło MySQL trafia do tymczasowego pliku z uprawnieniami 600, a nie do argumentów procesu. Skrypt niczego sam nie usuwa. `BACKUP_RETENTION_DAYS` dokumentuje przyszłą politykę, ale automatyczne kasowanie będzie dodane dopiero po wskazaniu zewnętrznego miejsca docelowego.

## Przed produkcją

1. Ustalić miejsce kopii poza tym samym hostingiem.
2. Ustalić częstotliwość i retencję; robocza propozycja to codziennie i 30 dni.
3. Podłączyć wywołanie przez CRON.
4. Szyfrować kopię przed wysłaniem poza serwer.
5. Wykonać próbne odtworzenie bazy i mediów na osobnym środowisku.
6. Monitorować wynik i alarmować przy braku świeżej kopii.

Mechanizm jest przygotowany, ale zgodnie z decyzją projektową nie jest obecnie podłączony do CRON ani zewnętrznego storage.
