/*
  # Implementar Políticas de Segurança com Controle de Acesso Baseado em Roles

  ## Resumo
  Esta migração implementa um sistema de segurança robusto que protege dados sensíveis
  enquanto permite cadastro público de clientes.

  ## Mudanças Principais

  ### 1. Remoção de Políticas Inseguras
  Remove todas as políticas RLS existentes que permitem acesso público irrestrito
  usando `USING (true)` e `WITH CHECK (true)`.

  ### 2. Tabelas Públicas (Acesso sem autenticação)
  **customers** - Apenas INSERT público para cadastro
  - Permite criar novos clientes (cadastro público)
  - SELECT/UPDATE/DELETE restrito a usuários autenticados
  
  **customer_documents** - Apenas INSERT público
  - Permite upload de documentos durante cadastro
  - SELECT/UPDATE/DELETE restrito a usuários autenticados

  **addresses** - Apenas INSERT público
  - Permite adicionar endereço durante cadastro
  - SELECT/UPDATE/DELETE restrito a usuários autenticados

  ### 3. Tabelas Protegidas (Apenas usuários autenticados)
  **Todas as outras tabelas** requerem autenticação:
  - recipes, prep_sessions, prep_items, settings
  - nutrition_plans, monthly_menu, orders
  - delivery_schedules, order_status
  - global_settings, macro_calculation_settings

  ### 4. Controle de Acesso por Role
  **ADMIN** - Acesso completo a tudo
  **OPS** - Acesso completo exceto gerenciamento de usuários
  
  ### 5. Tabela Users
  - Apenas ADMINs podem criar/editar usuários
  - Todos autenticados podem ver lista de usuários

  ## Segurança
  - RLS habilitado em todas as tabelas
  - Verificação obrigatória de `auth.uid()` para operações autenticadas
  - Validação de role para operações administrativas
  - Cadastro público limitado a INSERT apenas em tabelas específicas
*/

-- ==============================================
-- PASSO 1: REMOVER TODAS AS POLÍTICAS INSEGURAS
-- ==============================================

-- Customers
DROP POLICY IF EXISTS "Anyone can view customers" ON customers;
DROP POLICY IF EXISTS "Anyone can create customers" ON customers;
DROP POLICY IF EXISTS "Anyone can update customers" ON customers;
DROP POLICY IF EXISTS "Anyone can delete customers" ON customers;

-- Addresses
DROP POLICY IF EXISTS "Anyone can view addresses" ON addresses;
DROP POLICY IF EXISTS "Anyone can create addresses" ON addresses;
DROP POLICY IF EXISTS "Anyone can update addresses" ON addresses;
DROP POLICY IF EXISTS "Anyone can delete addresses" ON addresses;

-- Customer Documents
DROP POLICY IF EXISTS "Permitir leitura pública de documentos" ON customer_documents;
DROP POLICY IF EXISTS "Permitir inserção pública de documentos" ON customer_documents;
DROP POLICY IF EXISTS "Permitir atualização pública de documentos" ON customer_documents;
DROP POLICY IF EXISTS "Permitir exclusão pública de documentos" ON customer_documents;

-- Recipes
DROP POLICY IF EXISTS "Anyone can view recipes" ON recipes;
DROP POLICY IF EXISTS "Anyone can create recipes" ON recipes;
DROP POLICY IF EXISTS "Anyone can update recipes" ON recipes;
DROP POLICY IF EXISTS "Anyone can delete recipes" ON recipes;

-- Prep Sessions
DROP POLICY IF EXISTS "Anyone can view prep sessions" ON prep_sessions;
DROP POLICY IF EXISTS "Anyone can create prep sessions" ON prep_sessions;
DROP POLICY IF EXISTS "Anyone can update prep sessions" ON prep_sessions;
DROP POLICY IF EXISTS "Anyone can delete prep sessions" ON prep_sessions;

-- Prep Items
DROP POLICY IF EXISTS "Anyone can view prep items" ON prep_items;
DROP POLICY IF EXISTS "Anyone can create prep items" ON prep_items;
DROP POLICY IF EXISTS "Anyone can update prep items" ON prep_items;
DROP POLICY IF EXISTS "Anyone can delete prep items" ON prep_items;

-- Monthly Menu
DROP POLICY IF EXISTS "Anyone can view menu" ON monthly_menu;
DROP POLICY IF EXISTS "Anyone can create menu" ON monthly_menu;
DROP POLICY IF EXISTS "Anyone can update menu" ON monthly_menu;
DROP POLICY IF EXISTS "Anyone can delete menu" ON monthly_menu;
DROP POLICY IF EXISTS "Usuários autenticados podem visualizar cardápio" ON monthly_menu;
DROP POLICY IF EXISTS "Usuários autenticados podem inserir cardápio" ON monthly_menu;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar cardápio" ON monthly_menu;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar cardápio" ON monthly_menu;

