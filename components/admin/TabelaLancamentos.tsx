'use client'

import { useState, useMemo, useCallback } from 'react'
import type { ProductionEntry } from '@/types'
import { formatDate } from '@/lib/format'
import { Toast } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { useRealtimeLancamentos } from '@/hooks/useRealtimeLancamentos'

type EntryComNome = ProductionEntry & { nome_colaborador?: string; nome_parceiro?: string }

interface TabelaLancamentosProps {
  entries: EntryComNome[]
  loading?: boolean
  readOnly?: boolean
  mostrarColaborador?: boolean
  quinzenaId?: string
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pendente: { label: 'Pendente', className: 'bg-yellow-100 text-yellow-800' },
  confirmado: { label: 'Confirmado', className: 'bg-green-100 text-green-800' },
  divergente: { label: 'Divergente', className: 'bg-red-100 text-red-800' },
}

export function TabelaLancamentos({
  entries: initialEntries,
  loading,
  readOnly = false,
  mostrarColaborador = false,
  quinzenaId,
}: TabelaLancamentosProps) {
  const [entries, setEntries] = useState(initialEntries)
  const [updating, setUpdating] = useState<string | null>(null)
  const [filtroColaborador, setFiltroColaborador] = useState('')
  const { toast, showToast, hideToast } = useToast()

  const handleRealtimeUpdate = useCallback((updated: ProductionEntry) => {
    setEntries((prev) => {
      const existe = prev.some((e) => e.id === updated.id)
      if (existe) return prev.map((e) => e.id === updated.id ? { ...e, ...updated } : e)
      return [{ ...updated }, ...prev]
    })
  }, [])

  useRealtimeLancamentos(quinzenaId, handleRealtimeUpdate)

  const colaboradores = useMemo(() => {
    if (!mostrarColaborador) return []
    const nomes = entries
      .map((e) => e.nome_colaborador ?? '')
      .filter(Boolean)
    return Array.from(new Set(nomes)).sort()
  }, [entries, mostrarColaborador])

  const entriesFiltrados = useMemo(() => {
    if (!filtroColaborador) return entries
    return entries.filter((e) => e.nome_colaborador === filtroColaborador)
  }, [entries, filtroColaborador])

  async function updateStatus(id: string, status: 'confirmado' | 'divergente' | 'pendente') {
    setUpdating(id)
    try {
      const res = await fetch(`/api/producao/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('Falha ao atualizar')
      const updated = await res.json()
      setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, status: updated.status } : e)))
      showToast('Status atualizado!', 'success')
    } catch {
      showToast('Erro ao atualizar status. Tente novamente.', 'error')
    } finally {
      setUpdating(null)
    }
  }

  if (loading) return <p className="text-gray-500 text-sm">Carregando lançamentos...</p>

  const colSpan = (mostrarColaborador ? 2 : 0) + (readOnly ? 5 : 6)

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}

      {mostrarColaborador && colaboradores.length > 0 && (
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Filtrar colaborador:</label>
          <select
            value={filtroColaborador}
            onChange={(e) => setFiltroColaborador(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos</option>
            {colaboradores.map((nome) => (
              <option key={nome} value={nome}>{nome}</option>
            ))}
          </select>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-500">
              {mostrarColaborador && <th className="px-4 py-3">Colaborador</th>}
              {mostrarColaborador && <th className="px-4 py-3">Parceiro</th>}
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Marca</th>
              <th className="px-4 py-3">Tamanho</th>
              <th className="px-4 py-3 text-right">Qtd</th>
              <th className="px-4 py-3">Status</th>
              {!readOnly && <th className="px-4 py-3">Ações</th>}
            </tr>
          </thead>
          <tbody>
            {entriesFiltrados.map((entry) => {
              const status = STATUS_LABELS[entry.status] ?? STATUS_LABELS.pendente
              const isUpdating = updating === entry.id
              return (
                <tr key={entry.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  {mostrarColaborador && (
                    <td className="px-4 py-3 font-medium text-gray-700">{entry.nome_colaborador ?? '—'}</td>
                  )}
                  {mostrarColaborador && (
                    <td className="px-4 py-3 text-gray-500">{entry.nome_parceiro ?? '—'}</td>
                  )}
                  <td className="px-4 py-3">{formatDate(entry.data_producao)}</td>
                  <td className="px-4 py-3">{entry.marca}</td>
                  <td className="px-4 py-3">{entry.tamanho}</td>
                  <td className="px-4 py-3 text-right font-medium">{entry.quantidade.toLocaleString('pt-BR')}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.className}`}>
                      {status.label}
                    </span>
                  </td>
                  {!readOnly && (
                    <td className="px-4 py-3">
                      {entry.status !== 'confirmado' && (
                        <button
                          onClick={() => updateStatus(entry.id, 'confirmado')}
                          disabled={isUpdating}
                          className="mr-2 text-xs px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-50"
                        >
                          Confirmar
                        </button>
                      )}
                      {entry.status !== 'divergente' && (
                        <button
                          onClick={() => updateStatus(entry.id, 'divergente')}
                          disabled={isUpdating}
                          className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50"
                        >
                          Divergência
                        </button>
                      )}
                      {entry.status !== 'pendente' && (
                        <button
                          onClick={() => updateStatus(entry.id, 'pendente')}
                          disabled={isUpdating}
                          className="ml-2 text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-700 hover:bg-yellow-200 disabled:opacity-50"
                        >
                          Reverter
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              )
            })}
            {entriesFiltrados.length === 0 && (
              <tr>
                <td colSpan={colSpan} className="px-4 py-8 text-center text-gray-400">
                  {filtroColaborador
                    ? `Nenhum lançamento para ${filtroColaborador}`
                    : 'Nenhum lançamento encontrado'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
