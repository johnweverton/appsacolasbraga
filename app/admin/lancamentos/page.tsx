export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { TabelaLancamentos } from '@/components/admin/TabelaLancamentos'
import { BotaoFecharColaborador } from '@/components/admin/BotaoFecharColaborador'
import { BotaoAuditar } from '@/components/admin/BotaoAuditar'
import { resumoPorColaborador, formatarMoeda } from '@/lib/calculos'
import type { ProductionEntry } from '@/types'

export default async function LancamentosPage() {
  const supabase = createClient()

  const { data: quinzena } = await supabase
    .from('pay_periods')
    .select('id, status')
    .eq('status', 'aberta')
    .single()

  if (!quinzena) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">Lançamentos da Quinzena</h2>
        <p className="text-sm text-gray-500 bg-gray-100 rounded-lg px-4 py-3">
          Nenhuma quinzena aberta no momento.
        </p>
      </div>
    )
  }

  const [
    { data: entries },
    { data: users },
    { data: rates },
    { data: payoutsExistentes },
  ] = await Promise.all([
    supabase
      .from('production_entries')
      .select('*, users!colaborador_id(nome), parceiro:users!parceiro_id(nome)')
      .eq('quinzena_id', quinzena.id)
      .order('created_at', { ascending: false }),
    supabase.from('users').select('id, nome, funcao').in('funcao', ['pintor', 'ajudante']),
    supabase.from('payment_rates').select('funcao, valor_unitario').is('vigencia_fim', null),
    supabase.from('payouts').select('colaborador_id, valor_total').eq('quinzena_id', quinzena.id),
  ])

  const entriesComNome = (entries ?? []).map((e) => ({
    ...(e as ProductionEntry),
    nome_colaborador: (e as { users?: { nome: string } | null }).users?.nome ?? e.colaborador_id,
    nome_parceiro: (e as { parceiro?: { nome: string } | null }).parceiro?.nome ?? '—',
  }))

  // Monta resumo por colaborador
  const resumoColaboradores = resumoPorColaborador(
    entriesComNome,
    users ?? [],
    rates ?? [],
    payoutsExistentes ?? [],
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-gray-800">Lançamentos da Quinzena</h2>
        <BotaoAuditar quinzenaId={quinzena.id} />
      </div>

      {/* Resumo por colaborador */}
      {resumoColaboradores.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide">Resumo por Colaborador</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {resumoColaboradores.map((c) => (
              <div
                key={c.id}
                className="rounded-xl border border-gray-200 bg-white p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-800">{c.nome}</p>
                    <p className="text-xs text-gray-400 capitalize">{c.funcao}</p>
                  </div>
                  {c.jaFechado ? (
                    <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium">
                      Fechado
                    </span>
                  ) : c.temDivergencia ? (
                    <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 font-medium">
                      Divergência
                    </span>
                  ) : null}
                </div>

                <div className="text-sm text-gray-600 space-y-0.5">
                  <div className="flex justify-between">
                    <span>Unidades</span>
                    <span className="font-medium">{c.unidades.toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{c.jaFechado ? 'Valor gerado' : 'Estimado'}</span>
                    <span className={`font-medium ${c.jaFechado ? 'text-green-700' : 'text-blue-700'}`}>
                      {formatarMoeda(c.jaFechado ? c.valorPago : c.valorEstimado)}
                    </span>
                  </div>
                </div>

                {!c.jaFechado && !c.temDivergencia && c.unidades > 0 && (
                  <BotaoFecharColaborador
                    quinzenaId={quinzena.id}
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

      {/* Tabela detalhada */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide">Todos os Lançamentos</h3>
        <TabelaLancamentos entries={entriesComNome} mostrarColaborador quinzenaId={quinzena.id} />
      </div>
    </div>
  )
}
