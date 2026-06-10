'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff, BellRing, BellMinus, SmartphoneNfc } from 'lucide-react'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from(Array.from(raw).map((c) => c.charCodeAt(0)))
}

type ModalTipo = 'ativar' | 'bloqueado' | 'instalar' | null

export function BotaoNotificacoes() {
  const [status, setStatus] = useState<'loading' | 'unsupported' | 'denied' | 'subscribed' | 'unsubscribed'>('loading')
  const [modal, setModal] = useState<ModalTipo>(null)

  useEffect(() => {
    // Verifica permissão imediatamente, sem esperar o service worker
    if (typeof Notification === 'undefined') {
      setStatus('unsupported')
      return
    }

    const perm = Notification.permission

    if (perm === 'denied') {
      setStatus('denied')
      return
    }

    if (perm === 'default') {
      // Nunca pediu permissão — mostra modal sem precisar checar SW
      setStatus('unsubscribed')
      return
    }

    // Permissão concedida — verifica se está de fato inscrito
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('subscribed')
      return
    }

    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setStatus(sub ? 'subscribed' : 'unsubscribed'))
      .catch(() => setStatus('unsubscribed'))
  }, [])

  // Abre o modal correto assim que o status é conhecido
  useEffect(() => {
    if (status === 'unsupported') { setModal('instalar'); return }
    if (status === 'denied')      { setModal('bloqueado'); return }
    if (status === 'unsubscribed') {
      const perm = typeof Notification !== 'undefined' ? Notification.permission : 'default'
      if (perm === 'default') setModal('ativar')
    }
  }, [status])

  async function subscribe() {
    try {
      // Pede permissão explicitamente — abre o dialog nativo no iOS
      const permission = await Notification.requestPermission()

      if (permission !== 'granted') {
        setStatus('denied')
        setModal(null)
        return
      }

      if (!('PushManager' in window)) {
        setStatus('subscribed')
        setModal(null)
        return
      }

      // Aguarda SW ficar pronto com timeout de 5s
      const reg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('sw-timeout')), 5000)
        ),
      ])

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
      setModal(null)
    } catch {
      setModal(null)
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

  return (
    <>
      {/* DEBUG TEMPORÁRIO */}
      <div className="fixed top-14 left-0 right-0 z-[200] px-3 pointer-events-none">
        <div className="max-w-sm mx-auto bg-yellow-300 text-black text-[10px] rounded-xl p-2 leading-relaxed">
          <p>status: <b>{status}</b> | modal: <b>{modal ?? 'null'}</b></p>
          <p>permission: <b>{typeof Notification !== 'undefined' ? Notification.permission : 'N/A'}</b></p>
          <p>SW: <b>{'serviceWorker' in navigator ? 'sim' : 'não'}</b> | Push: <b>{'PushManager' in window ? 'sim' : 'não'}</b></p>
        </div>
      </div>

      {/* Modal: ativar notificações */}
      {modal === 'ativar' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white rounded-3xl p-7 shadow-2xl flex flex-col items-center text-center">
            <div className="bg-brand-blue/10 rounded-full p-4 mb-4">
              <BellRing size={32} className="text-brand-blue" />
            </div>
            <h2 className="font-display font-bold text-brand-dark text-xl mb-2">Ative as notificações</h2>
            <p className="text-brand-dark/55 text-sm leading-relaxed mb-6">
              Receba um aviso no celular assim que o seu pagamento for confirmado. Você fica sabendo na hora, sem precisar abrir o app.
            </p>
            <button
              onClick={subscribe}
              className="w-full bg-brand-blue text-white font-semibold py-3.5 rounded-2xl text-sm mb-3 active:opacity-80 transition-opacity"
            >
              Ativar notificações
            </button>
            <button onClick={() => setModal(null)} className="text-brand-dark/40 text-sm py-1">
              Agora não
            </button>
          </div>
        </div>
      )}

      {/* Modal: notificações bloqueadas (denied) */}
      {modal === 'bloqueado' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white rounded-3xl p-7 shadow-2xl flex flex-col items-center text-center">
            <div className="bg-red-50 rounded-full p-4 mb-4">
              <BellMinus size={32} className="text-red-400" />
            </div>
            <h2 className="font-display font-bold text-brand-dark text-xl mb-2">Notificações bloqueadas</h2>
            <p className="text-brand-dark/55 text-sm leading-relaxed mb-6">
              Você bloqueou as notificações anteriormente. Para reativar, acesse:
              <br /><br />
              <span className="font-semibold text-brand-dark/70">Ajustes → Sacolas Braga → Notificações → Permitir</span>
            </p>
            <button onClick={() => setModal(null)} className="w-full bg-brand-dark/10 text-brand-dark font-semibold py-3.5 rounded-2xl text-sm">
              Entendi
            </button>
          </div>
        </div>
      )}

      {/* Modal: app não instalado (unsupported) */}
      {modal === 'instalar' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white rounded-3xl p-7 shadow-2xl flex flex-col items-center text-center">
            <div className="bg-brand-blue/10 rounded-full p-4 mb-4">
              <SmartphoneNfc size={32} className="text-brand-blue" />
            </div>
            <h2 className="font-display font-bold text-brand-dark text-xl mb-2">Instale o app</h2>
            <p className="text-brand-dark/55 text-sm leading-relaxed mb-6">
              Para receber notificações de pagamento, adicione o app à tela de início:
              <br /><br />
              <span className="font-semibold text-brand-dark/70">Toque em Compartilhar → &ldquo;Adicionar à Tela de Início&rdquo; → Abrir pelo ícone</span>
            </p>
            <button onClick={() => setModal(null)} className="w-full bg-brand-dark/10 text-brand-dark font-semibold py-3.5 rounded-2xl text-sm">
              Entendi
            </button>
          </div>
        </div>
      )}

      {/* Botão sino no header */}
      <button
        onClick={status === 'subscribed' ? unsubscribe : () => setModal(status === 'unsupported' ? 'instalar' : status === 'denied' ? 'bloqueado' : 'ativar')}
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
