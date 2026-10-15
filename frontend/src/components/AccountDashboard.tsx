/**
 * Espace compte — maquette « Compte » :
 * carte profil (ou carte de connexion) → bulle Naânaa → « Mes courses en <mois> »
 * → réglages en lignes → entrées du compte → statistiques, série,
 * contributions et scans récents (compte connecté uniquement).
 *
 * Fonctionne aussi sans compte : réglages, bilan de courses (historique local)
 * et raccourcis restent utiles ; la carte de connexion remplace le profil.
 */

import { useState, useEffect, useCallback, type ReactNode } from 'react'
import { Moon, Globe, User, Trophy, NotebookPen, Camera, ScanLine, ShoppingBasket, Handshake, LogOut, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getAccessToken, isAuthenticated, logout } from '@/lib/auth'
import { useLocale } from '@/lib/i18n'
import { scoreFill } from '@/lib/score-colors'
import { getHistory, onHistoryChange, type ScanHistoryEntry } from '@/lib/scan-history'
import { ALLERGENS, getProfile, onProfileChange, type HealthProfile } from '@/lib/health-profile'
import { cartCount, onCartChange } from '@/lib/cart'
import { ScoreSticker } from '@/components/ProductCard'
import { ARY_MONTHS } from '@/components/BlogCard'
import type { Locale, TranslationKey } from '@/lib/translations'
import StreakWidget from '@/components/StreakWidget'
import { LoginCard } from '@/components/AuthGuard'

const DIRECTUS_URL = '/api/directus'

interface UserProfile {
  id: string
  email: string
  display_name: string | null
  points: number
  contributions_count: number
  rank: string
  isAdmin: boolean
}

interface Contribution {
  id: string
  type: string
  status: string
  date_created: string
  product_id: { name_fr: string; barcode: string } | string
}

interface Scan {
  id: string
  date_created: string
  product_id: { name_fr: string; barcode: string; scan_score: number | null } | string
}

// Niveaux et seuils — `fill` = aplat Marché Pop (texte encre posé dessus)
const RANK_INFO: Record<string, { label: TranslationKey; fill: string; min: number; next: number | null }> = {
  nouveau: { label: 'rank.nouveau', fill: 'bg-framboise', min: 0, next: 100 },
  contributeur: { label: 'rank.contributeur', fill: 'bg-menthe', min: 100, next: 500 },
  expert: { label: 'rank.expert', fill: 'bg-citron', min: 500, next: 2000 },
  'vérifié': { label: 'rank.verified', fill: 'bg-myrtille', min: 2000, next: null },
}

const TYPE_LABELS: Record<string, TranslationKey> = {
  new_product: 'account.type.new_product',
  fix_data: 'account.type.fix_data',
  add_image: 'account.type.add_image',
  confirm: 'account.type.confirm',
}

const STATUS_CHIPS: Record<string, { label: TranslationKey; fill: string }> = {
  pending: { label: 'account.status.pending', fill: 'bg-citron' },
  approved: { label: 'account.status.approved', fill: 'bg-menthe' },
  rejected: { label: 'account.status.rejected', fill: 'bg-tomate' },
}

// Ligne de carte « réglages » (maquette : 14 × 16 px, filet entre les lignes)
const ROW = 'flex w-full items-center justify-between gap-3 border-b-[1.5px] border-line px-4 py-3.5 text-start last:border-b-0 hover:bg-muted/60'

function RowLabel({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      {icon}
      <span className="truncate">{children}</span>
    </span>
  )
}

const ICON = { size: 22, className: 'flex-none', 'aria-hidden': true } as const

async function fetchWithAuth(url: string) {
  const token = await getAccessToken()
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) throw new Error(`${res.status}`)
  return res.json()
}

const mean = (xs: number[]): number => Math.round(xs.reduce((s, x) => s + x, 0) / xs.length)

