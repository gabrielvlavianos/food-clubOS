import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

async function getAccessToken(serviceAccount: any): Promise<string> {
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const encoder = new TextEncoder();
  const headerBase64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const claimBase64 = btoa(JSON.stringify(claim)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const unsignedToken = `${headerBase64}.${claimBase64}`;

  const privateKeyPem = serviceAccount.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');

  const binaryKey = Uint8Array.from(atob(privateKeyPem), c => c.charCodeAt(0));

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
    encoder.encode(unsignedToken)
  );

  const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const jwt = `${unsignedToken}.${signatureBase64}`;

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    throw new Error(`Failed to get access token: ${error}`);
  }

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
    const body = await req.json();
    const { date, mealType } = body;

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
        JSON.stringify({ error: 'Google Sheets n\u00e3o configurado' }),
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

    const sheetName = mealType === 'lunch' ? 'Volta da Informa\u00e7\u00e3o Almo\u00e7o' : 'Volta da Informa\u00e7\u00e3o Jantar';

    const readResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A2:O1000`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!readResponse.ok) {
      const errorText = await readResponse.text();
      return new Response(
        JSON.stringify({ error: 'Erro ao ler planilha', details: errorText }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const sheetData = await readResponse.json();
    const rows = sheetData.values || [];

    const { data: menuData } = await supabase
      .from('monthly_menu')
      .select('*')
      .eq('menu_date', date)
      .eq('meal_type', mealType)
      .maybeSingle();

    if (!menuData) {
      return new Response(
        JSON.stringify({ error: 'Card\u00e1pio n\u00e3o encontrado para esta data' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    let updatedCount = 0;
    let cancelledCount = 0;
    const debugLog: any[] = [];

    console.log(`Processing ${rows.length} rows from sheet`);

    for (const row of rows) {
      const name = row[0];
      const phone = row[1];
      const originalAddress = row[2];
      const orderDate = row[3];
      const originalTime = row[4];
      const originalProtein = row[5];
      const originalCarb = row[6];
      const vegetables = row[7];
      const salad = row[8];
      const sauce = row[9];
      const meal = row[10];
      const newAddress = row[11];
      const newTime = row[12];
      const newProtein = row[13];
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

      const { data: customerSchedule } = await supabase
        .from('delivery_schedules')
        .select('*')
        .eq('customer_id', customer.id)
        .eq('is_active', true)
        .maybeSingle();

      if (!customerSchedule) {
        console.log(`No delivery schedule found for customer: ${customer.id}`);
        debugLog.push({ name, phone, status: 'no_schedule' });
        continue;
      }

      console.log(`Found schedule, existing order: ${existingOrder ? 'yes' : 'no'}`);

      if (newAddress && newAddress.trim() === 'Cancelado') {
        if (existingOrder) {
          const { error: updateError } = await supabase
            .from('orders')
            .update({
              is_cancelled: true,
              status: 'cancelled',
              modified_delivery_address: 'Cancelado'
            })
            .eq('id', existingOrder.id);

          if (!updateError) {
            cancelledCount++;
            console.log(`Updated existing order to cancelled`);
            debugLog.push({ name, phone, status: 'cancelled_updated' });
          } else {
            console.log(`Error updating: ${updateError.message}`);
            debugLog.push({ name, phone, status: 'error', error: updateError.message });
          }
        } else {
          console.log(`Creating new cancelled order`);
          const { error: insertError } = await supabase
            .from('orders')
            .insert({
              customer_id: customer.id,
              order_date: date,
              meal_type: mealType,
              protein_recipe_id: menuData.protein_recipe_id,
              protein_amount_gr: 100,
              carb_recipe_id: menuData.carb_recipe_id,
              carb_amount_gr: 100,
              vegetable_recipe_id: menuData.vegetable_recipe_id,
              vegetable_amount_gr: 70,
              salad_recipe_id: menuData.salad_recipe_id,
              salad_amount_gr: 100,
              sauce_recipe_id: menuData.sauce_recipe_id,
              sauce_amount_gr: 30,
              delivery_address: customerSchedule.delivery_address,
              delivery_time: customerSchedule.delivery_time,
              is_cancelled: true,
              status: 'cancelled',
              modified_delivery_address: 'Cancelado'
            });

          if (!insertError) {
            cancelledCount++;
            console.log(`Created new cancelled order`);
            debugLog.push({ name, phone, status: 'cancelled_created' });
          } else {
            console.log(`Error inserting cancelled: ${insertError.message}`);
            debugLog.push({ name, phone, status: 'error', error: insertError.message });
          }
        }
      } else if (newAddress || newTime || newProtein || newCarb) {
        console.log(`Has modifications - newAddress: ${newAddress}, newTime: ${newTime}, newProtein: ${newProtein}, newCarb: ${newCarb}`);
        const updateData: any = {};

        if (newAddress && newAddress.trim() !== '') {
          updateData.modified_delivery_address = newAddress.trim();
        }

        if (newTime && newTime.trim() !== '') {
          updateData.modified_delivery_time = newTime.trim();
        }

        if (newProtein && newProtein.trim() !== '') {
          updateData.modified_protein_name = newProtein.trim();
        }

        if (newCarb && newCarb.trim() !== '') {
          updateData.modified_carb_name = newCarb.trim();
        }

        if (Object.keys(updateData).length > 0) {
          updateData.is_cancelled = false;

          if (existingOrder) {
            const { error: updateError } = await supabase
              .from('orders')
              .update(updateData)
              .eq('id', existingOrder.id);

            if (!updateError) {
              updatedCount++;
              console.log(`Updated existing order with modifications`);
              debugLog.push({ name, phone, status: 'modified_updated', modifications: updateData });
            } else {
              console.log(`Error updating modifications: ${updateError.message}`);
              debugLog.push({ name, phone, status: 'error', error: updateError.message });
            }
          } else {
            console.log(`Creating new order with modifications`);
            const { error: insertError } = await supabase
              .from('orders')
              .insert({
                customer_id: customer.id,
                order_date: date,
                meal_type: mealType,
                protein_recipe_id: menuData.protein_recipe_id,
                protein_amount_gr: 100,
                carb_recipe_id: menuData.carb_recipe_id,
                carb_amount_gr: 100,
                vegetable_recipe_id: menuData.vegetable_recipe_id,
                vegetable_amount_gr: 70,
                salad_recipe_id: menuData.salad_recipe_id,
                salad_amount_gr: 100,
                sauce_recipe_id: menuData.sauce_recipe_id,
                sauce_amount_gr: 30,
                delivery_address: customerSchedule.delivery_address,
                delivery_time: customerSchedule.delivery_time,
                is_cancelled: false,
                status: 'pending',
                ...updateData
              });

            if (!insertError) {
              updatedCount++;
              console.log(`Created new order with modifications`);
              debugLog.push({ name, phone, status: 'modified_created', modifications: updateData });
            } else {
              console.log(`Error inserting modifications: ${insertError.message}`);
              debugLog.push({ name, phone, status: 'error', error: insertError.message });
            }
          }
        }
      }
    }

    console.log(`Finished processing. Updated: ${updatedCount}, Cancelled: ${cancelledCount}`);
    console.log('Debug log:', JSON.stringify(debugLog, null, 2));

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
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Erro:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno', details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});