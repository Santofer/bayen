/**
 * Section "Analyse santé" — commentaires explicatifs par nutriment
 * Inspirée de la section "Santé" d'Open Food Facts
 * Affiche des alertes contextuelles basées sur les données du produit
 * Entièrement traduit FR / darija
 */

import { Badge } from '@/components/ui/badge'
import { useLocale } from '@/lib/i18n'
import type { Locale } from '@/lib/translations'
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

interface HealthAlert {
  icon: React.ReactNode
  title: string
  description: string
  level: 'good' | 'moderate' | 'warning' | 'danger'
}

const LEVEL_COLORS = {
  good: { bg: 'bg-green-50 dark:bg-green-950/40', border: 'border-green-200 dark:border-green-800', text: 'text-green-800 dark:text-green-300', badge: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300' },
  moderate: { bg: 'bg-yellow-50 dark:bg-yellow-950/40', border: 'border-yellow-200 dark:border-yellow-800', text: 'text-yellow-800 dark:text-yellow-300', badge: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300' },
  warning: { bg: 'bg-orange-50 dark:bg-orange-950/40', border: 'border-orange-200 dark:border-orange-800', text: 'text-orange-800 dark:text-orange-300', badge: 'bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-300' },
  danger: { bg: 'bg-red-50 dark:bg-red-950/40', border: 'border-red-200 dark:border-red-800', text: 'text-red-800 dark:text-red-300', badge: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300' },
}

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
      alerts.push({ icon: <Tag size={18} className="text-current" />, title: t(info.titleKey), description: t(info.descKey), level: info.level })
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
      alerts.push({ icon: <Factory size={18} className="text-current" />, title: t(info.titleKey), description: t(info.descKey), level: info.level })
    }
  }

  // Sucres
  if (n.sugars != null) {
    if (n.sugars > 22.5) {
      alerts.push({ icon: <Candy size={18} className="text-current" />, title: `${t('health.sugars.high')} : ${n.sugars} g / 100g`, description: t('health.sugars.high.desc'), level: 'danger' })
    } else if (n.sugars > 12.5) {
      alerts.push({ icon: <Candy size={18} className="text-current" />, title: `${t('health.sugars.mod')} : ${n.sugars} g / 100g`, description: t('health.sugars.mod.desc'), level: 'warning' })
    } else if (n.sugars <= 5) {
      alerts.push({ icon: <Candy size={18} className="text-current" />, title: `${t('health.sugars.low')} : ${n.sugars} g / 100g`, description: t('health.sugars.low.desc'), level: 'good' })
    }
  }

  // Graisses saturées
  if (n.fat_saturated != null) {
    if (n.fat_saturated > 5) {
      alerts.push({ icon: <Droplet size={18} className="text-current" />, title: `${t('health.fat.high')} : ${n.fat_saturated} g / 100g`, description: t('health.fat.high.desc'), level: 'danger' })
    } else if (n.fat_saturated > 1.5) {
      alerts.push({ icon: <Droplet size={18} className="text-current" />, title: `${t('health.fat.mod')} : ${n.fat_saturated} g / 100g`, description: t('health.fat.mod.desc'), level: 'moderate' })
    }
  }

  // Sel
  if (n.salt != null) {
    if (n.salt > 1.5) {
      alerts.push({ icon: <Sparkles size={18} className="text-current" />, title: `${t('health.salt.high')} : ${n.salt} g / 100g`, description: t('health.salt.high.desc'), level: 'danger' })
    } else if (n.salt > 0.6) {
      alerts.push({ icon: <Sparkles size={18} className="text-current" />, title: `${t('health.salt.mod')} : ${n.salt} g / 100g`, description: t('health.salt.mod.desc'), level: 'moderate' })
    }
  }

  // Fibres
  if (n.fiber != null) {
    if (n.fiber >= 6) {
      alerts.push({ icon: <Wheat size={18} className="text-current" />, title: `${t('health.fiber.high')} : ${n.fiber} g / 100g`, description: t('health.fiber.high.desc'), level: 'good' })
    } else if (n.fiber >= 3) {
      alerts.push({ icon: <Wheat size={18} className="text-current" />, title: `${t('health.fiber.mod')} : ${n.fiber} g / 100g`, description: t('health.fiber.mod.desc'), level: 'good' })
    }
  }

  // Protéines
  if (n.proteins != null && n.proteins >= 20) {
    alerts.push({ icon: <Dumbbell size={18} className="text-current" />, title: `${t('health.protein.high')} : ${n.proteins} g / 100g`, description: t('health.protein.high.desc'), level: 'good' })
  }

  // Énergie
  if (n.energy_kcal != null) {
    if (n.energy_kcal > 500) {
      alerts.push({ icon: <Zap size={18} className="text-current" />, title: `${t('health.energy.high')} : ${n.energy_kcal} kcal / 100g`, description: t('health.energy.high.desc'), level: 'warning' })
    }
  }

  // Additifs
  if (props.additives && props.additives.length > 0) {
    const count = props.additives.length
    if (count >= 5) {
      alerts.push({ icon: <FlaskConical size={18} className="text-current" />, title: `${count} ${t('health.add.many')}`, description: t('health.add.many.desc'), level: 'danger' })
    } else if (count >= 3) {
      alerts.push({ icon: <FlaskConical size={18} className="text-current" />, title: `${count} ${t('health.add.some')}`, description: t('health.add.some.desc'), level: 'warning' })
    } else {
      alerts.push({ icon: <FlaskConical size={18} className="text-current" />, title: `${count} ${t('health.add.few')}`, description: t('health.add.few.desc'), level: 'moderate' })
    }
  }

  return alerts
}

export default function HealthAnalysis(props: HealthAnalysisProps) {
  const { t } = useLocale()
  const alerts = generateAlerts(props, t)

  if (alerts.length === 0) return null

  // Compter par niveau
  const goodCount = alerts.filter(a => a.level === 'good').length
  const badCount = alerts.filter(a => a.level === 'danger' || a.level === 'warning').length

  return (
    <div className="rounded-xl border bg-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
          <HeartPulse size={16} className="text-current" /> {t('health.title')}
        </h2>
        <div className="flex gap-1.5">
          {goodCount > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-800 font-medium">
              {goodCount} {goodCount > 1 ? t('health.positivesPlural') : t('health.positives')}
            </span>
          )}
          {badCount > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-medium">
              {badCount} {badCount > 1 ? t('health.alertsPlural') : t('health.alerts')}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {alerts.map((alert, i) => {
          const colors = LEVEL_COLORS[alert.level]
          return (
            <div key={i} className={`rounded-lg ${colors.bg} ${colors.border} border p-3`}>
              <div className="flex items-start gap-2.5">
                <span className="text-lg flex-shrink-0 mt-0.5">{alert.icon}</span>
                <div className="min-w-0">
                  <p className={`text-sm font-medium ${colors.text}`}>{alert.title}</p>
                  <p className={`text-xs ${colors.text} opacity-80 mt-0.5 leading-relaxed`}>{alert.description}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
