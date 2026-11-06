/**
 * Conferência cruzada por dupla e por dia (módulo puro, sem IO).
 *
 * A conferência espelho (lib/conferir-par.ts) casa lançamento a lançamento
 * pela chave data + marca + tamanho. Se um dos dois digitar marca/tamanho
 * diferente, ou dividir a produção em lançamentos distintos, o par nunca casa
 * e os lançamentos ficam "pendentes" — e pendente entra no pagamento.
 *
 * Aqui comparamos o TOTAL do dia: o que o colaborador X anotou que fez com Y
 * versus o que Y anotou que fez com X. Ex.: pintor anotou 1050 e ajudante
 * anotou 1150 no dia 14 → diferença de 100, a dupla fica divergente.
 */

export interface LancamentoConferencia {
  id: string
  colaborador_id: string
  parceiro_id: string | null
  data_producao: string
  funcao: string
  quantidade: number
  cores: number
  status: string
}

export type StatusConferenciaDupla = 'ok' | 'divergente' | 'sem_par'

export interface LadoDupla {
  colaborador_id: string
  /** quantidade de lançamentos anotados por este lado */
  lancamentos: number
  /** soma de `quantidade` (o que foi digitado) */
  quantidade: number
  /** soma de quantidade × cores (base de pagamento) */
  unidades: number
  /** funções distintas registradas por este lado no dia */
  funcoes: string[]
  ids: string[]
}

export interface ConferenciaDupla {
  chave: string
  data: string
  ladoA: LadoDupla
  ladoB: LadoDupla
  status: StatusConferenciaDupla
  /** ladoA.quantidade − ladoB.quantidade */
  diferencaQuantidade: number
  /** ladoA.unidades − ladoB.unidades */
  diferencaUnidades: number
  /** true quando os dois lados marcaram a mesma função (deve ser pintor + ajudante) */
  conflitoFuncao: boolean
}

function ladoVazio(colaborador_id: string): LadoDupla {
  return { colaborador_id, lancamentos: 0, quantidade: 0, unidades: 0, funcoes: [], ids: [] }
}

/** Lançamento feito sozinho (sem parceiro) não entra na conferência de dupla. */
export function ehSolo(e: Pick<LancamentoConferencia, 'colaborador_id' | 'parceiro_id'>): boolean {
  return !e.parceiro_id || e.parceiro_id === e.colaborador_id
}

/**
 * Agrupa os lançamentos por (dia, dupla) e compara os totais de cada lado.
 * Considera todos os status — a ideia é auditar o que cada um anotou.
 * O lado A é sempre o de menor id, para a chave ser estável.
 */
export function conferirDuplas(entries: LancamentoConferencia[]): ConferenciaDupla[] {
  const grupos = new Map<string, { data: string; lados: Map<string, LadoDupla>; ids: [string, string] }>()

  for (const e of entries) {
    if (ehSolo(e)) continue
    const par = [e.colaborador_id, e.parceiro_id as string].sort() as [string, string]
    const chave = `${e.data_producao}::${par[0]}|${par[1]}`

    let grupo = grupos.get(chave)
    if (!grupo) {
      grupo = {
        data: e.data_producao,
        ids: par,
        lados: new Map([
          [par[0], ladoVazio(par[0])],
          [par[1], ladoVazio(par[1])],
        ]),
      }
      grupos.set(chave, grupo)
    }

    const lado = grupo.lados.get(e.colaborador_id)!
    lado.lancamentos += 1
    lado.quantidade += e.quantidade
    lado.unidades += e.quantidade * (e.cores || 1)
    lado.ids.push(e.id)
    if (!lado.funcoes.includes(e.funcao)) lado.funcoes.push(e.funcao)
  }

  const resultado: ConferenciaDupla[] = []
  for (const [chave, g] of Array.from(grupos.entries())) {
    const ladoA = g.lados.get(g.ids[0])!
    const ladoB = g.lados.get(g.ids[1])!

    const diferencaQuantidade = ladoA.quantidade - ladoB.quantidade
    const diferencaUnidades = ladoA.unidades - ladoB.unidades

    let status: StatusConferenciaDupla
    if (ladoA.lancamentos === 0 || ladoB.lancamentos === 0) status = 'sem_par'
    else if (diferencaQuantidade !== 0 || diferencaUnidades !== 0) status = 'divergente'
    else status = 'ok'

    const conflitoFuncao =
      ladoA.lancamentos > 0 &&
      ladoB.lancamentos > 0 &&
      ladoA.funcoes.length === 1 &&
      ladoB.funcoes.length === 1 &&
      ladoA.funcoes[0] === ladoB.funcoes[0] &&
      ladoA.funcoes[0] !== 'ambos'

    resultado.push({
      chave,
      data: g.data,
      ladoA,
      ladoB,
      status: conflitoFuncao && status === 'ok' ? 'divergente' : status,
      diferencaQuantidade,
      diferencaUnidades,
      conflitoFuncao,
    })
  }

  // Mais recentes primeiro; divergências antes no mesmo dia
  const peso: Record<StatusConferenciaDupla, number> = { divergente: 0, sem_par: 1, ok: 2 }
  return resultado.sort((a, b) =>
    a.data !== b.data ? b.data.localeCompare(a.data) : peso[a.status] - peso[b.status],
  )
}

/** Conjunto de colaboradores envolvidos em ao menos um dia de dupla divergente. */
export function colaboradoresComDuplaDivergente(conferencias: ConferenciaDupla[]): Set<string> {
  const ids = new Set<string>()
  for (const c of conferencias) {
    if (c.status !== 'divergente') continue
    ids.add(c.ladoA.colaborador_id)
    ids.add(c.ladoB.colaborador_id)
  }
  return ids
}

/** Texto curto para relatórios/auditoria. */
export function descreverConferencia(c: ConferenciaDupla, nomes: Record<string, string> = {}): string {
  const nA = nomes[c.ladoA.colaborador_id] ?? 'Colaborador'
  const nB = nomes[c.ladoB.colaborador_id] ?? 'parceiro'
  if (c.status === 'sem_par') {
    const anotou = c.ladoA.lancamentos > 0 ? c.ladoA : c.ladoB
    const faltou = anotou === c.ladoA ? nB : nA
    return `${nomes[anotou.colaborador_id] ?? 'Colaborador'} anotou ${anotou.quantidade} com ${faltou}, que não anotou nada neste dia.`
  }
  const partes: string[] = []
  if (c.diferencaQuantidade !== 0 || c.diferencaUnidades !== 0) {
    partes.push(
      `${nA} anotou ${c.ladoA.quantidade} (${c.ladoA.unidades} un.) e ${nB} anotou ${c.ladoB.quantidade} (${c.ladoB.unidades} un.) — diferença de ${Math.abs(c.diferencaQuantidade)}.`,
    )
  }
  if (c.conflitoFuncao) {
    partes.push(`Os dois marcaram a mesma função (${c.ladoA.funcoes[0]}).`)
  }
  return partes.join(' ') || 'Totais conferem.'
}
