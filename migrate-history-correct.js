const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://yqbcuqmrdrwzyttvqkok.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxYmN1cW1yZHJ3enl0dHZxa29rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3MjI3OTUsImV4cCI6MjA3ODI5ODc5NX0.hIG34aV9PUDIaOop5hMI0wZj8Jm2XVvBBcuruVEdtqc';

const supabase = createClient(supabaseUrl, supabaseKey);

// Função auxiliar para calcular macros
function calculateActualMacros(quantities, proteinRecipe, carbRecipe, vegetableRecipe, saladRecipe) {
  let totalKcal = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;

  if (proteinRecipe && quantities.protein > 0) {
    const factor = quantities.protein / 100;
    totalKcal += proteinRecipe.kcal_per_100g * factor;
    totalProtein += proteinRecipe.protein_per_100g * factor;
    totalCarbs += proteinRecipe.carb_per_100g * factor;
    totalFat += proteinRecipe.fat_per_100g * factor;
  }

  if (carbRecipe && quantities.carb > 0) {
    const factor = quantities.carb / 100;
    totalKcal += carbRecipe.kcal_per_100g * factor;
    totalProtein += carbRecipe.protein_per_100g * factor;
    totalCarbs += carbRecipe.carb_per_100g * factor;
    totalFat += carbRecipe.fat_per_100g * factor;
  }

  if (vegetableRecipe && quantities.vegetable > 0) {
    const factor = quantities.vegetable / 100;
    totalKcal += vegetableRecipe.kcal_per_100g * factor;
    totalProtein += vegetableRecipe.protein_per_100g * factor;
    totalCarbs += vegetableRecipe.carb_per_100g * factor;
    totalFat += vegetableRecipe.fat_per_100g * factor;
  }

  if (saladRecipe && quantities.salad > 0) {
    const factor = quantities.salad / 100;
    totalKcal += saladRecipe.kcal_per_100g * factor;
    totalProtein += saladRecipe.protein_per_100g * factor;
    totalCarbs += saladRecipe.carb_per_100g * factor;
    totalFat += saladRecipe.fat_per_100g * factor;
  }

  return {
    kcal: totalKcal,
    protein: totalProtein,
    carbs: totalCarbs,
    fat: totalFat,
  };
}

// Função para calcular quantidades de um pedido
function calculateOrderQuantities(customer, mealType, globalSettings, proteinRecipe, carbRecipe) {
  const targetProtein = mealType === 'lunch' ? Number(customer.lunch_protein) : Number(customer.dinner_protein);
  const targetCarbs = mealType === 'lunch' ? Number(customer.lunch_carbs) : Number(customer.dinner_carbs);

  let proteinQuantity = 0;
  let carbQuantity = 0;

  if (proteinRecipe && proteinRecipe.protein_per_100g > 0) {
    proteinQuantity = (targetProtein / proteinRecipe.protein_per_100g) * 100;
  }

  if (carbRecipe && carbRecipe.carb_per_100g > 0) {
    carbQuantity = (targetCarbs / carbRecipe.carb_per_100g) * 100;
  }

  return {
    protein: Math.round(proteinQuantity),
    carb: Math.round(carbQuantity),
    vegetable: globalSettings.vegetables_amount,
    salad: globalSettings.salad_amount,
    sauce: globalSettings.salad_dressing_amount,
  };
}

