/*
  # Desabilitar RLS para acesso público total
  
  ATENÇÃO: Esta configuração desabilita TODAS as restrições de segurança.
  Apenas para desenvolvimento. Reativar antes de produção!
  
  Tabelas afetadas:
  - users, customers, addresses, recipes, prep_sessions, prep_items
  - settings, nutrition_plans, monthly_menu, orders, delivery_schedules
  - order_status, global_settings, customer_documents, macro_calculation_settings
*/

-- Desabilitar RLS em todas as tabelas
ALTER TABLE IF EXISTS users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS addresses DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS recipes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS prep_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS prep_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS nutrition_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS monthly_menu DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS delivery_schedules DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS order_status DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS global_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS customer_documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS macro_calculation_settings DISABLE ROW LEVEL SECURITY;
