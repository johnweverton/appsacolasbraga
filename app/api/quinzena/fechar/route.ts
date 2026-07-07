import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calcularPayouts } from '@/lib/calculos'
import { logAudit } from '@/lib/audit'
import { z } from 'zod'

const schema = z.object({
  manter_pendentes: z.array(z.string().uuid()).optional(),
})

export async function POST(request: NextRequest) {
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

    // Colaboradores que o admin optou por deixar pendentes (ex.: ainda estão
    // produzindo e não devem ser fechados junto com o resto). A quinzena
    // fecha normalmente, mas eles ficam sem payout até serem fechados
    // manualmente depois via /api/quinzena/fechar-colaborador.
    let manterPendentes: string[] = []
    try {
      const body = await request.json()
      const parsed = schema.safeParse(body)
      if (parsed.success && parsed.data.manter_pendentes) {
        manterPendentes = parsed.data.manter_pendentes
      }
    } catch {
      // sem body → nenhum colaborador fica pendente (comportamento padrão)
    }

    const [{ data: entries }, { data: rates }, { data: payoutsExistentes }] = await Promise.all([
      supabase
        .from('production_entries')
        .select('colaborador_id, quantidade, cores, status, funcao')
        .eq('quinzena_id', quinzena.id),
      supabase.from('payment_rates').select('funcao, valor_unitario').is('vigencia_fim', null),
      supabase.from('payouts').select('colaborador_id').eq('quinzena_id', quinzena.id),
    ])

    // Exclui colaboradores que já foram fechados individualmente e os que o
    // admin escolheu manter pendentes nesta rodada.
    const jaFechados = new Set((payoutsExistentes ?? []).map((p) => p.colaborador_id))
    const pendentesParaManter = new Set(manterPendentes)
    const entriesPendentes = (entries ?? []).filter(
      (e) => !jaFechados.has(e.colaborador_id) && !pendentesParaManter.has(e.colaborador_id)
    )

    // Conta divergências apenas entre quem ainda não foi fechado
    // (divergente é excluído do cálculo, não bloqueia mais o fechamento geral)
    const divergencias = entriesPendentes.filter((e) => e.status === 'divergente').length

    const payouts = calcularPayouts(entriesPendentes, rates ?? [])

    if (payouts.length === 0 && jaFechados.size === 0 && pendentesParaManter.size === 0) {
      return NextResponse.json({ error: 'Nenhum lançamento válido para calcular.' }, { status: 400 })
    }

    if (payouts.length > 0) {
      const { error: insertError } = await supabase
        .from('payouts')
        .insert(payouts.map((p) => ({ ...p, quinzena_id: quinzena.id })))

      if (insertError) throw insertError
    }

    const { error: updateError } = await supabase
      .from('pay_periods')
      .update({ status: 'fechada', fechado_por: user.id, fechado_em: new Date().toISOString() })
      .eq('id', quinzena.id)

    if (updateError) throw updateError

    await logAudit('fechou_quinzena', {
      usuarioId: user.id,
      tabela: 'pay_periods',
      registroId: quinzena.id,
      payload: { payouts_gerados: payouts.length, divergencias, colaboradores_pendentes: manterPendentes },
    })

    return NextResponse.json({
      success: true,
      payouts_gerados: payouts.length,
      colaboradores_pendentes: manterPendentes.length,
      ...(divergencias > 0 && {
        aviso: `${divergencias} lançamento(s) com divergência foram ignorados. Resolva-os manualmente.`,
      }),
    })
  } catch {
    return NextResponse.json({ error: 'Erro ao fechar quinzena' }, { status: 500 })
  }
}
