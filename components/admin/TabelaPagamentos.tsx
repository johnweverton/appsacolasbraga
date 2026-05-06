'use client'

import { useState } from 'react'
import type { Payout } from '@/types'
import { Button } from '@/components/ui/button'
import { formatarMoeda } from '@/lib/calculos'

type PayoutComNome = Payout & { nome_colaborador: string }

interface TabelaPagamentosProps {
  payouts: PayoutComNome[]
}

export function TabelaPagamentos({ payouts: initialPayouts }: TabelaPagamentosProps) {
  const [payouts, setPayouts] = useState(initialPayouts)
  const [updating, setUpdating] = useState<string | null>(null)

  async function marcarPago(id: string) {
    setUpdating(id)
    const res = await fetch('/api/pagamentos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (res.ok) {
      setPayouts((prev) => prev.map((p) => p.id === id ? { ...p, status: 'pago' as const } : p))
    }
    setUpdating(null)
  }

  const totalGeral = payouts.reduce((sum, p) => sum + p.valor_total, 0)

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-500">
            <th className="px-4 py-3">Colaborador</th>
            <th className="px-4 py-3 text-right">Unidades</th>
            <th className="px-4 py-3 text-right">Valor</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {payouts.map((payout) => (
            <tr key={payout.id} className="border-b border-gray-100 last:border-0">
              <td className="px-4 py-3 font-medium text-gray-800">{payout.nome_colaborador}</td>
              <td className="px-4 py-3 text-right">{payout.total_unidades.toLocaleString('pt-BR')}</td>
              <td className="px-4 py-3 text-right font-medium">{formatarMoeda(payout.valor_total)}</td>
              <td className="px-4 py-3">
                {payout.status === 'pago' ? (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Pago</span>
                ) : (
                  <Button size="sm" disabled={updating === payout.id} onClick={() => marcarPago(payout.id)}>
                    {updating === payout.id ? 'Salvando...' : 'Marcar Pago'}
                  </Button>
                )}
              </td>
            </tr>
          ))}
          {payouts.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-gray-400">Nenhum pagamento gerado</td>
            </tr>
          )}
        </tbody>
        {payouts.length > 0 && (
          <tfoot>
            <tr className="border-t border-gray-200 bg-gray-50">
              <td colSpan={2} className="px-4 py-3 text-sm font-medium text-gray-600">Total</td>
              <td className="px-4 py-3 text-right font-bold text-gray-900">{formatarMoeda(totalGeral)}</td>
              <td />
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}
