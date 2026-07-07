import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

// Llama 3.2 11B Vision — Free model optimized for image understanding and OCR.
// Override via OPENROUTER_MODEL env var if needed.
const DEFAULT_MODEL = 'meta-llama/llama-3.2-11b-vision-instruct'

const SYSTEM_PROMPT = `Eres un sistema OCR especializado en facturas paraguayas.
Tu única tarea es extraer TODO el texto visible de la imagen proporcionada,
preservando la estructura original (saltos de línea, espaciado y disposición de columnas).
No interpretes ni analices el contenido — solo transcribe el texto tal como aparece,
incluyendo números, letras, símbolos y cualquier carácter legible.
Responde ÚNICAMENTE con el texto extraído, sin comentarios ni explicaciones adicionales.`

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY

  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: 'OPENROUTER_API_KEY no está configurada en las variables de entorno.' },
      { status: 500 },
    )
  }

  let body: { image_base64?: string; media_type?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Cuerpo de la solicitud inválido.' }, { status: 400 })
  }

  const { image_base64, media_type } = body

  if (!image_base64 || !media_type) {
    return NextResponse.json(
      { ok: false, error: 'Faltan campos requeridos: image_base64 y media_type.' },
      { status: 400 },
    )
  }

  const model = process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
        'X-Title': 'Validador de Facturas Paraguay',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:${media_type};base64,${image_base64}`,
                },
              },
              {
                type: 'text',
                text: SYSTEM_PROMPT,
              },
            ],
          },
        ],
        max_tokens: 4096,
        temperature: 0, // Deterministic — we want exact transcription, not creativity
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('OpenRouter error:', response.status, errText)
      return NextResponse.json(
        { ok: false, error: `Error de OpenRouter (${response.status}): ${errText}` },
        { status: 502 },
      )
    }

    const data = await response.json()
    const texto = data?.choices?.[0]?.message?.content ?? ''

    if (!texto) {
      return NextResponse.json(
        { ok: false, error: 'OpenRouter no devolvió texto en la respuesta.' },
        { status: 502 },
      )
    }

    return NextResponse.json({ ok: true, texto })
  } catch (err) {
    console.error('OCR route error:', err)
    return NextResponse.json({ ok: false, error: 'Error interno al llamar a OpenRouter.' }, { status: 500 })
  }
}