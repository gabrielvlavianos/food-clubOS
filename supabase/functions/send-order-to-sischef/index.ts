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
  id: string;
  idUnicoIntegracao: string;
  dataPedido: string;
  createdAt: string;
  descricao: string;
  tipoPedido: 'DELIVERY' | 'COMANDA' | 'MESA';
  situacao: string;
  identificador: {
    numero: string;
    tipo: string;
  };
  identificadorSecundario?: string;
  cliente?: {
    nome: string;
    telefone?: string;
    cpf?: string;
    email?: string;
  };
  enderecoEntrega?: {
    logradouro: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cidade?: string;
    estado?: string;
    cep?: string;
  };
  itens: Array<{
    nome: string;
    id: string;
    quantidade: number;
    valorDesconto: number;
    valorUnitario: number;
    valorTotal: number;
    subItens: Array<any>;
    codigoExterno: string;
  }>;
  troco: number;
  valorDesconto: number;
  valorTotal: number;
  observacoes?: string;
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

    const now = new Date().toISOString();
    const orderDateTime = `${order.order_date}T${deliveryTime}`;

    // Parse address to extract components
    const parseAddress = (fullAddress: string) => {
      // Try to parse format: "Street, Number, Extra - Neighborhood, City - State"
      const parts = fullAddress.split(',');
      const logradouro = parts[0]?.trim() || '';
      const numero = parts[1]?.split('-')[0]?.trim() || '';
      const complemento = parts[1]?.includes('-') ? parts[1].split('-')[0].replace(numero, '').trim() : '';
      const remaining = fullAddress.includes('-') ? fullAddress.split('-').slice(-2) : [];
      const bairro = remaining[0]?.split(',')[0]?.trim() || '';
      const cidadeEstado = remaining[1]?.trim() || '';
      const cidade = cidadeEstado.split('-')[0]?.trim() || '';
      const estado = cidadeEstado.split('-')[1]?.trim() || '';

      return { logradouro, numero, complemento, bairro, cidade, estado };
    };

    const addressParts = parseAddress(deliveryAddress);

    // Calculate item prices (R$ 10/kg base price for all items)
    const basePrice = 10.0; // R$ 10 per kg
    let totalValue = 0;

    const itemsWithPrices = items.map(item => {
      const quantityKg = item.quantity / 1000;
      const itemTotal = parseFloat((basePrice * quantityKg).toFixed(2));
      totalValue += itemTotal;

      return {
        nome: item.recipe_name,
        id: item.recipe_id,
        quantidade: quantityKg,
        valorDesconto: 0,
        valorUnitario: basePrice,
        valorTotal: itemTotal,
        subItens: [],
        codigoExterno: item.sischef_external_id!,
      };
    });

    const payload: SischefPayload = {
      id: order.id,
      idUnicoIntegracao: order.id,
      dataPedido: orderDateTime,
      createdAt: now,
      descricao: `Pedido ${order.meal_type} - ${customer.name}`,
      tipoPedido: 'DELIVERY',
      situacao: 'CONFIRMADO',
      identificador: {
        numero: String(customer.id),
        tipo: 'DELIVERY',
      },
      identificadorSecundario: customer.phone || '',
      cliente: {
        nome: customer.name,
        telefone: customer.phone || '',
        cpf: customer.cpf || '',
        email: customer.email || '',
      },
      enderecoEntrega: {
        logradouro: addressParts.logradouro,
        numero: addressParts.numero,
        complemento: addressParts.complemento,
        bairro: addressParts.bairro,
        cidade: addressParts.cidade,
        estado: addressParts.estado,
        cep: customer.postal_code || '',
      },
      itens: itemsWithPrices,
      troco: 0,
      valorDesconto: 0,
      valorTotal: parseFloat(totalValue.toFixed(2)),
      observacoes: `Horário de entrega: ${deliveryTime}`,
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