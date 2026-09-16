# Ceny, składniki i dopłaty

## Reguła biznesowa

Cena roweru jest sumą składników. Nie istnieje pole z ceną końcową ani z ceną bazową, którą ktoś wpisuje ręcznie.

```text
cena = rama (+ dopłata rozmiaru)
     + bateria
     + suma cen wybranych części we wszystkich grupach modelu
     + cena składania modelu
     + narzut modelu (domyślnie 0%, bo ceny części są już cenami sprzedaży)
     + dopłaty modelu (model_price_adjustments)
     + dopłata za kolor lakieru (paint_palettes / paint_colors)
```

Dopłata za kolor stoi po narzucie świadomie: jest ceną sprzedaży ustaloną
w palecie, a nie kosztem składnika, więc nie ma jej po co mnożyć przez marżę.

Każdy składnik ma własne pole w panelu: `bike_models.frame_price_gross`, `bike_models.assembly_price_gross`, `bike_models.margin_percent`, `model_sizes.price_delta_gross`, `model_batteries.gross_price` oraz cena części w katalogu. Cena „od” modelu (`bike_models.computed_base_price_gross`) to wynik tej samej formuły dla wszystkich wyborów domyślnych. Zapisuje ją wyłącznie serwer po każdej zmianie, która może ruszyć sumę; panel nie ma do niej pola edycji.

Wcześniej cena bazowa była wpisywana ręcznie, a dopłaty liczone jako różnica wobec pozycji domyślnej. Dopłaty były poprawne, ale punkt startowy nie: dla E82 cena bazowa wynosiła 15 000 zł przy składnikach na 19 280 zł. Taka rozbieżność rośnie przy każdej zmianie cennika części i nie jest nigdzie widoczna.

## Dopłaty w konfiguratorze

Dopłata nadal jest pokazywana, ale jest tylko sposobem prezentacji:

```text
dopłata pokazana przy opcji = cena opcji - cena opcji domyślnej w tej grupie
```

Przykład: Shimano kosztuje 1000 zł i jest domyślne, Magura MT5 kosztuje 1300 zł, więc przy Magurze widać `+300 zł`. Po zmianie cen na 1100 i 1450 zł dopłata sama zmieni się na `+350 zł`. W sumie końcowej liczy się cena wybranej pozycji, nie różnica, więc suma nie może rozjechać się z cennikiem.

Cena opcji może mieć nadpisanie dla konkretnego modelu. Kolejność źródeł:

1. cena brutto ustawiona przy przypisaniu części do modelu (`model_parts.gross_price_override`),
2. ogólna cena brutto części (`parts.gross_price`),
3. część oznaczona jako `quote` albo bez ceny blokuje wycenę i wymusza kontakt.

„Dostarczam własną część” jest trybem grupy, nie produktem w katalogu. Ma własną wartość rozliczeniową, standardowo 0 zł, i wchodzi do sumy tą wartością. W modelu sumacyjnym nie potrzebujemy ujemnej dopłaty ani sztucznego SKU.

## Jedna grupa to jedna pozycja w cenie

Grupa części odpowiada jednemu wyborowi i wnosi do ceny jedną pozycję. Dlatego nie może być workiem na kilka różnych komponentów: grupa `cockpit` trzymała siodło, sztycę, kierownicę, gripy, mostek i pedały, a wszystkie sześć było oznaczone jako domyślne. Przy cenie liczonej jako różnica wobec pozycji domyślnej było to niewidoczne, bo każda dopłata wynosiła 0 zł. Przy sumie składników rower gubił około 1380 zł osprzętu. Migracja 004 rozdzieliła te grupy, a także piasty i komplet kół.

## Elementy stałe i rama

Grupa w trybie `fixed` (np. silnik, ładowarka) nie jest pokazywana klientowi jako wybór, ale cena jej pozycji domyślnej wchodzi do sumy. Dzięki temu cena roweru zawiera cały osprzęt, a nie tylko to, co klient może zmienić.

Rama nie jest częścią z katalogu: jest modelem. Jej cena to pole modelu, a różnice między rozmiarami to `model_sizes.price_delta_gross`. Grupa części `frame` została usunięta, bo dublowała model i rozmiar — w seedzie istniała rama „E55 rozmiar 19”, której nie było w tabeli rozmiarów.

## Zgodność części z modelem

Dostępność części rozstrzyga wyłącznie `model_parts`, bo zgodność wynika z ramy i silnika, a nie z kategorii marketingowej. Tabela `category_parts` została usunięta; w seedzie przypisywała wszystkie części do MTB i nie była używana ani w wycenie, ani w konfiguratorze.

Żeby definiowanie per model nie było żmudne:

