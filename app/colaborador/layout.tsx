import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { BotaoLogout } from '@/components/ui/BotaoLogout'

export default async function ColaboradorLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  let funcao = user.user_metadata?.funcao
  if (!funcao) {
    const { data: profile } = await supabase
      .from('users')
      .select('funcao')
      .eq('id', user.id)
      .single()
    funcao = profile?.funcao
  }

  if (funcao === 'admin') redirect('/admin')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-800">Sacolas Braga</h1>
        <nav className="flex gap-4 text-sm">
          <Link href="/colaborador" className="text-gray-600 hover:text-gray-900">Início</Link>
          <Link href="/colaborador/historico" className="text-gray-600 hover:text-gray-900">Histórico</Link>
          <BotaoLogout />
        </nav>
      </header>
      <main className="p-4 max-w-lg mx-auto">{children}</main>
    </div>
  )
}
