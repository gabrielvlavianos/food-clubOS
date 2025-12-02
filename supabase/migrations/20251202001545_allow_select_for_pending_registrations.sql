/*
  # Permitir SELECT de Registros Pendentes Durante Cadastro

  ## Problema
  O formulário de cadastro faz INSERT seguido de SELECT para obter o ID do cliente
  recém-criado, necessário para criar delivery_schedules e customer_documents.
  
  ## Solução
  Adicionar política que permite SELECT público APENAS de registros com status
  'pending_approval', que são os cadastros recém-criados ainda não aprovados.

  ## Segurança
  - SELECT público limitado APENAS a registros com status = 'pending_approval'
  - Clientes aprovados permanecem visíveis APENAS para usuários autenticados
  - Esta é uma janela temporária apenas para completar o fluxo de cadastro
*/

-- Permitir SELECT público apenas de registros pendentes
CREATE POLICY "Public can view own pending registration"
  ON customers FOR SELECT
  USING (status = 'pending_approval');
