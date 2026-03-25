/**
 * Seed catégories de produits alimentaires — 12 catégories initiales
 *
 * Usage :
 *   npx tsx scripts/seed-categories.ts
 *
 * Prérequis :
 *   - Directus en marche sur DIRECTUS_URL
 *   - Token admin dans DIRECTUS_ADMIN_TOKEN
 */

import 'dotenv/config'

const DIRECTUS_URL = process.env.DIRECTUS_URL ?? 'http://localhost:8055'
const DIRECTUS_ADMIN_TOKEN = process.env.DIRECTUS_ADMIN_TOKEN

if (!DIRECTUS_ADMIN_TOKEN) {
  console.error('DIRECTUS_ADMIN_TOKEN requis. Ajoutez-le dans .env')
  process.exit(1)
}

interface Category {
  name_fr: string
  name_ar: string
  slug: string
  icon: string
}

// Catégories initiales définies dans SPEC.md §5
const categories: Category[] = [
  {
    name_fr: 'Biscuits & gâteaux',
    name_ar: 'بسكويت و حلويات',
    slug: 'biscuits-gateaux',
    icon: 'cookie',
  },
  {
    name_fr: 'Céréales & petit-déjeuner',
    name_ar: 'حبوب و فطور',
    slug: 'cereales-petit-dejeuner',
    icon: 'wheat',
  },
  {
    name_fr: 'Produits laitiers',
    name_ar: 'منتجات الحليب',
    slug: 'produits-laitiers',
    icon: 'milk',
  },
  {
    name_fr: 'Charcuterie & viandes',
    name_ar: 'لحوم و مصبرات',
    slug: 'charcuterie-viandes',
    icon: 'beef',
  },
  {
    name_fr: 'Boissons sucrées',
    name_ar: 'مشروبات غازية',
    slug: 'boissons-sucrees',
    icon: 'cup-soda',
  },
  {
    name_fr: 'Eaux & jus',
    name_ar: 'مياه و عصائر',
    slug: 'eaux-jus',
    icon: 'glass-water',
  },
  {
    name_fr: 'Conserves',
    name_ar: 'معلبات',
    slug: 'conserves',
    icon: 'package',
  },
  {
    name_fr: 'Épices & condiments',
    name_ar: 'توابل و بهارات',
    slug: 'epices-condiments',
    icon: 'flame',
  },
  {
    name_fr: 'Huiles & graisses',
    name_ar: 'زيوت و دهون',
    slug: 'huiles-graisses',
    icon: 'droplet',
  },
  {
    name_fr: 'Snacks & chips',
    name_ar: 'شيبس و مقرمشات',
    slug: 'snacks-chips',
    icon: 'popcorn',
  },
  {
    name_fr: 'Pain & viennoiseries',
    name_ar: 'خبز و معجنات',
    slug: 'pain-viennoiseries',
    icon: 'croissant',
  },
  {
    name_fr: 'Plats préparés',
    name_ar: 'وجبات جاهزة',
    slug: 'plats-prepares',
    icon: 'utensils-crossed',
  },
]

async function seedCategories(): Promise<void> {
  console.log(`Seed de ${categories.length} catégories dans ${DIRECTUS_URL}...`)

  let created = 0
  let skipped = 0
  let errors = 0

  for (const category of categories) {
    try {
      // Vérifier si le slug existe déjà
      const checkRes = await fetch(
        `${DIRECTUS_URL}/items/categories?filter[slug][_eq]=${category.slug}&limit=1`,
        {
          headers: {
            Authorization: `Bearer ${DIRECTUS_ADMIN_TOKEN}`,
          },
        }
      )

      if (checkRes.ok) {
        const data = await checkRes.json()
        if (data.data && data.data.length > 0) {
          skipped++
          continue
        }
      }

      // Créer la catégorie
      const createRes = await fetch(`${DIRECTUS_URL}/items/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${DIRECTUS_ADMIN_TOKEN}`,
        },
        body: JSON.stringify(category),
      })

      if (createRes.ok) {
        created++
      } else {
        const err = await createRes.text()
        console.error(`Erreur ${category.slug}: ${err}`)
        errors++
      }
    } catch (e) {
      console.error(`Erreur réseau ${category.slug}:`, e)
      errors++
    }
  }

  console.log(`\nRésultat :`)
  console.log(`  Créées   : ${created}`)
  console.log(`  Existantes : ${skipped}`)
  console.log(`  Erreurs   : ${errors}`)
  console.log(`  Total     : ${categories.length}`)
}

seedCategories().catch(console.error)
