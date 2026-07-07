'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { obterQuinzenaAtivaColaborador } from '@/app/actions/quinzena'
import type { PayPeriod } from '@/types'

export function useQuinzenaAtiva() {
  const [quinzena, setQuinzena] = useState<PayPeriod | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(async ({ data: { user }, error: err }) => {
      if (err || !user) {
        setError(new Error('Erro ao buscar quinzena ativa'))
        setLoading(false)
        return
      }

      // Prioriza uma quinzena fechada onde o colaborador ainda está pendente
      // (produção não fechada); caso contrário, usa a quinzena global aberta.
      const ativa = await obterQuinzenaAtivaColaborador(user.id)
      setQuinzena(ativa)
      setLoading(false)
    })
  }, [])

  return { quinzena, loading, error }
}
