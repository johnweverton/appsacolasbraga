'use server'

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getQuinzenaAtiva } from '@/lib/quinzena'
import type { PayPeriod } from '@/types'

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function criarOuObterQuinzenaAtiva(): Promise<PayPeriod | null> {
  const supabase = serviceClient()

  const { data: existente } = await supabase
    .from('pay_periods')
    .select('*')
    .eq('status', 'aberta')
    .maybeSingle()

  if (existente) return existente as PayPeriod

  const { inicio, fim, data_pagamento } = getQuinzenaAtiva()

  const toISO = (d: Date) => d.toISOString().split('T')[0]

  const { data: nova, error } = await supabase
    .from('pay_periods')
    .insert({
      data_inicio: toISO(inicio),
      data_fim: toISO(fim),
      data_pagamento: toISO(data_pagamento),
      status: 'aberta',
    })
    .select('*')
    .single()

  if (error) {
    console.error('Erro ao criar quinzena:', error)
    return null
  }

  return nova as PayPeriod
}

/**
 * Resolve em qual quinzena o colaborador deve lançar produção agora.
 *
 * Normalmente é a quinzena global 'aberta'. Mas se o admin fechou a quinzena
 * deixando esse colaborador pendente (ele tem lançamentos ali mas ainda não
 * foi fechado individualmente), ele continua lançando na quinzena antiga —
 * mesmo que ela já esteja 'fechada' — até o admin fechar a produção dele.
 */
export async function obterQuinzenaAtivaColaborador(userId: string): Promise<PayPeriod | null> {
  const supabase = serviceClient()

  const { data: fechadas } = await supabase
    .from('pay_periods')
    .select('*')
    .eq('status', 'fechada')
    .order('data_fim', { ascending: false })

  if (fechadas && fechadas.length > 0) {
    const ids = fechadas.map((q) => q.id)
    const [{ data: entradas }, { data: payouts }] = await Promise.all([
      supabase.from('production_entries').select('quinzena_id').eq('colaborador_id', userId).in('quinzena_id', ids),
      supabase.from('payouts').select('quinzena_id').eq('colaborador_id', userId).in('quinzena_id', ids),
    ])
    const quinzenasComLancamento = new Set((entradas ?? []).map((e) => e.quinzena_id))
    const quinzenasJaFechadasParaMim = new Set((payouts ?? []).map((p) => p.quinzena_id))
    const pendente = fechadas.find(
      (q) => quinzenasComLancamento.has(q.id) && !quinzenasJaFechadasParaMim.has(q.id)
    )
    if (pendente) return pendente as PayPeriod
  }

  return criarOuObterQuinzenaAtiva()
}
