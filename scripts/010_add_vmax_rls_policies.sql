-- Adicionar políticas RLS para a tabela VMAX
-- Permite que usuários vejam apenas os clientes da sua empresa

-- Política para SELECT: usuários veem apenas clientes da sua empresa
CREATE POLICY "users_can_view_own_company_vmax"
ON public."VMAX"
FOR SELECT
TO authenticated
USING (
  id_company IN (
    SELECT company_id 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
);

-- Política para service role ter acesso total
CREATE POLICY "service_role_vmax_all"
ON public."VMAX"
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
