import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { BotaoLogout } from '@/components/ui/BotaoLogout'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
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

  if (funcao !== 'admin') redirect('/colaborador')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-800">Sacolas Braga</h1>
        <nav className="flex gap-4 text-sm">
          <Link href="/admin" className="text-gray-600 hover:text-gray-900">Dashboard</Link>
          <Link href="/admin/lancamentos" className="text-gray-600 hover:text-gray-900">Lançamentos</Link>
          <Link href="/admin/quinzena" className="text-gray-600 hover:text-gray-900">Quinzena</Link>
          <Link href="/admin/pagamentos" className="text-gray-600 hover:text-gray-900">Pagamentos</Link>
          <Link href="/admin/configuracoes" className="text-gray-600 hover:text-gray-900">Config</Link>
          <BotaoLogout />
        </nav>
      </header>
      <main className="p-6 max-w-6xl mx-auto">{children}</main>
    </div>
  )
}
