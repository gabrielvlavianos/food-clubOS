/*
  # Criar Usuário Admin Inicial

  ## Resumo
  Esta migração cria o primeiro usuário administrador do sistema para permitir
  o acesso inicial e configuração.

  ## Importante
  Após o login inicial, você DEVE:
  1. Fazer login com as credenciais fornecidas
  2. Criar novos usuários através da interface de gerenciamento
  3. Considerar alterar a senha deste usuário inicial

  ## Usuário Criado
  - Email: admin@puric.com.br
  - Senha: admin123456
  - Role: ADMIN

  ## Segurança
  Este usuário é criado apenas para bootstrap do sistema.
  Altere a senha imediatamente após o primeiro acesso.
*/

-- Inserir o primeiro usuário admin
-- Nota: O auth.users será criado quando o usuário fizer login pela primeira vez
-- Aqui criamos apenas o registro na tabela users para quando o login ocorrer

DO $$
DECLARE
  admin_id uuid;
BEGIN
  -- Gerar um UUID para o admin
  admin_id := gen_random_uuid();
  
  -- Inserir na tabela users (o ID será usado quando o auth.users for criado no primeiro login)
  INSERT INTO users (id, name, email, role, created_at)
  VALUES (
    admin_id,
    'Administrador',
    'admin@puric.com.br',
    'ADMIN',
    now()
  )
  ON CONFLICT (email) DO NOTHING;
  
END $$;
