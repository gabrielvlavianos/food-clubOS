import { Recipe, PrepItemWithRecipe, MacroTotals, PrepSessionSummary, RecipeCategory } from '@/types';
import { supabase } from '@/lib/supabase';

export function roundToMultipleOf10(value: number): number {
  return Math.round(value / 10) * 10;
}

export function calculateRecipeNutrients(recipe: Recipe, weightGr: number): MacroTotals {
  const multiplier = weightGr / 100;

  return {
    kcal: recipe.kcal_per_100g * multiplier,
    protein: recipe.protein_per_100g * multiplier,
    carb: recipe.carb_per_100g * multiplier,
    fat: recipe.fat_per_100g * multiplier,
    cost: recipe.cost_per_100g * multiplier,
    weightGr,
  };
}

export function calculatePrepSessionSummary(items: PrepItemWithRecipe[]): PrepSessionSummary {
  const totalsByCategory: Record<RecipeCategory, MacroTotals> = {
    'Proteína': { kcal: 0, protein: 0, carb: 0, fat: 0, cost: 0, weightGr: 0 },
    'Carboidrato': { kcal: 0, protein: 0, carb: 0, fat: 0, cost: 0, weightGr: 0 },
    'Legumes': { kcal: 0, protein: 0, carb: 0, fat: 0, cost: 0, weightGr: 0 },
    'Salada': { kcal: 0, protein: 0, carb: 0, fat: 0, cost: 0, weightGr: 0 },
    'Marinada': { kcal: 0, protein: 0, carb: 0, fat: 0, cost: 0, weightGr: 0 },
    'Molho Salada': { kcal: 0, protein: 0, carb: 0, fat: 0, cost: 0, weightGr: 0 },
  };

  items.forEach((item) => {
    const nutrients = calculateRecipeNutrients(item.recipe, item.total_weight_gr);
    const category = item.recipe.category;

    totalsByCategory[category].kcal += nutrients.kcal;
    totalsByCategory[category].protein += nutrients.protein;
    totalsByCategory[category].carb += nutrients.carb;
    totalsByCategory[category].fat += nutrients.fat;
    totalsByCategory[category].cost += nutrients.cost;
    totalsByCategory[category].weightGr += nutrients.weightGr;
  });

  const grandTotals: MacroTotals = {
    kcal: 0,
    protein: 0,
    carb: 0,
    fat: 0,
    cost: 0,
    weightGr: 0,
  };

  Object.values(totalsByCategory).forEach((categoryTotal) => {
    grandTotals.kcal += categoryTotal.kcal;
    grandTotals.protein += categoryTotal.protein;
    grandTotals.carb += categoryTotal.carb;
    grandTotals.fat += categoryTotal.fat;
    grandTotals.cost += categoryTotal.cost;
    grandTotals.weightGr += categoryTotal.weightGr;
  });

  return { totalsByCategory, grandTotals };
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

export function formatMacro(value: number): string {
  return `${value.toFixed(1)}g`;
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

interface MacroSettings {
  calorie_base: 'tmb' | 'get';

  work_sedentary: number;
  work_moderate_active: number;
  work_very_active: number;

  aerobic_none: number;
  aerobic_1_2_light: number;
  aerobic_1_2_moderate: number;
  aerobic_1_2_intense: number;
  aerobic_3_4_light: number;
  aerobic_3_4_moderate: number;
  aerobic_3_4_intense: number;
  aerobic_5_6_light: number;
  aerobic_5_6_moderate: number;
  aerobic_5_6_intense: number;
  aerobic_daily_light: number;
  aerobic_daily_moderate: number;
  aerobic_daily_intense: number;

  strength_none: number;
  strength_1_2_light: number;
  strength_1_2_moderate: number;
  strength_1_2_intense: number;
  strength_3_4_light: number;
  strength_3_4_moderate: number;
  strength_3_4_intense: number;
  strength_5_6_light: number;
  strength_5_6_moderate: number;
  strength_5_6_intense: number;
  strength_daily_light: number;
  strength_daily_moderate: number;
  strength_daily_intense: number;

  goal_muscle_gain_multiplier: number;
  goal_weight_loss_multiplier: number;
  goal_maintenance_multiplier: number;
  goal_performance_multiplier: number;

  protein_muscle_gain: number;
  protein_weight_loss: number;
  protein_maintenance: number;
  protein_performance: number;

  fat_muscle_gain: number;
  fat_weight_loss: number;
  fat_maintenance: number;
  fat_performance: number;

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
      calorie_base: 'get',

      work_sedentary: 1.0,
      work_moderate_active: 1.05,
      work_very_active: 1.2,

      aerobic_none: 1.0,
      aerobic_1_2_light: 1.03,
      aerobic_1_2_moderate: 1.07,
      aerobic_1_2_intense: 1.11,
      aerobic_3_4_light: 1.08,
      aerobic_3_4_moderate: 1.16,
      aerobic_3_4_intense: 1.25,
      aerobic_5_6_light: 1.12,
      aerobic_5_6_moderate: 1.25,
      aerobic_5_6_intense: 1.39,
      aerobic_daily_light: 1.16,
      aerobic_daily_moderate: 1.32,
      aerobic_daily_intense: 1.50,

      strength_none: 1.0,
      strength_1_2_light: 1.01,
      strength_1_2_moderate: 1.03,
      strength_1_2_intense: 1.06,
      strength_3_4_light: 1.03,
      strength_3_4_moderate: 1.08,
      strength_3_4_intense: 1.13,
      strength_5_6_light: 1.04,
      strength_5_6_moderate: 1.12,
      strength_5_6_intense: 1.21,
      strength_daily_light: 1.05,
      strength_daily_moderate: 1.16,
      strength_daily_intense: 1.26,

      goal_muscle_gain_multiplier: 1.1,
      goal_weight_loss_multiplier: 0.85,
      goal_maintenance_multiplier: 1.0,
      goal_performance_multiplier: 1.1,

      protein_muscle_gain: 2.2,
      protein_weight_loss: 2.2,
      protein_maintenance: 1.8,
      protein_performance: 1.8,

      fat_muscle_gain: 0.8,
      fat_weight_loss: 0.8,
      fat_maintenance: 0.8,
      fat_performance: 0.8,

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

function getWorkRoutineMultiplier(workRoutine: string, settings: MacroSettings): number {
  const mapping: Record<string, number> = {
    'Sedentário (trabalho em escritório, pouca movimentação)': settings.work_sedentary,
    'Moderadamente ativo (trabalho com alguma movimentação)': settings.work_moderate_active,
    'Muito ativo (trabalho físico, muita movimentação)': settings.work_very_active,
  };
  return mapping[workRoutine] || settings.work_sedentary;
}

function getAerobicMultiplier(frequency: string, intensity: string, settings: MacroSettings): number {
  if (frequency === 'Nenhuma vez') return settings.aerobic_none;

  const key = `aerobic_${getFrequencyKey(frequency)}_${getIntensityKey(intensity)}` as keyof MacroSettings;
  return (settings[key] as number) || 1.0;
}

function getStrengthMultiplier(frequency: string, intensity: string, settings: MacroSettings): number {
  if (frequency === 'Nenhuma vez') return settings.strength_none;

  const key = `strength_${getFrequencyKey(frequency)}_${getIntensityKey(intensity)}` as keyof MacroSettings;
  return (settings[key] as number) || 1.0;
}

function getFrequencyKey(frequency: string): string {
  const mapping: Record<string, string> = {
    '1-2 vezes por semana': '1_2',
    '3-4 vezes por semana': '3_4',
    '5-6 vezes por semana': '5_6',
    'Todos os dias': 'daily',
  };
  return mapping[frequency] || '1_2';
}

function getIntensityKey(intensity: string): string {
  const mapping: Record<string, string> = {
    'Leve': 'light',
    'Moderada': 'moderate',
    'Intensa': 'intense',
  };
  return mapping[intensity] || 'moderate';
}

function getGoalMultiplier(mainGoal: string, settings: MacroSettings): number {
  const mapping: Record<string, number> = {
    'Hipertrofia/Ganho de massa muscular': settings.goal_muscle_gain_multiplier,
    'Perda de gordura/perda de peso': settings.goal_weight_loss_multiplier,
    'Saúde em geral/Manutenção do peso': settings.goal_maintenance_multiplier,
    'Melhora na Performance (esportiva ou cognitiva)': settings.goal_performance_multiplier,
  };
  return mapping[mainGoal] || settings.goal_maintenance_multiplier;
}

function getProteinTarget(mainGoal: string, settings: MacroSettings): number {
  const mapping: Record<string, number> = {
    'Hipertrofia/Ganho de massa muscular': settings.protein_muscle_gain,
    'Perda de gordura/perda de peso': settings.protein_weight_loss,
    'Saúde em geral/Manutenção do peso': settings.protein_maintenance,
    'Melhora na Performance (esportiva ou cognitiva)': settings.protein_performance,
  };
  return mapping[mainGoal] || settings.protein_maintenance;
}

function getFatTarget(mainGoal: string, settings: MacroSettings): number {
  const mapping: Record<string, number> = {
    'Hipertrofia/Ganho de massa muscular': settings.fat_muscle_gain,
    'Perda de gordura/perda de peso': settings.fat_weight_loss,
    'Saúde em geral/Manutenção do peso': settings.fat_maintenance,
    'Melhora na Performance (esportiva ou cognitiva)': settings.fat_performance,
  };
  return mapping[mainGoal] || settings.fat_maintenance;
}

function getMealDistributionPercentage(mealsPerDay: number, settings: MacroSettings): number {
  if (mealsPerDay === 2) return settings.meals_2_lunch_dinner_pct;
  if (mealsPerDay === 3) return settings.meals_3_lunch_dinner_pct;
  if (mealsPerDay === 4) return settings.meals_4_lunch_dinner_pct;
  return settings.meals_5plus_lunch_dinner_pct;
}

export async function calculateMacroRecommendation(customer: CustomerData): Promise<MacroRecommendation> {
  const settings = await getMacroSettings();

  const bmr = calculateBMR(customer);

  const workMultiplier = getWorkRoutineMultiplier(customer.work_routine, settings);
  const aerobicMultiplier = getAerobicMultiplier(customer.aerobic_frequency, customer.aerobic_intensity, settings);
  const strengthMultiplier = getStrengthMultiplier(customer.strength_frequency, customer.strength_intensity, settings);
  const goalMultiplier = getGoalMultiplier(customer.main_goal, settings);

  const adjustedGET = bmr * workMultiplier * aerobicMultiplier * strengthMultiplier * goalMultiplier;

  const mealsPerDay = customer.meals_per_day || 3;
  const mealDistributionPct = getMealDistributionPercentage(mealsPerDay, settings);

  const calorieBase = settings.calorie_base === 'tmb' ? bmr : adjustedGET;

  const lunchKcal = calorieBase * settings.lunch_percentage * mealDistributionPct;
  const dinnerKcal = calorieBase * settings.dinner_percentage * mealDistributionPct;

  const proteinPerKg = getProteinTarget(customer.main_goal, settings);
  const fatPerKg = getFatTarget(customer.main_goal, settings);

  const dailyProtein = customer.current_weight_kg * proteinPerKg;
  const dailyFat = customer.current_weight_kg * fatPerKg;

  const lunchProtein = dailyProtein * settings.lunch_percentage * mealDistributionPct;
  const lunchFat = dailyFat * settings.lunch_percentage * mealDistributionPct;
  const lunchCarbKcal = lunchKcal - (lunchProtein * 4) - (lunchFat * 9);
  const lunchCarb = Math.max(0, lunchCarbKcal / 4);

  const dinnerProtein = dailyProtein * settings.dinner_percentage * mealDistributionPct;
  const dinnerFat = dailyFat * settings.dinner_percentage * mealDistributionPct;
  const dinnerCarbKcal = dinnerKcal - (dinnerProtein * 4) - (dinnerFat * 9);
  const dinnerCarb = Math.max(0, dinnerCarbKcal / 4);

  return {
    lunch: {
      protein: Math.round(lunchProtein * 10) / 10,
      carb: Math.round(lunchCarb * 10) / 10,
      fat: Math.round(lunchFat * 10) / 10
    },
    dinner: {
      protein: Math.round(dinnerProtein * 10) / 10,
      carb: Math.round(dinnerCarb * 10) / 10,
      fat: Math.round(dinnerFat * 10) / 10
    },
    daily: {
      protein: Math.round(dailyProtein * 10) / 10,
      carb: Math.round((lunchCarb + dinnerCarb) * 10) / 10,
      fat: Math.round(dailyFat * 10) / 10,
      kcal: Math.round(adjustedGET)
    }
  };
}
