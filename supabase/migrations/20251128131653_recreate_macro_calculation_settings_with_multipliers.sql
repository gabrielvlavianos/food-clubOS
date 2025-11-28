/*
  # Recreate Macro Calculation Settings with Correct Multiplier Logic

  1. Purpose
    - Replace additive factors with multiplicative factors
    - Align with proper GET calculation: TMB × Rotina × Aeróbico × Musculação × Objetivo
    - Store frequency×intensity matrices for aerobic and strength training
    
  2. Changes
    - Drop existing macro_calculation_settings table
    - Create new table with multiplier-based structure
    
  3. New Structure
    - Work routine multipliers (3 levels: Sedentary, Moderate, Very Active)
    - Aerobic activity matrix (frequency × intensity = 15 combinations)
    - Strength training matrix (frequency × intensity = 15 combinations)
    - Goal multipliers (4 objectives)
    - Protein targets (g/kg by goal)
    - Fat targets (g/kg by goal)
    - Meal distribution percentages
    
  4. Security
    - Enable RLS with read access for all
    - Update policy for authenticated users
*/

-- Drop existing table
DROP TABLE IF EXISTS macro_calculation_settings CASCADE;

-- Create new table with multiplier structure
CREATE TABLE macro_calculation_settings (
  id integer PRIMARY KEY DEFAULT 1,
  
  -- Work routine multipliers (TMB multipliers)
  work_sedentary numeric DEFAULT 1.0 NOT NULL,
  work_moderate_active numeric DEFAULT 1.05 NOT NULL,
  work_very_active numeric DEFAULT 1.2 NOT NULL,
  
  -- Aerobic activity multipliers (frequency × intensity)
  aerobic_none numeric DEFAULT 1.0 NOT NULL,
  aerobic_1_2_light numeric DEFAULT 1.03 NOT NULL,
  aerobic_1_2_moderate numeric DEFAULT 1.07 NOT NULL,
  aerobic_1_2_intense numeric DEFAULT 1.11 NOT NULL,
  aerobic_3_4_light numeric DEFAULT 1.08 NOT NULL,
  aerobic_3_4_moderate numeric DEFAULT 1.16 NOT NULL,
  aerobic_3_4_intense numeric DEFAULT 1.25 NOT NULL,
  aerobic_5_6_light numeric DEFAULT 1.12 NOT NULL,
  aerobic_5_6_moderate numeric DEFAULT 1.25 NOT NULL,
  aerobic_5_6_intense numeric DEFAULT 1.39 NOT NULL,
  aerobic_daily_light numeric DEFAULT 1.16 NOT NULL,
  aerobic_daily_moderate numeric DEFAULT 1.32 NOT NULL,
  aerobic_daily_intense numeric DEFAULT 1.50 NOT NULL,
  
  -- Strength training multipliers (frequency × intensity)
  strength_none numeric DEFAULT 1.0 NOT NULL,
  strength_1_2_light numeric DEFAULT 1.01 NOT NULL,
  strength_1_2_moderate numeric DEFAULT 1.03 NOT NULL,
  strength_1_2_intense numeric DEFAULT 1.06 NOT NULL,
  strength_3_4_light numeric DEFAULT 1.03 NOT NULL,
  strength_3_4_moderate numeric DEFAULT 1.08 NOT NULL,
  strength_3_4_intense numeric DEFAULT 1.13 NOT NULL,
  strength_5_6_light numeric DEFAULT 1.04 NOT NULL,
  strength_5_6_moderate numeric DEFAULT 1.12 NOT NULL,
  strength_5_6_intense numeric DEFAULT 1.21 NOT NULL,
  strength_daily_light numeric DEFAULT 1.05 NOT NULL,
  strength_daily_moderate numeric DEFAULT 1.16 NOT NULL,
  strength_daily_intense numeric DEFAULT 1.26 NOT NULL,
  
  -- Goal multipliers (GET multipliers)
  goal_muscle_gain_multiplier numeric DEFAULT 1.1 NOT NULL,
  goal_weight_loss_multiplier numeric DEFAULT 0.85 NOT NULL,
  goal_maintenance_multiplier numeric DEFAULT 1.0 NOT NULL,
  goal_performance_multiplier numeric DEFAULT 1.1 NOT NULL,
  
  -- Protein targets (g/kg of body weight)
  protein_muscle_gain numeric DEFAULT 2.2 NOT NULL,
  protein_weight_loss numeric DEFAULT 2.2 NOT NULL,
  protein_maintenance numeric DEFAULT 1.8 NOT NULL,
  protein_performance numeric DEFAULT 1.8 NOT NULL,
  
  -- Fat targets (g/kg of body weight)
  fat_muscle_gain numeric DEFAULT 0.8 NOT NULL,
  fat_weight_loss numeric DEFAULT 0.8 NOT NULL,
  fat_maintenance numeric DEFAULT 0.8 NOT NULL,
  fat_performance numeric DEFAULT 0.8 NOT NULL,
  
  -- Lunch vs Dinner distribution
  lunch_percentage numeric DEFAULT 0.55 NOT NULL,
  dinner_percentage numeric DEFAULT 0.45 NOT NULL,
  
  -- Meal distribution by meals per day
  meals_2_lunch_dinner_pct numeric DEFAULT 1.0 NOT NULL,
  meals_3_lunch_dinner_pct numeric DEFAULT 0.70 NOT NULL,
  meals_4_lunch_dinner_pct numeric DEFAULT 0.55 NOT NULL,
  meals_5plus_lunch_dinner_pct numeric DEFAULT 0.45 NOT NULL,
  
  updated_at timestamptz DEFAULT now() NOT NULL,
  
  CONSTRAINT single_row_check CHECK (id = 1)
);

-- Insert default settings
INSERT INTO macro_calculation_settings (id) VALUES (1);

-- Enable RLS
ALTER TABLE macro_calculation_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read settings
CREATE POLICY "Anyone can read macro calculation settings"
  ON macro_calculation_settings
  FOR SELECT
  USING (true);

-- Policy: Authenticated users can update settings
CREATE POLICY "Authenticated users can update macro calculation settings"
  ON macro_calculation_settings
  FOR UPDATE
  TO authenticated
  USING (id = 1)
  WITH CHECK (id = 1);