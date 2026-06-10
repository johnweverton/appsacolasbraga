import { createClient } from '@/lib/supabase/server'

export async function logAudit(
  acao: string,
  opcoes: {
    usuarioId?: string
    tabela?: string
    registroId?: string
    payload?: Record<string, unknown>
  } = {}
) {
  try {
    const supabase = createClient()
    await supabase.from('audit_logs').insert({
      usuario_id: opcoes.usuarioId ?? null,
      acao,
      tabela: opcoes.tabela ?? null,
      registro_id: opcoes.registroId ?? null,
      payload: opcoes.payload ?? null,
    })
  } catch {
    // Falha no log não bloqueia a operação principal
  }
}
