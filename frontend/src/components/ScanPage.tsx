/**
 * Page scanner (maquette « Scan ») — composant React client
 * Caméra (BarcodeScanner) + feuille de résultat : le produit est cherché via
 * /bayen-api/scan, affiché en bas (« Trouvé en X s »), puis « Suivant » relance
 * le scan (scan en rafale) ou « Voir la fiche » ouvre /produit/[barcode].
 * Produit inconnu → contribution ; API indisponible → la fiche fait sa propre recherche.
 */

import { useState, useCallback } from 'react'
import BarcodeScanner from '@/components/BarcodeScanner'
import { ScoreSticker, productTint } from '@/components/ProductCard'
import { scanBarcode, getSessionId } from '@/lib/directus'
import { addToHistory } from '@/lib/scan-history'
import { cn } from '@/lib/utils'
import { useLocale } from '@/lib/i18n'
import type { Product, RiskLevel, ScanRequest } from '@/lib/types'

const CDN_URL = import.meta.env.PUBLIC_CDN_URL ?? 'https://api.bayen.ma/assets'

/** Alternative mieux notée (même catégorie) */
interface Better {
  barcode: string
  name_fr: string
  brand: string | null
  scan_score: number | null
}

type Sheet =
  | { kind: 'loading'; barcode: string }
  | { kind: 'unknown'; barcode: string }
  | { kind: 'found'; barcode: string; product: Product; score: number | null; worst: { code: string; risk: RiskLevel } | null; seconds: number; better: Better | null }

// Additif le plus préoccupant : ordre de gravité, aplat et libellé (texte encre dessus)
const RISK_ORDER: RiskLevel[] = ['banned_ma', 'avoid', 'limited']
const RISK_FILL: Record<RiskLevel, string> = {
  safe: 'var(--color-score-excellent)',
  limited: 'var(--color-citron)',
  avoid: 'var(--color-score-mediocre)',
  banned_ma: 'var(--color-score-mauvais)',
}
const RISK_KEY = { limited: 'additive.risk.limited', avoid: 'additive.risk.avoid', banned_ma: 'additive.risk.banned', safe: 'additive.risk.safe' } as const

// Garde-fou lexical repris de la fiche produit (pages/produit/[barcode].astro) :
// les catégories sont larges, une alternative doit partager un mot significatif
const STOP = new Set(['avec', 'sans', 'pour', 'les', 'des', 'aux', 'extra', 'nature', 'the'])
function words(name: string): Set<string> {
  return new Set(
    name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .split(/[^a-z]+/)
      .filter((w) => w.length >= 4 && !STOP.has(w))
  )
}

/** Meilleure alternative réelle (même catégorie, meilleur score) — null si aucune */
async function findBetter(p: Product, score: number | null): Promise<Better | null> {
  if (score == null) return null
  const cosmetic = p.product_type === 'cosmetic'
  const key = cosmetic ? p.cosmetic_category : p.category_id
  if (key == null || key === '') return null
  const q = new URLSearchParams({
    [cosmetic ? 'filter[cosmetic_category][_eq]' : 'filter[category_id][_eq]']: String(key),
    'filter[scan_score][_gt]': String(score),
    'filter[barcode][_neq]': p.barcode,
    'filter[status][_eq]': 'published',
    sort: '-scan_score',
    limit: '16',
    fields: 'barcode,name_fr,brand,scan_score',
  })
  if (cosmetic) q.set('filter[product_type][_eq]', 'cosmetic')
  try {
    const res = await fetch(`/api/directus/items/products?${q}`)
    if (!res.ok) return null
    const list = ((await res.json()) as { data?: Better[] }).data ?? []
    if (cosmetic) return list[0] ?? null
    const own = words(p.name_fr)
    return list.find((c) => [...words(c.name_fr)].some((w) => own.has(w))) ?? null
  } catch {
    return null
  }
}

const SCAN_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" /><path d="M8 9v6M11 9v6M14 9v6M17 9v6" /></svg>
)
const CHECK_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10" /></svg>
)

