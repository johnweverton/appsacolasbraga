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

      // Lista todos os colaboradores ativos, incluindo o próprio usuário: com
      // menos gente na equipe, às vezes ele faz o trabalho sozinho (pintor +
      // ajudante) e precisa poder se selecionar como "parceiro" do lançamento.
      const { data } = await supabase
        .from('users')
        .select('id, nome')
        .eq('ativo', true)
        .in('funcao', ['pintor', 'ajudante'])
        .order('nome')

      const lista = (data ?? []).map((p) =>
        p.id === user.id ? { ...p, nome: 'Sozinho (sem parceiro)' } : p
      )

      // Garante a opção "sozinho" mesmo se o próprio usuário não estiver
      // na lista de ativos por algum motivo (ex.: query falhou parcialmente).
      if (!lista.some((p) => p.id === user.id)) {
        lista.unshift({ id: user.id, nome: 'Sozinho (sem parceiro)' })
      }

      setParceiros(lista)
    })
  }, [])

  return parceiros
}
