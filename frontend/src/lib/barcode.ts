/**
 * Génération locale de codes-barres EAN-13 / EAN-8 / UPC-A en SVG.
 *
 * Remplace l'image chargée depuis barcodeapi.org : dépendance tierce, chargement
 * différé qui laissait un rectangle blanc vide sur mobile, et fuite du code
 * scanné vers un service externe à chaque vue de fiche.
 *
 * Encodage GS1 : 3 tables (L, G, R) de 7 modules par chiffre, la parité du
 * premier chiffre d'un EAN-13 choisit L ou G pour les 6 chiffres suivants.
 * Rendu = 95 modules (EAN-13) ou 67 (EAN-8), gardes allongées.
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
 * Barres d'un code-barres en SVG (sans chiffres), ou null si le code est invalide.
 * Les modules contigus sont fusionnés en une barre aux bouts arrondis (style
 * « Marché Pop ») : les largeurs restent exactes, le code reste lisible par un
 * lecteur. Couleur = currentColor ; les chiffres sont posés en HTML par la page
 * (police de la marque), voir barcodeGroups().
 */
export function barcodeSvg(code: string): string | null {
  const bits = modules(code)
  if (!bits) return null
  const isEan13 = bits.length === 95
  const barH = 52
  // Gardes (début, centre, fin) allongées, comme sur un emballage
  const guard = new Set(isEan13 ? [0, 2, 46, 48, 92, 94] : [0, 2, 32, 34, 64, 66])

  let rects = ''
  for (let i = 0; i < bits.length; ) {
    if (bits[i] !== '1') { i++; continue }
    let j = i
    while (bits[j] === '1') j++
    const h = guard.has(i) ? barH + 6 : barH
    rects += `<rect x="${i}" y="0" width="${j - i}" height="${h}" rx="0.5"/>`
    i = j
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${bits.length} ${barH + 6}" width="100%" height="100%" ` +
    `preserveAspectRatio="none" aria-hidden="true" fill="currentColor">${rects}</svg>`
  )
}

/** Chiffres groupés comme sous les barres : EAN-13 « 6 111246 722206 », EAN-8 « 1234 5670 ». */
export function barcodeGroups(code: string): string[] {
  let c = code.replace(/\D/g, '')
  if (c.length === 12) c = '0' + c
  if (c.length === 13) return [c[0], c.slice(1, 7), c.slice(7)]
  if (c.length === 8) return [c.slice(0, 4), c.slice(4)]
  return [c]
}
