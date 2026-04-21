-- Collection `articles` pour la section blog Bayen
-- Idempotent : peut être rejoué sans effet

-- ─── 1. Table Postgres ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(120) UNIQUE NOT NULL,
  title_fr VARCHAR(200) NOT NULL,
  title_ar VARCHAR(200),
  excerpt_fr VARCHAR(300),
  excerpt_ar VARCHAR(300),
  content_fr TEXT NOT NULL,
  content_ar TEXT,
  cover_image UUID,
  category VARCHAR(20) NOT NULL DEFAULT 'bien-etre',
  reading_time_min INTEGER,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  date_published TIMESTAMPTZ,
  date_created TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date_updated TIMESTAMPTZ,
  created_by UUID REFERENCES directus_users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS articles_slug_idx ON articles(slug);
CREATE INDEX IF NOT EXISTS articles_published_idx ON articles(status, date_published DESC);
CREATE INDEX IF NOT EXISTS articles_category_idx ON articles(category);

-- FK vers directus_files pour l'image de couverture
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'articles_cover_image_foreign'
  ) THEN
    ALTER TABLE articles
      ADD CONSTRAINT articles_cover_image_foreign
      FOREIGN KEY (cover_image) REFERENCES directus_files(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ─── 2. Collection dans Directus admin UI ─────────────────────────
INSERT INTO directus_collections (collection, icon, note, hidden, singleton, display_template)
  VALUES (
    'articles',
    'article',
    'Articles du blog Bayen (bien-être, habitudes, guides, actualités).',
    false,
    false,
    '{{title_fr}} — {{category}}'
  )
ON CONFLICT (collection) DO UPDATE
  SET icon = EXCLUDED.icon,
      note = EXCLUDED.note,
      display_template = EXCLUDED.display_template;

-- ─── 3. Fields ────────────────────────────────────────────────────
-- Idempotent : on insère chaque field seulement s'il n'existe pas déjà
-- (directus_fields n'a pas de contrainte unique sur (collection, field))
INSERT INTO directus_fields
  (collection, field, special, interface, display, display_options, hidden, readonly, required, sort, width, note, options)
SELECT * FROM (VALUES
  ('articles', 'id',               'uuid'::varchar,          'input'::varchar,              'raw'::varchar,       NULL::json, true,  true,  false,  1, 'half'::varchar,  NULL::text, NULL::json),
  ('articles', 'status',           NULL,                     'select-dropdown',             'labels',             '{"showAsDot":true,"choices":[{"text":"Brouillon","value":"draft","foreground":"#ffffff","background":"#94a3b8"},{"text":"Publié","value":"published","foreground":"#ffffff","background":"#16a34a"},{"text":"Archivé","value":"archived","foreground":"#ffffff","background":"#78716c"}]}'::json,
   false, false, true,   2, 'half',  'Un article en brouillon reste invisible pour les visiteurs.',
   '{"choices":[{"text":"Brouillon","value":"draft"},{"text":"Publié","value":"published"},{"text":"Archivé","value":"archived"}]}'::json),

  ('articles', 'slug',             NULL,            'input',              'raw',       NULL, false, false, true,   3, 'half',  'Identifiant URL : /blog/mon-slug. Lettres minuscules, tirets, pas d''espaces.', '{"slug":true,"trim":true}'::json),
  ('articles', 'category',         NULL,            'select-dropdown',    'labels',    '{"showAsDot":true,"choices":[{"text":"Bien-être","value":"bien-etre","foreground":"#ffffff","background":"#476a32"},{"text":"Habitudes","value":"habitudes","foreground":"#ffffff","background":"#b1cf3a"},{"text":"Guides","value":"guides","foreground":"#ffffff","background":"#0f766e"},{"text":"Actualités","value":"actualites","foreground":"#ffffff","background":"#f97316"}]}'::json,
   false, false, true,   4, 'half', NULL,
   '{"choices":[{"text":"Bien-être","value":"bien-etre"},{"text":"Habitudes","value":"habitudes"},{"text":"Guides","value":"guides"},{"text":"Actualités","value":"actualites"}]}'::json),

  ('articles', 'title_fr',         NULL,            'input',              'raw',       NULL, false, false, true,   5, 'full',  NULL, NULL),
  ('articles', 'title_ar',         NULL,            'input',              'raw',       NULL, false, false, false,  6, 'full',  'Titre en darija (optionnel, fallback vers FR).', NULL),

  ('articles', 'excerpt_fr',       NULL,            'input-multiline',    'raw',       NULL, false, false, false,  7, 'full',  'Résumé court (~160 caractères, utilisé pour les cards et le SEO).', NULL),
  ('articles', 'excerpt_ar',       NULL,            'input-multiline',    'raw',       NULL, false, false, false,  8, 'full',  'Résumé en darija (optionnel).', NULL),

  ('articles', 'cover_image',      'file',          'file-image',         'image',     NULL, false, false, false,  9, 'full',  'Image de couverture (ratio 4:3 idéal).', NULL),

  ('articles', 'reading_time_min', NULL,            'input',              'raw',       NULL, false, false, false, 10, 'half',  'Temps de lecture estimé en minutes.', NULL),
  ('articles', 'date_published',   NULL,            'datetime',           'datetime',  NULL, false, false, false, 11, 'half',  'Date visible sur l''article. Laisser vide avant publication.', NULL),

  ('articles', 'content_fr',       NULL,            'input-rich-text-md', 'formatted-value', NULL, false, false, true,  12, 'full', 'Contenu en Markdown. Supporte ## titres, **gras**, listes, liens, images.', NULL),
  ('articles', 'content_ar',       NULL,            'input-rich-text-md', 'formatted-value', NULL, false, false, false, 13, 'full', 'Contenu en darija (optionnel, fallback vers FR).', NULL),

  ('articles', 'date_created',     'date-created',  'datetime',           'datetime',  NULL, true,  true,  false, 14, 'half',  NULL, NULL),
  ('articles', 'date_updated',     'date-updated',  'datetime',           'datetime',  NULL, true,  true,  false, 15, 'half',  NULL, NULL),
  ('articles', 'created_by',       'user-created',  'select-dropdown-m2o', 'user',     '{"template":"{{first_name}} {{last_name}}"}'::json, true, true, false, 16, 'half', NULL, NULL)
) AS v(collection, field, special, interface, display, display_options, hidden, readonly, required, sort, width, note, options)
WHERE NOT EXISTS (
  SELECT 1 FROM directus_fields df
  WHERE df.collection = v.collection AND df.field = v.field
);

-- ─── 4. Relation cover_image ↔ directus_files (M2O) ───────────────
INSERT INTO directus_relations (many_collection, many_field, one_collection, one_collection_field, one_allowed_collections, junction_field, sort_field, one_deselect_action)
SELECT 'articles', 'cover_image', 'directus_files', NULL, NULL, NULL, NULL, 'nullify'
WHERE NOT EXISTS (
  SELECT 1 FROM directus_relations WHERE many_collection='articles' AND many_field='cover_image'
);

-- ─── 5. Permissions publiques (read sur articles publiés) ─────────
-- En Directus 11, policy = UUID de la policy "$t:public_label" (rôle public anonyme)
INSERT INTO directus_permissions (collection, action, permissions, fields, policy)
SELECT 'articles', 'read', '{"status":{"_eq":"published"}}'::json, '*', p.id
FROM directus_policies p
WHERE p.name = '$t:public_label'
  AND NOT EXISTS (
    SELECT 1 FROM directus_permissions
    WHERE collection='articles' AND action='read' AND policy=p.id
  );

-- Permissions pour le rôle "Utilisateur" authentifié (lecture aussi)
INSERT INTO directus_permissions (collection, action, permissions, fields, policy)
SELECT 'articles', 'read', '{"status":{"_eq":"published"}}'::json, '*', p.id
FROM directus_policies p
WHERE p.name = 'Utilisateur'
  AND NOT EXISTS (
    SELECT 1 FROM directus_permissions
    WHERE collection='articles' AND action='read' AND policy=p.id
  );

-- ─── 6. Vérification ──────────────────────────────────────────────
SELECT collection, icon, hidden FROM directus_collections WHERE collection='articles';
SELECT field, interface, required FROM directus_fields WHERE collection='articles' ORDER BY sort;
SELECT collection, action, fields FROM directus_permissions WHERE collection='articles';
