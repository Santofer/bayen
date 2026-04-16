/**
 * Configure les permissions Directus pour le rôle "Authenticated Users".
 * Permet aux utilisateurs connectés de contribuer des produits (create) et
 * d'uploader des fichiers (create).
 *
 * Usage :
 *   DIRECTUS_URL=https://api.bayen.ma \
 *   DIRECTUS_ADMIN_EMAIL=admin@n0.ma \
 *   DIRECTUS_ADMIN_PASSWORD=xxx \
 *   node scripts/setup-permissions.mjs
 *
 * OU avec un static admin token :
 *   DIRECTUS_URL=https://api.bayen.ma \
 *   DIRECTUS_TOKEN=xxx \
 *   node scripts/setup-permissions.mjs
 */

const DIRECTUS_URL = process.env.DIRECTUS_URL || 'https://api.bayen.ma'
const EMAIL = process.env.DIRECTUS_ADMIN_EMAIL
const PASSWORD = process.env.DIRECTUS_ADMIN_PASSWORD
let TOKEN = process.env.DIRECTUS_TOKEN || ''

// ── 1. Authentification ──────────────────────────────────────────
async function authenticate() {
  if (TOKEN) {
    console.log('→ Using DIRECTUS_TOKEN')
    return TOKEN
  }
  if (!EMAIL || !PASSWORD) {
    console.error('❌ DIRECTUS_TOKEN ou (DIRECTUS_ADMIN_EMAIL + DIRECTUS_ADMIN_PASSWORD) requis')
    process.exit(1)
  }
  const res = await fetch(`${DIRECTUS_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  })
  if (!res.ok) {
    console.error(`❌ Échec auth admin (HTTP ${res.status})`)
    process.exit(1)
  }
  const json = await res.json()
  console.log('✓ Authentifié comme admin')
  return json.data.access_token
}

// ── 2. Récupérer le rôle "Authenticated Users" ───────────────────
async function getAuthRole(token) {
  const res = await fetch(`${DIRECTUS_URL}/roles`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`GET /roles → ${res.status}`)
  const json = await res.json()
  // Directus a un rôle "Administrator" + "Authenticated Users" (non-admin, non-app_access false)
  // Le rôle "Authenticated Users" est le public authenticated
  const authRole = json.data.find((r) =>
    r.name?.toLowerCase().includes('auth') ||
    r.name?.toLowerCase().includes('utilisateur') ||
    (r.admin_access === false && r.app_access !== false)
  )
  if (!authRole) {
    console.error('❌ Rôle "Authenticated Users" introuvable')
    console.log('Rôles disponibles :', json.data.map((r) => r.name))
    process.exit(1)
  }
  console.log(`✓ Rôle "${authRole.name}" trouvé (id=${authRole.id})`)
  return authRole
}

// ── 3. Créer / mettre à jour une permission ──────────────────────
async function ensurePermission(token, role, collection, action, fields = '*', permissions = {}, validation = {}) {
  // Chercher permission existante
  const search = await fetch(
    `${DIRECTUS_URL}/permissions?filter[role][_eq]=${role}&filter[collection][_eq]=${collection}&filter[action][_eq]=${action}`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  const searchJson = await search.json()
  const existing = searchJson.data?.[0]

  const body = {
    role,
    collection,
    action,
    fields: typeof fields === 'string' ? [fields] : fields,
    permissions,
    validation,
  }

  if (existing) {
    const res = await fetch(`${DIRECTUS_URL}/permissions/${existing.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
    console.log(`  ~ ${collection}.${action} (patched, ${res.status})`)
  } else {
    const res = await fetch(`${DIRECTUS_URL}/permissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
    const txt = await res.text()
    if (!res.ok) console.log(`  ✗ ${collection}.${action} (${res.status}) ${txt.slice(0, 200)}`)
    else console.log(`  + ${collection}.${action}`)
  }
}

// ── Main ─────────────────────────────────────────────────────────
const token = await authenticate()
const role = await getAuthRole(token)

console.log('\n→ Configuration des permissions pour le rôle authentifié :\n')

// Products : read (déjà public) + create + update (ses propres)
await ensurePermission(token, role.id, 'products', 'read')
await ensurePermission(token, role.id, 'products', 'create')
await ensurePermission(token, role.id, 'products', 'update', '*', { created_by: { _eq: '$CURRENT_USER' } })

// Fichiers : create (upload) + read
await ensurePermission(token, role.id, 'directus_files', 'read')
await ensurePermission(token, role.id, 'directus_files', 'create')

// Contributions : create + read (les siennes)
await ensurePermission(token, role.id, 'contributions', 'create')
await ensurePermission(token, role.id, 'contributions', 'read', '*', { user_id: { _eq: '$CURRENT_USER' } })

// Scans : create (tracking)
await ensurePermission(token, role.id, 'scans', 'create')

// Users : update self (points, rank)
await ensurePermission(token, role.id, 'directus_users', 'read', ['id', 'first_name', 'display_name', 'points', 'contributions_count', 'rank', 'avatar'])
await ensurePermission(token, role.id, 'directus_users', 'update', ['first_name', 'display_name', 'avatar'], { id: { _eq: '$CURRENT_USER' } })

console.log('\n✓ Permissions configurées. Ton ami peut réessayer de contribuer.')
