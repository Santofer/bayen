-- Dashboard Bayen — Vue d'ensemble
-- Idempotent : DELETE existant + INSERT

DELETE FROM directus_dashboards WHERE name = 'Bayen — Vue d''ensemble';

INSERT INTO directus_dashboards (id, name, icon, note, color, user_created) VALUES (
  '11111111-bbbb-4444-aaaa-000000000001',
  'Bayen — Vue d''ensemble',
  'analytics',
  'Stats temps réel : produits, scans, contributions, activité.',
  '#476a32',
  '0019e380-4150-4be5-805c-416c1b12d760'
);

-- ─── Row 1 : Metrics (compteurs) ──────────────────────────────────

INSERT INTO directus_panels (id, dashboard, name, icon, type, position_x, position_y, width, height, options, show_header, color, user_created) VALUES
('11111111-bbbb-4444-aaaa-000000000010',
 '11111111-bbbb-4444-aaaa-000000000001',
 'Total produits', 'grocery', 'metric',
 1, 1, 6, 4,
 '{"collection":"products","field":"id","function":"count","color":"#476a32"}',
 true, '#476a32', '0019e380-4150-4be5-805c-416c1b12d760'),

('11111111-bbbb-4444-aaaa-000000000011',
 '11111111-bbbb-4444-aaaa-000000000001',
 'Scans (toutes périodes)', 'qr_code_scanner', 'metric',
 7, 1, 6, 4,
 '{"collection":"scans","field":"id","function":"count","color":"#0f766e"}',
 true, '#0f766e', '0019e380-4150-4be5-805c-416c1b12d760'),

('11111111-bbbb-4444-aaaa-000000000012',
 '11111111-bbbb-4444-aaaa-000000000001',
 'Produits OFF', 'cloud_download', 'metric',
 13, 1, 6, 4,
 '{"collection":"products","field":"id","function":"count","filter":{"data_source":{"_eq":"off"}},"color":"#3b82f6"}',
 true, '#3b82f6', '0019e380-4150-4be5-805c-416c1b12d760'),

('11111111-bbbb-4444-aaaa-000000000013',
 '11111111-bbbb-4444-aaaa-000000000001',
 'Contributions communauté', 'volunteer_activism', 'metric',
 19, 1, 6, 4,
 '{"collection":"products","field":"id","function":"count","filter":{"data_source":{"_in":["community","ocr_tesseract","manual"]}},"color":"#f97316"}',
 true, '#f97316', '0019e380-4150-4be5-805c-416c1b12d760');

-- ─── Row 2 : Time-series 30 jours ─────────────────────────────────

INSERT INTO directus_panels (id, dashboard, name, icon, type, position_x, position_y, width, height, options, show_header, color, user_created) VALUES
('11111111-bbbb-4444-aaaa-000000000020',
 '11111111-bbbb-4444-aaaa-000000000001',
 'Scans / jour (30 derniers jours)', 'show_chart', 'time-series',
 1, 5, 12, 8,
 '{"collection":"scans","color":"#0f766e","dateField":"date_created","valueField":"id","function":"count","precision":"day","range":"30 days","fillType":"gradient","curveType":"smooth","showAxisLabels":"both","showMarker":true}',
 true, '#0f766e', '0019e380-4150-4be5-805c-416c1b12d760'),

('11111111-bbbb-4444-aaaa-000000000021',
 '11111111-bbbb-4444-aaaa-000000000001',
 'Nouveaux produits / jour (30 derniers jours)', 'add_chart', 'time-series',
 13, 5, 12, 8,
 '{"collection":"products","color":"#476a32","dateField":"date_created","valueField":"id","function":"count","precision":"day","range":"30 days","fillType":"gradient","curveType":"smooth","showAxisLabels":"both","showMarker":true}',
 true, '#476a32', '0019e380-4150-4be5-805c-416c1b12d760');

-- ─── Row 3 : Listes ───────────────────────────────────────────────

INSERT INTO directus_panels (id, dashboard, name, icon, type, position_x, position_y, width, height, options, show_header, color, user_created) VALUES
('11111111-bbbb-4444-aaaa-000000000030',
 '11111111-bbbb-4444-aaaa-000000000001',
 '10 derniers produits ajoutés', 'history', 'list',
 1, 13, 12, 12,
 '{"collection":"products","limit":10,"sortField":"date_created","sortDirection":"desc","displayTemplate":"{{name_fr}} — {{brand}} ({{data_source}})","fieldsAsList":["barcode","name_fr","brand","data_source","date_created","scan_count"]}',
 true, '#476a32', '0019e380-4150-4be5-805c-416c1b12d760'),

('11111111-bbbb-4444-aaaa-000000000031',
 '11111111-bbbb-4444-aaaa-000000000001',
 '10 derniers scans', 'qr_code_scanner', 'list',
 13, 13, 12, 12,
 '{"collection":"scans","limit":10,"sortField":"date_created","sortDirection":"desc","displayTemplate":"{{product_id.name_fr}} — {{date_created}}","fieldsAsList":["product_id","user_id","session_id","date_created"]}',
 true, '#0f766e', '0019e380-4150-4be5-805c-416c1b12d760');

-- Affichage du résultat
SELECT name, icon FROM directus_dashboards WHERE id = '11111111-bbbb-4444-aaaa-000000000001';
SELECT name, type FROM directus_panels WHERE dashboard = '11111111-bbbb-4444-aaaa-000000000001' ORDER BY position_y, position_x;
