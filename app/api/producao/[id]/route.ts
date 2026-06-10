import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { assertAdmin } from '@/lib/admin-auth'
import { logAudit } from '@/lib/audit'
import { enviarPushParaUsuario } from '@/lib/push'
import { z } from 'zod'

const patchAdminSchema = z.object({
  status: z.enum(['confirmado', 'divergente', 'pendente']),
  observacao: z.string().optional(),
})

const patchColaboradorSchema = z.object({
  quantidade: z.number().int().min(1),
  marca: z.string().min(1),
  tamanho: z.string().min(1),
  cores: z.number().int().min(1),
  data_producao: z.string().min(1),
})

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { data: entry, error: fetchError } = await supabase
      .from('production_entries')
      .select('colaborador_id, parceiro_id, status, quinzena_id, data_producao, marca, tamanho')
      .eq('id', params.id)
      .single()

    if (fetchError || !entry) {
      return NextResponse.json({ error: 'Lançamento não encontrado' }, { status: 404 })
    }

    const adminUser = await assertAdmin()

    if (!adminUser && entry.colaborador_id !== user.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    if (!adminUser && entry.status !== 'pendente') {
      return NextResponse.json(
        { error: 'Apenas lançamentos pendentes podem ser excluídos.' },
        { status: 409 }
      )
    }

    // Se fazia par (confirmado/divergente), resetar parceiro para pendente
    if (entry.status !== 'pendente' && entry.parceiro_id) {
      const { data: espelho } = await supabase
        .from('production_entries')
        .select('id')
        .eq('quinzena_id', entry.quinzena_id)
        .eq('colaborador_id', entry.parceiro_id)
        .eq('parceiro_id', entry.colaborador_id)
        .eq('data_producao', entry.data_producao)
        .eq('marca', entry.marca)
        .eq('tamanho', entry.tamanho)
        .maybeSingle()

      if (espelho) {
        await supabase
          .from('production_entries')
          .update({ status: 'pendente' })
          .eq('id', espelho.id)
      }
    }

    const { error } = await supabase
      .from('production_entries')
      .delete()
      .eq('id', params.id)

    if (error) throw error

    await logAudit('excluiu_lancamento', {
      usuarioId: user.id,
      tabela: 'production_entries',
      registroId: params.id,
      payload: { por: adminUser ? 'admin' : 'colaborador' },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erro ao excluir lançamento' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const body = await request.json()
    const adminUser = await assertAdmin()

    if (adminUser) {
      const parsed = patchAdminSchema.safeParse(body)
      if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

      const { data, error } = await supabase
        .from('production_entries')
        .update({ status: parsed.data.status, observacao: parsed.data.observacao ?? null })
        .eq('id', params.id)
        .select()
        .single()

      if (error) throw error

      await logAudit('editou_lancamento', {
        usuarioId: user.id,
        tabela: 'production_entries',
        registroId: params.id,
        payload: { novo_status: parsed.data.status },
      })

      // Notifica o colaborador quando admin confirma manualmente
      if (parsed.data.status === 'confirmado' && data.colaborador_id) {
        await enviarPushParaUsuario(
          data.colaborador_id,
          '✅ Registro confirmado!',
          `Seu lançamento de ${data.quantidade} unidades foi confirmado pelo administrador.`,
          '/colaborador/producoes'
        )
      }

      return NextResponse.json(data)
    }

    // Colaborador: editar conteúdo do próprio lançamento pendente
    const { data: entry, error: fetchError } = await supabase
      .from('production_entries')
      .select('colaborador_id, status, quinzena_id, parceiro_id')
      .eq('id', params.id)
      .single()

    if (fetchError || !entry) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
    if (entry.colaborador_id !== user.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    if (entry.status !== 'pendente') {
      return NextResponse.json(
        { error: 'Apenas lançamentos pendentes podem ser editados.' },
        { status: 409 }
      )
    }

    const parsed = patchColaboradorSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const { data: updated, error: updateError } = await supabase
      .from('production_entries')
      .update({ ...parsed.data })
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) throw updateError

    // Re-executa conferência automática com os novos dados
    const { data: espelho } = await supabase
      .from('production_entries')
      .select('id, quantidade')
      .eq('quinzena_id', entry.quinzena_id)
      .eq('colaborador_id', entry.parceiro_id)
      .eq('parceiro_id', entry.colaborador_id)
      .eq('data_producao', updated.data_producao)
      .eq('marca', updated.marca)
      .eq('tamanho', updated.tamanho)
      .eq('status', 'pendente')
      .neq('id', updated.id)
      .maybeSingle()

    if (espelho) {
      const novoStatus = espelho.quantidade === updated.quantidade ? 'confirmado' : 'divergente'
      await supabase
        .from('production_entries')
        .update({ status: novoStatus })
        .in('id', [updated.id, espelho.id])
      return NextResponse.json({ ...updated, status: novoStatus })
    }

    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Erro ao atualizar lançamento' }, { status: 500 })
  }
}
