// Captures d'écran RÉELLES de bayen.ma pour les visuels réseaux (téléphone, iPad, ordinateur), thème clair.
//   node captures.mjs [nom ...]   (Playwright emprunté à ~/Code/karakeep : PW=/chemin/vers/node_modules/playwright)
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium, devices } = require(process.env.PW || '/Users/amine/Code/karakeep/node_modules/playwright')
const OUT = new URL('../ecrans/', import.meta.url).pathname
const BASE = process.env.BASE || 'https://bayen.ma'
// Fiche montrée : Leben Jaouda (90/100) — on met en avant un bon produit, jamais une marque mal notée
const PRODUIT = '/produit/6111242104556'
// Comparateur : deux yaourts vanille de la MÊME marque (Assil 100 contre brassé 70) — aucune marque n'en dénigre une autre
const duel = async (page) => {
  const pick = async (i, q, name) => {
    await page.locator('input[placeholder]').first().pressSequentially(q, { delay: 50 }) // l'emplacement rempli n'a plus de champ
    await page.locator('ul button', { hasText: name }).first().click()
  }
  await pick(0, 'vanille', 'Assil vanille')
  await pick(1, 'vanille', 'Yaourt brassé vanille')
  await page.waitForTimeout(15000) // avis de l'IA
}
// Analyse de repas réelle (sans compte : rien n'est enregistré) sur une photo de plat du site
const repas = async (page) => {
  await page.locator('input[type=file]').last().setInputFiles(new URL('plat-test.jpg', import.meta.url).pathname)
  await page.getByRole('button', { name: /Analyser ce plat|حلل هاد الطبق/ }).click()
  await page.getByText(/kcal|سعرة/).first().waitFor({ timeout: 90000 })
  await page.waitForTimeout(1500)
}
const SHOTS = [
  // [fichier, appareil, chemin, défilement, hauteur d'écran (téléphone en plein écran, comme la PWA installée)]
  ['tel-accueil', 'iPhone 14', '/', 0],
  ['tel-produit', 'iPhone 14', PRODUIT, 0],
  ['tel-produit-pourquoi', 'iPhone 14', PRODUIT, 760],
  ['tel-beaute', 'iPhone 14', '/beaute', 0],
  ['tel-proteines', 'iPhone 14', '/proteines', 0],
  ['tel-recherche', 'iPhone 14', '/recherche?sort=-scan_score', 0],
  ['tel-repas', 'iPhone 14', '/analyser-repas', 0],
  ['tel-comparer', 'iPhone 14', '/comparer', 0],
  ['tel-comparer-yaourts', 'iPhone 14', '/comparer', 0, 844, duel],
  ['tel-additifs', 'iPhone 14', '/additifs', 0],
  ['ipad-accueil', 'iPad (gen 7)', '/', 0],
  ['ipad-produit', 'iPad (gen 7)', PRODUIT, 0],
  ['ordi-accueil', null, '/', 0],
  ['ordi-produit', null, PRODUIT, 0],
  // Écrans aux proportions exactes des téléphones des photos Marché Pop (hero/scan.jpg, hero/a-propos.jpg)
  ['photo-scan', 'iPhone 14', PRODUIT, 0, 891],
  ['photo-panier', 'iPhone 14', PRODUIT, 0, 794],
  // Photos du site dont l'écran était vide (accueil, couvertures du journal)
  ['photo-en-ligne', 'iPhone 14', '/', 0, 843],
  ['photo-reflexe', 'iPhone 14', PRODUIT, 0, 903],
  ['photo-actualites', 'iPhone 14', '/blog', 0, 825],
  // Photos Codex à écran magenta (design/social/photos-codex) : proportions mesurées par ecran-dans-photo.py mesure
  ['photo-F1', 'iPhone 14', PRODUIT, 0, 872],
  ['photo-F2', 'iPhone 14', '/beaute', 0, 895],
  ['photo-F3', 'iPhone 14', '/proteines', 0, 862],
  ['photo-F4', 'iPhone 14', '/comparer', 0, 803, duel],
  ['photo-F5', 'iPhone 14', '/analyser-repas', 250, 848, repas],
  ['photo-F6', 'iPhone 14', '/', 0, 840],
  ['photo-F7', 'iPad paysage', PRODUIT, 0],
  ['photo-F8', null, '/', 0],
  // Lot 2 : fiche du couscous Dari (100/100) sur la tablette, écrans en darija pour les posts en arabe
  ['photo-F7-couscous', 'iPad paysage', '/produit/6111094000013', 0],
  ['photo-F5-ar', 'iPhone 14', '/analyser-repas', 250, 848, repas, 'ary'],
  ['photo-pub-repas', 'iPhone 14', '/analyser-repas', 250, 1151, repas], // pub newsletter Où Sortir (écran Codex plus étroit)
  ['photo-F2-ar', 'iPhone 14', '/beaute', 0, 895, null, 'ary'],
  // Lot 3 : flocons d'avoine Javana (100/100, fiche complète) sur la tablette, fiche et protéines en darija
  ['photo-F7-avoine', 'iPad paysage', '/produit/6111180015501', 0],
  ['photo-F1-ar', 'iPhone 14', PRODUIT, 0, 872, null, 'ary'],
  ['photo-F3-ar', 'iPhone 14', '/proteines', 0, 862, null, 'ary'],
]
const browser = await chromium.launch()
const only = process.argv.slice(2)
for (const [name, dev, path, scroll, h, act, lang = 'fr'] of SHOTS.filter((s) => !only.length || only.includes(s[0]))) {
  const opts = !dev ? { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 }
    : dev === 'iPad paysage' ? { ...devices['iPad (gen 7)'], viewport: { width: 1180, height: 820 } }
    : dev.startsWith('iPhone') ? { ...devices[dev], viewport: { width: 390, height: h || 844 } } : { ...devices[dev] }
  const ctx = await browser.newContext({ ...opts, colorScheme: 'light', locale: lang === 'ary' ? 'ar-MA' : 'fr-FR' })
  // Langue du site : cookie (rendu serveur) + localStorage (îlots React)
  await ctx.addCookies([{ name: 'bayen_locale', value: lang, url: BASE }])
  // Invitation « Ajouter à l'écran d'accueil » déjà refusée : elle ne couvre pas la capture
  await ctx.addInitScript((l) => { localStorage.setItem('bayen_install_dismissed', String(Date.now())); localStorage.setItem('bayen_locale', l) }, lang)
  const page = await ctx.newPage()
  await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 45000 })
  if (act) await act(page)
  if (scroll) await page.evaluate((y) => { document.documentElement.style.scrollBehavior = 'auto'; window.scrollTo(0, y) }, scroll)
  await page.waitForTimeout(1200)
  await page.screenshot({ path: `${OUT}${name}.png` })
  await ctx.close()
  console.log('ok', name)
}
await browser.close()
