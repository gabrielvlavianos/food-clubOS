/*
  # Fix RLS Policies for All Remaining Tables

  1. Changes
    - Update addresses table policies to allow anon role access
    - Update order_items table policies to allow anon role access
    - Update prep_sessions table policies to allow anon role access
    - Update prep_items table policies to allow anon role access

  2. Security Note
    - Since the application doesn't have authentication implemented yet,
      we need to allow public access (anon role) to these tables
    - Settings and users tables will remain restricted to authenticated users only
*/

-- Fix addresses table policies
DROP POLICY IF EXISTS "Authenticated users can view addresses" ON addresses;
DROP POLICY IF EXISTS "Authenticated users can create addresses" ON addresses;
DROP POLICY IF EXISTS "Authenticated users can update addresses" ON addresses;
DROP POLICY IF EXISTS "Authenticated users can delete addresses" ON addresses;

CREATE POLICY "Anyone can view addresses"
  ON addresses FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can create addresses"
  ON addresses FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update addresses"
  ON addresses FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete addresses"
  ON addresses FOR DELETE
  TO anon, authenticated
  USING (true);

-- Fix order_items table policies
DROP POLICY IF EXISTS "Usuários autenticados podem visualizar itens" ON order_items;
DROP POLICY IF EXISTS "Usuários autenticados podem inserir itens" ON order_items;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar itens" ON order_items;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar itens" ON order_items;

CREATE POLICY "Anyone can view order items"
  ON order_items FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can create order items"
  ON order_items FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update order items"
  ON order_items FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete order items"
  ON order_items FOR DELETE
  TO anon, authenticated
  USING (true);

-- Fix prep_sessions table policies
DROP POLICY IF EXISTS "Authenticated users can view prep sessions" ON prep_sessions;
DROP POLICY IF EXISTS "Authenticated users can create prep sessions" ON prep_sessions;
DROP POLICY IF EXISTS "Authenticated users can update prep sessions" ON prep_sessions;
DROP POLICY IF EXISTS "Authenticated users can delete prep sessions" ON prep_sessions;

CREATE POLICY "Anyone can view prep sessions"
  ON prep_sessions FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can create prep sessions"
  ON prep_sessions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update prep sessions"
  ON prep_sessions FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete prep sessions"
  ON prep_sessions FOR DELETE
  TO anon, authenticated
  USING (true);

-- Fix prep_items table policies
DROP POLICY IF EXISTS "Authenticated users can view prep items" ON prep_items;
DROP POLICY IF EXISTS "Authenticated users can create prep items" ON prep_items;
DROP POLICY IF EXISTS "Authenticated users can update prep items" ON prep_items;
DROP POLICY IF EXISTS "Authenticated users can delete prep items" ON prep_items;

CREATE POLICY "Anyone can view prep items"
  ON prep_items FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can create prep items"
  ON prep_items FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update prep items"
  ON prep_items FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete prep items"
  ON prep_items FOR DELETE
  TO anon, authenticated
  USING (true);
