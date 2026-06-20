/**
 * Converts a PDF File into an array of HTMLCanvasElements (one per page) using
 * pdfjs-dist running entirely in the browser.
 *
 * Returning canvases (instead of Blobs) means Tesseract.js can read them
 * directly without needing an intermediate object URL.
 *
 * Each page is rendered at 2× scale so Tesseract gets enough resolution.
 */
export async function pdfToCanvases(file: File): Promise<HTMLCanvasElement[]> {
  // Dynamic import keeps pdfjs out of the server bundle
  const pdfjsLib = await import('pdfjs-dist')

  // Point the worker at the bundled worker shipped with pdfjs-dist
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString()

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  const canvases: HTMLCanvasElement[] = []
  const SCALE = 3.0

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const viewport = page.getViewport({ scale: SCALE })

    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height

    const ctx = canvas.getContext('2d')!
    await page.render({ canvas, canvasContext: ctx, viewport }).promise

    canvases.push(canvas)
  }

  return canvases
}
