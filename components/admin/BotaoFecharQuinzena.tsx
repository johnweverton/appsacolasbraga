'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function BotaoFecharQuinzena() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  async function handleFechar() {
    if (!confirm('Confirma o fechamento da quinzena? Esta ação não pode ser desfeita.')) return

    setLoading(true)
    setErro('')

    const res = await fetch('/api/quinzena/fechar', { method: 'POST' })
    const json = await res.json()

    if (!res.ok) {
      setErro(json.error ?? 'Erro ao fechar quinzena.')
      setLoading(false)
      return
    }

    router.refresh()
  }

  return (
    <div className="space-y-2">
      {erro && <p className="text-sm text-red-600 bg-red-50 rounded p-2">{erro}</p>}
      <button
        onClick={handleFechar}
        disabled={loading}
        className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
      >
        {loading ? 'Fechando...' : 'Fechar Quinzena'}
      </button>
    </div>
  )
}
