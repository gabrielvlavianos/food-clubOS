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

// Função principal para salvar um pedido no histórico
async function saveOrderToHistory(customer, deliverySchedule, orderDate, mealType, globalSettings) {
  try {
    // Buscar pedido modificado
    const { data: modifiedOrderData } = await supabase
      .from('orders')
      .select('*')
      .eq('customer_id', customer.id)
      .eq('order_date', orderDate)
      .eq('meal_type', mealType)
      .maybeSingle();

    // Buscar menu do dia
    const { data: menuData } = await supabase
      .from('monthly_menu')
      .select('protein_recipe_id, carb_recipe_id, vegetable_recipe_id, salad_recipe_id, sauce_recipe_id')
      .eq('menu_date', orderDate)
      .eq('meal_type', mealType)
      .maybeSingle();

    if (!menuData) {
      console.log(`Menu não encontrado para ${orderDate} - ${mealType}`);
      return false;
    }

    const menu = menuData;
    const modifiedOrder = modifiedOrderData;

    // Buscar receitas
    let proteinRecipe, carbRecipe, vegetableRecipe, saladRecipe, sauceRecipe;

    // Proteína
    if (modifiedOrder?.protein_recipe_id) {
      const { data } = await supabase.from('recipes').select('*').eq('id', modifiedOrder.protein_recipe_id).maybeSingle();
      proteinRecipe = data;
    } else if (modifiedOrder?.modified_protein_name) {
      const { data } = await supabase.from('recipes').select('*').eq('name', modifiedOrder.modified_protein_name).maybeSingle();
      proteinRecipe = data;
    } else if (menu.protein_recipe_id) {
      const { data } = await supabase.from('recipes').select('*').eq('id', menu.protein_recipe_id).maybeSingle();
      proteinRecipe = data;
    }

    // Carboidrato
    if (modifiedOrder?.carb_recipe_id) {
      const { data } = await supabase.from('recipes').select('*').eq('id', modifiedOrder.carb_recipe_id).maybeSingle();
      carbRecipe = data;
    } else if (modifiedOrder?.modified_carb_name) {
      const { data } = await supabase.from('recipes').select('*').eq('name', modifiedOrder.modified_carb_name).maybeSingle();
      carbRecipe = data;
    } else if (menu.carb_recipe_id) {
      const { data } = await supabase.from('recipes').select('*').eq('id', menu.carb_recipe_id).maybeSingle();
      carbRecipe = data;
    }

    // Vegetal
    if (modifiedOrder?.vegetable_recipe_id) {
      const { data } = await supabase.from('recipes').select('*').eq('id', modifiedOrder.vegetable_recipe_id).maybeSingle();
      vegetableRecipe = data;
    } else if (menu.vegetable_recipe_id) {
      const { data } = await supabase.from('recipes').select('*').eq('id', menu.vegetable_recipe_id).maybeSingle();
      vegetableRecipe = data;
    }

    // Salada
    if (modifiedOrder?.salad_recipe_id) {
      const { data } = await supabase.from('recipes').select('*').eq('id', modifiedOrder.salad_recipe_id).maybeSingle();
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
    const targetProtein = mealType === 'lunch' ? Number(customer.lunch_protein) : Number(customer.dinner_protein);
    const targetCarbs = mealType === 'lunch' ? Number(customer.lunch_carbs) : Number(customer.dinner_carbs);
    const targetFat = mealType === 'lunch' ? Number(customer.lunch_fat) : Number(customer.dinner_fat);

    let quantities;
    if (modifiedOrder?.protein_quantity !== null && modifiedOrder?.protein_quantity !== undefined &&
        modifiedOrder?.carb_quantity !== null && modifiedOrder?.carb_quantity !== undefined) {
      quantities = {
        protein: modifiedOrder.protein_quantity,
        carb: modifiedOrder.carb_quantity,
        vegetable: modifiedOrder?.vegetable_quantity ?? globalSettings.vegetables_amount,
        salad: modifiedOrder?.salad_quantity ?? globalSettings.salad_amount,
        sauce: modifiedOrder?.sauce_quantity ?? globalSettings.salad_dressing_amount,
      };
    } else {
      quantities = calculateOrderQuantities(customer, mealType, globalSettings, proteinRecipe, carbRecipe);
    }

    // Calcular macros reais
    const actualMacros = calculateActualMacros(quantities, proteinRecipe, carbRecipe, vegetableRecipe, saladRecipe);
    const targetKcal = (targetProtein * 4) + (targetCarbs * 4) + (targetFat * 9);

    // Calcular pickup_time (10 minutos antes do delivery_time)
    const deliveryTime = deliverySchedule.delivery_time;
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
      .eq('order_date', orderDate)
      .eq('meal_type', mealType)
      .maybeSingle();

    if (existingHistory) {
      console.log(`Pedido já existe no histórico: ${customer.name} - ${orderDate} - ${mealType}`);
      return false;
    }

    // Inserir no histórico
    const { error } = await supabase
      .from('order_history')
      .insert({
        customer_id: customer.id,
        customer_name: customer.name,
        order_date: orderDate,
        meal_type: mealType,
        delivery_time: deliverySchedule.delivery_time,
        pickup_time: pickupTime,
        delivery_address: deliverySchedule.delivery_address,
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
        kitchen_status: 'ready',
        delivery_status: 'delivered',
      });

    if (error) {
      console.error(`Erro ao inserir pedido: ${customer.name} - ${orderDate} - ${mealType}`, error);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`Erro ao processar pedido: ${customer.name} - ${orderDate} - ${mealType}`, error);
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

  // Datas para migrar (01/12/2025 até 09/12/2025)
  const dates = [
    '2025-12-01',
    '2025-12-02',
    '2025-12-03',
    '2025-12-04',
    '2025-12-05',
    '2025-12-06',
    '2025-12-07',
    '2025-12-08',
    '2025-12-09',
  ];

  const mealTypes = ['lunch', 'dinner'];

  let totalSuccess = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const date of dates) {
    for (const mealType of mealTypes) {
      console.log(`\nProcessando: ${date} - ${mealType === 'lunch' ? 'Almoço' : 'Jantar'}`);

      // Buscar clientes ativos
      const { data: customers } = await supabase
        .from('customers')
        .select('*')
        .eq('status', 'active');

      if (!customers || customers.length === 0) {
        console.log('Nenhum cliente ativo encontrado');
        continue;
      }

      // Para cada cliente, verificar se tem agendamento
      for (const customer of customers) {
        const dateObj = new Date(date + 'T12:00:00');
        const dayOfWeek = dateObj.getDay(); // 0 = domingo, 1 = segunda, etc.

        // Buscar agendamento de entrega para este dia da semana e turno
        const { data: schedules } = await supabase
          .from('delivery_schedules')
          .select('*')
          .eq('customer_id', customer.id)
          .eq('day_of_week', dayOfWeek)
          .eq('meal_type', mealType);

        if (!schedules || schedules.length === 0) {
          continue;
        }

        const schedule = schedules[0];

        // Salvar no histórico
        const result = await saveOrderToHistory(customer, schedule, date, mealType, globalSettings);

        if (result) {
          totalSuccess++;
          console.log(`✓ ${customer.name}`);
        } else {
          totalSkipped++;
        }
      }
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('Migração concluída!');
  console.log(`Total salvos: ${totalSuccess}`);
  console.log(`Total ignorados (já existiam): ${totalSkipped}`);
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
