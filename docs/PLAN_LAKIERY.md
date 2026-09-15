# Lakiery: palety, kolory i renderowanie

Ustalone 15 września 2026 r. Ten dokument odpowiada na pytanie **dlaczego**;
opis bytów, cennika i powiązań jest w `docs/ARCHITEKTURA_LAKIEROW.md`.

Dokument jest źródłem decyzji dla migracji
`028_paint_colors.sql`, `apps/api/src/PaintService.php` i sekcji „Lakierowanie”
w konfiguratorze.

## Skąd wzięły się dane

Materiał pochodzi z osobnego projektu `e55-paint-to-sample` — konfiguratora
koloru ramy E55, w którym paleta i wizualizacje już powstały:

| zasób | ilość | co to jest |
|---|---|---|
| `palette.js` | 636 lakierów Porsche + 44 Volkswagena | nazwa, kod, hex, synonimy niemieckie do wyszukiwarki |
| rendery ramy | 228 standardowych + 229 „ultra” | rama E55 w danym kolorze, policzona modelami obrazowymi |
| zdjęcia referencyjne | 664 | zdjęcie prawdziwego auta w tym lakierze (galeria Rennbow) |

Import robi `apps/api/scripts/import-paints.php`. Jest idempotentny i domyślnie
działa w trybie podglądu.

Wartości HEX są **przybliżeniem do podglądu na ekranie**, nie pomiarem.
Producenci nie publikują sRGB swoich lakierów, a kolory efektowe z definicji
zmieniają barwę z kątem patrzenia i nie da się ich opisać jedną wartością.
To samo dotyczy renderów: to wizualizacje, nie zdjęcia produktu.

## Decyzja 1 — kolor jest osobnym bytem, mapowanym paletą

Kolor nie jest kolumną w `bike_models` ani w `frames`, bo ta sama paleta ma być
dostępna dla wielu modeli i ram naraz. Nie jest też częścią w `parts`, bo nie
jest komponentem roweru — nie ma SKU, dostawcy ani zgodności technicznej.

Mapowanie idzie na poziomie **palety**, nie pojedynczego koloru: przypisanie
Porsche do modelu po jednym kolorze oznaczałoby 636 wierszy na model.

```
paint_palettes ──< paint_colors ──< paint_renders
      │                                   │
      ├──< model_paint_palettes           └── (kolor × produkt)
      └──< frame_paint_palettes
```

## Decyzja 2 — dwie osie ceny, celowo rozdzielone

* grupa części `paint` wycenia **proces**: czy rama idzie do lakierni. Zostaje
  w zwykłym cenniku części, bez zmian.
* paleta/kolor wycenia **dostęp do lakieru**: kolory Rexor w cenie, Porsche
  Paint to Sample i Volkswagen z dopłatą.

```text
cena malowania = opcja procesu (część z grupy paint) + dopłata koloru (paleta)
```

Dopłata za kolor jest ceną sprzedaży, nie kosztem składnika, więc **nie
przechodzi przez narzut modelu** — doliczana jest na końcu, tak samo jak
`model_price_adjustments`. Kolejność źródeł ceny koloru:

1. `paint_colors.price_gross_override` (jeden lakier drożej niż reszta palety),
2. `model_paint_palettes.price_gross_override` / `frame_paint_palettes.…`,
3. `paint_palettes.price_gross`.

## Decyzja 3 — kolor płatny wymusza opcję procesu

Bez reguły dałoby się zestawić „lakierowanie standardowe” z lakierem Paint to
Sample. `paint_palettes.requires_part_sku` wskazuje minimalną opcję z grupy
`paint`, jakiej wymaga kolor z tej palety.

Wybór jest przyjmowany, gdy wskazana opcja jest wybrana **albo** wybrana jest
dowolna inna opcja niedomyślna — czyli coś szerszego niż lakierowanie
standardowe. Dzięki temu dołożenie w panelu droższej opcji lakierowania nie
wymaga dopisywania nowej reguły.

Konfigurator podnosi opcję sam, żeby klient nie musiał zgadywać. API sprawdza
to jeszcze raz przy zapisie — wycena nie może zależeć od stanu przeglądarki.

## Decyzja 4 — jeden kolor w konfiguratorze

Konfigurator prowadzi do **jednego** koloru. Malowanie dwukolorowe, przejścia
i wzory nie są wyborem z listy: pod sekcją stoi notka kierująca do uwag przy
zapisie projektu, a zakres i cenę ustala obsługa.

Dlatego migracja ustawia `is_customer_configurable = FALSE` dla
`paint-custom-two-color`. Część zostaje w cenniku i w panelu — znika wyłącznie
z listy wyborów klienta, więc przywrócenie jej to jedno pole w panelu.

## Decyzja 5 — dwa rodzaje zdjęć, różna kardynalność

To jest rozróżnienie, które przesądza o schemacie:

* **zdjęcie referencyjne** (auto w tym lakierze) zależy wyłącznie od koloru —
  jedno na kolor, wspólne dla wszystkich produktów. Siedzi w `paint_colors`.
* **render** zależy od pary **kolor × produkt** — obraz ramy E55 nie pokaże
  tego lakieru na E82. Siedzi w `paint_renders` z `model_id` albo `frame_id`.

Rendery trzymamy jako ścieżki plików, nie wiersze w `media`: to setki obrazów
generowanych maszynowo, bez tekstu alternatywnego, podpisu i kolejności
w galerii. Wiersz w `media` nie wnosiłby nic poza kosztem, a wciągałby je
w logikę sprzątania sierot.

## Decyzja 6 — zdjęcia referencyjne są domyślnie niepubliczne

Zdjęcia z galerii Rennbow to cudze materiały. Na demo to jedno, na stronie
sprzedażowej to ryzyko praw autorskich. Dlatego:

* pliki leżą w `storage/paint-reference/`, **poza** katalogiem publicznym;
* serwuje je wyłącznie `GET /api/admin/paint-reference/…` po zalogowaniu;
* `paint_colors.reference_is_public` jest domyślnie `FALSE`, a publiczna
  odpowiedź `/api/paints/…` nie niesie wtedy nawet ścieżki;
* publikację włącza administrator świadomie, per kolor.

Do czasu potwierdzenia praw służą jako referencja w panelu i wejście dla
generatora renderów.

## Co pokazujemy klientowi

* siatka próbek z wyszukiwarką po nazwie, kodzie, hexie i synonimach —
  przy 680 lakierach to główny sposób nawigacji, nie dodatek;
* kropka na próbce = ten lakier ma policzony render (konwencja z projektu e55);
* podgląd: render ramy, jeśli istnieje; inaczej duża płaska próbka i jawna
  informacja, że wizualizacji jeszcze nie ma — nie udajemy, że wiemy;
* podpis „wizualizacja poglądowa, rzeczywisty odcień może się różnić”;
* wybrany render wchodzi jako pierwszy slajd galerii modelu, więc zdjęcia
  fabryczne zostają o jedno kliknięcie dalej.

## Co zostało poza zakresem

Generowanie nowych renderów on-demand. Panel przyjmuje upload renderu dla pary
kolor × produkt, więc administrator uzupełnia braki bez programisty. Gdyby
wrócić do generowania modelami obrazowymi, powinno to być narzędzie
**wewnętrzne w panelu** — wtedy nie ma problemu z kosztem, limitami na IP
i czekaniem klienta przy kilkunastu sekundach ciszy.
