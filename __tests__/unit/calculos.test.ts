import { calcularPayouts, calcularValorProducao } from '@/lib/calculos'

const AJUDANTE  = 20.00 // R$/milheiro
const IMPRESSOR = 25.00 // R$/milheiro

describe('calcularValorProducao — ajudante (R$20,00/milheiro)', () => {
  it('300 unidades → proporcional → R$6,00', () => {
    expect(calcularValorProducao(300, AJUDANTE)).toBeCloseTo(6.00, 2)
  })

  it('499 unidades → proporcional → R$9,98', () => {
    expect(calcularValorProducao(499, AJUDANTE)).toBeCloseTo(9.98, 2)
  })

  it('500 unidades → benefício (início da faixa) → R$20,00', () => {
    expect(calcularValorProducao(500, AJUDANTE)).toBe(20.00)
  })

  it('800 unidades → benefício (meio da faixa) → R$20,00', () => {
    expect(calcularValorProducao(800, AJUDANTE)).toBe(20.00)
  })

  it('999 unidades → benefício (fim da faixa) → R$20,00', () => {
    expect(calcularValorProducao(999, AJUDANTE)).toBe(20.00)
  })

  it('1.000 unidades → proporcional exato → R$20,00', () => {
    expect(calcularValorProducao(1000, AJUDANTE)).toBeCloseTo(20.00, 2)
  })

  it('1.500 unidades → proporcional → R$30,00', () => {
    expect(calcularValorProducao(1500, AJUDANTE)).toBeCloseTo(30.00, 2)
  })

  it('2.300 unidades → proporcional → R$46,00', () => {
    expect(calcularValorProducao(2300, AJUDANTE)).toBeCloseTo(46.00, 2)
  })
})

describe('calcularValorProducao — impressor (R$25,00/milheiro)', () => {
  it('300 unidades → proporcional → R$7,50', () => {
    expect(calcularValorProducao(300, IMPRESSOR)).toBeCloseTo(7.50, 2)
  })

  it('800 unidades → benefício → R$25,00', () => {
    expect(calcularValorProducao(800, IMPRESSOR)).toBe(25.00)
  })

  it('1.500 unidades → proporcional → R$37,50', () => {
    expect(calcularValorProducao(1500, IMPRESSOR)).toBeCloseTo(37.50, 2)
  })
})

describe('calcularValorProducao — limites da faixa de benefício', () => {
  it('499 → fora da faixa (abaixo)', () => {
    expect(calcularValorProducao(499, AJUDANTE)).toBeLessThan(AJUDANTE)
  })

  it('500 → dentro da faixa', () => {
    expect(calcularValorProducao(500, AJUDANTE)).toBe(AJUDANTE)
  })

  it('999 → dentro da faixa', () => {
    expect(calcularValorProducao(999, AJUDANTE)).toBe(AJUDANTE)
  })

  it('1000 → fora da faixa (acima) — paga exato 1 milheiro proporcional', () => {
    expect(calcularValorProducao(1000, AJUDANTE)).toBe(AJUDANTE)
  })
})

describe('calcularPayouts — multiplicador de cores (quantidade × cores)', () => {
  const RATES = [
    { funcao: 'pintor', valor_unitario: IMPRESSOR },
    { funcao: 'ajudante', valor_unitario: AJUDANTE },
  ]

  it('500 sacolas com 3 cores → 1.500 unidades efetivas', () => {
    const payouts = calcularPayouts(
      [{ colaborador_id: 'c1', quantidade: 500, cores: 3, status: 'pendente', funcao: 'pintor' }],
      RATES,
    )

    expect(payouts).toHaveLength(1)
    expect(payouts[0].total_unidades).toBe(1500)
    expect(payouts[0].valor_total).toBeCloseTo(calcularValorProducao(1500, IMPRESSOR), 2)
  })

  it('soma múltiplos lançamentos do mesmo colaborador/função aplicando cores em cada um', () => {
    const payouts = calcularPayouts(
      [
        { colaborador_id: 'c1', quantidade: 200, cores: 2, status: 'confirmado', funcao: 'ajudante' },
        { colaborador_id: 'c1', quantidade: 100, cores: 1, status: 'pendente', funcao: 'ajudante' },
      ],
      RATES,
    )

    // (200×2) + (100×1) = 500
    expect(payouts[0].total_unidades).toBe(500)
    expect(payouts[0].valor_total).toBeCloseTo(calcularValorProducao(500, AJUDANTE), 2)
  })

  it('lançamentos divergentes não entram no total', () => {
    const payouts = calcularPayouts(
      [
        { colaborador_id: 'c1', quantidade: 500, cores: 3, status: 'confirmado', funcao: 'pintor' },
        { colaborador_id: 'c1', quantidade: 1000, cores: 5, status: 'divergente', funcao: 'pintor' },
      ],
      RATES,
    )

    expect(payouts[0].total_unidades).toBe(1500)
  })

  it('1 cor não altera a quantidade (multiplicador neutro)', () => {
    const payouts = calcularPayouts(
      [{ colaborador_id: 'c1', quantidade: 800, cores: 1, status: 'confirmado', funcao: 'ajudante' }],
      RATES,
    )

    expect(payouts[0].total_unidades).toBe(800)
  })
})
