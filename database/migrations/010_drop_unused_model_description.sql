-- bike_models.description był tekstem roboczym ("Model roboczy bazuje na
-- referencyjnym zamówieniu Wielichowo...") pochodzącym z etapu wstępnego
-- seedu. Nigdzie w API ani na froncie nie jest czytany - klienci widzą
-- short_description i description_html, oba osobne kolumny. Usuwamy, żeby
-- nie mylić przyszłych edycji z realnie wyświetlanym tekstem.
ALTER TABLE bike_models DROP COLUMN description;
