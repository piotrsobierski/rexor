# Ceny i automatyczne dopłaty

## Reguła biznesowa

W panelu przechowujemy cenę sprzedaży brutto każdej części i opcji. Nie wpisujemy osobnego pola „dopłata +300 zł”, bo z czasem mogłoby przestać odpowiadać cenom części.

```text
dopłata = cena brutto wybranej opcji - cena brutto opcji domyślnej
cena konfiguracji = cena bazowa modelu + suma dopłat
```

Dla grupy opcjonalnej bez domyślnej pozycji ceną bazową jest 0 zł, więc wybrana usługa lub dodatek zwiększa cenę o całą swoją wartość.

Przykład: Shimano kosztuje w cenniku 1000 zł i jest domyślne, a Magura MT5 kosztuje 1300 zł. Po wyborze Magury konfigurator pokazuje `+300 zł`. Jeśli później administrator ustawi odpowiednio 1100 i 1450 zł, dopłata automatycznie wyniesie `+350 zł`.

Cena opcji może mieć nadpisanie dla konkretnego modelu. Kolejność źródeł jest następująca:

1. cena brutto ustawiona przy przypisaniu części do modelu,
2. ogólna cena brutto części,
3. brak ceny blokuje wysłanie wycenionej konfiguracji i wymaga indywidualnej wyceny.

„Dostarczam własną część” ma własną wartość rozliczeniową, standardowo 0 zł. Dla domyślnego widelca za 1000 zł daje to różnicę `0 - 1000 = -1000 zł`. Nie tworzymy produktu typu `shock-customer` i nie stosujemy globalnego rabatu.

Bateria także ma cenę brutto. Jeżeli model dostanie kilka baterii, różnica jest liczona względem baterii domyślnej tą samą metodą.

## Migawka

Po zapisaniu konfiguracji utrwalamy cenę bazową modelu, nazwę i cenę każdej wybranej części, obliczoną różnicę oraz cenę końcową. Aktualizacja cennika nie może zmienić starego podsumowania.

## Ceny robocze i źródła

Preseed zawiera komplet roboczych cen potrzebnych do działania algorytmu. Są to wartości demonstracyjne wyprowadzone z zamówień referencyjnych i orientacyjnych cen rynkowych, a nie zatwierdzona oferta Rexor.

Sprawdzone 11 września 2026 r. przykłady internetowe:

- Magura MT5, zestaw przód/tył w wariancie 1-finger HC: 616 zł brutto — [Bikecenter](https://bikecenter.pl/p138113%2Cmagura-mt5-1-finger-hc-hamulce-tarczowe-zestaw-przod-i-tyl-4-tloczki.html). W zamówieniu Rexor występuje klamka 2-palcowa, więc nie jest to identyczny wariant.
- Schwalbe Johnny Watts 29x2.60: 144,36 zł brutto za jedną oponę — [Ceneo](https://www.ceneo.pl/139397753). W konfiguratorze pozycja oznacza komplet dwóch opon.
- Bafang DPC 245 CAN z Bluetooth: 399 zł brutto — [Tosa Bikes](https://tosabikes.com/produkt/wyswietlacz-lcd-dp-c245-can/).
- Shimano CS-M5100 11-51T: 186,99 zł brutto — [Koloshop](https://www.koloshop.pl/shimano-deore-cs-m5100-11-11-rz-kaseta-11-51-zebow/82791).
- Shimano RD-M5100 SGS: 119 zł brutto — [MTBIKER](https://www.mtbiker.pl/shop/kolarstwo/komponenty/przerzutki-tylne/mtb-10-11-12-rzedowe/shimano-deore-rd-m5100-sgs-przerzutka-11-rzedow-p109395.html).

Ostatnie dwa źródła dotyczą pojedynczych podzespołów. Pozycja „grupa Deore M5100” w seedzie obejmuje również manetkę i łańcuch, dlatego nie kopiujemy sumy dwóch cen jako ceny całej grupy.

Przed uruchomieniem publicznym trzeba zatwierdzić dla każdej pozycji cenę Rexor, dokładny wariant/SKU, liczbę sztuk i datę obowiązywania.
