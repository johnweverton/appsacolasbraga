'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const form = e.currentTarget
    const email = (form.elements.namedItem('email') as HTMLInputElement).value
    const password = (form.elements.namedItem('password') as HTMLInputElement).value

    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Credenciais inválidas. Verifique seu email/PIN e tente novamente.')
      setLoading(false)
      return
    }

    let funcao = data.user?.user_metadata?.funcao
    if (!funcao && data.user) {
      const { data: profile } = await supabase
        .from('users')
        .select('funcao')
        .eq('id', data.user.id)
        .single()
      funcao = profile?.funcao
    }

    router.refresh()
    router.push(funcao === 'admin' ? '/admin' : '/colaborador')
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-md p-6 space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Sacolas Braga</h1>
            <p className="text-sm text-gray-500 mt-1">Sistema de Produção</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <Input name="email" type="email" placeholder="seu@email.com" required autoComplete="username" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PIN / Senha</label>
              <Input name="password" type="password" placeholder="••••" required autoComplete="current-password" />
            </div>

            {error && (
              <p className="text-sm text-red-600 rounded-lg bg-red-50 p-2">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
        </div>
      </div>
    </main>
  )
}
