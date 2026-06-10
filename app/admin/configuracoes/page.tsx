export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ColaboradoresConfig } from '@/components/admin/ColaboradoresConfig'
import { ValoresFuncao } from '@/components/admin/ValoresFuncao'
import { Shield } from 'lucide-react'

export default async function ConfiguracoesPage() {
  const supabase = createClient()
  const adminClient = createAdminClient()

  const [{ data: colaboradores }, { data: taxas }, authUsersRes] = await Promise.all([
    supabase
      .from('users')
      .select('id, nome, funcao, pix_key, ativo')
      .neq('funcao', 'admin')
      .order('nome'),
    supabase
      .from('payment_rates')
      .select('id, funcao, valor_unitario, vigencia_inicio')
      .is('vigencia_fim', null)
      .order('funcao'),
    adminClient.auth.admin.listUsers({ perPage: 1000 }),
  ])

  const emailMap = new Map(
    (authUsersRes.data?.users ?? []).map((u) => [u.id, u.email ?? ''])
  )

  const colaboradoresComEmail = (colaboradores ?? []).map((c) => ({
    ...c,
    email: emailMap.get(c.id) ?? '',
  }))

  return (
    <div className="space-y-6">
      <h2 className="font-display font-bold text-brand-dark text-2xl">Configurações</h2>
      <ColaboradoresConfig colaboradoresIniciais={colaboradoresComEmail} />
      <ValoresFuncao taxasIniciais={taxas ?? []} />

      <div className="rounded-2xl bg-white border border-black/[0.06] p-5">
        <h3 className="text-sm font-sans font-semibold text-brand-dark/60 uppercase tracking-widest mb-3">Sistema</h3>
        <Link
          href="/admin/auditoria"
          className="flex items-center gap-3 py-2 text-sm text-brand-dark/70 hover:text-brand-blue transition-colors"
        >
          <Shield size={16} className="text-brand-dark/40" />
          <span>Log de auditoria</span>
          <span className="ml-auto text-brand-dark/30 text-xs">→</span>
        </Link>
      </div>
    </div>
  )
}
