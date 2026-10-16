/**
 * Section "Analyse santé" — commentaires explicatifs par nutriment
 * Inspirée de la section "Santé" d'Open Food Facts
 * Affiche des alertes contextuelles basées sur les données du produit
 * Entièrement traduit FR / darija
 */

import { useLocale } from '@/lib/i18n'
import type { TranslationKey } from '@/lib/translations'
import {
  Tag, Factory, Candy, Droplet, Sparkles, Wheat, Dumbbell, Zap, FlaskConical, HeartPulse,
} from 'lucide-react'

interface HealthAnalysisProps {
  nutrition: {
    energy_kcal?: number | null
    fat_total?: number | null
    fat_saturated?: number | null
    sugars?: number | null
    salt?: number | null
    fiber?: number | null
    proteins?: number | null
  }
  novaGroup?: number | null
  nutriscoreGrade?: string | null
  additives?: string[]
  ingredients?: string
}

export type NutrientLevel = 'good' | 'moderate' | 'warning' | 'danger'

interface HealthAlert {
  icon: React.ReactNode
  title: string
  description: string
  level: NutrientLevel
}

/** Aplat de la pastille d'icône par niveau (texte encre dessus) : menthe → citron → orange → tomate */
const LEVEL_FILL: Record<NutrientLevel, string> = {
  good: 'bg-score-excellent',
  moderate: 'bg-citron',
  warning: 'bg-score-mediocre',
  danger: 'bg-score-mauvais',
}

/** Même échelle en couleur CSS (barres « Pourquoi ? » de la fiche, en style en ligne) */
export const LEVEL_COLOR: Record<NutrientLevel, string> = {
  good: 'var(--color-score-excellent)',
  moderate: 'var(--color-citron)',
  warning: 'var(--color-score-mediocre)',
  danger: 'var(--color-score-mauvais)',
}

/**
 * Niveau d'un nutriment « à limiter » pour 100 g — seuils des alertes ci-dessous,
 * partagés avec les barres « Pourquoi ? » de la fiche (une seule source).
 * Sucres entre 5 et 12,5 g : pas d'alerte, niveau « moderate » pour la barre.
 */
export function nutrientLevel(key: 'sugars' | 'fat_saturated' | 'salt', v: number): NutrientLevel {
  if (key === 'sugars') return v > 22.5 ? 'danger' : v > 12.5 ? 'warning' : v <= 5 ? 'good' : 'moderate'
  if (key === 'fat_saturated') return v > 5 ? 'danger' : v > 1.5 ? 'moderate' : 'good'
  return v > 1.5 ? 'danger' : v > 0.6 ? 'moderate' : 'good'
}

// Puce compacte posée sur un aplat (texte encre)
const FILL_CHIP = 'chip fill h-[22px] px-2 text-[11px]'

type T = (key: string) => string