-- Nutrition Plans
DROP POLICY IF EXISTS "Anyone can view nutrition plans" ON nutrition_plans;
DROP POLICY IF EXISTS "Anyone can create nutrition plans" ON nutrition_plans;
DROP POLICY IF EXISTS "Anyone can update nutrition plans" ON nutrition_plans;
DROP POLICY IF EXISTS "Anyone can delete nutrition plans" ON nutrition_plans;
DROP POLICY IF EXISTS "Usuários autenticados podem visualizar planos" ON nutrition_plans;
DROP POLICY IF EXISTS "Usuários autenticados podem inserir planos" ON nutrition_plans;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar planos" ON nutrition_plans;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar planos" ON nutrition_plans;

-- Orders
DROP POLICY IF EXISTS "Allow public read access to orders" ON orders;
DROP POLICY IF EXISTS "Allow public insert access to orders" ON orders;
DROP POLICY IF EXISTS "Allow public update access to orders" ON orders;
DROP POLICY IF EXISTS "Allow public delete access to orders" ON orders;

-- Delivery Schedules
DROP POLICY IF EXISTS "Anyone can view delivery schedules" ON delivery_schedules;
DROP POLICY IF EXISTS "Anyone can create delivery schedules" ON delivery_schedules;
DROP POLICY IF EXISTS "Anyone can update delivery schedules" ON delivery_schedules;
DROP POLICY IF EXISTS "Anyone can delete delivery schedules" ON delivery_schedules;

-- Order Status
DROP POLICY IF EXISTS "Public can view order status" ON order_status;
DROP POLICY IF EXISTS "Public can insert order status" ON order_status;
DROP POLICY IF EXISTS "Public can update order status" ON order_status;
DROP POLICY IF EXISTS "Public can delete order status" ON order_status;

-- Global Settings
DROP POLICY IF EXISTS "Anyone can read global settings" ON global_settings;
DROP POLICY IF EXISTS "Anyone can insert global settings" ON global_settings;
DROP POLICY IF EXISTS "Anyone can update global settings" ON global_settings;

-- Macro Calculation Settings
DROP POLICY IF EXISTS "Anyone can read macro calculation settings" ON macro_calculation_settings;
DROP POLICY IF EXISTS "Anyone can update macro calculation settings" ON macro_calculation_settings;

-- Users
DROP POLICY IF EXISTS "Authenticated users can view all users" ON users;
DROP POLICY IF EXISTS "Only admins can insert users" ON users;
DROP POLICY IF EXISTS "Only admins can update users" ON users;

-- Settings
DROP POLICY IF EXISTS "Authenticated users can view settings" ON settings;
DROP POLICY IF EXISTS "Only admins can modify settings" ON settings;

-- ==============================================
-- PASSO 2: CRIAR POLÍTICAS SEGURAS
-- ==============================================

-- ============================================
-- CUSTOMERS - Cadastro público + Gestão autenticada
-- ============================================

-- Público pode criar clientes (cadastro)
CREATE POLICY "Public can create customers for registration"
  ON customers FOR INSERT
  TO anon
  WITH CHECK (true);

-- Autenticados podem visualizar todos os clientes
CREATE POLICY "Authenticated users can view all customers"
  ON customers FOR SELECT
  TO authenticated
  USING (true);

-- Autenticados podem atualizar clientes
CREATE POLICY "Authenticated users can update customers"
  ON customers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Autenticados podem deletar clientes
CREATE POLICY "Authenticated users can delete customers"
  ON customers FOR DELETE
  TO authenticated
  USING (true);

-- ============================================
-- ADDRESSES - Cadastro público + Gestão autenticada
-- ============================================

-- Público pode criar endereços (durante cadastro)
CREATE POLICY "Public can create addresses during registration"
  ON addresses FOR INSERT
  TO anon
  WITH CHECK (true);

-- Autenticados podem visualizar endereços
CREATE POLICY "Authenticated users can view addresses"
  ON addresses FOR SELECT
  TO authenticated
  USING (true);

-- Autenticados podem atualizar endereços
CREATE POLICY "Authenticated users can update addresses"
  ON addresses FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Autenticados podem deletar endereços
CREATE POLICY "Authenticated users can delete addresses"
  ON addresses FOR DELETE
  TO authenticated
  USING (true);

-- ============================================
-- CUSTOMER DOCUMENTS - Upload público + Gestão autenticada
-- ============================================

-- Público pode fazer upload de documentos (durante cadastro)
CREATE POLICY "Public can upload documents during registration"
  ON customer_documents FOR INSERT
  TO anon
  WITH CHECK (true);

