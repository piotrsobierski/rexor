# Ramy i Realizacje — ustalony zakres i kontrakt

Ustalone 15 września 2026 r. na podstawie maila klienta z 13 września.
Ten dokument jest źródłem prawdy dla trzech równoległych wątków prac
(backend, front publiczny, panel admina). Nazwy pól są wiążące.

## Decyzje właściciela projektu

1. Ramy trafiają do **wspólnych** kategorii rowerowych (`bike_categories`),
   nie do własnego słownika. Filtr na `/ramy` i `/rowery` ma być ten sam.
   Do słownika dochodzi kategoria `inne` ("INNE").
2. Rama ma **własną, definiowalną cenę** (`price_gross`). `NULL` znaczy
   „wymaga wyceny”.
3. Rama ma formularz zapytania — odpowiednik tego z konfiguratora, ale dla
   samej ramy.
4. **Nie** dokładamy `bike_models.frame_id`. Rama i model pozostają
   niepowiązane; ewentualną duplikację danych właściciel akceptuje.
5. Geometria ramy: **wklejana grafika** (rola media `geometry`) albo tekst
   sformatowany ręcznie w edytorze. Nie budujemy strukturalnego edytora
   tabel geometrii.
6. Realizacje: osobny byt z redagowaną stroną (WYSIWYG + zdjęcia) i spisem
   komponentów. Zdjęcia mają być prawdziwe, nie rendery.
7. **Czatbot AI musi dostać ramy i realizacje do kontekstu promptu**, tak jak
   dziś dostaje kategorie, modele i stronę serwisu.

Zrobione wcześniej, poza zakresem tych prac: logo, zdjęcia kategorii,
skrócenie/usunięcie napisu w hero, SMTP i szablon maila potwierdzającego.

## Schemat bazy (migracja `025_frames_and_projects.sql`)

```sql
CREATE TABLE frames (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    category_id BIGINT UNSIGNED NOT NULL,   -- FK bike_categories(id), ON DELETE RESTRICT
    slug VARCHAR(120) NOT NULL UNIQUE,
    name VARCHAR(160) NOT NULL,
    manufacturer VARCHAR(160) NULL,
    short_description VARCHAR(500) NULL,
    description_html MEDIUMTEXT NULL,
    description_document JSON NULL,
    geometry_html MEDIUMTEXT NULL,
    specifications JSON NULL,               -- { "facts": ["...", "..."] }
    price_gross DECIMAL(12,2) NULL,         -- NULL = wymaga wyceny
    currency CHAR(3) NOT NULL DEFAULT 'PLN',
    paint_available BOOLEAN NOT NULL DEFAULT TRUE,
    is_recommended BOOLEAN NOT NULL DEFAULT FALSE,
    source_url VARCHAR(500) NULL,
    default_image_path VARCHAR(500) NULL,
    status ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
    sort_order INT NOT NULL DEFAULT 0,
    created_at, updated_at
);

CREATE TABLE frame_media (
    frame_id, media_id,
    role ENUM('default','gallery','description','geometry') NOT NULL DEFAULT 'gallery',
    sort_order INT NOT NULL DEFAULT 0,
    PRIMARY KEY (frame_id, media_id)        -- FK jak w model_media, ON DELETE CASCADE
);

CREATE TABLE projects (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(120) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    short_description VARCHAR(500) NULL,
    content_html MEDIUMTEXT NULL,
    content_document JSON NULL,
    specification JSON NULL,                -- [{"label":"silnik","value":"M620 CAN"}, ...]
    category_id BIGINT UNSIGNED NULL,       -- FK bike_categories(id), ON DELETE SET NULL
    completed_at DATE NULL,
    cover_image_path VARCHAR(500) NULL,
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at, updated_at
);

CREATE TABLE project_media (
    project_id, media_id,
    role ENUM('cover','gallery','description') NOT NULL DEFAULT 'gallery',
    sort_order INT NOT NULL DEFAULT 0,
    PRIMARY KEY (project_id, media_id)
);

INSERT INTO bike_categories (slug, name, short_description, sort_order, is_published)
VALUES ('inne', 'Inne', '...', 90, TRUE);
```

## Kontrakt API

