/*
  # Fix Macro Calculation Settings RLS Policy

  1. Problem
    - Current policy requires authentication
    - System doesn't have auth implemented
    - Updates are failing
    
  2. Solution
    - Change policy to allow public updates
    - Keep single row constraint for data integrity
    
  3. Changes
    - Drop existing authenticated-only update policy
    - Create new public update policy
*/

-- Drop old policy
DROP POLICY IF EXISTS "Authenticated users can update macro calculation settings" ON macro_calculation_settings;

-- Create new policy allowing public updates
CREATE POLICY "Anyone can update macro calculation settings"
  ON macro_calculation_settings
  FOR UPDATE
  USING (id = 1)
  WITH CHECK (id = 1);