'use client'

import { useCallback, useState } from 'react'
import { UploadZone } from '@/components/upload-zone'
import { FacturasTable } from '@/components/facturas-table'
import { StatsCards } from '@/components/stats-cards'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Factura, ResultadosResponse } from '@/lib/types'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface FilterState {
  estado: string
  busqueda: string
  page: number
}

export function Dashboard() {
  const [filters, setFilters] = useState<FilterState>({
    estado: 'todos',
    busqueda: '',
    page: 1,
  })
  const [activeTab, setActiveTab] = useState('resultados')

  const params = new URLSearchParams({
    page: String(filters.page),
    pageSize: '10',
    ...(filters.estado !== 'todos' && { estado: filters.estado }),
    ...(filters.busqueda && { busqueda: filters.busqueda }),
  })

  const { data, isLoading, mutate } = useSWR<ResultadosResponse>(
    `/api/resultados?${params}`,
    fetcher,
    { keepPreviousData: true },
  )

  const handleUploadSuccess = useCallback(
    (_factura: Factura) => {
      mutate()
      setActiveTab('resultados')
    },
    [mutate],
  )

  const handleFilterChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters)
  }, [])

  const handleDelete = useCallback(
    async (id: string) => {
      await fetch(`/api/facturas/${id}`, { method: 'DELETE' })
      mutate()
    },
    [mutate],
  )

  const handleExport = useCallback(
    (formato: 'xlsx' | 'json') => {
      const exportParams = new URLSearchParams({
        formato,
        ...(filters.estado !== 'todos' && { estado: filters.estado }),
        ...(filters.busqueda && { busqueda: filters.busqueda }),
      })
      window.open(`/api/exportar?${exportParams}`, '_blank')
    },
    [filters],
  )

  return (
    <div className="flex flex-col gap-6">
      <StatsCards facturas={data?.data ?? []} total={data?.total ?? 0} />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-1">
          <TabsTrigger value="cargar">Cargar Factura</TabsTrigger>
          <TabsTrigger value="resultados">
            Resultados
            {data?.total ? (
              <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                {data.total}
              </span>
            ) : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cargar" className="mt-4">
          <div className="mx-auto max-w-xl">
            <UploadZone onSuccess={handleUploadSuccess} />
          </div>
        </TabsContent>

        <TabsContent value="resultados" className="mt-4">
          <FacturasTable
            facturas={data?.data ?? []}
            total={data?.total ?? 0}
            page={data?.page ?? 1}
            pageSize={10}
            isLoading={isLoading}
            onFilterChange={handleFilterChange}
            onExport={handleExport}
            onDelete={handleDelete}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
