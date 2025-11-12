/*
  # Add Macronutrient Fields to Customers

  1. Changes
    - Add 6 new columns to `customers` table for meal-specific macronutrient targets:
      - `lunch_carbs` (decimal) - Target carbohydrates in grams for lunch
      - `lunch_protein` (decimal) - Target protein in grams for lunch
      - `lunch_fat` (decimal) - Target fat in grams for lunch
      - `dinner_carbs` (decimal) - Target carbohydrates in grams for dinner
      - `dinner_protein` (decimal) - Target protein in grams for dinner
      - `dinner_fat` (decimal) - Target fat in grams for dinner

  2. Notes
    - All fields are nullable to allow gradual data entry
    - Uses decimal type for precision in nutritional calculations
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'lunch_carbs'
  ) THEN
    ALTER TABLE customers ADD COLUMN lunch_carbs DECIMAL(6,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'lunch_protein'
  ) THEN
    ALTER TABLE customers ADD COLUMN lunch_protein DECIMAL(6,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'lunch_fat'
  ) THEN
    ALTER TABLE customers ADD COLUMN lunch_fat DECIMAL(6,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'dinner_carbs'
  ) THEN
    ALTER TABLE customers ADD COLUMN dinner_carbs DECIMAL(6,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'dinner_protein'
  ) THEN
    ALTER TABLE customers ADD COLUMN dinner_protein DECIMAL(6,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'dinner_fat'
  ) THEN
    ALTER TABLE customers ADD COLUMN dinner_fat DECIMAL(6,2);
  END IF;
END $$;
