import { createClient } from '@/lib/supabase/server'
import { ColaboradoresConfig } from '@/components/admin/ColaboradoresConfig'
import { ValoresFuncao } from '@/components/admin/ValoresFuncao'

export default async function ConfiguracoesPage() {
  const supabase = createClient()

  const [{ data: colaboradores }, { data: taxas }] = await Promise.all([
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
  ])

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-800">Configurações</h2>
      <ColaboradoresConfig colaboradoresIniciais={colaboradores ?? []} />
      <ValoresFuncao taxasIniciais={taxas ?? []} />
    </div>
  )
}
