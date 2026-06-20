'use client'

import { Fragment, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { EstadoBadge } from '@/components/estado-badge'
import type { Factura } from '@/lib/types'

interface FacturasTableProps {
  facturas: Factura[]
  total: number
  page: number
  pageSize: number
  isLoading: boolean
  onFilterChange: (params: { estado: string; busqueda: string; page: number }) => void
  onExport: (formato: 'xlsx' | 'json') => void
  onDelete: (id: string) => Promise<void>
}

function formatGs(n: number | null) {
  if (n === null) return '—'
  return new Intl.NumberFormat('es-PY', {
    style: 'currency',
    currency: 'PYG',
    maximumFractionDigits: 0,
  }).format(n)
}

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat('es-PY', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

export function FacturasTable({
  facturas,
  total,
  page,
  pageSize,
  isLoading,
  onFilterChange,
  onExport,
  onDelete,
}: FacturasTableProps) {
  const [busqueda, setBusqueda] = useState('')
  const [estado, setEstado] = useState('todos')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const applyFilters = (newEstado?: string, newBusqueda?: string) => {
    onFilterChange({
      estado: newEstado ?? estado,
      busqueda: newBusqueda ?? busqueda,
      page: 1,
    })
  }

  const handleEstadoChange = (val: string | null) => {
    const next = val ?? 'todos'
    setEstado(next)
    applyFilters(next, busqueda)
  }

  const handleBusquedaChange = (val: string) => {
    setBusqueda(val)
    // debounce-like: apply on change
    applyFilters(estado, val)
  }

  const handlePage = (newPage: number) => {
    onFilterChange({ estado, busqueda, page: newPage })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filters row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-2">
          <Input
            placeholder="Buscar por RUC, N° factura, archivo..."
            value={busqueda}
            onChange={(e) => handleBusquedaChange(e.target.value)}
            className="max-w-xs"
          />
          <Select value={estado} onValueChange={handleEstadoChange}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="valida">Válidas</SelectItem>
              <SelectItem value="invalida">Inválidas</SelectItem>
              <SelectItem value="pendiente">Pendientes</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onExport('xlsx')}
            disabled={isLoading}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-1.5"
              aria-hidden="true"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onExport('json')}
            disabled={isLoading}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-1.5"
              aria-hidden="true"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            JSON
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[160px]">Archivo</TableHead>
              <TableHead>RUC Emisor</TableHead>
              <TableHead>N° Factura</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="text-right">Monto Total</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-[120px]">Cargado</TableHead>
              <TableHead className="w-[48px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-4 w-full animate-pulse rounded bg-muted" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : facturas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                  No se encontraron facturas.
                </TableCell>
              </TableRow>
            ) : (
              facturas.map((f) => (
                <Fragment key={f.id}>
                  <TableRow
                    className="cursor-pointer"
                    onClick={() => setExpandedId(expandedId === f.id ? null : f.id)}
                  >
                    <TableCell className="max-w-[160px] truncate font-medium" title={f.nombre_archivo}>
                      {f.nombre_archivo}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{f.ruc_emisor ?? '—'}</TableCell>
                    <TableCell className="font-mono text-xs">{f.numero_factura ?? '—'}</TableCell>
                    <TableCell className="text-xs">{f.fecha_emision ?? '—'}</TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {formatGs(f.monto_total)}
                    </TableCell>
                    <TableCell>
                      <EstadoBadge estado={f.estado} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(f.creado_en)}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        disabled={deletingId === f.id}
                        aria-label="Eliminar factura"
                        onClick={async () => {
                          if (!confirm(`¿Eliminar "${f.nombre_archivo}"?`)) return
                          setDeletingId(f.id)
                          await onDelete(f.id)
                          setDeletingId(null)
                        }}
                      >
                        {deletingId === f.id ? (
                          <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                  {expandedId === f.id && (
                    <TableRow key={`${f.id}-expanded`} className="bg-muted/30 hover:bg-muted/30">
                      <TableCell colSpan={8}>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-1 py-2 text-xs sm:grid-cols-4">
                          <div>
                            <span className="text-muted-foreground">RUC Receptor</span>
                            <p className="font-mono font-medium">{f.ruc_receptor ?? '—'}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">IVA 10%</span>
                            <p className="font-mono font-medium">{formatGs(f.iva_10)}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">IVA 5%</span>
                            <p className="font-mono font-medium">{formatGs(f.iva_5)}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Exentas</span>
                            <p className="font-mono font-medium">{formatGs(f.exentas)}</p>
                          </div>
                          {f.errores && f.errores.length > 0 && (
                            <div className="col-span-2 sm:col-span-4">
                              <span className="text-muted-foreground">Errores de validación</span>
                              <ul className="mt-1 list-disc pl-4 text-destructive">
                                {f.errores.map((e, i) => (
                                  <li key={i}>{e}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {total === 0
            ? 'Sin resultados'
            : `Mostrando ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} de ${total}`}
        </span>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || isLoading}
            onClick={() => handlePage(page - 1)}
          >
            Anterior
          </Button>
          <span className="flex items-center px-3 text-xs">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || isLoading}
            onClick={() => handlePage(page + 1)}
          >
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  )
}
