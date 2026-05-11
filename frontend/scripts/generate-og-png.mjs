/**
 * Convertit public/og-default.svg → public/og-default.png (1200×630, JPEG aussi)
 * pour les previews social qui ne supportent pas le SVG (Facebook, WhatsApp).
 *
 * Usage : node scripts/generate-og-png.mjs
 * Prérequis : puppeteer installé (déjà présent pour capture-previews.mjs)
 */
import puppeteer from 'puppeteer'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public')

const svg = readFileSync(join(publicDir, 'og-default.svg'), 'utf-8')
const html = `<!DOCTYPE html>
<html><head><style>html,body{margin:0;padding:0;width:1200px;height:630px;background:#476a32}svg{display:block;width:1200px;height:630px}</style></head>
<body>${svg}</body></html>`

const browser = await puppeteer.launch({ args: ['--no-sandbox'] })
const page = await browser.newPage()
await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 })
await page.setContent(html, { waitUntil: 'domcontentloaded' })

await page.screenshot({ path: join(publicDir, 'og-default.png'), omitBackground: false, type: 'png' })
await page.screenshot({ path: join(publicDir, 'og-default.jpg'), omitBackground: false, type: 'jpeg', quality: 90 })

await browser.close()
console.log('✓ og-default.png + og-default.jpg générés')
