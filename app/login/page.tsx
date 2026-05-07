'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

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

  return (
    <main className="min-h-screen bg-white flex flex-col px-6 pt-14 pb-10">
      <div className="w-full max-w-sm mx-auto flex flex-col flex-1">

        {/* Logo */}
        <div className="mb-10">
          <Image
            src="/logo-sacolas-braga.png"
            alt="Sacolas Braga"
            width={140}
            height={62}
            priority
          />
        </div>

        {/* Heading */}
        <div className="mb-8">
          <h1 className="font-display font-bold text-brand-dark text-[2rem] leading-tight mb-2">
            Bem-vindo<br />de volta!
          </h1>
          <p className="text-sm font-sans text-brand-dark/45 leading-relaxed">
            Insira suas credenciais para acessar o sistema de produção.
          </p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-4 flex-1">

          {/* Email */}
          <div className="space-y-1.5">
            <label className="block text-xs font-sans font-semibold text-brand-dark/50 uppercase tracking-wide">
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
                className="w-full rounded-2xl border border-black/10 bg-white pl-11 pr-4 py-4 text-sm font-sans text-brand-dark placeholder-brand-dark/20 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue/40 transition-all"
              />
            </div>
          </div>

          {/* Senha */}
          <div className="space-y-1.5">
            <label className="block text-xs font-sans font-semibold text-brand-dark/50 uppercase tracking-wide">
              Senha / PIN
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-dark/25 pointer-events-none" />
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="w-full rounded-2xl border border-black/10 bg-white pl-11 pr-12 py-4 text-sm font-sans text-brand-dark placeholder-brand-dark/20 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue/40 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-dark/30 hover:text-brand-dark/60 transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
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
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-blue text-white font-sans font-semibold rounded-2xl py-4 text-sm hover:bg-brand-blue/90 active:scale-[0.98] transition-all disabled:opacity-60 shadow-lg shadow-brand-blue/20"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </div>

        </form>

      </div>
    </main>
  )
}
