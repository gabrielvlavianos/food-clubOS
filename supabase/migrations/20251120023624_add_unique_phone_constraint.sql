/*
  # Add UNIQUE constraint to phone field

  1. Changes
    - Add UNIQUE constraint to customers.phone to prevent duplicates
    - Clean up existing duplicates first
  
  2. Notes
    - This prevents duplicate customer imports by phone number
    - Keeps only the most recent entry for each phone number
*/

-- First, delete duplicate customers keeping only the most recent one
DELETE FROM customers a USING customers b
WHERE a.id < b.id 
AND a.phone = b.phone;

-- Add UNIQUE constraint to phone
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'customers_phone_unique'
  ) THEN
    ALTER TABLE customers 
      ADD CONSTRAINT customers_phone_unique UNIQUE (phone);
  END IF;
END $$;
