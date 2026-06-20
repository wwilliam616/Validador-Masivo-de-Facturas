import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const formato = searchParams.get('formato') ?? 'xlsx'
    const estado = searchParams.get('estado') ?? ''
    const busqueda = searchParams.get('busqueda') ?? ''

    const supabase = await createClient()

    let query = supabase
      .from('facturas')
      .select('*')
      .order('creado_en', { ascending: false })

    if (estado && estado !== 'todos') {
      query = query.eq('estado', estado)
    }
    if (busqueda) {
      query = query.or(
        `ruc_emisor.ilike.%${busqueda}%,ruc_receptor.ilike.%${busqueda}%,numero_factura.ilike.%${busqueda}%,nombre_archivo.ilike.%${busqueda}%`,
      )
    }

    const { data, error } = await query
    if (error) {
      return NextResponse.json({ error: 'Error al obtener datos.' }, { status: 500 })
    }

    const rows = (data ?? []).map((f) => ({
      'ID': f.id,
      'Archivo': f.nombre_archivo,
      'RUC Emisor': f.ruc_emisor ?? '',
      'RUC Receptor': f.ruc_receptor ?? '',
      'N° Factura': f.numero_factura ?? '',
      'Fecha Emisión': f.fecha_emision ?? '',
      'Monto Total': f.monto_total ?? '',
      'IVA 10%': f.iva_10 ?? '',
      'IVA 5%': f.iva_5 ?? '',
      'Exentas': f.exentas ?? '',
      'Estado': f.estado,
      'Errores': (f.errores ?? []).join('; '),
      'Cargado en': f.creado_en,
    }))

    if (formato === 'json') {
      return new NextResponse(JSON.stringify(data ?? [], null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': 'attachment; filename="facturas.json"',
        },
      })
    }

    // Default: XLSX
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Facturas')
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="facturas.xlsx"',
      },
    })
  } catch (err) {
    console.error('Export error:', err)
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 })
  }
}
