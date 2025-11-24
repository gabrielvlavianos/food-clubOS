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
    const phone = url.searchParams.get('phone');
    const mealType = url.searchParams.get('mealType');
    let date = url.searchParams.get('date');

    if (!phone) {
      return new Response(
        JSON.stringify({ error: 'phone parameter is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

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

    const cleanPhone = phone.replace(/\D/g, '');

    const { data: customerData, error: customerError } = await supabase
      .from('customers')
      .select(`
        *,
        delivery_schedules!delivery_schedules_customer_id_fkey(*)
      `)
      .eq('is_active', true)
      .or(`phone.ilike.%${cleanPhone}%,whatsapp.ilike.%${cleanPhone}%`)
      .maybeSingle();

    if (customerError) throw customerError;

    if (!customerData) {
      return new Response(
        JSON.stringify({
          error: 'Customer not found',
          message: `No active customer found with phone number: ${phone}`
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const dateObj = new Date(date + 'T12:00:00');
    const dayOfWeek = dateObj.getDay();
    const adjustedDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;

    const deliverySchedule = customerData.delivery_schedules?.find(
      (ds: any) =>
        ds.day_of_week === adjustedDayOfWeek &&
        ds.meal_type === mealType &&
        ds.is_active
    );

    if (!deliverySchedule || !deliverySchedule.delivery_time || !deliverySchedule.delivery_address) {
      return new Response(
        JSON.stringify({
          error: 'No delivery scheduled',
          message: `Customer ${customerData.name} does not have a delivery scheduled for ${mealType} on ${date}`
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: statusData } = await supabase
      .from('order_status')
      .select('*')
      .eq('order_date', date)
      .eq('meal_type', mealType)
      .eq('customer_id', customerData.id)
      .maybeSingle();

    const { data: menuData } = await supabase
      .from('monthly_menu')
      .select(`
        *,
        protein_recipe:recipes!monthly_menu_protein_recipe_id_fkey(name),
        carb_recipe:recipes!monthly_menu_carb_recipe_id_fkey(name),
        vegetable_recipe:recipes!monthly_menu_vegetable_recipe_id_fkey(name),
        salad_recipe:recipes!monthly_menu_salad_recipe_id_fkey(name),
        sauce_recipe:recipes!monthly_menu_sauce_recipe_id_fkey(name)
      `)
      .eq('menu_date', date)
      .eq('meal_type', mealType)
      .maybeSingle();

    const menu = menuData ? {
      protein: menuData.protein_recipe?.name || null,
      carb: menuData.carb_recipe?.name || null,
      vegetable: menuData.vegetable_recipe?.name || null,
      salad: menuData.salad_recipe?.name || null,
      sauce: menuData.sauce_recipe?.name || null,
    } : {
      protein: null,
      carb: null,
      vegetable: null,
      salad: null,
      sauce: null,
    };

    const orderData = {
      date,
      mealType,
      dayOfWeek: adjustedDayOfWeek,
      customer: {
        id: customerData.id,
        name: customerData.name,
        phone: customerData.phone,
        whatsapp: customerData.whatsapp,
      },
      delivery: {
        address: deliverySchedule.delivery_address,
        time: deliverySchedule.delivery_time,
        dayOfWeek: adjustedDayOfWeek,
      },
      meal: {
        protein: menu.protein,
        carb: menu.carb,
        vegetable: menu.vegetable,
        salad: menu.salad,
        sauce: menu.sauce,
      },
      status: {
        kitchen: statusData?.kitchen_status || 'pending',
        delivery: statusData?.delivery_status || 'not_started',
      },
    };

    return new Response(
      JSON.stringify(orderData),
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