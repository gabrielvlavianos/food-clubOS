import { Recipe, PrepItemWithRecipe, MacroTotals, PrepSessionSummary, RecipeCategory } from '@/types';

export function roundToMultipleOf10(value: number): number {
  return Math.round(value / 10) * 10;
}

export function calculateItemMacros(recipe: Recipe, weightGr: number): MacroTotals {
  const factor = weightGr / 100;

  return {
    kcal: recipe.kcal_per_100g * factor,
    protein: recipe.protein_per_100g * factor,
    carb: recipe.carb_per_100g * factor,
    fat: recipe.fat_per_100g * factor,
    cost: recipe.cost_per_100g * factor,
    weightGr,
  };
}

export function calculateSessionSummary(items: PrepItemWithRecipe[]): PrepSessionSummary {
  const totalsByCategory: Record<RecipeCategory, MacroTotals> = {
    'Proteína': { kcal: 0, protein: 0, carb: 0, fat: 0, cost: 0, weightGr: 0 },
    'Carboidrato': { kcal: 0, protein: 0, carb: 0, fat: 0, cost: 0, weightGr: 0 },
    'Legumes': { kcal: 0, protein: 0, carb: 0, fat: 0, cost: 0, weightGr: 0 },
    'Salada': { kcal: 0, protein: 0, carb: 0, fat: 0, cost: 0, weightGr: 0 },
    'Marinada': { kcal: 0, protein: 0, carb: 0, fat: 0, cost: 0, weightGr: 0 },
    'Molho Salada': { kcal: 0, protein: 0, carb: 0, fat: 0, cost: 0, weightGr: 0 },
  };

  const grandTotals: MacroTotals = {
    kcal: 0,
    protein: 0,
    carb: 0,
    fat: 0,
    cost: 0,
    weightGr: 0,
  };

  items.forEach((item) => {
    const itemMacros = calculateItemMacros(item.recipe, item.total_weight_gr);
    const category = item.recipe.category;

    totalsByCategory[category].kcal += itemMacros.kcal;
    totalsByCategory[category].protein += itemMacros.protein;
    totalsByCategory[category].carb += itemMacros.carb;
    totalsByCategory[category].fat += itemMacros.fat;
    totalsByCategory[category].cost += itemMacros.cost;
    totalsByCategory[category].weightGr += itemMacros.weightGr;

    if (category !== 'Marinada' && category !== 'Molho Salada') {
      grandTotals.kcal += itemMacros.kcal;
      grandTotals.protein += itemMacros.protein;
      grandTotals.carb += itemMacros.carb;
      grandTotals.fat += itemMacros.fat;
    }

    grandTotals.cost += itemMacros.cost;
    grandTotals.weightGr += itemMacros.weightGr;
  });

  return { totalsByCategory, grandTotals };
}

export function formatMacro(value: number): string {
  return value.toFixed(1);
}

export function formatCost(value: number): string {
  return `R$ ${value.toFixed(2)}`;
}

export function formatWeight(weightGr: number): string {
  if (weightGr >= 1000) {
    return `${(weightGr / 1000).toFixed(2)} kg`;
  }
  return `${weightGr.toFixed(0)} g`;
}

interface CustomerData {
  gender: string;
  height_cm: number;
  current_weight_kg: number;
  goal_weight_kg: number;
  work_routine: string;
  aerobic_frequency: string;
  aerobic_intensity: string;
  strength_frequency: string;
  strength_intensity: string;
  main_goal: string;
  birth_date: string;
  meals_per_day?: number;
}

interface MacroRecommendation {
  lunch: {
    protein: number;
    carb: number;
    fat: number;
  };
  dinner: {
    protein: number;
    carb: number;
    fat: number;
  };
  daily: {
    protein: number;
    carb: number;
    fat: number;
    kcal: number;
  };
}

