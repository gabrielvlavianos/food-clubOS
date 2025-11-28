import { Recipe, PrepItemWithRecipe, MacroTotals, PrepSessionSummary, RecipeCategory } from '@/types';
import { supabase } from '@/lib/supabase';

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

interface MacroSettings {
  work_sedentary: number;
  work_light_active: number;
  work_moderate_active: number;
  work_very_active: number;
  work_extremely_active: number;
  freq_none: number;
  freq_1_2_week: number;
  freq_3_4_week: number;
  freq_5_6_week: number;
  freq_daily: number;
  intensity_light: number;
  intensity_moderate: number;
  intensity_intense: number;
  exercise_bonus_multiplier: number;
  goal_weight_loss_offset: number;
  goal_maintenance_offset: number;
  goal_muscle_gain_offset: number;
  goal_definition_offset: number;
  goal_performance_offset: number;
  goal_health_offset: number;
  protein_weight_loss: number;
  protein_maintenance: number;
  protein_muscle_gain: number;
  protein_definition: number;
  protein_performance: number;
  protein_health: number;
  fat_percentage_muscle_gain: number;
  fat_percentage_default: number;
  lunch_percentage: number;
  dinner_percentage: number;
  meals_2_lunch_dinner_pct: number;
  meals_3_lunch_dinner_pct: number;
  meals_4_lunch_dinner_pct: number;
  meals_5plus_lunch_dinner_pct: number;
}

async function getMacroSettings(): Promise<MacroSettings> {
  const { data, error } = await supabase
    .from('macro_calculation_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  if (error || !data) {
    return {
      work_sedentary: 0.2,
      work_light_active: 0.375,
      work_moderate_active: 0.55,
      work_very_active: 0.725,
      work_extremely_active: 0.9,
      freq_none: 0,
      freq_1_2_week: 1,
      freq_3_4_week: 2,
      freq_5_6_week: 3,
      freq_daily: 4,
      intensity_light: 0.5,
      intensity_moderate: 1,
      intensity_intense: 1.5,
      exercise_bonus_multiplier: 0.05,
      goal_weight_loss_offset: -500,
      goal_maintenance_offset: 0,
      goal_muscle_gain_offset: 300,
      goal_definition_offset: -300,
      goal_performance_offset: 200,
      goal_health_offset: 0,
      protein_weight_loss: 2.0,
      protein_maintenance: 1.8,
      protein_muscle_gain: 2.2,
      protein_definition: 2.4,
      protein_performance: 1.8,
      protein_health: 1.8,
      fat_percentage_muscle_gain: 0.25,
      fat_percentage_default: 0.30,
      lunch_percentage: 0.55,
      dinner_percentage: 0.45,
      meals_2_lunch_dinner_pct: 1.0,
      meals_3_lunch_dinner_pct: 0.70,
      meals_4_lunch_dinner_pct: 0.55,
      meals_5plus_lunch_dinner_pct: 0.45,
    };
  }

  return data as any;
}

async function calculateActivityMultiplier(customer: CustomerData, settings: MacroSettings): Promise<number> {
  const workActivityLevel: Record<string, number> = {
    'Sedentário (trabalho em escritório, pouca movimentação)': settings.work_sedentary,
    'Moderadamente ativo (trabalho com alguma movimentação)': settings.work_moderate_active,
    'Muito ativo (trabalho físico, muita movimentação)': settings.work_very_active,
  };

  const frequencyScore: Record<string, number> = {
    'Nenhuma vez': settings.freq_none,
    '1-2 vezes por semana': settings.freq_1_2_week,
    '3-4 vezes por semana': settings.freq_3_4_week,
    '5-6 vezes por semana': settings.freq_5_6_week,
    'Todos os dias': settings.freq_daily,
  };

  const intensityScore: Record<string, number> = {
    'Leve': settings.intensity_light,
    'Moderada': settings.intensity_moderate,
    'Intensa': settings.intensity_intense,
  };

  const workBase = workActivityLevel[customer.work_routine] || settings.work_sedentary;

  const aerobicScore = (frequencyScore[customer.aerobic_frequency] || 0) *
                       (intensityScore[customer.aerobic_intensity] || 0);
  const strengthScore = (frequencyScore[customer.strength_frequency] || 0) *
                        (intensityScore[customer.strength_intensity] || 0);

  const exerciseBonus = (aerobicScore + strengthScore) * settings.exercise_bonus_multiplier;

  return 1.2 + workBase + exerciseBonus;
}

