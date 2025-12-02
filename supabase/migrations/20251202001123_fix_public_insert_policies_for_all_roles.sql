/*
  # Corrigir Políticas RLS para Permitir INSERT Público

  ## Problema
  As políticas atuais só permitem INSERT para role 'anon', mas o Supabase client
  pode estar usando outras roles. Precisamos garantir que o INSERT público funcione
  independentemente do estado de autenticação.

  ## Solução
  - Remover políticas restritivas existentes
  - Criar novas políticas que permitem INSERT tanto para 'anon' quanto para 'authenticated'
  - Isto permite que o formulário de cadastro funcione mesmo quando o usuário
    navega no site depois de ter feito login em outra aba

  ## Segurança
  - INSERT público é seguro pois é parte do fluxo de cadastro
  - SELECT/UPDATE/DELETE continuam protegidos
*/

-- ==================================================
-- CUSTOMERS: Permitir INSERT para anon e authenticated
-- ==================================================

DROP POLICY IF EXISTS "Public can create customers for registration" ON customers;

CREATE POLICY "Anyone can create customers for registration"
  ON customers FOR INSERT
  WITH CHECK (true);

-- ==================================================
-- ADDRESSES: Permitir INSERT para anon e authenticated
-- ==================================================

DROP POLICY IF EXISTS "Public can create addresses during registration" ON addresses;

CREATE POLICY "Anyone can create addresses during registration"
  ON addresses FOR INSERT
  WITH CHECK (true);

-- ==================================================
-- CUSTOMER_DOCUMENTS: Permitir INSERT para anon e authenticated
-- ==================================================

DROP POLICY IF EXISTS "Public can upload documents during registration" ON customer_documents;

CREATE POLICY "Anyone can upload documents during registration"
  ON customer_documents FOR INSERT
  WITH CHECK (true);

-- ==================================================
-- DELIVERY_SCHEDULES: Permitir INSERT para anon e authenticated
-- ==================================================

DROP POLICY IF EXISTS "Public can create delivery schedules during registration" ON delivery_schedules;

CREATE POLICY "Anyone can create delivery schedules during registration"
  ON delivery_schedules FOR INSERT
  WITH CHECK (true);
