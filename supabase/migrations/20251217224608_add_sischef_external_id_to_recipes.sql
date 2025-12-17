/*
  # Add Sischef ERP Integration Field to Recipes

  ## Overview
  Adds external ID field to link recipes with Sischef ERP system for fiscal integration.

  ## Changes
  
  1. **Modified Tables**
    - `recipes`
      - Add `sischef_external_id` (text, nullable, unique)
        - Stores the ID from Sischef ERP system
        - Used for order synchronization and fiscal document generation
        - Nullable to allow gradual migration
        - Unique to prevent duplicate mappings

  ## Notes
  - Recipes without sischef_external_id cannot be sent to Sischef ERP
  - Manual synchronization will be done initially
  - Unique constraint ensures one-to-one mapping between systems
*/

-- Add sischef_external_id field to recipes table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recipes' AND column_name = 'sischef_external_id'
  ) THEN
    ALTER TABLE recipes ADD COLUMN sischef_external_id text UNIQUE;
    
    -- Add index for faster lookups
    CREATE INDEX IF NOT EXISTS idx_recipes_sischef_external_id 
    ON recipes(sischef_external_id) 
    WHERE sischef_external_id IS NOT NULL;
    
    -- Add comment for documentation
    COMMENT ON COLUMN recipes.sischef_external_id IS 
    'External ID from Sischef ERP system used for fiscal integration and order synchronization';
  END IF;
END $$;