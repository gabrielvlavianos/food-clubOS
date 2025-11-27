/*
  # Add other_allergies field to customers table

  1. Changes
    - Add `other_allergies` column to customers table
      - Type: text (nullable)
      - Purpose: Store custom allergies/intolerances when user selects "Outros" option
  
  2. Notes
    - This field is used in combination with the `allergies` array field
    - When "Outros" is selected in allergies, this field contains the detailed description
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'other_allergies'
  ) THEN
    ALTER TABLE customers ADD COLUMN other_allergies text;
  END IF;
END $$;