interface MonthStats {
  avg: number
  count: number
  /** Score moyen par semaine du mois (1-7, 8-14, 15-21, 22-fin) ; null = aucun scan */
  weeks: Array<number | null>
  /** Produits du mois sous 50 (médiocre ou mauvais) */
  toReplace: number
  /** Écart avec le mois précédent ; null s'il n'y a rien à comparer */
  delta: number | null
}

/**
 * Bilan des courses du mois à partir de l'historique local (une entrée par
 * produit, datée de sa dernière consultation). Aucune donnée inventée : null
 * si aucun produit noté n'a été scanné ce mois-ci.
 */
function monthStats(entries: ScanHistoryEntry[], now: Date): MonthStats | null {
  const cur: number[] = []
  const prev: number[] = []
  const weeks: number[][] = [[], [], [], []]
  const before = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  for (const e of entries) {
    if (e.scan_score == null) continue
    const d = new Date(e.at)
    if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) {
      cur.push(e.scan_score)
      weeks[Math.min(3, Math.floor((d.getDate() - 1) / 7))].push(e.scan_score)
    } else if (d.getFullYear() === before.getFullYear() && d.getMonth() === before.getMonth()) {
      prev.push(e.scan_score)
    }
  }
  if (cur.length === 0) return null
  const avg = mean(cur)
  return {
    avg,
    count: cur.length,
    weeks: weeks.map((w) => (w.length ? mean(w) : null)),
    toReplace: cur.filter((s) => s < 50).length,
    delta: prev.length ? avg - mean(prev) : null,
  }
}

/** Résumé du profil santé pour la ligne de réglages (« Sans gluten, lait +2 ») */
function profileSummary(p: HealthProfile | null, t: (k: TranslationKey) => string, locale: Locale): string {
  if (!p) return ''
  const named = [
    ...p.allergens.map((k) => {
      const a = ALLERGENS.find((x) => x.key === k)
      return (locale === 'ary' ? a?.labelAr : a?.label) ?? k
    }),
    ...(p.avoidPalmOil ? [t('profile.palmOil')] : []),
  ]
  const others = p.avoidAdditives.length + (p.avoidEndocrine ? 1 : 0) + (p.avoidFragranceAllergens ? 1 : 0)
  if (named.length === 0) return others ? `${others} ${t(others > 1 ? 'health.alertsPlural' : 'health.alerts')}` : t('account.profileTodo')
  const extra = Math.max(0, named.length - 2) + others
  const list = named.slice(0, 2).join(locale === 'ary' ? '، ' : ', ').toLowerCase()
  return `${t('account.profileWithout').replace('{list}', list)}${extra ? ` +${extra}` : ''}`
}

