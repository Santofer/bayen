const { chromium } = require(process.env.PW || '/Users/amine/Code/karakeep/node_modules/playwright')
;(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1100, height: 1000 } })
  await p.goto('file:///Users/amine/Code/bayen/design/social/suwar/assets/page.html', { waitUntil: 'networkidle' }); await p.waitForTimeout(1200)
  for (const el of await p.$$('.s, .f')) { const id = await el.getAttribute('id')
    if (id.startsWith('stk-')) await (await el.$('svg')).screenshot({ path: '/Users/amine/Code/bayen/design/social/suwar/assets/' + id + '.png', omitBackground: true })
    else await el.screenshot({ path: '/Users/amine/Code/bayen/design/social/suwar/assets/' + id + '.png' }) }
  await b.close() })()