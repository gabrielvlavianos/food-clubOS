/*
  # Fix RLS Policies for Public Access

  Since the application doesn't have authentication implemented yet, 
  we need to allow public access (anon role) to all tables.

  ## Changes
  - Update customers table policies to allow anon role access
  - Update recipes table policies to allow anon role access  
  - Update monthly_menu table policies to allow anon role access
  - Update nutrition_plans table policies to allow anon role access
  - Update orders table policies to allow anon role access

  This allows the frontend to read and write data without authentication.
*/

-- Drop existing restrictive policies for customers
DROP POLICY IF EXISTS "Authenticated users can view customers" ON customers;
DROP POLICY IF EXISTS "Authenticated users can create customers" ON customers;
DROP POLICY IF EXISTS "Authenticated users can update customers" ON customers;
DROP POLICY IF EXISTS "Only admins can delete customers" ON customers;

-- Create public policies for customers
CREATE POLICY "Anyone can view customers"
  ON customers FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can create customers"
  ON customers FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update customers"
  ON customers FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete customers"
  ON customers FOR DELETE
  TO anon, authenticated
  USING (true);

-- Drop existing restrictive policies for recipes
DROP POLICY IF EXISTS "Authenticated users can view recipes" ON recipes;
DROP POLICY IF EXISTS "Authenticated users can create recipes" ON recipes;
DROP POLICY IF EXISTS "Authenticated users can update recipes" ON recipes;
DROP POLICY IF EXISTS "Only admins can delete recipes" ON recipes;

-- Create public policies for recipes
CREATE POLICY "Anyone can view recipes"
  ON recipes FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can create recipes"
  ON recipes FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update recipes"
  ON recipes FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete recipes"
  ON recipes FOR DELETE
  TO anon, authenticated
  USING (true);

-- Drop existing restrictive policies for monthly_menu
DROP POLICY IF EXISTS "Authenticated users can view menu" ON monthly_menu;
DROP POLICY IF EXISTS "Authenticated users can create menu" ON monthly_menu;
DROP POLICY IF EXISTS "Authenticated users can update menu" ON monthly_menu;
DROP POLICY IF EXISTS "Only admins can delete menu" ON monthly_menu;

-- Create public policies for monthly_menu
CREATE POLICY "Anyone can view menu"
  ON monthly_menu FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can create menu"
  ON monthly_menu FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update menu"
  ON monthly_menu FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete menu"
  ON monthly_menu FOR DELETE
  TO anon, authenticated
  USING (true);

-- Drop existing restrictive policies for nutrition_plans if they exist
DROP POLICY IF EXISTS "Authenticated users can view nutrition plans" ON nutrition_plans;
DROP POLICY IF EXISTS "Authenticated users can create nutrition plans" ON nutrition_plans;
DROP POLICY IF EXISTS "Authenticated users can update nutrition plans" ON nutrition_plans;
DROP POLICY IF EXISTS "Only admins can delete nutrition plans" ON nutrition_plans;

-- Create public policies for nutrition_plans
CREATE POLICY "Anyone can view nutrition plans"
  ON nutrition_plans FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can create nutrition plans"
  ON nutrition_plans FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update nutrition plans"
  ON nutrition_plans FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete nutrition plans"
  ON nutrition_plans FOR DELETE
  TO anon, authenticated
  USING (true);

-- Drop existing restrictive policies for orders if they exist
DROP POLICY IF EXISTS "Authenticated users can view orders" ON orders;
DROP POLICY IF EXISTS "Authenticated users can create orders" ON orders;
DROP POLICY IF EXISTS "Authenticated users can update orders" ON orders;
DROP POLICY IF EXISTS "Only admins can delete orders" ON orders;

-- Create public policies for orders
CREATE POLICY "Anyone can view orders"
  ON orders FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can create orders"
  ON orders FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update orders"
  ON orders FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete orders"
  ON orders FOR DELETE
  TO anon, authenticated
  USING (true);
