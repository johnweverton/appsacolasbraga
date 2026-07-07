import { NextResponse, NextRequest } from 'next/server'
import { assertAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAudit } from '@/lib/audit'
import { enviarPushParaUsuario, notificarAdmins } from '@/lib/push'
import {
  auditarPar,
  auditarLancamentoSolo,
  descreverMotivos,
  type PerfilColaborador,
} from '@/lib/auditoria'

interface EntryScan {
  id: string
  colaborador_id: string
  parceiro_id: string | null
  data_producao: string
  marca: string
  tamanho: string
  funcao: string
  quantidade: number
  status: string
}

export interface SuspeitaAuditoria {
  tipo: 'divergencia' | 'aviso'
  data: string
  marca: string
  tamanho: string
  colaboradores: string[]
  descricao: string
  motivos: string[]
  /** true quando esta varredura acabou de marcar como divergente */
  nova: boolean
}

/**
 * Varredura de auditoria sob demanda (admin): reaudita toda a quinzena cruzando
 * quantidade + função de cada par espelhado, marca como divergente as duplas com
 * função inconsistente (caso Pedro/Edynardo) e retorna o relatório de suspeitas.
 * Pega lançamentos antigos e pares já confirmados, complementando a conferência
 * em tempo real do registro.
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await assertAdmin()
    if (!admin) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

    const db = createAdminClient()

    // Quinzena alvo: a informada ou a aberta
    let quinzenaId: string | undefined
    try {
      const body = await request.json()
      quinzenaId = body?.quinzena_id
    } catch {
      // sem body → usa a quinzena aberta
    }
    if (!quinzenaId) {
      const { data: q } = await db.from('pay_periods').select('id').eq('status', 'aberta').single()
      quinzenaId = q?.id
    }
    if (!quinzenaId) {
      return NextResponse.json({ error: 'Nenhuma quinzena aberta para auditar' }, { status: 400 })
    }

    const { data: entriesRaw } = await db
      .from('production_entries')
      .select('id, colaborador_id, parceiro_id, data_producao, marca, tamanho, funcao, quantidade, status')
      .eq('quinzena_id', quinzenaId)

    const entries = (entriesRaw ?? []) as EntryScan[]

    // Perfis dos envolvidos
    const ids = Array.from(
      new Set(entries.flatMap((e) => [e.colaborador_id, e.parceiro_id]).filter(Boolean) as string[]),
    )
    const { data: perfisData } = ids.length
      ? await db.from('users').select('id, nome, funcao').in('id', ids)
      : { data: [] }

    const perfis = new Map<string, PerfilColaborador>(
      (perfisData ?? []).map((p) => [p.id, p as PerfilColaborador]),
    )
    const nomes: Record<string, string> = {}
    for (const p of perfisData ?? []) nomes[p.id] = p.nome

    // Agrupa por (data, marca, tamanho, dupla) para localizar pares recíprocos
    const grupos = new Map<string, EntryScan[]>()
    for (const e of entries) {
      const dupla = [e.colaborador_id, e.parceiro_id ?? ''].sort().join('|')
      const chave = `${e.data_producao}::${e.marca}::${e.tamanho}::${dupla}`
      if (!grupos.has(chave)) grupos.set(chave, [])
      grupos.get(chave)!.push(e)
    }

    const suspeitas: SuspeitaAuditoria[] = []
    const emPar = new Set<string>()

    for (const grupo of Array.from(grupos.values())) {
      for (let i = 0; i < grupo.length; i++) {
        for (let j = i + 1; j < grupo.length; j++) {
          const a = grupo[i]
          const b = grupo[j]
          const reciproco = a.colaborador_id === b.parceiro_id && b.colaborador_id === a.parceiro_id
          if (!reciproco) continue

          emPar.add(a.id)
          emPar.add(b.id)

          const resultado = auditarPar(
            { colaborador_id: a.colaborador_id, funcao: a.funcao, quantidade: a.quantidade },
            { colaborador_id: b.colaborador_id, funcao: b.funcao, quantidade: b.quantidade },
            perfis.get(a.colaborador_id),
            perfis.get(b.colaborador_id),
          )

          if (!resultado.divergente) continue

          const descricao = descreverMotivos(resultado, nomes)
          const jaDivergente = a.status === 'divergente' && b.status === 'divergente'

          if (!jaDivergente) {
            await db
              .from('production_entries')
              .update({ status: 'divergente', observacao: descricao })
              .in('id', [a.id, b.id])

            // Notifica os dois colaboradores sobre a nova divergência
            const corpo = resultado.motivos.includes('funcao')
              ? 'Auditoria encontrou possível troca de função no seu lançamento. Confira com seu parceiro.'
              : 'Auditoria encontrou divergência de quantidade no seu lançamento.'
            await Promise.all([
              enviarPushParaUsuario(a.colaborador_id, '⚠️ Divergência na auditoria', corpo, '/colaborador/producoes'),
              enviarPushParaUsuario(b.colaborador_id, '⚠️ Divergência na auditoria', corpo, '/colaborador/producoes'),
            ])
          }

          suspeitas.push({
            tipo: 'divergencia',
            data: a.data_producao,
            marca: a.marca,
            tamanho: a.tamanho,
            colaboradores: [nomes[a.colaborador_id] ?? '—', nomes[b.colaborador_id] ?? '—'],
            descricao,
            motivos: resultado.motivos,
            nova: !jaDivergente,
          })
        }
      }
    }

    // Avisos advisórios: pendentes sem par cuja função destoa do perfil
    for (const e of entries) {
      if (emPar.has(e.id) || e.status === 'divergente') continue
      // Lançamento solo (parceiro = si mesmo): não há parceiro para "esperar",
      // então o aviso de função destoante do perfil não se aplica aqui.
      if (e.parceiro_id === e.colaborador_id) continue
      const suspeita = auditarLancamentoSolo(
        { colaborador_id: e.colaborador_id, funcao: e.funcao, quantidade: e.quantidade },
        perfis.get(e.colaborador_id),
      )
      if (!suspeita) continue
      suspeitas.push({
        tipo: 'aviso',
        data: e.data_producao,
        marca: e.marca,
        tamanho: e.tamanho,
        colaboradores: [nomes[e.colaborador_id] ?? '—'],
        descricao: `${nomes[e.colaborador_id] ?? 'Colaborador'} marcou ${suspeita.registrado}, mas o perfil é ${suspeita.esperado}. Aguardando o parceiro para confirmar.`,
        motivos: ['funcao'],
        nova: false,
      })
    }

    const novas = suspeitas.filter((s) => s.nova).length

    await logAudit('auditoria_executada', {
      usuarioId: admin.id,
      payload: { quinzena_id: quinzenaId, total: suspeitas.length, novas },
    })

    if (novas > 0) {
      await notificarAdmins(
        '🔎 Auditoria concluída',
        `${novas} nova(s) divergência(s) marcada(s) nesta quinzena.`,
        '/admin/lancamentos',
      )
    }

    return NextResponse.json({ total: suspeitas.length, novas, suspeitas })
  } catch {
    return NextResponse.json({ error: 'Erro ao executar auditoria' }, { status: 500 })
  }
}
