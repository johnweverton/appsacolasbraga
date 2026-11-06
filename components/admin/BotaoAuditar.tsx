'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck, AlertTriangle, Loader2 } from 'lucide-react'
import { Toast } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'

interface Suspeita {
  tipo: 'divergencia' | 'aviso' | 'dupla'
  data: string
  marca: string
  tamanho: string
  colaboradores: string[]
  descricao: string
  nova: boolean
}

export function BotaoAuditar({ quinzenaId }: { quinzenaId: string }) {
  const [loading, setLoading] = useState(false)
  const [suspeitas, setSuspeitas] = useState<Suspeita[] | null>(null)
  const { toast, showToast, hideToast } = useToast()
  const router = useRouter()

  async function auditar() {
    setLoading(true)
    try {
      const res = await fetch('/api/auditoria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quinzena_id: quinzenaId }),
      })
      const json = await res.json()
      if (!res.ok) {
        showToast(typeof json.error === 'string' ? json.error : 'Erro na auditoria.', 'error')
        return
      }
      const lista: Suspeita[] = json.suspeitas ?? []
      setSuspeitas(lista)
      if (lista.length === 0) {
        showToast('Nenhuma divergência encontrada ✓', 'success')
      } else {
        showToast(`${lista.length} possível(is) divergência(s) encontrada(s).`, 'info')
      }
      if ((json.novas ?? 0) > 0) router.refresh()
    } catch {
      showToast('Erro ao executar auditoria.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}

      <button
        onClick={auditar}
        disabled={loading}
        className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
        {loading ? 'Auditando…' : 'Auditar quinzena'}
      </button>

      {suspeitas && suspeitas.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
            <p className="font-medium text-red-700">
              {suspeitas.length} possível(is) divergência(s)
            </p>
          </div>
          <ul className="space-y-1.5 ml-6 list-disc text-sm text-red-700">
            {suspeitas.map((s, i) => (
              <li key={i}>
                <span className="font-medium">{s.colaboradores.join(' × ')}</span>
                {' — '}
                <span className="text-red-600">{s.descricao}</span>
                {s.tipo === 'dupla' && (
                  <span className="ml-1 text-[11px] uppercase tracking-wide text-red-500">(total do dia)</span>
                )}
                {s.tipo === 'aviso' && (
                  <span className="ml-1 text-[11px] uppercase tracking-wide text-amber-600">(aviso)</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {suspeitas && suspeitas.length === 0 && (
        <p className="text-sm text-green-700 inline-flex items-center gap-1.5">
          <ShieldCheck size={14} /> Nenhuma divergência encontrada.
        </p>
      )}
    </div>
  )
}
