/*
  # Add Calorie Base Option to Macro Settings

  1. Purpose
    - Allow choosing between TMB or GET Ajustado as the base for meal calorie calculations
    - Provides flexibility for testing different calculation approaches
    
  2. Changes
    - Add `calorie_base` field to macro_calculation_settings
    - Options: 'tmb' or 'get' (default: 'get')
    
  3. Impact
    - When 'tmb': Kcal por Refeição = TMB × % Refeição × % Nº Refeições
    - When 'get': Kcal por Refeição = GET Ajustado × % Refeição × % Nº Refeições
*/

-- Add calorie_base column
ALTER TABLE macro_calculation_settings 
ADD COLUMN IF NOT EXISTS calorie_base text DEFAULT 'get' NOT NULL
CHECK (calorie_base IN ('tmb', 'get'));