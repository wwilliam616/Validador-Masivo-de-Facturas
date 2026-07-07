'use client'

import { useCallback, useState } from 'react'
import { pdfToBase64Pages, imageFileToBase64 } from '@/lib/pdf-to-images-base64'
import { Progress } from '@/components/ui/progress'
import type { Factura } from '@/lib/types'

interface UploadZoneProps {
  onSuccess: (factura: Factura) => void
}

type FileStatus = 'pending' | 'ocr' | 'saving' | 'done' | 'error'

interface QueueItem {
  id: string
  file: File
  status: FileStatus
  progress: number
  error?: string
}

export function UploadZone({ onSuccess }: UploadZoneProps) {
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isRunning, setIsRunning] = useState(false)

  const updateItem = useCallback(
    (id: string, patch: Partial<QueueItem>) =>
      setQueue((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item))),
    [],
  )

  /**
   * Sends a single image (as base64) to the server-side /api/ocr endpoint,
   * which forwards it to OpenRouter and returns the extracted text.
   */
  const ocrPage = useCallback(
    async (base64: string, mediaType: string): Promise<string> => {
      const res = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: base64, media_type: mediaType }),
      })

      const json = await res.json()

      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? 'Error al procesar OCR con IA.')
      }

      return json.texto as string
    },
    [],
  )

  const processFile = useCallback(
    async (item: QueueItem) => {
      const { id, file } = item

      updateItem(id, { status: 'ocr', progress: 5 })

      try {
        const isPdf =
          file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')

        const textParts: string[] = []

        if (isPdf) {
          // Convert each PDF page to base64 PNG, then OCR each page individually
          const pages = await pdfToBase64Pages(file)

          for (let i = 0; i < pages.length; i++) {
            updateItem(id, {
              progress: 5 + Math.round(((i) / pages.length) * 70),
            })
            const pageText = await ocrPage(pages[i], 'image/png')
            textParts.push(pageText)
            updateItem(id, {
              progress: 5 + Math.round(((i + 1) / pages.length) * 70),
            })
          }
        } else {
          // Single image file
          updateItem(id, { progress: 20 })
          const { base64, mediaType } = await imageFileToBase64(file)
          updateItem(id, { progress: 40 })
          const pageText = await ocrPage(base64, mediaType)
          textParts.push(pageText)
          updateItem(id, { progress: 75 })
        }

        const texto_crudo = textParts.join('\n')

        updateItem(id, { status: 'saving', progress: 80 })

        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nombre_archivo: file.name, texto_crudo }),
        })

        const json = await res.json()

        if (!res.ok || !json.ok) {
          updateItem(id, { status: 'error', error: json.error ?? 'Error desconocido' })
          return
        }

        updateItem(id, { status: 'done', progress: 100 })
        onSuccess(json.factura)
      } catch (err) {
        console.error('processFile error:', err)
        updateItem(id, {
          status: 'error',
          error: err instanceof Error ? err.message : 'Error al procesar el archivo.',
        })
      }
    },
    [updateItem, onSuccess, ocrPage],
  )

  const runQueue = useCallback(
    async (items: QueueItem[]) => {
      setIsRunning(true)
      // Process sequentially to avoid rate-limiting on the OpenRouter API
      for (const item of items) {
        await processFile(item)
      }
      setIsRunning(false)
    },
    [processFile],
  )

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return

      const newItems: QueueItem[] = Array.from(files).map((file) => ({
        id: `${Date.now()}-${Math.random()}`,
        file,
        status: 'pending',
        progress: 0,
      }))

      setQueue((prev) => [...prev, ...newItems])
      runQueue(newItems)
    },
    [runQueue],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      handleFiles(e.dataTransfer.files)
    },
    [handleFiles],
  )

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  const clearDone = () =>
    setQueue((prev) => prev.filter((i) => i.status !== 'done' && i.status !== 'error'))

  const hasDoneOrError = queue.some((i) => i.status === 'done' || i.status === 'error')

  return (
    <div className="flex flex-col gap-4">
      {/* Drop zone */}
      <label
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={[
          'flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors cursor-pointer select-none',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50 hover:bg-muted/30',
        ].join(' ')}
      >
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/bmp,image/tiff,application/pdf"
          multiple
          className="sr-only"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="flex size-14 items-center justify-center rounded-full bg-muted">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-muted-foreground"
            aria-hidden="true"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="18" x2="12" y2="12" />
            <line x1="9" y1="15" x2="15" y2="15" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Arrastrar facturas aquí</p>
          <p className="mt-1 text-xs text-muted-foreground">
            PDF, JPG, PNG, WEBP, BMP, TIFF — máx. 10 MB — múltiples archivos permitidos
          </p>
        </div>
        <span className="rounded-md border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          Seleccionar archivos
        </span>
      </label>

      {/* Per-file queue */}
      {queue.length > 0 && (
        <div className="flex flex-col gap-2">
          {queue.map((item) => (
            <div
              key={item.id}
              className="rounded-lg border border-border bg-card px-4 py-3 text-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="truncate font-medium text-foreground max-w-[60%]">
                  {item.file.name}
                </span>
                <span
                  className={[
                    'shrink-0 text-xs font-medium',
                    item.status === 'done' ? 'text-[--color-success]' : '',
                    item.status === 'error' ? 'text-destructive' : '',
                    item.status === 'ocr' || item.status === 'saving' || item.status === 'pending'
                      ? 'text-muted-foreground'
                      : '',
                  ].join(' ')}
                >
                  {item.status === 'pending' && 'En cola...'}
                  {item.status === 'ocr' && `Analizando con IA ${item.progress}%`}
                  {item.status === 'saving' && 'Guardando...'}
                  {item.status === 'done' && 'Completado'}
                  {item.status === 'error' && (item.error ?? 'Error')}
                </span>
              </div>

              {(item.status === 'ocr' || item.status === 'saving') && (
                <Progress
                  value={item.status === 'saving' ? 90 : item.progress}
                  className="mt-2 h-1"
                />
              )}
            </div>
          ))}

          {hasDoneOrError && (
            <button
              onClick={clearDone}
              disabled={isRunning}
              className="self-end text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground disabled:opacity-40"
            >
              Limpiar completados
            </button>
          )}
        </div>
      )}
    </div>
  )
}
