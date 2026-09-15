#!/usr/bin/env python3
"""Domyślna favicona: pierwsza litera "R" wycięta z logo Rexor.

Pełny napis REXOR jest w faviconie nieczytelny (1665x334 px zgniecione do
16 px to pasek kresek), więc bierzemy sam pierwszy glif. Na czarnym kaflu
z białym znakiem, bo oryginał jest czarny na przezroczystym tle i ginąłby
na ciemnym pasku kart przeglądarki.

Uruchamiane ręcznie po podmianie logo:
    python3 apps/web/scripts/build-favicon.py
"""

from pathlib import Path

from PIL import Image, ImageDraw

WEB = Path(__file__).resolve().parent.parent
LOGO = WEB / 'public' / 'brand' / 'rexor-logo.png'
PUBLIC = WEB / 'public'

TILE = 512
PADDING = 0.19  # udział marginesu w krawędzi kafla
RADIUS = 0.22   # promień zaokrąglenia jako udział krawędzi
BACKGROUND = (10, 10, 10, 255)
FOREGROUND = (255, 255, 255, 255)


def glyph_bounds(image: Image.Image) -> tuple[int, int, int, int]:
    """Bounding box pierwszego glifu - kolumny do pierwszej przerwy w tuszu."""
    alpha = image.getchannel('A')
    width, height = image.size
    columns = [any(alpha.getpixel((x, y)) > 40 for y in range(height)) for x in range(width)]
    left = columns.index(True)
    right = left
    while right + 1 < width and columns[right + 1]:
        right += 1
    rows = [y for y in range(height) if any(alpha.getpixel((x, y)) > 40 for x in range(left, right + 1))]
    return left, rows[0], right + 1, rows[-1] + 1


def build_tile() -> Image.Image:
    logo = Image.open(LOGO).convert('RGBA')
    glyph = logo.crop(glyph_bounds(logo)).getchannel('A')

    inner = int(TILE * (1 - 2 * PADDING))
    scale = min(inner / glyph.width, inner / glyph.height)
    glyph = glyph.resize((round(glyph.width * scale), round(glyph.height * scale)), Image.LANCZOS)

    tile = Image.new('RGBA', (TILE, TILE), (0, 0, 0, 0))
    ImageDraw.Draw(tile).rounded_rectangle(
        (0, 0, TILE - 1, TILE - 1), radius=round(TILE * RADIUS), fill=BACKGROUND
    )
    mark = Image.new('RGBA', (TILE, TILE), (0, 0, 0, 0))
    mark.paste(FOREGROUND, ((TILE - glyph.width) // 2, (TILE - glyph.height) // 2), glyph)
    return Image.alpha_composite(tile, mark)


def main() -> None:
    tile = build_tile()
    tile.save(PUBLIC / 'icon.png')
    # Apple nie zaokrągla samo tylko wtedy, gdy ikona ma własne tło - stąd ten
    # sam kafel, bez przezroczystych rogów.
    apple = Image.new('RGBA', (TILE, TILE), BACKGROUND)
    apple.alpha_composite(tile)
    apple.resize((180, 180), Image.LANCZOS).save(PUBLIC / 'apple-icon.png')
    tile.save(PUBLIC / 'favicon.ico', sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
    print(f'Zapisano {PUBLIC}/icon.png, apple-icon.png, favicon.ico')


if __name__ == '__main__':
    main()
