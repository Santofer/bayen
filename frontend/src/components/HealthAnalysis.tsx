/**
 * Section "Analyse santé" — commentaires explicatifs par nutriment
 * Inspirée de la section "Santé" d'Open Food Facts
 * Affiche des alertes contextuelles basées sur les données du produit
 */

import { Badge } from '@/components/ui/badge'
import { useLocale } from '@/lib/i18n'
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

function generateAlerts(props: HealthAnalysisProps): HealthAlert[] {
  const alerts: HealthAlert[] = []
  const n = props.nutrition

  // Nutri-Score
  if (props.nutriscoreGrade) {
    const grade = props.nutriscoreGrade.toUpperCase()
    const gradeInfo: Record<string, { level: HealthAlert['level']; desc: string }> = {
      A: { level: 'good', desc: 'Excellente qualité nutritionnelle. Ce produit fait partie des meilleurs choix de sa catégorie.' },
      B: { level: 'good', desc: 'Bonne qualité nutritionnelle. Un choix favorable pour une alimentation équilibrée.' },
      C: { level: 'moderate', desc: 'Qualité nutritionnelle moyenne. À consommer avec modération dans le cadre d\'une alimentation variée.' },
      D: { level: 'warning', desc: 'Qualité nutritionnelle médiocre. Privilégiez des alternatives mieux notées quand c\'est possible.' },
      E: { level: 'danger', desc: 'Mauvaise qualité nutritionnelle. Ce produit est à limiter dans votre alimentation quotidienne.' },
    }
    const info = gradeInfo[grade]
    if (info) {
      alerts.push({ icon: <Tag size={18} className="text-current" />, title: `Nutri-Score ${grade}`, description: info.desc, level: info.level })
    }
  }

  // NOVA
  if (props.novaGroup) {
    const novaInfo: Record<number, { level: HealthAlert['level']; desc: string }> = {
      1: { level: 'good', desc: 'Aliment non transformé ou minimalement transformé. C\'est le meilleur choix pour votre santé.' },
      2: { level: 'moderate', desc: 'Ingrédient culinaire transformé (huile, beurre, sucre...). Utilisé en cuisine pour préparer des plats.' },
      3: { level: 'moderate', desc: 'Aliment transformé (conserves, fromages, pain...). Produit modifié par des procédés industriels simples.' },
      4: { level: 'danger', desc: 'Produit ultra-transformé. Contient des additifs, arômes ou ingrédients qu\'on ne trouve pas dans une cuisine domestique. La consommation régulière est associée à des risques pour la santé.' },
    }
    const info = novaInfo[props.novaGroup]
    if (info) {
      alerts.push({ icon: <Factory size={18} className="text-current" />, title: `NOVA ${props.novaGroup} — ${props.novaGroup === 4 ? 'Ultra-transformé' : props.novaGroup === 1 ? 'Non transformé' : 'Transformé'}`, description: info.desc, level: info.level })
    }
  }

  // Sucres
  if (n.sugars != null) {
    if (n.sugars > 22.5) {
      alerts.push({ icon: <Candy size={18} className="text-current" />, title: `Sucres élevés : ${n.sugars} g / 100g`, description: 'Ce produit contient une quantité élevée de sucres (> 22,5 g/100g). L\'OMS recommande de limiter les sucres ajoutés à moins de 25 g par jour.', level: 'danger' })
    } else if (n.sugars > 12.5) {
      alerts.push({ icon: <Candy size={18} className="text-current" />, title: `Sucres modérés : ${n.sugars} g / 100g`, description: 'Ce produit contient une quantité modérée de sucres. Vérifiez les portions consommées.', level: 'warning' })
    } else if (n.sugars <= 5) {
      alerts.push({ icon: <Candy size={18} className="text-current" />, title: `Faible en sucres : ${n.sugars} g / 100g`, description: 'Ce produit est faible en sucres (≤ 5 g/100g). Bon point !', level: 'good' })
    }
  }

  // Graisses saturées
  if (n.fat_saturated != null) {
    if (n.fat_saturated > 5) {
      alerts.push({ icon: <Droplet size={18} className="text-current" />, title: `Graisses saturées élevées : ${n.fat_saturated} g / 100g`, description: 'Riche en acides gras saturés (> 5 g/100g). Les AGS en excès augmentent le risque cardiovasculaire. Privilégiez les produits à base d\'huile d\'olive ou de colza.', level: 'danger' })
    } else if (n.fat_saturated > 1.5) {
      alerts.push({ icon: <Droplet size={18} className="text-current" />, title: `Graisses saturées modérées : ${n.fat_saturated} g / 100g`, description: 'Teneur modérée en acides gras saturés.', level: 'moderate' })
    }
  }

  // Sel
  if (n.salt != null) {
    if (n.salt > 1.5) {
      alerts.push({ icon: <Sparkles size={18} className="text-current" />, title: `Sel élevé : ${n.salt} g / 100g`, description: `Ce produit contient ${n.salt} g de sel pour 100g (> 1,5 g). L'excès de sel favorise l'hypertension. L'OMS recommande max 5 g/jour.`, level: 'danger' })
    } else if (n.salt > 0.6) {
      alerts.push({ icon: <Sparkles size={18} className="text-current" />, title: `Sel modéré : ${n.salt} g / 100g`, description: 'Teneur modérée en sel. Surveillez votre apport total journalier.', level: 'moderate' })
    }
  }

  // Fibres
  if (n.fiber != null) {
    if (n.fiber >= 6) {
      alerts.push({ icon: <Wheat size={18} className="text-current" />, title: `Riche en fibres : ${n.fiber} g / 100g`, description: 'Excellente source de fibres (≥ 6 g/100g). Les fibres favorisent la digestion et la satiété.', level: 'good' })
    } else if (n.fiber >= 3) {
      alerts.push({ icon: <Wheat size={18} className="text-current" />, title: `Source de fibres : ${n.fiber} g / 100g`, description: 'Bonne source de fibres (≥ 3 g/100g).', level: 'good' })
    }
  }

  // Protéines
  if (n.proteins != null && n.proteins >= 20) {
    alerts.push({ icon: <Dumbbell size={18} className="text-current" />, title: `Riche en protéines : ${n.proteins} g / 100g`, description: 'Excellente source de protéines. Les protéines contribuent au maintien de la masse musculaire.', level: 'good' })
  }

  // Énergie
  if (n.energy_kcal != null) {
    if (n.energy_kcal > 500) {
      alerts.push({ icon: <Zap size={18} className="text-current" />, title: `Très calorique : ${n.energy_kcal} kcal / 100g`, description: 'Produit très riche en calories. Attention aux portions.', level: 'warning' })
    }
  }

  // Additifs
  if (props.additives && props.additives.length > 0) {
    const count = props.additives.length
    if (count >= 5) {
      alerts.push({ icon: <FlaskConical size={18} className="text-current" />, title: `${count} additifs détectés`, description: 'Ce produit contient un nombre élevé d\'additifs. Certains additifs peuvent avoir des effets indésirables en cas de consommation régulière.', level: 'danger' })
    } else if (count >= 3) {
      alerts.push({ icon: <FlaskConical size={18} className="text-current" />, title: `${count} additifs détectés`, description: 'Présence de plusieurs additifs. Consultez la liste pour vérifier s\'ils sont à éviter.', level: 'warning' })
    } else {
      alerts.push({ icon: <FlaskConical size={18} className="text-current" />, title: `${count} additif${count > 1 ? 's' : ''} détecté${count > 1 ? 's' : ''}`, description: 'Peu d\'additifs dans ce produit.', level: 'moderate' })
    }
  }

  return alerts
}

export default function HealthAnalysis(props: HealthAnalysisProps) {
  const { t } = useLocale()
  const alerts = generateAlerts(props)

  if (alerts.length === 0) return null

  // Compter par niveau
  const goodCount = alerts.filter(a => a.level === 'good').length
  const badCount = alerts.filter(a => a.level === 'danger' || a.level === 'warning').length

  return (
    <div className="rounded-xl border bg-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
          <HeartPulse size={16} className="text-current" /> Analyse santé
        </h2>
        <div className="flex gap-1.5">
          {goodCount > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-800 font-medium">
              {goodCount} point{goodCount > 1 ? 's' : ''} positif{goodCount > 1 ? 's' : ''}
            </span>
          )}
          {badCount > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-medium">
              {badCount} alerte{badCount > 1 ? 's' : ''}
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
