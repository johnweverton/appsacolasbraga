-- Corrige o histórico do colaborador, que mostrava a quinzena como "Pendente"
-- com 0 unidades e sem valor mesmo após o fechamento e o pagamento.
--
-- Causa raiz: a tabela payouts só tinha a policy "payouts: admin acesso total"
-- (FOR ALL, is_admin()). Não havia policy de SELECT para o colaborador comum,
-- então o hook useQuinzenasFechadas (cliente sob RLS) recebia 0 payouts e o
-- card caía no estado padrão (payout=null → Pendente, unidades 0, valor —).
--
-- Os dados já estavam corretos no banco (total_unidades, valor_total, status);
-- era apenas falta de permissão de leitura.

CREATE POLICY "payouts: colaborador le proprio"
  ON public.payouts FOR SELECT TO authenticated
  USING (auth.uid() = colaborador_id);
