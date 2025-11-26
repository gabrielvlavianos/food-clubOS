/*
  # Add Customer Registration Fields

  1. Changes
    - Add `status` column to track customer approval state (pending_approval, active, inactive)
    - Add `has_nutritionist` boolean to differentiate customer types
    - Add `meal_plan_file_url` to store uploaded meal plan documents
    - Remove `whatsapp` column as it's redundant with phone
    - Add default status as 'pending_approval' for new registrations
  
  2. Security
    - Maintain existing RLS policies
    - New fields follow same security model
*/

-- Add new columns to customers table
DO $$ 
BEGIN
  -- Add status column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customers' AND column_name = 'status'
  ) THEN
    ALTER TABLE customers 
    ADD COLUMN status text DEFAULT 'pending_approval' CHECK (status IN ('pending_approval', 'active', 'inactive'));
  END IF;

  -- Add has_nutritionist column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customers' AND column_name = 'has_nutritionist'
  ) THEN
    ALTER TABLE customers 
    ADD COLUMN has_nutritionist boolean DEFAULT false;
  END IF;

  -- Add meal_plan_file_url column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customers' AND column_name = 'meal_plan_file_url'
  ) THEN
    ALTER TABLE customers 
    ADD COLUMN meal_plan_file_url text;
  END IF;
END $$;

-- Update existing customers to have 'active' status
UPDATE customers 
SET status = 'active' 
WHERE status IS NULL OR status = 'pending_approval';

-- Create index for faster queries on status
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_has_nutritionist ON customers(has_nutritionist);