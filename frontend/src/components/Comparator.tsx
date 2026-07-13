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

function scoreColor(s: number | null): string {
  if (s == null) return '#9ca3af'
  if (s >= 75) return '#476a32'
  if (s >= 50) return '#b1cf3a'
  if (s >= 25) return '#f97316'
  return '#ef4444'
}

const addCount = (p: Product) => (Array.isArray(p.additives) ? p.additives.length : 0)

/** Slot de sélection d'un produit (recherche + résultat). */
function ProductSlot({ product, onPick, onClear, placeholder }: {
  product: Product | null
  onPick: (p: Product) => void
  onClear: () => void
  placeholder: string
}) {
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
    return (
      <div className="rounded-xl border bg-card p-3 relative">
        <button onClick={onClear} className="absolute top-2 right-2 p-1 rounded-md hover:bg-muted text-muted-foreground" aria-label="Retirer">
          <X className="h-4 w-4" />
        </button>
        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
            {product.image_front ? (
              <img src={product.image_front.startsWith('http') ? product.image_front : `${CDN_URL}/${product.image_front}?width=160&height=160&fit=cover&format=webp`} alt={product.name_fr} className="w-full h-full object-cover" />
            ) : <div className="w-full h-full" />}
          </div>
          <p className="text-sm font-semibold line-clamp-2 leading-tight">{product.name_fr}</p>
          <p className="text-xs text-muted-foreground">{product.brand}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-dashed bg-card/50 p-3 relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          placeholder={placeholder}
          className="w-full h-10 rounded-lg border border-input bg-background pl-9 pr-3 text-sm"
        />
      </div>
      {open && results.length > 0 && (
        <ul className="absolute z-20 left-3 right-3 mt-1 max-h-64 overflow-y-auto rounded-lg border bg-popover shadow-lg">
          {results.map((r) => (
            <li key={r.barcode}>
              <button
                onClick={() => { onPick(r); setQ(''); setResults([]); setOpen(false) }}
                className="w-full flex items-center gap-2 p-2 hover:bg-muted text-left"
              >
                <div className="w-9 h-9 rounded bg-muted overflow-hidden flex-shrink-0">
                  {r.image_front && <img src={r.image_front.startsWith('http') ? r.image_front : `${CDN_URL}/${r.image_front}?width=80&height=80&fit=cover&format=webp`} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">{r.name_fr}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{r.brand}</p>
                </div>
                {r.scan_score != null && (
                  <span className="text-xs font-bold flex-shrink-0" style={{ color: scoreColor(r.scan_score) }}>{r.scan_score}</span>
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
    <div className="space-y-5">
      {/* Slots */}
      <div className="grid grid-cols-2 gap-3">
        <ProductSlot product={a} onPick={setA} onClear={() => { setA(null); setVerdict(null) }} placeholder={t('cmp.pickA')} />
        <ProductSlot product={b} onPick={setB} onClear={() => { setB(null); setVerdict(null) }} placeholder={t('cmp.pickB')} />
      </div>

      {a && b && (
        <>
          {/* Bandeau gagnant */}
          {winner !== 'EGALITE' && (
            <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4 flex items-center gap-3">
              <Trophy className="h-6 w-6 text-primary flex-shrink-0" />
              <p className="text-sm">
                {t('cmp.betterChoice')} <span className="font-bold">{(winner === 'A' ? a : b).name_fr}</span>
              </p>
            </div>
          )}

          {/* Tableau comparatif */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className={i % 2 ? 'bg-muted/30' : ''}>
                    <td className={`px-3 py-2.5 text-center font-semibold ${r.better === 'A' ? 'text-green-700 dark:text-green-300' : ''}`}>{r.av}</td>
                    <td className="px-2 py-2.5 text-center text-[11px] text-muted-foreground whitespace-nowrap">{r.label}</td>
                    <td className={`px-3 py-2.5 text-center font-semibold ${r.better === 'B' ? 'text-green-700 dark:text-green-300' : ''}`}>{r.bv}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Verdict IA */}
          <div className="rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/20 p-4">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-violet-700 dark:text-violet-300 mb-2">
              <Sparkles className="h-4 w-4" />
              {t('cmp.verdictTitle')}
            </h3>
            {loadingVerdict ? (
              <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />{t('cmp.thinking')}</p>
            ) : verdict ? (
              <div className="space-y-2">
                <p className="text-sm text-foreground/90 leading-relaxed">{verdict.raison}</p>
                {verdict.conseil && (
                  <p className="text-sm text-foreground/80 leading-relaxed flex gap-2">
                    <Lightbulb className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    {verdict.conseil}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('cmp.verdictUnavailable')}</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
