/**
 * Comparateur de 2 produits.
 *
 * L'utilisateur choisit 2 produits (recherche par nom). Le composant affiche un
 * tableau côte à côte (données réelles, meilleur mis en avant) + un verdict IA
 * (Qwen) : lequel choisir et pourquoi. Le GAGNANT est déterminé par le score
 * Bayen (déterministe) ; l'IA ne rédige que la raison + le conseil.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useLocale } from '@/lib/i18n'
import { Search, X, Loader2, Trophy, Sparkles, Lightbulb } from 'lucide-react'
import { scoreText } from '@/lib/score-colors'
import { cn } from '@/lib/utils'
import { ScoreSticker, productTint } from '@/components/ProductCard'

const DIRECTUS_URL = '/api/directus'
const CDN_URL = import.meta.env.PUBLIC_CDN_URL ?? 'https://api.bayen.ma/assets'

interface Product {
  barcode: string
  name_fr: string
  brand: string | null
  image_front: string | null
  scan_score: number | null
  score_label: string | null
  nutriscore_grade: string | null
  nova_group: number | null
  sugars: number | null
  salt: number | null
  fat_saturated: number | null
  additives: string[] | null
}

const FIELDS = 'barcode,name_fr,brand,image_front,scan_score,score_label,nutriscore_grade,nova_group,sugars,salt,fat_saturated,additives'

const addCount = (p: Product) => (Array.isArray(p.additives) ? p.additives.length : 0)

/** Slot de sélection d'un produit (recherche + résultat). */
function ProductSlot({ product, onPick, onClear, placeholder, isWinner = false, crownLabel = '' }: {
  product: Product | null
  onPick: (p: Product) => void
  onClear: () => void
  placeholder: string
  /** Duel : le gagnant passe sur fond citron + couronne */
  isWinner?: boolean
  crownLabel?: string
}) {
  const { t, locale } = useLocale()
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Product[]>([])
  const [open, setOpen] = useState(false)
  const timer = useRef<number | null>(null)

  useEffect(() => {
    if (product || q.trim().length < 2) { setResults([]); return }
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `${DIRECTUS_URL}/items/products?filter[status][_eq]=published&filter[name_fr][_icontains]=${encodeURIComponent(q.trim())}&filter[scan_score][_nnull]=true&limit=6&sort=-scan_count&fields=${FIELDS}`
        )
        if (res.ok) {
          const json = (await res.json()) as { data: Product[] }
          setResults(json.data ?? [])
          setOpen(true)
        }
      } catch { /* silencieux */ }
    }, 300)
    return () => { if (timer.current) window.clearTimeout(timer.current) }
  }, [q, product])

  if (product) {
    // Carte « fighter » : vignette photo pleine, pastille de score ; le gagnant passe sur fond citron + couronne
    return (
      <div className={cn('card relative grid content-start gap-2 p-2.5 sm:p-3', isWinner && 'tint-citron')}>
        {isWinner && crownLabel && (
          <span className="chip fill absolute -top-3.5 left-1/2 z-10 -translate-x-1/2 border-encre! bg-citron">
            <Trophy aria-hidden="true" /> {crownLabel}
          </span>
        )}
        <div className="relative">
          <div className={cn('tile h-[130px] sm:h-[170px] md:h-[200px]', productTint(product.barcode))}>
            {product.image_front && (
              <img src={product.image_front.startsWith('http') ? product.image_front : `${CDN_URL}/${product.image_front}?width=400&height=400&fit=cover&format=webp`} alt={product.name_fr} />
            )}
          </div>
          <button type="button" onClick={onClear} className="icon-btn absolute end-1.5 top-1.5 size-8" aria-label={t('cart.remove')}>
            <X aria-hidden="true" />
          </button>
          {product.scan_score != null && (
            <span className="absolute -bottom-4 end-0.5">
              <ScoreSticker score={product.scan_score} locale={locale} />
            </span>
          )}
        </div>
        <div className="min-w-0 pt-4">
          <p className="line-clamp-2 text-[13.5px] font-bold leading-tight">{product.name_fr}</p>
          {product.brand && <p className="muted mt-0.5 truncate text-[12px]">{product.brand}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="grid min-h-[210px] content-start gap-2 rounded-[20px] border-2 border-dashed border-line/45 p-2.5 sm:p-3 md:relative md:min-h-[290px]">
      {/* min-w-0 + w-0 : sinon la largeur intrinsèque du champ déborde de l'emplacement sur mobile */}
      <label className="card flex h-11 min-w-0 items-center gap-2 rounded-full px-3 shadow-[2px_2px_0_var(--color-hard)]">
        <Search className="size-4 flex-none" aria-hidden="true" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="w-0 min-w-0 flex-1 border-0 bg-transparent text-[13.5px] font-medium outline-none"
        />
      </label>
      {open && results.length > 0 && (
        // Mobile : la liste prend toute la largeur du duel (l'emplacement fait ~150 px)
        <ul className="card absolute inset-x-0 top-[78px] z-20 max-h-72 overflow-y-auto p-1 md:inset-x-1.5 md:top-[60px]">
          {results.map((r) => (
            <li key={r.barcode}>
              <button
                type="button"
                onClick={() => { onPick(r); setQ(''); setResults([]); setOpen(false) }}
                className="flex w-full items-center gap-2 rounded-[14px] p-1.5 text-start hover:bg-muted"
              >
                {/* Pas de vignette sur mobile : la place va au nom, lisible en entier */}
                <span className={cn('tile size-10 flex-none rounded-[10px] border-[1.5px] max-md:hidden', productTint(r.barcode))}>
                  {r.image_front && <img src={r.image_front.startsWith('http') ? r.image_front : `${CDN_URL}/${r.image_front}?width=80&height=80&fit=cover&format=webp`} alt="" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold leading-snug md:truncate md:text-[12.5px]">{r.name_fr}</span>
                  <span className="muted block truncate text-[11px]">{r.brand}</span>
                </span>
                {r.scan_score != null && (
                  <span className="flex-none font-display text-xs font-extrabold" style={{ color: scoreText(r.scan_score) }}>{r.scan_score}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function Comparator() {
  const { t } = useLocale()
  const [a, setA] = useState<Product | null>(null)
  const [b, setB] = useState<Product | null>(null)
  const [verdict, setVerdict] = useState<{ raison: string; conseil: string } | null>(null)
  const [loadingVerdict, setLoadingVerdict] = useState(false)

  // Gagnant déterministe (score Bayen)
  const sa = a?.scan_score ?? null
  const sb = b?.scan_score ?? null
  const winner: 'A' | 'B' | 'EGALITE' | null =
    a && b ? (sa != null && sb != null ? (sa > sb ? 'A' : sb > sa ? 'B' : 'EGALITE') : 'EGALITE') : null

  const fetchVerdict = useCallback(async () => {
    if (!a || !b || !winner) return
    setLoadingVerdict(true)
    setVerdict(null)
    try {
      const payload = {
        a: { name: a.name_fr, score: a.scan_score, nutriscore: a.nutriscore_grade, nova: a.nova_group, sugars: a.sugars, salt: a.salt, fat_saturated: a.fat_saturated, additives_count: addCount(a) },
        b: { name: b.name_fr, score: b.scan_score, nutriscore: b.nutriscore_grade, nova: b.nova_group, sugars: b.sugars, salt: b.salt, fat_saturated: b.fat_saturated, additives_count: addCount(b) },
        gagnant: winner,
      }
      const res = await fetch('/api/compare', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (res.ok) {
        const data = (await res.json()) as { raison?: string; conseil?: string }
        setVerdict({ raison: data.raison ?? '', conseil: data.conseil ?? '' })
      }
    } catch { /* silencieux */ } finally { setLoadingVerdict(false) }
  }, [a, b, winner])

  useEffect(() => { if (a && b) fetchVerdict() }, [a, b, fetchVerdict])

  // Lignes de comparaison (meilleur = plus bas sauf score : plus haut)
  const rows: Array<{ label: string; av: string; bv: string; better: 'A' | 'B' | null }> = []
  if (a && b) {
    const cmp = (x: number | null, y: number | null, higherBetter: boolean): 'A' | 'B' | null => {
      if (x == null || y == null || x === y) return null
      return (higherBetter ? x > y : x < y) ? 'A' : 'B'
    }
    const g = (v: number | null, unit = '') => (v == null ? '—' : `${v}${unit}`)
    rows.push({ label: t('cmp.score'), av: g(a.scan_score), bv: g(b.scan_score), better: cmp(a.scan_score, b.scan_score, true) })
    rows.push({ label: 'Nutri-Score', av: a.nutriscore_grade ?? '—', bv: b.nutriscore_grade ?? '—', better: null })
    rows.push({ label: 'NOVA', av: g(a.nova_group), bv: g(b.nova_group), better: cmp(a.nova_group, b.nova_group, false) })
    rows.push({ label: t('cmp.sugar'), av: g(a.sugars, ' g'), bv: g(b.sugars, ' g'), better: cmp(a.sugars, b.sugars, false) })
    rows.push({ label: t('cmp.satfat'), av: g(a.fat_saturated, ' g'), bv: g(b.fat_saturated, ' g'), better: cmp(a.fat_saturated, b.fat_saturated, false) })
    rows.push({ label: t('cmp.salt'), av: g(a.salt, ' g'), bv: g(b.salt, ' g'), better: cmp(a.salt, b.salt, false) })
    rows.push({ label: t('cmp.additives'), av: String(addCount(a)), bv: String(addCount(b)), better: cmp(addCount(a), addCount(b), false) })
  }

  return (
    <div className="grid gap-5 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:items-start md:gap-[18px]">
      {/* Duel : deux cartes produit + pastille VS, couronne sur le gagnant */}
      <div className="relative grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-2 pt-4 sm:gap-3">
        <ProductSlot
          product={a} onPick={setA} onClear={() => { setA(null); setVerdict(null) }} placeholder={t('cmp.pickA')}
          isWinner={winner === 'A'} crownLabel={t('cmp.crownLabel')}
        />
        <span className="mt-16 grid size-11 -rotate-8 place-items-center rounded-full border-2 border-encre bg-citron font-display text-[13px] font-extrabold text-encre shadow-[2px_2px_0_var(--color-hard)] md:mt-24" aria-hidden="true">VS</span>
        <ProductSlot
          product={b} onPick={setB} onClear={() => { setB(null); setVerdict(null) }} placeholder={t('cmp.pickB')}
          isWinner={winner === 'B'} crownLabel={t('cmp.crownLabel')}
        />
      </div>

      {a && b ? (
        <div className="grid gap-4 md:pt-4">
          {/* Comparaison ligne à ligne : la meilleure valeur passe en puce menthe */}
          <div className="card overflow-hidden">
            {rows.map((r) => (
              <div key={r.label} className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 border-b-[1.5px] border-line px-3 py-2.5 text-center last:border-b-0">
                <Cell value={r.av} better={r.better === 'A'} />
                <span className="muted whitespace-nowrap text-[11.5px] font-semibold">{r.label}</span>
                <Cell value={r.bv} better={r.better === 'B'} />
              </div>
            ))}
          </div>

          {/* Verdict IA : bulle de Naânaa (le gagnant reste déterminé par le score) */}
          <div className="naanaa grid-cols-[56px_minmax(0,1fr)] items-start">
            <img src="/mascotte/naanaa-astuce.webp" alt="" width="56" height="56" className="size-14" />
            <div className="bubble grid gap-2" aria-live="polite">
              <p className="flex items-center gap-1.5 font-bold">
                <Sparkles className="size-4 text-ai-ink" aria-hidden="true" />
                {t('cmp.verdictTitle')}
              </p>
              {loadingVerdict ? (
                <p className="muted flex items-center gap-2"><Loader2 className="size-4 animate-spin" aria-hidden="true" />{t('cmp.thinking')}</p>
              ) : verdict ? (
                <>
                  <p className="leading-relaxed">{verdict.raison}</p>
                  {verdict.conseil && (
                    <p className="flex gap-2 leading-relaxed">
                      <Lightbulb className="mt-0.5 size-4 flex-none text-brand-ink" aria-hidden="true" />
                      {verdict.conseil}
                    </p>
                  )}
                </>
              ) : (
                <p className="muted">{t('cmp.verdictUnavailable')}</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="naanaa md:pt-4">
          <img src="/mascotte/naanaa-loupe.webp" alt="" width="72" height="72" />
          <p className="bubble">{t('cmp.hint')}</p>
        </div>
      )}
    </div>
  )
}

/** Valeur d'une ligne : la meilleure des deux passe en puce menthe */
function Cell({ value, better }: { value: string; better: boolean }) {
  return better
    ? <span className="chip fill num justify-self-center bg-menthe text-[13px] font-extrabold">{value}</span>
    : <span className="num text-[13.5px] font-semibold">{value}</span>
}
