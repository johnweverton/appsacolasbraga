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
  entries: { colaborador_id: string; quantidade: number; cores: number; status: string; funcao: string }[],
  rates: { funcao: string; valor_unitario: number }[],
): PayoutCalculo[] {
  // Inclui pendente + confirmado; apenas divergente é excluído
  const confirmados = entries.filter((e) => e.status !== 'divergente')

  // Agrupa por (colaborador_id, funcao) para aplicar taxa correta por função
  // Cada cor exige uma passada de impressão separada, então a unidade
  // efetiva para pagamento é quantidade × cores.
  const grupos = new Map<string, Map<string, number>>()
  confirmados.forEach((e) => {
    if (!grupos.has(e.colaborador_id)) grupos.set(e.colaborador_id, new Map())
    const byFuncao = grupos.get(e.colaborador_id)!
    byFuncao.set(e.funcao, (byFuncao.get(e.funcao) ?? 0) + e.quantidade * e.cores)
  })

  const payouts: PayoutCalculo[] = []
  grupos.forEach((byFuncao, colaborador_id) => {
    let total_unidades = 0
    let valor_total = 0
    let funcaoUnica: string | null = null
    let misto = false

    byFuncao.forEach((quantidade, funcao) => {
      const rate = rates.find((r) => r.funcao === funcao)
      if (!rate) return
      total_unidades += quantidade
      valor_total += calcularValorProducao(quantidade, rate.valor_unitario)
      if (funcaoUnica === null) funcaoUnica = funcao
      else if (funcaoUnica !== funcao) misto = true
    })

    if (total_unidades === 0) return

    // valor_unitario = 0 indica função mista (exibido como "Variável" na UI)
    const valor_unitario = misto
      ? 0
      : (rates.find((r) => r.funcao === funcaoUnica)?.valor_unitario ?? 0)

    payouts.push({
      colaborador_id,
      total_unidades,
      valor_unitario,
      valor_total,
    })
  })

  return payouts
}

export function formatarMoeda(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export interface ResumoColaborador {
  id: string
  nome: string
  funcao: string
  unidades: number
  temDivergencia: boolean
  valorEstimado: number
  jaFechado: boolean
  valorPago: number
}

/**
 * Agrega lançamentos por colaborador para os cards de resumo (admin), tanto
 * na quinzena aberta quanto em quinzenas já fechadas com colaborador pendente.
 */
export function resumoPorColaborador(
  entries: { colaborador_id: string; quantidade: number; cores: number; status: string; funcao: string }[],
  users: { id: string; nome: string; funcao: string }[],
  rates: { funcao: string; valor_unitario: number }[],
  payoutsExistentes: { colaborador_id: string; valor_total: number }[],
): ResumoColaborador[] {
  const jaFechadosMap = new Map(payoutsExistentes.map((p) => [p.colaborador_id, p.valor_total]))

  const colaboradorMap = new Map<string, { nome: string; funcao: string; unidades: number; temDivergencia: boolean }>()
  for (const e of entries) {
    const u = users.find((u) => u.id === e.colaborador_id)
    if (!u) continue
    const atual = colaboradorMap.get(e.colaborador_id) ?? { nome: u.nome, funcao: u.funcao, unidades: 0, temDivergencia: false }
    colaboradorMap.set(e.colaborador_id, {
      ...atual,
      // Cada cor exige uma passada de impressão separada: unidade efetiva = quantidade × cores
      unidades: atual.unidades + (e.status !== 'divergente' ? e.quantidade * e.cores : 0),
      temDivergencia: atual.temDivergencia || e.status === 'divergente',
    })
  }

  // Usa calcularPayouts para estimativa correta por função (suporta multi-função)
  const payoutsEstimados = calcularPayouts(entries, rates)
  const estimadoMap = new Map(payoutsEstimados.map((p) => [p.colaborador_id, p.valor_total]))

  return Array.from(colaboradorMap.entries()).map(([id, info]) => {
    const valorEstimado = estimadoMap.get(id) ?? 0
    return { id, ...info, valorEstimado, jaFechado: jaFechadosMap.has(id), valorPago: jaFechadosMap.get(id) ?? 0 }
  })
}
