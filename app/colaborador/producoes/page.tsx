'use client'

import { useCallback } from 'react'
import { useQuinzenaAtiva } from '@/hooks/useQuinzenaAtiva'
import { useProducaoColaborador, type EntryComParceiro } from '@/hooks/useProducaoColaborador'
import { useMetricasQuinzena } from '@/hooks/useMetricasQuinzena'
import { useRealtimeLancamentos } from '@/hooks/useRealtimeLancamentos'
import { useParceiros } from '@/hooks/useParceiros'
import { BannerMetricas } from '@/components/colaborador/BannerMetricas'
import { TabelaProducoes } from '@/components/colaborador/TabelaProducoes'
import type { ProductionEntry } from '@/types'

export default function ProducoesPage() {
  const { quinzena } = useQuinzenaAtiva()
  const { entries, loading, error, removeEntry, updateEntry } = useProducaoColaborador(quinzena?.id)
  const metricas = useMetricasQuinzena(quinzena?.id)
  const parceiros = useParceiros()

  const handleRealtime = useCallback((_entry: ProductionEntry) => {
    metricas.refresh()
  }, [metricas])

  useRealtimeLancamentos(quinzena?.id, handleRealtime)

  function handleEntryDeleted(id: string) {
    removeEntry(id)
    metricas.refresh()
  }

  function handleEntrySaved(updated: EntryComParceiro) {
    updateEntry(updated)
    metricas.refresh()
  }

  return (
    <div className="space-y-4">
      <BannerMetricas {...metricas} />

      <div className="bg-white rounded-3xl border border-black/[0.05] overflow-hidden">
        {error ? (
          <p className="text-sm text-red-500 px-4 py-6 text-center">
            Erro ao carregar produções
          </p>
        ) : (
          <TabelaProducoes
            entries={entries}
            loading={loading}
            totalUnidades={metricas.totalUnidades}
            valorEstimado={metricas.valorEstimado}
            parceiros={parceiros}
            onEntryDeleted={handleEntryDeleted}
            onEntrySaved={handleEntrySaved}
          />
        )}
      </div>
    </div>
  )
}
