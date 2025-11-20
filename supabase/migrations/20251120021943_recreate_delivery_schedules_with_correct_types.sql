/*
  # Recreate delivery_schedules table with correct types

  1. Changes
    - Drop existing delivery_schedules table
    - Recreate with day_of_week as INTEGER
    - Add is_active column
    - Add proper constraints
  
  2. Security
    - Maintain existing RLS policies
  
  3. Notes
    - This will delete existing schedule data
    - day_of_week: 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday
    - meal_type: 'lunch' or 'dinner'
*/

-- Drop existing table
DROP TABLE IF EXISTS delivery_schedules CASCADE;

-- Recreate table with correct types
CREATE TABLE delivery_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 5),
  meal_type TEXT NOT NULL CHECK (meal_type IN ('lunch', 'dinner')),
  delivery_time TEXT,
  delivery_address TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE delivery_schedules ENABLE ROW LEVEL SECURITY;

-- Recreate policies
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

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_delivery_schedules_customer_id 
  ON delivery_schedules(customer_id);

CREATE INDEX IF NOT EXISTS idx_delivery_schedules_day_meal 
  ON delivery_schedules(day_of_week, meal_type);
