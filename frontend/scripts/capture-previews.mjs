/**
 * Capture chaque .card de /previews en PNG transparent.
 * Sortie : frontend/previews-out/*.png
 *
 * Usage : node scripts/capture-previews.mjs
 * Prérequis : dev server lancé sur http://localhost:4321
 */
import puppeteer from 'puppeteer'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '..', 'previews-out')
await mkdir(outDir, { recursive: true })

const URL = process.env.PREVIEW_URL || 'http://localhost:4321/previews'
const SCALE = Number(process.env.SCALE || 3) // 3× pour retina

const browser = await puppeteer.launch({
  args: ['--no-sandbox', '--force-device-scale-factor=' + SCALE],
})
const page = await browser.newPage()
await page.setViewport({ width: 1000, height: 1200, deviceScaleFactor: SCALE })
await page.goto(URL, { waitUntil: 'networkidle0' })

// Attendre que les fonts soient chargées
await page.evaluate(() => document.fonts.ready)

// Masquer la dev toolbar Astro (bleeds in screenshot)
await page.addStyleTag({ content: 'astro-dev-toolbar,astro-dev-overlay{display:none!important}' })
await new Promise((r) => setTimeout(r, 300))

const blocks = await page.$$('.preview-block')
console.log(`Found ${blocks.length} preview blocks`)

for (let i = 0; i < blocks.length; i++) {
  const block = blocks[i]
  // Récupérer le label + la card imbriquée
  const label = await block.$eval('.preview-label', (el) => el.textContent.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'))
  const card = await block.$('.card')
  if (!card) continue

  const outPath = join(outDir, `${String(i + 1).padStart(2, '0')}-${label}.png`)
  await card.screenshot({ path: outPath, omitBackground: true })
  console.log(`✓ ${outPath}`)
}

await browser.close()
console.log(`\nDone → ${outDir}`)
