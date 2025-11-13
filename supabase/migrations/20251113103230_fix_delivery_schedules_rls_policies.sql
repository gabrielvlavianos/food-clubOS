/*
  # Fix RLS Policies for delivery_schedules Table

  1. Changes
    - Drop existing restrictive policies that require authentication
    - Create public policies to allow anon role access
    - This allows the frontend to create delivery schedules without authentication

  2. Security Note
    - Since the application doesn't have authentication implemented yet,
      we need to allow public access (anon role) to the delivery_schedules table
*/

-- Drop existing restrictive policies for delivery_schedules
DROP POLICY IF EXISTS "Usuários autenticados podem visualizar horários" ON delivery_schedules;
DROP POLICY IF EXISTS "Usuários autenticados podem inserir horários" ON delivery_schedules;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar horários" ON delivery_schedules;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar horários" ON delivery_schedules;

-- Create public policies for delivery_schedules
CREATE POLICY "Anyone can view delivery schedules"
  ON delivery_schedules FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can create delivery schedules"
  ON delivery_schedules FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update delivery schedules"
  ON delivery_schedules FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete delivery schedules"
  ON delivery_schedules FOR DELETE
  TO anon, authenticated
  USING (true);
