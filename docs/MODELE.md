# Modele, geometria i baterie

Stan badań: 11 września 2026 r. W materiałach przekazanych jako pochodzące od Szymona występują trzy modele/ramy:

1. **DengFu E82** - kategoria MTB, elektryczny enduro.
2. **DengFu E55** - kategoria MTB, elektryczny all-mountain.
3. **Carbonda CFR707** - kategoria Gravel.

Nie znaleziono nazwy czwartego modelu. Kategorie Szosa, Miejski i turystyczny oraz Rower elektryczny pozostają na razie bez modeli.

## Rexor E82 / DengFu E82

Producent opisuje E82 jako karbonową ramę e-MTB z włókien Toray T700/T800, tylną osią 148x12, hakiem UDH, skokiem ramy 170 mm, damperem 230x60, oponami do 29x2.6 lub 27.5x2.8 i baterią 48 V / 21 Ah opisywaną handlowo jako 1008 Wh. W specyfikacji wymienia silniki Bafang M510 48 V 250 W i M560 750 W oraz wyświetlacze DPC245 lub zintegrowany DPC030. Selekcja na tej samej stronie pokazuje dodatkowo M500 250 W, co jest niespójne z opisem technicznym. Źródło: [DengFu E82](https://www.dengfubike.com/products/e82-frame-motor-battery-kit).

W Rexor obowiązuje wyłącznie stały silnik **M560 750 W**. M500 i M510 nie są importowane do katalogu ani udostępniane jako wariant. Silnik nie jest opcją klienta; wybierany jest wyświetlacz.

### Geometria E82

Wymiary w milimetrach, kąty w stopniach. Oznaczenia zostały odczytane z diagramu producenta.

| Rozmiar | Górna rura | Reach | Stack | Rura podsiodłowa | Chainstay | Kąt główki | Kąt rury podsiodłowej | BB drop | BB height | Baza kół | Główka | Widelec |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| S | 563 | 435 | 606 | 400 | 455 | 64° | 77° | 12 | 360 | 1224 | 110 | 590 |
| M / 17" | 595 | 450 | 624 | 440 | 455 | 64° | 77° | 12 | 360 | 1253 | 120 | 590 |
| L / 19" | 618 | 485 | 624 | 480 | 455 | 64° | 77° | 12 | 360 | 1282 | 130 | 590 |
| XL / 21" | 648 | 510 | 638 | 520 | 455 | 64° | 77° | 12 | 360 | 1314 | 135 | 590 |

Tabela geometrii zawiera S, natomiast aktualny selektor zakupu pokazuje M/17", L/19" i XL/21". Nie publikujemy S, dopóki dostępność nie zostanie potwierdzona.

### Przykładowa bateria E82

- ogniwo: Samsung SDI INR18650-35E, format 18650,
- układ roboczy: 13S6P, 78 ogniw,
- pojemność przy 3,5 Ah/ogniwo: 21 Ah,
- napięcie nominalne: 46,8 V; ładowanie: 54,6 V,
- energia nominalna obliczona z napięcia i Ah: ok. 982,8 Wh,
- producent ramy opisuje swój pakiet jako 48 V / 21 Ah / 1008 Wh.

Układ 13S6P jest założeniem projektowym wynikającym z 54,6 V i 21 Ah, nie potwierdzoną konstrukcją pakietu DengFu. Karta Samsung podaje 3,6 V nominalnie i co najmniej 3350 mAh: [Samsung INR18650-35E](https://docs.telitpower.com/pdf/li-ion/INR18650-35E.pdf).

## Rexor E55 / DengFu E55

Producent opisuje E55 jako karbonową ramę e-MTB T700/T800, 150 mm skoku, 148x12, wewnętrzne prowadzenie przewodów, opony do 29x2.6 lub 27.5x2.8 i stały silnik **Bafang M620 52 V 1000 W**, UART albo CAN. Standardowy pakiet jest opisany jako 52 V / 20 Ah / 1040 Wh. Źródło: [DengFu E55](https://www.dengfubike.com/products/e55-frame).

W Rexor obowiązuje wyłącznie wersja z łącznikiem 70 mm i damperem **210x55**. [Alternatywna karta DengFu E55](https://www.dengfubike.com/products/dengfu-winice-e55-frame) potwierdza taki wariant. Aktualna karta zestawu podaje również 230x60, ale tej wersji nie importujemy jako opcji modelu.

### Geometria E55

| Rozmiar | Górna rura | Reach | Stack | Rura podsiodłowa | Chainstay | Kąt główki | Kąt rury podsiodłowej | BB drop | Baza kół | Główka | Offset widelca |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| M / 17" | 609 | 459 | 573 | 440 | 478 | 64° | 77° | -20 | 1283 | 125 | 51 |
| L / 19" | 632 | 481 | 573 | 480 | 478 | 64° | 77° | -20 | 1307 | 130 | 51 |

Producent podaje także kierownicę 800 mm i mostek 45 mm w tabeli geometrii.

### Przykładowa bateria E55

- ogniwo: FEB 21700 o pojemności 6,5 Ah; dokładny kod handlowy wymaga potwierdzenia,
- układ: 14S4P, 56 ogniw,
- pojemność: 26 Ah,
- napięcie nominalne przy 3,6 V/ogniwo: 50,4 V; ładowanie: 58,8 V,
- energia nominalna: ok. 1310,4 Wh,
- BMS Bluetooth: 60 A ciągłego według danych zamówienia.

To bateria niestandardowa wobec pakietu DengFu 52 V / 20 Ah / 1040 Wh. FEB potwierdza istnienie ogniwa 21700 6500 mAh, ale dokładny kod ogniwa używanego przez Rexor nadal trzeba sprawdzić: [Far East Battery](https://en.febbattery.com/news/92.html).

## Rexor CFR707 / Carbonda CFR707

CFR707 jest karbonową ramą gravel/adventure/travel z mieszanki T700/T800. Producent podaje masę ramy M 1300 ±50 g i widelca 590 ±15 g, suport BSA 68 mm, Flat Mount, stery 1-1/2" ACR, osie 12x100 i 12x142, sztycę 27,2 mm, UDH, zintegrowane prowadzenie przewodów oraz kompatybilność z bagażnikiem i błotnikami. Maksymalna opona to 700x50 mm lub 650B x 2.1. Źródło: [Carbonda CFR707](https://carbonda.com/road/cfr-707.html).

### Geometria CFR707

| Rozmiar | Rura podsiodłowa | Kąt podsiodłowy | Górna rura | Główka | Kąt główki | Widelec | Offset | Baza kół | Front center | Chainstay | BB drop | Reach | Stack |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| XS | 450 | 74,5° | 525,3 | 120 | 70° | 400 | 50 | 1029,5 | 604,2 | 435 | 70 | 375 | 542 |
| S | 470 | 73,5° | 545,3 | 135 | 70,3° | 400 | 50 | 1037,2 | 611,8 | 435 | 70 | 380 | 558 |
| M | 490 | 73,5° | 560 | 150 | 70,5° | 400 | 50 | 1050,7 | 625,3 | 435 | 70 | 390,4 | 572,7 |
| L | 510 | 73,5° | 576,5 | 170 | 72° | 400 | 50 | 1052,8 | 627,4 | 435 | 70 | 400 | 596 |
| XL | 530 | 73,5° | 595,4 | 190 | 72,5° | 400 | 50 | 1066,7 | 641,3 | 435 | 70 | 412 | 619 |
| XXL | 560 | 73,5° | 615 | 210 | 72,5° | 400 | 50 | 1086,8 | 661,2 | 435 | 70 | 426 | 638 |

Źródło tabeli: [oficjalny PDF geometrii Carbonda CFR707](https://carbonda.com/upload/download/CFR-707/CFR-707-Geometry.pdf).

CFR707 nie ma silnika ani baterii. Cena bazowa i katalog części gravel pozostają do przygotowania.
