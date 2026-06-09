'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { UserPlus, X, Pencil } from 'lucide-react'
import type { User } from '@/types'

const createSchema = z.object({
  nome: z.string().min(2, 'Mínimo 2 caracteres'),
  email: z.string().email('Email inválido'),
  senha: z.string().min(6, 'Mínimo 6 caracteres'),
  funcao: z.enum(['pintor', 'ajudante'], { required_error: 'Selecione a função' }),
  pix_key: z.string().optional(),
})

const editSchema = z.object({
  nome: z.string().min(2, 'Mínimo 2 caracteres'),
  funcao: z.enum(['pintor', 'ajudante'], { required_error: 'Selecione a função' }),
  pix_key: z.string().optional(),
  nova_senha: z.string().optional(),
}).refine(
  (data) => !data.nova_senha || data.nova_senha.length >= 6,
  { message: 'Mínimo 6 caracteres', path: ['nova_senha'] }
)

type CreateData = z.infer<typeof createSchema>
type EditData = z.infer<typeof editSchema>
type ColaboradorListado = Pick<User, 'id' | 'nome' | 'funcao' | 'ativo'> & { pix_key?: string | null }

interface ColaboradoresConfigProps {
  colaboradoresIniciais: ColaboradorListado[]
}

const inputClass =
  'w-full rounded-xl border border-black/[0.08] bg-brand-cream px-4 py-3 text-sm font-sans text-brand-dark placeholder-brand-dark/25 focus:outline-none focus:ring-2 focus:ring-brand-blue/25 focus:border-brand-blue/50 transition-all'

const labelClass =
  'block text-[10px] font-sans font-semibold uppercase tracking-[0.1em] text-brand-dark/40 mb-1.5'

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0">
      <label className={labelClass}>{label}</label>
      {children}
      {error && <p className="text-xs font-sans text-red-500 mt-1">{error}</p>}
    </div>
  )
}

