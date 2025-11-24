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
      const brazilTime = new Date(today.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
      const year = brazilTime.getFullYear();
      const month = String(brazilTime.getMonth() + 1).padStart(2, '0');
      const day = String(brazilTime.getDate()).padStart(2, '0');
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

    const dateObj = new Date(date + 'T12:00:00');
    const dayOfWeek = dateObj.getDay();
    const adjustedDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;

    const { data: customersData, error: customersError } = await supabase
      .from('customers')
      .select(`
        *,
        delivery_schedules!delivery_schedules_customer_id_fkey(*)
      `)
      .eq('is_active', true);

    if (customersError) throw customersError;

    const { data: statusData } = await supabase
      .from('order_status')
      .select('*')
      .eq('order_date', date)
      .eq('meal_type', mealType);

    const statusMap = new Map(
      statusData?.map((s: any) => [s.customer_id, s]) || []
    );

    const orders = [];

    for (const customer of customersData || []) {
      const deliverySchedule = customer.delivery_schedules?.find(
        (ds: any) =>
          ds.day_of_week === adjustedDayOfWeek &&
          ds.meal_type === mealType &&
          ds.is_active
      );

      if (deliverySchedule && deliverySchedule.delivery_time && deliverySchedule.delivery_address) {
        const orderStatus = statusMap.get(customer.id);

        const macros = mealType === 'lunch' ? {
          protein: customer.lunch_protein || 0,
          carbs: customer.lunch_carbs || 0,
          fat: customer.lunch_fat || 0,
        } : {
          protein: customer.dinner_protein || 0,
          carbs: customer.dinner_carbs || 0,
          fat: customer.dinner_fat || 0,
        };

        orders.push({
          customer: {
            id: customer.id,
            name: customer.name,
            phone: customer.phone,
            whatsapp: customer.whatsapp,
          },
          delivery: {
            address: deliverySchedule.delivery_address,
            time: deliverySchedule.delivery_time,
            dayOfWeek: adjustedDayOfWeek,
          },
          macros: {
            protein: macros.protein,
            carbs: macros.carbs,
            fat: macros.fat,
          },
          status: {
            kitchen: orderStatus?.kitchen_status || 'pending',
            delivery: orderStatus?.delivery_status || 'not_started',
          },
        });
      }
    }

    orders.sort((a, b) => {
      const timeA = a.delivery.time || '';
      const timeB = b.delivery.time || '';
      return timeA.localeCompare(timeB);
    });

    return new Response(
      JSON.stringify({
        date,
        mealType,
        dayOfWeek: adjustedDayOfWeek,
        totalOrders: orders.length,
        orders,
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