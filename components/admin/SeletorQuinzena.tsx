'use client'

import { formatDate } from '@/lib/format'

interface QuinzenaOpcao {
  id: string
  data_inicio: string
  data_fim: string
}

interface SeletorQuinzenaProps {
  quinzenas: QuinzenaOpcao[]
  quinzenaSelecionadaId: string | undefined
}

export function SeletorQuinzena({ quinzenas, quinzenaSelecionadaId }: SeletorQuinzenaProps) {
  if (quinzenas.length === 0) return null

  return (
    <select
      value={quinzenaSelecionadaId ?? ''}
      onChange={(e) => {
        window.location.href = `/admin/pagamentos?quinzena=${e.target.value}`
      }}
      className="text-sm rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/25"
    >
      {quinzenas.map((q) => (
        <option key={q.id} value={q.id}>
          {formatDate(q.data_inicio)} – {formatDate(q.data_fim)}
        </option>
      ))}
    </select>
  )
}
