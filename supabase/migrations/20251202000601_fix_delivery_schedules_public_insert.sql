/*
  # Corrigir Política RLS para Permitir Cadastro Público de Horários de Entrega

  ## Resumo
  O formulário de cadastro público precisa inserir registros em delivery_schedules,
  mas a política atual só permite INSERT para usuários autenticados.

  ## Mudanças
  - Adicionar política para permitir INSERT público (anon) em delivery_schedules
  - Manter as políticas existentes de autenticação para SELECT/UPDATE/DELETE

  ## Segurança
  - INSERT público é seguro pois faz parte do fluxo de cadastro de novos clientes
  - SELECT/UPDATE/DELETE continuam protegidos e requerem autenticação
*/

-- Adicionar política para permitir INSERT público em delivery_schedules
CREATE POLICY "Public can create delivery schedules during registration"
  ON delivery_schedules FOR INSERT
  TO anon
  WITH CHECK (true);
