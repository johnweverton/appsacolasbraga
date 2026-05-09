'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [showPwd, setShowPwd] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const form     = e.currentTarget
    const email    = (form.elements.namedItem('email')    as HTMLInputElement).value
    const password = (form.elements.namedItem('password') as HTMLInputElement).value

    const supabase = createClient()
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError('Email ou senha incorretos. Verifique seus dados.')
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

  const inputBase =
    'w-full min-w-0 rounded-2xl border border-black/10 bg-brand-cream/60 py-4 text-sm font-sans text-brand-dark placeholder-brand-dark/30 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue/40 transition-all'

  return (
    <main className="min-h-screen w-full bg-brand-blue flex flex-col overflow-hidden">

      {/* Logo — anima ao montar (CSS, sem delay) */}
      <div className="flex-1 flex items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-mask.png"
          alt="Sacolas Braga"
          width={240}
          height={240}
          className="animate-splash-logo"
          style={{ mixBlendMode: 'screen' }}
        />
      </div>

      {/* Card — sobe do fundo ao montar (CSS, sem delay) */}
      <div className="bg-white rounded-t-4xl shadow-2xl animate-card-up">
        <form onSubmit={handleSubmit} className="px-6 pt-8 pb-10 space-y-5">

          {/* Email */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-sans font-semibold uppercase tracking-[0.12em] text-brand-dark/40">
              Email
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-dark/25 pointer-events-none" />
              <input
                name="email"
                type="email"
                placeholder="seu@email.com"
                required
                autoComplete="username"
                className={`${inputBase} pl-11 pr-4`}
              />
            </div>
          </div>

          {/* Senha / PIN */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-sans font-semibold uppercase tracking-[0.12em] text-brand-dark/40">
              Senha / PIN
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-dark/25 pointer-events-none" />
              <input
                name="password"
                type={showPwd ? 'text' : 'password'}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className={`${inputBase} pl-11 pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-dark/30 hover:text-brand-dark/60 transition-colors"
              >
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Erro */}
          {error && (
            <div className="rounded-2xl bg-red-50 border border-red-100 px-4 py-3">
              <p className="text-sm font-sans text-red-600">{error}</p>
            </div>
          )}

          {/* Botão */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-blue text-white font-sans font-semibold rounded-full py-4 text-sm hover:bg-brand-blue/90 active:scale-[0.98] transition-all disabled:opacity-60 shadow-lg shadow-brand-blue/20"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>

        </form>
      </div>

    </main>
  )
}
