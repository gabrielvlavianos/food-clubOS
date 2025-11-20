/*
  # Remove unique constraint from phone column

  1. Changes
    - Remove UNIQUE constraint from customers.phone column
    - Keep whatsapp as unique since it's used for identification
    - This allows multiple customers to share the same phone number

  2. Security
    - No changes to RLS policies
*/

-- Drop the unique constraint on phone
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_phone_unique;
