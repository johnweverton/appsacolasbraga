'use client'

import { useState, Fragment } from 'react'
import { Pencil } from 'lucide-react'
import type { EntryComParceiro } from '@/hooks/useProducaoColaborador'
import { formatDate } from '@/lib/format'
import { formatarMoeda } from '@/lib/calculos'
import { ModalEditarLancamento } from './ModalEditarLancamento'

interface TabelaProducoesProps {
  entries: EntryComParceiro[]
  loading: boolean
  totalUnidades: number
  valorEstimado: number
  parceiros: { id: string; nome: string }[]
  onEntryDeleted: (id: string) => void
  onEntrySaved: (updated: EntryComParceiro) => void
}

const TURNO_LABEL: Record<string, string> = {
  unico: '—',
  manha: 'M',
  tarde: 'T',
}

const STATUS_PILL: Record<string, string> = {
  pendente:   'bg-amber-50  text-amber-700',
  confirmado: 'bg-green-50  text-green-700',
  divergente: 'bg-red-50    text-red-600',
}
const STATUS_LABEL: Record<string, string> = {
  pendente:   'Pend.',
  confirmado: 'Conf.',
  divergente: 'Div.',
}

export function TabelaProducoes({ entries, loading, totalUnidades, valorEstimado, parceiros, onEntryDeleted, onEntrySaved }: TabelaProducoesProps) {
  const [editando, setEditando] = useState<EntryComParceiro | null>(null)

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-9 rounded-xl bg-black/[0.04] animate-pulse" />
        ))}
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-2">
        <p className="text-sm font-sans font-medium text-brand-dark/40">
          Nenhum registro nesta quinzena
        </p>
        <p className="text-xs font-sans text-brand-dark/25">
          Use a aba Registrar para adicionar produções
        </p>
      </div>
    )
  }

  return (
    <>
      {editando && (
        <ModalEditarLancamento
          entry={editando}
          parceiros={parceiros}
          onClose={() => setEditando(null)}
          onSaved={onEntrySaved}
          onDeleted={onEntryDeleted}
        />
      )}

      <div className="flex flex-col">
        {/* Cabeçalho */}
        <div className="grid grid-cols-[56px_20px_1fr_48px_24px_44px_44px] gap-x-2 px-3 pb-1.5 border-b border-black/[0.06]">
          {['Data', 'T', 'Marca / Tam.', 'Parceiro', 'Cor', 'Qtd', 'St.'].map((h) => (
            <span key={h} className="text-[9px] font-sans font-semibold uppercase tracking-wider text-brand-dark/35">
              {h}
            </span>
          ))}
        </div>

        {/* Linhas */}
        <ul className="divide-y divide-black/[0.04]">
          {entries.map((e) => {
            const isPendente = e.status === 'pendente'
            // Divergente também é editável: o colaborador pode corrigir a função.
            const isEditavel = isPendente || e.status === 'divergente'
            return (
              <Fragment key={e.id}>
              <li
                className={`grid grid-cols-[56px_20px_1fr_48px_24px_44px_44px] gap-x-2 px-3 py-2.5 items-center ${
                  isEditavel ? 'cursor-pointer hover:bg-brand-blue/[0.03] active:bg-brand-blue/[0.06]' : ''
                }`}
                onClick={isEditavel ? () => setEditando(e) : undefined}
              >
                <span className="text-[10px] font-sans text-brand-dark/50 tabular-nums">
                  {formatDate(e.data_producao).slice(0, 5)}
                </span>
                <span className="text-[10px] font-sans font-semibold text-brand-dark/40 text-center">
                  {TURNO_LABEL[e.turno] ?? '—'}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-sans font-semibold text-brand-dark truncate">{e.marca}</p>
                  <p className="text-[10px] font-sans text-brand-dark/40 truncate">{e.tamanho}</p>
                </div>
                <span className="text-[10px] font-sans text-brand-dark/50 truncate">
                  {e.parceiro_id === e.colaborador_id ? 'Sozinho' : e.nome_parceiro ?? '—'}
                </span>
                <span className="text-[10px] font-sans text-brand-dark/50 tabular-nums">{e.cores}</span>
                <span className="text-xs font-sans font-bold text-brand-dark tabular-nums">
                  {e.quantidade.toLocaleString('pt-BR')}
                </span>
                <div className="flex items-center gap-1">
                  <span className={`text-[9px] font-sans font-semibold px-1.5 py-0.5 rounded-full ${STATUS_PILL[e.status]}`}>
                    {STATUS_LABEL[e.status]}
                  </span>
                  {isEditavel && (
                    <Pencil size={10} className="text-brand-blue/50 flex-shrink-0" />
                  )}
                </div>
              </li>
              {e.status === 'divergente' && e.observacao && (
                <li className="px-3 pb-2 -mt-1">
                  <p className="text-[10px] leading-snug text-red-600">{e.observacao}</p>
                </li>
              )}
              </Fragment>
            )
          })}
        </ul>

        {/* Footer totalizador */}
        <div className="mt-3 flex items-center justify-between rounded-2xl bg-brand-dark/[0.03] border border-black/[0.06] px-4 py-3">
          <div>
            <p className="text-[9px] font-sans font-semibold uppercase tracking-widest text-brand-dark/35">
              Total unidades
            </p>
            <p className="font-display font-bold text-brand-dark text-lg leading-tight tabular-nums">
              {totalUnidades.toLocaleString('pt-BR')}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-sans font-semibold uppercase tracking-widest text-brand-gold/60">
              Estimativa
            </p>
            <p className="font-display font-bold text-brand-gold text-lg leading-tight">
              {formatarMoeda(valorEstimado)}
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
