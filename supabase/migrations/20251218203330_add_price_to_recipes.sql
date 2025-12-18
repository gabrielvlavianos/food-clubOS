/*
  # Add price field to recipes table

  1. Changes
    - Add `price_per_kg` column to `recipes` table (decimal, default 0)
    - This will store the price per kilogram for each recipe
  
  2. Notes
    - Price is stored in BRL (Brazilian Real)
    - Default is 0 until synced from Sischef or manually set
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recipes' AND column_name = 'price_per_kg'
  ) THEN
    ALTER TABLE recipes ADD COLUMN price_per_kg decimal(10,2) DEFAULT 0;
  END IF;
END $$;