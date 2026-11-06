import { NextResponse, NextRequest } from 'next/server'
import { z } from 'zod'
import { assertAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAudit } from '@/lib/audit'
import { avaliarReabertura } from '@/lib/reabrir-quinzena'

const schema = z.object({ quinzena_id: z.string().uuid() })

/**
 * Reabre a quinzena fechada mais recente (ex.: fechada por engano).
 * Apaga os pagamentos pendentes gerados no fechamento e remove a quinzena nova
 * criada automaticamente, desde que ela esteja vazia. Regras em lib/reabrir-quinzena.
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await assertAdmin()
    if (!admin) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

    const parsed = schema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: 'Quinzena inválida.' }, { status: 400 })
    const { quinzena_id } = parsed.data

    const db = createAdminClient()

    const [{ data: alvo }, { data: recentes }, { data: aberta }, { data: payoutsAlvo }] = await Promise.all([
      db.from('pay_periods').select('id, status, data_fim').eq('id', quinzena_id).maybeSingle(),
      db.from('pay_periods').select('id, status, data_fim').eq('status', 'fechada')
        .order('data_fim', { ascending: false }).limit(1),
      db.from('pay_periods').select('id, status, data_fim').eq('status', 'aberta').maybeSingle(),
      db.from('payouts').select('status, comprovante_url, recibo_url').eq('quinzena_id', quinzena_id),
    ])

    let lancamentosAberta = 0
    let payoutsAberta = 0
    if (aberta && aberta.id !== quinzena_id) {
      const [{ count: ce }, { count: cp }] = await Promise.all([
        db.from('production_entries').select('id', { count: 'exact', head: true }).eq('quinzena_id', aberta.id),
        db.from('payouts').select('id', { count: 'exact', head: true }).eq('quinzena_id', aberta.id),
      ])
      lancamentosAberta = ce ?? 0
      payoutsAberta = cp ?? 0
    }

    const avaliacao = avaliarReabertura({
      alvo: alvo ?? null,
      maisRecenteFechada: recentes?.[0] ?? null,
      payoutsAlvo: payoutsAlvo ?? [],
      aberta: aberta ?? null,
      lancamentosAberta,
      payoutsAberta,
    })

    if (!avaliacao.ok) {
      return NextResponse.json({ error: avaliacao.erro }, { status: avaliacao.status })
    }

    // 1. Remove a quinzena nova (vazia) — só pode haver uma aberta
    if (avaliacao.removerAbertaId) {
      const { error } = await db.from('pay_periods').delete().eq('id', avaliacao.removerAbertaId)
      if (error) throw error
    }

    // 2. Remove os pagamentos pendentes gerados no fechamento
    const { error: delPayoutsError } = await db
      .from('payouts')
      .delete()
      .eq('quinzena_id', quinzena_id)
      .eq('status', 'pendente')
    if (delPayoutsError) throw delPayoutsError

    // 3. Volta a quinzena para aberta
    const { error: updateError } = await db
      .from('pay_periods')
      .update({ status: 'aberta', fechado_por: null, fechado_em: null })
      .eq('id', quinzena_id)
    if (updateError) throw updateError

    await logAudit('reabriu_quinzena', {
      usuarioId: admin.id,
      tabela: 'pay_periods',
      registroId: quinzena_id,
      payload: {
        payouts_removidos: avaliacao.payoutsParaRemover,
        quinzena_vazia_removida: avaliacao.removerAbertaId,
      },
    })

    return NextResponse.json({ success: true, payouts_removidos: avaliacao.payoutsParaRemover })
  } catch (error) {
    console.error('Erro ao reabrir quinzena:', error)
    return NextResponse.json({ error: 'Erro ao reabrir quinzena.' }, { status: 500 })
  }
}
