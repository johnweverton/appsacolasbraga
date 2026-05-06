'use client'

import { useState } from 'react'
import type { ProductionEntry } from '@/types'

interface TabelaLancamentosProps {
  entries: ProductionEntry[]
  loading?: boolean
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pendente: { label: 'Pendente', className: 'bg-yellow-100 text-yellow-800' },
  confirmado: { label: 'Confirmado', className: 'bg-green-100 text-green-800' },
  divergente: { label: 'Divergente', className: 'bg-red-100 text-red-800' },
}

export function TabelaLancamentos({ entries: initialEntries, loading }: TabelaLancamentosProps) {
  const [entries, setEntries] = useState(initialEntries)
  const [updating, setUpdating] = useState<string | null>(null)

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
    } catch {
      alert('Erro ao atualizar status. Tente novamente.')
    } finally {
      setUpdating(null)
    }
  }

  if (loading) return <p className="text-gray-500 text-sm">Carregando lançamentos...</p>

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-500">
            <th className="px-4 py-3">Data</th>
            <th className="px-4 py-3">Marca</th>
            <th className="px-4 py-3">Tamanho</th>
            <th className="px-4 py-3 text-right">Qtd</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Ações</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const status = STATUS_LABELS[entry.status] ?? STATUS_LABELS.pendente
            const isUpdating = updating === entry.id
            return (
              <tr key={entry.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3">{entry.data_producao}</td>
                <td className="px-4 py-3">{entry.marca}</td>
                <td className="px-4 py-3">{entry.tamanho}</td>
                <td className="px-4 py-3 text-right font-medium">{entry.quantidade.toLocaleString('pt-BR')}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.className}`}>
                    {status.label}
                  </span>
                </td>
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
              </tr>
            )
          })}
          {entries.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                Nenhum lançamento encontrado
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
