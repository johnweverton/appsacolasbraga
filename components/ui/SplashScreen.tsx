'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

function playBrandChime() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new AudioCtx()
    // C5 → E5 → G5 — tríade maior ascendente
    const notes = [523.25, 659.25, 783.99]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = freq
      const t = ctx.currentTime + i * 0.18
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.22, t + 0.06)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.0)
      osc.start(t)
      osc.stop(t + 1.0)
    })
  } catch {
    // AudioContext indisponível
  }
}

export function SplashScreen() {
  const router = useRouter()

  useEffect(() => {
    playBrandChime()
    const timer = setTimeout(() => router.replace('/login'), 2600)
    return () => clearTimeout(timer)
  }, [router])

  return (
    <main className="min-h-screen bg-brand-blue flex items-center justify-center">
      <div className="animate-splash-logo">
        <Image
          src="/logo-sacolas-braga.png"
          alt="Sacolas Braga"
          width={192}
          height={84}
          priority
          style={{ filter: 'brightness(0) invert(1)' }}
        />
      </div>
    </main>
  )
}
