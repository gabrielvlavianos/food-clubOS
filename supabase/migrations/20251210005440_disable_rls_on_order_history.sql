/*
  # Desabilitar RLS na tabela order_history
  
  1. Problema
    - A tabela order_history foi criada após a migração que desabilitou RLS nas outras tabelas
    - Ela está com RLS habilitado mas só tem políticas de SELECT e INSERT
    - Operações de DELETE estão sendo bloqueadas
  
  2. Solução
    - Desabilitar RLS na tabela order_history para manter consistência com as outras tabelas
    - Isso permitirá operações de DELETE sem restrições
  
  3. Nota
    - Esta configuração é para desenvolvimento
    - Em produção, deve-se reabilitar RLS com políticas apropriadas
*/

ALTER TABLE IF EXISTS order_history DISABLE ROW LEVEL SECURITY;
