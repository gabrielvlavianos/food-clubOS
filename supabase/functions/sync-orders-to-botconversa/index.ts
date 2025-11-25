import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface OrderData {
  customer_id: string;
  customer_name: string;
  phone: string;
  delivery_address: string;
  delivery_time: string;
  meal_type: string;
  protein_name: string | null;
  carb_name: string | null;
  vegetable_name: string | null;
  salad_name: string | null;
  sauce_name: string | null;
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
    const meal_type = body.meal_type;
    const order_date = body.order_date || new Date().toISOString().split('T')[0];

    if (!meal_type || !['lunch', 'dinner'].includes(meal_type)) {
      return new Response(
        JSON.stringify({ error: 'meal_type é obrigatório e deve ser "lunch" ou "dinner"' }),
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
      .select('value')
      .eq('key', 'botconversa_api_key')
      .maybeSingle();

    if (settingsError || !settingsData) {
      return new Response(
        JSON.stringify({ error: 'BOTCONVERSA_API_KEY não configurada no banco de dados' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const botconversaApiKey = settingsData.value;

    const targetDate = new Date(order_date);
    const dayOfWeek = targetDate.getDay() === 0 ? 7 : targetDate.getDay();

    const query = `
      SELECT
        c.id as customer_id,
        c.name as customer_name,
        c.phone,
        ds.delivery_address,
        ds.delivery_time,
        ds.meal_type,
        pr.name as protein_name,
        cr.name as carb_name,
        vr.name as vegetable_name,
        sr.name as salad_name,
        sar.name as sauce_name
      FROM customers c
      INNER JOIN delivery_schedules ds ON c.id = ds.customer_id
      LEFT JOIN monthly_menu mm ON mm.menu_date = '${order_date}'::date AND mm.meal_type = ds.meal_type
      LEFT JOIN recipes pr ON mm.protein_recipe_id = pr.id
      LEFT JOIN recipes cr ON mm.carb_recipe_id = cr.id
      LEFT JOIN recipes vr ON mm.vegetable_recipe_id = vr.id
      LEFT JOIN recipes sr ON mm.salad_recipe_id = sr.id
      LEFT JOIN recipes sar ON mm.sauce_recipe_id = sar.id
      WHERE c.is_active = true
        AND ds.is_active = true
        AND ds.day_of_week = ${dayOfWeek}
        AND ds.meal_type = '${meal_type}'
      ORDER BY ds.delivery_time, c.name
    `;

    const { data: orders, error: queryError } = await supabase.rpc('query', {
      query_text: query
    });

    if (queryError) {
      console.error('Erro ao buscar pedidos:', queryError);
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar pedidos', details: queryError }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!orders || orders.length === 0) {
      return new Response(
        JSON.stringify({
          message: 'Nenhum pedido encontrado para este dia e turno',
          date: order_date,
          meal_type: meal_type,
          day_of_week: dayOfWeek,
          synced: 0
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const customFieldsResponse = await fetch(
      'https://api.botconversa.com.br/custom-fields/',
      {
        method: 'GET',
        headers: {
          'API-KEY': botconversaApiKey,
        },
      }
    );

    if (!customFieldsResponse.ok) {
      const errorText = await customFieldsResponse.text();
      console.error('Erro ao buscar custom fields:', errorText);
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar custom fields do Bot Conversa' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const customFields = await customFieldsResponse.json();

    const fieldMapping: Record<string, string> = {};
    const requiredFields = ['Nome', 'Endereço', 'Horário do Pedido', 'Proteina', 'Carboidrato', 'Legumes', 'Salada', 'Molho Salada', 'Refeição'];

    for (const field of customFields) {
      if (requiredFields.includes(field.name)) {
        fieldMapping[field.name] = field.id;
      }
    }

    const missingFields = requiredFields.filter(name => !fieldMapping[name]);
    if (missingFields.length > 0) {
      return new Response(
        JSON.stringify({
          error: 'Custom fields não encontrados no Bot Conversa',
          missing: missingFields
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const results = [];

    for (const order of orders) {
      const phone = order.phone;

      if (!phone) {
        results.push({
          customer_id: order.customer_id,
          customer_name: order.customer_name,
          success: false,
          error: 'Cliente sem telefone cadastrado',
        });
        continue;
      }

      let subscriberId: string;

      const searchResponse = await fetch(
        `https://api.botconversa.com.br/subscribers/?phone=${encodeURIComponent(phone)}`,
        {
          method: 'GET',
          headers: {
            'API-KEY': botconversaApiKey,
          },
        }
      );

      if (searchResponse.ok) {
        const subscribers = await searchResponse.json();
        if (subscribers && subscribers.length > 0) {
          subscriberId = subscribers[0].id;
        } else {
          const createResponse = await fetch(
            'https://api.botconversa.com.br/subscribers/',
            {
              method: 'POST',
              headers: {
                'API-KEY': botconversaApiKey,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                phone: phone,
                name: order.customer_name,
              }),
            }
          );

          if (!createResponse.ok) {
            results.push({
              customer_id: order.customer_id,
              customer_name: order.customer_name,
              success: false,
              error: 'Erro ao criar subscriber',
            });
            continue;
          }

          const newSubscriber = await createResponse.json();
          subscriberId = newSubscriber.id;
        }
      } else {
        results.push({
          customer_id: order.customer_id,
          customer_name: order.customer_name,
          success: false,
          error: 'Erro ao buscar subscriber',
        });
        continue;
      }

      const customFieldUpdates = [
        { field_id: fieldMapping['Nome'], value: order.customer_name },
        { field_id: fieldMapping['Endereço'], value: order.delivery_address || '' },
        { field_id: fieldMapping['Horário do Pedido'], value: order.delivery_time || '' },
        { field_id: fieldMapping['Proteina'], value: order.protein_name || '' },
        { field_id: fieldMapping['Carboidrato'], value: order.carb_name || '' },
        { field_id: fieldMapping['Legumes'], value: order.vegetable_name || '' },
        { field_id: fieldMapping['Salada'], value: order.salad_name || '' },
        { field_id: fieldMapping['Molho Salada'], value: order.sauce_name || '' },
        { field_id: fieldMapping['Refeição'], value: meal_type },
      ];

      let allFieldsUpdated = true;

      for (const update of customFieldUpdates) {
        const updateResponse = await fetch(
          `https://api.botconversa.com.br/subscribers/${subscriberId}/custom-fields/${update.field_id}/`,
          {
            method: 'PUT',
            headers: {
              'API-KEY': botconversaApiKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              value: update.value,
            }),
          }
        );

        if (!updateResponse.ok) {
          console.error(`Erro ao atualizar custom field ${update.field_id}:`, await updateResponse.text());
          allFieldsUpdated = false;
        }
      }

      results.push({
        customer_id: order.customer_id,
        customer_name: order.customer_name,
        phone: phone,
        subscriber_id: subscriberId,
        success: allFieldsUpdated,
      });
    }

    const successCount = results.filter(r => r.success).length;

    return new Response(
      JSON.stringify({
        message: `Sincronização concluída: ${successCount}/${orders.length} pedidos sincronizados`,
        date: order_date,
        meal_type: meal_type,
        total: orders.length,
        synced: successCount,
        results: results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Erro na função:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno', details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});