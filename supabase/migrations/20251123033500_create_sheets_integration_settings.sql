/*
  # Configurações da Integração com Google Sheets

  1. Novas Configurações
    - Adiciona configurações específicas para a integração com Google Sheets:
      - `sheets_spreadsheet_id` - ID da planilha do Google Sheets
      - `sheets_sheet_name` - Nome da aba da planilha
      - `sheets_api_key` - API Key do Google Cloud
      - `sheets_last_export_lunch` - Data/hora da última exportação (almoço)
      - `sheets_last_export_dinner` - Data/hora da última exportação (jantar)
      - `sheets_last_import_lunch` - Data/hora da última importação (almoço)
      - `sheets_last_import_dinner` - Data/hora da última importação (jantar)

  2. Security
    - Usa a tabela settings existente com RLS já configurado
*/

-- Inserir configurações padrão para Google Sheets
INSERT INTO settings (key, value) VALUES
  ('sheets_spreadsheet_id', '1WRGQYiyH9FuNJ-APBtZOj_oifKv6RLEwN-XaBi_S7ro'),
  ('sheets_sheet_name', 'Pedidos Diários'),
  ('sheets_api_key', 'AIzaSyDOwr3OghzzSyzWcfZQlYX5bi4k_JjVfPU'),
  ('sheets_last_export_lunch', ''),
  ('sheets_last_export_dinner', ''),
  ('sheets_last_import_lunch', ''),
  ('sheets_last_import_dinner', '')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value;
