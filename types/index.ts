import { Database } from './database';

export type Customer = Database['public']['Tables']['customers']['Row'];
export type Address = Database['public']['Tables']['addresses']['Row'];
export type Recipe = Database['public']['Tables']['recipes']['Row'];
export type PrepSession = Database['public']['Tables']['prep_sessions']['Row'];
export type PrepItem = Database['public']['Tables']['prep_items']['Row'];
export type User = Database['public']['Tables']['users']['Row'];
export type DeliverySchedule = Database['public']['Tables']['delivery_schedules']['Row'];
export type NutritionPlan = Database['public']['Tables']['nutrition_plans']['Row'];
export type Order = Database['public']['Tables']['orders']['Row'];
export type OrderItem = Database['public']['Tables']['order_items']['Row'];

export type CustomerWithAddresses = Customer & {
  addresses: Address[];
};

export type CustomerWithDeliverySchedules = Customer & {
  delivery_schedules: DeliverySchedule[];
};

export type OrderItemWithRecipe = OrderItem & {
  recipe: Recipe;
};

export type OrderWithDetails = Order & {
  customer: Customer;
  items: OrderItemWithRecipe[];
  nutrition_plan?: NutritionPlan;
};

export type PrepItemWithRecipe = PrepItem & {
  recipe: Recipe;
};

export type PrepSessionWithItems = PrepSession & {
  items: PrepItemWithRecipe[];
};

export const RECIPE_CATEGORIES = [
  'Proteína',
  'Carboidrato',
  'Legumes',
  'Salada',
  'Marinada',
  'Molho Salada',
] as const;

export type RecipeCategory = typeof RECIPE_CATEGORIES[number];

export interface MacroTotals {
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
  cost: number;
  weightGr: number;
}

export interface PrepSessionSummary {
  totalsByCategory: Record<RecipeCategory, MacroTotals>;
  grandTotals: MacroTotals;
}

export const MAIN_GOALS = [
  'Hipertrofia/Ganho de massa muscular',
  'Perda de gordura/perda de peso',
  'Saúde em geral/Manutenção do peso',
  'Melhora na Performance (esportiva ou cognitiva)',
] as const;

export const COMMON_ALLERGENS = [
  'Glúten',
  'Lácteos',
  'Ovos',
  'Amendoim',
  'Castanhas',
  'Soja',
  'Peixe',
  'Crustáceos',
  'Nenhum',
  'Outros',
] as const;

export const WORK_ROUTINES = [
  'Sedentário (trabalho em escritório, pouca movimentação)',
  'Moderadamente ativo (trabalho com alguma movimentação)',
  'Muito ativo (trabalho físico, muita movimentação)',
] as const;

export const FREQUENCY_OPTIONS = [
  'Nenhuma vez',
  '1-2 vezes por semana',
  '3-4 vezes por semana',
  '5-6 vezes por semana',
  'Todos os dias',
] as const;

export const INTENSITY_OPTIONS = [
  'Leve',
  'Moderada',
  'Intensa',
] as const;

export const GENDER_OPTIONS = [
  'Masculino',
  'Feminino',
  'Outro',
] as const;

export const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Segunda-Feira' },
  { key: 'tuesday', label: 'Terça-Feira' },
  { key: 'wednesday', label: 'Quarta-Feira' },
  { key: 'thursday', label: 'Quinta-Feira' },
  { key: 'friday', label: 'Sexta-Feira' },
] as const;

export const MEAL_TYPES = [
  { key: 'lunch', label: 'Almoço' },
  { key: 'dinner', label: 'Jantar' },
] as const;
