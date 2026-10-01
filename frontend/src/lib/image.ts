/**
 * Réduit une photo avant envoi : ≤ 1280 px, JPEG. Une photo de téléphone fait
 * 3 à 12 Mo (trop lourd en 3G, et refusé au-delà de 8 Mo) ; createImageBitmap
 * applique l'orientation EXIF et, sur iPhone, décode le HEIC en JPEG.
 * Le serveur vision redescend de toute façon à 768 px.
 */
export async function shrink(file: File, maxSide = 1280, quality = 0.82): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas indisponible')
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', quality)
}

/** Même réduction, rendue sous forme de fichier JPEG prêt pour un FormData. */
export async function shrinkToFile(file: File, maxSide = 1280): Promise<File> {
  const blob = await (await fetch(await shrink(file, maxSide))).blob()
  return new File([blob], 'photo.jpg', { type: 'image/jpeg' })
}
