-- Script para consolidar registros duplicados de clientes
-- Mantém o registro com ID menor (mais antigo) e transfere todos os dados relacionados

DO $$
DECLARE
  duplicate_record RECORD;
  keep_id UUID;
  remove_id UUID;
BEGIN
  -- Para cada grupo de duplicados
  FOR duplicate_record IN 
    SELECT 
      LOWER(TRIM(name)) as normalized_name,
      ARRAY_AGG(id ORDER BY created_at) as ids
    FROM customers
    GROUP BY LOWER(TRIM(name))
    HAVING COUNT(*) > 1
  LOOP
    -- Manter o primeiro registro (mais antigo)
    keep_id := duplicate_record.ids[1];
    
    -- Para cada registro duplicado (exceto o primeiro)
    FOR i IN 2..ARRAY_LENGTH(duplicate_record.ids, 1) LOOP
      remove_id := duplicate_record.ids[i];
      
      RAISE NOTICE 'Consolidando % -> %', remove_id, keep_id;
      
      -- Transferir delivery_schedules
      UPDATE delivery_schedules 
      SET customer_id = keep_id 
      WHERE customer_id = remove_id;
      
      -- Transferir orders
      UPDATE orders 
      SET customer_id = keep_id 
      WHERE customer_id = remove_id;
      
      -- Transferir order_status
      UPDATE order_status 
      SET customer_id = keep_id 
      WHERE customer_id = remove_id;
      
      -- Transferir customer_documents
      UPDATE customer_documents 
      SET customer_id = keep_id 
      WHERE customer_id = remove_id;
      
      -- Deletar o registro duplicado
      DELETE FROM customers WHERE id = remove_id;
    END LOOP;
  END LOOP;
END $$;
