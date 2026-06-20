import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') ?? '10', 10)))
    const estado = searchParams.get('estado') ?? ''
    const busqueda = searchParams.get('busqueda') ?? ''

    const supabase = await createClient()

    let query = supabase
      .from('facturas')
      .select('*', { count: 'exact' })
      .order('creado_en', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1)

    if (estado && estado !== 'todos') {
      query = query.eq('estado', estado)
    }

    if (busqueda) {
      query = query.or(
        `ruc_emisor.ilike.%${busqueda}%,ruc_receptor.ilike.%${busqueda}%,numero_factura.ilike.%${busqueda}%,nombre_archivo.ilike.%${busqueda}%`,
      )
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Resultados query error:', error)
      return NextResponse.json({ error: 'Error al consultar resultados.' }, { status: 500 })
    }

    return NextResponse.json({
      data: data ?? [],
      total: count ?? 0,
      page,
      pageSize,
    })
  } catch (err) {
    console.error('Resultados error:', err)
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 })
  }
}
