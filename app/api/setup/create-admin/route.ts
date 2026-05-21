import { NextResponse, NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const schema = z.object({
  setup_secret: z.string().min(1),
  email: z.string().email(),
  senha: z.string().min(8, 'Senha deve ter ao menos 8 caracteres'),
  nome: z.string().min(2),
})

export async function POST(request: NextRequest) {
  const SETUP_SECRET = process.env.ADMIN_SETUP_SECRET
  if (!SETUP_SECRET) {
    return NextResponse.json(
      { error: 'Endpoint de setup não configurado.' },
      { status: 403 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { setup_secret, email, senha, nome } = parsed.data

  if (setup_secret !== SETUP_SECRET) {
    return NextResponse.json({ error: 'Segredo de setup inválido.' }, { status: 403 })
  }

  const adminClient = createAdminClient()

  // Verifica se o email já existe em auth.users
  const { data: existingUsers } = await adminClient.auth.admin.listUsers()
  const emailJaExiste = existingUsers?.users.some(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  )
  if (emailJaExiste) {
    return NextResponse.json(
      { error: `O email ${email} já está cadastrado no Supabase Auth.` },
      { status: 409 }
    )
  }

  // Cria o usuário no Supabase Auth com email confirmado e role admin
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome, funcao: 'admin' },
  })

  if (authError) {
    return NextResponse.json(
      { error: `Erro ao criar usuário no Auth: ${authError.message}` },
      { status: 500 }
    )
  }

  const userId = authData.user.id

  // Insere perfil na tabela public.users com funcao = 'admin'
  const { data: profile, error: profileError } = await adminClient
    .from('users')
    .insert({ id: userId, nome, funcao: 'admin', ativo: true })
    .select()
    .single()

  if (profileError) {
    // Rollback: remove o auth user criado para manter consistência
    await adminClient.auth.admin.deleteUser(userId)
    return NextResponse.json(
      { error: `Erro ao criar perfil no banco: ${profileError.message}` },
      { status: 500 }
    )
  }

  return NextResponse.json(
    {
      message: 'Admin criado com sucesso.',
      user: {
        id: userId,
        email,
        nome: profile.nome,
        funcao: profile.funcao,
        ativo: profile.ativo,
      },
    },
    { status: 201 }
  )
}
