export interface PayoutCalculo {
  colaborador_id: string
  total_unidades: number
  valor_unitario: number
  valor_total: number
}

/**
 * Calcula o valor de produção aplicando a regra de benefício de faixa:
 * 500–999 unidades → paga como 1 milheiro cheio (valorPorMilheiro).
 * Fora da faixa → proporcional (quantidade / 1000 × valorPorMilheiro).
 */
export function calcularValorProducao(quantidade: number, valorPorMilheiro: number): number {
  if (quantidade >= 500 && quantidade < 1000) {
    return valorPorMilheiro
  }
  return (quantidade / 1000) * valorPorMilheiro
}

export function calcularPayouts(
  entries: { colaborador_id: string; quantidade: number; status: string }[],
  rates: { funcao: string; valor_unitario: number }[],
  users: { id: string; funcao: string }[]
): PayoutCalculo[] {
  // Inclui pendente + confirmado; apenas divergente é excluído
  const confirmados = entries.filter((e) => e.status !== 'divergente')

  const totais = new Map<string, number>()
  confirmados.forEach((e) => {
    totais.set(e.colaborador_id, (totais.get(e.colaborador_id) ?? 0) + e.quantidade)
  })

  const payouts: PayoutCalculo[] = []
  totais.forEach((total_unidades, colaborador_id) => {
    const user = users.find((u) => u.id === colaborador_id)
    if (!user) return

    const rate = rates.find((r) => r.funcao === user.funcao)
    if (!rate) return

    payouts.push({
      colaborador_id,
      total_unidades,
      valor_unitario: rate.valor_unitario,
      valor_total: calcularValorProducao(total_unidades, rate.valor_unitario),
    })
  })

  return payouts
}

export function formatarMoeda(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
