'use client';

import { useState, useEffect } from 'react';
import { Navigation } from '@/components/navigation';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ChefHat, Calendar, RefreshCw, Scale, TrendingUp } from 'lucide-react';
import { getDay } from 'date-fns';
import type { Recipe, Customer, DeliverySchedule } from '@/types';

interface ProductionItem {
  recipe: Recipe;
  totalQuantity: number;
  withMargin: number;
  customers: Array<{
    name: string;
    quantity: number;
  }>;
}

interface ProductionSummary {
  protein?: ProductionItem;
  carb?: ProductionItem;
  vegetable?: ProductionItem;
  salad?: ProductionItem;
  sauce?: ProductionItem;
}

export default function PrepPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMealType, setSelectedMealType] = useState<'lunch' | 'dinner'>('lunch');
  const [production, setProduction] = useState<ProductionSummary>({});
  const [loading, setLoading] = useState(false);
  const [globalSettings, setGlobalSettings] = useState({
    vegetables_amount: 100,
    salad_amount: 100,
    salad_dressing_amount: 30,
  });
  const MARGIN_PERCENTAGE = 0.15;

  function roundToMultipleOf100(value: number): number {
    return Math.ceil(value / 100) * 100;
  }

  function calculateQuantities(
    customer: any,
    mealType: 'lunch' | 'dinner',
    proteinRecipe?: Recipe,
    carbRecipe?: Recipe
  ) {
    if (!proteinRecipe || !carbRecipe) {
      return {
        protein: 0,
        carb: 0,
      };
    }

    const targetProtein = mealType === 'lunch' ? Number(customer.lunch_protein) : Number(customer.dinner_protein);
    const targetCarbs = mealType === 'lunch' ? Number(customer.lunch_carbs) : Number(customer.dinner_carbs);
    const targetFat = mealType === 'lunch' ? Number(customer.lunch_fat) : Number(customer.dinner_fat);

    if (!targetProtein || !targetCarbs || !targetFat) {
      return {
        protein: 0,
        carb: 0,
      };
    }

    let proteinAmount = (targetProtein / proteinRecipe.protein_per_100g) * 100;

    const carbsFromProteinRecipe = (proteinAmount / 100) * proteinRecipe.carb_per_100g;
    let carbAmount = ((targetCarbs - carbsFromProteinRecipe) / carbRecipe.carb_per_100g) * 100;

    proteinAmount = Math.round(proteinAmount / 10) * 10;
    carbAmount = Math.round(carbAmount / 10) * 10;

    return {
      protein: Math.max(0, proteinAmount),
      carb: Math.max(0, carbAmount),
    };
  }

  useEffect(() => {
    loadGlobalSettings();
  }, []);

  useEffect(() => {
    loadProduction();
  }, [selectedDate, selectedMealType, globalSettings]);

  async function loadGlobalSettings() {
    try {
      const { data } = await supabase
        .from('global_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      if (data) {
        setGlobalSettings({
          vegetables_amount: (data as any).vegetables_amount,
          salad_amount: (data as any).salad_amount,
          salad_dressing_amount: (data as any).salad_dressing_amount,
        });
      }
    } catch (error) {
      console.error('Error loading global settings:', error);
    }
  }

  async function loadProduction() {
    setLoading(true);
    try {
      const dateObj = new Date(selectedDate + 'T12:00:00');
      const dayOfWeek = getDay(dateObj);
      const adjustedDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;

      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select(`
          *,
          delivery_schedules!delivery_schedules_customer_id_fkey(*)
        `)
        .eq('status', 'active')
        .eq('is_active', true);

      if (customersError) throw customersError;

      const { data: modifiedOrdersData } = await supabase
        .from('orders')
        .select('*')
        .eq('order_date', selectedDate)
        .eq('meal_type', selectedMealType);

      const modifiedOrdersMap = new Map(
        modifiedOrdersData?.map((o: any) => [o.customer_id, o]) || []
      );

      const { data: menuData } = await supabase
        .from('monthly_menu')
        .select('*')
        .eq('menu_date', selectedDate)
        .eq('meal_type', selectedMealType)
        .maybeSingle();

      if (!menuData) {
        setProduction({});
        return;
      }

      const menu = menuData as any;

      const recipeIds = [
        menu.protein_recipe_id,
        menu.carb_recipe_id,
        menu.vegetable_recipe_id,
        menu.salad_recipe_id,
        menu.sauce_recipe_id,
      ].filter(Boolean);

      const { data: recipesData } = await supabase
        .from('recipes')
        .select('*')
        .in('id', recipeIds);

      const recipesMap = new Map(
        (recipesData || []).map((r: Recipe) => [r.id, r])
      );

      const proteinRecipe = menu.protein_recipe_id ? recipesMap.get(menu.protein_recipe_id) : undefined;
      const carbRecipe = menu.carb_recipe_id ? recipesMap.get(menu.carb_recipe_id) : undefined;
      const vegetableRecipe = menu.vegetable_recipe_id ? recipesMap.get(menu.vegetable_recipe_id) : undefined;
      const saladRecipe = menu.salad_recipe_id ? recipesMap.get(menu.salad_recipe_id) : undefined;
      const sauceRecipe = menu.sauce_recipe_id ? recipesMap.get(menu.sauce_recipe_id) : undefined;

      const productionSummary: ProductionSummary = {};
      const customersByRecipe: Record<string, Array<{ name: string; quantity: number }>> = {
        protein: [],
        carb: [],
        vegetable: [],
        salad: [],
        sauce: [],
      };

      for (const customer of customersData || []) {
        const customerData = customer as any;
        const modifiedOrder = modifiedOrdersMap.get(customerData.id);

        if (modifiedOrder?.is_cancelled) continue;

        let deliverySchedule = customerData.delivery_schedules?.find(
          (ds: any) =>
            ds.day_of_week === adjustedDayOfWeek &&
            ds.meal_type === selectedMealType &&
            ds.is_active
        );

        if (!deliverySchedule) continue;

        let quantities = calculateQuantities(
          customerData,
          selectedMealType,
          proteinRecipe,
          carbRecipe
        );

        if (modifiedOrder?.modified_protein_grams) {
          quantities.protein = modifiedOrder.modified_protein_grams;
        }
        if (modifiedOrder?.modified_carb_grams) {
          quantities.carb = modifiedOrder.modified_carb_grams;
        }

        const vegetableQty = globalSettings.vegetables_amount;
        const saladQty = globalSettings.salad_amount;
        const sauceQty = globalSettings.salad_dressing_amount;

        if (proteinRecipe && quantities.protein > 0) {
          customersByRecipe.protein.push({ name: customerData.name, quantity: quantities.protein });
        }
        if (carbRecipe && quantities.carb > 0) {
          customersByRecipe.carb.push({ name: customerData.name, quantity: quantities.carb });
        }
        if (vegetableRecipe && vegetableQty > 0) {
          customersByRecipe.vegetable.push({ name: customerData.name, quantity: vegetableQty });
        }
        if (saladRecipe && saladQty > 0) {
          customersByRecipe.salad.push({ name: customerData.name, quantity: saladQty });
        }
        if (sauceRecipe && sauceQty > 0) {
          customersByRecipe.sauce.push({ name: customerData.name, quantity: sauceQty });
        }
      }

      if (proteinRecipe && customersByRecipe.protein.length > 0) {
        const total = customersByRecipe.protein.reduce((sum, c) => sum + c.quantity, 0);
        const withMargin = total * (1 + MARGIN_PERCENTAGE);
        productionSummary.protein = {
          recipe: proteinRecipe,
          totalQuantity: total,
          withMargin: roundToMultipleOf100(withMargin),
          customers: customersByRecipe.protein,
        };
      }

      if (carbRecipe && customersByRecipe.carb.length > 0) {
        const total = customersByRecipe.carb.reduce((sum, c) => sum + c.quantity, 0);
        const withMargin = total * (1 + MARGIN_PERCENTAGE);
        productionSummary.carb = {
          recipe: carbRecipe,
          totalQuantity: total,
          withMargin: roundToMultipleOf100(withMargin),
          customers: customersByRecipe.carb,
        };
      }

      if (vegetableRecipe && customersByRecipe.vegetable.length > 0) {
        const total = customersByRecipe.vegetable.reduce((sum, c) => sum + c.quantity, 0);
        const withMargin = total * (1 + MARGIN_PERCENTAGE);
        productionSummary.vegetable = {
          recipe: vegetableRecipe,
          totalQuantity: total,
          withMargin: roundToMultipleOf100(withMargin),
          customers: customersByRecipe.vegetable,
        };
      }

      if (saladRecipe && customersByRecipe.salad.length > 0) {
        const total = customersByRecipe.salad.reduce((sum, c) => sum + c.quantity, 0);
        const withMargin = total * (1 + MARGIN_PERCENTAGE);
        productionSummary.salad = {
          recipe: saladRecipe,
          totalQuantity: total,
          withMargin: roundToMultipleOf100(withMargin),
          customers: customersByRecipe.salad,
        };
      }

      if (sauceRecipe && customersByRecipe.sauce.length > 0) {
        const total = customersByRecipe.sauce.reduce((sum, c) => sum + c.quantity, 0);
        const withMargin = total * (1 + MARGIN_PERCENTAGE);
        productionSummary.sauce = {
          recipe: sauceRecipe,
          totalQuantity: total,
          withMargin: roundToMultipleOf100(withMargin),
          customers: customersByRecipe.sauce,
        };
      }

      setProduction(productionSummary);
    } catch (error) {
      console.error('Error loading production:', error);
      setProduction({});
    } finally {
      setLoading(false);
    }
  }

  function ProductionCard({ item, type, icon }: { item: ProductionItem; type: string; icon: string }) {
    const [expanded, setExpanded] = useState(false);

    return (
      <Card className="border-l-4" style={{ borderLeftColor: getTypeColor(type) }}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">{icon}</span>
                <Badge variant="outline" className="text-xs">
                  {getTypeLabel(type)}
                </Badge>
              </div>
              <CardTitle className="text-lg">{item.recipe.name}</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-slate-600 text-sm mb-1">
                <Scale className="h-4 w-4" />
                <span>Quantidade Base</span>
              </div>
              <div className="text-2xl font-bold text-slate-900">
                {item.totalQuantity.toLocaleString('pt-BR')}g
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {item.customers.length} {item.customers.length === 1 ? 'cliente' : 'clientes'}
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
              <div className="flex items-center gap-2 text-green-700 text-sm mb-1">
                <TrendingUp className="h-4 w-4" />
                <span>Produzir (+15%)</span>
              </div>
              <div className="text-2xl font-bold text-green-900">
                {item.withMargin.toLocaleString('pt-BR')}g
              </div>
              <div className="text-xs text-green-600 mt-1">
                +{(item.withMargin - item.totalQuantity).toLocaleString('pt-BR')}g margem
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="w-full"
          >
            {expanded ? 'Ocultar' : 'Ver'} detalhes dos clientes ({item.customers.length})
          </Button>

          {expanded && (
            <div className="border rounded-lg p-3 bg-slate-50 max-h-60 overflow-y-auto">
              <div className="space-y-2">
                {item.customers
                  .sort((a, b) => b.quantity - a.quantity)
                  .map((customer, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-sm py-2 border-b last:border-b-0"
                    >
                      <span className="font-medium text-slate-700">{customer.name}</span>
                      <span className="text-slate-900 font-semibold">{customer.quantity}g</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  function getTypeColor(type: string): string {
    const colors: Record<string, string> = {
      protein: '#ef4444',
      carb: '#f59e0b',
      vegetable: '#10b981',
      salad: '#22c55e',
      sauce: '#8b5cf6',
    };
    return colors[type] || '#6b7280';
  }

  function getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      protein: 'Proteína',
      carb: 'Carboidrato',
      vegetable: 'Legumes',
      salad: 'Salada',
      sauce: 'Molho',
    };
    return labels[type] || type;
  }

  function getTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      protein: '🥩',
      carb: '🍚',
      vegetable: '🥕',
      salad: '🥗',
      sauce: '🥫',
    };
    return icons[type] || '🍽️';
  }

  const hasProduction = Object.keys(production).length > 0;
  const totalItems = Object.keys(production).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <ChefHat className="h-8 w-8 text-slate-600" />
            <h1 className="text-3xl font-bold text-gray-900">Produção</h1>
          </div>
          <p className="text-gray-600">Planejamento de produção das receitas do dia</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="date">Data</Label>
                <Input
                  id="date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="mealType">Turno</Label>
                <Select value={selectedMealType} onValueChange={(value: 'lunch' | 'dinner') => setSelectedMealType(value)}>
                  <SelectTrigger id="mealType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lunch">Almoço</SelectItem>
                    <SelectItem value="dinner">Jantar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={loadProduction} disabled={loading} className="w-full">
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Atualizar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">Carregando produção...</p>
          </div>
        ) : !hasProduction ? (
          <Card>
            <CardContent className="text-center py-12">
              <ChefHat className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 text-lg">Nenhuma produção para este dia e turno</p>
              <p className="text-gray-500 text-sm mt-2">
                Verifique se há cardápio cadastrado e clientes ativos com entregas programadas
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-900 font-medium mb-1">
                    Resumo da Produção
                  </p>
                  <p className="text-2xl font-bold text-blue-900">
                    {totalItems} {totalItems === 1 ? 'receita' : 'receitas'} para produzir
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-blue-700 mb-1">Margem de segurança</p>
                  <p className="text-xl font-bold text-blue-900">+15%</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {production.protein && (
                <ProductionCard item={production.protein} type="protein" icon={getTypeIcon('protein')} />
              )}
              {production.carb && (
                <ProductionCard item={production.carb} type="carb" icon={getTypeIcon('carb')} />
              )}
              {production.vegetable && (
                <ProductionCard item={production.vegetable} type="vegetable" icon={getTypeIcon('vegetable')} />
              )}
              {production.salad && (
                <ProductionCard item={production.salad} type="salad" icon={getTypeIcon('salad')} />
              )}
              {production.sauce && (
                <ProductionCard item={production.sauce} type="sauce" icon={getTypeIcon('sauce')} />
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
