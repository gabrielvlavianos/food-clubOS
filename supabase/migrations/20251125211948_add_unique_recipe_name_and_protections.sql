/*
  # Add Recipe Name Uniqueness and Protection Against Deletion

  1. Changes
    - Add UNIQUE constraint to recipes.name (case-insensitive)
    - Merge duplicate recipes by keeping the oldest one
    - Update all orders to reference the kept recipe
    - Add database function to prevent deletion of recipes in use
    - Add helper function to find recipe by name (case-insensitive)

  2. Security & Data Integrity
    - Prevents accidental deletion of recipes that are being used
    - Prevents creation of duplicate recipe names
    - Maintains referential integrity across orders
    
  3. Important Notes
    - Before adding UNIQUE constraint, this migration identifies and merges duplicates
    - All orders using duplicate recipes are updated to use the kept recipe
    - Only recipes with no dependencies can be deleted after this migration
*/

-- Step 1: Create a helper function to find recipe by name (case-insensitive)
CREATE OR REPLACE FUNCTION find_recipe_by_name(recipe_name text)
RETURNS uuid AS $$
DECLARE
  recipe_id uuid;
BEGIN
  SELECT id INTO recipe_id
  FROM recipes
  WHERE LOWER(TRIM(name)) = LOWER(TRIM(recipe_name))
  LIMIT 1;
  
  RETURN recipe_id;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Identify and merge duplicate recipes
-- Keep the oldest recipe (by created_at) and update all references
DO $$
DECLARE
  duplicate_record RECORD;
  keep_id uuid;
  duplicate_ids uuid[];
BEGIN
  -- Find all duplicate recipe names (case-insensitive)
  FOR duplicate_record IN 
    SELECT LOWER(TRIM(name)) as normalized_name, COUNT(*) as count
    FROM recipes
    GROUP BY LOWER(TRIM(name))
    HAVING COUNT(*) > 1
  LOOP
    -- Get the oldest recipe to keep
    SELECT id INTO keep_id
    FROM recipes
    WHERE LOWER(TRIM(name)) = duplicate_record.normalized_name
    ORDER BY created_at ASC
    LIMIT 1;
    
    -- Get all duplicate IDs (except the one we're keeping)
    SELECT ARRAY_AGG(id) INTO duplicate_ids
    FROM recipes
    WHERE LOWER(TRIM(name)) = duplicate_record.normalized_name
    AND id != keep_id;
    
    -- Update all orders that reference duplicate recipes
    UPDATE orders SET protein_recipe_id = keep_id 
    WHERE protein_recipe_id = ANY(duplicate_ids);
    
    UPDATE orders SET carb_recipe_id = keep_id 
    WHERE carb_recipe_id = ANY(duplicate_ids);
    
    UPDATE orders SET vegetable_recipe_id = keep_id 
    WHERE vegetable_recipe_id = ANY(duplicate_ids);
    
    UPDATE orders SET salad_recipe_id = keep_id 
    WHERE salad_recipe_id = ANY(duplicate_ids);
    
    UPDATE orders SET sauce_recipe_id = keep_id 
    WHERE sauce_recipe_id = ANY(duplicate_ids);
    
    -- Delete the duplicate recipes
    DELETE FROM recipes WHERE id = ANY(duplicate_ids);
    
    RAISE NOTICE 'Merged duplicates for recipe: %, kept ID: %, removed % duplicates', 
      duplicate_record.normalized_name, keep_id, array_length(duplicate_ids, 1);
  END LOOP;
END $$;

-- Step 3: Add UNIQUE constraint on recipe name (case-insensitive)
-- First, create a unique index that handles case-insensitivity
CREATE UNIQUE INDEX IF NOT EXISTS idx_recipes_name_unique 
ON recipes (LOWER(TRIM(name)));

-- Step 4: Create function to check if recipe is in use
CREATE OR REPLACE FUNCTION is_recipe_in_use(recipe_id_param uuid)
RETURNS boolean AS $$
DECLARE
  order_count integer;
BEGIN
  SELECT COUNT(*) INTO order_count
  FROM orders
  WHERE protein_recipe_id = recipe_id_param
     OR carb_recipe_id = recipe_id_param
     OR vegetable_recipe_id = recipe_id_param
     OR salad_recipe_id = recipe_id_param
     OR sauce_recipe_id = recipe_id_param;
  
  RETURN order_count > 0;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create trigger to prevent deletion of recipes in use
CREATE OR REPLACE FUNCTION prevent_recipe_deletion_if_in_use()
RETURNS TRIGGER AS $$
BEGIN
  IF is_recipe_in_use(OLD.id) THEN
    RAISE EXCEPTION 'Cannot delete recipe "%" because it is being used in existing orders', OLD.name;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists and create it
DROP TRIGGER IF EXISTS check_recipe_usage_before_delete ON recipes;
CREATE TRIGGER check_recipe_usage_before_delete
  BEFORE DELETE ON recipes
  FOR EACH ROW
  EXECUTE FUNCTION prevent_recipe_deletion_if_in_use();

-- Step 6: Add comment to recipes table explaining the constraint
COMMENT ON INDEX idx_recipes_name_unique IS 
  'Ensures recipe names are unique (case-insensitive). Prevents duplicate recipes in the system.';

COMMENT ON FUNCTION find_recipe_by_name IS 
  'Helper function to find a recipe ID by name (case-insensitive). Returns NULL if not found.';

COMMENT ON FUNCTION is_recipe_in_use IS 
  'Checks if a recipe is being referenced in any orders. Used to prevent deletion of recipes in use.';
