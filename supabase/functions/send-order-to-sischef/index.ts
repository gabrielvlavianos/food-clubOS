import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface SischefItem {
  nome: string;
  id: string;
  quantidade: number;
  valorDesconto: number;
  valorUnitario: number;
  valorTotal: number;
  subItens: Array<any>;
  codigoExterno: string;
}

interface SischefPayload {
  id: string;
  idUnicoIntegracao: string;
  dataPedido: string;
  createdAt: string;
  descricao: string;
  tipoPedido: 'DELIVERY';
  situacao: 'CONFIRMADO';
  identificador: {
    numero: string;
    tipo: 'DELIVERY';
  };
  cliente: {
    nome: string;
    telefone: string;
    cpf: string;
    email: string;
  };
  enderecoEntrega: {
    logradouro: string;
    numero: string;
    complemento: string;
    bairro: string;
    cidade: string;
    estado: string;
    cep: string;
  };
  itens: SischefItem[];
  troco: number;
  valorDesconto: number;
  valorTotal: number;
  observacoes: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    console.log('===== INICIANDO ENVIO PARA SISCHEF =====');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { order_id } = await req.json();
    console.log('Order ID recebido:', order_id);

    if (!order_id) {
      return new Response(
        JSON.stringify({ error: 'order_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Buscar pedido
    console.log('1. Buscando pedido...');
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .maybeSingle();

    if (orderError || !order) {
      console.error('Erro ao buscar pedido:', orderError);
      return new Response(
        JSON.stringify({ error: 'Pedido não encontrado', details: orderError }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Pedido encontrado:', {
      id: order.id,
      customer_id: order.customer_id,
      order_date: order.order_date,
      meal_type: order.meal_type,
      status: order.status,
      is_cancelled: order.is_cancelled,
    });

    // Verificar se está cancelado
    if (order.status === 'cancelled' || order.is_cancelled) {
      return new Response(
        JSON.stringify({ error: 'Pedido cancelado não pode ser enviado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Buscar cliente
    console.log('2. Buscando cliente...');
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', order.customer_id)
      .maybeSingle();

    if (customerError || !customer) {
      console.error('Erro ao buscar cliente:', customerError);
      return new Response(
        JSON.stringify({ error: 'Cliente não encontrado', details: customerError }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Cliente encontrado:', {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
    });

    // VALIDAÇÃO CRÍTICA: Nome do cliente
    if (!customer.name || customer.name.trim() === '') {
      console.error('❌ ERRO: Nome do cliente vazio');
      return new Response(
        JSON.stringify({
          error: 'Nome do cliente não encontrado',
          message: 'O cliente precisa ter um nome cadastrado',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Buscar endereço de entrega
    console.log('3. Buscando endereço de entrega...');

    // Prioridade: modified_delivery_address > delivery_address > delivery_schedule
    let deliveryAddress = '';
    let deliveryTime = '';

    if (order.modified_delivery_address) {
      deliveryAddress = order.modified_delivery_address;
      console.log('Usando endereço modificado do pedido');
    } else if (order.delivery_address) {
      deliveryAddress = order.delivery_address;
      console.log('Usando endereço do pedido');
    } else {
      // Buscar do delivery_schedule
      const orderDate = new Date(order.order_date + 'T12:00:00');
      const dayOfWeek = orderDate.getDay() === 0 ? 7 : orderDate.getDay();

      const { data: schedule } = await supabase
        .from('delivery_schedules')
        .select('*')
        .eq('customer_id', order.customer_id)
        .eq('day_of_week', dayOfWeek)
        .eq('meal_type', order.meal_type)
        .eq('is_active', true)
        .maybeSingle();

      if (schedule?.delivery_address) {
        deliveryAddress = schedule.delivery_address;
        console.log('Usando endereço do delivery_schedule');
      }
    }

    // VALIDAÇÃO CRÍTICA: Endereço de entrega
    if (!deliveryAddress || deliveryAddress.trim() === '') {
      console.error('❌ ERRO: Endereço de entrega vazio');
      return new Response(
        JSON.stringify({
          error: 'Endereço de entrega não encontrado',
          message: 'O pedido precisa ter um endereço de entrega',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Endereço de entrega:', deliveryAddress);

    // Horário de entrega
    if (order.modified_delivery_time) {
      deliveryTime = order.modified_delivery_time;
    } else if (order.delivery_time) {
      deliveryTime = order.delivery_time;
    } else {
      deliveryTime = '12:00:00';
    }

    console.log('Horário de entrega:', deliveryTime);

    // 4. Buscar receitas e preparar itens
    console.log('4. Preparando itens do pedido...');
    const items: SischefItem[] = [];
    let totalValue = 0;

    const recipeFields = [
      { field: 'protein_recipe_id', qty: 'protein_amount_gr', cat: 'Proteína' },
      { field: 'carb_recipe_id', qty: 'carb_amount_gr', cat: 'Carboidrato' },
      { field: 'vegetable_recipe_id', qty: 'vegetable_amount_gr', cat: 'Legumes' },
      { field: 'salad_recipe_id', qty: 'salad_amount_gr', cat: 'Salada' },
      { field: 'sauce_recipe_id', qty: 'sauce_amount_gr', cat: 'Molho' },
    ];

    for (const { field, qty, cat } of recipeFields) {
      const recipeId = order[field];
      const quantity = order[qty] || 0;

      if (recipeId && quantity > 0) {
        const { data: recipe } = await supabase
          .from('recipes')
          .select('id, name, sischef_external_id, price_per_kg')
          .eq('id', recipeId)
          .maybeSingle();

        if (!recipe) {
          console.error(`Receita não encontrada: ${cat}`);
          continue;
        }

        // Verificar se tem ID externo do Sischef
        if (!recipe.sischef_external_id) {
          console.error(`❌ Receita sem ID do Sischef: ${recipe.name}`);
          return new Response(
            JSON.stringify({
              error: `Receita "${recipe.name}" não está sincronizada com o Sischef`,
              message: 'Todas as receitas devem ter um ID externo do Sischef',
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const quantityKg = quantity / 1000;
        const unitPrice = recipe.price_per_kg || 0;
        const itemTotal = parseFloat((unitPrice * quantityKg).toFixed(2));
        totalValue += itemTotal;

        items.push({
          nome: recipe.name,
          id: recipe.id,
          quantidade: quantityKg,
          valorDesconto: 0,
          valorUnitario: unitPrice,
          valorTotal: itemTotal,
          subItens: [],
          codigoExterno: recipe.sischef_external_id,
        });

        console.log(`Item adicionado: ${recipe.name} - ${quantity}g (${quantityKg}kg) - R$ ${itemTotal}`);
      }
    }

    if (items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Nenhum item encontrado no pedido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Total de itens: ${items.length}, Valor total: R$ ${totalValue.toFixed(2)}`);

    // 5. Parsear endereço
    console.log('5. Parseando endereço...');
    const addressParts = parseAddress(deliveryAddress);
    console.log('Endereço parseado:', addressParts);

    // 6. Montar payload
    console.log('6. Montando payload...');
    const now = new Date().toISOString();
    const orderDateTime = `${order.order_date}T${deliveryTime}`;
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
        email: customer.email || '',
      },
      enderecoEntrega: addressParts,
      itens: items,
      troco: 0,
      valorDesconto: 0,
      valorTotal: parseFloat(totalValue.toFixed(2)),
      observacoes: `Horário: ${deliveryTime}\nCliente: ${customer.name}${customer.phone ? '\nTel: ' + customer.phone : ''}`,
    };

    console.log('✅ Payload montado com sucesso');
    console.log('Nome do cliente:', payload.cliente.nome);
    console.log('Telefone:', payload.cliente.telefone);
    console.log('Endereço completo:', addressParts);

    // 7. Enviar para Sischef
    console.log('7. Enviando para Sischef...');
    const sischefUrl = 'https://sistema.sischef.com/api-v2/webhook/integracao/OT';
    const sischefToken = '0f035be6-e153-4331-aa5c-b8f191fff759';

    const response = await fetch(sischefUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token-integracao': sischefToken,
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    console.log('Status da resposta:', response.status);
    console.log('Resposta do Sischef:', responseText);

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          error: 'Erro ao enviar para Sischef',
          status: response.status,
          details: responseText,
          payload,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let sischefResponse;
    try {
      sischefResponse = JSON.parse(responseText);
    } catch {
      sischefResponse = { raw: responseText };
    }

    console.log('✅ PEDIDO ENVIADO COM SUCESSO!');
    console.log('===== FIM DO ENVIO =====');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Pedido enviado com sucesso para o Sischef',
        payload,
        sischef_response: sischefResponse,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ ERRO GERAL:', error);
    return new Response(
      JSON.stringify({
        error: 'Erro interno',
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Função para parsear endereço
function parseAddress(fullAddress: string) {
  console.log('Parseando endereço:', fullAddress);

  // Extrair CEP
  const cepMatch = fullAddress.match(/CEP\s*[:.?]?\s*(\d{5}[-.?]?\d{3})/i);
  const cep = cepMatch ? cepMatch[1].replace(/\D/g, '') : '';

  // Remover CEP do endereço
  let addressWithoutCep = fullAddress
    .replace(/,?\s*CEP\s*[:.?]?\s*\d{5}[-.?]?\d{3}/gi, '')
    .trim();

  // Separar por vírgulas
  const parts = addressWithoutCep.split(',').map(p => p.trim()).filter(p => p);

  let logradouro = '';
  let numero = 'S/N';
  let complemento = '';
  let bairro = '';
  let cidade = '';
  let estado = '';

  // Tentar extrair estado (última parte após " - ")
  const lastPart = parts[parts.length - 1] || '';
  const dashIndex = lastPart.lastIndexOf(' - ');

  if (dashIndex !== -1) {
    estado = lastPart.substring(dashIndex + 3).trim();
    parts[parts.length - 1] = lastPart.substring(0, dashIndex).trim();
  }

  // Processar partes do endereço
  if (parts.length >= 5) {
    // Formato: Rua, Número, Complemento, Bairro, Cidade
    logradouro = parts[0];
    numero = parts[1].replace(/^N\s*/i, '').trim();
    complemento = parts[2];
    bairro = parts[3];
    cidade = parts[4];
  } else if (parts.length === 4) {
    // Formato: Rua, Número, Bairro, Cidade
    logradouro = parts[0];
    numero = parts[1].replace(/^N\s*/i, '').trim();
    bairro = parts[2];
    cidade = parts[3];
  } else if (parts.length === 3) {
    // Formato: Rua, Número, Cidade
    logradouro = parts[0];
    numero = parts[1].replace(/^N\s*/i, '').trim();
    cidade = parts[2];
  } else if (parts.length === 2) {
    // Formato: Rua, Número
    logradouro = parts[0];
    numero = parts[1].replace(/^N\s*/i, '').trim();
  } else if (parts.length === 1) {
    logradouro = parts[0];
  }

  return {
    logradouro: logradouro || '',
    numero: numero || 'S/N',
    complemento: complemento || '',
    bairro: bairro || '',
    cidade: cidade || '',
    estado: estado || '',
    cep: cep || '',
  };
}