export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/format'
import { formatarMoeda } from '@/lib/calculos'
import type { ProductionEntry, Payout, PayPeriod } from '@/types'

interface Props {
  params: { id: string }
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

export default async function HistoricoColaboradorPage({ params }: Props) {
  const supabase = createClient()

  const { data: colaborador } = await supabase
    .from('users')
    .select('id, nome, funcao, ativo')
    .eq('id', params.id)
    .single()

  if (!colaborador) notFound()

  const [{ data: entries }, { data: payouts }, { data: periodos }] = await Promise.all([
    supabase
      .from('production_entries')
      .select('*')
      .eq('colaborador_id', params.id)
      .order('data_producao', { ascending: false }),
    supabase
      .from('payouts')
      .select('*')
      .eq('colaborador_id', params.id),
    supabase
      .from('pay_periods')
      .select('id, data_inicio, data_fim, status')
      .order('data_inicio', { ascending: false }),
  ])

  const periodosMap = new Map((periodos ?? []).map((p) => [p.id, p as PayPeriod]))
  const payoutsMap = new Map((payouts ?? []).map((p) => [p.quinzena_id, p as Payout]))

  const entriesPorQuinzena = new Map<string, ProductionEntry[]>()
  for (const e of (entries ?? []) as ProductionEntry[]) {
    const lista = entriesPorQuinzena.get(e.quinzena_id) ?? []
    lista.push(e)
    entriesPorQuinzena.set(e.quinzena_id, lista)
  }

  // União das quinzenas onde o colaborador tem lançamento e/ou payout,
  // ordenada da mais recente para a mais antiga.
  const quinzenaIds = new Set<string>([
    ...Array.from(entriesPorQuinzena.keys()),
    ...Array.from(payoutsMap.keys()),
  ])
  const quinzenasOrdenadas = Array.from(quinzenaIds)
    .map((id) => periodosMap.get(id))
    .filter((p): p is PayPeriod => Boolean(p))
    .sort((a, b) => new Date(b.data_inicio).getTime() - new Date(a.data_inicio).getTime())

  const totalRecebido = (payouts ?? []).reduce((s, p) => s + p.valor_total, 0)

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/configuracoes"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-2"
        >
          <ArrowLeft size={14} />
          Colaboradores
        </Link>
        <h2 className="text-xl font-semibold text-gray-800">{colaborador.nome}</h2>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-gray-400 capitalize">{colaborador.funcao}</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
              colaborador.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}
          >
            {colaborador.ativo ? 'Ativo' : 'Inativo'}
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <p className="text-xs text-gray-500">Total recebido (todas as quinzenas)</p>
        <p className="text-lg font-semibold text-green-700">{formatarMoeda(totalRecebido)}</p>
      </div>

      {quinzenasOrdenadas.length === 0 ? (
        <div className="text-center py-14">
          <p className="text-sm text-gray-400">Nenhuma quinzena encontrada para este colaborador.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {quinzenasOrdenadas.map((periodo) => {
            const entriesDaQuinzena = entriesPorQuinzena.get(periodo.id) ?? []
            const payout = payoutsMap.get(periodo.id)

            return (
              <div key={periodo.id} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <Link
                    href={`/admin/quinzena/${periodo.id}`}
                    className="text-sm font-medium text-gray-700 hover:text-blue-600"
                  >
                    {formatDate(periodo.data_inicio)} – {formatDate(periodo.data_fim)}
                  </Link>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600">
                      {periodo.status === 'fechada' ? 'Fechada' : 'Aberta'}
                    </span>
                    {payout && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          payout.status === 'pago' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {payout.status === 'pago' ? `Pago · ${formatarMoeda(payout.valor_total)}` : 'Pagamento pendente'}
                      </span>
                    )}
                  </div>
                </div>

                {payout?.observacao && (
                  <p className="px-4 py-2 text-xs text-gray-600 bg-blue-50 border-b border-gray-200">
                    <span className="font-medium">Anotação do fechamento: </span>
                    {payout.observacao}
                  </p>
                )}

                {entriesDaQuinzena.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 text-left text-gray-500">
                          <th className="px-4 py-2">Data</th>
                          <th className="px-4 py-2">Função</th>
                          <th className="px-4 py-2">Marca</th>
                          <th className="px-4 py-2">Tamanho</th>
                          <th className="px-4 py-2 text-right">Qtd</th>
                          <th className="px-4 py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entriesDaQuinzena.map((entry) => {
                          const status = STATUS_LABELS[entry.status] ?? STATUS_LABELS.pendente
                          return (
                            <tr key={entry.id} className="border-b border-gray-100 last:border-0">
                              <td className="px-4 py-2">{formatDate(entry.data_producao)}</td>
                              <td className="px-4 py-2 text-gray-500">
                                {FUNCAO_LABELS[entry.funcao] ?? entry.funcao ?? '—'}
                              </td>
                              <td className="px-4 py-2">{entry.marca}</td>
                              <td className="px-4 py-2">{entry.tamanho}</td>
                              <td className="px-4 py-2 text-right font-medium">
                                {entry.quantidade.toLocaleString('pt-BR')}
                              </td>
                              <td className="px-4 py-2">
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
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="px-4 py-3 text-xs text-gray-400">Sem lançamentos individuais nesta quinzena.</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
