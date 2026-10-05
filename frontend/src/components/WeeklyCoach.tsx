/**
 * Coach hebdo — carte sur le journal repas. À la demande, l'IA (Qwen) lit les
 * repas de la semaine et écrit un bilan bienveillant + conseils. Le résultat
 * est mis en cache par semaine (localStorage) pour ne pas régénérer à chaque
 * visite. Non-médical.
 */

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { useLocale } from '@/lib/i18n'
import { getAccessToken, isAuthenticated } from '@/lib/auth'
import { Sparkles, Loader2, Lightbulb, RefreshCw } from 'lucide-react'

const DIRECTUS_URL = '/api/directus'

interface CoachResult {
  enough: boolean
  nb_repas?: number
  bilan?: string
  conseils?: string[]
}

/** Clé de semaine ISO (année-semaine) pour le cache. */
function weekKey(): string {
  const d = new Date()
  const day = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - day)
  return `bayen_coach_${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

export default function WeeklyCoach() {
  const { t } = useLocale()
  const [result, setResult] = useState<CoachResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  // Le coach exige un compte : inutile de proposer un bouton qui échouera.
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null)
  useEffect(() => { setLoggedIn(isAuthenticated()) }, [])

  // Charger le cache de la semaine
  useEffect(() => {
    try {
      const cached = window.localStorage.getItem(weekKey())
      if (cached) setResult(JSON.parse(cached) as CoachResult)
    } catch { /* ignore */ }
  }, [])

  const generate = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const token = await getAccessToken()
      if (!token) { setError(true); return }
      const res = await fetch(`${DIRECTUS_URL}/bayen-api/weekly-coach`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      })
      if (!res.ok) { setError(true); return }
      const data = (await res.json()) as CoachResult
      setResult(data)
      if (data.enough) {
        try { window.localStorage.setItem(weekKey(), JSON.stringify(data)) } catch { /* ignore */ }
      }
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  if (loggedIn !== true) return null

  return (
    <section className="rounded-2xl border bg-card p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="pop-chip h-8 gap-2 border-encre bg-ai text-sm font-bold text-encre">
          <Sparkles className="h-4 w-4" />
          {t('coach.title')}
        </h2>
        {result?.enough && !loading && (
          <button onClick={generate} className="text-xs text-muted-foreground hover:text-ai-ink inline-flex items-center gap-1">
            <RefreshCw className="h-3 w-3" />{t('coach.refresh')}
          </button>
        )}
      </div>

      {loading ? (
        <div className="naanaa">
          <img src="/mascotte/naanaa-loupe.webp" alt="" width="64" height="94" className="naanaa-bob" />
          <p className="bubble flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />{t('coach.thinking')}</p>
        </div>
      ) : result == null ? (
        <div className="space-y-3">
          <div className="naanaa">
            <img src="/mascotte/naanaa-astuce.webp" alt="" width="64" height="94" />
            <p className="bubble">{t('coach.intro')}</p>
          </div>
          <Button onClick={generate} size="sm" className="bg-ai text-ai-foreground hover:bg-ai/90">
            <Sparkles className="mr-1.5 h-4 w-4" />{t('coach.generate')}
          </Button>
        </div>
      ) : error ? (
        <div className="naanaa">
          <img src="/mascotte/naanaa-oups.webp" alt="" width="64" height="94" />
          <p className="bubble">{t('coach.error')}</p>
        </div>
      ) : !result.enough ? (
        <div className="naanaa">
          <img src="/mascotte/naanaa-astuce.webp" alt="" width="64" height="94" />
          <p className="bubble">{t('coach.notEnough')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Le bilan sort de la bouche de Naânaa (pose « astuce ») */}
          <div className="naanaa items-start">
            <img src="/mascotte/naanaa-astuce.webp" alt="" width="64" height="94" />
            <p className="bubble leading-relaxed">{result.bilan}</p>
          </div>
          {result.conseils && result.conseils.length > 0 && (
            <ul className="space-y-1.5">
              {result.conseils.map((c, i) => (
                <li key={i} className="flex gap-2 text-sm text-foreground/85">
                  <Lightbulb className="h-4 w-4 text-ai-ink flex-shrink-0 mt-0.5" />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-[11px] text-muted-foreground italic">{t('coach.caveat')}</p>
        </div>
      )}
    </section>
  )
}
