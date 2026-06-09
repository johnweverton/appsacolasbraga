export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { TabelaPagamentos } from '@/components/admin/TabelaPagamentos'
import { BotaoExportarCSV } from '@/components/admin/BotaoExportarCSV'
import { SeletorQuinzena } from '@/components/admin/SeletorQuinzena'
import type { Payout } from '@/types'
import { formatDate } from '@/lib/format'

interface Props {
  searchParams: { quinzena?: string }
}

export default async function PagamentosPage({ searchParams }: Props) {
  const supabase = createClient()

  const { data: quinzenas } = await supabase
    .from('pay_periods')
    .select('id, data_inicio, data_fim')
    .eq('status', 'fechada')
    .order('data_fim', { ascending: false })

  const quinzenaId = searchParams.quinzena ?? quinzenas?.[0]?.id
  const quinzena = quinzenas?.find((q) => q.id === quinzenaId) ?? quinzenas?.[0]

  const { data: payouts } = quinzena
    ? await supabase
        .from('payouts')
        .select('*, users!colaborador_id(nome, pix_key)')
        .eq('quinzena_id', quinzena.id)
    : { data: [] }

  const payoutsComNome = (payouts ?? []).map((p) => ({
    ...(p as Payout),
    nome_colaborador:
      (p as { users?: { nome: string } | null }).users?.nome ?? (p as Payout).colaborador_id,
    pix_key: (p as { users?: { pix_key?: string | null } | null }).users?.pix_key ?? null,
  }))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-gray-800">Pagamentos</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <SeletorQuinzena
            quinzenas={quinzenas ?? []}
            quinzenaSelecionadaId={quinzena?.id}
          />
          <BotaoExportarCSV payouts={payoutsComNome} quinzenaLabel={quinzena?.data_fim} />
        </div>
      </div>

      {quinzena && (
        <p className="text-sm text-gray-500">
          Quinzena: {formatDate(quinzena.data_inicio)} – {formatDate(quinzena.data_fim)}
        </p>
      )}

      {!quinzena && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center">
          <p className="text-gray-600 font-medium">Nenhuma quinzena fechada ainda</p>
          <p className="text-sm text-gray-400 mt-1">
            Os pagamentos aparecerão aqui após o fechamento de uma quinzena.
          </p>
        </div>
      )}

      <TabelaPagamentos payouts={payoutsComNome} />
    </div>
  )
}
