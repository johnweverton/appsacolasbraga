import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const createSchema = z.object({
  data_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato esperado: YYYY-MM-DD'),
  data_fim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato esperado: YYYY-MM-DD'),
  data_pagamento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato esperado: YYYY-MM-DD'),
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

export async function POST(request: NextRequest) {
  try {
    const admin = await assertAdmin()
    if (!admin) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

    const supabase = createClient()

    const { data: aberta } = await supabase
      .from('pay_periods')
      .select('id')
      .eq('status', 'aberta')
      .single()

    if (aberta) {
      return NextResponse.json(
        { error: 'Já existe uma quinzena aberta. Feche-a antes de criar uma nova.' },
        { status: 409 }
      )
    }

    const body = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { data_inicio, data_fim, data_pagamento } = parsed.data

    if (data_fim <= data_inicio) {
      return NextResponse.json({ error: 'Data de fim deve ser posterior ao início.' }, { status: 400 })
    }
    if (data_pagamento < data_fim) {
      return NextResponse.json({ error: 'Data de pagamento deve ser igual ou posterior ao fim.' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('pay_periods')
      .insert({ data_inicio, data_fim, data_pagamento, status: 'aberta' })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erro ao criar quinzena' }, { status: 500 })
  }
}
