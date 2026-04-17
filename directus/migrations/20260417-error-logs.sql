CREATE TABLE IF NOT EXISTS error_logs (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source VARCHAR(20) NOT NULL DEFAULT 'frontend',
  severity VARCHAR(10) NOT NULL DEFAULT 'error',
  url TEXT,
  user_agent TEXT,
  message TEXT,
  stack TEXT,
  context JSONB
);
CREATE INDEX IF NOT EXISTS error_logs_timestamp_idx ON error_logs (timestamp DESC);

-- Expose la collection dans Directus
INSERT INTO directus_collections (collection, icon, note, hidden, singleton)
  VALUES ('error_logs', 'bug_report', 'Erreurs remontées par le frontend et les endpoints.', false, false)
  ON CONFLICT (collection) DO NOTHING;

-- Fields pour l'interface Directus
INSERT INTO directus_fields (collection, field, special, interface, display, hidden, readonly, required, sort, width) VALUES
  ('error_logs', 'id',         NULL,            'input',           'raw',      true,  true,  false, 1, 'half'),
  ('error_logs', 'timestamp',  'date-created',  'datetime',        'datetime', false, true,  false, 2, 'half'),
  ('error_logs', 'source',     NULL,            'select-dropdown', 'labels',   false, false, false, 3, 'half'),
  ('error_logs', 'severity',   NULL,            'select-dropdown', 'labels',   false, false, false, 4, 'half'),
  ('error_logs', 'message',    NULL,            'input',           'raw',      false, false, false, 5, 'full'),
  ('error_logs', 'url',        NULL,            'input',           'raw',      false, false, false, 6, 'full'),
  ('error_logs', 'user_agent', NULL,            'input',           'raw',      false, false, false, 7, 'full'),
  ('error_logs', 'stack',      NULL,            'input-multiline', 'raw',      false, false, false, 8, 'full'),
  ('error_logs', 'context',    'cast-json',     'input-code',      'raw',      false, false, false, 9, 'full')
ON CONFLICT DO NOTHING;

SELECT collection, hidden FROM directus_collections WHERE collection='error_logs';
SELECT field FROM directus_fields WHERE collection='error_logs' ORDER BY sort;
