import { Badge } from '@/components/ui/badge'
import type { EstadoFactura } from '@/lib/types'

const config: Record<EstadoFactura, { label: string; className: string }> = {
  valida: {
    label: 'Válida',
    className: 'bg-[--color-success-bg] text-[--color-success] border-[--color-success]/30 hover:bg-[--color-success-bg]',
  },
  invalida: {
    label: 'Inválida',
    className: 'bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/10',
  },
  pendiente: {
    label: 'Pendiente',
    className: 'bg-[--color-warning-bg] text-[--color-warning] border-[--color-warning]/30 hover:bg-[--color-warning-bg]',
  },
}

export function EstadoBadge({ estado }: { estado: EstadoFactura }) {
  const { label, className } = config[estado] ?? config.pendiente
  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  )
}
