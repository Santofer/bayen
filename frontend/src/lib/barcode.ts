/**
 * Génération locale de codes-barres EAN-13 / EAN-8 / UPC-A en SVG.
 *
 * Remplace l'image chargée depuis barcodeapi.org : dépendance tierce, chargement
 * différé qui laissait un rectangle blanc vide sur mobile, et fuite du code
 * scanné vers un service externe à chaque vue de fiche.
 *
 * Encodage GS1 : 3 tables (L, G, R) de 7 modules par chiffre, la parité du
 * premier chiffre d'un EAN-13 choisit L ou G pour les 6 chiffres suivants.
 * Rendu = 95 modules (EAN-13) ou 67 (EAN-8), gardes allongées, chiffres
 * imprimés sous les barres comme sur un emballage.
 */

const L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011']
const G = ['0100111', '0110011', '0011011', '0100001', '0011101', '0111001', '0000101', '0010001', '0001001', '0010111']
const R = ['1110010', '1100110', '1101100', '1000010', '1011100', '1001110', '1010000', '1000100', '1001000', '1110100']
/** Parité des 6 chiffres de gauche selon le premier chiffre (L = 0, G = 1). */
const PARITY = ['000000', '001011', '001101', '001110', '010011', '011001', '011100', '010101', '010110', '011010']

function checksumOk(digits: string): boolean {
  const nums = digits.split('').map(Number)
  const check = nums.pop() as number
  // Poids 3 sur les positions impaires en partant de la droite
  const sum = nums.reverse().reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 3 : 1), 0)
  return (10 - (sum % 10)) % 10 === check
}

/** Chaîne de modules ("0"/"1") pour un code valide, ou null. */
function modules(code: string): string | null {
  let c = code.replace(/\D/g, '')
  if (c.length === 12) c = '0' + c // UPC-A → EAN-13
  if (c.length === 13) {
    if (!checksumOk(c)) return null
    const parity = PARITY[Number(c[0])] as string
    const left = c.slice(1, 7).split('').map((d, i) => (parity[i] === '0' ? L : G)[Number(d)]).join('')
    const right = c.slice(7).split('').map((d) => R[Number(d)]).join('')
    return '101' + left + '01010' + right + '101'
  }
  if (c.length === 8) {
    if (!checksumOk(c)) return null
    const left = c.slice(0, 4).split('').map((d) => L[Number(d)]).join('')
    const right = c.slice(4).split('').map((d) => R[Number(d)]).join('')
    return '101' + left + '01010' + right + '101'
  }
  return null
}

/**
 * SVG inline d'un code-barres, ou null si le code est invalide.
 * Le SVG est fluide (width 100%) et conserve son ratio via viewBox.
 */
export function barcodeSvg(code: string): string | null {
  const bits = modules(code)
  if (!bits) return null
  const digits = code.replace(/\D/g, '')
  const isEan13 = bits.length === 95
  const quiet = 9 // marge blanche latérale, en modules
  const width = bits.length + quiet * 2
  const barH = 60
  const textY = barH + 13
  const total = barH + 18

  // Gardes (début, centre, fin) allongées jusqu'au texte
  const guardStarts = isEan13 ? [0, 1, 2, 45, 46, 47, 48, 49, 92, 93, 94] : [0, 1, 2, 31, 32, 33, 34, 35, 64, 65, 66]
  const guard = new Set(guardStarts)

  let rects = ''
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] !== '1') continue
    const h = guard.has(i) ? barH + 6 : barH
    rects += `<rect x="${i + quiet}" y="0" width="1" height="${h}"/>`
  }

  // Chiffres : EAN-13 = 1 chiffre à gauche + 6 + 6 ; EAN-8 = 4 + 4
  const font = `font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="7.5" fill="currentColor"`
  let text = ''
  const d = isEan13 ? '0' + digits.slice(-13) === digits ? digits : digits.padStart(13, '0') : digits
  if (isEan13) {
    text += `<text x="${quiet - 2}" y="${textY}" text-anchor="end" ${font}>${d[0]}</text>`
    text += `<text x="${quiet + 3 + 21}" y="${textY}" text-anchor="middle" ${font} textLength="38" lengthAdjust="spacing">${d.slice(1, 7)}</text>`
    text += `<text x="${quiet + 50 + 21}" y="${textY}" text-anchor="middle" ${font} textLength="38" lengthAdjust="spacing">${d.slice(7)}</text>`
  } else {
    text += `<text x="${quiet + 3 + 14}" y="${textY}" text-anchor="middle" ${font} textLength="24" lengthAdjust="spacing">${d.slice(0, 4)}</text>`
    text += `<text x="${quiet + 36 + 14}" y="${textY}" text-anchor="middle" ${font} textLength="24" lengthAdjust="spacing">${d.slice(4)}</text>`
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${total}" width="100%" height="100%" ` +
    `preserveAspectRatio="xMidYMid meet" role="img" aria-label="Code-barres ${digits}" shape-rendering="crispEdges">` +
    `<rect width="${width}" height="${total}" fill="#fff"/>` +
    `<g fill="#111">${rects}</g>` +
    `<g fill="#111">${text.replace(/fill="currentColor"/g, '')}</g>` +
    `</svg>`
  )
}
