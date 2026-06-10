import { NextResponse, NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { assertAdmin } from '@/lib/admin-auth'
import { logAudit } from '@/lib/audit'
import { enviarPushParaUsuario } from '@/lib/push'

export async function GET() {
  try {
    const authUser = await assertAdmin()
    if (!authUser) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

    const db = createAdminClient()
    const { data, error } = await db
      .from('payouts')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar pagamentos' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authUser = await assertAdmin()
    if (!authUser) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

    const body = await request.json()
    const { id, comprovante_url } = body
    const db = createAdminClient()

    // Atualização parcial: só comprovante_url
    if (comprovante_url !== undefined) {
      const { data, error } = await db
        .from('payouts')
        .update({ comprovante_url })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return NextResponse.json(data)
    }

    // Marcar como pago
    const { data, error } = await db
      .from('payouts')
      .update({ status: 'pago', pago_em: new Date().toISOString(), pago_por: authUser.id })
      .eq('id', id)
      .select('*, users!colaborador_id(nome)')
      .single()

    if (error) throw error

    const valor = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.valor_total)
    await Promise.all([
      logAudit('marcou_pago', {
        usuarioId: authUser.id,
        tabela: 'payouts',
        registroId: id,
        payload: { colaborador_id: data.colaborador_id, valor_total: data.valor_total },
      }),
      enviarPushParaUsuario(
        data.colaborador_id,
        'Pagamento realizado!',
        `Seu pagamento de ${valor} foi confirmado. 🎉`,
        '/colaborador/historico'
      ),
    ])

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Erro ao atualizar pagamento' }, { status: 500 })
  }
}
