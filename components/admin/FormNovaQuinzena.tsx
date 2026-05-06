'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export function FormNovaQuinzena() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setErro('')

    const form = e.currentTarget
    const data_inicio = (form.elements.namedItem('data_inicio') as HTMLInputElement).value
    const data_fim = (form.elements.namedItem('data_fim') as HTMLInputElement).value
    const data_pagamento = (form.elements.namedItem('data_pagamento') as HTMLInputElement).value

    const res = await fetch('/api/quinzena', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data_inicio, data_fim, data_pagamento }),
    })

    const json = await res.json()

    if (!res.ok) {
      setErro(json.error ?? 'Erro ao criar quinzena.')
      setLoading(false)
      return
    }

    router.refresh()
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
      <h3 className="font-medium text-gray-700">Abrir Nova Quinzena</h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Início</label>
            <Input name="data_inicio" type="date" required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Fim</label>
            <Input name="data_fim" type="date" required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Data de Pagamento</label>
            <Input name="data_pagamento" type="date" required />
          </div>
        </div>
        {erro && <p className="text-sm text-red-600 bg-red-50 rounded p-2">{erro}</p>}
        <Button type="submit" disabled={loading}>
          {loading ? 'Criando...' : 'Abrir Quinzena'}
        </Button>
      </form>
    </div>
  )
}
