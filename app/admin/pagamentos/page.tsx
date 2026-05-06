import { createClient } from '@/lib/supabase/server'
import { TabelaPagamentos } from '@/components/admin/TabelaPagamentos'
import type { Payout } from '@/types'

export default async function PagamentosPage() {
  const supabase = createClient()

  const { data: quinzena } = await supabase
    .from('pay_periods')
    .select('id, data_fim')
    .eq('status', 'fechada')
    .order('data_fim', { ascending: false })
    .limit(1)
    .single()

  const { data: payouts } = quinzena
    ? await supabase
        .from('payouts')
        .select('*, users(nome)')
        .eq('quinzena_id', quinzena.id)
    : { data: [] }

  const payoutsComNome = (payouts ?? []).map((p) => ({
    ...(p as Payout),
    nome_colaborador: (p as { users?: { nome: string } | null }).users?.nome ?? p.colaborador_id,
  }))

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-800">Pagamentos</h2>
      {quinzena && (
        <p className="text-sm text-gray-500">Quinzena encerrada em {quinzena.data_fim}</p>
      )}
      <TabelaPagamentos payouts={payoutsComNome} />
    </div>
  )
}
