-- Script para DELETAR TODAS as empresas e dados relacionados
-- CUIDADO: Isso vai apagar TUDO!

BEGIN;

-- Removendo ALTER SEQUENCE pois as tabelas usam UUID, não sequências numéricas

-- Deletar todas as dívidas
DELETE FROM debts;

-- Deletar todos os clientes
DELETE FROM customers;

-- Deletar todos os perfis de empresas (mantém apenas super admins)
DELETE FROM profiles WHERE role != 'super_admin';

-- Deletar todas as empresas
DELETE FROM companies;

-- Mostrar resultado
SELECT 
  'Todas as empresas, clientes e dívidas foram deletados!' as resultado,
  (SELECT COUNT(*) FROM companies) as empresas_restantes,
  (SELECT COUNT(*) FROM customers) as clientes_restantes,
  (SELECT COUNT(*) FROM debts) as dividas_restantes;

COMMIT;
