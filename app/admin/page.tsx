import { createClient } from '@/lib/supabase/server'
import { KpiCard } from '@/components/admin/KpiCard'
import { ContadorPagamento } from '@/components/admin/ContadorPagamento'
import { AlertaDivergencias } from '@/components/admin/AlertaDivergencias'
import type { ProductionEntry } from '@/types'

export default async function AdminDashboard() {
  const supabase = createClient()

  const { data: quinzena } = await supabase
    .from('pay_periods')
    .select('id')
    .eq('status', 'aberta')
    .single()

  const { data: entries } = quinzena
    ? await supabase
        .from('production_entries')
        .select('id, quantidade, status, quinzena_id, colaborador_id, parceiro_id, data_producao, marca, tamanho, cores, observacao, created_at, updated_at')
        .eq('quinzena_id', quinzena.id)
    : { data: [] }

  const allEntries = (entries ?? []) as ProductionEntry[]
  // Conta pendente + confirmado (só divergente não conta)
  const totalUnidades = allEntries
    .filter((e) => e.status !== 'divergente')
    .reduce((sum, e) => sum + e.quantidade, 0)
  const divergencias = allEntries.filter((e) => e.status === 'divergente')

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-800">Dashboard</h2>

      {!quinzena && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center space-y-1">
          <p className="text-gray-600 font-medium">Nenhuma quinzena aberta</p>
          <p className="text-sm text-gray-400">
            Acesse <strong>Quinzena</strong> no menu para abrir um novo período.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard
          title="Unidades Registradas"
          value={totalUnidades.toLocaleString('pt-BR')}
          description="na quinzena atual"
        />
        <KpiCard
          title="Divergências"
          value={divergencias.length}
          description={divergencias.length === 1 ? 'pendente de resolução' : 'pendentes de resolução'}
        />
        <ContadorPagamento />
      </div>

      {divergencias.length > 0 && <AlertaDivergencias divergencias={divergencias} />}
    </div>
  )
}
