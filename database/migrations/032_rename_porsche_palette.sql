-- Skraca nazwę palety „Porsche Paint to Sample" do „Porsche" - tak jak paleta
-- „Volkswagen" obok niej, bez dopisku technicznego widocznego klientom
-- w panelu i konfiguratorze. Slug (`porsche-pts`) zostaje bez zmian, bo
-- wiąże kolory i dostępność po id, nie po nazwie.

UPDATE paint_palettes SET name = 'Porsche' WHERE slug = 'porsche-pts' AND name <> 'Porsche';
