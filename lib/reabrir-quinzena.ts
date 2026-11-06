/**
 * Regras para reabrir uma quinzena fechada por engano (módulo puro, sem IO).
 *
 * Reabrir = apagar os pagamentos gerados no fechamento e voltar o status para
 * 'aberta'. Como o app só trabalha com UMA quinzena aberta, a quinzena nova
 * criada automaticamente após o fechamento precisa estar vazia para ser
 * removida. Pagamento já pago (ou com comprovante/recibo) bloqueia tudo.
 */

export interface QuinzenaResumo {
  id: string
  status: string
  data_fim: string
}

export interface PayoutResumo {
  status: string
  comprovante_url?: string | null
  recibo_url?: string | null
}

export interface DadosReabertura {
  alvo: QuinzenaResumo | null
  /** fechada mais recente (por data_fim) */
  maisRecenteFechada: QuinzenaResumo | null
  payoutsAlvo: PayoutResumo[]
  /** quinzena aberta atual, se houver */
  aberta: QuinzenaResumo | null
  lancamentosAberta: number
  payoutsAberta: number
}

export type ResultadoReabertura =
  | { ok: true; removerAbertaId: string | null; payoutsParaRemover: number }
  | { ok: false; erro: string; status: 400 | 404 | 409 }

export function payoutTravado(p: PayoutResumo): boolean {
  return p.status === 'pago' || Boolean(p.comprovante_url) || Boolean(p.recibo_url)
}

export function avaliarReabertura(d: DadosReabertura): ResultadoReabertura {
  if (!d.alvo) return { ok: false, erro: 'Quinzena não encontrada.', status: 404 }
  if (d.alvo.status !== 'fechada') {
    return { ok: false, erro: 'Esta quinzena não está fechada.', status: 409 }
  }
  if (!d.maisRecenteFechada || d.maisRecenteFechada.id !== d.alvo.id) {
    return { ok: false, erro: 'Só é possível reabrir a quinzena fechada mais recente.', status: 409 }
  }

  const travados = d.payoutsAlvo.filter(payoutTravado).length
  if (travados > 0) {
    return {
      ok: false,
      erro: `${travados} pagamento(s) desta quinzena já foram pagos ou têm comprovante/recibo. Não é possível reabrir.`,
      status: 409,
    }
  }

  if (d.aberta && d.aberta.id !== d.alvo.id && (d.lancamentosAberta > 0 || d.payoutsAberta > 0)) {
    return {
      ok: false,
      erro: `A quinzena atual já tem ${d.lancamentosAberta} lançamento(s). Não é possível reabrir a anterior sem perder esses dados.`,
      status: 409,
    }
  }

  return {
    ok: true,
    removerAbertaId: d.aberta && d.aberta.id !== d.alvo.id ? d.aberta.id : null,
    payoutsParaRemover: d.payoutsAlvo.length,
  }
}
