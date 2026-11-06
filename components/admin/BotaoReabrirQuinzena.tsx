'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RotateCcw } from 'lucide-react'
import { ModalConfirmacao } from '@/components/ui/ModalConfirmacao'
import { Toast } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'

interface Props {
  quinzenaId: string
  periodo: string
}

export function BotaoReabrirQuinzena({ quinzenaId, periodo }: Props) {
  const router = useRouter()
  const [mostrarModal, setMostrarModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast, showToast, hideToast } = useToast()

  async function reabrir() {
    setLoading(true)
    try {
      const res = await fetch('/api/quinzena/reabrir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quinzena_id: quinzenaId }),
      })
      const json = await res.json()
      if (!res.ok) {
        showToast(typeof json.error === 'string' ? json.error : 'Erro ao reabrir quinzena.', 'error')
        return
      }
      showToast('Quinzena reaberta! Os colaboradores já podem corrigir os lançamentos.', 'success')
      router.refresh()
    } catch {
      showToast('Erro ao reabrir quinzena.', 'error')
    } finally {
      setLoading(false)
      setMostrarModal(false)
    }
  }

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
      {mostrarModal && (
        <ModalConfirmacao
          titulo="Reabrir quinzena"
          descricao={`A quinzena ${periodo} voltará a ficar aberta. Os pagamentos gerados no fechamento serão apagados e recalculados quando você fechar de novo. A quinzena nova (vazia) será removida.`}
          textoBotaoConfirmar="Reabrir"
          onConfirmar={reabrir}
          onCancelar={() => setMostrarModal(false)}
          carregando={loading}
        />
      )}
      <button
        onClick={() => setMostrarModal(true)}
        disabled={loading}
        className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 disabled:opacity-50"
      >
        <RotateCcw size={13} /> Reabrir
      </button>
    </>
  )
}
