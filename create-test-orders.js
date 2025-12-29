import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Read .env file
const envContent = readFileSync('.env', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function createTestOrders() {
  const orderDate = '2025-12-29';
  const dateObj = new Date(orderDate + 'T12:00:00');
  const dayOfWeek = dateObj.getDay() === 0 ? 7 : dateObj.getDay(); // 7 = domingo

  console.log(`Creating test orders for ${orderDate} (day of week: ${dayOfWeek})`);

  // 1. Get active customers with delivery schedules for today
  const { data: customers, error: customersError } = await supabase
    .from('customers')
    .select(`
      *,
      delivery_schedules!delivery_schedules_customer_id_fkey(*)
    `)
    .eq('status', 'active')
    .eq('is_active', true);

  if (customersError) {
    console.error('Error fetching customers:', customersError);
    return;
  }

  console.log(`Found ${customers.length} active customers`);

  // 2. Get menu for today
  const { data: lunchMenu } = await supabase
    .from('monthly_menu')
    .select('*')
    .eq('menu_date', orderDate)
    .eq('meal_type', 'lunch')
    .maybeSingle();

  const { data: dinnerMenu } = await supabase
    .from('monthly_menu')
    .select('*')
    .eq('menu_date', orderDate)
    .eq('meal_type', 'dinner')
    .maybeSingle();

  console.log('Lunch menu:', lunchMenu ? 'Found' : 'Not found');
  console.log('Dinner menu:', dinnerMenu ? 'Found' : 'Not found');

  // 3. Get global settings for calculations
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

  let ordersCreated = 0;
  let ordersSkipped = 0;

  // 4. Create orders for each customer
  for (const customer of customers) {
    const deliverySchedules = customer.delivery_schedules || [];

    for (const schedule of deliverySchedules) {
      if (schedule.day_of_week !== dayOfWeek || !schedule.is_active) {
        continue;
      }

      if (!schedule.delivery_time || !schedule.delivery_address) {
        console.log(`Skipping ${customer.name} - ${schedule.meal_type}: Missing time or address`);
        ordersSkipped++;
        continue;
      }

      const menu = schedule.meal_type === 'lunch' ? lunchMenu : dinnerMenu;

      if (!menu) {
        console.log(`Skipping ${customer.name} - ${schedule.meal_type}: No menu for this meal type`);
        ordersSkipped++;
        continue;
      }

      // Check if order already exists
      const { data: existingOrder } = await supabase
        .from('orders')
        .select('id')
        .eq('customer_id', customer.id)
        .eq('order_date', orderDate)
        .eq('meal_type', schedule.meal_type)
        .maybeSingle();

      if (existingOrder) {
        console.log(`Order already exists for ${customer.name} - ${schedule.meal_type}`);
        ordersSkipped++;
        continue;
      }

      // Calculate quantities (simplified version)
      const mealType = schedule.meal_type;
      const targetProtein = mealType === 'lunch' ? customer.lunch_protein : customer.dinner_protein;
      const targetCarb = mealType === 'lunch' ? customer.lunch_carbs : customer.dinner_carbs;

      // Get recipes from menu
      const proteinRecipeId = menu.protein_recipe_id;
      const carbRecipeId = menu.carb_recipe_id;
      const vegetableRecipeId = menu.vegetable_recipe_id;
      const saladRecipeId = menu.salad_recipe_id;
      const sauceRecipeId = menu.sauce_recipe_id;

      // Fetch recipe macros for calculations
      let proteinAmount = 0;
      let carbAmount = 0;

      if (proteinRecipeId && targetProtein > 0) {
        const { data: proteinRecipe } = await supabase
          .from('recipes')
          .select('protein_per_100g')
          .eq('id', proteinRecipeId)
          .maybeSingle();

        if (proteinRecipe && proteinRecipe.protein_per_100g > 0) {
          proteinAmount = Math.round((targetProtein / proteinRecipe.protein_per_100g) * 100);
        }
      }

      if (carbRecipeId && targetCarb > 0) {
        const { data: carbRecipe } = await supabase
          .from('recipes')
          .select('carb_per_100g')
          .eq('id', carbRecipeId)
          .maybeSingle();

        if (carbRecipe && carbRecipe.carb_per_100g > 0) {
          carbAmount = Math.round((targetCarb / carbRecipe.carb_per_100g) * 100);
        }
      }

      // Create order
      const orderData = {
        customer_id: customer.id,
        order_date: orderDate,
        meal_type: schedule.meal_type,
        protein_recipe_id: proteinRecipeId,
        protein_amount_gr: proteinAmount,
        carb_recipe_id: carbRecipeId,
        carb_amount_gr: carbAmount,
        vegetable_recipe_id: vegetableRecipeId,
        vegetable_amount_gr: globalSettings.vegetables_amount,
        salad_recipe_id: saladRecipeId,
        salad_amount_gr: globalSettings.salad_amount,
        sauce_recipe_id: sauceRecipeId,
        sauce_amount_gr: globalSettings.salad_dressing_amount,
        delivery_address: schedule.delivery_address,
        delivery_time: schedule.delivery_time,
        status: 'pending',
      };

      const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (orderError) {
        console.error(`Error creating order for ${customer.name}:`, orderError);
        ordersSkipped++;
      } else {
        console.log(`✓ Created order for ${customer.name} - ${schedule.meal_type} (ID: ${newOrder.id})`);
        ordersCreated++;
      }
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Orders created: ${ordersCreated}`);
  console.log(`Orders skipped: ${ordersSkipped}`);
  console.log('\nYou can now test sending these orders to Sischef from the Kitchen page!');
}

createTestOrders().catch(console.error);
