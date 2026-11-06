-- Legacy free-text glyphs cannot resolve through Lucide. Normalize them and
-- constrain all stored values to canonical lowercase kebab-case identifiers.
UPDATE tools
SET icon = 'layout-grid'
WHERE icon <> '' AND icon !~ '^[a-z0-9]+(-[a-z0-9]+)*$';

ALTER TABLE tools
  ADD CONSTRAINT tools_icon_id_check
  CHECK (icon = '' OR icon ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
