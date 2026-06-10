'use client'

import { useState } from 'react'
import { X, Trash2, Save } from 'lucide-react'
import type { EntryComParceiro } from '@/hooks/useProducaoColaborador'

interface ModalEditarLancamentoProps {
  entry: EntryComParceiro
  parceiros: { id: string; nome: string }[]
  onClose: () => void
  onSaved: (updated: EntryComParceiro) => void
  onDeleted: (id: string) => void
}

const inputClass =
  'w-full rounded-xl border border-black/[0.08] bg-brand-cream px-4 py-3 text-sm font-sans text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-blue/25 focus:border-brand-blue/50 transition-all'

export function ModalEditarLancamento({ entry, parceiros, onClose, onSaved, onDeleted }: ModalEditarLancamentoProps) {
  const [form, setForm] = useState({
    data_producao: entry.data_producao,
    funcao: (entry.funcao ?? 'pintor') as 'pintor' | 'ajudante',
    parceiro_id: entry.parceiro_id,
    marca: entry.marca,
    tamanho: entry.tamanho,
    cores: entry.cores,
    quantidade: entry.quantidade,
  })

  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [erro, setErro] = useState('')

  // Garante que o parceiro atual do lançamento apareça nas opções,
  // mesmo que tenha sido desativado depois do registro.
  const opcoesParceiros = parceiros.some((p) => p.id === entry.parceiro_id)
    ? parceiros
    : [{ id: entry.parceiro_id, nome: entry.nome_parceiro ?? '—' }, ...parceiros]

  function set(field: string, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErro('')
  }

  async function handleSalvar() {
    setSaving(true)
    setErro('')
    try {
      const res = await fetch(`/api/producao/${entry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          cores: Number(form.cores),
          quantidade: Number(form.quantidade),
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setErro(typeof json.error === 'string' ? json.error : 'Erro ao salvar.')
        return
      }
      onSaved({ ...entry, ...json })
      onClose()
    } catch {
      setErro('Erro de conexão. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  async function handleExcluir() {
    setDeleting(true)
    setErro('')
    try {
      const res = await fetch(`/api/producao/${entry.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json()
        setErro(typeof json.error === 'string' ? json.error : 'Erro ao excluir.')
        setConfirmDelete(false)
        return
      }
      onDeleted(entry.id)
      onClose()
    } catch {
      setErro('Erro de conexão. Tente novamente.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-brand-dark text-lg">Editar Lançamento</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-black/[0.05] transition-colors">
            <X size={18} className="text-brand-dark/40" />
          </button>
        </div>

        {/* Campos */}
        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-sans font-semibold uppercase tracking-widest text-brand-dark/40 mb-1">
              Parceiro
            </label>
            <select
              value={form.parceiro_id}
              onChange={(e) => set('parceiro_id', e.target.value)}
              className={inputClass}
            >
              {opcoesParceiros.map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-sans font-semibold uppercase tracking-widest text-brand-dark/40 mb-1">
              Data
            </label>
            <input
              type="date"
              value={form.data_producao}
              onChange={(e) => set('data_producao', e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-[10px] font-sans font-semibold uppercase tracking-widest text-brand-dark/40 mb-1">
              Função
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['pintor', 'ajudante'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => set('funcao', f)}
                  className={`py-2.5 rounded-xl border text-sm font-sans font-semibold capitalize transition-all ${
                    form.funcao === f
                      ? 'bg-brand-blue border-brand-blue text-white'
                      : 'bg-brand-cream border-black/[0.08] text-brand-dark/60'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-sans font-semibold uppercase tracking-widest text-brand-dark/40 mb-1">
                Marca
              </label>
              <input
                type="text"
                value={form.marca}
                onChange={(e) => set('marca', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-[10px] font-sans font-semibold uppercase tracking-widest text-brand-dark/40 mb-1">
                Tamanho
              </label>
              <input
                type="text"
                value={form.tamanho}
                onChange={(e) => set('tamanho', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-sans font-semibold uppercase tracking-widest text-brand-dark/40 mb-1">
                Cores
              </label>
              <input
                type="number"
                min={1}
                value={form.cores}
                onChange={(e) => set('cores', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-[10px] font-sans font-semibold uppercase tracking-widest text-brand-dark/40 mb-1">
                Quantidade
              </label>
              <input
                type="number"
                min={1}
                value={form.quantidade}
                onChange={(e) => set('quantidade', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {erro && (
          <p className="text-xs font-sans text-red-500 bg-red-50 rounded-xl px-3 py-2">{erro}</p>
        )}

        {/* Botões */}
        <button
          onClick={handleSalvar}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-blue text-white text-sm font-sans font-semibold hover:bg-brand-blue/90 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          <Save size={15} />
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </button>

        {/* Excluir */}
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-200 text-red-600 text-sm font-sans font-medium hover:bg-red-50 active:scale-[0.98] transition-all"
          >
            <Trash2 size={14} />
            Excluir Lançamento
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmDelete(false)}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-500 text-sm font-sans font-medium hover:bg-gray-50 transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={handleExcluir}
              disabled={deleting}
              className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-sans font-semibold hover:bg-red-700 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {deleting ? 'Excluindo...' : 'Confirmar Exclusão'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
