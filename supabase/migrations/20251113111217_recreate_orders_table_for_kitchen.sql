/*
  # Recreate Orders Table for Kitchen Dashboard

  1. Changes
    - Drop old orders table and related tables
    - Create new orders table with recipe fields and nutritional info
    - Add proper indexes and RLS policies

  2. Security
    - Enable RLS
    - Add public access policies for kitchen operations
*/

-- Drop old tables
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;

-- Create new orders table
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  order_date date NOT NULL,
  meal_type text NOT NULL CHECK (meal_type IN ('lunch', 'dinner')),
  protein_recipe_id uuid REFERENCES recipes(id) NOT NULL,
  protein_amount_gr numeric NOT NULL CHECK (protein_amount_gr > 0),
  carb_recipe_id uuid REFERENCES recipes(id) NOT NULL,
  carb_amount_gr numeric NOT NULL CHECK (carb_amount_gr > 0),
  vegetable_recipe_id uuid REFERENCES recipes(id),
  vegetable_amount_gr numeric CHECK (vegetable_amount_gr >= 0),
  salad_recipe_id uuid REFERENCES recipes(id),
  salad_amount_gr numeric CHECK (salad_amount_gr >= 0),
  sauce_recipe_id uuid REFERENCES recipes(id),
  total_calories numeric NOT NULL DEFAULT 0,
  total_protein numeric NOT NULL DEFAULT 0,
  total_carbs numeric NOT NULL DEFAULT 0,
  total_fat numeric NOT NULL DEFAULT 0,
  delivery_address text NOT NULL,
  delivery_time time,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'delivered')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_order_date ON orders(order_date);
CREATE INDEX idx_orders_meal_type ON orders(meal_type);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_date_meal ON orders(order_date, meal_type);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to orders"
  ON orders FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access to orders"
  ON orders FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update access to orders"
  ON orders FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access to orders"
  ON orders FOR DELETE
  USING (true);

CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_orders_updated_at();
