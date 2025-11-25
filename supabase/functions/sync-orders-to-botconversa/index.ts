import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

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

    const { data: deliverySchedules, error: schedulesError } = await supabase
      .from('delivery_schedules')
      .select(`
        id,
        customer_id,
        day_of_week,
        meal_type,
        delivery_address,
        delivery_time,
        customers!inner (
          id,
          name,
          phone,
          is_active
        )
      `)
      .eq('is_active', true)
      .eq('day_of_week', dayOfWeek)
      .eq('meal_type', meal_type)
      .eq('customers.is_active', true);

    if (schedulesError) {
      console.error('Erro ao buscar agendamentos:', schedulesError);
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar agendamentos', details: schedulesError }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!deliverySchedules || deliverySchedules.length === 0) {
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

    const { data: menuData, error: menuError } = await supabase
      .from('monthly_menu')
      .select(`
        menu_date,
        meal_type,
        protein_recipe_id,
        carb_recipe_id,
        vegetable_recipe_id,
        salad_recipe_id,
        sauce_recipe_id,
        protein:recipes!monthly_menu_protein_recipe_id_fkey(name),
        carb:recipes!monthly_menu_carb_recipe_id_fkey(name),
        vegetable:recipes!monthly_menu_vegetable_recipe_id_fkey(name),
        salad:recipes!monthly_menu_salad_recipe_id_fkey(name),
        sauce:recipes!monthly_menu_sauce_recipe_id_fkey(name)
      `)
      .eq('menu_date', order_date)
      .eq('meal_type', meal_type)
      .maybeSingle();

    if (menuError) {
      console.error('Erro ao buscar cardápio:', menuError);
    }

    const orders = deliverySchedules.map(schedule => {
      const customer = Array.isArray(schedule.customers) ? schedule.customers[0] : schedule.customers;
      return {
        customer_id: customer.id,
        customer_name: customer.name,
        phone: customer.phone,
        delivery_address: schedule.delivery_address,
        delivery_time: schedule.delivery_time,
        meal_type: schedule.meal_type,
        protein_name: menuData?.protein?.name || null,
        carb_name: menuData?.carb?.name || null,
        vegetable_name: menuData?.vegetable?.name || null,
        salad_name: menuData?.salad?.name || null,
        sauce_name: menuData?.sauce?.name || null,
      };
    });

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