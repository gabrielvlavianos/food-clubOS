/*
  # Add weekend support to delivery schedules

  1. Changes
    - Update day_of_week constraint to accept 1-7 (Monday-Sunday)
    - Previously only accepted 1-5 (Monday-Friday)
  
  2. Notes
    - day_of_week: 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday, 7=Sunday
*/

-- Drop the existing constraint
ALTER TABLE delivery_schedules DROP CONSTRAINT IF EXISTS delivery_schedules_day_of_week_check;

-- Add new constraint that includes weekends
ALTER TABLE delivery_schedules ADD CONSTRAINT delivery_schedules_day_of_week_check 
  CHECK (day_of_week BETWEEN 1 AND 7);
