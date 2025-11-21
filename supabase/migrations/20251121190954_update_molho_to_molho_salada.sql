/*
  # Atualizar categoria "Molho" para "Molho Salada"

  1. Alterações
    - Atualiza todas as receitas com categoria "Molho" para "Molho Salada"
    - Atualiza constraint na tabela recipes para aceitar "Molho Salada"
    - Mantém compatibilidade com dados existentes

  2. Segurança
    - Operação segura que apenas renomeia categoria
    - Não remove dados
*/

-- Remover constraint antiga
ALTER TABLE recipes DROP CONSTRAINT IF EXISTS recipes_category_check;

-- Adicionar nova constraint com "Molho Salada"
ALTER TABLE recipes 
ADD CONSTRAINT recipes_category_check 
CHECK (category = ANY (ARRAY['Proteína'::text, 'Carboidrato'::text, 'Legumes'::text, 'Salada'::text, 'Marinada'::text, 'Molho Salada'::text]));

-- Atualizar receitas existentes que usam "Molho" para "Molho Salada"
UPDATE recipes 
SET category = 'Molho Salada' 
WHERE category = 'Molho';
