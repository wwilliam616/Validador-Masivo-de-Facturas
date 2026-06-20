import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { extraerYValidar } from '@/lib/validar-factura'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { nombre_archivo, texto_crudo } = body as {
      nombre_archivo?: string
      texto_crudo?: string
    }

    if (!nombre_archivo || texto_crudo === undefined) {
      return NextResponse.json(
        { ok: false, error: 'Faltan campos requeridos: nombre_archivo y texto_crudo.' },
        { status: 400 },
      )
    }

    if (typeof texto_crudo !== 'string') {
      return NextResponse.json({ ok: false, error: 'texto_crudo debe ser una cadena.' }, { status: 400 })
    }

    // Validate and extract structured data from OCR text
    const { datos, estado, errores } = extraerYValidar(texto_crudo)

    // Persist to Supabase
    const supabase = await createClient()
    const { data: inserted, error: dbError } = await supabase
      .from('facturas')
      .insert({
        nombre_archivo,
        texto_crudo,
        estado,
        errores: errores.length > 0 ? errores : null,
        ...datos,
      })
      .select()
      .single()

    if (dbError) {
      console.error('Supabase insert error:', dbError)
      return NextResponse.json({ ok: false, error: 'Error al guardar en base de datos.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, factura: inserted })
  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json({ ok: false, error: 'Error interno del servidor.' }, { status: 500 })
  }
}
