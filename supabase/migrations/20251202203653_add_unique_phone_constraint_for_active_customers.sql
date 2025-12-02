/*
  # Adicionar constraint de telefone único para clientes ativos

  1. Mudanças
    - Cria um índice único parcial no campo `phone` da tabela `customers`
    - O índice garante que não pode haver telefones duplicados para clientes ATIVOS
    - Clientes com status 'pending_approval' ou 'inactive' podem ter telefones duplicados temporariamente
    
  2. Segurança
    - Garante integridade dos dados no nível do banco de dados
    - Previne duplicatas mesmo se houver erro no frontend
    - Permite que o mesmo telefone seja usado para múltiplos cadastros pendentes (será tratado manualmente)

  3. Observações
    - Esta constraint NÃO afeta registros existentes
    - Caso existam duplicatas, elas precisam ser resolvidas manualmente antes que esta migration seja aplicada
*/

-- Criar índice único parcial para telefones de clientes ativos
-- Isso garante que não pode haver 2 clientes ativos com o mesmo telefone
CREATE UNIQUE INDEX IF NOT EXISTS unique_phone_for_active_customers 
ON customers (phone) 
WHERE status = 'active' AND is_active = true;
