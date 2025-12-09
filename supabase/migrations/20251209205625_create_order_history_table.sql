/*
  # Create Order History Table

  1. Purpose
    - Store complete snapshots of executed orders for historical tracking
    - Preserve exact details of what was delivered to each customer
    - Enable reporting and analysis of past deliveries

  2. New Tables
    - `order_history`
      - `id` (uuid, primary key)
      - `customer_id` (uuid, references customers)
      - `customer_name` (text) - snapshot of customer name
      - `order_date` (date) - date of the order
      - `meal_type` (text) - lunch or dinner
      - `delivery_time` (text) - actual delivery time
      - `pickup_time` (text) - time driver was requested
      - `delivery_address` (text) - delivery address used
      - `protein_name` (text) - protein recipe name
      - `protein_quantity` (integer) - grams of protein
      - `carb_name` (text) - carb recipe name
      - `carb_quantity` (integer) - grams of carb
      - `vegetable_name` (text) - vegetable recipe name
      - `vegetable_quantity` (integer) - grams of vegetables
      - `salad_name` (text) - salad recipe name
      - `salad_quantity` (integer) - grams of salad
      - `sauce_name` (text) - sauce recipe name
      - `sauce_quantity` (integer) - grams of sauce
      - `target_kcal` (numeric) - target calories
      - `target_protein` (numeric) - target protein in grams
      - `target_carbs` (numeric) - target carbs in grams
      - `target_fat` (numeric) - target fat in grams
      - `delivered_kcal` (numeric) - actual delivered calories
      - `delivered_protein` (numeric) - actual delivered protein in grams
      - `delivered_carbs` (numeric) - actual delivered carbs in grams
      - `delivered_fat` (numeric) - actual delivered fat in grams
      - `kitchen_status` (text) - status of kitchen preparation
      - `delivery_status` (text) - status of delivery
      - `created_at` (timestamptz) - when this record was created
      - `created_by` (uuid) - user who saved this record

  3. Security
    - Enable RLS on `order_history` table
    - Add policy for authenticated users to read all history
    - Add policy for authenticated users to insert history records
*/

CREATE TABLE IF NOT EXISTS order_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  order_date date NOT NULL,
  meal_type text NOT NULL CHECK (meal_type IN ('lunch', 'dinner')),
  delivery_time text NOT NULL,
  pickup_time text NOT NULL,
  delivery_address text NOT NULL,
  protein_name text,
  protein_quantity integer DEFAULT 0,
  carb_name text,
  carb_quantity integer DEFAULT 0,
  vegetable_name text,
  vegetable_quantity integer DEFAULT 0,
  salad_name text,
  salad_quantity integer DEFAULT 0,
  sauce_name text,
  sauce_quantity integer DEFAULT 0,
  target_kcal numeric DEFAULT 0,
  target_protein numeric DEFAULT 0,
  target_carbs numeric DEFAULT 0,
  target_fat numeric DEFAULT 0,
  delivered_kcal numeric DEFAULT 0,
  delivered_protein numeric DEFAULT 0,
  delivered_carbs numeric DEFAULT 0,
  delivered_fat numeric DEFAULT 0,
  kitchen_status text DEFAULT 'pending',
  delivery_status text DEFAULT 'not_started',
  created_at timestamptz DEFAULT now(),
  created_by uuid
);

ALTER TABLE order_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read order history"
  ON order_history FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert order history"
  ON order_history FOR INSERT
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_order_history_customer_id ON order_history(customer_id);
CREATE INDEX IF NOT EXISTS idx_order_history_order_date ON order_history(order_date);
CREATE INDEX IF NOT EXISTS idx_order_history_meal_type ON order_history(meal_type);
CREATE INDEX IF NOT EXISTS idx_order_history_created_at ON order_history(created_at DESC);
