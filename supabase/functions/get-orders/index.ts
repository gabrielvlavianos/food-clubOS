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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const mealType = url.searchParams.get('mealType');
    let date = url.searchParams.get('date');

    if (!date) {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      date = `${year}-${month}-${day}`;
    }

    if (!mealType) {
      return new Response(
        JSON.stringify({ error: 'mealType parameter is required (lunch or dinner)' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (mealType !== 'lunch' && mealType !== 'dinner') {
      return new Response(
        JSON.stringify({ error: 'mealType must be either "lunch" or "dinner"' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        id,
        delivery_date,
        meal_type,
        status,
        customer_id,
        customers (
          id,
          name,
          phone,
          address
        ),
        protein,
        carb,
        veggie_mix,
        molho_salada
      `)
      .eq('delivery_date', date)
      .eq('meal_type', mealType)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({
        date,
        mealType,
        totalOrders: orders?.length || 0,
        orders: orders || [],
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});