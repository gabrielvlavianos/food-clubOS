/*
  # Add Customer Modification Support to Orders Table

  1. Overview
    - Adds support for storing customer-requested modifications from Google Sheets
    - These modifications override the default scheduled delivery settings
  
  2. New Columns
    - `modified_delivery_address` - Customer's new delivery address
    - `modified_delivery_time` - Customer's new delivery time
    - `modified_protein_name` - Customer's requested protein (stored as name for flexibility)
    - `modified_carb_name` - Customer's requested carbohydrate (stored as name for flexibility)
    - `is_cancelled` - Whether customer cancelled this specific order
  
  3. Important Notes
    - These fields are optional and only filled when customer makes changes
    - The application should check these fields first before using default schedule
    - Modified recipe names need to be looked up in recipes table when calculating quantities
*/

-- Add modification columns
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS modified_delivery_address text,
ADD COLUMN IF NOT EXISTS modified_delivery_time time,
ADD COLUMN IF NOT EXISTS modified_protein_name text,
ADD COLUMN IF NOT EXISTS modified_carb_name text,
ADD COLUMN IF NOT EXISTS is_cancelled boolean DEFAULT false;

-- Update existing cancelled orders based on status
UPDATE orders SET is_cancelled = true WHERE status = 'cancelled';

-- Add index for cancelled orders
CREATE INDEX IF NOT EXISTS idx_orders_is_cancelled ON orders(is_cancelled) WHERE is_cancelled = true;

-- Add unique constraint to prevent duplicate orders for same customer/date/meal
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'orders_customer_date_meal_unique'
  ) THEN
    ALTER TABLE orders 
    ADD CONSTRAINT orders_customer_date_meal_unique 
    UNIQUE (customer_id, order_date, meal_type);
  END IF;
END $$;
