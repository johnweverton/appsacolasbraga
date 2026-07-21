'use client'

import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { Trash2 } from 'lucide-react'
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

const FUNCAO_LABELS: Record<string, string> = {
  pintor: 'Pintor',
  ajudante: 'Ajudante',
  ambos: 'Pintor + Ajudante',
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
  const [confirmandoDelete, setConfirmandoDelete] = useState<string | null>(null)
  const [deletando, setDeletando] = useState<string | null>(null)
  const [filtroColaborador, setFiltroColaborador] = useState('')
  const [filtroFuncao, setFiltroFuncao] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const { toast, showToast, hideToast } = useToast()

  const handleRealtimeUpdate = useCallback((updated: ProductionEntry) => {
    setEntries((prev) => {
      const existe = prev.some((e) => e.id === updated.id)
      if (existe) return prev.map((e) => e.id === updated.id ? { ...e, ...updated } : e)
      return [{ ...updated }, ...prev]
    })
  }, [])

  const handleRealtimeDelete = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }, [])

  useRealtimeLancamentos(quinzenaId, handleRealtimeUpdate, handleRealtimeDelete)

  const colaboradores = useMemo(() => {
    if (!mostrarColaborador) return []
    const nomes = entries
      .map((e) => e.nome_colaborador ?? '')
      .filter(Boolean)
    return Array.from(new Set(nomes)).sort()
  }, [entries, mostrarColaborador])

  const funcoes = useMemo(() => {
    const valores = entries
      .map((e) => e.funcao ?? '')
      .filter(Boolean)
    return Array.from(new Set(valores)).sort()
  }, [entries])

  const entriesFiltrados = useMemo(() => {
    return entries.filter((e) => {
      if (filtroColaborador && e.nome_colaborador !== filtroColaborador) return false
      if (filtroFuncao && e.funcao !== filtroFuncao) return false
      if (filtroStatus && e.status !== filtroStatus) return false
      return true
    })
  }, [entries, filtroColaborador, filtroFuncao, filtroStatus])

  // Resumo do conjunto filtrado para conferência visual
  const resumoFiltrado = useMemo(() => {
    const totalLancamentos = entriesFiltrados.length
    const totalUnidades = entriesFiltrados.reduce(
      (acc, e) => acc + (e.status !== 'divergente' ? e.quantidade * e.cores : 0),
      0
    )
    return { totalLancamentos, totalUnidades }
  }, [entriesFiltrados])

  const temFiltroAtivo = Boolean(filtroColaborador || filtroFuncao || filtroStatus)

  const limparFiltros = useCallback(() => {
    setFiltroColaborador('')
    setFiltroFuncao('')
    setFiltroStatus('')
  }, [])

  async function deleteEntry(id: string) {
    setDeletando(id)
    try {
      const res = await fetch(`/api/producao/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json()
        showToast(typeof json.error === 'string' ? json.error : 'Erro ao excluir.', 'error')
        return
      }
      setEntries((prev) => prev.filter((e) => e.id !== id))
      showToast('Lançamento excluído.', 'success')
    } catch {
      showToast('Erro ao excluir lançamento.', 'error')
    } finally {
      setDeletando(null)
      setConfirmandoDelete(null)
    }
  }

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

      {(funcoes.length > 0 || (mostrarColaborador && colaboradores.length > 0)) && (
        <div className="flex flex-wrap items-end gap-3">
          {mostrarColaborador && colaboradores.length > 0 && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Colaborador</label>
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

          {funcoes.length > 0 && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Função</label>
              <select
                value={filtroFuncao}
                onChange={(e) => setFiltroFuncao(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todas</option>
                {funcoes.map((funcao) => (
                  <option key={funcao} value={funcao}>{FUNCAO_LABELS[funcao] ?? funcao}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Status</label>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              <option value="pendente">Pendente</option>
              <option value="confirmado">Confirmado</option>
              <option value="divergente">Divergente</option>
            </select>
          </div>

          {temFiltroAtivo && (
            <button
              onClick={limparFiltros}
              className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
            >
              Limpar filtros
            </button>
          )}

          <div className="ml-auto text-xs text-gray-500 sm:text-right">
            <span className="font-medium text-gray-700">{resumoFiltrado.totalLancamentos}</span> lançamento(s)
            {' · '}
            <span className="font-medium text-gray-700">{resumoFiltrado.totalUnidades.toLocaleString('pt-BR')}</span> unidades
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-500">
              {mostrarColaborador && <th className="px-4 py-3">Colaborador</th>}
              {mostrarColaborador && <th className="px-4 py-3">Parceiro</th>}
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Função</th>
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
                    <td className="px-4 py-3 font-medium text-gray-700">
                      {entry.colaborador_id ? (
                        <Link
                          href={`/admin/colaboradores/${entry.colaborador_id}/historico`}
                          className="hover:text-blue-600 hover:underline"
                        >
                          {entry.nome_colaborador ?? '—'}
                        </Link>
                      ) : (
                        entry.nome_colaborador ?? '—'
                      )}
                    </td>
                  )}
                  {mostrarColaborador && (
                    <td className="px-4 py-3 text-gray-500">
                      {entry.parceiro_id === entry.colaborador_id ? 'Sozinho' : entry.nome_parceiro ?? '—'}
                    </td>
                  )}
                  <td className="px-4 py-3">{formatDate(entry.data_producao)}</td>
                  <td className="px-4 py-3 text-gray-500">{FUNCAO_LABELS[entry.funcao] ?? entry.funcao ?? '—'}</td>
                  <td className="px-4 py-3">{entry.marca}</td>
                  <td className="px-4 py-3">{entry.tamanho}</td>
                  <td className="px-4 py-3 text-right font-medium">{entry.quantidade.toLocaleString('pt-BR')}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.className}`}>
                      {status.label}
                    </span>
                    {entry.observacao && (
                      <p
                        className={`mt-1 max-w-[220px] text-[11px] leading-snug ${
                          entry.status === 'divergente' ? 'text-red-600' : 'text-gray-500'
                        }`}
                      >
                        {entry.observacao}
                      </p>
                    )}
                  </td>
                  {!readOnly && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 flex-wrap">
                        {entry.status !== 'confirmado' && (
                          <button
                            onClick={() => updateStatus(entry.id, 'confirmado')}
                            disabled={isUpdating}
                            className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-50"
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
                            className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-700 hover:bg-yellow-200 disabled:opacity-50"
                          >
                            Reverter
                          </button>
                        )}
                        {confirmandoDelete === entry.id ? (
                          <>
                            <button
                              onClick={() => setConfirmandoDelete(null)}
                              className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-500 hover:bg-gray-200"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => deleteEntry(entry.id)}
                              disabled={deletando === entry.id}
                              className="text-xs px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                            >
                              {deletando === entry.id ? '...' : 'Confirmar'}
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setConfirmandoDelete(entry.id)}
                            disabled={isUpdating}
                            title="Excluir lançamento"
                            className="p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-50 transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              )
            })}
            {entriesFiltrados.length === 0 && (
              <tr>
                <td colSpan={colSpan} className="px-4 py-8 text-center text-gray-400">
                  {temFiltroAtivo
                    ? 'Nenhum lançamento para os filtros selecionados'
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
