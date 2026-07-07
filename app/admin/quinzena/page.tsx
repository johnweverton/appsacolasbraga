export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { FormNovaQuinzena } from '@/components/admin/FormNovaQuinzena'
import { BotaoFecharQuinzena } from '@/components/admin/BotaoFecharQuinzena'
import { formatDate } from '@/lib/format'

export default async function QuinzenaPage() {
  const supabase = createClient()

  const { data: quinzenaAtiva } = await supabase
    .from('pay_periods')
    .select('*')
    .eq('status', 'aberta')
    .single()

  const { data: historico } = await supabase
    .from('pay_periods')
    .select('id, data_inicio, data_fim, status, fechado_em')
    .eq('status', 'fechada')
    .order('data_fim', { ascending: false })
    .limit(5)

  // Colaboradores com lançamentos na quinzena aberta que ainda não foram
  // fechados individualmente — candidatos a "deixar pendente" ao fechar.
  let colaboradoresPendentes: { id: string; nome: string }[] = []
  if (quinzenaAtiva) {
    const [{ data: entries }, { data: users }, { data: payouts }] = await Promise.all([
      supabase.from('production_entries').select('colaborador_id').eq('quinzena_id', quinzenaAtiva.id),
      supabase.from('users').select('id, nome').in('funcao', ['pintor', 'ajudante']),
      supabase.from('payouts').select('colaborador_id').eq('quinzena_id', quinzenaAtiva.id),
    ])
    const idsComLancamento = new Set((entries ?? []).map((e) => e.colaborador_id))
    const idsJaFechados = new Set((payouts ?? []).map((p) => p.colaborador_id))
    colaboradoresPendentes = (users ?? [])
      .filter((u) => idsComLancamento.has(u.id) && !idsJaFechados.has(u.id))
      .map((u) => ({ id: u.id, nome: u.nome }))
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-800">Quinzena Ativa</h2>

      {quinzenaAtiva ? (
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Aberta
            </span>
          </div>
          <div className="text-sm text-gray-600 space-y-1">
            <p>Início: <strong>{formatDate(quinzenaAtiva.data_inicio)}</strong></p>
            <p>Fim: <strong>{formatDate(quinzenaAtiva.data_fim)}</strong></p>
            <p>Pagamento: <strong>{formatDate(quinzenaAtiva.data_pagamento)}</strong></p>
          </div>
          <BotaoFecharQuinzena colaboradoresPendentes={colaboradoresPendentes} />
        </div>
      ) : (
        <FormNovaQuinzena />
      )}

      {(historico ?? []).length > 0 && (
        <div>
          <h3 className="text-base font-medium text-gray-700 mb-3">Histórico</h3>
          <ul className="space-y-2">
            {historico!.map((q) => (
              <li key={q.id}>
                <Link
                  href={`/admin/quinzena/${q.id}`}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <span className="text-sm text-gray-700">
                    {formatDate(q.data_inicio)} – {formatDate(q.data_fim)}
                  </span>
                  <span className="text-xs text-gray-400">Ver detalhes →</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
