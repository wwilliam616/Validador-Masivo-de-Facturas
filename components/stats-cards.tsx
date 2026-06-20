import { Card, CardContent } from '@/components/ui/card'
import type { Factura } from '@/lib/types'

interface StatsCardsProps {
  facturas: Factura[]
  total: number
}

function formatGs(amount: number | null): string {
  if (amount === null) return '—'
  return new Intl.NumberFormat('es-PY', {
    style: 'currency',
    currency: 'PYG',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function StatsCards({ facturas, total }: StatsCardsProps) {
  const validas = facturas.filter((f) => f.estado === 'valida').length
  const invalidas = facturas.filter((f) => f.estado === 'invalida').length
  const pendientes = facturas.filter((f) => f.estado === 'pendiente').length
  const sumaTotal = facturas.reduce((acc, f) => acc + (f.monto_total ?? 0), 0)

  const stats = [
    {
      label: 'Total Procesadas',
      value: total.toString(),
      sub: 'en esta vista',
    },
    {
      label: 'Válidas',
      value: validas.toString(),
      sub: `${total > 0 ? Math.round((validas / facturas.length) * 100) : 0}% del total`,
      accent: 'text-[--color-success]',
    },
    {
      label: 'Inválidas',
      value: invalidas.toString(),
      sub: `${total > 0 ? Math.round((invalidas / facturas.length) * 100) : 0}% del total`,
      accent: 'text-destructive',
    },
    {
      label: 'Pendientes',
      value: pendientes.toString(),
      sub: `${total > 0 ? Math.round((pendientes / facturas.length) * 100) : 0}% del total`,
      accent: 'text-[--color-warning]',
    },
    {
      label: 'Monto Total',
      value: formatGs(sumaTotal),
      sub: 'suma de facturas visibles',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {stats.map((s) => (
        <Card key={s.label} className="border-border bg-card">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
            <p className={`mt-1 text-xl font-semibold tracking-tight ${s.accent ?? 'text-foreground'}`}>
              {s.value}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{s.sub}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
