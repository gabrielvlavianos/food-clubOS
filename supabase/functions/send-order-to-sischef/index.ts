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
  price_per_kg: number;
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
          .select('id, name, sischef_external_id, price_per_kg')
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
            price_per_kg: recipe.price_per_kg || 0,
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
    const deliveryAddress = order.modified_delivery_address || order.delivery_address || delivery?.delivery_address || '';

    // Validate customer name
    if (!customer.name || customer.name.trim() === '') {
      return new Response(
        JSON.stringify({
          error: 'Nome do cliente não encontrado',
          message: 'O cliente precisa ter um nome cadastrado para enviar ao Sischef'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate delivery address
    if (!deliveryAddress || deliveryAddress.trim() === '') {
      return new Response(
        JSON.stringify({
          error: 'Endereço de entrega não encontrado',
          message: 'O pedido precisa ter um endereço de entrega cadastrado'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date().toISOString();
    const orderDateTime = `${order.order_date}T${deliveryTime}`;

    // Parse address to extract components
    const parseAddress = (fullAddress: string) => {
      console.log('Parsing address:', fullAddress);

      // Example: "Avenida Paulista, 2100, Ramal 3892 - 16 andar tesouraria, Bela Vista, S\u00e3o Paulo - SP"
      // Split by comma first
      const commaParts = fullAddress.split(',').map(p => p.trim());

      let logradouro = '';
      let numero = '';
      let complemento = '';
      let bairro = '';
      let cidade = '';
      let estado = '';

      if (commaParts.length >= 1) {
        logradouro = commaParts[0];
      }

      // Try to find number in second part
      if (commaParts.length >= 2) {
        const numberPart = commaParts[1];
        // Extract just numbers for numero
        const numberMatch = numberPart.match(/\d+/);
        if (numberMatch) {
          numero = numberMatch[0];
          // Rest is complemento
          complemento = numberPart.replace(numero, '').trim();
        } else {
          numero = numberPart;
        }
      }

      // Additional complement might be in third part (before dash)
      if (commaParts.length >= 3 && !commaParts[2].includes(' - ')) {
        complemento = complemento ? `${complemento}, ${commaParts[2]}` : commaParts[2];
      }

      // Find the part with dash (neighborhood - city - state)
      const dashIndex = fullAddress.indexOf(' - ');
      if (dashIndex !== -1) {
        const afterDash = fullAddress.substring(dashIndex + 3);
        const dashParts = afterDash.split(',').map(p => p.trim());

        if (dashParts.length >= 2) {
          // First after dash is bairro
          bairro = dashParts[0];
          // Last part should be "City - State"
          const lastPart = dashParts[dashParts.length - 1];
          const cityStateParts = lastPart.split(' - ').map(p => p.trim());
          if (cityStateParts.length === 2) {
            cidade = cityStateParts[0];
            estado = cityStateParts[1];
          } else {
            cidade = lastPart;
          }
        } else if (dashParts.length === 1) {
          const lastPart = dashParts[0];
          const cityStateParts = lastPart.split(' - ').map(p => p.trim());
          if (cityStateParts.length === 2) {
            bairro = cityStateParts[0];
            cidade = cityStateParts[0];
            estado = cityStateParts[1];
          } else {
            bairro = lastPart;
          }
        }
      }

      const result = { logradouro, numero, complemento, bairro, cidade, estado };
      console.log('Parsed address:', result);
      return result;
    };

    const addressParts = parseAddress(deliveryAddress);

    console.log('Customer data:', {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email
    });

    console.log('Delivery address:', deliveryAddress);
    console.log('Parsed address parts:', addressParts);

    // Calculate prices using local price_per_kg
    let totalValue = 0;

    const itemsWithPrices = items.map((item) => {
      const quantityKg = item.quantity / 1000;
      const unitPrice = item.price_per_kg;
      const itemTotal = parseFloat((unitPrice * quantityKg).toFixed(2));
      totalValue += itemTotal;

      return {
        nome: item.recipe_name,
        id: item.recipe_id,
        quantidade: quantityKg,
        valorDesconto: 0,
        valorUnitario: unitPrice,
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
        cpf: '',
        email: customer.email || '',
      },
      enderecoEntrega: {
        logradouro: addressParts.logradouro,
        numero: addressParts.numero,
        complemento: addressParts.complemento,
        bairro: addressParts.bairro,
        cidade: addressParts.cidade,
        estado: addressParts.estado,
        cep: '',
      },
      itens: itemsWithPrices,
      troco: 0,
      valorDesconto: 0,
      valorTotal: parseFloat(totalValue.toFixed(2)),
      observacoes: `Hor\u00e1rio de entrega: ${deliveryTime}`,
    };

    // 7. Send to Sischef API
    const sischefApiUrl = 'https://sistema.sischef.com/api-v2/webhook/integracao/OT';
    const sischefApiKey = '0f035be6-e153-4331-aa5c-b8f191fff759';

    console.log('Sending payload to Sischef:', JSON.stringify(payload, null, 2));

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