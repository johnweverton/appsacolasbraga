-- Permite lançamento único com as duas funções (pintor + ajudante) quando o
-- colaborador trabalha sozinho, sem precisar de dois registros separados.
--
-- Contexto: com menos gente na equipe, um colaborador às vezes pinta E
-- estende sozinho no mesmo trabalho. Lançar duas vezes (uma como pintor,
-- outra como ajudante) tinha risco de esquecer de trocar a função e
-- duplicar o registro por engano. Agora um único lançamento com
-- funcao = 'ambos' já soma a produção nas duas funções automaticamente
-- (ver lib/calculos.ts: calcularPayouts).

ALTER TABLE public.production_entries
  DROP CONSTRAINT IF EXISTS production_entries_funcao_check;

ALTER TABLE public.production_entries
  ADD CONSTRAINT production_entries_funcao_check
  CHECK (funcao IN ('pintor', 'ajudante', 'ambos'));

-- 'ambos' só faz sentido em lançamento solo (parceiro = o próprio colaborador),
-- garante a integridade independentemente da camada de aplicação.
ALTER TABLE public.production_entries
  DROP CONSTRAINT IF EXISTS production_entries_ambos_requer_solo;

ALTER TABLE public.production_entries
  ADD CONSTRAINT production_entries_ambos_requer_solo
  CHECK (funcao != 'ambos' OR parceiro_id = colaborador_id);
