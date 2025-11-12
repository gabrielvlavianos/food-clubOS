/*
  # Sistema de Pedidos e Planos Nutricionais

  1. Nova Tabela `nutrition_plans`
    - Planos nutricionais dos clientes com targets diários
    - Campos: calorias, proteína, carboidrato, gordura (todos targets)
    - Relacionamento com customers (um para um)

  2. Nova Tabela `orders`
    - Pedidos diários dos clientes
    - Relacionamento com customer e delivery_schedule
    - Campos: data, turno, status, receitas selecionadas com quantidades
    - Flags: recebe_talheres

  3. Nova Tabela `order_items`
    - Itens de cada pedido (receitas com quantidades)
    - Relacionamento com orders e recipes
    - Campos: categoria da receita, quantidade em gramas

  4. Segurança
    - RLS ativado em todas as tabelas
    - Políticas para usuários autenticados
*/

-- Tabela de Planos Nutricionais
CREATE TABLE IF NOT EXISTS nutrition_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  target_calories NUMERIC NOT NULL DEFAULT 0,
  target_protein_g NUMERIC NOT NULL DEFAULT 0,
  target_carbs_g NUMERIC NOT NULL DEFAULT 0,
  target_fat_g NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(customer_id)
);

-- Tabela de Pedidos
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  delivery_schedule_id UUID NOT NULL REFERENCES delivery_schedules(id) ON DELETE CASCADE,
  order_date DATE NOT NULL,
  meal_type TEXT NOT NULL,
  delivery_time TEXT,
  delivery_address TEXT,
  cutlery_needed BOOLEAN DEFAULT false,
  motoboy_request_time TEXT,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_meal_type CHECK (meal_type IN ('lunch', 'dinner')),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'preparing', 'ready', 'delivered', 'cancelled'))
);

-- Tabela de Itens do Pedido
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE RESTRICT,
  recipe_category TEXT NOT NULL,
  quantity_grams NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_category CHECK (recipe_category IN ('Proteína', 'Carboidrato', 'Legumes', 'Salada', 'Marinada', 'Molho'))
);

-- Habilitar RLS
ALTER TABLE nutrition_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Políticas para nutrition_plans
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'nutrition_plans' 
    AND policyname = 'Usuários autenticados podem visualizar planos'
  ) THEN
    CREATE POLICY "Usuários autenticados podem visualizar planos"
      ON nutrition_plans FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'nutrition_plans' 
    AND policyname = 'Usuários autenticados podem inserir planos'
  ) THEN
    CREATE POLICY "Usuários autenticados podem inserir planos"
      ON nutrition_plans FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'nutrition_plans' 
    AND policyname = 'Usuários autenticados podem atualizar planos'
  ) THEN
    CREATE POLICY "Usuários autenticados podem atualizar planos"
      ON nutrition_plans FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'nutrition_plans' 
    AND policyname = 'Usuários autenticados podem deletar planos'
  ) THEN
    CREATE POLICY "Usuários autenticados podem deletar planos"
      ON nutrition_plans FOR DELETE
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Políticas para orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'orders' 
    AND policyname = 'Usuários autenticados podem visualizar pedidos'
  ) THEN
    CREATE POLICY "Usuários autenticados podem visualizar pedidos"
      ON orders FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'orders' 
    AND policyname = 'Usuários autenticados podem inserir pedidos'
  ) THEN
    CREATE POLICY "Usuários autenticados podem inserir pedidos"
      ON orders FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'orders' 
    AND policyname = 'Usuários autenticados podem atualizar pedidos'
  ) THEN
    CREATE POLICY "Usuários autenticados podem atualizar pedidos"
      ON orders FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'orders' 
    AND policyname = 'Usuários autenticados podem deletar pedidos'
  ) THEN
    CREATE POLICY "Usuários autenticados podem deletar pedidos"
      ON orders FOR DELETE
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Políticas para order_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'order_items' 
    AND policyname = 'Usuários autenticados podem visualizar itens'
  ) THEN
    CREATE POLICY "Usuários autenticados podem visualizar itens"
      ON order_items FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'order_items' 
    AND policyname = 'Usuários autenticados podem inserir itens'
  ) THEN
    CREATE POLICY "Usuários autenticados podem inserir itens"
      ON order_items FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'order_items' 
    AND policyname = 'Usuários autenticados podem atualizar itens'
  ) THEN
    CREATE POLICY "Usuários autenticados podem atualizar itens"
      ON order_items FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'order_items' 
    AND policyname = 'Usuários autenticados podem deletar itens'
  ) THEN
    CREATE POLICY "Usuários autenticados podem deletar itens"
      ON order_items FOR DELETE
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_nutrition_plans_customer ON nutrition_plans(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_date_meal ON orders(order_date, meal_type);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_schedule ON orders(delivery_schedule_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_recipe ON order_items(recipe_id);
