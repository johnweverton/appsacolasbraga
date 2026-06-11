'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { calcularValorProducao } from '@/lib/calculos'

export interface MetricasQuinzena {
  totalUnidades: number
  valorEstimado: number
  diasAtePagamento: number
  loading: boolean
}

export function useMetricasQuinzena(quinzenaId: string | undefined): MetricasQuinzena & { refresh: () => void } {
  const [totalUnidades, setTotalUnidades] = useState(0)
  const [valorEstimado, setValorEstimado] = useState(0)
  const [diasAtePagamento, setDiasAtePagamento] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!quinzenaId) { setLoading(false); return }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const [{ data: entries }, { data: profile }, { data: quinzena }] = await Promise.all([
      supabase
        .from('production_entries')
        .select('quantidade, cores')
        .eq('quinzena_id', quinzenaId)
        .eq('colaborador_id', user.id),
      supabase
        .from('users')
        .select('funcao')
        .eq('id', user.id)
        .single(),
      supabase
        .from('pay_periods')
        .select('data_pagamento')
        .eq('id', quinzenaId)
        .single(),
    ])

    // Cada cor exige uma passada de impressão separada: unidade efetiva = quantidade × cores
    const total = (entries ?? []).reduce((s, e) => s + e.quantidade * e.cores, 0)
    setTotalUnidades(total)

    if (profile?.funcao) {
      const { data: rate } = await supabase
        .from('payment_rates')
        .select('valor_unitario')
        .eq('funcao', profile.funcao)
        .is('vigencia_fim', null)
        .order('vigencia_inicio', { ascending: false })
        .limit(1)
        .single()

      const valorUnit = rate?.valor_unitario ?? 0
      setValorEstimado(calcularValorProducao(total, valorUnit))
    }

    if (quinzena?.data_pagamento) {
      const diff = new Date(quinzena.data_pagamento).getTime() - Date.now()
      setDiasAtePagamento(Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24))))
    }

    setLoading(false)
  }, [quinzenaId])

  useEffect(() => { fetch() }, [fetch])

  return { totalUnidades, valorEstimado, diasAtePagamento, loading, refresh: fetch }
}