Typy TypeScript są już w repozytorium i są wiążące:
`apps/web/lib/frames.ts` (`ApiFrame`, `PublicFrame`, `FrameMediaRole`),
`apps/web/lib/projects.ts` (`ApiProject`, `PublicProject`, `ProjectMediaRole`).

Publiczne (bez autoryzacji, zwracają wyłącznie `status='published'` /
`is_published=TRUE`, posortowane po `sort_order`, potem `name`/`title`):

| Metoda | Ścieżka | Odpowiedź |
| --- | --- | --- |
| GET | `/frames` | `{ frames: ApiFrame[] }` |
| GET | `/frames/{slug}` | `{ frame: ApiFrame }` albo 404 |
| GET | `/projects` | `{ projects: ApiProject[] }` |
| GET | `/projects/{slug}` | `{ project: ApiProject }` albo 404 |

Admin (`requireAdmin($pdo)`), wzorowane na istniejących trasach modeli:

```
POST   /admin/frames                      -> 201, nowa rama
PATCH  /admin/frames/{id}                 -> updateAdminRecord($pdo,'frames',...)
DELETE /admin/frames/{id}
DELETE /admin/frames/{id}/media/{mediaId}
PATCH  /admin/frames/{id}/media/reorder    body { mediaIds: number[] }
POST   /admin/frames/{id}/media            body { mediaId, role }  -- ustawia rolę (m.in. 'geometry')
... identycznie dla /admin/projects
```

`GET /admin/catalog` dostaje dodatkowo klucze `frames`, `frameMedia`,
`projects`, `projectMedia` (płaskie wiersze, jak `models`/`media` dzisiaj).

Wgrywanie plików zostaje bez zmian: `POST /admin/media` zwraca `{ url }`,
a przypisanie do ramy/realizacji jest osobnym wywołaniem.

## Formularz zapytania o ramę

Rozszerzamy istniejący `POST /contact` o `type: 'frame'` zamiast budować
drugi mechanizm. Payload dostaje opcjonalne `context`:

```json
{ "type": "frame", "name": "...", "email": "...", "phone": "...", "message": "...",
  "context": { "frameSlug": "cfr-707", "frameName": "Carbonda CFR-707",
               "size": "M", "paint": "Porsche 9F2504" } }
```

Adresat: `order_email` z routingu poczty (zapytanie o ramę to intencja
zakupowa, nie ogólny kontakt ani serwis). Temat maila:
`Zapytanie o ramę — {frameName} — {name}`. Zdarzenie w logu aktywności:
`frame_message`.

## Routing frontu (eksport statyczny)

Wzorzec jest już w repozytorium — `app/rowery/[category]/[model]/page.tsx`
eksportuje jedną powłokę `_`, a `deploy/public-html.htaccess` przepisuje na
nią żądania. Nowe trasy robimy tak samo:

```
/ramy                 -> lista + filtry kategorii
/ramy/[slug]          -> generateStaticParams() => [{ slug: '_' }]
/realizacje           -> lista + filtry kategorii
/realizacje/[slug]    -> generateStaticParams() => [{ slug: '_' }]
```

htaccess, obok istniejącej reguły dla `rowery`:

```apache
RewriteRule ^ramy/[^/]+/?$ ramy/_.html [L]
RewriteRule ^realizacje/[^/]+/?$ realizacje/_.html [L]
```

Przy okazji domykamy istniejącą lukę: nowa kategoria dodana w panelu nie ma
dziś strony, bo `app/rowery/[category]/page.tsx` ma zaszytą listę slugów, a
htaccess nie ma reguły jednosegmentowej. Dokładamy
`RewriteRule ^rowery/[^/]+/?$ rowery/_.html [L]` i powłokę `_` dla tej trasy.

## Podział prac

- **Wątek A (backend)** — `database/`, `apps/api/`, `docs/`.
- **Wątek B (front publiczny)** — `apps/web/app/ramy`, `apps/web/app/realizacje`,
  `apps/web/components/*` poza `admin-panel.tsx`, `apps/web/lib/*` poza
  `admin-tabs.ts`, `deploy/public-html.htaccess`.
- **Wątek C (panel admina)** — `apps/web/components/admin-panel.tsx`,
  `apps/web/lib/admin-tabs.ts`.

Pliki nie zachodzą na siebie. Jeżeli wątek potrzebuje zmiany poza swoim
zakresem, zgłasza to zamiast edytować.
