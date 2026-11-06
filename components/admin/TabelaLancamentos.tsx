'use client'

import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { Trash2 } from 'lucide-react'
import type { ProductionEntry } from '@/types'
import { formatDate } from '@/lib/format'
import { Toast } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { useRealtimeLancamentos } from '@/hooks/useRealtimeLancamentos'
import { conferirDuplas, ehSolo } from '@/lib/conferencia-dupla'
import { ConferenciaDuplas } from '@/components/admin/ConferenciaDuplas'

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
  const [filtroParceiro, setFiltroParceiro] = useState('')
  const [filtroData, setFiltroData] = useState('')
  const [aba, setAba] = useState<'lancamentos' | 'duplas'>('lancamentos')
  const [soProblemas, setSoProblemas] = useState(true)
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

  // id → nome, montado a partir dos próprios lançamentos (colaborador e parceiro).
  // Lançamentos novos via realtime chegam sem nome; caem no mapa dos já conhecidos.
  const nomes = useMemo(() => {
    const mapa: Record<string, string> = {}
    for (const e of entries) {
      if (e.colaborador_id && e.nome_colaborador) mapa[e.colaborador_id] = e.nome_colaborador
      if (e.parceiro_id && e.nome_parceiro && e.nome_parceiro !== '—') mapa[e.parceiro_id] = e.nome_parceiro
    }
    return mapa
  }, [entries])

  const colaboradores = useMemo(() => {
    if (!mostrarColaborador) return []
    const ids = Array.from(new Set(entries.map((e) => e.colaborador_id).filter(Boolean)))
    return ids
      .map((id) => ({ id, nome: nomes[id] ?? id.slice(0, 8) }))
      .sort((a, b) => a.nome.localeCompare(b.nome))
  }, [entries, mostrarColaborador, nomes])

  // Parceiros possíveis: se houver colaborador filtrado, só quem trabalhou com ele
  const parceiros = useMemo(() => {
    if (!mostrarColaborador) return []
    const ids = new Set<string>()
    for (const e of entries) {
      if (ehSolo(e)) continue
      if (!filtroColaborador) ids.add(e.parceiro_id)
      else if (e.colaborador_id === filtroColaborador) ids.add(e.parceiro_id)
      else if (e.parceiro_id === filtroColaborador) ids.add(e.colaborador_id)
    }
    return Array.from(ids)
      .map((id) => ({ id, nome: nomes[id] ?? id.slice(0, 8) }))
      .sort((a, b) => a.nome.localeCompare(b.nome))
  }, [entries, mostrarColaborador, filtroColaborador, nomes])

  const funcoes = useMemo(() => {
    const valores = entries
      .map((e) => e.funcao ?? '')
      .filter(Boolean)
    return Array.from(new Set(valores)).sort()
  }, [entries])

  const datas = useMemo(
    () => Array.from(new Set(entries.map((e) => e.data_producao).filter(Boolean))).sort().reverse(),
    [entries],
  )

  // Com colaborador X E parceiro Y selecionados, mostra a dupla nos dois
  // sentidos: o que X anotou com Y e o que Y anotou com X.
  const modoDupla = Boolean(filtroColaborador && filtroParceiro)

  const entriesFiltrados = useMemo(() => {
    return entries.filter((e) => {
      if (modoDupla) {
        const xComY = e.colaborador_id === filtroColaborador && e.parceiro_id === filtroParceiro
        const yComX = e.colaborador_id === filtroParceiro && e.parceiro_id === filtroColaborador
        if (!xComY && !yComX) return false
      } else {
        if (filtroColaborador && e.colaborador_id !== filtroColaborador) return false
        if (filtroParceiro && (e.parceiro_id !== filtroParceiro || ehSolo(e))) return false
      }
      if (filtroData && e.data_producao !== filtroData) return false
      if (filtroFuncao && e.funcao !== filtroFuncao) return false
      if (filtroStatus && e.status !== filtroStatus) return false
      return true
    })
  }, [entries, modoDupla, filtroColaborador, filtroParceiro, filtroData, filtroFuncao, filtroStatus])

  // Resumo do conjunto filtrado para conferência visual
  const resumoFiltrado = useMemo(() => {
    const totalLancamentos = entriesFiltrados.length
    const totalUnidades = entriesFiltrados.reduce(
      (acc, e) => acc + (e.status !== 'divergente' ? e.quantidade * e.cores : 0),
      0
    )
    // No modo dupla, total anotado por cada lado (todos os status)
    const porLado = modoDupla
      ? [filtroColaborador, filtroParceiro].map((id) => ({
          id,
          quantidade: entriesFiltrados
            .filter((e) => e.colaborador_id === id)
            .reduce((acc, e) => acc + e.quantidade, 0),
        }))
      : []
    return { totalLancamentos, totalUnidades, porLado }
  }, [entriesFiltrados, modoDupla, filtroColaborador, filtroParceiro])

  // Conferência automática por dupla e por dia (respeita colaborador/parceiro/data)
  const conferencias = useMemo(() => {
    const base = entries.filter((e) => {
      if (filtroData && e.data_producao !== filtroData) return false
      const envolve = (id: string) => e.colaborador_id === id || e.parceiro_id === id
      if (filtroColaborador && !envolve(filtroColaborador)) return false
      if (filtroParceiro && !envolve(filtroParceiro)) return false
      return true
    })
    const todas = conferirDuplas(base)
    return soProblemas ? todas.filter((c) => c.status !== 'ok') : todas
  }, [entries, filtroData, filtroColaborador, filtroParceiro, soProblemas])

  const totalDuplasDivergentes = useMemo(
    () => conferirDuplas(entries).filter((c) => c.status === 'divergente').length,
    [entries],
  )

  const temFiltroAtivo = Boolean(filtroColaborador || filtroParceiro || filtroData || filtroFuncao || filtroStatus)

  const limparFiltros = useCallback(() => {
    setFiltroColaborador('')
    setFiltroParceiro('')
    setFiltroData('')
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

      {mostrarColaborador && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
            <button
              onClick={() => setAba('lancamentos')}
              className={`text-sm px-3 py-1.5 rounded-md ${aba === 'lancamentos' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              Lançamentos
            </button>
            <button
              onClick={() => setAba('duplas')}
              className={`text-sm px-3 py-1.5 rounded-md inline-flex items-center gap-1.5 ${aba === 'duplas' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              Conferência por dupla
              {totalDuplasDivergentes > 0 && (
                <span className={`text-[10px] font-semibold px-1.5 rounded-full ${aba === 'duplas' ? 'bg-white text-red-700' : 'bg-red-600 text-white'}`}>
                  {totalDuplasDivergentes}
                </span>
              )}
            </button>
          </div>
          {aba === 'duplas' && (
            <label className="inline-flex items-center gap-1.5 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={soProblemas}
                onChange={(e) => setSoProblemas(e.target.checked)}
              />
              Mostrar só diferenças e quem não anotou
            </label>
          )}
        </div>
      )}

      {(funcoes.length > 0 || (mostrarColaborador && colaboradores.length > 0)) && (
        <div className="flex flex-wrap items-end gap-3">
          {mostrarColaborador && colaboradores.length > 0 && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Colaborador</label>
              <select
                value={filtroColaborador}
                onChange={(e) => {
                  setFiltroColaborador(e.target.value)
                  setFiltroParceiro('')
                }}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                {colaboradores.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
          )}

          {mostrarColaborador && parceiros.length > 0 && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">
                {filtroColaborador ? 'Trabalhou com' : 'Parceiro'}
              </label>
              <select
                value={filtroParceiro}
                onChange={(e) => setFiltroParceiro(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                {parceiros.map((p) => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>
            </div>
          )}

          {datas.length > 0 && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Dia</label>
              <select
                value={filtroData}
                onChange={(e) => setFiltroData(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                {datas.map((d) => (
                  <option key={d} value={d}>{formatDate(d)}</option>
                ))}
              </select>
            </div>
          )}

          {aba === 'lancamentos' && funcoes.length > 0 && (
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

          {aba === 'lancamentos' && (
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
          )}

          {temFiltroAtivo && (
            <button
              onClick={limparFiltros}
              className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
            >
              Limpar filtros
            </button>
          )}

          {aba === 'lancamentos' && (
            <div className="ml-auto text-xs text-gray-500 sm:text-right">
              <span className="font-medium text-gray-700">{resumoFiltrado.totalLancamentos}</span> lançamento(s)
              {' · '}
              <span className="font-medium text-gray-700">{resumoFiltrado.totalUnidades.toLocaleString('pt-BR')}</span> unidades
            </div>
          )}
        </div>
      )}

      {aba === 'lancamentos' && modoDupla && (() => {
        const [x, y] = resumoFiltrado.porLado
        const diff = x.quantidade - y.quantidade
        return (
          <div
            className={`rounded-xl border px-4 py-3 text-sm flex flex-wrap items-center gap-x-4 gap-y-1 ${
              diff === 0 ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'
            }`}
          >
            <span>
              <strong>{nomes[x.id] ?? '—'}</strong> anotou <strong>{x.quantidade.toLocaleString('pt-BR')}</strong> com{' '}
              {nomes[y.id] ?? '—'}
            </span>
            <span>
              <strong>{nomes[y.id] ?? '—'}</strong> anotou <strong>{y.quantidade.toLocaleString('pt-BR')}</strong> com{' '}
              {nomes[x.id] ?? '—'}
            </span>
            <span className="font-semibold">
              {diff === 0 ? 'Totais conferem ✓' : `Diferença de ${Math.abs(diff).toLocaleString('pt-BR')}`}
            </span>
          </div>
        )
      })()}

      {aba === 'duplas' ? (
        <ConferenciaDuplas
          conferencias={conferencias}
          nomes={nomes}
          colaboradorFoco={filtroColaborador || undefined}
        />
      ) : (
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
      )}
    </>
  )
}
