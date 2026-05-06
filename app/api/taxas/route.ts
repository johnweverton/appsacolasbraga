import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const updateSchema = z.object({
  funcao: z.enum(['pintor', 'ajudante']),
  valor_unitario: z.number().positive('Valor deve ser maior que zero'),
})

async function assertAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  let funcao = user.user_metadata?.funcao
  if (!funcao) {
    const { data: profile } = await supabase
      .from('users')
      .select('funcao')
      .eq('id', user.id)
      .single()
    funcao = profile?.funcao
  }

  return funcao === 'admin' ? user : null
}

export async function GET() {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('payment_rates')
      .select('id, funcao, valor_unitario, vigencia_inicio, created_at')
      .is('vigencia_fim', null)
      .order('funcao')

    if (error) throw error
    return NextResponse.json(data ?? [])
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar taxas' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await assertAdmin()
    if (!admin) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

    const body = await request.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { funcao, valor_unitario } = parsed.data
    const hoje = new Date().toISOString().split('T')[0]
    const supabase = createClient()

    // Encerra a vigência da taxa atual
    await supabase
      .from('payment_rates')
      .update({ vigencia_fim: hoje })
      .eq('funcao', funcao)
      .is('vigencia_fim', null)

    // Cria a nova taxa
    const { data, error } = await supabase
      .from('payment_rates')
      .insert({
        funcao,
        valor_unitario,
        vigencia_inicio: hoje,
        criado_por: admin.id,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erro ao atualizar taxa' }, { status: 500 })
  }
}
