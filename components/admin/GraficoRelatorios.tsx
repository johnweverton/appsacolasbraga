'use client'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

interface Props {
  dadosPorQuinzena: {
    periodo: string
    unidades: number
    valor: number
    pendente: number
    confirmado: number
    divergente: number
  }[]
  topColaboradores: { nome: string; unidades: number }[]
}

const CORES_STATUS = ['#22c55e', '#f59e0b', '#ef4444']

export function GraficoRelatorios({ dadosPorQuinzena, topColaboradores }: Props) {
  const statusPieData = dadosPorQuinzena.length > 0
    ? [
        { name: 'Confirmado', value: dadosPorQuinzena.reduce((s, q) => s + q.confirmado, 0) },
        { name: 'Pendente', value: dadosPorQuinzena.reduce((s, q) => s + q.pendente, 0) },
        { name: 'Divergente', value: dadosPorQuinzena.reduce((s, q) => s + q.divergente, 0) },
      ].filter((d) => d.value > 0)
    : []

  return (
    <div className="space-y-4">
      {/* Produção por quinzena */}
      <div className="rounded-2xl bg-white border border-black/[0.06] p-5">
        <h3 className="text-sm font-sans font-semibold text-brand-dark/60 uppercase tracking-widest mb-4">
          Unidades por Quinzena
        </h3>
        {dadosPorQuinzena.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Sem dados ainda.</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dadosPorQuinzena} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="periodo" tick={{ fontSize: 10, fill: '#9ca3af' }} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
              <Tooltip
                formatter={(v: number) => v.toLocaleString('pt-BR')}
                contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', fontSize: 12 }}
              />
              <Bar dataKey="unidades" fill="#1C22FF" radius={[6, 6, 0, 0]} name="Unidades" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Top colaboradores + distribuição de status */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-white border border-black/[0.06] p-5">
          <h3 className="text-sm font-sans font-semibold text-brand-dark/60 uppercase tracking-widest mb-4">
            Top Colaboradores
          </h3>
          {topColaboradores.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Sem dados ainda.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topColaboradores} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <YAxis type="category" dataKey="nome" tick={{ fontSize: 11, fill: '#374151' }} width={70} />
                <Tooltip
                  formatter={(v: number) => v.toLocaleString('pt-BR')}
                  contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', fontSize: 12 }}
                />
                <Bar dataKey="unidades" fill="#6366f1" radius={[0, 6, 6, 0]} name="Unidades" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-2xl bg-white border border-black/[0.06] p-5">
          <h3 className="text-sm font-sans font-semibold text-brand-dark/60 uppercase tracking-widest mb-4">
            Status dos Lançamentos
          </h3>
          {statusPieData.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Sem dados ainda.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={statusPieData}
                  cx="50%"
                  cy="45%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {statusPieData.map((_, i) => (
                    <Cell key={i} fill={CORES_STATUS[i % CORES_STATUS.length]} />
                  ))}
                </Pie>
                <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: 11, color: '#6b7280' }}>{v}</span>} />
                <Tooltip
                  formatter={(v: number) => v.toLocaleString('pt-BR')}
                  contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
