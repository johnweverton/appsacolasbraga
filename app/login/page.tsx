'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'

function playRevealSound() {
  try {
    type WA = typeof window & { webkitAudioContext?: typeof AudioContext }
    const Ctx = window.AudioContext ?? (window as WA).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()

    // Acorde maior ascendente C5-E5-G5 — efeito de revelação
    const notes: [number, number][] = [[523.25, 0], [659.25, 0.13], [783.99, 0.26]]
    notes.forEach(([freq, delay]) => {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = freq
      const t = ctx.currentTime + delay
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.13, t + 0.04)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55)
      osc.start(t)
      osc.stop(t + 0.6)
    })
  } catch { /* sem suporte → silêncio */ }
}

export default function LoginPage() {
  const router = useRouter()
  const [logoIn,  setLogoIn]  = useState(false)
  const [cardIn,  setCardIn]  = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [showPwd, setShowPwd] = useState(false)

  useEffect(() => {
    // Pula animação se o usuário já viu nesta sessão (ex: voltar ao login após erro)
    if (sessionStorage.getItem('sb-splash')) {
      setLogoIn(true)
      setCardIn(true)
      return
    }

    const t1 = setTimeout(() => { setLogoIn(true); playRevealSound() }, 200)
    const t2 = setTimeout(() => {
      setCardIn(true)
      sessionStorage.setItem('sb-splash', '1')
    }, 2300)

    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

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

      {/* ── Logo ── */}
      <div className="flex-1 flex items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-mask.png"
          alt="Sacolas Braga"
          width={260}
          height={260}
          style={{
            mixBlendMode: 'screen',
            opacity:    logoIn ? 1 : 0,
            transform:  logoIn ? 'scale(1)' : 'scale(0.6)',
            transition: 'opacity 0.9s cubic-bezier(0.34,1.56,0.64,1), transform 0.9s cubic-bezier(0.34,1.56,0.64,1)',
          }}
        />
      </div>

      {/* ── Card de login ── sobe do fundo */}
      <div
        style={{
          transform:  cardIn ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.65s cubic-bezier(0.22,1,0.36,1)',
        }}
        className="bg-white rounded-t-4xl shadow-2xl"
      >
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
