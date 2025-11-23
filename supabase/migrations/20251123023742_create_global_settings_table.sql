/*
  # Create Global Settings Table

  1. New Tables
    - `global_settings`
      - `id` (integer, primary key) - Always 1, single row table
      - `vegetables_amount` (integer) - Default amount for vegetables in grams
      - `salad_amount` (integer) - Default amount for salad in grams
      - `salad_dressing_amount` (integer) - Default amount for salad dressing in grams
      - `updated_at` (timestamptz) - Last update timestamp
  
  2. Security
    - Enable RLS on `global_settings` table
    - Add policy for anyone to read settings (needed for calculations)
    - Add policy for authenticated users to update settings
  
  3. Initial Data
    - Insert default values (100g vegetables, 100g salad, 30g dressing)
*/

CREATE TABLE IF NOT EXISTS global_settings (
  id integer PRIMARY KEY DEFAULT 1,
  vegetables_amount integer NOT NULL DEFAULT 100,
  salad_amount integer NOT NULL DEFAULT 100,
  salad_dressing_amount integer NOT NULL DEFAULT 30,
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);

ALTER TABLE global_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read global settings"
  ON global_settings
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can update global settings"
  ON global_settings
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can insert global settings"
  ON global_settings
  FOR INSERT
  WITH CHECK (id = 1);

INSERT INTO global_settings (id, vegetables_amount, salad_amount, salad_dressing_amount)
VALUES (1, 100, 100, 30)
ON CONFLICT (id) DO NOTHING;
