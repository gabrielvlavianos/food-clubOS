/*
  # Criar tabela de documentos de clientes

  ## Descrição
  Cria uma tabela para armazenar múltiplos documentos anexados por cliente,
  incluindo planos alimentares, exames, prescrições, etc.

  ## Novas Tabelas
    - `customer_documents`
      - `id` (uuid, chave primária)
      - `customer_id` (uuid, referência para customers)
      - `file_name` (text) - Nome original do arquivo
      - `file_url` (text) - URL pública do arquivo
      - `file_type` (text) - Tipo do documento (meal_plan, exam, prescription, other)
      - `description` (text, opcional) - Descrição do documento
      - `uploaded_at` (timestamp) - Data de upload
      - `uploaded_by` (text, opcional) - Quem fez o upload

  ## Segurança
    - RLS habilitado
    - Políticas para acesso público de leitura (operacional)
*/

-- Criar tabela de documentos de clientes
CREATE TABLE IF NOT EXISTS customer_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text NOT NULL DEFAULT 'other',
  description text,
  uploaded_at timestamptz DEFAULT now(),
  uploaded_by text
);

-- Criar índice para busca rápida por cliente
CREATE INDEX IF NOT EXISTS idx_customer_documents_customer_id 
  ON customer_documents(customer_id);

-- Habilitar RLS
ALTER TABLE customer_documents ENABLE ROW LEVEL SECURITY;

-- Política de leitura pública (para operação)
CREATE POLICY "Permitir leitura pública de documentos"
  ON customer_documents
  FOR SELECT
  TO public
  USING (true);

-- Política de inserção pública (para operação)
CREATE POLICY "Permitir inserção pública de documentos"
  ON customer_documents
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Política de atualização pública (para operação)
CREATE POLICY "Permitir atualização pública de documentos"
  ON customer_documents
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Política de exclusão pública (para operação)
CREATE POLICY "Permitir exclusão pública de documentos"
  ON customer_documents
  FOR DELETE
  TO public
  USING (true);
