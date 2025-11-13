/*
  # Create Orders Table for Kitchen Operations

  1. New Tables
    - `orders`
      - `id` (uuid, primary key)
      - `customer_id` (uuid, foreign key to customers)
      - `order_date` (date) - Date of the order
      - `meal_type` (text) - 'lunch' or 'dinner'
      - `protein_recipe_id` (uuid, foreign key to recipes)
      - `protein_amount_gr` (numeric) - Amount in grams
      - `carb_recipe_id` (uuid, foreign key to recipes)
      - `carb_amount_gr` (numeric) - Amount in grams
      - `vegetable_recipe_id` (uuid, nullable, foreign key to recipes)
      - `vegetable_amount_gr` (numeric, nullable)
      - `salad_recipe_id` (uuid, nullable, foreign key to recipes)
      - `salad_amount_gr` (numeric, nullable)
      - `sauce_recipe_id` (uuid, nullable, foreign key to recipes)
      - `total_calories` (numeric) - Calculated total calories
      - `total_protein` (numeric) - Calculated total protein
      - `total_carbs` (numeric) - Calculated total carbs
      - `total_fat` (numeric) - Calculated total fat
      - `delivery_address` (text) - Delivery address for this order
      - `delivery_time` (time) - Delivery time
      - `status` (text) - 'pending', 'preparing', 'ready', 'delivered'
      - `notes` (text, nullable) - Additional notes
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `orders` table
    - Add policies for public access (kitchen operations)
*/

CREATE TABLE IF NOT EXISTS orders (
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

CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_date ON orders(order_date);
CREATE INDEX IF NOT EXISTS idx_orders_meal_type ON orders(meal_type);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_date_meal ON orders(order_date, meal_type);

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

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_orders_updated_at();
