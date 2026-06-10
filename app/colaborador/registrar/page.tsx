'use client'

import { createClient } from '@/lib/supabase/client'
import { FormRegistro } from '@/components/colaborador/FormRegistro'
import { BannerMetricas } from '@/components/colaborador/BannerMetricas'
import { useQuinzenaAtiva } from '@/hooks/useQuinzenaAtiva'
import { useMetricasQuinzena } from '@/hooks/useMetricasQuinzena'
import { useParceiros } from '@/hooks/useParceiros'
import { Toast } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { useState, useEffect } from 'react'

export default function RegistrarProducao() {
  const { quinzena } = useQuinzenaAtiva()
  const metricas = useMetricasQuinzena(quinzena?.id)
  const parceiros = useParceiros()
  const [defaultFuncao, setDefaultFuncao] = useState<'pintor' | 'ajudante'>('pintor')
  const { toast, showToast, hideToast } = useToast()

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return

      const { data: profile } = await supabase
        .from('users')
        .select('funcao')
        .eq('id', user.id)
        .single()

      if (profile?.funcao === 'pintor' || profile?.funcao === 'ajudante') {
        setDefaultFuncao(profile.funcao)
      }
    })
  }, [])

  async function handleSubmit(data: {
    data_producao: string
    turno: 'unico' | 'manha' | 'tarde'
    funcao: 'pintor' | 'ajudante'
    marca: string
    tamanho: string
    cores: number
    quantidade: number
    parceiro_id: string
  }) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !quinzena) throw new Error('Sessão ou quinzena inválida')

    const { error } = await supabase.from('production_entries').insert({
      quinzena_id: quinzena.id,
      colaborador_id: user.id,
      ...data,
      status: 'pendente',
    })

    if (error) throw error

    showToast(`${data.quantidade} unidades registradas!`, 'success')
    metricas.refresh()
  }

  return (
    <div className="space-y-5">
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}

      <BannerMetricas {...metricas} />

      {quinzena ? (
        <FormRegistro parceiros={parceiros} defaultFuncao={defaultFuncao} onSubmit={handleSubmit} />
      ) : (
        <div className="rounded-3xl border border-dashed border-brand-dark/15 bg-brand-dark/[0.02] py-12 text-center">
          <p className="text-sm font-sans font-medium text-brand-dark/40">
            Nenhuma quinzena aberta no momento
          </p>
        </div>
      )}
    </div>
  )
}
