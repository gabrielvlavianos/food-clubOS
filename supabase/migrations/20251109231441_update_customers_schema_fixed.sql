/*
  # Atualização do Schema de Clientes - Food Club OS

  1. Alterações na Tabela `customers`
    - Adiciona campos pessoais: `birth_date`, `phone`, `gender`, `height_cm`, `current_weight_kg`, `goal_weight_kg`
    - Adiciona campos da nutricionista: `nutritionist_name`, `nutritionist_phone`
    - Adiciona campos de objetivos e saúde: `main_goal`, `clinical_conditions`, `medication_use`
    - Adiciona campos nutricionais: `allergies`, `food_restrictions`, `meals_per_day`, `body_fat_percentage`, `skeletal_muscle_mass`
    - Adiciona campos de atividade física: `work_routine`, `aerobic_frequency`, `aerobic_intensity`, `strength_frequency`, `strength_intensity`

  2. Nova Tabela `delivery_schedules`
    - Armazena horários e endereços de entrega por dia da semana e refeição
    - Relacionamento com `customers` (cascade delete)
    - Campos: dia da semana, tipo de refeição (almoço/jantar), horário, endereço

  3. Segurança
    - RLS ativado em ambas as tabelas
    - Políticas para usuários autenticados
*/

-- Adicionar novos campos à tabela customers
DO $$
BEGIN
  -- Campos pessoais
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'phone') THEN
    ALTER TABLE customers ADD COLUMN phone TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'birth_date') THEN
    ALTER TABLE customers ADD COLUMN birth_date DATE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'gender') THEN
    ALTER TABLE customers ADD COLUMN gender TEXT;
  END IF;

  -- Nutricionista
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'nutritionist_name') THEN
    ALTER TABLE customers ADD COLUMN nutritionist_name TEXT DEFAULT 'não tenho';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'nutritionist_phone') THEN
    ALTER TABLE customers ADD COLUMN nutritionist_phone TEXT;
  END IF;

  -- Objetivo e saúde
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'main_goal') THEN
    ALTER TABLE customers ADD COLUMN main_goal TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'allergies') THEN
    ALTER TABLE customers ADD COLUMN allergies TEXT[] DEFAULT '{}';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'food_restrictions') THEN
    ALTER TABLE customers ADD COLUMN food_restrictions TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'clinical_conditions') THEN
    ALTER TABLE customers ADD COLUMN clinical_conditions TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'medication_use') THEN
    ALTER TABLE customers ADD COLUMN medication_use TEXT;
  END IF;

  -- Medidas corporais
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'height_cm') THEN
    ALTER TABLE customers ADD COLUMN height_cm NUMERIC;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'current_weight_kg') THEN
    ALTER TABLE customers ADD COLUMN current_weight_kg NUMERIC;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'goal_weight_kg') THEN
    ALTER TABLE customers ADD COLUMN goal_weight_kg NUMERIC;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'body_fat_percentage') THEN
    ALTER TABLE customers ADD COLUMN body_fat_percentage NUMERIC;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'skeletal_muscle_mass') THEN
    ALTER TABLE customers ADD COLUMN skeletal_muscle_mass NUMERIC;
  END IF;

  -- Atividade física e rotina
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'work_routine') THEN
    ALTER TABLE customers ADD COLUMN work_routine TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'aerobic_frequency') THEN
    ALTER TABLE customers ADD COLUMN aerobic_frequency TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'aerobic_intensity') THEN
    ALTER TABLE customers ADD COLUMN aerobic_intensity TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'strength_frequency') THEN
    ALTER TABLE customers ADD COLUMN strength_frequency TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'strength_intensity') THEN
    ALTER TABLE customers ADD COLUMN strength_intensity TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'meals_per_day') THEN
    ALTER TABLE customers ADD COLUMN meals_per_day INTEGER;
  END IF;
END $$;

-- Criar tabela de horários de entrega
CREATE TABLE IF NOT EXISTS delivery_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  day_of_week TEXT NOT NULL,
  meal_type TEXT NOT NULL,
  delivery_time TEXT,
  delivery_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_day CHECK (day_of_week IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
  CONSTRAINT valid_meal CHECK (meal_type IN ('lunch', 'dinner'))
);

-- Habilitar RLS na tabela delivery_schedules
ALTER TABLE delivery_schedules ENABLE ROW LEVEL SECURITY;

-- Criar políticas para delivery_schedules
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'delivery_schedules' 
    AND policyname = 'Usuários autenticados podem visualizar horários'
  ) THEN
    CREATE POLICY "Usuários autenticados podem visualizar horários"
      ON delivery_schedules FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'delivery_schedules' 
    AND policyname = 'Usuários autenticados podem inserir horários'
  ) THEN
    CREATE POLICY "Usuários autenticados podem inserir horários"
      ON delivery_schedules FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'delivery_schedules' 
    AND policyname = 'Usuários autenticados podem atualizar horários'
  ) THEN
    CREATE POLICY "Usuários autenticados podem atualizar horários"
      ON delivery_schedules FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'delivery_schedules' 
    AND policyname = 'Usuários autenticados podem deletar horários'
  ) THEN
    CREATE POLICY "Usuários autenticados podem deletar horários"
      ON delivery_schedules FOR DELETE
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_delivery_schedules_customer_id ON delivery_schedules(customer_id);
CREATE INDEX IF NOT EXISTS idx_delivery_schedules_day_meal ON delivery_schedules(day_of_week, meal_type);
