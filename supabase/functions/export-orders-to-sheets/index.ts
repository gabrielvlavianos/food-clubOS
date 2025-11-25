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

    const dateObj = new Date(date + 'T12:00:00');
    const dayOfWeek = dateObj.getDay();
    const adjustedDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;

    const { data: customersData, error: customersError } = await supabase
      .from('customers')
      .select(`
        *,
        delivery_schedules!delivery_schedules_customer_id_fkey(*)
      `)
      .eq('is_active', true);

    if (customersError) throw customersError;

    const { data: menuData } = await supabase
      .from('monthly_menu')
      .select(`
        *,
        protein_recipe:recipes!monthly_menu_protein_recipe_id_fkey(name),
        carb_recipe:recipes!monthly_menu_carb_recipe_id_fkey(name),
        vegetable_recipe:recipes!monthly_menu_vegetable_recipe_id_fkey(name),
        salad_recipe:recipes!monthly_menu_salad_recipe_id_fkey(name),
        sauce_recipe:recipes!monthly_menu_sauce_recipe_id_fkey(name)
      `)
      .eq('menu_date', date)
      .eq('meal_type', mealType)
      .maybeSingle();

    const menu = menuData ? {
      protein: menuData.protein_recipe?.name || '',
      carb: menuData.carb_recipe?.name || '',
      vegetable: menuData.vegetable_recipe?.name || '',
      salad: menuData.salad_recipe?.name || '',
      sauce: menuData.sauce_recipe?.name || '',
    } : {
      protein: '',
      carb: '',
      vegetable: '',
      salad: '',
      sauce: '',
    };

    const rows = [
      ['Nome', 'Telefone', 'Endereço', 'Data', 'Horário', 'Proteína', 'Carboidrato', 'Legumes', 'Salada', 'Molho Salada', 'Refeição']
    ];

    for (const customer of customersData || []) {
      const deliverySchedule = customer.delivery_schedules?.find(
        (ds: any) =>
          ds.day_of_week === adjustedDayOfWeek &&
          ds.meal_type === mealType &&
          ds.is_active
      );

      if (deliverySchedule && deliverySchedule.delivery_time && deliverySchedule.delivery_address) {
        const formattedDate = new Date(date + 'T12:00:00').toLocaleDateString('pt-BR');

        rows.push([
          customer.name || '',
          customer.phone || '',
          deliverySchedule.delivery_address || '',
          formattedDate,
          deliverySchedule.delivery_time || '',
          menu.protein,
          menu.carb,
          menu.vegetable,
          menu.salad,
          menu.sauce,
          mealType === 'lunch' ? 'Almoço' : 'Jantar'
        ]);
      }
    }

    rows.sort((a, b) => {
      if (a[0] === 'Nome') return -1;
      if (b[0] === 'Nome') return 1;
      return (a[4] || '').localeCompare(b[4] || '');
    });

    const sheetName = mealType === 'lunch' ? 'Almoço' : 'Jantar';

    const clearResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1:Z1000:clear`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!clearResponse.ok) {
      const errorText = await clearResponse.text();
      return new Response(
        JSON.stringify({ error: 'Erro ao limpar planilha', details: errorText }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const updateResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1?valueInputOption=RAW`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          values: rows,
        }),
      }
    );

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      return new Response(
        JSON.stringify({ error: 'Erro ao atualizar planilha', details: errorText }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `${rows.length - 1} pedidos exportados para o Google Sheets`,
        date,
        mealType,
        totalRows: rows.length - 1,
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