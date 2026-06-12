'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff, BellRing, BellMinus, SmartphoneNfc } from 'lucide-react'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from(Array.from(raw).map((c) => c.charCodeAt(0)))
}

function isStandalone() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

type ModalTipo = 'ativar' | 'bloqueado' | 'instalar' | 'reinstalar' | null

export function BotaoNotificacoes() {
  const [status, setStatus] = useState<'loading' | 'unsupported' | 'unsupported-device' | 'denied' | 'subscribed' | 'unsubscribed'>('loading')
  const [modal, setModal] = useState<ModalTipo>(null)

  useEffect(() => {
    // Verifica permissão imediatamente, sem esperar o service worker
    if (typeof Notification === 'undefined') {
      // Já está em modo standalone (aberto pelo ícone), mas o ícone foi
      // adicionado à tela de início antes do app suportar PWA/Push —
      // precisa remover e adicionar de novo (ou atualizar o iOS < 16.4)
      setStatus(isStandalone() ? 'unsupported-device' : 'unsupported')
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
    if (status === 'unsupported')        { setModal('instalar'); return }
    if (status === 'unsupported-device') { setModal('reinstalar'); return }
    if (status === 'denied')             { setModal('bloqueado'); return }
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

      // Garante que o SW está registrado e ativo
      if (!navigator.serviceWorker.controller) {
        await navigator.serviceWorker.register('/sw.js')
      }
      const reg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('sw-timeout')), 10000)
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
              Para receber notificações de pagamento, o app precisa ser aberto pelo ícone na tela de início (não pelo Safari):
              <br /><br />
              <span className="font-semibold text-brand-dark/70">Ainda não adicionou? Toque em Compartilhar → &ldquo;Adicionar à Tela de Início&rdquo;.</span>
              <br /><br />
              <span className="font-semibold text-brand-dark/70">Já adicionou? Feche o Safari e abra o app pelo ícone na tela de início.</span>
            </p>
            <button onClick={() => setModal(null)} className="w-full bg-brand-dark/10 text-brand-dark font-semibold py-3.5 rounded-2xl text-sm">
              Entendi
            </button>
          </div>
        </div>
      )}

      {/* Modal: app já em modo standalone, mas ícone instalado antes do suporte a Push */}
      {modal === 'reinstalar' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white rounded-3xl p-7 shadow-2xl flex flex-col items-center text-center">
            <div className="bg-red-50 rounded-full p-4 mb-4">
              <BellMinus size={32} className="text-red-400" />
            </div>
            <h2 className="font-display font-bold text-brand-dark text-xl mb-2">Notificações indisponíveis</h2>
            <p className="text-brand-dark/55 text-sm leading-relaxed mb-6">
              O ícone do app na sua tela de início foi adicionado antes do suporte a notificações ser ativado.
              <br /><br />
              <span className="font-semibold text-brand-dark/70">Remova o ícone &ldquo;Sacolas Braga&rdquo; da tela de início e adicione novamente: Compartilhar → &ldquo;Adicionar à Tela de Início&rdquo;.</span>
              <br /><br />
              Se mesmo assim não funcionar, atualize o iOS em Ajustes → Geral → Atualização de Software (necessário 16.4+).
            </p>
            <button onClick={() => setModal(null)} className="w-full bg-brand-dark/10 text-brand-dark font-semibold py-3.5 rounded-2xl text-sm">
              Entendi
            </button>
          </div>
        </div>
      )}

      {/* Botão sino no header */}
      <button
        onClick={status === 'subscribed' ? unsubscribe : () => setModal(
          status === 'unsupported' ? 'instalar' :
          status === 'unsupported-device' ? 'reinstalar' :
          status === 'denied' ? 'bloqueado' : 'ativar'
        )}
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