export function ColaboradoresConfig({ colaboradoresIniciais }: ColaboradoresConfigProps) {
  const [colaboradores, setColaboradores] = useState(colaboradoresIniciais)
  const [showForm, setShowForm] = useState(false)
  const [serverError, setServerError] = useState('')
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [editando, setEditando] = useState<ColaboradorListado | null>(null)
  const [editError, setEditError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } =
    useForm<CreateData>({ resolver: zodResolver(createSchema) })

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    formState: { errors: editErrors, isSubmitting: isEditSubmitting },
    reset: resetEdit,
  } = useForm<EditData>({ resolver: zodResolver(editSchema) })

  async function handleCreate(data: CreateData) {
    setServerError('')
    const res = await fetch('/api/colaboradores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      const json = await res.json()
      setServerError(typeof json.error === 'string' ? json.error : 'Erro ao cadastrar colaborador')
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

  function abrirEdicao(c: ColaboradorListado) {
    setEditando(c)
    setEditError('')
    resetEdit({
      nome: c.nome,
      funcao: c.funcao as 'pintor' | 'ajudante',
      pix_key: c.pix_key ?? '',
      nova_senha: '',
    })
  }

  async function handleEdit(data: EditData) {
    if (!editando) return
    setEditError('')

    const patchRes = await fetch(`/api/colaboradores/${editando.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: data.nome,
        funcao: data.funcao,
        pix_key: data.pix_key || null,
      }),
    })

    if (!patchRes.ok) {
      const json = await patchRes.json()
      setEditError(typeof json.error === 'string' ? json.error : 'Erro ao atualizar colaborador')
      return
    }

    if (data.nova_senha) {
      const senhaRes = await fetch(`/api/colaboradores/${editando.id}/reset-senha`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senha: data.nova_senha }),
      })
      if (!senhaRes.ok) {
        setEditError('Dados atualizados, mas erro ao redefinir senha.')
        return
      }
    }

    setColaboradores((prev) =>
      prev
        .map((c) =>
          c.id === editando.id
            ? { ...c, nome: data.nome, funcao: data.funcao, pix_key: data.pix_key || null }
            : c
        )
        .sort((a, b) => a.nome.localeCompare(b.nome))
    )
    setEditando(null)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display font-bold text-brand-dark text-base">Colaboradores</h3>
          <p className="text-xs font-sans text-brand-dark/40 mt-0.5">
            Gerencie os colaboradores da produção
          </p>
        </div>
        <button
          onClick={() => { setShowForm((v) => !v); setServerError('') }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-sans font-semibold transition-all ${
            showForm
              ? 'bg-black/5 text-brand-dark/60 hover:bg-black/8'
              : 'bg-brand-blue text-white hover:bg-brand-blue/90 shadow-sm shadow-brand-blue/20'
          }`}
        >
          {showForm ? <X size={14} /> : <UserPlus size={14} />}
          {showForm ? 'Cancelar' : 'Novo colaborador'}
        </button>
      </div>

      {/* Formulário de criação */}
      {showForm && (
        <div className="rounded-2xl border border-brand-blue/15 bg-brand-blue/[0.03] p-5 space-y-4">
          <p className="text-xs font-sans font-semibold uppercase tracking-widest text-brand-blue/60">
            Cadastrar novo colaborador
          </p>

          <form onSubmit={handleSubmit(handleCreate)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nome completo" error={errors.nome?.message}>
                <input placeholder="Ex: João Silva" {...register('nome')} className={inputClass} />
              </Field>

              <Field label="Função" error={errors.funcao?.message}>
                <select {...register('funcao')} className={inputClass}>
                  <option value="">Selecione</option>
                  <option value="pintor">Pintor</option>
                  <option value="ajudante">Ajudante</option>
                </select>
              </Field>

              <Field label="Email" error={errors.email?.message}>
                <input type="email" placeholder="email@exemplo.com" {...register('email')} className={inputClass} />
              </Field>

              <Field label="Senha inicial" error={errors.senha?.message}>
                <input type="password" placeholder="Mínimo 6 caracteres" {...register('senha')} className={inputClass} />
              </Field>

              <div className="sm:col-span-2">
                <Field label="Chave PIX (opcional)" error={undefined}>
                  <input placeholder="CPF, email ou telefone" {...register('pix_key')} className={inputClass} />
                </Field>
              </div>
            </div>

            {serverError && (
              <p className="text-sm font-sans text-red-600 bg-red-50 rounded-xl px-4 py-3 border border-red-100">
                {serverError}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto bg-brand-blue text-white font-sans font-semibold rounded-xl px-6 py-3 text-sm hover:bg-brand-blue/90 active:scale-[0.98] transition-all disabled:opacity-60 shadow-sm shadow-brand-blue/20"
            >
              {isSubmitting ? 'Cadastrando...' : 'Cadastrar colaborador'}
            </button>
          </form>
        </div>
      )}

      {/* Lista */}
      <div className="rounded-2xl border border-black/[0.06] bg-white overflow-hidden">
        {colaboradores.length === 0 ? (
          <div className="py-12 text-center space-y-1">
            <p className="font-sans font-medium text-brand-dark/35 text-sm">Nenhum colaborador cadastrado</p>
            <p className="text-xs font-sans text-brand-dark/25">Clique em &quot;Novo colaborador&quot; para adicionar.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/[0.05] bg-brand-cream/60">
                <th className="px-4 py-3 text-left text-[10px] font-sans font-semibold uppercase tracking-widest text-brand-dark/35">Nome</th>
                <th className="px-4 py-3 text-left text-[10px] font-sans font-semibold uppercase tracking-widest text-brand-dark/35">Função</th>
                <th className="px-4 py-3 text-left text-[10px] font-sans font-semibold uppercase tracking-widest text-brand-dark/35 hidden sm:table-cell">Chave PIX</th>
                <th className="px-4 py-3 text-left text-[10px] font-sans font-semibold uppercase tracking-widest text-brand-dark/35">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {colaboradores.map((c) => (
                <tr key={c.id} className="border-b border-black/[0.04] last:border-0 hover:bg-brand-cream/30 transition-colors">
                  <td className="px-4 py-3 font-sans font-semibold text-brand-dark">{c.nome}</td>
                  <td className="px-4 py-3 font-sans text-brand-dark/60 capitalize">{c.funcao}</td>
                  <td className="px-4 py-3 font-sans text-brand-dark/40 hidden sm:table-cell">{c.pix_key ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-sans font-semibold border ${
                      c.ativo
                        ? 'bg-green-50 text-green-700 border-green-200/60'
                        : 'bg-black/5 text-brand-dark/40 border-black/[0.06]'
                    }`}>
                      {c.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => abrirEdicao(c)}
                        className="text-xs font-sans font-semibold text-brand-blue hover:text-brand-blue/70 transition-colors flex items-center gap-1"
                      >
                        <Pencil size={11} />
                        Editar
                      </button>
                      <button
                        onClick={() => toggleAtivo(c.id, c.ativo)}
                        disabled={togglingId === c.id}
                        className={`text-xs font-sans font-semibold transition-colors disabled:opacity-40 ${
                          c.ativo
                            ? 'text-brand-dark/30 hover:text-red-500'
                            : 'text-brand-blue hover:text-brand-blue/70'
                        }`}
                      >
                        {c.ativo ? 'Desativar' : 'Ativar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal de edição */}
      {editando && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setEditando(null) }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-brand-dark text-base">Editar colaborador</h3>
                <p className="text-xs font-sans text-brand-dark/40 mt-0.5">{editando.nome}</p>
              </div>
              <button
                onClick={() => setEditando(null)}
                className="p-1.5 rounded-lg hover:bg-black/5 text-brand-dark/40 hover:text-brand-dark transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitEdit(handleEdit)} className="space-y-4">
              <Field label="Nome completo" error={editErrors.nome?.message}>
                <input {...registerEdit('nome')} className={inputClass} />
              </Field>

              <Field label="Função" error={editErrors.funcao?.message}>
                <select {...registerEdit('funcao')} className={inputClass}>
                  <option value="pintor">Pintor</option>
                  <option value="ajudante">Ajudante</option>
                </select>
              </Field>

              <Field label="Chave PIX" error={undefined}>
                <input
                  placeholder="CPF, email ou telefone"
                  {...registerEdit('pix_key')}
                  className={inputClass}
                />
              </Field>

              <div className="border-t border-black/[0.06] pt-4">
                <Field label="Nova senha (deixe em branco para não alterar)" error={editErrors.nova_senha?.message}>
                  <input
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    {...registerEdit('nova_senha')}
                    className={inputClass}
                  />
                </Field>
              </div>

              {editError && (
                <p className="text-sm font-sans text-red-600 bg-red-50 rounded-xl px-4 py-3 border border-red-100">
                  {editError}
                </p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setEditando(null)}
                  className="flex-1 rounded-xl border border-black/[0.08] bg-brand-cream px-4 py-2.5 text-sm font-sans font-semibold text-brand-dark/60 hover:bg-black/5 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isEditSubmitting}
                  className="flex-1 bg-brand-blue text-white font-sans font-semibold rounded-xl px-4 py-2.5 text-sm hover:bg-brand-blue/90 active:scale-[0.98] transition-all disabled:opacity-60"
                >
                  {isEditSubmitting ? 'Salvando...' : 'Salvar alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
