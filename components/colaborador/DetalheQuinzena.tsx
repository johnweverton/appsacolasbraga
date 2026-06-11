'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatarLabelQuinzena, formatDate } from '@/lib/format'
import { formatarMoeda } from '@/lib/calculos'
import type { QuinzenaFechada } from '@/hooks/useQuinzenasFechadas'
import type { EntryComParceiro } from '@/hooks/useProducaoColaborador'
import type { ProductionEntry } from '@/types'

interface DetalheQuinzenaProps {
  quinzena: QuinzenaFechada
  onClose: () => void
}

const TURNO_LABEL: Record<string, string> = { unico: '—', manha: 'M', tarde: 'T' }

const STATUS_PILL: Record<string, string> = {
  pendente:   'bg-amber-50  text-amber-700',
  confirmado: 'bg-green-50  text-green-700',
  divergente: 'bg-red-50    text-red-600',
}
const STATUS_LABEL: Record<string, string> = {
  pendente: 'Pend.', confirmado: 'Conf.', divergente: 'Div.',
}

export function DetalheQuinzena({ quinzena, onClose }: DetalheQuinzenaProps) {
  const [entries, setEntries] = useState<EntryComParceiro[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return }
      const { data } = await supabase
        .from('production_entries')
        .select('*, parceiro:users!parceiro_id(nome)')
        .eq('quinzena_id', quinzena.id)
        .eq('colaborador_id', user.id)
        .order('data_producao', { ascending: true })

      setEntries(
        (data ?? []).map((e) => ({
          ...(e as ProductionEntry),
          nome_parceiro: (e as { parceiro?: { nome: string } | null }).parceiro?.nome,
        }))
      )
      setLoading(false)
    })
  }, [quinzena.id])

  // Cada cor exige uma passada de impressão separada: unidade efetiva = quantidade × cores
  const total = entries.reduce((s, e) => s + e.quantidade * e.cores, 0)

  return (
    <div className="fixed inset-0 z-50 bg-brand-cream flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-black/[0.06] bg-brand-cream">
        <div>
          <p className="text-[10px] font-sans font-semibold uppercase tracking-widest text-brand-dark/35">
            Detalhamento
          </p>
          <h2 className="font-display font-bold text-brand-dark text-lg leading-tight">
            {formatarLabelQuinzena(quinzena.data_inicio)}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center rounded-2xl bg-black/[0.05] text-brand-dark/50 hover:bg-black/10 transition-all"
        >
          <X size={16} strokeWidth={2} />
        </button>
      </div>

      {/* Tabela */}
      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-6">
        {loading ? (
          <div className="space-y-2 mt-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-9 rounded-xl bg-black/[0.04] animate-pulse" />)}
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-black/[0.05] overflow-hidden">
            {/* Cabeçalho */}
            <div className="grid grid-cols-[56px_20px_1fr_52px_28px_44px_28px] gap-x-2 px-3 py-2 border-b border-black/[0.06]">
              {['Data','T','Marca / Tam.','Parceiro','Cor','Qtd','St.'].map((h) => (
                <span key={h} className="text-[9px] font-sans font-semibold uppercase tracking-wider text-brand-dark/35">
                  {h}
                </span>
              ))}
            </div>
            <ul className="divide-y divide-black/[0.04]">
              {entries.map((e) => (
                <li key={e.id} className="grid grid-cols-[56px_20px_1fr_52px_28px_44px_28px] gap-x-2 px-3 py-2.5 items-center">
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
                  <span className="text-[10px] font-sans text-brand-dark/50 truncate">{e.nome_parceiro ?? '—'}</span>
                  <span className="text-[10px] font-sans text-brand-dark/50 tabular-nums">{e.cores}</span>
                  <span className="text-xs font-sans font-bold text-brand-dark tabular-nums">
                    {e.quantidade.toLocaleString('pt-BR')}
                  </span>
                  <span className={`text-[9px] font-sans font-semibold px-1.5 py-0.5 rounded-full ${STATUS_PILL[e.status]}`}>
                    {STATUS_LABEL[e.status]}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 pb-8 pt-3 border-t border-black/[0.06] bg-brand-cream">
        <div className="flex items-center justify-between rounded-2xl bg-white border border-black/[0.05] px-4 py-3">
          <div>
            <p className="text-[9px] font-sans font-semibold uppercase tracking-widest text-brand-dark/35">
              Total unidades
            </p>
            <p className="font-display font-bold text-brand-dark text-lg leading-tight tabular-nums">
              {total.toLocaleString('pt-BR')}
            </p>
          </div>
          {quinzena.payout && (
            <div className="text-right">
              <p className="text-[9px] font-sans font-semibold uppercase tracking-widest text-brand-gold/60">
                Valor {quinzena.payout.status === 'pago' ? 'recebido' : 'estimado'}
              </p>
              <p className="font-display font-bold text-brand-gold text-lg leading-tight">
                {formatarMoeda(quinzena.payout.valor_total)}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
