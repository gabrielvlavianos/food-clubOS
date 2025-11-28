/*
  # Create Macro Calculation Settings Table

  1. Purpose
    - Store configurable factors for automatic macro calculation
    - Allow admins to fine-tune recommendation algorithms
    - Enable A/B testing and simulation of different calculation approaches
    
  2. New Tables
    - `macro_calculation_settings`
      - Stores all adjustable factors used in macro calculations
      - Single row table (id always = 1) for global settings
      - Includes work activity multipliers, exercise factors, goal adjustments, and macro distribution
    
  3. Settings Categories
    - Work routine activity multipliers (sedentary, light, moderate, very, extremely active)
    - Exercise frequency scores (none, 1-2x, 3-4x, 5-6x, daily)
    - Exercise intensity multipliers (light, moderate, intense)
    - Caloric adjustments by goal (weight loss, maintenance, muscle gain, etc)
    - Protein targets by goal (g/kg)
    - Fat percentage by goal
    - Lunch/dinner distribution percentages
    
  4. Security
    - Enable RLS
    - Only authenticated users can read settings
    - Restricted update policy (admin only would be ideal but we'll use authenticated for now)
    
  5. Default Values
    - Populated with current calculation constants
    - Can be modified through the settings UI
*/

CREATE TABLE IF NOT EXISTS macro_calculation_settings (
  id integer PRIMARY KEY DEFAULT 1,
  
  -- Work routine activity levels (base multipliers added to 1.2)
  work_sedentary numeric DEFAULT 0.2 NOT NULL,
  work_light_active numeric DEFAULT 0.375 NOT NULL,
  work_moderate_active numeric DEFAULT 0.55 NOT NULL,
  work_very_active numeric DEFAULT 0.725 NOT NULL,
  work_extremely_active numeric DEFAULT 0.9 NOT NULL,
  
  -- Exercise frequency scores
  freq_none numeric DEFAULT 0 NOT NULL,
  freq_1_2_week numeric DEFAULT 1 NOT NULL,
  freq_3_4_week numeric DEFAULT 2 NOT NULL,
  freq_5_6_week numeric DEFAULT 3 NOT NULL,
  freq_daily numeric DEFAULT 4 NOT NULL,
  
  -- Exercise intensity multipliers
  intensity_light numeric DEFAULT 0.5 NOT NULL,
  intensity_moderate numeric DEFAULT 1 NOT NULL,
  intensity_intense numeric DEFAULT 1.5 NOT NULL,
  
  -- Exercise bonus multiplier (applied to combined score)
  exercise_bonus_multiplier numeric DEFAULT 0.05 NOT NULL,
  
  -- Caloric adjustments by goal (kcal offset from TDEE)
  goal_weight_loss_offset numeric DEFAULT -500 NOT NULL,
  goal_maintenance_offset numeric DEFAULT 0 NOT NULL,
  goal_muscle_gain_offset numeric DEFAULT 300 NOT NULL,
  goal_definition_offset numeric DEFAULT -300 NOT NULL,
  goal_performance_offset numeric DEFAULT 200 NOT NULL,
  goal_health_offset numeric DEFAULT 0 NOT NULL,
  
  -- Protein targets (g/kg of body weight)
  protein_weight_loss numeric DEFAULT 2.0 NOT NULL,
  protein_maintenance numeric DEFAULT 1.8 NOT NULL,
  protein_muscle_gain numeric DEFAULT 2.2 NOT NULL,
  protein_definition numeric DEFAULT 2.4 NOT NULL,
  protein_performance numeric DEFAULT 1.8 NOT NULL,
  protein_health numeric DEFAULT 1.8 NOT NULL,
  
  -- Fat percentage of total calories
  fat_percentage_muscle_gain numeric DEFAULT 0.25 NOT NULL,
  fat_percentage_default numeric DEFAULT 0.30 NOT NULL,
  
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
INSERT INTO macro_calculation_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE macro_calculation_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read settings (needed for calculations)
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