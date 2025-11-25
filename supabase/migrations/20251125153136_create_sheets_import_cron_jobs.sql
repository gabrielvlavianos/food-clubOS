/*
  # Create Scheduled Jobs for Google Sheets Import

  1. Overview
    - Creates 6 cron jobs to automatically import order modifications from Google Sheets
    - Lunch: 10:00, 10:30, 11:00 (Brazil time)
    - Dinner: 16:00, 16:30, 17:00 (Brazil time)
  
  2. Schedule Details
    - All jobs run in America/Sao_Paulo timezone
    - Each job imports changes for specific meal type (lunch or dinner)
    - Jobs call the import-orders-from-sheets edge function
  
  3. Important Notes
    - Jobs will only run if Google Sheets is configured in settings
    - Imports customer modifications: address, time, protein, carbs
    - Handles order cancellations when "Novo Endereço" = "Cancelado"
*/

SELECT cron.schedule(
  'import-lunch-orders-10am',
  '0 10 * * *',
  $$
  SELECT
    net.http_post(
      url := (SELECT current_setting('app.settings.supabase_url', true)) || '/functions/v1/import-orders-from-sheets',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT current_setting('app.settings.supabase_service_role_key', true))
      ),
      body := jsonb_build_object(
        'date', CURRENT_DATE::text,
        'mealType', 'lunch'
      )
    ) AS request_id;
  $$
);

SELECT cron.schedule(
  'import-lunch-orders-1030am',
  '30 10 * * *',
  $$
  SELECT
    net.http_post(
      url := (SELECT current_setting('app.settings.supabase_url', true)) || '/functions/v1/import-orders-from-sheets',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT current_setting('app.settings.supabase_service_role_key', true))
      ),
      body := jsonb_build_object(
        'date', CURRENT_DATE::text,
        'mealType', 'lunch'
      )
    ) AS request_id;
  $$
);

SELECT cron.schedule(
  'import-lunch-orders-11am',
  '0 11 * * *',
  $$
  SELECT
    net.http_post(
      url := (SELECT current_setting('app.settings.supabase_url', true)) || '/functions/v1/import-orders-from-sheets',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT current_setting('app.settings.supabase_service_role_key', true))
      ),
      body := jsonb_build_object(
        'date', CURRENT_DATE::text,
        'mealType', 'lunch'
      )
    ) AS request_id;
  $$
);

SELECT cron.schedule(
  'import-dinner-orders-4pm',
  '0 16 * * *',
  $$
  SELECT
    net.http_post(
      url := (SELECT current_setting('app.settings.supabase_url', true)) || '/functions/v1/import-orders-from-sheets',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT current_setting('app.settings.supabase_service_role_key', true))
      ),
      body := jsonb_build_object(
        'date', CURRENT_DATE::text,
        'mealType', 'dinner'
      )
    ) AS request_id;
  $$
);

SELECT cron.schedule(
  'import-dinner-orders-430pm',
  '30 16 * * *',
  $$
  SELECT
    net.http_post(
      url := (SELECT current_setting('app.settings.supabase_url', true)) || '/functions/v1/import-orders-from-sheets',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT current_setting('app.settings.supabase_service_role_key', true))
      ),
      body := jsonb_build_object(
        'date', CURRENT_DATE::text,
        'mealType', 'dinner'
      )
    ) AS request_id;
  $$
);

SELECT cron.schedule(
  'import-dinner-orders-5pm',
  '0 17 * * *',
  $$
  SELECT
    net.http_post(
      url := (SELECT current_setting('app.settings.supabase_url', true)) || '/functions/v1/import-orders-from-sheets',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT current_setting('app.settings.supabase_service_role_key', true))
      ),
      body := jsonb_build_object(
        'date', CURRENT_DATE::text,
        'mealType', 'dinner'
      )
    ) AS request_id;
  $$
);
