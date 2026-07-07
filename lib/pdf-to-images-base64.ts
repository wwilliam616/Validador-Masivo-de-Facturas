/**
 * Converts a PDF File into an array of base64-encoded PNG strings (one per page)
 * using pdfjs-dist running entirely in the browser.
 *
 * Returns base64 data (without the "data:image/png;base64," prefix) so they
 * can be sent directly to the /api/ocr endpoint.
 *
 * Each page is rendered at 3× scale for maximum OCR accuracy.
 */
export async function pdfToBase64Pages(file: File): Promise<string[]> {
  const pdfjsLib = await import('pdfjs-dist')

  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString()

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  const pages: string[] = []
  const SCALE = 3.0

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const viewport = page.getViewport({ scale: SCALE })

    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height

    const ctx = canvas.getContext('2d')!
    await page.render({ canvas, canvasContext: ctx, viewport }).promise

    // Strip the "data:image/png;base64," prefix — the API route adds it back
    const dataUrl = canvas.toDataURL('image/png')
    const base64 = dataUrl.split(',')[1]
    pages.push(base64)
  }

  return pages
}

/**
 * Converts an image File (JPG, PNG, WEBP, BMP, TIFF) to a base64 string.
 * Returns { base64, mediaType } ready to send to /api/ocr.
 */
export async function imageFileToBase64(file: File): Promise<{ base64: string; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // result = "data:<mediaType>;base64,<data>"
      const [header, base64] = result.split(',')
      const mediaType = header.replace('data:', '').replace(';base64', '')
      resolve({ base64, mediaType })
    }
    reader.onerror = () => reject(new Error('Error al leer el archivo.'))
    reader.readAsDataURL(file)
  })
}
