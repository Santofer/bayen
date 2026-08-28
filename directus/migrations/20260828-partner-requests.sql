-- Demandes de partenariat (page /partenaires).
--
-- Jusqu'ici le formulaire postait vers un webhook n8n jamais configuré :
-- AUCUNE demande n'a jamais été stockée ni transmise — les visiteurs voyaient
-- un message les invitant à écrire à partenaires@bayen.ma. Cette collection
-- rend les demandes consultables dans l'admin Directus, et l'endpoint envoie
-- en plus un email dès que le transport SMTP est configuré.

BEGIN;

CREATE TABLE IF NOT EXISTS partner_requests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company      VARCHAR(120) NOT NULL,
  role         VARCHAR(40),
  name         VARCHAR(120) NOT NULL,
  email        VARCHAR(255) NOT NULL,
  message      TEXT,
  status       VARCHAR(12) NOT NULL DEFAULT 'new',
  email_sent   BOOLEAN NOT NULL DEFAULT FALSE,
  date_created TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO directus_collections (collection, icon, note, hidden, singleton, sort_field)
  VALUES ('partner_requests', 'handshake', 'Demandes de partenariat reçues via bayen.ma/partenaires.', false, false, NULL)
ON CONFLICT (collection) DO NOTHING;

INSERT INTO directus_fields (collection, field, special, interface, display, hidden, readonly, required, sort, width, note) VALUES
  ('partner_requests', 'id',           'uuid',         'input',           'raw',      true,  true,  false, 1, 'half', NULL),
  ('partner_requests', 'company',      NULL,           'input',           'raw',      false, false, true,  2, 'half', 'Entreprise / marque.'),
  ('partner_requests', 'role',         NULL,           'input',           'raw',      false, false, false, 3, 'half', 'Marque, producteur, distributeur…'),
  ('partner_requests', 'name',         NULL,           'input',           'raw',      false, false, true,  4, 'half', 'Nom du contact.'),
  ('partner_requests', 'email',        NULL,           'input',           'raw',      false, false, true,  5, 'half', 'Email professionnel.'),
  ('partner_requests', 'message',      NULL,           'input-multiline', 'raw',      false, false, false, 6, 'full', 'Message libre.'),
  ('partner_requests', 'status',       NULL,           'select-dropdown', 'labels',   false, false, false, 7, 'half', 'new = à traiter.'),
  ('partner_requests', 'email_sent',   'cast-boolean', 'boolean',         'boolean',  false, true,  false, 8, 'half', 'Email de notification parti (nécessite la config SMTP).'),
  ('partner_requests', 'date_created', 'date-created', 'datetime',        'datetime', false, true,  false, 9, 'half', NULL)
ON CONFLICT DO NOTHING;

UPDATE directus_fields
SET options = '{"choices":[
  {"text":"Nouvelle","value":"new","foreground":"#ffffff","background":"#3b82f6"},
  {"text":"Traitée","value":"processed","foreground":"#ffffff","background":"#476a32"},
  {"text":"Écartée","value":"dismissed","foreground":"#ffffff","background":"#9ca3af"}
]}'::json
WHERE collection = 'partner_requests' AND field = 'status';

COMMIT;

SELECT table_name FROM information_schema.tables WHERE table_name = 'partner_requests';
