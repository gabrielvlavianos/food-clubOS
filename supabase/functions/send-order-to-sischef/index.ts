import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface OrderItem {
  recipe_id: string;
  recipe_name: string;
  sischef_external_id: string | null;
  quantity: number;
  category: string;
}

interface SischefPayload {
  order_id: string;
  customer_id: number;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  delivery_date: string;
  delivery_time: string;
  departure_time: string | null;
  tipoPedido: 'DELIVERY' | 'COMANDA' | 'MESA';
  items: Array<{
    external_id: string;
    name: string;
    quantity_grams: number;
    category: string;
  }>;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { order_id } = await req.json();

    if (!order_id) {
      return new Response(
        JSON.stringify({ error: 'order_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Fetch order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .maybeSingle();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: 'Order not found', details: orderError }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if order is cancelled
    if (order.status === 'cancelled' || order.is_cancelled) {
      return new Response(
        JSON.stringify({ error: 'Cannot send cancelled orders to Sischef' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Fetch customer details
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', order.customer_id)
      .maybeSingle();

    if (customerError || !customer) {
      return new Response(
        JSON.stringify({ error: 'Customer not found', details: customerError }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Get delivery schedule for departure time
    const orderDate = new Date(order.order_date + 'T12:00:00');
    const dayOfWeek = orderDate.getDay() === 0 ? 7 : orderDate.getDay();

    const { data: delivery } = await supabase
      .from('delivery_schedules')
      .select('*')
      .eq('customer_id', order.customer_id)
      .eq('day_of_week', dayOfWeek)
      .eq('meal_type', order.meal_type)
      .eq('is_active', true)
      .maybeSingle();

    // 4. Fetch recipe details for all items
    const items: OrderItem[] = [];
    const recipeFields = [
      { field: 'carb_recipe_id', qty: 'carb_amount_gr', cat: 'carboidrato' },
      { field: 'protein_recipe_id', qty: 'protein_amount_gr', cat: 'proteina' },
      { field: 'vegetable_recipe_id', qty: 'vegetable_amount_gr', cat: 'legumes' },
      { field: 'salad_recipe_id', qty: 'salad_amount_gr', cat: 'salada' },
      { field: 'sauce_recipe_id', qty: 'sauce_amount_gr', cat: 'molho_salada' },
    ];

    for (const { field, qty, cat } of recipeFields) {
      const recipeId = order[field];
      if (recipeId) {
        const { data: recipe, error: recipeError } = await supabase
          .from('recipes')
          .select('id, name, sischef_external_id')
          .eq('id', recipeId)
          .maybeSingle();

        if (recipeError || !recipe) {
          return new Response(
            JSON.stringify({ 
              error: `Recipe not found for ${cat}`, 
              details: recipeError 
            }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const quantity = order[qty] || 0;
        if (quantity > 0) {
          items.push({
            recipe_id: recipe.id,
            recipe_name: recipe.name,
            sischef_external_id: recipe.sischef_external_id,
            quantity: quantity,
            category: cat,
          });
        }
      }
    }

    // 5. Validate all items have sischef_external_id
    const missingIds = items.filter(item => !item.sischef_external_id);
    if (missingIds.length > 0) {
      return new Response(
        JSON.stringify({
          error: 'Some recipes are not synchronized with Sischef',
          missing_recipes: missingIds.map(item => ({
            name: item.recipe_name,
            category: item.category,
          })),
          message: 'Please synchronize all recipes with Sischef before sending the order',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Build Sischef payload
    const deliveryTime = order.modified_delivery_time || order.delivery_time || delivery?.delivery_time || '12:00:00';
    const deliveryAddress = order.modified_delivery_address || order.delivery_address || delivery?.delivery_address || customer.address || '';

    const payload: SischefPayload = {
      order_id: order.id,
      customer_id: customer.id,
      customer_name: customer.name,
      customer_phone: customer.phone || '',
      delivery_address: deliveryAddress,
      delivery_date: order.order_date,
      delivery_time: deliveryTime,
      departure_time: delivery?.departure_time || null,
      tipoPedido: 'DELIVERY',
      items: items.map(item => ({
        external_id: item.sischef_external_id!,
        name: item.recipe_name,
        quantity_grams: item.quantity,
        category: item.category,
      })),
    };

    // 7. Send to Sischef API
    const sischefApiUrl = 'https://sistema.sischef.com/api-v2/webhook/integracao/OT';
    const sischefApiKey = '0f035be6-e153-4331-aa5c-b8f191fff759';

    try {
      const response = await fetch(sischefApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'token-integracao': sischefApiKey,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.text();
        return new Response(
          JSON.stringify({
            error: 'Failed to send order to Sischef',
            status: response.status,
            details: errorData,
            payload,
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const sischefResponse = await response.json();

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Order sent to Sischef successfully',
          payload,
          sischef_response: sischefResponse,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (apiError) {
      return new Response(
        JSON.stringify({
          error: 'Error communicating with Sischef API',
          details: apiError instanceof Error ? apiError.message : String(apiError),
          payload,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});