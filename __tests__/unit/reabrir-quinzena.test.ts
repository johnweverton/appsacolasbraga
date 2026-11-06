import { avaliarReabertura, type DadosReabertura } from '@/lib/reabrir-quinzena'

const FECHADA = { id: 'q1', status: 'fechada', data_fim: '2026-11-05' }
const NOVA = { id: 'q2', status: 'aberta', data_fim: '2026-11-19' }

function dados(p: Partial<DadosReabertura> = {}): DadosReabertura {
  return {
    alvo: FECHADA,
    maisRecenteFechada: FECHADA,
    payoutsAlvo: [{ status: 'pendente' }, { status: 'pendente' }],
    aberta: NOVA,
    lancamentosAberta: 0,
    payoutsAberta: 0,
    ...p,
  }
}

describe('avaliarReabertura', () => {
  it('caso feliz: remove a quinzena nova vazia e os pagamentos pendentes', () => {
    expect(avaliarReabertura(dados())).toEqual({ ok: true, removerAbertaId: 'q2', payoutsParaRemover: 2 })
  })

  it('sem quinzena aberta → só reabre', () => {
    const r = avaliarReabertura(dados({ aberta: null }))
    expect(r).toMatchObject({ ok: true, removerAbertaId: null })
  })

  it('quinzena inexistente → 404', () => {
    expect(avaliarReabertura(dados({ alvo: null }))).toMatchObject({ ok: false, status: 404 })
  })

  it('quinzena já aberta → bloqueia', () => {
    const r = avaliarReabertura(dados({ alvo: { ...FECHADA, status: 'aberta' } }))
    expect(r.ok).toBe(false)
  })

  it('não é a fechada mais recente → bloqueia', () => {
    const r = avaliarReabertura(dados({ maisRecenteFechada: { id: 'q0', status: 'fechada', data_fim: '2026-11-20' } }))
    expect(r).toMatchObject({ ok: false, status: 409 })
  })

  it('pagamento já pago → bloqueia', () => {
    const r = avaliarReabertura(dados({ payoutsAlvo: [{ status: 'pendente' }, { status: 'pago' }] }))
    expect(r).toMatchObject({ ok: false, status: 409 })
  })

  it('pagamento com comprovante ou recibo → bloqueia', () => {
    expect(avaliarReabertura(dados({ payoutsAlvo: [{ status: 'pendente', comprovante_url: 'x' }] })).ok).toBe(false)
    expect(avaliarReabertura(dados({ payoutsAlvo: [{ status: 'pendente', recibo_url: 'x' }] })).ok).toBe(false)
  })

  it('quinzena nova já tem lançamentos → bloqueia', () => {
    const r = avaliarReabertura(dados({ lancamentosAberta: 3 }))
    expect(r).toMatchObject({ ok: false, status: 409 })
  })
})