export default function AccountDashboard() {
  const { t, locale, setLocale } = useLocale()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [scans, setScans] = useState<Scan[]>([])
  const [editing, setEditing] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(true)
  // Données locales (appareil) : historique de scans, profil santé, liste, thème
  const [history, setHistory] = useState<ScanHistoryEntry[]>([])
  const [profile, setProfile] = useState<HealthProfile | null>(null)
  const [cartN, setCartN] = useState(0)
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const sync = (): void => {
      setHistory(getHistory())
      setProfile(getProfile())
      setCartN(cartCount())
    }
    sync()
    // Le script du Layout a déjà posé la classe selon bayen_theme / le système
    setDark(document.documentElement.classList.contains('dark'))
    const offs = [onHistoryChange(sync), onProfileChange(sync), onCartChange(sync)]
    return () => offs.forEach((off) => off())
  }, [])

  useEffect(() => {
    async function load() {
      if (!isAuthenticated()) {
        setLoading(false)
        return
      }
      try {
        const userData = await fetchWithAuth(`${DIRECTUS_URL}/users/me`)
        const u = userData.data
        // Vérifier si admin via le rôle
        let isAdmin = false
        if (typeof u.role === 'string' && u.role) {
          try {
            const roleData = await fetchWithAuth(`${DIRECTUS_URL}/roles/${u.role}?fields=name`)
            isAdmin = roleData.data?.name === 'Administrator'
          } catch { /* pas critique */ }
        }
        const p: UserProfile = {
          id: u.id,
          email: u.email,
          display_name: u.display_name ?? u.first_name ?? null,
          points: u.points ?? 0,
          contributions_count: u.contributions_count ?? 0,
          rank: u.rank ?? 'nouveau',
          isAdmin,
        }
        setUser(p)
        setDisplayName(p.display_name ?? '')

        const contribData = await fetchWithAuth(
          `${DIRECTUS_URL}/items/contributions?filter[user_id][_eq]=${u.id}&sort=-date_created&limit=20&fields=id,type,status,date_created,product_id.name_fr,product_id.barcode`
        )
        setContributions(contribData.data ?? [])

        const scanData = await fetchWithAuth(
          `${DIRECTUS_URL}/items/scans?filter[user_id][_eq]=${u.id}&sort=-date_created&limit=20&fields=id,date_created,product_id.name_fr,product_id.barcode,product_id.scan_score`
        )
        setScans(scanData.data ?? [])
      } catch {
        // Session expirée ou réseau : la carte de connexion s'affiche
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleSaveProfile = useCallback(async () => {
    if (!user) return
    try {
      const token = await getAccessToken()
      await fetch(`${DIRECTUS_URL}/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ first_name: displayName }),
      })
      setUser({ ...user, display_name: displayName })
      setEditing(false)
    } catch { /* erreur silencieuse */ }
  }, [user, displayName])

  // Même logique que ThemeToggle : classe .dark sur <html> + bayen_theme
  function toggleDark(): void {
    const next = !dark
    setDark(next)
    localStorage.setItem('bayen_theme', next ? 'dark' : 'light')
    document.documentElement.classList.toggle('dark', next)
  }

  // Même logique que LocaleToggle : cookie + localStorage bayen_locale, puis rechargement
  function toggleLocale(): void {
    setLocale(locale === 'fr' ? 'ary' : 'fr')
    window.location.reload()
  }

  async function handleLogout(): Promise<void> {
    await logout()
    window.location.href = '/'
  }

  if (loading) {
    return (
      <section className="section">
        <div className="flex justify-center py-12">
          <span className="size-8 animate-spin rounded-full border-4 border-menthe border-t-transparent" aria-hidden="true" />
        </div>
      </section>
    )
  }

  const now = new Date()
  // Mois en darija marocaine (يناير… دجنبر), pas les noms de l'arabe du Machrek
  const monthName = (d: Date): string => (locale === 'ary' ? ARY_MONTHS[d.getMonth()] : d.toLocaleDateString('fr-FR', { month: 'long' }))
  const month = monthName(now)
  const prevMonth = monthName(new Date(now.getFullYear(), now.getMonth() - 1, 1))
  const courses = monthStats(history, now)
  const dateLocale = locale === 'ary' ? 'ar-MA' : 'fr-FR'
  const pts = (n: number): string => `${n} ${t('rank.pts')}`

  const rank = user ? RANK_INFO[user.rank] ?? RANK_INFO.nouveau : RANK_INFO.nouveau
  const nextKey = Object.values(RANK_INFO).find((r) => r.min === rank.next)?.label
  const nextLabel = nextKey ? t(nextKey) : t('account.nextLevel')
  const progress = user && rank.next
    ? Math.max(0, Math.min(100, ((user.points - rank.min) / (rank.next - rank.min)) * 100))
    : 100

  const approvedCount = contributions.filter((c) => c.status === 'approved').length
  const approvalRate = contributions.length > 0 ? Math.round((approvedCount / contributions.length) * 100) : 0

  return (
    <>
      {/* Profil + Naânaa | bilan de courses (côte à côte sur ordinateur) */}
      <div className="section gap-5 md:grid-cols-2 md:items-start md:gap-8">
        <div className="grid gap-5">
          {user ? (
            <div className="card grid grid-cols-[64px_minmax(0,1fr)] items-center gap-3.5 p-4">
              <span className="grid size-16 place-items-center rounded-full border-2 border-encre bg-figue font-display text-[26px] font-extrabold text-encre" aria-hidden="true">
                {(user.display_name || user.email || '?')[0].toUpperCase()}
              </span>
              <div className="grid min-w-0 gap-1.5">
                {editing ? (
                  <div className="flex flex-wrap gap-2">
                    <input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      aria-label={t('auth.displayName')}
                      className="h-9 min-w-0 flex-1 rounded-full border-2 border-line bg-background px-3 text-sm"
                      autoFocus
                    />
                    <button type="button" className="btn sm primary" onClick={handleSaveProfile}>{t('common.save')}</button>
                    <button type="button" className="btn sm flat" onClick={() => setEditing(false)}>{t('common.cancel')}</button>
                  </div>
                ) : (
                  <div className="flex min-w-0 items-center gap-1">
                    <p className="disp d-s truncate">{user.display_name || user.email}</p>
                    <button
                      type="button"
                      onClick={() => setEditing(true)}
                      aria-label={t('account.editName')}
                      className="grid size-7 flex-none place-items-center rounded-full text-muted-foreground hover:bg-muted"
                    >
                      <Pencil size={14} aria-hidden="true" />
                    </button>
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2 text-[13px]">
                  {user.isAdmin && <span className="chip fill bg-tomate">{t('account.admin')}</span>}
                  <span className={cn('chip fill', rank.fill)}><Trophy aria-hidden="true" /> {t(rank.label)}</span>
                  <b className="num">{pts(user.points)}</b>
                </div>
                <div className="h-2.5 overflow-hidden rounded-[9px] border-[1.5px] border-line bg-muted">
                  <i className="block h-full bg-menthe transition-[width] duration-500" style={{ width: `${progress}%` }} />
                </div>
                <p className="muted text-[11.5px]">
                  {rank.next
                    ? t('account.ptsBefore').replace('{n}', String(Math.max(0, rank.next - user.points))).replace('{rank}', nextLabel)
                    : t('account.topRank')}
                </p>
              </div>
            </div>
          ) : (
            <LoginCard redirectPath="/compte" />
          )}

          {/* Naânaa applaudit les points gagnés */}
          {user && user.points > 0 && (
            <div className="naanaa">
              <div className="m"><img src="/mascotte/naanaa-bravo.webp" alt={t('account.naanaaBravoAlt')} /></div>
              <p className="bubble">
                <b>{t('account.ptsBang').replace('{n}', String(user.points))}</b> {t('account.thanksBubble')}
              </p>
            </div>
          )}
        </div>

        {/* Mes courses du mois : historique de scans de l'appareil, jamais de chiffres inventés */}
        <section className="grid gap-3">
          <div className="sec-head"><h2 className="disp d-m">{t('account.coursesTitle').replace('{month}', month)}</h2></div>
          <div className="card grid gap-3.5 p-4">
            {courses ? (
              <>
                <div className="flex items-center gap-3.5">
                  <ScoreSticker score={courses.avg} locale={locale} />
                  <p className="text-sm">
                    {t(courses.count > 1 ? 'account.coursesAvg' : 'account.coursesAvgOne').replace('{n}', String(courses.count))}
                    {courses.delta != null && (
                      <> : <b>{courses.delta >= 0 ? '+' : '−'}{Math.abs(courses.delta)} {t(Math.abs(courses.delta) > 1 ? 'account.pointMany' : 'account.pointOne')}</b> {t('account.coursesSince')} {prevMonth}</>
                    )}.
                  </p>
                </div>
                <div className="grid h-[110px] grid-cols-4 items-end gap-2.5 border-b-2 border-line px-1.5">
                  {courses.weeks.map((w, i) => (
                    <div key={i} className="grid justify-items-center gap-1">
                      <b className={cn('num text-xs', w == null && 'muted')}>{w ?? '–'}</b>
                      {w != null && (
                        <i
                          className="block w-full rounded-t-lg border-2 border-b-0 border-line"
                          style={{ height: `${Math.max(8, Math.round(w * 0.85))}px`, background: scoreFill(w) }}
                        />
                      )}
                    </div>
                  ))}
                </div>
                <div className="muted grid grid-cols-4 text-center text-[11.5px]">
                  {[1, 2, 3, 4].map((n) => <span key={n}>{t('account.weekShort').replace('{n}', String(n))}</span>)}
                </div>
                <a href="/mes-scans" className="text-[13.5px] font-bold">
                  {courses.toReplace > 0
                    ? t(courses.toReplace > 1 ? 'account.toReplaceMany' : 'account.toReplaceOne').replace('{n}', String(courses.toReplace))
                    : t('account.seeScans')}
                </a>
              </>
            ) : (
              <>
                <div className="naanaa">
                  <div className="m"><img src="/mascotte/naanaa-scan.webp" alt="" /></div>
                  <p className="bubble">{t('account.coursesEmpty').replace('{month}', month)}</p>
                </div>
                <a href="/scan" className="btn sm primary w-max">
                  <ScanLine aria-hidden="true" /> {t('points.actionScan')}
                </a>
              </>
            )}
          </div>
        </section>
      </div>

      {/* Réglages | entrées du compte */}
      <div className="section gap-5 md:grid-cols-2 md:items-start md:gap-8">
        <div className="card grid overflow-hidden">
          <button type="button" role="switch" aria-checked={dark} onClick={toggleDark} className={ROW}>
            <RowLabel icon={<Moon {...ICON} />}>{t('account.darkMode')}</RowLabel>
            <span aria-hidden="true" className={cn('relative h-7 w-12 flex-none rounded-full border-2 border-line', dark ? 'bg-menthe' : 'bg-muted')}>
              <i className={cn('absolute top-0.5 size-5 rounded-full bg-encre transition-all', dark ? 'end-0.5' : 'start-0.5')} />
            </span>
          </button>
          <button
            type="button"
            onClick={toggleLocale}
            className={ROW}
            aria-label={t('account.langToggle')}
          >
            <RowLabel icon={<Globe {...ICON} />}>{t('account.language')}</RowLabel>
            <span className="font-semibold">
              <span className={cn(locale !== 'fr' && 'muted font-normal')}>Français</span>
              {' · '}
              <span lang="ar" className={cn(locale !== 'ary' && 'muted font-normal')}>العربية</span>
            </span>
          </button>
          <a href="/profil" className={ROW}>
            <RowLabel icon={<User {...ICON} />}>{t('nav.profile')}</RowLabel>
            <span className="muted min-w-0 truncate">{profileSummary(profile, t, locale)}</span>
          </a>
        </div>

        <div className="card grid overflow-hidden">
          <a href="/compte/points" className={ROW}>
            <RowLabel icon={<Trophy {...ICON} />}>{t('points.title')}</RowLabel>
            <span className="muted num">{user ? pts(user.points) : t('account.scale')}</span>
          </a>
          <a href="/compte/journal" className={ROW}>
            <RowLabel icon={<NotebookPen {...ICON} />}>{t('nav.journal')}</RowLabel>
          </a>
          <a href="/analyser-repas" className={ROW}>
            <RowLabel icon={<Camera {...ICON} />}>{t('meal.analyzeCta')}</RowLabel>
          </a>
          <a href="/mes-scans" className={ROW}>
            <RowLabel icon={<ScanLine {...ICON} />}>{t('nav.history')}</RowLabel>
            <span className="muted num">{history.length}</span>
          </a>
          <a href="/panier" className={ROW}>
            <RowLabel icon={<ShoppingBasket {...ICON} />}>{t('nav.cart')}</RowLabel>
            <span className="muted num">{cartN}</span>
          </a>
          {user?.isAdmin && (
            <a href="/compte/partenariats" className={ROW}>
              <RowLabel icon={<Handshake {...ICON} />}>{t('partnerAdmin.title')}</RowLabel>
              <span className="muted">{t('account.team')}</span>
            </a>
          )}
          {user && (
            <button type="button" onClick={() => void handleLogout()} className={cn(ROW, 'text-destructive')}>
              <RowLabel icon={<LogOut {...ICON} />}>{t('nav.logout')}</RowLabel>
              <span className="muted min-w-0 truncate text-sm">{user.email}</span>
            </button>
          )}
        </div>
      </div>

      {user && (
        <>
          {/* Statistiques */}
          <section className="section">
            <div className="sec-head"><h2 className="disp d-m">{t('account.stats')}</h2></div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {([
                [user.points, t('account.points')],
                [user.contributions_count, t('account.statContributions')],
                [scans.length, t('history.recent')],
                [`${approvalRate} %`, t('account.approvalRate')],
              ] as Array<[number | string, string]>).map(([value, label]) => (
                <div key={label} className="card p-4 text-center">
                  <p className="disp d-m num">{value}</p>
                  <p className="muted mt-1 text-xs">{label}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Série de scans quotidiens (masquée si aucun scan) */}
          <StreakWidget />

          {/* Contributions | scans récents */}
          <div className="section gap-5 md:grid-cols-2 md:items-start md:gap-8">
            <section className="grid gap-3">
              <div className="sec-head">
                <h2 className="disp d-m">{t('account.contributions')}</h2>
                <a href="/compte/points">{t('history.seeAll')}</a>
              </div>
              <div className="card grid overflow-hidden">
                {contributions.length === 0 ? (
                  <p className="muted p-4 text-sm">{t('points.noActivity')}</p>
                ) : (
                  contributions.map((c) => {
                    const name = typeof c.product_id === 'object' ? c.product_id.name_fr : c.product_id
                    const barcode = typeof c.product_id === 'object' ? c.product_id.barcode : ''
                    const status = STATUS_CHIPS[c.status] ?? STATUS_CHIPS.pending
                    return (
                      <div key={c.id} className={ROW}>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold">
                            {barcode ? <a href={`/produit/${barcode}`} className="hover:underline">{name}</a> : name}
                          </span>
                          <span className="muted block text-xs">
                            {TYPE_LABELS[c.type] ? t(TYPE_LABELS[c.type]) : c.type} — {new Date(c.date_created).toLocaleDateString(dateLocale)}
                          </span>
                        </span>
                        <span className={cn('chip fill', status.fill)}>{t(status.label)}</span>
                      </div>
                    )
                  })
                )}
              </div>
            </section>

            <section className="grid gap-3">
              <div className="sec-head">
                <h2 className="disp d-m">{t('account.recentScans')}</h2>
                <a href="/mes-scans">{t('history.seeAll')}</a>
              </div>
              {scans.length === 0 ? (
                <div className="card p-4">
                  <div className="naanaa">
                    <div className="m"><img src="/mascotte/naanaa-scan.webp" alt="" /></div>
                    <p className="bubble">
                      {t('account.noScans')}{' '}
                      <a href="/scan" className="font-bold underline underline-offset-2">{t('rank.scanProduct')}</a>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="card grid overflow-hidden">
                  {scans.map((s) => {
                    const p = typeof s.product_id === 'object' ? s.product_id : null
                    return (
                      <div key={s.id} className={ROW}>
                        <span className="min-w-0">
                          {p?.barcode ? (
                            <a href={`/produit/${p.barcode}`} className="block truncate text-sm font-semibold hover:underline">{p.name_fr}</a>
                          ) : (
                            <span className="block truncate text-sm font-semibold">{p?.name_fr ?? '—'}</span>
                          )}
                          <span className="muted block text-xs">{new Date(s.date_created).toLocaleDateString(dateLocale)}</span>
                        </span>
                        {p?.scan_score != null && <ScoreSticker score={p.scan_score} size="sm" locale={locale} />}
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </>
  )
}
