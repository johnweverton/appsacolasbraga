import { createClient } from '@/lib/supabase/server'
import { TabelaLancamentos } from '@/components/admin/TabelaLancamentos'
import { BotaoFecharColaborador } from '@/components/admin/BotaoFecharColaborador'
import { notFound } from 'next/navigation'
import type { ProductionEntry } from '@/types'
import { formatDate } from '@/lib/format'
import { resumoPorColaborador, formatarMoeda } from '@/lib/calculos'

interface Props {
  params: { id: string }
}

export default async function QuinzenaDetalhesPage({ params }: Props) {
  const supabase = createClient()

  const { data: quinzena } = await supabase
    .from('pay_periods')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!quinzena) notFound()

  const [
    { data: entries },
    { data: users },
    { data: rates },
    { data: payoutsExistentes },
  ] = await Promise.all([
    supabase
      .from('production_entries')
      .select('*, users!colaborador_id(nome), parceiro:users!parceiro_id(nome)')
      .eq('quinzena_id', params.id)
      .order('data_producao', { ascending: false }),
    supabase.from('users').select('id, nome, funcao').in('funcao', ['pintor', 'ajudante']),
    supabase.from('payment_rates').select('funcao, valor_unitario').is('vigencia_fim', null),
    supabase.from('payouts').select('colaborador_id, valor_total').eq('quinzena_id', params.id),
  ])

  const entriesComNome = (entries ?? []).map((e) => ({
    ...(e as ProductionEntry),
    nome_colaborador: (e as { users?: { nome: string } | null }).users?.nome ?? e.colaborador_id,
    nome_parceiro: (e as { parceiro?: { nome: string } | null }).parceiro?.nome ?? '—',
  }))

  // Colaboradores que ainda não têm payout nesta quinzena — inclui o caso de
  // quinzena já fechada com colaborador deixado pendente propositalmente.
  const resumoPendentes = resumoPorColaborador(
    entriesComNome,
    users ?? [],
    rates ?? [],
    payoutsExistentes ?? [],
  ).filter((c) => !c.jaFechado)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-800">
          Quinzena {formatDate(quinzena.data_inicio)} – {formatDate(quinzena.data_fim)}
        </h2>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 mt-1">
          {quinzena.status === 'fechada' ? 'Fechada' : 'Aberta'}
        </span>
      </div>

      {resumoPendentes.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide">
            Colaboradores pendentes de fechamento
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {resumoPendentes.map((c) => (
              <div key={c.id} className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
                <div>
                  <p className="font-medium text-gray-800">{c.nome}</p>
                  <p className="text-xs text-gray-400 capitalize">{c.funcao}</p>
                </div>
                <div className="text-sm text-gray-600 space-y-0.5">
                  <div className="flex justify-between">
                    <span>Unidades</span>
                    <span className="font-medium">{c.unidades.toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Estimado</span>
                    <span className="font-medium text-blue-700">{formatarMoeda(c.valorEstimado)}</span>
                  </div>
                </div>
                {!c.temDivergencia && c.unidades > 0 && (
                  <BotaoFecharColaborador
                    quinzenaId={params.id}
                    colaboradorId={c.id}
                    nomeColaborador={c.nome}
                    totalUnidades={c.unidades}
                    valorEstimado={c.valorEstimado}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <TabelaLancamentos
        entries={entriesComNome}
        readOnly={quinzena.status === 'fechada'}
        mostrarColaborador
        quinzenaId={params.id}
      />
    </div>
  )
}
