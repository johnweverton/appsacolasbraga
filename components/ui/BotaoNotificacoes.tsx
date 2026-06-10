'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff, X } from 'lucide-react'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from(Array.from(raw).map((c) => c.charCodeAt(0)))
}

export function BotaoNotificacoes() {
  const [status, setStatus] = useState<'loading' | 'unsupported' | 'denied' | 'subscribed' | 'unsubscribed'>('loading')
  const [bannerVisivel, setBannerVisivel] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported')
      return
    }
    if (Notification.permission === 'denied') {
      setStatus('denied')
      return
    }
    navigator.serviceWorker.ready.then((reg) =>
      reg.pushManager.getSubscription().then((sub) => {
        setStatus(sub ? 'subscribed' : 'unsubscribed')
      })
    ).catch(() => setStatus('unsubscribed'))
  }, [])

  // Exibe banner na primeira visita (requer gesto do usuário para iOS)
  useEffect(() => {
    if (status === 'unsubscribed' && Notification.permission === 'default') {
      const dispensado = sessionStorage.getItem('notif-banner-dispensado')
      if (!dispensado) setBannerVisivel(true)
    }
  }, [status])

  async function subscribe() {
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      })
      const key = sub.getKey('p256dh')
      const auth = sub.getKey('auth')
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          p256dh: key ? btoa(String.fromCharCode(...Array.from(new Uint8Array(key)))) : '',
          auth: auth ? btoa(String.fromCharCode(...Array.from(new Uint8Array(auth)))) : '',
        }),
      })
      setStatus('subscribed')
      setBannerVisivel(false)
    } catch {
      setStatus('unsubscribed')
      setBannerVisivel(false)
    }
  }

  async function unsubscribe() {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (sub) {
      await sub.unsubscribe()
      await fetch('/api/push/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      })
    }
    setStatus('unsubscribed')
  }

  function dispensarBanner() {
    sessionStorage.setItem('notif-banner-dispensado', '1')
    setBannerVisivel(false)
  }

  if (status === 'loading' || status === 'unsupported') return null
  if (status === 'denied') return null

  return (
    <>
      {/* Banner de ativação */}
      {bannerVisivel && (
        <div className="fixed bottom-24 inset-x-0 z-50 px-4">
          <div className="max-w-lg mx-auto bg-brand-dark rounded-2xl p-4 shadow-xl flex items-start gap-3">
            <Bell size={20} className="text-brand-blue shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold">Ativar notificações</p>
              <p className="text-white/60 text-xs mt-0.5">Receba um aviso assim que seu pagamento for confirmado.</p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={subscribe}
                  className="bg-brand-blue text-white text-xs font-semibold px-4 py-1.5 rounded-lg"
                >
                  Ativar
                </button>
                <button
                  onClick={dispensarBanner}
                  className="text-white/50 text-xs px-3 py-1.5"
                >
                  Agora não
                </button>
              </div>
            </div>
            <button onClick={dispensarBanner} className="text-white/40 shrink-0">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Botão sino no header */}
      <button
        onClick={status === 'subscribed' ? unsubscribe : subscribe}
        title={status === 'subscribed' ? 'Desativar notificações' : 'Ativar notificações'}
        className={`p-2 rounded-full transition-colors ${
          status === 'subscribed'
            ? 'text-brand-blue bg-brand-blue/10'
            : 'text-brand-dark/40 hover:text-brand-dark/70 hover:bg-black/[0.05]'
        }`}
      >
        {status === 'subscribed' ? <Bell size={16} /> : <BellOff size={16} />}
      </button>
    </>
  )
}
