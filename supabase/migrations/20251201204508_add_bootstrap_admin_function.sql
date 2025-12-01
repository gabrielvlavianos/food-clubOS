/*
  # Função de Bootstrap para Primeiro Admin

  ## Resumo
  Esta migração cria uma função SQL que permite inserir o primeiro usuário admin
  contornando temporariamente as políticas RLS, apenas para o bootstrap inicial.

  ## Segurança
  Esta função é necessária apenas para criar o primeiro admin, pois não há
  nenhum admin existente para autorizar a criação inicial.
  
  ## Uso
  Será chamada automaticamente pelo script de bootstrap.
*/

-- Criar função para bootstrap do primeiro admin
CREATE OR REPLACE FUNCTION bootstrap_admin_user(
  user_id uuid,
  user_email text,
  user_name text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO users (id, name, email, role, created_at)
  VALUES (user_id, user_name, user_email, 'ADMIN', now())
  ON CONFLICT (id) DO UPDATE
  SET role = 'ADMIN', name = user_name;
END;
$$;

-- Permitir execução pública apenas para esta função específica
GRANT EXECUTE ON FUNCTION bootstrap_admin_user(uuid, text, text) TO anon, authenticated;
