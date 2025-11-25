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
