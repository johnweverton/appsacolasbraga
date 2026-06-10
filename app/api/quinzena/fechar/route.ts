import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calcularPayouts } from '@/lib/calculos'
import { logAudit } from '@/lib/audit'

export async function POST() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    let funcao = user.user_metadata?.funcao
    if (!funcao) {
      const { data: profile } = await supabase
        .from('users')
        .select('funcao')
        .eq('id', user.id)
        .single()
      funcao = profile?.funcao
    }

    if (funcao !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    const { data: quinzena, error: qError } = await supabase
      .from('pay_periods')
      .select('id')
      .eq('status', 'aberta')
      .single()

    if (qError || !quinzena) {
      return NextResponse.json({ error: 'Nenhuma quinzena aberta' }, { status: 400 })
    }

    const [{ data: entries }, { data: users }, { data: rates }, { data: payoutsExistentes }] = await Promise.all([
      supabase
        .from('production_entries')
        .select('colaborador_id, quantidade, status')
        .eq('quinzena_id', quinzena.id),
      supabase.from('users').select('id, funcao'),
      supabase.from('payment_rates').select('funcao, valor_unitario').is('vigencia_fim', null),
      supabase.from('payouts').select('colaborador_id').eq('quinzena_id', quinzena.id),
    ])

    // Exclui colaboradores que já foram fechados individualmente
    const jaFechados = new Set((payoutsExistentes ?? []).map((p) => p.colaborador_id))
    const entriesPendentes = (entries ?? []).filter((e) => !jaFechados.has(e.colaborador_id))

    // Conta divergências apenas entre quem ainda não foi fechado
    // (divergente é excluído do cálculo, não bloqueia mais o fechamento geral)
    const divergencias = entriesPendentes.filter((e) => e.status === 'divergente').length

    const payouts = calcularPayouts(entriesPendentes, rates ?? [], users ?? [])

    if (payouts.length === 0 && jaFechados.size === 0) {
      return NextResponse.json({ error: 'Nenhum lançamento válido para calcular.' }, { status: 400 })
    }

    const { error: insertError } = await supabase
      .from('payouts')
      .insert(payouts.map((p) => ({ ...p, quinzena_id: quinzena.id })))

    if (insertError) throw insertError

    const { error: updateError } = await supabase
      .from('pay_periods')
      .update({ status: 'fechada', fechado_por: user.id, fechado_em: new Date().toISOString() })
      .eq('id', quinzena.id)

    if (updateError) throw updateError

    await logAudit('fechou_quinzena', {
      usuarioId: user.id,
      tabela: 'pay_periods',
      registroId: quinzena.id,
      payload: { payouts_gerados: payouts.length, divergencias },
    })

    return NextResponse.json({
      success: true,
      payouts_gerados: payouts.length,
      ...(divergencias > 0 && {
        aviso: `${divergencias} lançamento(s) com divergência foram ignorados. Resolva-os manualmente.`,
      }),
    })
  } catch {
    return NextResponse.json({ error: 'Erro ao fechar quinzena' }, { status: 500 })
  }
}
