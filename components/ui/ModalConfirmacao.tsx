'use client'

import { Button } from '@/components/ui/button'

interface ModalConfirmacaoProps {
  titulo: string
  descricao: string
  textoBotaoConfirmar?: string
  onConfirmar: () => void
  onCancelar: () => void
  carregando?: boolean
  children?: React.ReactNode
}

export function ModalConfirmacao({
  titulo,
  descricao,
  textoBotaoConfirmar = 'Confirmar',
  onConfirmar,
  onCancelar,
  carregando,
  children,
}: ModalConfirmacaoProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancelar} />
      <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm space-y-4">
        <h3 className="text-base font-semibold text-gray-900">{titulo}</h3>
        <p className="text-sm text-gray-600">{descricao}</p>
        {children}
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onCancelar} disabled={carregando}>
            Cancelar
          </Button>
          <Button
            onClick={onConfirmar}
            disabled={carregando}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {carregando ? 'Aguarde...' : textoBotaoConfirmar}
          </Button>
        </div>
      </div>
    </div>
  )
}
