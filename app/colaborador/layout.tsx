import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Logo } from '@/components/ui/Logo'
import { BotaoLogout } from '@/components/ui/BotaoLogout'
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
      <header className="px-5 pt-5 pb-3 flex items-center justify-between">
        <Logo size="sm" />
        <BotaoLogout />
      </header>
      <main className="flex-1 px-4 pt-3 pb-28 max-w-lg mx-auto w-full overflow-x-hidden">
        {children}
      </main>
      <NavColaborador />
    </div>
  )
}
