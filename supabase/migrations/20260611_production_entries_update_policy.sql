-- Corrige bug: colaborador edita um lançamento pendente e recebe
-- "Erro ao atualizar lançamento" — nada é salvo.
--
-- Causa raiz: a tabela production_entries tem GRANT UPDATE para
-- authenticated, mas nenhuma policy de RLS com FOR UPDATE/ALL cobre o
-- colaborador comum (só existe "production_entries: admin acesso total",
-- que exige is_admin()). O update da API faz `.select().single()` e, com
-- 0 linhas afetadas pelo RLS, retorna erro -> "Erro ao atualizar lançamento".

CREATE POLICY "production_entries: colaborador atualiza proprio pendente"
  ON public.production_entries FOR UPDATE TO authenticated
  USING (
    (auth.uid() = colaborador_id AND status = 'pendente')
    OR (auth.uid() = parceiro_id AND status = 'pendente')
  )
  WITH CHECK (
    auth.uid() = colaborador_id OR auth.uid() = parceiro_id
  );
