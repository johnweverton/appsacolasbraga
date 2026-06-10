'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff } from 'lucide-react'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from(Array.from(raw).map((c) => c.charCodeAt(0)))
}

export function BotaoNotificacoes() {
  const [status, setStatus] = useState<'loading' | 'unsupported' | 'denied' | 'subscribed' | 'unsubscribed'>('loading')

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

  async function toggleSubscription() {
    if (status === 'subscribed') {
      await unsubscribe()
    } else {
      await subscribe()
    }
  }

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
    } catch {
      setStatus('unsubscribed')
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

  if (status === 'loading' || status === 'unsupported') return null
  if (status === 'denied') return null

  return (
    <button
      onClick={toggleSubscription}
      title={status === 'subscribed' ? 'Desativar notificações' : 'Ativar notificações'}
      className={`p-2 rounded-full transition-colors ${
        status === 'subscribed'
          ? 'text-brand-blue bg-brand-blue/10'
          : 'text-brand-dark/40 hover:text-brand-dark/70 hover:bg-black/[0.05]'
      }`}
    >
      {status === 'subscribed' ? <Bell size={16} /> : <BellOff size={16} />}
    </button>
  )
}
