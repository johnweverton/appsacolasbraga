import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const createSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  senha: z.string().min(6, 'Senha deve ter ao menos 6 caracteres'),
  funcao: z.enum(['pintor', 'ajudante']),
  pix_key: z.string().optional(),
})

async function assertAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.funcao !== 'admin') return null
  return user
}

export async function GET() {
  try {
    const admin = await assertAdmin()
    if (!admin) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

    const supabase = createClient()
    const { data, error } = await supabase
      .from('users')
      .select('id, nome, funcao, pix_key, ativo, created_at')
      .neq('funcao', 'admin')
      .order('nome')

    if (error) throw error
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar colaboradores' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await assertAdmin()
    if (!admin) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

    const body = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { nome, email, senha, funcao, pix_key } = parsed.data
    const adminClient = createAdminClient()

    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: { nome, funcao },
    })

    if (authError) {
      if (authError.message.includes('already registered')) {
        return NextResponse.json({ error: 'Este email já está cadastrado.' }, { status: 409 })
      }
      throw authError
    }

    const { data: profile, error: profileError } = await adminClient
      .from('users')
      .insert({ id: authData.user.id, nome, funcao, pix_key: pix_key || null })
      .select()
      .single()

    if (profileError) {
      await adminClient.auth.admin.deleteUser(authData.user.id)
      throw profileError
    }

    return NextResponse.json(profile, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erro ao cadastrar colaborador' }, { status: 500 })
  }
}
