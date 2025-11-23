/*
  # Adicionar status 'cancelled' aos pedidos

  1. Alterações
    - Adiciona o status 'cancelled' aos valores aceitos no campo status da tabela orders
    - Adiciona campo sauce_amount_gr caso não exista

  2. Security
    - Mantém as políticas RLS existentes
*/

-- Adicionar campo sauce_amount_gr se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'sauce_amount_gr'
  ) THEN
    ALTER TABLE orders ADD COLUMN sauce_amount_gr numeric CHECK (sauce_amount_gr IS NULL OR sauce_amount_gr >= 0);
  END IF;
END $$;

-- Atualizar constraint de status para incluir 'cancelled'
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN ('pending', 'preparing', 'ready', 'delivered', 'cancelled'));
