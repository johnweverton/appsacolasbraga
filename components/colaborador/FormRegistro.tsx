'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useEffect } from 'react'

const TURNOS = [
  { value: 'unico',  label: 'Único',  desc: 'Mesmo parceiro o dia todo' },
  { value: 'manha',  label: 'Manhã',  desc: 'Turno da manhã' },
  { value: 'tarde',  label: 'Tarde',  desc: 'Turno da tarde' },
] as const

const FUNCOES = [
  { value: 'pintor',   label: 'Pintor',   desc: 'Costura/pintura' },
  { value: 'ajudante', label: 'Ajudante', desc: 'Auxiliar' },
] as const

const FUNCAO_AMBOS = { value: 'ambos', label: 'Pintor + Ajudante', desc: 'Sozinho, fiz as duas' } as const

const schema = z.object({
  data_producao: z.string().min(1, 'Data é obrigatória'),
  turno: z.enum(['unico', 'manha', 'tarde']),
  funcao: z.enum(['pintor', 'ajudante', 'ambos']),
  marca: z.string().min(1, 'Marca é obrigatória'),
  tamanho: z.string().min(1, 'Tamanho é obrigatório'),
  cores: z.coerce.number().int().min(1, 'Mínimo 1 cor'),
  quantidade: z.coerce.number().int().min(1, 'Quantidade deve ser maior que 0'),
  parceiro_id: z.string().min(1, 'Selecione um parceiro'),
})

type FormData = z.infer<typeof schema>

interface FormRegistroProps {
  parceiros: { id: string; nome: string }[]
  userId: string
  defaultFuncao?: 'pintor' | 'ajudante'
  onSubmit: (data: FormData) => Promise<void>
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-sans font-semibold uppercase tracking-[0.1em] text-brand-dark/40">
        {label}
      </label>
      {children}
      {error && <p className="text-xs font-sans text-red-500">{error}</p>}
    </div>
  )
}

const inputClass = 'w-full min-w-0 appearance-none rounded-xl border border-black/[0.08] bg-brand-cream px-4 py-3 text-sm font-sans text-brand-dark placeholder-brand-dark/25 focus:outline-none focus:ring-2 focus:ring-brand-blue/25 focus:border-brand-blue/50 transition-all'

