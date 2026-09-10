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

  it('500 unidades → proporcional → R$10,00', () => {
    expect(calcularValorProducao(500, AJUDANTE)).toBeCloseTo(10.00, 2)
  })

  it('800 unidades → proporcional → R$16,00', () => {
    expect(calcularValorProducao(800, AJUDANTE)).toBeCloseTo(16.00, 2)
  })

  it('999 unidades → proporcional → R$19,98', () => {
    expect(calcularValorProducao(999, AJUDANTE)).toBeCloseTo(19.98, 2)
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

  it('800 unidades → proporcional → R$20,00', () => {
    expect(calcularValorProducao(800, IMPRESSOR)).toBeCloseTo(20.00, 2)
  })

  it('1.500 unidades → proporcional → R$37,50', () => {
    expect(calcularValorProducao(1500, IMPRESSOR)).toBeCloseTo(37.50, 2)
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

  it('credita a mesma quantidade nas duas funções, pagando as duas taxas de forma proporcional', () => {
    const payouts = calcularPayouts(
      [{ colaborador_id: 'c1', quantidade: 800, cores: 1, status: 'pendente', funcao: 'ambos' }],
      RATES,
    )

    // 800 unidades contam para pintor E para ajudante → 1600 no total
    expect(payouts[0].total_unidades).toBe(1600)
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
    // 200 (pintor direto) + 800 (ambos→pintor) + 800 (ambos→ajudante), tudo proporcional
    expect(payouts[0].valor_total).toBeCloseTo(
      calcularValorProducao(200, IMPRESSOR) + (800 / 1000) * IMPRESSOR + (800 / 1000) * AJUDANTE,
      2,
    )
  })

  it('soma corretamente 1000 pintor direto + 500 ambos, tudo proporcional', () => {
    const payouts = calcularPayouts(
      [
        { colaborador_id: 'c1', quantidade: 1000, cores: 1, status: 'pendente', funcao: 'pintor' },
        { colaborador_id: 'c1', quantidade: 500, cores: 1, status: 'pendente', funcao: 'ambos' },
      ],
      RATES,
    )

    expect(payouts[0].total_unidades).toBe(1000 + 500 + 500)
    // pintor direto: 1000 → R$25,00 | ambos→pintor: 500 → R$12,50 | ambos→ajudante: 500 → R$10,00
    expect(payouts[0].valor_total).toBeCloseTo(47.5, 2)
  })
})
