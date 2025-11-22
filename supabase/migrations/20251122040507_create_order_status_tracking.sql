/*
  # Create Order Status Tracking Table

  1. New Tables
    - `order_status`
      - `id` (uuid, primary key) - Unique identifier for each status record
      - `customer_id` (uuid, foreign key) - Reference to customers table
      - `order_date` (date) - The date of the order
      - `meal_type` (text) - Type of meal ('lunch' or 'dinner')
      - `kitchen_status` (text) - Kitchen preparation status
      - `delivery_status` (text) - Delivery/expedition status
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp
      
  2. Indexes
    - Unique index on (customer_id, order_date, meal_type) to prevent duplicates
    - Index on order_date for faster queries
    
  3. Security
    - Enable RLS on `order_status` table
    - Add policy for public access (since no authentication is implemented)
    
  4. Notes
    - This table tracks the status of orders for both kitchen and expedition operations
    - Status values are stored as text for flexibility
    - The unique constraint ensures only one status record per customer/date/meal combination
*/

-- Create the order_status table
CREATE TABLE IF NOT EXISTS order_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  order_date date NOT NULL,
  meal_type text NOT NULL CHECK (meal_type IN ('lunch', 'dinner')),
  kitchen_status text NOT NULL DEFAULT 'pending' CHECK (kitchen_status IN ('pending', 'preparing', 'ready')),
  delivery_status text NOT NULL DEFAULT 'not_started' CHECK (delivery_status IN ('not_started', 'driver_requested', 'in_route', 'delivered')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create unique index to prevent duplicate records
CREATE UNIQUE INDEX IF NOT EXISTS order_status_unique_idx 
ON order_status(customer_id, order_date, meal_type);

-- Create index for faster date queries
CREATE INDEX IF NOT EXISTS order_status_date_idx 
ON order_status(order_date);

-- Enable Row Level Security
ALTER TABLE order_status ENABLE ROW LEVEL SECURITY;

-- Create policy for public access (since no authentication)
CREATE POLICY "Public can view order status"
  ON order_status FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can insert order status"
  ON order_status FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public can update order status"
  ON order_status FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can delete order status"
  ON order_status FOR DELETE
  TO public
  USING (true);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_order_status_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function
DROP TRIGGER IF EXISTS order_status_updated_at_trigger ON order_status;
CREATE TRIGGER order_status_updated_at_trigger
  BEFORE UPDATE ON order_status
  FOR EACH ROW
  EXECUTE FUNCTION update_order_status_updated_at();
