import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface OrderData {
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  delivery_time: string;
  protein_name: string;
  carb_name: string;
  vegetable_name: string;
  salad_name: string;
  sauce_name: string;
  meal_type: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { order_date, meal_type } = await req.json();

    if (!order_date || !meal_type) {
      return new Response(
        JSON.stringify({ error: 'order_date e meal_type são obrigatórios' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const botconversaApiKey = Deno.env.get('BOTCONVERSA_API_KEY');
    if (!botconversaApiKey) {
      return new Response(
        JSON.stringify({ error: 'BOTCONVERSA_API_KEY não configurada' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Buscar pedidos ativos do dia e turno especificado
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        customer_id,
        order_date,
        meal_type,
        delivery_address,
        delivery_time,
        customers!inner (
          id,
          name,
          phone
        ),
        protein_recipe:recipes!orders_protein_recipe_id_fkey (
          name
        ),
        carb_recipe:recipes!orders_carb_recipe_id_fkey (
          name
        ),
        vegetable_recipe:recipes!orders_vegetable_recipe_id_fkey (
          name
        ),
        salad_recipe:recipes!orders_salad_recipe_id_fkey (
          name
        ),
        sauce_recipe:recipes!orders_sauce_recipe_id_fkey (
          name
        )
      `)
      .eq('order_date', order_date)
      .eq('meal_type', meal_type)
      .neq('status', 'cancelled');

    if (ordersError) {
      console.error('Erro ao buscar pedidos:', ordersError);
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar pedidos', details: ordersError }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!orders || orders.length === 0) {
      return new Response(
        JSON.stringify({ message: 'Nenhum pedido encontrado para este dia e turno', synced: 0 }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Primeiro, buscar os IDs dos custom fields
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
    
    // Mapear nomes para IDs
    const fieldMapping: Record<string, string> = {};
    const requiredFields = ['Nome', 'Endereço', 'Horário do Pedido', 'Proteina', 'Carboidrato', 'Legumes', 'Salada', 'Molho Salada', 'Refeição'];
    
    for (const field of customFields) {
      if (requiredFields.includes(field.name)) {
        fieldMapping[field.name] = field.id;
      }
    }

    // Verificar se todos os campos foram encontrados
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

    // Processar cada pedido
    for (const order of orders) {
      const customer = Array.isArray(order.customers) ? order.customers[0] : order.customers;
      const phone = customer.phone;

      if (!phone) {
        results.push({
          customer_id: customer.id,
          success: false,
          error: 'Cliente sem telefone cadastrado',
        });
        continue;
      }

      // Buscar ou criar subscriber
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
          // Criar novo subscriber
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
                name: customer.name,
              }),
            }
          );

          if (!createResponse.ok) {
            results.push({
              customer_id: customer.id,
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
          customer_id: customer.id,
          success: false,
          error: 'Erro ao buscar subscriber',
        });
        continue;
      }

      // Atualizar custom fields
      const customFieldUpdates = [
        { field_id: fieldMapping['Nome'], value: customer.name },
        { field_id: fieldMapping['Endereço'], value: order.delivery_address || '' },
        { field_id: fieldMapping['Horário do Pedido'], value: order.delivery_time || '' },
        { field_id: fieldMapping['Proteina'], value: order.protein_recipe?.name || '' },
        { field_id: fieldMapping['Carboidrato'], value: order.carb_recipe?.name || '' },
        { field_id: fieldMapping['Legumes'], value: order.vegetable_recipe?.name || '' },
        { field_id: fieldMapping['Salada'], value: order.salad_recipe?.name || '' },
        { field_id: fieldMapping['Molho Salada'], value: order.sauce_recipe?.name || '' },
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
        customer_id: customer.id,
        customer_name: customer.name,
        phone: phone,
        subscriber_id: subscriberId,
        success: allFieldsUpdated,
      });
    }

    const successCount = results.filter(r => r.success).length;

    return new Response(
      JSON.stringify({
        message: `Sincronização concluída: ${successCount}/${orders.length} pedidos sincronizados`,
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