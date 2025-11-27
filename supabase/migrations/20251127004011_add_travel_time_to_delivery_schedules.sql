/*
  # Add travel time tracking to delivery schedules

  1. Changes
    - Add `travel_time_minutes` column to `delivery_schedules` table
      - Stores calculated travel time from kitchen to customer
      - Nullable (will be calculated on-demand)
      - Default NULL
    
  2. Notes
    - Travel time will be calculated using Google Maps Distance Matrix API
    - Will be cached to avoid repeated API calls
    - Can be recalculated if address changes
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_schedules' AND column_name = 'travel_time_minutes'
  ) THEN
    ALTER TABLE delivery_schedules ADD COLUMN travel_time_minutes integer;
  END IF;
END $$;