async function calculateTDEE(customer: CustomerData, settings: MacroSettings): Promise<number> {
  const bmr = calculateBMR(customer);
  const activityMultiplier = await calculateActivityMultiplier(customer, settings);
  return bmr * activityMultiplier;
}

function adjustCaloriesForGoal(tdee: number, mainGoal: string, currentWeight: number, goalWeight: number, settings: MacroSettings): number {
  const goalAdjustments: Record<string, number> = {
    'Hipertrofia/Ganho de massa muscular': settings.goal_muscle_gain_offset,
    'Perda de gordura/perda de peso': settings.goal_weight_loss_offset,
    'Saúde em geral/Manutenção do peso': settings.goal_maintenance_offset,
    'Melhora na Performance (esportiva ou cognitiva)': settings.goal_performance_offset,
  };

  let adjustment = goalAdjustments[mainGoal] || 0;

  if (mainGoal === 'Perda de gordura/perda de peso' && currentWeight > goalWeight) {
    const deficit = Math.min(currentWeight - goalWeight, 20) * 10;
    adjustment = Math.min(adjustment - deficit, -300);
  }

  return Math.round(tdee + adjustment);
}

function getProteinTarget(mainGoal: string, settings: MacroSettings): number {
  const proteinTargets: Record<string, number> = {
    'Hipertrofia/Ganho de massa muscular': settings.protein_muscle_gain,
    'Perda de gordura/perda de peso': settings.protein_weight_loss,
    'Saúde em geral/Manutenção do peso': settings.protein_maintenance,
    'Melhora na Performance (esportiva ou cognitiva)': settings.protein_performance,
  };

  return proteinTargets[mainGoal] || settings.protein_maintenance;
}

function getFatPercentage(mainGoal: string, settings: MacroSettings): number {
  if (mainGoal === 'Hipertrofia/Ganho de massa muscular') {
    return settings.fat_percentage_muscle_gain;
  }
  return settings.fat_percentage_default;
}

function getLunchDinnerPercentage(mealsPerDay: number, settings: MacroSettings): number {
  if (mealsPerDay === 2) return settings.meals_2_lunch_dinner_pct;
  if (mealsPerDay === 3) return settings.meals_3_lunch_dinner_pct;
  if (mealsPerDay === 4) return settings.meals_4_lunch_dinner_pct;
  return settings.meals_5plus_lunch_dinner_pct;
}

export async function calculateMacroRecommendation(customer: CustomerData): Promise<MacroRecommendation> {
  const settings = await getMacroSettings();

  const tdee = await calculateTDEE(customer, settings);
  const targetCalories = adjustCaloriesForGoal(
    tdee,
    customer.main_goal,
    customer.current_weight_kg,
    customer.goal_weight_kg,
    settings
  );

  const proteinPerKg = getProteinTarget(customer.main_goal, settings);
  const dailyProtein = customer.current_weight_kg * proteinPerKg;

  const fatPercentage = getFatPercentage(customer.main_goal, settings);
  const dailyFat = (targetCalories * fatPercentage) / 9;

  const proteinCalories = dailyProtein * 4;
  const fatCalories = dailyFat * 9;
  const carbCalories = targetCalories - proteinCalories - fatCalories;
  const dailyCarb = carbCalories / 4;

  const mealsPerDay = customer.meals_per_day || 3;
  const lunchDinnerPercentage = getLunchDinnerPercentage(mealsPerDay, settings);

  const lunchPercentage = settings.lunch_percentage;
  const dinnerPercentage = settings.dinner_percentage;

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
