import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calcularPayouts } from '@/lib/calculos'
import { z } from 'zod'

const schema = z.object({
  quinzena_id: z.string().uuid(),
  colaborador_id: z.string().uuid(),
})

async function assertAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  let funcao = user.user_metadata?.funcao
  if (!funcao) {
    const { data: profile } = await supabase.from('users').select('funcao').eq('id', user.id).single()
    funcao = profile?.funcao
  }
  return funcao === 'admin' ? user : null
}

export async function POST(request: NextRequest) {
  try {
    const admin = await assertAdmin()
    if (!admin) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const { quinzena_id, colaborador_id } = parsed.data
    const supabase = createClient()

    // Quinzena deve estar aberta
    const { data: quinzena } = await supabase
      .from('pay_periods')
      .select('id, status')
      .eq('id', quinzena_id)
      .single()

    if (!quinzena || quinzena.status !== 'aberta') {
      return NextResponse.json({ error: 'Quinzena não encontrada ou já fechada.' }, { status: 400 })
    }

    // Colaborador não pode já ter payout nessa quinzena
    const { data: payoutExistente } = await supabase
      .from('payouts')
      .select('id')
      .eq('quinzena_id', quinzena_id)
      .eq('colaborador_id', colaborador_id)
      .maybeSingle()

    if (payoutExistente) {
      return NextResponse.json({ error: 'Este colaborador já foi fechado nesta quinzena.' }, { status: 409 })
    }

    // Busca entradas, usuário e taxa
    const [{ data: entries }, { data: userRow }, { data: rates }] = await Promise.all([
      supabase
        .from('production_entries')
        .select('colaborador_id, quantidade, status')
        .eq('quinzena_id', quinzena_id)
        .eq('colaborador_id', colaborador_id),
      supabase.from('users').select('id, funcao').eq('id', colaborador_id).single(),
      supabase.from('payment_rates').select('funcao, valor_unitario').is('vigencia_fim', null),
    ])

    if (!entries || entries.length === 0) {
      return NextResponse.json({ error: 'Nenhum lançamento encontrado para este colaborador.' }, { status: 400 })
    }

    const divergentes = entries.filter((e) => e.status === 'divergente')
    if (divergentes.length > 0) {
      return NextResponse.json(
        { error: `${divergentes.length} lançamento(s) com divergência. Resolva antes de fechar.` },
        { status: 409 }
      )
    }

    const payouts = calcularPayouts(entries, rates ?? [], userRow ? [userRow] : [])

    if (payouts.length === 0) {
      return NextResponse.json({ error: 'Nenhum lançamento válido para calcular.' }, { status: 400 })
    }

    const { data: payout, error: insertError } = await supabase
      .from('payouts')
      .insert({ ...payouts[0], quinzena_id })
      .select()
      .single()

    if (insertError) throw insertError

    return NextResponse.json({ success: true, payout }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erro ao fechar colaborador.' }, { status: 500 })
  }
}