export default function ScanPage() {
  const { t } = useLocale()
  const [sheet, setSheet] = useState<Sheet | null>(null)

  const handleScan = useCallback(async (barcode: string) => {
    const t0 = performance.now()
    setSheet({ kind: 'loading', barcode })

    // Mesure d'usage (C12) : 1× par produit et par session, comme la fiche produit
    const seenKey = `bayen_scanned_${barcode}`
    let seen = false
    try { seen = sessionStorage.getItem(seenKey) === '1' } catch { /* stockage indisponible */ }

    try {
      const req: ScanRequest & { device_type: 'mobile' | 'desktop'; track: boolean } = {
        barcode,
        session_id: getSessionId(),
        device_type: window.matchMedia('(max-width: 768px)').matches ? 'mobile' : 'desktop',
        track: !seen,
      }
      const res = await scanBarcode(req)
      try { sessionStorage.setItem(seenKey, '1') } catch { /* stockage indisponible */ }

      if (!res.found) {
        setSheet({ kind: 'unknown', barcode })
        return
      }

      const { product, score } = res
      const total = score?.total ?? product.scan_score ?? null
      const worst = (score?.additives_detail ?? [])
        .filter((a) => RISK_ORDER.includes(a.risk_level))
        .sort((a, b) => RISK_ORDER.indexOf(a.risk_level) - RISK_ORDER.indexOf(b.risk_level))[0]

      // Historique local (C14) : la liste « Scans récents » se met à jour en direct
      addToHistory({
        barcode,
        name_fr: product.name_fr,
        brand: product.brand ?? null,
        image_front: product.image_front ?? null,
        scan_score: total,
        score_label: score?.label ?? product.score_label ?? null,
      })

      setSheet({
        kind: 'found',
        barcode,
        product,
        score: total,
        worst: worst ? { code: worst.code, risk: worst.risk_level } : null,
        seconds: (performance.now() - t0) / 1000,
        better: null,
      })

      const better = await findBetter(product, total)
      if (better) setSheet((s) => (s?.kind === 'found' && s.barcode === barcode ? { ...s, better } : s))
    } catch {
      // API indisponible ou code non EAN-8/13 : la fiche produit fait sa propre recherche
      window.location.href = `/produit/${barcode}`
    }
  }, [])

  const next = (): void => setSheet(null)

  return (
    <div className="grid gap-[26px] md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] md:items-start md:gap-8">
      <BarcodeScanner onScan={handleScan} disabled={sheet !== null} />

      <div className="section content-start gap-[26px] md:gap-6">
        <h1 className="sr-only md:not-sr-only disp d-l md:text-[40px]">{t('scan.title')}</h1>

        {/* Feuille de résultat : remonte du bas sur mobile, carte à côté de la caméra sur ordinateur */}
        {sheet && (
          <section
            key={sheet.barcode}
            role="status"
            aria-live="polite"
            className="card animate-fade-up fixed inset-x-2.5 bottom-3 z-[60] mx-auto grid max-w-md gap-3.5 rounded-[28px] px-4 pb-4 pt-[18px] shadow-[0_-4px_0_var(--color-hard)] md:static md:z-auto md:mx-0 md:max-w-none md:shadow-[4px_4px_0_var(--color-hard)]"
          >
            <span className="h-[5px] w-11 justify-self-center rounded-[9px] bg-muted-foreground/40 md:hidden" aria-hidden="true" />

            {sheet.kind === 'loading' && (
              <div className="grid grid-cols-[84px_minmax(0,1fr)] items-center gap-3">
                <div className="tint-figue flex size-[84px] items-end justify-center overflow-hidden rounded-2xl border-2 border-line">
                  <img src="/mascotte/naanaa-loupe.webp" alt="" width="56" height="82" className="naanaa-bob h-auto w-14" />
                </div>
                <div className="grid min-w-0 gap-1.5">
                  <p className="eyebrow">{t('scan.loading')}…</p>
                  <p className="disp d-s truncate">{sheet.barcode}</p>
                  <div className="skeleton h-2.5 w-3/4" />
                </div>
              </div>
            )}

            {sheet.kind === 'unknown' && (
              <>
                <div className="grid grid-cols-[84px_minmax(0,1fr)] items-center gap-3">
                  <div className="tint-citron flex size-[84px] items-end justify-center overflow-hidden rounded-2xl border-2 border-line">
                    <img src="/mascotte/naanaa-oups.webp" alt="" width="56" height="82" className="h-auto w-14" />
                  </div>
                  <div className="min-w-0">
                    <p className="disp d-s">{t('contrib.unknownTitle')}</p>
                    <p className="muted mt-1 text-[12.5px]"><b className="text-foreground">{sheet.barcode}</b> {t('contrib.unknownDesc')}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <button type="button" className="btn" onClick={next}>{SCAN_ICON} {t('scan.next')}</button>
                  <a className="btn primary" href={`/contribuer/${sheet.barcode}`}>{t('contrib.addThis')}</a>
                </div>
              </>
            )}

            {sheet.kind === 'found' && <FoundSheet sheet={sheet} onNext={next} />}
          </section>
        )}

        {/* Invitation de Naânaa + conseils (sous la caméra sur mobile) */}
        <div className="naanaa">
          <img src="/mascotte/naanaa-scan.webp" alt="" width="72" height="106" />
          <p className="bubble">{t('scan.subtitle')}</p>
        </div>
        <div className="grid gap-3">
          <div className="sec-head"><h2 className="disp d-m">{t('scan.tips.title')}</h2></div>
          <ul className="card grid gap-2 p-4 text-sm text-muted-foreground">
            {(['scan.tip1', 'scan.tip2', 'scan.tip3'] as const).map((k) => (
              <li key={k} className="flex items-start gap-2">
                <span className="mt-0.5 size-4 shrink-0 text-brand-ink [&>svg]:size-4">{CHECK_ICON}</span>
                {t(k)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

/** Contenu de la feuille quand le produit est trouvé (maquette Scan) */
function FoundSheet({ sheet, onNext }: { sheet: Extract<Sheet, { kind: 'found' }>; onNext: () => void }) {
  const { t, locale } = useLocale()
  const { product, barcode } = sheet
  const img = product.image_front
    ? (product.image_front.startsWith('http')
        ? product.image_front
        : `${CDN_URL}/${product.image_front}?width=168&height=168&fit=cover&quality=80&format=webp`)
    : null
  const quantity = (product as { quantity?: string }).quantity
  const meta = [product.brand, quantity].filter(Boolean).join(' · ')
  const sugars = product.product_type !== 'cosmetic' ? product.sugars : null

  return (
    <>
      <div className="grid grid-cols-[84px_minmax(0,1fr)_auto] items-center gap-3">
        <div className={cn('tile size-[84px]', product.product_type === 'cosmetic' ? 'tint-framboise' : productTint(barcode))}>
          {img && <img src={img} alt={product.name_fr} />}
        </div>
        <div className="min-w-0">
          <p className="eyebrow">{t('scan.foundIn').replace('{n}', sheet.seconds.toLocaleString('fr-FR', { maximumFractionDigits: 1 }))}</p>
          <p className="disp d-s mt-[3px] line-clamp-2">{product.name_fr}</p>
          {meta && <p className="muted truncate text-[12.5px]">{meta}</p>}
        </div>
        <ScoreSticker score={sheet.score} locale={locale} />
      </div>

      {(sugars != null || sheet.worst || product.is_halal) && (
        <div className="chips">
          {sugars != null && (
            <span className={cn('chip', sugars > 12.5 && 'fill bg-[#FFC9BC]')}>
              {t('scan.sugarsPer100').replace('{n}', sugars.toLocaleString('fr-FR', { maximumFractionDigits: 1 }))}
            </span>
          )}
          {sheet.worst && (
            <span className="chip fill" style={{ background: RISK_FILL[sheet.worst.risk] }}>
              {sheet.worst.code} · {t(RISK_KEY[sheet.worst.risk]).toLowerCase()}
            </span>
          )}
          {product.is_halal && <span className="chip fill bg-[#BFF0DC]">{CHECK_ICON} {t('halal.badge')}</span>}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2.5">
        <button type="button" className="btn" onClick={onNext}>{SCAN_ICON} {t('scan.next')}</button>
        <a className="btn primary" href={`/produit/${barcode}`}>
          {t('scan.seeProduct')}
          <svg className="rtl:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </a>
      </div>

      {sheet.better && (
        <a href={`/produit/${sheet.better.barcode}`} className="flex items-center gap-2.5 rounded-[14px] bg-muted px-3 py-2.5 text-[13.5px]">
          <ScoreSticker score={sheet.better.scan_score} size="sm" className="size-[38px]" locale={locale} />
          <span className="min-w-0"><b>{t('scan.better')}</b> {sheet.better.name_fr}{sheet.better.brand ? ` · ${sheet.better.brand}` : ''}</span>
        </a>
      )}
    </>
  )
}
