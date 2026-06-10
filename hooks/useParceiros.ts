'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@/types'

export function useParceiros() {
  const [parceiros, setParceiros] = useState<Pick<User, 'id' | 'nome'>[]>([])

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return

      // Lista todos os colaboradores ativos (exceto o próprio)
      const { data } = await supabase
        .from('users')
        .select('id, nome')
        .eq('ativo', true)
        .neq('id', user.id)
        .in('funcao', ['pintor', 'ajudante'])
        .order('nome')

      setParceiros(data ?? [])
    })
  }, [])

  return parceiros
}
