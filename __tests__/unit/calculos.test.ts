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

describe('calcularPayouts — funcao "ambos" (lançamento solo, pintor + ajudante)', () => {
  const RATES = [
    { funcao: 'pintor', valor_unitario: IMPRESSOR },
    { funcao: 'ajudante', valor_unitario: AJUDANTE },
  ]

  it('credita a mesma quantidade nas duas funções, pagando as duas taxas de forma proporcional (sem bônus de faixa)', () => {
    const payouts = calcularPayouts(
      [{ colaborador_id: 'c1', quantidade: 800, cores: 1, status: 'pendente', funcao: 'ambos' }],
      RATES,
    )

    // 800 unidades contam para pintor E para ajudante → 1600 no total
    expect(payouts[0].total_unidades).toBe(1600)
    // crédito derivado de 'ambos' não é elegível ao benefício de faixa (500-999 cheio):
    // sempre proporcional, para não pagar o bônus em dobro sobre o mesmo lote físico
    expect(payouts[0].valor_total).toBeCloseTo(
      (800 / 1000) * IMPRESSOR + (800 / 1000) * AJUDANTE,
      2,
    )
    // duas taxas diferentes aplicadas → valor_unitario "variável" (0)
    expect(payouts[0].valor_unitario).toBe(0)
  })

  it('produz o mesmo valor_total que dois lançamentos separados (pintor + ajudante)', () => {
    const [ambos] = calcularPayouts(
      [{ colaborador_id: 'c1', quantidade: 800, cores: 2, status: 'pendente', funcao: 'ambos' }],
      RATES,
    )
    const [separado] = calcularPayouts(
      [
        { colaborador_id: 'c1', quantidade: 800, cores: 2, status: 'pendente', funcao: 'pintor' },
        { colaborador_id: 'c1', quantidade: 800, cores: 2, status: 'pendente', funcao: 'ajudante' },
      ],
      RATES,
    )

    expect(ambos.total_unidades).toBe(separado.total_unidades)
    expect(ambos.valor_total).toBeCloseTo(separado.valor_total, 2)
  })

  it('soma "ambos" com lançamentos avulsos de pintor/ajudante do mesmo colaborador', () => {
    const payouts = calcularPayouts(
      [
        { colaborador_id: 'c1', quantidade: 800, cores: 1, status: 'pendente', funcao: 'ambos' },
        { colaborador_id: 'c1', quantidade: 200, cores: 1, status: 'pendente', funcao: 'pintor' },
      ],
      RATES,
    )

    expect(payouts[0].total_unidades).toBe(800 + 800 + 200)
    // 200 (pintor direto, fora da faixa) + 800 (ambos→pintor, sempre proporcional) + 800 (ambos→ajudante, sempre proporcional)
    expect(payouts[0].valor_total).toBeCloseTo(
      calcularValorProducao(200, IMPRESSOR) + (800 / 1000) * IMPRESSOR + (800 / 1000) * AJUDANTE,
      2,
    )
  })

  it('regressão: 1000 pintor direto + 500 ambos não paga o bônus de faixa em dobro sobre o mesmo lote', () => {
    // Caso real reportado: colaborador com 1000 unid. como pintor + 500 unid. como
    // ambos (pintor+ajudante). Antes da correção, o crédito de ajudante derivado do
    // 'ambos' (500 unid., sozinho) caía na faixa 500-999 e pagava o milheiro cheio
    // (R$20,00) em vez do proporcional (R$10,00), somando R$57,50 em vez de R$47,50.
    const payouts = calcularPayouts(
      [
        { colaborador_id: 'c1', quantidade: 1000, cores: 1, status: 'pendente', funcao: 'pintor' },
        { colaborador_id: 'c1', quantidade: 500, cores: 1, status: 'pendente', funcao: 'ambos' },
      ],
      RATES,
    )

    expect(payouts[0].total_unidades).toBe(1000 + 500 + 500)
    // pintor direto: 1000 → proporcional R$25,00
    // ambos→pintor: 500 → proporcional R$12,50 (sem bônus de faixa)
    // ambos→ajudante: 500 → proporcional R$10,00 (sem bônus de faixa)
    expect(payouts[0].valor_total).toBeCloseTo(47.5, 2)
  })
})
