import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

async function getAccessToken(serviceAccount: any): Promise<string> {
  const header = {
    alg: 'RS256',
    typ: 'JWT',
    kid: serviceAccount.private_key_id,
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const signatureInput = `${headerB64}.${payloadB64}`;
  const privateKey = serviceAccount.private_key;

  const pemHeader = '-----BEGIN PRIVATE KEY-----';
  const pemFooter = '-----END PRIVATE KEY-----';
  const pemContents = privateKey.substring(
    pemHeader.length,
    privateKey.length - pemFooter.length
  ).replace(/\s/g, '');

  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    encoder.encode(signatureInput)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const jwt = `${signatureInput}.${signatureB64}`;

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { date, mealType } = await req.json();

    if (!date || !mealType) {
      return new Response(
        JSON.stringify({ error: 'date and mealType are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: settingsData, error: settingsError } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['sheets_spreadsheet_id', 'sheets_service_account']);

    if (settingsError || !settingsData || settingsData.length < 2) {
      return new Response(
        JSON.stringify({ error: 'Google Sheets não configurado' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const settingsMap = Object.fromEntries(
      settingsData.map((s: any) => [s.key, s.value])
    );

    const spreadsheetId = settingsMap.sheets_spreadsheet_id;
    const serviceAccount = JSON.parse(settingsMap.sheets_service_account);

    const accessToken = await getAccessToken(serviceAccount);

    const sheetName = mealType === 'lunch' ? 'ALMOCO' : 'JANTAR';
    const range = `${sheetName}!A3:O`;

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Sheets API error:', errorText);
      return new Response(
        JSON.stringify({ error: `Erro ao buscar dados do Google Sheets: ${errorText}` }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const data = await response.json();
    const rows = data.values || [];

    console.log(`Found ${rows.length} rows in sheet ${sheetName}`);

    let updatedCount = 0;
    let cancelledCount = 0;
    const debugLog: any[] = [];

    for (const row of rows) {
      const name = row[1];
      const phone = row[2];
      const newAddress = row[6];
      const newProtein = row[8];
      const newVegetables = row[9];
      const newStarch = row[10];
      const newSauce = row[11];
      const newFruit = row[12];
      const newFat = row[13];
      const newCarb = row[14];

      console.log(`Processing row: ${name}, ${phone}, newAddress: ${newAddress}, newProtein: ${newProtein}`);

      if (!phone || !name) {
        console.log(`Skipping row - missing phone or name`);
        continue;
      }

      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('id')
        .eq('phone', phone)
        .maybeSingle();

      if (!customer) {
        console.log(`Customer not found for phone: ${phone}`);
        debugLog.push({ name, phone, status: 'customer_not_found' });
        continue;
      }

      console.log(`Found customer: ${customer.id}`);

      const { data: existingOrder } = await supabase
        .from('orders')
        .select('id')
        .eq('customer_id', customer.id)
        .eq('order_date', date)
        .eq('meal_type', mealType)
        .maybeSingle();

      const jsDay = new Date(date).getDay();
      const dayOfWeek = jsDay === 0 ? 7 : jsDay;

      const { data: customerSchedule } = await supabase
        .from('delivery_schedules')
        .select('*')
        .eq('customer_id', customer.id)
        .eq('day_of_week', dayOfWeek)
        .eq('meal_type', mealType)
        .eq('is_active', true)
        .maybeSingle();

      if (!customerSchedule) {
        console.log(`No delivery schedule found for customer: ${customer.id} on day ${dayOfWeek} (JS: ${jsDay}) for ${mealType}`);
        debugLog.push({ name, phone, status: 'no_schedule', dayOfWeek, jsDay, mealType });
        continue;
      }

      console.log(`Found schedule, existing order: ${existingOrder ? 'yes' : 'no'}`);

      if (newAddress && newAddress.trim() === 'Cancelado') {
        if (existingOrder) {
          const { error: updateError } = await supabase
            .from('orders')
            .update({ status: 'cancelled' })
            .eq('id', existingOrder.id);

          if (updateError) {
            console.error(`Error updating order to cancelled:`, updateError);
            debugLog.push({ name, phone, status: 'error', error: updateError.message });
          } else {
            cancelledCount++;
            debugLog.push({ name, phone, status: 'cancelled_updated' });
          }
        } else {
          const { error: insertError } = await supabase
            .from('orders')
            .insert({
              customer_id: customer.id,
              order_date: date,
              meal_type: mealType,
              status: 'cancelled',
              delivery_time: customerSchedule.delivery_time,
              delivery_address: customerSchedule.delivery_address,
              protein: '',
              vegetables: '',
              starch: '',
              sauce: '',
              fruit: '',
              fat: '',
              carb: '',
            });

          if (insertError) {
            console.error(`Error creating cancelled order:`, insertError);
            debugLog.push({ name, phone, status: 'error', error: insertError.message });
          } else {
            cancelledCount++;
            debugLog.push({ name, phone, status: 'cancelled_created' });
          }
        }
        continue;
      }

      const hasModifications = newAddress || newProtein || newVegetables || newStarch || newSauce || newFruit || newFat || newCarb;

      if (!hasModifications) {
        console.log(`No modifications for ${name}`);
        debugLog.push({ name, phone, status: 'no_modifications' });
        continue;
      }

      const modifications: any = {};
      if (newAddress) modifications.delivery_address = newAddress;
      if (newProtein) modifications.protein = newProtein;
      if (newVegetables) modifications.vegetables = newVegetables;
      if (newStarch) modifications.starch = newStarch;
      if (newSauce) modifications.sauce = newSauce;
      if (newFruit) modifications.fruit = newFruit;
      if (newFat) modifications.fat = newFat;
      if (newCarb) modifications.carb = newCarb;

      if (existingOrder) {
        const { error: updateError } = await supabase
          .from('orders')
          .update({
            ...modifications,
            status: 'pending',
          })
          .eq('id', existingOrder.id);

        if (updateError) {
          console.error(`Error updating order:`, updateError);
          debugLog.push({ name, phone, status: 'error', error: updateError.message });
        } else {
          updatedCount++;
          debugLog.push({ name, phone, status: 'modified_updated', modifications });
        }
      } else {
        const { error: insertError } = await supabase
          .from('orders')
          .insert({
            customer_id: customer.id,
            order_date: date,
            meal_type: mealType,
            status: 'pending',
            delivery_time: customerSchedule.delivery_time,
            delivery_address: modifications.delivery_address || customerSchedule.delivery_address,
            protein: modifications.protein || '',
            vegetables: modifications.vegetables || '',
            starch: modifications.starch || '',
            sauce: modifications.sauce || '',
            fruit: modifications.fruit || '',
            fat: modifications.fat || '',
            carb: modifications.carb || '',
          });

        if (insertError) {
          console.error(`Error creating order:`, insertError);
          debugLog.push({ name, phone, status: 'error', error: insertError.message });
        } else {
          updatedCount++;
          debugLog.push({ name, phone, status: 'modified_created', modifications });
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `${updatedCount} pedidos atualizados, ${cancelledCount} cancelados`,
        date,
        mealType,
        updatedCount,
        cancelledCount,
        debug: debugLog,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in import-orders-from-sheets:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});