function generateAlerts(props: HealthAnalysisProps, t: T): HealthAlert[] {
  const alerts: HealthAlert[] = []
  const n = props.nutrition

  // Nutri-Score
  if (props.nutriscoreGrade) {
    const grade = props.nutriscoreGrade.toUpperCase() as 'A' | 'B' | 'C' | 'D' | 'E'
    const gradeInfo: Record<string, { level: HealthAlert['level']; titleKey: string; descKey: string }> = {
      A: { level: 'good', titleKey: 'health.ns.a.title', descKey: 'health.ns.a.desc' },
      B: { level: 'good', titleKey: 'health.ns.b.title', descKey: 'health.ns.b.desc' },
      C: { level: 'moderate', titleKey: 'health.ns.c.title', descKey: 'health.ns.c.desc' },
      D: { level: 'warning', titleKey: 'health.ns.d.title', descKey: 'health.ns.d.desc' },
      E: { level: 'danger', titleKey: 'health.ns.e.title', descKey: 'health.ns.e.desc' },
    }
    const info = gradeInfo[grade]
    if (info) {
      alerts.push({ icon: <Tag size={16} className="text-current" />, title: t(info.titleKey), description: t(info.descKey), level: info.level })
    }
  }

  // NOVA
  if (props.novaGroup) {
    const novaInfo: Record<number, { level: HealthAlert['level']; titleKey: string; descKey: string }> = {
      1: { level: 'good', titleKey: 'health.nova.1.title', descKey: 'health.nova.1.desc' },
      2: { level: 'moderate', titleKey: 'health.nova.2.title', descKey: 'health.nova.2.desc' },
      3: { level: 'moderate', titleKey: 'health.nova.3.title', descKey: 'health.nova.3.desc' },
      4: { level: 'danger', titleKey: 'health.nova.4.title', descKey: 'health.nova.4.desc' },
    }
    const info = novaInfo[props.novaGroup]
    if (info) {
      alerts.push({ icon: <Factory size={16} className="text-current" />, title: t(info.titleKey), description: t(info.descKey), level: info.level })
    }
  }

  // Sucres, graisses saturées, sel : niveau donné par nutrientLevel(), puis son texte
  if (n.sugars != null) {
    const level = nutrientLevel('sugars', n.sugars)
    const k = level === 'danger' ? 'high' : level === 'warning' ? 'mod' : level === 'good' ? 'low' : null
    if (k) alerts.push({ icon: <Candy size={16} className="text-current" />, title: `${t(`health.sugars.${k}`)} : ${n.sugars} g / 100g`, description: t(`health.sugars.${k}.desc`), level })
  }
  if (n.fat_saturated != null) {
    const level = nutrientLevel('fat_saturated', n.fat_saturated)
    const k = level === 'danger' ? 'high' : level === 'moderate' ? 'mod' : null
    if (k) alerts.push({ icon: <Droplet size={16} className="text-current" />, title: `${t(`health.fat.${k}`)} : ${n.fat_saturated} g / 100g`, description: t(`health.fat.${k}.desc`), level })
  }
  if (n.salt != null) {
    const level = nutrientLevel('salt', n.salt)
    const k = level === 'danger' ? 'high' : level === 'moderate' ? 'mod' : null
    if (k) alerts.push({ icon: <Sparkles size={16} className="text-current" />, title: `${t(`health.salt.${k}`)} : ${n.salt} g / 100g`, description: t(`health.salt.${k}.desc`), level })
  }

  // Fibres
  if (n.fiber != null) {
    if (n.fiber >= 6) {
      alerts.push({ icon: <Wheat size={16} className="text-current" />, title: `${t('health.fiber.high')} : ${n.fiber} g / 100g`, description: t('health.fiber.high.desc'), level: 'good' })
    } else if (n.fiber >= 3) {
      alerts.push({ icon: <Wheat size={16} className="text-current" />, title: `${t('health.fiber.mod')} : ${n.fiber} g / 100g`, description: t('health.fiber.mod.desc'), level: 'good' })
    }
  }

  // Protéines
  if (n.proteins != null && n.proteins >= 20) {
    alerts.push({ icon: <Dumbbell size={16} className="text-current" />, title: `${t('health.protein.high')} : ${n.proteins} g / 100g`, description: t('health.protein.high.desc'), level: 'good' })
  }

  // Énergie
  if (n.energy_kcal != null) {
    if (n.energy_kcal > 500) {
      alerts.push({ icon: <Zap size={16} className="text-current" />, title: `${t('health.energy.high')} : ${n.energy_kcal} kcal / 100g`, description: t('health.energy.high.desc'), level: 'warning' })
    }
  }

  // Additifs
  if (props.additives && props.additives.length > 0) {
    const count = props.additives.length
    if (count >= 5) {
      alerts.push({ icon: <FlaskConical size={16} className="text-current" />, title: `${count} ${t('health.add.many')}`, description: t('health.add.many.desc'), level: 'danger' })
    } else if (count >= 3) {
      alerts.push({ icon: <FlaskConical size={16} className="text-current" />, title: `${count} ${t('health.add.some')}`, description: t('health.add.some.desc'), level: 'warning' })
    } else {
      alerts.push({ icon: <FlaskConical size={16} className="text-current" />, title: `${count} ${t('health.add.few')}`, description: t('health.add.few.desc'), level: 'moderate' })
    }
  }

  return alerts
}

export default function HealthAnalysis(props: HealthAnalysisProps) {
  const { t } = useLocale()
  // Clés construites dynamiquement (health.ns.a.title…) : toutes existent dans translations.ts
  const alerts = generateAlerts(props, (key) => t(key as TranslationKey))

  if (alerts.length === 0) return null

  // Compter par niveau
  const goodCount = alerts.filter(a => a.level === 'good').length
  const badCount = alerts.filter(a => a.level === 'danger' || a.level === 'warning').length

  return (
    <section className="section">
      <div className="sec-head">
        <h2 className="disp d-m flex items-center gap-2">
          <HeartPulse size={18} className="flex-none text-current" /> {t('health.title')}
        </h2>
        <div className="chips flex-nowrap">
          {goodCount > 0 && (
            <span className={`${FILL_CHIP} bg-score-excellent`}>
              {goodCount} {goodCount > 1 ? t('health.positivesPlural') : t('health.positives')}
            </span>
          )}
          {badCount > 0 && (
            <span className={`${FILL_CHIP} bg-tomate`}>
              {badCount} {badCount > 1 ? t('health.alertsPlural') : t('health.alerts')}
            </span>
          )}
        </div>
      </div>

      <div className="card space-y-2 p-4">
        {alerts.map((alert, i) => (
          <div key={i} className="flex items-start gap-3 rounded-xl border-[1.5px] border-line bg-background/60 p-3">
            {/* Pastille d'icône en aplat : le niveau se lit à la couleur, le texte reste neutre */}
            <span className={`grid size-8 flex-shrink-0 place-items-center rounded-full border-2 border-encre text-encre ${LEVEL_FILL[alert.level]}`}>
              {alert.icon}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{alert.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{alert.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
