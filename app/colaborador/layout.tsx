import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Logo } from '@/components/ui/Logo'
import { BotaoLogout } from '@/components/ui/BotaoLogout'
import { BotaoNotificacoes } from '@/components/ui/BotaoNotificacoes'
import { NavColaborador } from '@/components/colaborador/NavColaborador'

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
    <div className="min-h-screen bg-brand-cream flex flex-col">
      <header className="px-5 h-12 flex items-center justify-between shrink-0">
        <Logo size="sm" />
        <div className="flex items-center gap-2">
          <BotaoNotificacoes />
          <BotaoLogout />
        </div>
      </header>
      <main className="flex-1 px-4 pt-6 pb-28 max-w-lg mx-auto w-full overflow-x-hidden">
        {children}
      </main>
      <NavColaborador />
    </div>
  )
}
