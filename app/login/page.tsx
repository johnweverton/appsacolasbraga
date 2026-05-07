'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Logo } from '@/components/ui/Logo'

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
      setError('Credenciais inválidas. Verifique seu email ou PIN.')
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
    <main className="min-h-screen bg-brand-cream flex flex-col">

      {/* Área superior — logo centralizado */}
      <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6">
        <Logo size="lg" />
        <p className="text-[10px] font-sans font-semibold uppercase tracking-[0.2em] text-brand-dark/30">
          Sistema de Produção
        </p>
      </div>

      {/* Área inferior — formulário em fundo branco */}
      <div className="bg-white rounded-t-[2rem] px-6 pt-8 pb-10 shadow-[0_-2px_20px_rgba(0,0,0,0.05)]">
        <div className="w-full max-w-sm mx-auto">

          <div className="mb-6">
            <h1 className="font-display font-bold text-brand-dark text-xl leading-tight">
              Bem-vindo de volta
            </h1>
            <p className="text-sm font-sans text-brand-dark/40 mt-1">
              Insira suas credenciais para continuar.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-sans font-semibold uppercase tracking-[0.1em] text-brand-dark/40">
                Email
              </label>
              <input
                name="email"
                type="email"
                placeholder="seu@email.com"
                required
                autoComplete="username"
                className="w-full rounded-xl border border-black/[0.08] bg-brand-cream px-4 py-3 text-sm font-sans text-brand-dark placeholder-brand-dark/25 focus:outline-none focus:ring-2 focus:ring-brand-blue/25 focus:border-brand-blue/60 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-sans font-semibold uppercase tracking-[0.1em] text-brand-dark/40">
                PIN / Senha
              </label>
              <input
                name="password"
                type="password"
                placeholder="••••••"
                required
                autoComplete="current-password"
                className="w-full rounded-xl border border-black/[0.08] bg-brand-cream px-4 py-3 text-sm font-sans text-brand-dark placeholder-brand-dark/25 focus:outline-none focus:ring-2 focus:ring-brand-blue/25 focus:border-brand-blue/60 transition-all"
              />
            </div>

            {error && (
              <p className="text-sm font-sans text-red-600 bg-red-50 rounded-xl px-4 py-3 border border-red-100">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-blue text-white font-sans font-semibold rounded-xl py-3.5 text-sm hover:bg-brand-blue/90 active:scale-[0.98] transition-all disabled:opacity-60 shadow-md shadow-brand-blue/20 mt-2"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

        </div>
      </div>

    </main>
  )
}
