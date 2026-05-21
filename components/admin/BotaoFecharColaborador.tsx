'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ModalConfirmacao } from '@/components/ui/ModalConfirmacao'
import { Toast } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { formatarMoeda } from '@/lib/calculos'

interface BotaoFecharColaboradorProps {
  quinzenaId: string
  colaboradorId: string
  nomeColaborador: string
  totalUnidades: number
  valorEstimado: number
}

export function BotaoFecharColaborador({
  quinzenaId,
  colaboradorId,
  nomeColaborador,
  totalUnidades,
  valorEstimado,
}: BotaoFecharColaboradorProps) {
  const router = useRouter()
  const [mostrarModal, setMostrarModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast, showToast, hideToast } = useToast()

  async function handleFechar() {
    setLoading(true)
    const res = await fetch('/api/quinzena/fechar-colaborador', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quinzena_id: quinzenaId, colaborador_id: colaboradorId }),
    })
    const json = await res.json()
    setLoading(false)
    setMostrarModal(false)

    if (!res.ok) {
      showToast(json.error ?? 'Erro ao fechar.', 'error')
      return
    }

    showToast(`${nomeColaborador} fechado! ${formatarMoeda(json.payout.valor_total)}`, 'success')
    router.refresh()
  }

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
      {mostrarModal && (
        <ModalConfirmacao
          titulo={`Fechar produção de ${nomeColaborador}`}
          descricao={`${totalUnidades.toLocaleString('pt-BR')} unidades → ${formatarMoeda(valorEstimado)}. Esta ação não pode ser desfeita.`}
          textoBotaoConfirmar="Fechar e Gerar Pagamento"
          onConfirmar={handleFechar}
          onCancelar={() => setMostrarModal(false)}
          carregando={loading}
        />
      )}
      <button
        onClick={() => setMostrarModal(true)}
        className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
      >
        Fechar Produção
      </button>
    </>
  )
}
