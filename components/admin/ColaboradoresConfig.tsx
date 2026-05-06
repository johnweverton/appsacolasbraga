'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { User } from '@/types'

const schema = z.object({
  nome: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  senha: z.string().min(6, 'Senha deve ter ao menos 6 caracteres'),
  funcao: z.enum(['pintor', 'ajudante'], { required_error: 'Selecione a função' }),
  pix_key: z.string().optional(),
})

type FormData = z.infer<typeof schema>

type ColaboradorListado = Pick<User, 'id' | 'nome' | 'funcao' | 'ativo'> & { pix_key?: string | null }

interface ColaboradoresConfigProps {
  colaboradoresIniciais: ColaboradorListado[]
}

export function ColaboradoresConfig({ colaboradoresIniciais }: ColaboradoresConfigProps) {
  const [colaboradores, setColaboradores] = useState(colaboradoresIniciais)
  const [showForm, setShowForm] = useState(false)
  const [serverError, setServerError] = useState('')
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } =
    useForm<FormData>({ resolver: zodResolver(schema) })

  async function handleCreate(data: FormData) {
    setServerError('')
    const res = await fetch('/api/colaboradores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      const json = await res.json()
      setServerError(json.error ?? 'Erro ao cadastrar colaborador')
      return
    }

    const novo = await res.json()
    setColaboradores((prev) => [...prev, novo].sort((a, b) => a.nome.localeCompare(b.nome)))
    reset()
    setShowForm(false)
  }

  async function toggleAtivo(id: string, ativo: boolean) {
    setTogglingId(id)
    const res = await fetch(`/api/colaboradores/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativo: !ativo }),
    })
    if (res.ok) {
      setColaboradores((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ativo: !ativo } : c))
      )
    }
    setTogglingId(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-700">Colaboradores</h3>
        <Button size="sm" onClick={() => { setShowForm((v) => !v); setServerError('') }}>
          {showForm ? 'Cancelar' : '+ Novo'}
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit(handleCreate)}
          className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3"
        >
          <p className="text-sm font-medium text-blue-700">Novo colaborador</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nome</label>
              <Input placeholder="Nome completo" {...register('nome')} />
              {errors.nome && <p className="text-red-500 text-xs mt-1">{errors.nome.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Função</label>
              <select
                {...register('funcao')}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Selecione</option>
                <option value="pintor">Pintor</option>
                <option value="ajudante">Ajudante</option>
              </select>
              {errors.funcao && <p className="text-red-500 text-xs mt-1">{errors.funcao.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <Input type="email" placeholder="email@exemplo.com" {...register('email')} />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Senha inicial</label>
              <Input type="password" placeholder="Mín. 6 caracteres" {...register('senha')} />
              {errors.senha && <p className="text-red-500 text-xs mt-1">{errors.senha.message}</p>}
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Chave PIX (opcional)</label>
              <Input placeholder="CPF, email ou telefone" {...register('pix_key')} />
            </div>
          </div>

          {serverError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {serverError}
            </p>
          )}

          <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
            {isSubmitting ? 'Cadastrando...' : 'Cadastrar'}
          </Button>
        </form>
      )}

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-500">
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Função</th>
              <th className="px-4 py-3">Chave PIX</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {colaboradores.map((c) => (
              <tr key={c.id} className="border-b border-gray-100 last:border-0">
                <td className="px-4 py-3 font-medium text-gray-800">{c.nome}</td>
                <td className="px-4 py-3 capitalize text-gray-600">{c.funcao}</td>
                <td className="px-4 py-3 text-gray-500">{c.pix_key ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    c.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {c.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => toggleAtivo(c.id, c.ativo)}
                    disabled={togglingId === c.id}
                    className="text-xs text-blue-600 hover:underline disabled:opacity-50"
                  >
                    {c.ativo ? 'Desativar' : 'Ativar'}
                  </button>
                </td>
              </tr>
            ))}
            {colaboradores.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  Nenhum colaborador cadastrado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
