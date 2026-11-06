import {
  conferirDuplas,
  colaboradoresComDuplaDivergente,
  descreverConferencia,
  ehSolo,
  type LancamentoConferencia,
} from '@/lib/conferencia-dupla'

let seq = 0
function lanc(p: Partial<LancamentoConferencia>): LancamentoConferencia {
  seq += 1
  return {
    id: `e${seq}`,
    colaborador_id: 'pintor',
    parceiro_id: 'ajudante',
    data_producao: '2026-11-14',
    funcao: 'pintor',
    quantidade: 100,
    cores: 1,
    status: 'pendente',
    ...p,
  }
}

const NOMES = { pintor: 'Pintor X', ajudante: 'Ajudante Y' }

describe('conferirDuplas', () => {
  it('totais iguais dos dois lados → ok', () => {
    const r = conferirDuplas([
      lanc({ quantidade: 1050 }),
      lanc({ colaborador_id: 'ajudante', parceiro_id: 'pintor', funcao: 'ajudante', quantidade: 1050 }),
    ])
    expect(r).toHaveLength(1)
    expect(r[0].status).toBe('ok')
    expect(r[0].diferencaQuantidade).toBe(0)
  })

  it('pintor anotou 1050 e ajudante 1150 no mesmo dia → divergente com diferença 100', () => {
    const r = conferirDuplas([
      lanc({ quantidade: 1050 }),
      lanc({ colaborador_id: 'ajudante', parceiro_id: 'pintor', funcao: 'ajudante', quantidade: 1150 }),
    ])
    expect(r[0].status).toBe('divergente')
    expect(Math.abs(r[0].diferencaQuantidade)).toBe(100)
    expect(descreverConferencia(r[0], NOMES)).toContain('diferença de 100')
  })

  it('soma vários lançamentos do dia, mesmo com marca/tamanho diferentes', () => {
    const r = conferirDuplas([
      lanc({ quantidade: 500 }),
      lanc({ quantidade: 550 }),
      lanc({ colaborador_id: 'ajudante', parceiro_id: 'pintor', funcao: 'ajudante', quantidade: 1050 }),
    ])
    expect(r[0].status).toBe('ok')
    const pintor = r[0].ladoA.colaborador_id === 'pintor' ? r[0].ladoA : r[0].ladoB
    expect(pintor.lancamentos).toBe(2)
    expect(pintor.quantidade).toBe(1050)
  })

  it('mesma quantidade mas cores diferentes → divergente (muda o pagamento)', () => {
    const r = conferirDuplas([
      lanc({ quantidade: 1000, cores: 2 }),
      lanc({ colaborador_id: 'ajudante', parceiro_id: 'pintor', funcao: 'ajudante', quantidade: 1000, cores: 1 }),
    ])
    expect(r[0].status).toBe('divergente')
    expect(r[0].diferencaQuantidade).toBe(0)
    expect(Math.abs(r[0].diferencaUnidades)).toBe(1000)
  })

  it('só um lado anotou → sem_par', () => {
    const r = conferirDuplas([lanc({ quantidade: 800 })])
    expect(r[0].status).toBe('sem_par')
    expect(descreverConferencia(r[0], NOMES)).toContain('não anotou')
  })

  it('dias diferentes são conferidos separadamente', () => {
    const r = conferirDuplas([
      lanc({ data_producao: '2026-11-13', quantidade: 300 }),
      lanc({ colaborador_id: 'ajudante', parceiro_id: 'pintor', funcao: 'ajudante', data_producao: '2026-11-14', quantidade: 300 }),
    ])
    expect(r).toHaveLength(2)
    expect(r.every((c) => c.status === 'sem_par')).toBe(true)
  })

  it('mesma função dos dois lados → conflito de função, divergente', () => {
    const r = conferirDuplas([
      lanc({ quantidade: 100 }),
      lanc({ colaborador_id: 'ajudante', parceiro_id: 'pintor', funcao: 'pintor', quantidade: 100 }),
    ])
    expect(r[0].conflitoFuncao).toBe(true)
    expect(r[0].status).toBe('divergente')
  })

  it('ignora lançamentos solo', () => {
    expect(ehSolo({ colaborador_id: 'a', parceiro_id: 'a' })).toBe(true)
    expect(ehSolo({ colaborador_id: 'a', parceiro_id: null })).toBe(true)
    expect(conferirDuplas([lanc({ parceiro_id: 'pintor', funcao: 'ambos' })])).toEqual([])
  })

  it('colaboradoresComDuplaDivergente retorna os dois da dupla', () => {
    const r = conferirDuplas([
      lanc({ quantidade: 1050 }),
      lanc({ colaborador_id: 'ajudante', parceiro_id: 'pintor', funcao: 'ajudante', quantidade: 1150 }),
    ])
    const ids = colaboradoresComDuplaDivergente(r)
    expect(Array.from(ids).sort()).toEqual(['ajudante', 'pintor'])
  })
})
