import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface WebhookPayload {
  phone: string;
  custom_fields: {
    nome?: string;
    endereco?: string;
    horario_pedido?: string;
    proteina?: string;
    carboidrato?: string;
    legumes?: string;
    salada?: string;
    molho_salada?: string;
    refeicao?: string;
  };
  order_date?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const payload: WebhookPayload = await req.json();
    console.log('Webhook recebido:', JSON.stringify(payload, null, 2));

    if (!payload.phone) {
      return new Response(
        JSON.stringify({ error: 'Telefone é obrigatório' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar cliente pelo telefone
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id')
      .eq('phone', payload.phone)
      .maybeSingle();

    if (customerError) {
      console.error('Erro ao buscar cliente:', customerError);
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar cliente', details: customerError }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!customer) {
      return new Response(
        JSON.stringify({ error: 'Cliente não encontrado com este telefone' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Determinar a data do pedido (hoje por padrão)
    const orderDate = payload.order_date || new Date().toISOString().split('T')[0];
    const mealType = payload.custom_fields?.refeicao?.toLowerCase() || 'lunch';

    // Buscar pedido ativo do cliente nesta data e turno
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id')
      .eq('customer_id', customer.id)
      .eq('order_date', orderDate)
      .eq('meal_type', mealType)
      .neq('status', 'cancelled')
      .maybeSingle();

    if (orderError) {
      console.error('Erro ao buscar pedido:', orderError);
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar pedido', details: orderError }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!order) {
      return new Response(
        JSON.stringify({ 
          error: 'Pedido não encontrado para este cliente, data e turno',
          customer_id: customer.id,
          order_date: orderDate,
          meal_type: mealType
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Preparar dados para atualização
    const updateData: any = {};

    // Mapear campos do webhook para campos do banco
    if (payload.custom_fields?.endereco) {
      updateData.delivery_address = payload.custom_fields.endereco;
    }

    if (payload.custom_fields?.horario_pedido) {
      updateData.delivery_time = payload.custom_fields.horario_pedido;
    }

    // Se houver alterações nas receitas, buscar IDs
    if (payload.custom_fields?.proteina) {
      const { data: recipe } = await supabase
        .from('recipes')
        .select('id')
        .eq('name', payload.custom_fields.proteina)
        .eq('category', 'Proteína')
        .maybeSingle();
      
      if (recipe) updateData.protein_recipe_id = recipe.id;
    }

    if (payload.custom_fields?.carboidrato) {
      const { data: recipe } = await supabase
        .from('recipes')
        .select('id')
        .eq('name', payload.custom_fields.carboidrato)
        .eq('category', 'Carboidrato')
        .maybeSingle();
      
      if (recipe) updateData.carb_recipe_id = recipe.id;
    }

    if (payload.custom_fields?.legumes) {
      const { data: recipe } = await supabase
        .from('recipes')
        .select('id')
        .eq('name', payload.custom_fields.legumes)
        .eq('category', 'Legumes')
        .maybeSingle();
      
      if (recipe) updateData.vegetable_recipe_id = recipe.id;
    }

    if (payload.custom_fields?.salada) {
      const { data: recipe } = await supabase
        .from('recipes')
        .select('id')
        .eq('name', payload.custom_fields.salada)
        .eq('category', 'Salada')
        .maybeSingle();
      
      if (recipe) updateData.salad_recipe_id = recipe.id;
    }

    if (payload.custom_fields?.molho_salada) {
      const { data: recipe } = await supabase
        .from('recipes')
        .select('id')
        .eq('name', payload.custom_fields.molho_salada)
        .eq('category', 'Molho Salada')
        .maybeSingle();
      
      if (recipe) updateData.sauce_recipe_id = recipe.id;
    }

    // Se não houver dados para atualizar
    if (Object.keys(updateData).length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'Nenhum dado para atualizar',
          order_id: order.id
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Atualizar pedido
    const { error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', order.id);

    if (updateError) {
      console.error('Erro ao atualizar pedido:', updateError);
      return new Response(
        JSON.stringify({ error: 'Erro ao atualizar pedido', details: updateError }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        message: 'Pedido atualizado com sucesso',
        order_id: order.id,
        updated_fields: Object.keys(updateData),
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