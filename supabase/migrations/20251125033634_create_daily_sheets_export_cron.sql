/*
  # Create Daily Google Sheets Export Cron Job
  
  1. Overview
    - Creates a cron job that runs daily at 8 AM Brasília time (11 AM UTC)
    - Exports both lunch and dinner orders to Google Sheets
    - Uses pg_cron extension for scheduled tasks
  
  2. Schedule
    - Time: 8:00 AM Brasília time (GMT-3)
    - Frequency: Daily
    - Tasks: Export lunch and dinner orders for current day
  
  3. Implementation
    - Enables pg_cron extension
    - Creates function to call Edge Function via HTTP
    - Schedules daily execution
*/

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;

-- Create function to export orders to Google Sheets
CREATE OR REPLACE FUNCTION export_daily_orders_to_sheets()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  today_date TEXT;
  supabase_url TEXT;
  supabase_anon_key TEXT;
BEGIN
  -- Get today's date in format YYYY-MM-DD
  today_date := TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD');
  
  -- Get Supabase credentials from settings or use env variables
  supabase_url := current_setting('app.supabase_url', true);
  supabase_anon_key := current_setting('app.supabase_anon_key', true);
  
  -- If not set in settings, these should be set as environment variables
  IF supabase_url IS NULL THEN
    supabase_url := 'https://yqbcuqmrdrwzyttvqkok.supabase.co';
  END IF;
  
  IF supabase_anon_key IS NULL THEN
    supabase_anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxYmN1cW1yZHJ3enl0dHZxa29rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3MjI3OTUsImV4cCI6MjA3ODI5ODc5NX0.hIG34aV9PUDIaOop5hMI0wZj8Jm2XVvBBcuruVEdtqc';
  END IF;
  
  -- Call Edge Function for lunch
  PERFORM net.http_post(
    url := supabase_url || '/functions/v1/export-orders-to-sheets',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || supabase_anon_key
    ),
    body := jsonb_build_object(
      'date', today_date,
      'mealType', 'lunch'
    )
  );
  
  -- Call Edge Function for dinner
  PERFORM net.http_post(
    url := supabase_url || '/functions/v1/export-orders-to-sheets',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || supabase_anon_key
    ),
    body := jsonb_build_object(
      'date', today_date,
      'mealType', 'dinner'
    )
  );
  
  RAISE NOTICE 'Daily orders exported to Google Sheets for date: %', today_date;
END;
$$;

-- Schedule the job to run daily at 8 AM Brasília time (11 AM UTC)
-- Note: Brasília is UTC-3, so 8 AM Brasília = 11 AM UTC
SELECT cron.schedule(
  'daily-sheets-export',
  '0 11 * * *',
  'SELECT export_daily_orders_to_sheets();'
);

-- Verify the cron job was created
SELECT * FROM cron.job WHERE jobname = 'daily-sheets-export';
