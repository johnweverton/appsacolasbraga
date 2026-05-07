import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SplashScreen } from '@/components/ui/SplashScreen'

export default async function Home() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    let funcao = user.user_metadata?.funcao
    if (!funcao) {
      const { data: profile } = await supabase
        .from('users')
        .select('funcao')
        .eq('id', user.id)
        .single()
      funcao = profile?.funcao
    }
    redirect(funcao === 'admin' ? '/admin' : '/colaborador')
  }

  return <SplashScreen />
}
