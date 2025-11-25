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

    const sheetName = mealType === 'lunch' ? 'Volta da Informação Almoço' : 'Volta da Informação Jantar';

    const readResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A2:N1000`,
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

    let updatedCount = 0;
    let cancelledCount = 0;

    for (const row of rows) {
      const [
        name,
        phone,
        originalAddress,
        orderDate,
        originalTime,
        originalProtein,
        originalCarb,
        vegetables,
        salad,
        sauce,
        meal,
        newAddress,
        newTime,
        newProtein,
        newCarb
      ] = row;

      if (!phone || !name) continue;

      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('phone', phone)
        .maybeSingle();

      if (!customer) continue;

      const finalAddress = newAddress && newAddress.trim() !== '' ? newAddress : originalAddress;
      const finalTime = newTime && newTime.trim() !== '' ? newTime : originalTime;
      const finalProtein = newProtein && newProtein.trim() !== '' ? newProtein : originalProtein;
      const finalCarb = newCarb && newCarb.trim() !== '' ? newCarb : originalCarb;

      if (finalAddress === 'Cancelado') {
        const { error: updateError } = await supabase
          .from('orders')
          .update({ status: 'cancelled' })
          .eq('customer_id', customer.id)
          .eq('delivery_date', date)
          .eq('meal_type', mealType);

        if (!updateError) {
          cancelledCount++;
        }
      } else {
        const { error: upsertError } = await supabase
          .from('orders')
          .upsert({
            customer_id: customer.id,
            delivery_date: date,
            meal_type: mealType,
            delivery_address: finalAddress,
            delivery_time: finalTime,
            protein: finalProtein,
            carbohydrate: finalCarb,
            vegetables: vegetables || '',
            salad: salad || '',
            sauce: sauce || '',
            status: 'pending',
          }, {
            onConflict: 'customer_id,delivery_date,meal_type',
          });

        if (!upsertError) {
          updatedCount++;
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