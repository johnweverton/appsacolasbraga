import { createClient } from '@/lib/supabase/server'
import { ColaboradoresConfig } from '@/components/admin/ColaboradoresConfig'

export default async function ConfiguracoesPage() {
  const supabase = createClient()

  const { data: colaboradores } = await supabase
    .from('users')
    .select('id, nome, funcao, pix_key, ativo')
    .neq('funcao', 'admin')
    .order('nome')

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-800">Configurações</h2>

      <ColaboradoresConfig colaboradoresIniciais={colaboradores ?? []} />

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="font-medium text-gray-700 mb-1">Valores por Função</h3>
        <p className="text-sm text-gray-500">Definição do valor unitário para pintores e ajudantes — em construção.</p>
      </div>
    </div>
  )
}