// Função principal para migrar um pedido da tabela orders para o histórico
async function migrateOrderToHistory(order, globalSettings) {
  try {
    // Buscar dados do cliente
    const { data: customer } = await supabase
      .from('customers')
      .select('*')
      .eq('id', order.customer_id)
      .maybeSingle();

    if (!customer) {
      console.log(`Cliente não encontrado: ${order.customer_id}`);
      return false;
    }

    // Buscar agendamento de entrega
    const dateObj = new Date(order.order_date + 'T12:00:00');
    const dayOfWeek = dateObj.getDay();

    const { data: schedules } = await supabase
      .from('delivery_schedules')
      .select('*')
      .eq('customer_id', order.customer_id)
      .eq('day_of_week', dayOfWeek)
      .eq('meal_type', order.meal_type);

    if (!schedules || schedules.length === 0) {
      console.log(`Agendamento não encontrado para ${customer.name} - ${order.order_date} - ${order.meal_type}`);
      return false;
    }

    const schedule = schedules[0];

    // Buscar menu do dia
    const { data: menuData } = await supabase
      .from('monthly_menu')
      .select('protein_recipe_id, carb_recipe_id, vegetable_recipe_id, salad_recipe_id, sauce_recipe_id')
      .eq('menu_date', order.order_date)
      .eq('meal_type', order.meal_type)
      .maybeSingle();

    if (!menuData) {
      console.log(`Menu não encontrado para ${order.order_date} - ${order.meal_type}`);
      return false;
    }

    const menu = menuData;

    // Buscar receitas
    let proteinRecipe, carbRecipe, vegetableRecipe, saladRecipe, sauceRecipe;

    // Proteína
    if (order.protein_recipe_id) {
      const { data } = await supabase.from('recipes').select('*').eq('id', order.protein_recipe_id).maybeSingle();
      proteinRecipe = data;
    } else if (order.modified_protein_name) {
      const { data } = await supabase.from('recipes').select('*').eq('name', order.modified_protein_name).maybeSingle();
      proteinRecipe = data;
    } else if (menu.protein_recipe_id) {
      const { data } = await supabase.from('recipes').select('*').eq('id', menu.protein_recipe_id).maybeSingle();
      proteinRecipe = data;
    }

    // Carboidrato
    if (order.carb_recipe_id) {
      const { data } = await supabase.from('recipes').select('*').eq('id', order.carb_recipe_id).maybeSingle();
      carbRecipe = data;
    } else if (order.modified_carb_name) {
      const { data } = await supabase.from('recipes').select('*').eq('name', order.modified_carb_name).maybeSingle();
      carbRecipe = data;
    } else if (menu.carb_recipe_id) {
      const { data } = await supabase.from('recipes').select('*').eq('id', menu.carb_recipe_id).maybeSingle();
      carbRecipe = data;
    }

    // Vegetal
    if (order.vegetable_recipe_id) {
      const { data } = await supabase.from('recipes').select('*').eq('id', order.vegetable_recipe_id).maybeSingle();
      vegetableRecipe = data;
    } else if (menu.vegetable_recipe_id) {
      const { data } = await supabase.from('recipes').select('*').eq('id', menu.vegetable_recipe_id).maybeSingle();
      vegetableRecipe = data;
    }

    // Salada
    if (order.salad_recipe_id) {
      const { data } = await supabase.from('recipes').select('*').eq('id', order.salad_recipe_id).maybeSingle();
      saladRecipe = data;
    } else if (menu.salad_recipe_id) {
      const { data } = await supabase.from('recipes').select('*').eq('id', menu.salad_recipe_id).maybeSingle();
      saladRecipe = data;
    }

    // Molho
    if (menu.sauce_recipe_id) {
      const { data } = await supabase.from('recipes').select('*').eq('id', menu.sauce_recipe_id).maybeSingle();
      sauceRecipe = data;
    }

    // Calcular quantidades
    const targetProtein = order.meal_type === 'lunch' ? Number(customer.lunch_protein) : Number(customer.dinner_protein);
    const targetCarbs = order.meal_type === 'lunch' ? Number(customer.lunch_carbs) : Number(customer.dinner_carbs);
    const targetFat = order.meal_type === 'lunch' ? Number(customer.lunch_fat) : Number(customer.dinner_fat);

    let quantities;
    if (order.protein_quantity !== null && order.protein_quantity !== undefined &&
        order.carb_quantity !== null && order.carb_quantity !== undefined) {
      quantities = {
        protein: order.protein_quantity,
        carb: order.carb_quantity,
        vegetable: order.vegetable_quantity ?? globalSettings.vegetables_amount,
        salad: order.salad_quantity ?? globalSettings.salad_amount,
        sauce: order.sauce_quantity ?? globalSettings.salad_dressing_amount,
      };
    } else {
      quantities = calculateOrderQuantities(customer, order.meal_type, globalSettings, proteinRecipe, carbRecipe);
    }

    // Calcular macros reais
    const actualMacros = calculateActualMacros(quantities, proteinRecipe, carbRecipe, vegetableRecipe, saladRecipe);
    const targetKcal = (targetProtein * 4) + (targetCarbs * 4) + (targetFat * 9);

    // Calcular pickup_time (10 minutos antes do delivery_time)
    const deliveryTime = schedule.delivery_time;
    const [hours, minutes] = deliveryTime.split(':').map(Number);
    const pickupMinutes = hours * 60 + minutes - 10;
    const pickupHours = Math.floor(pickupMinutes / 60);
    const pickupMins = pickupMinutes % 60;
    const pickupTime = `${pickupHours.toString().padStart(2, '0')}:${pickupMins.toString().padStart(2, '0')}`;

    // Verificar se já existe no histórico
    const { data: existingHistory } = await supabase
      .from('order_history')
      .select('id')
      .eq('customer_id', customer.id)
      .eq('order_date', order.order_date)
      .eq('meal_type', order.meal_type)
      .maybeSingle();

    if (existingHistory) {
      console.log(`Pedido já existe no histórico: ${customer.name} - ${order.order_date} - ${order.meal_type}`);
      return false;
    }

    // Determinar status final
    const finalKitchenStatus = order.status === 'cancelled' ? 'cancelled' : 'ready';
    const finalDeliveryStatus = order.status === 'cancelled' ? 'cancelled' : 'delivered';

    // Inserir no histórico
    const { error } = await supabase
      .from('order_history')
      .insert({
        customer_id: customer.id,
        customer_name: customer.name,
        order_date: order.order_date,
        meal_type: order.meal_type,
        delivery_time: schedule.delivery_time,
        pickup_time: pickupTime,
        delivery_address: schedule.delivery_address,
        protein_name: proteinRecipe?.name || null,
        protein_quantity: quantities.protein,
        carb_name: carbRecipe?.name || null,
        carb_quantity: quantities.carb,
        vegetable_name: vegetableRecipe?.name || null,
        vegetable_quantity: quantities.vegetable,
        salad_name: saladRecipe?.name || null,
        salad_quantity: quantities.salad,
        sauce_name: sauceRecipe?.name || null,
        sauce_quantity: quantities.sauce,
        target_kcal: targetKcal,
        target_protein: targetProtein,
        target_carbs: targetCarbs,
        target_fat: targetFat,
        delivered_kcal: actualMacros.kcal,
        delivered_protein: actualMacros.protein,
        delivered_carbs: actualMacros.carbs,
        delivered_fat: actualMacros.fat,
        kitchen_status: finalKitchenStatus,
        delivery_status: finalDeliveryStatus,
      });

    if (error) {
      console.error(`Erro ao inserir pedido: ${customer.name} - ${order.order_date} - ${order.meal_type}`, error);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`Erro ao processar pedido:`, error);
    return false;
  }
}

