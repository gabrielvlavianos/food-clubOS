/*
  # Tornar campos de receitas opcionais na tabela orders

  ## Alterações
  1. Tornar colunas de recipe_id nullable
     - `protein_recipe_id` - pode ser null quando há modificação customizada
     - `carb_recipe_id` - pode ser null quando há modificação customizada
     - `vegetable_recipe_id` - pode ser null quando há modificação customizada
     - `salad_recipe_id` - pode ser null quando há modificação customizada
     - `sauce_recipe_id` - pode ser null quando há modificação customizada
     - `protein_amount_gr` - pode ser null
     - `carb_amount_gr` - pode ser null
     - `vegetable_amount_gr` - pode ser null
     - `salad_amount_gr` - pode ser null
     - `sauce_amount_gr` - pode ser null

  ## Justificativa
  Esses campos devem ser opcionais porque:
  - Pedidos podem vir da planilha com modificações em texto livre
  - Pedidos cancelados não precisam ter receitas definidas
  - Permite maior flexibilidade na criação de pedidos
*/

ALTER TABLE orders 
  ALTER COLUMN protein_recipe_id DROP NOT NULL,
  ALTER COLUMN carb_recipe_id DROP NOT NULL,
  ALTER COLUMN vegetable_recipe_id DROP NOT NULL,
  ALTER COLUMN salad_recipe_id DROP NOT NULL,
  ALTER COLUMN sauce_recipe_id DROP NOT NULL,
  ALTER COLUMN protein_amount_gr DROP NOT NULL,
  ALTER COLUMN carb_amount_gr DROP NOT NULL,
  ALTER COLUMN vegetable_amount_gr DROP NOT NULL,
  ALTER COLUMN salad_amount_gr DROP NOT NULL,
  ALTER COLUMN sauce_amount_gr DROP NOT NULL;