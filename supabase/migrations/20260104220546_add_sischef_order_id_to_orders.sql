/*
  # Adicionar ID do pedido no Sischef
  
  1. Alterações
    - Adiciona coluna `sischef_order_id` na tabela `orders`
      - Tipo: text (pode ser nulo)
      - Usado para rastrear o ID retornado pelo Sischef após envio
      - Permite verificar se um pedido já foi enviado
      - Facilita atualizações futuras do pedido no Sischef
  
  2. Notas
    - Campo nullable para suportar pedidos antigos
    - Permite re-envio caso o valor seja atualizado
*/

-- Adicionar coluna para armazenar o ID do pedido no Sischef
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'sischef_order_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN sischef_order_id text;
  END IF;
END $$;

-- Criar índice para melhor performance em consultas
CREATE INDEX IF NOT EXISTS idx_orders_sischef_order_id ON orders(sischef_order_id) WHERE sischef_order_id IS NOT NULL;