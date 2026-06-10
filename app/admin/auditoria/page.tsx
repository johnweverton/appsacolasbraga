export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatDate } from '@/lib/format'

const ACAO_LABEL: Record<string, { label: string; cor: string }> = {
  fechou_quinzena:    { label: 'Fechou quinzena',    cor: 'bg-purple-100 text-purple-700' },
  fechou_colaborador: { label: 'Fechou colaborador', cor: 'bg-indigo-100 text-indigo-700' },
  marcou_pago:        { label: 'Marcou pago',         cor: 'bg-green-100 text-green-700'  },
  editou_lancamento:  { label: 'Editou lançamento',  cor: 'bg-amber-100 text-amber-700'  },
  excluiu_lancamento: { label: 'Excluiu lançamento', cor: 'bg-red-100 text-red-700'      },
}

export default async function AuditoriaPage() {
  const supabase = createClient()
  const adminClient = createAdminClient()

  const { data: logs } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)

  const userIds = Array.from(new Set((logs ?? []).map((l) => l.usuario_id).filter(Boolean)))
  let nomesMap = new Map<string, string>()
  if (userIds.length > 0) {
    const { data: users } = await supabase
      .from('users')
      .select('id, nome')
      .in('id', userIds)
    const { data: authUsers } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
    const emailMap = new Map((authUsers?.users ?? []).map((u) => [u.id, u.email ?? '']))
    nomesMap = new Map((users ?? []).map((u) => [u.id, u.nome || emailMap.get(u.id) || u.id.slice(0, 8)]))
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-bold text-brand-dark text-2xl">Auditoria</h2>
        <p className="text-sm text-brand-dark/40 mt-1">Registro de todas as ações críticas do sistema.</p>
      </div>

      {(logs ?? []).length === 0 ? (
        <div className="rounded-2xl bg-white border border-black/[0.06] px-6 py-12 text-center">
          <p className="text-sm text-gray-400">Nenhum evento registrado ainda.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-black/[0.06] bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/[0.05] bg-brand-cream/50">
                <th className="px-4 py-3 text-left text-[10px] font-sans font-semibold uppercase tracking-widest text-gray-400">Data</th>
                <th className="px-4 py-3 text-left text-[10px] font-sans font-semibold uppercase tracking-widest text-gray-400">Ação</th>
                <th className="px-4 py-3 text-left text-[10px] font-sans font-semibold uppercase tracking-widest text-gray-400">Usuário</th>
                <th className="px-4 py-3 text-left text-[10px] font-sans font-semibold uppercase tracking-widest text-gray-400 hidden sm:table-cell">Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {(logs ?? []).map((log) => {
                const info = ACAO_LABEL[log.acao] ?? { label: log.acao, cor: 'bg-gray-100 text-gray-600' }
                return (
                  <tr key={log.id} className="border-b border-black/[0.04] last:border-0 hover:bg-brand-cream/30">
                    <td className="px-4 py-3 text-xs text-gray-400 tabular-nums whitespace-nowrap">
                      {formatDate(log.created_at)}{' '}
                      {new Date(log.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block text-[10px] font-sans font-semibold px-2 py-0.5 rounded-full ${info.cor}`}>
                        {info.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {log.usuario_id ? nomesMap.get(log.usuario_id) ?? log.usuario_id.slice(0, 8) : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 hidden sm:table-cell">
                      {log.payload ? (
                        <code className="text-[10px] bg-gray-50 px-1.5 py-0.5 rounded">
                          {JSON.stringify(log.payload).slice(0, 80)}
                        </code>
                      ) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
