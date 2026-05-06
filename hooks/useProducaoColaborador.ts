'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ProductionEntry } from '@/types'

export function useProducaoColaborador(quinzenaId: string | undefined) {
  const [entries, setEntries] = useState<ProductionEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!quinzenaId) { setLoading(false); return }

    const supabase = createClient()

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setLoading(false); return }

      supabase
        .from('production_entries')
        .select('*')
        .eq('quinzena_id', quinzenaId)
        .eq('colaborador_id', user.id)
        .order('data_producao', { ascending: false })
        .then(({ data, error }) => {
          if (error) setError(new Error('Erro ao buscar produções'))
          else setEntries(data ?? [])
          setLoading(false)
        })
    })
  }, [quinzenaId])

  return { entries, loading, error }
}
