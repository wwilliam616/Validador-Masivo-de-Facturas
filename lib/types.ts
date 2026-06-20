export type EstadoFactura = 'valida' | 'invalida' | 'pendiente'

export interface Factura {
  id: string
  nombre_archivo: string
  ruc_emisor: string | null
  ruc_receptor: string | null
  numero_factura: string | null
  fecha_emision: string | null
  monto_total: number | null
  iva_10: number | null
  iva_5: number | null
  exentas: number | null
  estado: EstadoFactura
  errores: string[] | null
  texto_crudo: string | null
  creado_en: string
}

export interface UploadResponse {
  ok: boolean
  factura?: Factura
  error?: string
}

export interface ResultadosResponse {
  data: Factura[]
  total: number
  page: number
  pageSize: number
}
