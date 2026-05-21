import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const entrySchema = z.object({
  quinzena_id: z.string().uuid(),
  parceiro_id: z.string().uuid(),
  data_producao: z.string(),
  marca: z.string().min(1),
  tamanho: z.string().min(1),
  cores: z.number().int().min(1),
  quantidade: z.number().int().min(1),
})

export async function GET() {
  try {
    const supabase = createClient()

    const { data: quinzena } = await supabase
      .from('pay_periods')
      .select('id')
      .eq('status', 'aberta')
      .single()

    if (!quinzena) return NextResponse.json([])

    const { data, error } = await supabase
      .from('production_entries')
      .select('*')
      .eq('quinzena_id', quinzena.id)
      .order('data_producao', { ascending: false })

    if (error) throw error
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar produções' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const body = await request.json()
    const parsed = entrySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { data: novaEntrada, error } = await supabase
      .from('production_entries')
      .insert({ ...parsed.data, colaborador_id: user.id, status: 'pendente' })
      .select()
      .single()

    if (error) throw error

    // Conferência automática: busca registro espelho do parceiro
    const { data: espelho } = await supabase
      .from('production_entries')
      .select('id, quantidade')
      .eq('quinzena_id', novaEntrada.quinzena_id)
      .eq('colaborador_id', novaEntrada.parceiro_id)
      .eq('parceiro_id', novaEntrada.colaborador_id)
      .eq('data_producao', novaEntrada.data_producao)
      .eq('marca', novaEntrada.marca)
      .eq('tamanho', novaEntrada.tamanho)
      .eq('status', 'pendente')
      .maybeSingle()

    if (espelho) {
      const novoStatus = espelho.quantidade === novaEntrada.quantidade ? 'confirmado' : 'divergente'
      await supabase
        .from('production_entries')
        .update({ status: novoStatus })
        .in('id', [novaEntrada.id, espelho.id])
      return NextResponse.json({ ...novaEntrada, status: novoStatus }, { status: 201 })
    }

    return NextResponse.json(novaEntrada, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erro ao registrar produção' }, { status: 500 })
  }
}
