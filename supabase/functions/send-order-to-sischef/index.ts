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

    console.log('=== DEBUG: Building payload ===');
    console.log('Order data:', {
      id: order.id,
      customer_id: order.customer_id,
      delivery_time: order.delivery_time,
      modified_delivery_time: order.modified_delivery_time,
      delivery_address: order.delivery_address,
      modified_delivery_address: order.modified_delivery_address,
    });
    console.log('Delivery schedule:', delivery);
    console.log('Final deliveryTime:', deliveryTime);
    console.log('Final deliveryAddress:', deliveryAddress);
    console.log('Customer:', {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
    });

    // Validate customer name
    if (!customer.name || customer.name.trim() === '') {
      console.error('VALIDATION FAILED: Customer name is empty');
      return new Response(
        JSON.stringify({
          error: 'Nome do cliente não encontrado',
          message: 'O cliente precisa ter um nome cadastrado para enviar ao Sischef',
          debug: {
            customer_id: customer.id,
            customer: customer,
          }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate delivery address
    if (!deliveryAddress || deliveryAddress.trim() === '') {
      console.error('VALIDATION FAILED: Delivery address is empty');
      console.error('Order delivery_address:', order.delivery_address);
      console.error('Order modified_delivery_address:', order.modified_delivery_address);
      console.error('Delivery schedule delivery_address:', delivery?.delivery_address);
      console.error('Customer address:', customer.address);
      return new Response(
        JSON.stringify({
          error: 'Endereço de entrega não encontrado',
          message: 'O pedido precisa ter um endereço de entrega cadastrado',
          debug: {
            order_id: order.id,
            customer_id: customer.id,
            order_delivery_address: order.delivery_address,
            modified_delivery_address: order.modified_delivery_address,
            schedule_delivery_address: delivery?.delivery_address,
            customer_address: customer.address,
          }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date().toISOString();
    const orderDateTime = `${order.order_date}T${deliveryTime}`;

    // Extract CEP from address string
    const extractCep = (address: string): string => {
      const cepMatch = address.match(/CEP\s*[:.?]?\s*(\d{5}[-.?]?\d{3})/i);
      if (cepMatch) {
        return cepMatch[1].replace(/\D/g, '');
      }
      return '';
    };

    // Parse address to extract components
    const parseAddress = async (fullAddress: string) => {
      console.log('Parsing address:', fullAddress);

      let logradouro = '';
      let numero = '';
      let complemento = '';
      let bairro = '';
      let cidade = '';
      let estado = '';
      let cep = extractCep(fullAddress);

      // Remove CEP from address for parsing
      let addressWithoutCep = fullAddress.replace(/,?\s*CEP\s*[:.?]?\s*\d{5}[-.?]?\d{3}/gi, '').trim();

      // Find the last dash which separates the state
      const lastDashIndex = addressWithoutCep.lastIndexOf(' - ');

      if (lastDashIndex === -1) {
        // No dash found, address might be incomplete
        // Try to parse comma-separated parts
        const parts = addressWithoutCep.split(',').map(p => p.trim()).filter(p => p);

        if (parts.length >= 3) {
          // Format: Street, Number, Complement [, more...]
          logradouro = parts[0];

          // Extract number from second part (might be "N 306" or just "306")
          const numberPart = parts[1].replace(/^N\s*/i, '').trim();
          const numberMatch = numberPart.match(/^\d+/);
          if (numberMatch) {
            numero = numberMatch[0];
          } else {
            numero = numberPart;
          }

          // Rest is complement
          complemento = parts.slice(2).join(', ');
        } else if (parts.length === 2) {
          logradouro = parts[0];
          numero = parts[1].replace(/^N\s*/i, '').trim();
        } else if (parts.length === 1) {
          logradouro = parts[0];
        }

        // Try to get address info from CEP
        if (cep && cep.length === 8) {
          try {
            console.log('Fetching address info from CEP:', cep);
            const cepResponse = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            if (cepResponse.ok) {
              const cepData = await cepResponse.json();
              if (!cepData.erro) {
                bairro = cepData.bairro || bairro;
                cidade = cepData.localidade || cidade;
                estado = cepData.uf || estado;
                console.log('CEP data:', cepData);
              }
            }
          } catch (error) {
            console.log('Error fetching CEP:', error);
          }
        }

        const result = { logradouro, numero, complemento, bairro, cidade, estado, cep };
        console.log('Parsed address (incomplete format):', result);
        return result;
      }

      // Extract state (everything after last dash)
      estado = addressWithoutCep.substring(lastDashIndex + 3).trim();

      // Everything before the last dash
      const beforeState = addressWithoutCep.substring(0, lastDashIndex);

      // Split by comma to get all parts
      const parts = beforeState.split(',').map(p => p.trim());

      if (parts.length >= 5) {
        // Format: Street, Number, Complement, Neighborhood, City - State
        logradouro = parts[0];
        numero = parts[1];
        complemento = parts[2];
        bairro = parts[3];
        cidade = parts[4];
      } else if (parts.length === 4) {
        // Format: Street, Number, Neighborhood, City - State (no complement)
        // OR: Street, Number, Complement, "Neighborhood, City" - State
        logradouro = parts[0];
        numero = parts[1];

        // Check if last part looks like a city (has multiple words)
        const lastPart = parts[3];
        if (lastPart.includes(' ')) {
          // Likely: Street, Number, Neighborhood, City
          complemento = '';
          bairro = parts[2];
          cidade = lastPart;
        } else {
          // Likely: Street, Number, Complement, Neighborhood
          complemento = parts[2];
          bairro = parts[3];
          cidade = '';
        }
      } else if (parts.length === 3) {
        // Format: Street, Number, "Neighborhood, City" - State
        logradouro = parts[0];
        numero = parts[1];

        // Last part could be either "Neighborhood" or "City"
        // Check if it looks like a well-known city
        const lastPart = parts[2];
        if (lastPart.toLowerCase().includes('são paulo') ||
            lastPart.toLowerCase().includes('rio de janeiro') ||
            lastPart.length > 15) {
          // Probably city
          cidade = lastPart;
          bairro = '';
        } else {
          // Probably neighborhood
          bairro = lastPart;
          cidade = '';
        }
      } else if (parts.length === 2) {
        // Format: Street, Number - State
        logradouro = parts[0];
        numero = parts[1];
      } else if (parts.length === 1) {
        // Only street name
        logradouro = parts[0];
      }

      const result = { logradouro, numero, complemento, bairro, cidade, estado, cep };
      console.log('Parsed address:', result);
      return result;
    };

    const addressParts = await parseAddress(deliveryAddress);

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

    // Generate a readable reference number using timestamp + last 4 digits of phone
    const timestamp = Date.now();
    const phoneDigits = (customer.phone || '').replace(/\D/g, '').slice(-4) || '0000';
    const referenceNumber = `${timestamp}${phoneDigits}`;

    const payload: SischefPayload = {
      id: order.id,
      idUnicoIntegracao: order.id,
      dataPedido: orderDateTime,
      createdAt: now,
      descricao: `Pedido de ${order.meal_type === 'lunch' ? 'Almoço' : 'Jantar'}`,
      tipoPedido: 'DELIVERY',
      situacao: 'CONFIRMADO',
      identificador: {
        numero: referenceNumber,
        tipo: 'DELIVERY',
      },
      cliente: {
        nome: customer.name.trim(),
        telefone: (customer.phone || '').replace(/\D/g, ''),
        cpf: '',
        email: (customer.email || '').trim(),
      },
      enderecoEntrega: {
        logradouro: addressParts.logradouro || '',
        numero: addressParts.numero || 'S/N',
        complemento: addressParts.complemento || '',
        bairro: addressParts.bairro || '',
        cidade: addressParts.cidade || '',
        estado: addressParts.estado || '',
        cep: addressParts.cep || '',
      },
      itens: itemsWithPrices,
      troco: 0,
      valorDesconto: 0,
      valorTotal: parseFloat(totalValue.toFixed(2)),
      observacoes: `Horário de entrega: ${deliveryTime}\nCliente: ${customer.name}${customer.phone ? '\nTelefone: ' + customer.phone : ''}`,
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