function calculateAge(birthDate: string): number {
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

function calculateBMR(customer: CustomerData): number {
  const age = calculateAge(customer.birth_date);
  const weight = customer.current_weight_kg;
  const height = customer.height_cm;
  const isMale = customer.gender === 'Masculino';

  if (isMale) {
    return 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    return 10 * weight + 6.25 * height - 5 * age - 161;
  }
}

function calculateActivityMultiplier(customer: CustomerData): number {
  const workActivityLevel: Record<string, number> = {
    'Sedentário': 0.2,
    'Levemente ativo': 0.375,
    'Moderadamente ativo': 0.55,
    'Muito ativo': 0.725,
    'Extremamente ativo': 0.9
  };

  const frequencyScore: Record<string, number> = {
    'Nenhuma': 0,
    '1-2x por semana': 1,
    '3-4x por semana': 2,
    '5-6x por semana': 3,
    'Diariamente': 4
  };

  const intensityScore: Record<string, number> = {
    'Leve': 0.5,
    'Moderada': 1,
    'Intensa': 1.5
  };

  const workBase = workActivityLevel[customer.work_routine] || 0.2;

  const aerobicScore = (frequencyScore[customer.aerobic_frequency] || 0) *
                       (intensityScore[customer.aerobic_intensity] || 0);
  const strengthScore = (frequencyScore[customer.strength_frequency] || 0) *
                        (intensityScore[customer.strength_intensity] || 0);

  const exerciseBonus = (aerobicScore + strengthScore) * 0.05;

  return 1.2 + workBase + exerciseBonus;
}

function calculateTDEE(customer: CustomerData): number {
  const bmr = calculateBMR(customer);
  const activityMultiplier = calculateActivityMultiplier(customer);
  return bmr * activityMultiplier;
}

function adjustCaloriesForGoal(tdee: number, mainGoal: string, currentWeight: number, goalWeight: number): number {
  const goalAdjustments: Record<string, number> = {
    'Emagrecimento': -500,
    'Manutenção de peso': 0,
    'Ganho de massa muscular': 300,
    'Definição muscular': -300,
    'Performance esportiva': 200,
    'Saúde e bem-estar': 0
  };

  let adjustment = goalAdjustments[mainGoal] || 0;

  if (mainGoal === 'Emagrecimento' && currentWeight > goalWeight) {
    const deficit = Math.min(currentWeight - goalWeight, 20) * 10;
    adjustment = Math.min(adjustment - deficit, -300);
  }

  return Math.round(tdee + adjustment);
}

export function calculateMacroRecommendation(customer: CustomerData): MacroRecommendation {
  const tdee = calculateTDEE(customer);
  const targetCalories = adjustCaloriesForGoal(
    tdee,
    customer.main_goal,
    customer.current_weight_kg,
    customer.goal_weight_kg
  );

  const proteinPerKg = customer.main_goal === 'Ganho de massa muscular' ? 2.2 :
                       customer.main_goal === 'Definição muscular' ? 2.4 :
                       customer.main_goal === 'Emagrecimento' ? 2.0 : 1.8;

  const dailyProtein = customer.current_weight_kg * proteinPerKg;

  const fatPercentage = customer.main_goal === 'Ganho de massa muscular' ? 0.25 : 0.30;
  const dailyFat = (targetCalories * fatPercentage) / 9;

  const proteinCalories = dailyProtein * 4;
  const fatCalories = dailyFat * 9;
  const carbCalories = targetCalories - proteinCalories - fatCalories;
  const dailyCarb = carbCalories / 4;

  const mealsPerDay = customer.meals_per_day || 3;
  const lunchDinnerPercentage = mealsPerDay === 2 ? 1.0 :
                                 mealsPerDay === 3 ? 0.70 :
                                 mealsPerDay === 4 ? 0.55 : 0.45;

  const lunchPercentage = 0.55;
  const dinnerPercentage = 0.45;

  const lunchProtein = Math.round((dailyProtein * lunchDinnerPercentage * lunchPercentage) * 10) / 10;
  const lunchCarb = Math.round((dailyCarb * lunchDinnerPercentage * lunchPercentage) * 10) / 10;
  const lunchFat = Math.round((dailyFat * lunchDinnerPercentage * lunchPercentage) * 10) / 10;

  const dinnerProtein = Math.round((dailyProtein * lunchDinnerPercentage * dinnerPercentage) * 10) / 10;
  const dinnerCarb = Math.round((dailyCarb * lunchDinnerPercentage * dinnerPercentage) * 10) / 10;
  const dinnerFat = Math.round((dailyFat * lunchDinnerPercentage * dinnerPercentage) * 10) / 10;

  return {
    lunch: {
      protein: lunchProtein,
      carb: lunchCarb,
      fat: lunchFat
    },
    dinner: {
      protein: dinnerProtein,
      carb: dinnerCarb,
      fat: dinnerFat
    },
    daily: {
      protein: Math.round(dailyProtein * 10) / 10,
      carb: Math.round(dailyCarb * 10) / 10,
      fat: Math.round(dailyFat * 10) / 10,
      kcal: targetCalories
    }
  };
}
