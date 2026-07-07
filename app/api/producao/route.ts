import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { conferirEAtualizarPar } from '@/lib/conferir-par'
import { z } from 'zod'

const entrySchema = z.object({
  quinzena_id: z.string().uuid(),
  parceiro_id: z.string().uuid(),
  data_producao: z.string(),
  funcao: z.enum(['pintor', 'ajudante', 'ambos']),
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

    // "Pintor + Ajudante" só é válido em lançamento solo (parceiro = o próprio colaborador)
    if (parsed.data.funcao === 'ambos' && parsed.data.parceiro_id !== user.id) {
      return NextResponse.json(
        { error: '"Pintor + Ajudante" só pode ser usado em lançamento solo, com você mesmo como parceiro.' },
        { status: 400 }
      )
    }

    const { data: novaEntrada, error } = await supabase
      .from('production_entries')
      .insert({ ...parsed.data, colaborador_id: user.id, status: 'pendente' })
      .select()
      .single()

    if (error) throw error

    // Conferência automática: casa com o lançamento espelho do parceiro e
    // audita quantidade + função (trava como divergente e notifica se houver erro).
    const { matched, novoStatus, observacao } = await conferirEAtualizarPar(supabase, novaEntrada.id)
    if (matched) {
      return NextResponse.json({ ...novaEntrada, status: novoStatus, observacao }, { status: 201 })
    }

    return NextResponse.json(novaEntrada, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erro ao registrar produção' }, { status: 500 })
  }
}
