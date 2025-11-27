/*
  # Add nutritionist tracking to customers

  1. Changes
    - Add `has_nutritionist` boolean column to `customers` table
      - Indicates whether the customer has a nutritionist providing their macros
      - Defaults to FALSE (automatic recommendations)
    
  2. Purpose
    - Clients WITH nutritionist: Use exact values provided by their nutritionist
    - Clients WITHOUT nutritionist: Show calculated suggestions that can be overridden
    - Enables proper tagging and UI flow for both customer types
    
  3. Notes
    - This field is captured at the start of the registration flow
    - Affects how macronutrient suggestions are displayed in the admin interface
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'has_nutritionist'
  ) THEN
    ALTER TABLE customers ADD COLUMN has_nutritionist boolean DEFAULT false NOT NULL;
  END IF;
END $$;