- część opisuje swoje wymiary w `parts.fit_attributes` (np. `shock_size`, `axle_rear`, `motor_bus`, `charge_voltage_v`),
- model opisuje swoje wymagania w `bike_models.fit_requirements`,
- panel pokazuje w grupie tylko pasujące kandydatury; niezgodne są ukryte za przełącznikiem, a części bez zadeklarowanego atrybutu mają etykietę „do potwierdzenia” i nie są blokowane,
- nowy model może skopiować cały osprzęt z istniejącego.

Zasada jest zachowawcza: konflikt powstaje tylko wtedy, gdy część i model deklarują ten sam atrybut o różnych wartościach. Dzięki temu nie utrzymujemy tabeli par część-część, która rośnie kwadratowo i wymaga wpisu przy każdej nowej pozycji.

## Migawka

Po zapisaniu konfiguracji utrwalamy nazwę i cenę każdej wybranej pozycji, rozbicie ceny na ramę, baterię, części, składanie i narzut, cenę „od” modelu z chwili zamówienia oraz cenę końcową. Aktualizacja cennika nie może zmienić starego podsumowania.

## Ceny robocze i źródła

Preseed zawiera komplet roboczych cen potrzebnych do działania algorytmu. Są to wartości demonstracyjne wyprowadzone z zamówień referencyjnych i orientacyjnych cen rynkowych, a nie zatwierdzona oferta Rexor.

Po przejściu na sumę składników ceny „od” wzrosły względem wcześniejszych wartości wpisanych ręcznie: E82 z 15 000 zł na 21 179 zł, E55 z 16 500 zł na 22 329 zł, przy roboczej cenie składania 1500 zł i narzucie 0%. Nowe kwoty wynikają wyłącznie z cen części w seedzie i wymagają zatwierdzenia razem z nimi.

Sprawdzone 11 września 2026 r. przykłady internetowe:

- Magura MT5, zestaw przód/tył w wariancie 1-finger HC: 616 zł brutto — [Bikecenter](https://bikecenter.pl/p138113%2Cmagura-mt5-1-finger-hc-hamulce-tarczowe-zestaw-przod-i-tyl-4-tloczki.html). W zamówieniu Rexor występuje klamka 2-palcowa, więc nie jest to identyczny wariant.
- Schwalbe Johnny Watts 29x2.60: 144,36 zł brutto za jedną oponę — [Ceneo](https://www.ceneo.pl/139397753). W konfiguratorze pozycja oznacza komplet dwóch opon.
- Bafang DPC 245 CAN z Bluetooth: 399 zł brutto — [Tosa Bikes](https://tosabikes.com/produkt/wyswietlacz-lcd-dp-c245-can/).
- Shimano CS-M5100 11-51T: 186,99 zł brutto — [Koloshop](https://www.koloshop.pl/shimano-deore-cs-m5100-11-11-rz-kaseta-11-51-zebow/82791).
- Shimano RD-M5100 SGS: 119 zł brutto — [MTBIKER](https://www.mtbiker.pl/shop/kolarstwo/komponenty/przerzutki-tylne/mtb-10-11-12-rzedowe/shimano-deore-rd-m5100-sgs-przerzutka-11-rzedow-p109395.html).

Ostatnie dwa źródła dotyczą pojedynczych podzespołów. Pozycja „grupa Deore M5100” w seedzie obejmuje również manetkę i łańcuch, dlatego nie kopiujemy sumy dwóch cen jako ceny całej grupy.

Przed uruchomieniem publicznym trzeba zatwierdzić dla każdej pozycji cenę Rexor, dokładny wariant/SKU, liczbę sztuk i datę obowiązywania, a także cenę ramy i cenę składania każdego modelu.


## Lakier: dwie osie, nie jedna

Lakierowanie ma dwa niezależne składniki i konfigurator ich nie miesza:

```text
cena malowania = opcja procesu (część z grupy `paint`) + dopłata koloru (paleta)
```

* **proces** to robocizna — „lakierowanie standardowe” albo „jednokolorowe”.
  Zwykła część w cenniku, rozliczana jak każda inna, z narzutem włącznie.
* **kolor** to dostęp do lakieru. Doliczany po narzucie, dziś wyzerowany:
  „lakierowanie standardowe” obejmuje kolor producenta, a „jednokolorowe”
  (+800 zł) dowolny kolor z palet Porsche PTS i Volkswagen. Oś zostaje na
  wypadek pojedynczych lakierów droższych od reszty palety (migracja `030`).

Kolejność źródeł ceny koloru:

1. `paint_colors.price_gross_override` — jeden lakier drożej niż reszta palety,
2. `model_paint_palettes.price_gross_override` (albo `frame_paint_palettes`) —
   inna cena tej palety dla jednego produktu,
3. `paint_palettes.price_gross` — cena palety.

`paint_palettes.requires_part_sku` pilnuje, żeby kolor z palety płatnej nie
stanął obok lakierowania standardowego. Konfigurator podnosi opcję procesu sam,
API sprawdza regułę jeszcze raz przy zapisie.

Szczegóły i uzasadnienie: `docs/PLAN_LAKIERY.md`.