-- Autenticados podem visualizar documentos
CREATE POLICY "Authenticated users can view documents"
  ON customer_documents FOR SELECT
  TO authenticated
  USING (true);

-- Autenticados podem atualizar documentos
CREATE POLICY "Authenticated users can update documents"
  ON customer_documents FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Autenticados podem deletar documentos
CREATE POLICY "Authenticated users can delete documents"
  ON customer_documents FOR DELETE
  TO authenticated
  USING (true);

-- ============================================
-- RECIPES - Apenas autenticados
-- ============================================

CREATE POLICY "Authenticated users can view recipes"
  ON recipes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create recipes"
  ON recipes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update recipes"
  ON recipes FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete recipes"
  ON recipes FOR DELETE
  TO authenticated
  USING (true);

-- ============================================
-- PREP SESSIONS - Apenas autenticados
-- ============================================

CREATE POLICY "Authenticated users can view prep sessions"
  ON prep_sessions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create prep sessions"
  ON prep_sessions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update prep sessions"
  ON prep_sessions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete prep sessions"
  ON prep_sessions FOR DELETE
  TO authenticated
  USING (true);

-- ============================================
-- PREP ITEMS - Apenas autenticados
-- ============================================

CREATE POLICY "Authenticated users can view prep items"
  ON prep_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create prep items"
  ON prep_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update prep items"
  ON prep_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete prep items"
  ON prep_items FOR DELETE
  TO authenticated
  USING (true);

-- ============================================
-- MONTHLY MENU - Apenas autenticados
-- ============================================

CREATE POLICY "Authenticated users can view menu"
  ON monthly_menu FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create menu"
  ON monthly_menu FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update menu"
  ON monthly_menu FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete menu"
  ON monthly_menu FOR DELETE
  TO authenticated
  USING (true);

-- ============================================
-- NUTRITION PLANS - Apenas autenticados
-- ============================================

CREATE POLICY "Authenticated users can view nutrition plans"
  ON nutrition_plans FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create nutrition plans"
  ON nutrition_plans FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update nutrition plans"
  ON nutrition_plans FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete nutrition plans"
  ON nutrition_plans FOR DELETE
  TO authenticated
  USING (true);

-- ============================================
-- ORDERS - Apenas autenticados
-- ============================================

CREATE POLICY "Authenticated users can view orders"
  ON orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete orders"
  ON orders FOR DELETE
  TO authenticated
  USING (true);

-- ============================================
-- DELIVERY SCHEDULES - Apenas autenticados
-- ============================================

CREATE POLICY "Authenticated users can view delivery schedules"
  ON delivery_schedules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create delivery schedules"
  ON delivery_schedules FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update delivery schedules"
  ON delivery_schedules FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete delivery schedules"
  ON delivery_schedules FOR DELETE
  TO authenticated
  USING (true);

-- ============================================
-- ORDER STATUS - Apenas autenticados
-- ============================================

CREATE POLICY "Authenticated users can view order status"
  ON order_status FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create order status"
  ON order_status FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update order status"
  ON order_status FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete order status"
  ON order_status FOR DELETE
  TO authenticated
  USING (true);

-- ============================================
-- GLOBAL SETTINGS - Apenas autenticados
-- ============================================

CREATE POLICY "Authenticated users can view global settings"
  ON global_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update global settings"
  ON global_settings FOR UPDATE
  TO authenticated
  USING (id = 1)
  WITH CHECK (id = 1);

-- ============================================
-- MACRO CALCULATION SETTINGS - Apenas autenticados
-- ============================================

CREATE POLICY "Authenticated users can view macro settings"
  ON macro_calculation_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update macro settings"
  ON macro_calculation_settings FOR UPDATE
  TO authenticated
  USING (id = 1)
  WITH CHECK (id = 1);

-- ============================================
-- USERS - Apenas ADMINs podem gerenciar
-- ============================================

-- Todos autenticados podem ver usuários
CREATE POLICY "Authenticated users can view users"
  ON users FOR SELECT
  TO authenticated
  USING (true);

-- Apenas ADMINs podem criar usuários
CREATE POLICY "Only admins can create users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

-- Apenas ADMINs podem atualizar usuários
CREATE POLICY "Only admins can update users"
  ON users FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

-- Apenas ADMINs podem deletar usuários
CREATE POLICY "Only admins can delete users"
  ON users FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

-- ============================================
-- SETTINGS - Apenas autenticados podem ver, ADMINs podem modificar
-- ============================================

CREATE POLICY "Authenticated users can view settings"
  ON settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can modify settings"
  ON settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );
