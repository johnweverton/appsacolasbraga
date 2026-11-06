'use client'

import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react'
import { formatDate } from '@/lib/format'
import type { ConferenciaDupla, LadoDupla, StatusConferenciaDupla } from '@/lib/conferencia-dupla'

const FUNCAO_LABELS: Record<string, string> = {
  pintor: 'Pintor',
  ajudante: 'Ajudante',
  ambos: 'Pintor + Ajudante',
}

const STATUS_INFO: Record<StatusConferenciaDupla, { label: string; className: string; Icon: typeof CheckCircle2 }> = {
  ok: { label: 'Confere', className: 'bg-green-100 text-green-800', Icon: CheckCircle2 },
  divergente: { label: 'Diferença', className: 'bg-red-100 text-red-800', Icon: AlertTriangle },
  sem_par: { label: 'Só um anotou', className: 'bg-yellow-100 text-yellow-800', Icon: Clock },
}

interface Props {
  conferencias: ConferenciaDupla[]
  nomes: Record<string, string>
  /** quando informado, este colaborador aparece sempre à esquerda */
  colaboradorFoco?: string
}

function Lado({ lado, nome, destaque }: { lado: LadoDupla; nome: string; destaque: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-gray-500 truncate">
        {nome}
        {lado.funcoes.length > 0 && (
          <span className="text-gray-400"> · {lado.funcoes.map((f) => FUNCAO_LABELS[f] ?? f).join(', ')}</span>
        )}
      </p>
      {lado.lancamentos === 0 ? (
        <p className="text-sm text-yellow-700 font-medium">Não anotou</p>
      ) : (
        <p className={`text-lg font-semibold tabular-nums ${destaque ? 'text-red-700' : 'text-gray-800'}`}>
          {lado.quantidade.toLocaleString('pt-BR')}
          <span className="ml-1 text-[11px] font-normal text-gray-400">
            {lado.unidades !== lado.quantidade && `(${lado.unidades.toLocaleString('pt-BR')} un.) `}
            em {lado.lancamentos} lanç.
          </span>
        </p>
      )}
    </div>
  )
}

export function ConferenciaDuplas({ conferencias, nomes, colaboradorFoco }: Props) {
  if (conferencias.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-400">
        Nenhum trabalho em dupla para os filtros selecionados.
      </div>
    )
  }

  const totais = {
    ok: conferencias.filter((c) => c.status === 'ok').length,
    divergente: conferencias.filter((c) => c.status === 'divergente').length,
    sem_par: conferencias.filter((c) => c.status === 'sem_par').length,
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="px-2 py-1 rounded-full bg-red-100 text-red-800 font-medium">
          {totais.divergente} com diferença
        </span>
        <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 font-medium">
          {totais.sem_par} só um anotou
        </span>
        <span className="px-2 py-1 rounded-full bg-green-100 text-green-800 font-medium">
          {totais.ok} conferem
        </span>
      </div>

      <div className="grid gap-2">
        {conferencias.map((c) => {
          // Mantém o colaborador filtrado sempre do lado esquerdo
          const inverter = colaboradorFoco && c.ladoB.colaborador_id === colaboradorFoco
          const esq = inverter ? c.ladoB : c.ladoA
          const dir = inverter ? c.ladoA : c.ladoB
          const info = STATUS_INFO[c.status]
          const diferente = c.status === 'divergente' && c.diferencaQuantidade !== 0
          const diff = Math.abs(c.diferencaQuantidade)
          const diffUn = Math.abs(c.diferencaUnidades)

          return (
            <div
              key={c.chave}
              className={`rounded-xl border bg-white p-3 ${
                c.status === 'divergente' ? 'border-red-200' : c.status === 'sem_par' ? 'border-yellow-200' : 'border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-sm font-medium text-gray-700">{formatDate(c.data)}</span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${info.className}`}>
                  <info.Icon size={12} /> {info.label}
                </span>
              </div>

              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <Lado lado={esq} nome={nomes[esq.colaborador_id] ?? '—'} destaque={diferente} />
                <span className="text-xs text-gray-300">×</span>
                <Lado lado={dir} nome={nomes[dir.colaborador_id] ?? '—'} destaque={diferente} />
              </div>

              {c.status === 'divergente' && (
                <p className="mt-2 text-xs text-red-600">
                  {diff > 0 && <>Diferença de <strong>{diff.toLocaleString('pt-BR')}</strong> na quantidade anotada. </>}
                  {diff === 0 && diffUn > 0 && (
                    <>Mesma quantidade, mas cores diferentes: diferença de <strong>{diffUn.toLocaleString('pt-BR')}</strong> unidades pagas. </>
                  )}
                  {c.conflitoFuncao && <>Os dois marcaram a mesma função ({FUNCAO_LABELS[c.ladoA.funcoes[0]] ?? c.ladoA.funcoes[0]}). </>}
                  Confira com a dupla antes de fechar o pagamento.
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
