import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const updateSchema = z.object({
  nome: z.string().min(2).optional(),
  pix_key: z.string().nullable().optional(),
  ativo: z.boolean().optional(),
})

async function assertAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.funcao !== 'admin') return null
  return user
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await assertAdmin()
    if (!admin) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

    const body = await request.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const adminClient = createAdminClient()
    const updates: Record<string, unknown> = {}
    if (parsed.data.nome !== undefined) updates.nome = parsed.data.nome
    if (parsed.data.pix_key !== undefined) updates.pix_key = parsed.data.pix_key
    if (parsed.data.ativo !== undefined) updates.ativo = parsed.data.ativo

    const { data, error } = await adminClient
      .from('users')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Erro ao atualizar colaborador' }, { status: 500 })
  }
}