export function FormRegistro({ parceiros, userId, defaultFuncao = 'pintor', onSubmit }: FormRegistroProps) {
  const today = new Date().toISOString().split('T')[0]

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting }, reset } =
    useForm<FormData>({
      resolver: zodResolver(schema),
      defaultValues: { data_producao: today, turno: 'unico', funcao: defaultFuncao, parceiro_id: '', cores: 1 },
    })

  const turnoAtual = watch('turno')
  const funcaoAtual = watch('funcao')
  const parceiroAtual = watch('parceiro_id')
  const trabalhandoSozinho = parceiroAtual === userId

  // "Pintor + Ajudante" só existe para lançamento solo. Se o colaborador
  // trocar de parceiro depois de já ter marcado essa opção, volta para a
  // função padrão em vez de manter uma combinação inválida.
  useEffect(() => {
    if (funcaoAtual === 'ambos' && !trabalhandoSozinho) {
      setValue('funcao', defaultFuncao, { shouldValidate: true })
    }
  }, [trabalhandoSozinho, funcaoAtual, defaultFuncao, setValue])

  const opcoesFuncao = trabalhandoSozinho ? [...FUNCOES, FUNCAO_AMBOS] : FUNCOES

  async function handleFormSubmit(data: FormData) {
    await onSubmit(data)
    reset({ data_producao: today, turno: 'unico', funcao: defaultFuncao, parceiro_id: '', cores: 1 })
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">

      <Field label="Data" error={errors.data_producao?.message}>
        <input type="date" {...register('data_producao')} className={inputClass} />
      </Field>

      {/* Seletor de turno — botões segmentados */}
      <Field label="Turno" error={errors.turno?.message}>
        <div className="grid grid-cols-3 gap-2">
          {TURNOS.map(({ value, label, desc }) => {
            const ativo = turnoAtual === value
            return (
              <button
                key={value}
                type="button"
                onClick={() => setValue('turno', value, { shouldValidate: true })}
                className={`flex flex-col items-center py-3 px-2 rounded-xl border transition-all ${
                  ativo
                    ? 'bg-brand-blue border-brand-blue text-white'
                    : 'bg-brand-cream border-black/[0.08] text-brand-dark/60 hover:border-brand-dark/20'
                }`}
              >
                <span className={`text-sm font-sans font-bold leading-none ${ativo ? 'text-white' : 'text-brand-dark'}`}>
                  {label}
                </span>
                <span className={`text-[9px] font-sans mt-1 text-center leading-tight ${ativo ? 'text-white/70' : 'text-brand-dark/35'}`}>
                  {desc}
                </span>
              </button>
            )
          })}
        </div>
        <input type="hidden" {...register('turno')} />
      </Field>

      <Field label="Parceiro" error={errors.parceiro_id?.message}>
        <select {...register('parceiro_id')} className={inputClass}>
          <option value="">Selecione o parceiro</option>
          {parceiros.map((p) => (
            <option key={p.id} value={p.id}>{p.nome}</option>
          ))}
        </select>
      </Field>

      {/* Seletor de função — botões segmentados. "Pintor + Ajudante" só
          aparece quando o parceiro selecionado é o próprio colaborador. */}
      <Field label="Função neste turno" error={errors.funcao?.message}>
        <div className={`grid gap-2 ${opcoesFuncao.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
          {opcoesFuncao.map(({ value, label, desc }) => {
            const ativo = funcaoAtual === value
            return (
              <button
                key={value}
                type="button"
                onClick={() => setValue('funcao', value, { shouldValidate: true })}
                className={`flex flex-col items-center py-3 px-2 rounded-xl border transition-all ${
                  ativo
                    ? 'bg-brand-blue border-brand-blue text-white'
                    : 'bg-brand-cream border-black/[0.08] text-brand-dark/60 hover:border-brand-dark/20'
                }`}
              >
                <span className={`text-sm font-sans font-bold leading-none ${ativo ? 'text-white' : 'text-brand-dark'}`}>
                  {label}
                </span>
                <span className={`text-[9px] font-sans mt-1 text-center leading-tight ${ativo ? 'text-white/70' : 'text-brand-dark/35'}`}>
                  {desc}
                </span>
              </button>
            )
          })}
        </div>
        <input type="hidden" {...register('funcao')} />
        {trabalhandoSozinho && (
          <p className="text-[10px] font-sans text-brand-dark/35 leading-snug">
            Fez as duas funções sozinho? Escolha &quot;Pintor + Ajudante&quot; e o pagamento das duas é calculado neste único lançamento.
          </p>
        )}
      </Field>

      <Field label="Marca" error={errors.marca?.message}>
        <input placeholder="Ex: Hering" {...register('marca')} className={inputClass} />
      </Field>

      <Field label="Tamanho" error={errors.tamanho?.message}>
        <input placeholder="Ex: 30x45" {...register('tamanho')} className={inputClass} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Cores" error={errors.cores?.message}>
          <input type="number" min={1} {...register('cores')} className={inputClass} />
        </Field>
        <Field label="Quantidade" error={errors.quantidade?.message}>
          <input type="number" min={1} placeholder="0" {...register('quantidade')} className={inputClass} />
        </Field>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-brand-blue text-white font-sans font-semibold rounded-xl py-3.5 text-sm hover:bg-brand-blue/90 active:scale-[0.98] transition-all disabled:opacity-60 shadow-md shadow-brand-blue/15 mt-2"
      >
        {isSubmitting ? 'Salvando...' : 'Registrar Produção'}
      </button>
    </form>
  )
}
