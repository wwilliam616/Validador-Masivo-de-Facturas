import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'ID requerido.' }, { status: 400 })
    }

    const supabase = await createClient()
    const { error } = await supabase.from('facturas').delete().eq('id', id)

    if (error) {
      console.error('Delete factura error:', error)
      return NextResponse.json({ error: 'Error al eliminar la factura.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Delete factura unexpected error:', err)
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 })
  }
}