// Função principal
async function migrateOrders() {
  console.log('Iniciando migração de pedidos para o histórico...\n');

  // Carregar configurações globais
  const { data: settings } = await supabase
    .from('global_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  const globalSettings = {
    vegetables_amount: settings?.vegetables_amount || 100,
    salad_amount: settings?.salad_amount || 100,
    salad_dressing_amount: settings?.salad_dressing_amount || 30,
  };

  // Buscar todos os pedidos da tabela orders para o período
  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .gte('order_date', '2025-12-01')
    .lte('order_date', '2025-12-09')
    .order('order_date')
    .order('meal_type')
    .order('customer_id');

  if (!orders || orders.length === 0) {
    console.log('Nenhum pedido encontrado para migrar');
    return;
  }

  console.log(`Encontrados ${orders.length} pedidos para migrar\n`);

  let totalSuccess = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const order of orders) {
    const result = await migrateOrderToHistory(order, globalSettings);

    if (result) {
      totalSuccess++;
      console.log(`✓ Migrado: ${order.order_date} - ${order.meal_type}`);
    } else {
      totalSkipped++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('Migração concluída!');
  console.log(`Total salvos: ${totalSuccess}`);
  console.log(`Total ignorados: ${totalSkipped}`);
  console.log(`Total erros: ${totalErrors}`);
  console.log('='.repeat(50));
}

// Executar
migrateOrders()
  .then(() => {
    console.log('\nScript finalizado com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nErro fatal:', error);
    process.exit(1);
  });
