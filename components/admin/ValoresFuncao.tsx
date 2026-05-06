'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { formatarMoeda } from '@/lib/calculos'

interface Taxa {
  id: string
  funcao: 'pintor' | 'ajudante'
  valor_unitario: number
  vigencia_inicio: string
}

interface ValoresFuncaoProps {
  taxasIniciais: Taxa[]
}

const FUNCOES: { key: 'pintor' | 'ajudante'; label: string }[] = [
  { key: 'pintor', label: 'Pintor' },
  { key: 'ajudante', label: 'Ajudante' },
]

export function ValoresFuncao({ taxasIniciais }: ValoresFuncaoProps) {
  const [taxas, setTaxas] = useState(taxasIniciais)
  const [editando, setEditando] = useState<'pintor' | 'ajudante' | null>(null)
  const [novoValor, setNovoValor] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  function taxaAtual(funcao: 'pintor' | 'ajudante') {
    return taxas.find((t) => t.funcao === funcao)
  }

  function iniciarEdicao(funcao: 'pintor' | 'ajudante') {
    const atual = taxaAtual(funcao)
    setNovoValor(atual ? String(atual.valor_unitario) : '')
    setErro('')
    setEditando(funcao)
  }

  async function salvar(funcao: 'pintor' | 'ajudante') {
    const valor = parseFloat(novoValor.replace(',', '.'))
    if (isNaN(valor) || valor <= 0) {
      setErro('Informe um valor válido maior que zero.')
      return
    }

    setLoading(true)
    setErro('')

    const res = await fetch('/api/taxas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ funcao, valor_unitario: valor }),
    })

    const json = await res.json()

    if (!res.ok) {
      setErro(json.error ?? 'Erro ao salvar.')
      setLoading(false)
      return
    }

    setTaxas((prev) => [
      ...prev.filter((t) => t.funcao !== funcao),
      json as Taxa,
    ])
    setEditando(null)
    setLoading(false)
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
      <h3 className="font-medium text-gray-700">Valores por Função</h3>
      <div className="space-y-3">
        {FUNCOES.map(({ key, label }) => {
          const taxa = taxaAtual(key)
          const emEdicao = editando === key

          return (
            <div key={key} className="flex items-center justify-between gap-4 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-gray-800">{label}</p>
                <p className="text-xs text-gray-500">
                  {taxa
                    ? `${formatarMoeda(taxa.valor_unitario)} / unidade · desde ${taxa.vigencia_inicio}`
                    : 'Sem taxa cadastrada'}
                </p>
              </div>

              {emEdicao ? (
                <div className="flex items-center gap-2">
                  <Input
                    className="w-28 text-sm"
                    placeholder="0,00"
                    value={novoValor}
                    onChange={(e) => setNovoValor(e.target.value)}
                    autoFocus
                  />
                  <Button size="sm" disabled={loading} onClick={() => salvar(key)}>
                    {loading ? '...' : 'Salvar'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditando(null)}>
                    Cancelar
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="outline" onClick={() => iniciarEdicao(key)}>
                  {taxa ? 'Alterar' : 'Definir'}
                </Button>
              )}
            </div>
          )
        })}
      </div>
      {erro && <p className="text-sm text-red-600 bg-red-50 rounded p-2">{erro}</p>}
    </div>
  )
}
