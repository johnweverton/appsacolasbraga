'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ModalConfirmacao } from '@/components/ui/ModalConfirmacao'
import { Toast } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'

interface BotaoFecharQuinzenaProps {
  colaboradoresPendentes?: { id: string; nome: string }[]
}

export function BotaoFecharQuinzena({ colaboradoresPendentes = [] }: BotaoFecharQuinzenaProps) {
  const router = useRouter()
  const [mostrarModal, setMostrarModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [manterPendentes, setManterPendentes] = useState<Set<string>>(new Set())
  const { toast, showToast, hideToast } = useToast()

  function alternarPendente(id: string) {
    setManterPendentes((prev) => {
      const novo = new Set(prev)
      if (novo.has(id)) novo.delete(id)
      else novo.add(id)
      return novo
    })
  }

  async function handleFechar() {
    setLoading(true)
    setErro('')

    const res = await fetch('/api/quinzena/fechar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ manter_pendentes: Array.from(manterPendentes) }),
    })
    const json = await res.json()

    if (!res.ok) {
      setErro(json.error ?? 'Erro ao fechar quinzena.')
      setLoading(false)
      setMostrarModal(false)
      return
    }

    setMostrarModal(false)
    const avisoPendentes = json.colaboradores_pendentes > 0
      ? ` ${json.colaboradores_pendentes} colaborador(es) ficaram pendentes e podem ser fechados depois em Lançamentos.`
      : ''
    const msg = json.aviso
      ? `Quinzena fechada! ⚠️ ${json.aviso}${avisoPendentes}`
      : `Quinzena fechada!${avisoPendentes} Redirecionando para pagamentos...`
    showToast(msg, json.aviso ? 'error' : 'success')

    setTimeout(() => {
      window.location.href = '/admin/pagamentos'
    }, 2200)
  }

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
      {mostrarModal && (
        <ModalConfirmacao
          titulo="Fechar quinzena"
          descricao="Esta ação calculará os pagamentos e encerrará a quinzena. Não pode ser desfeita."
          textoBotaoConfirmar="Fechar Quinzena"
          onConfirmar={handleFechar}
          onCancelar={() => setMostrarModal(false)}
          carregando={loading}
        >
          {colaboradoresPendentes.length > 0 && (
            <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs font-medium text-gray-600">
                Deixar algum colaborador pendente? (ele continua produzindo nesta quinzena e você fecha a produção dele depois, em Lançamentos)
              </p>
              <ul className="space-y-1.5 max-h-40 overflow-y-auto">
                {colaboradoresPendentes.map((c) => (
                  <li key={c.id}>
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={manterPendentes.has(c.id)}
                        onChange={() => alternarPendente(c.id)}
                        className="rounded border-gray-300"
                      />
                      {c.nome}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </ModalConfirmacao>
      )}
      {erro && <p className="text-sm text-red-600 bg-red-50 rounded p-2">{erro}</p>}
      <button
        onClick={() => setMostrarModal(true)}
        disabled={loading}
        className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
      >
        Fechar Quinzena
      </button>
    </>
  )
}
