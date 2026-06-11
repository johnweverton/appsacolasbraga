export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { GraficoRelatorios } from '@/components/admin/GraficoRelatorios'
import { formatarMoeda } from '@/lib/calculos'

export default async function RelatoriosPage() {
  const supabase = createClient()

  const [
    { data: quinzenas },
    { data: entries },
    { data: payouts },
    { data: colaboradores },
  ] = await Promise.all([
    supabase
      .from('pay_periods')
      .select('id, data_inicio, data_fim, status')
      .order('data_inicio', { ascending: false })
      .limit(6),
    supabase
      .from('production_entries')
      .select('quinzena_id, colaborador_id, quantidade, cores, status'),
    supabase
      .from('payouts')
      .select('quinzena_id, colaborador_id, valor_total, total_unidades'),
    supabase
      .from('users')
      .select('id, nome')
      .neq('funcao', 'admin'),
  ])

  const nomesMap = new Map((colaboradores ?? []).map((c) => [c.id, c.nome]))

  // Dados por quinzena
  const dadosPorQuinzena = (quinzenas ?? []).map((q) => {
    const qEntries = (entries ?? []).filter((e) => e.quinzena_id === q.id)
    const qPayouts = (payouts ?? []).filter((p) => p.quinzena_id === q.id)
    const periodo = `${q.data_inicio.slice(5, 10)} – ${q.data_fim.slice(5, 10)}`
    return {
      periodo,
      // Cada cor exige uma passada de impressão separada: unidade efetiva = quantidade × cores
      unidades: qEntries.reduce((s, e) => s + (e.status !== 'divergente' ? e.quantidade * e.cores : 0), 0),
      valor: qPayouts.reduce((s, p) => s + p.valor_total, 0),
      pendente: qEntries.filter((e) => e.status === 'pendente').length,
      confirmado: qEntries.filter((e) => e.status === 'confirmado').length,
      divergente: qEntries.filter((e) => e.status === 'divergente').length,
    }
  }).reverse()

  // Top colaboradores (últimas 2 quinzenas)
  const ultimas2 = (quinzenas ?? []).slice(0, 2).map((q) => q.id)
  const rankMap = new Map<string, number>()
  for (const e of (entries ?? [])) {
    if (!ultimas2.includes(e.quinzena_id)) continue
    if (e.status === 'divergente') continue
    rankMap.set(e.colaborador_id, (rankMap.get(e.colaborador_id) ?? 0) + e.quantidade * e.cores)
  }
  const topColaboradores = Array.from(rankMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([id, unidades]) => ({ nome: nomesMap.get(id) ?? id.slice(0, 8), unidades }))

  // Totais gerais
  const totalPago = (payouts ?? []).reduce((s, p) => s + p.valor_total, 0)
  // Cada cor exige uma passada de impressão separada: unidade efetiva = quantidade × cores
  const totalUnidades = (entries ?? []).reduce((s, e) => s + (e.status !== 'divergente' ? e.quantidade * e.cores : 0), 0)
  const totalDivergentes = (entries ?? []).filter((e) => e.status === 'divergente').length

  return (
    <div className="space-y-6">
      <h2 className="font-display font-bold text-brand-dark text-2xl">Relatórios</h2>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: 'Total pago', valor: formatarMoeda(totalPago), cor: 'text-green-700' },
          { label: 'Total unidades', valor: totalUnidades.toLocaleString('pt-BR'), cor: 'text-brand-blue' },
          { label: 'Divergências', valor: totalDivergentes.toString(), cor: 'text-red-600' },
        ].map(({ label, valor, cor }) => (
          <div key={label} className="rounded-2xl bg-white border border-black/[0.06] p-4">
            <p className="text-[10px] font-sans font-semibold uppercase tracking-widest text-brand-dark/35 mb-1">{label}</p>
            <p className={`font-display font-bold text-xl ${cor}`}>{valor}</p>
          </div>
        ))}
      </div>

      <GraficoRelatorios
        dadosPorQuinzena={dadosPorQuinzena}
        topColaboradores={topColaboradores}
      />
    </div>
  )
}
