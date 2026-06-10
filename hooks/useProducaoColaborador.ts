'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ProductionEntry } from '@/types'

export type EntryComParceiro = ProductionEntry & { nome_parceiro?: string }

export function useProducaoColaborador(quinzenaId: string | undefined) {
  const [entries, setEntries] = useState<EntryComParceiro[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!quinzenaId) { setLoading(false); return }

    const supabase = createClient()

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setLoading(false); return }

      supabase
        .from('production_entries')
        .select('*, parceiro:users!parceiro_id(nome)')
        .eq('quinzena_id', quinzenaId)
        .eq('colaborador_id', user.id)
        .order('data_producao', { ascending: false })
        .then(({ data, error }) => {
          if (error) setError(new Error('Erro ao buscar produções'))
          else {
            const mapped = (data ?? []).map((e) => ({
              ...(e as ProductionEntry),
              nome_parceiro: (e as { parceiro?: { nome: string } | null }).parceiro?.nome,
            }))
            setEntries(mapped)
          }
          setLoading(false)
        })
    })
  }, [quinzenaId])

  function removeEntry(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }

  function updateEntry(updated: EntryComParceiro) {
    setEntries((prev) => prev.map((e) => (e.id === updated.id ? { ...e, ...updated } : e)))
  }

  return { entries, loading, error, removeEntry, updateEntry }
}
