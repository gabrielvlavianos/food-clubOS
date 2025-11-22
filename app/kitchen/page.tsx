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
import { ChefHat, Calendar, Clock, MapPin, Package, RefreshCw } from 'lucide-react';
import { format, getDay } from 'date-fns';
import type { Recipe, Customer, DeliverySchedule } from '@/types';

interface KitchenOrder {
  id?: string;
  customer: Customer;
  deliverySchedule: DeliverySchedule;
  menuRecipes: {
    protein?: Recipe;
    carb?: Recipe;
    vegetable?: Recipe;
    salad?: Recipe;
    sauce?: Recipe;
  };
  quantities: {
    protein: number;
    carb: number;
    vegetable: number;
    salad: number;
    sauce: number;
  };
  status: 'pending' | 'preparing' | 'ready';
}

export default function KitchenDashboardPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMealType, setSelectedMealType] = useState<'lunch' | 'dinner'>('lunch');
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadOrders();
  }, [selectedDate, selectedMealType]);

  function calculateQuantities(
    customer: any,
    mealType: 'lunch' | 'dinner',
    proteinRecipe?: Recipe,
    carbRecipe?: Recipe,
    vegetableRecipe?: Recipe,
    saladRecipe?: Recipe
  ) {
    if (!proteinRecipe || !carbRecipe) {
      return {
        protein: 0,
        carb: 0,
        vegetable: 100,
        salad: 100,
        sauce: 30,
      };
    }

    const targetProtein = mealType === 'lunch' ? Number(customer.lunch_protein) : Number(customer.dinner_protein);
    const targetCarbs = mealType === 'lunch' ? Number(customer.lunch_carbs) : Number(customer.dinner_carbs);
    const targetFat = mealType === 'lunch' ? Number(customer.lunch_fat) : Number(customer.dinner_fat);

    if (!targetProtein || !targetCarbs || !targetFat) {
      return {
        protein: 0,
        carb: 0,
        vegetable: 100,
        salad: 100,
        sauce: 30,
      };
    }

    let proteinAmount = (targetProtein / proteinRecipe.protein_per_100g) * 100;

    const carbsFromProteinRecipe = (proteinAmount / 100) * proteinRecipe.carb_per_100g;
    const fatFromProteinRecipe = (proteinAmount / 100) * proteinRecipe.fat_per_100g;
    const caloriesFromProteinRecipe = (proteinAmount / 100) * proteinRecipe.kcal_per_100g;

    const remainingCarbs = targetCarbs - carbsFromProteinRecipe;
    let carbAmount = (remainingCarbs / carbRecipe.carb_per_100g) * 100;

    const fatFromCarbRecipe = (carbAmount / 100) * carbRecipe.fat_per_100g;
    const caloriesFromCarbRecipe = (carbAmount / 100) * carbRecipe.kcal_per_100g;

    const vegetableAmount = vegetableRecipe ? 100 : 0;
    const saladAmount = saladRecipe ? 100 : 0;

    const caloriesFromVegetable = vegetableRecipe ? (vegetableAmount / 100) * vegetableRecipe.kcal_per_100g : 0;
    const caloriesFromSalad = saladRecipe ? (saladAmount / 100) * saladRecipe.kcal_per_100g : 0;

    let totalCalories = caloriesFromProteinRecipe + caloriesFromCarbRecipe + caloriesFromVegetable + caloriesFromSalad;

    const targetCalories = (targetProtein * 4) + (targetCarbs * 4) + (targetFat * 9);

    const adjustmentFactor = targetCalories / totalCalories;

    proteinAmount = proteinAmount * adjustmentFactor;
    carbAmount = carbAmount * adjustmentFactor;

    return {
      protein: Math.round(proteinAmount),
      carb: Math.round(carbAmount),
      vegetable: vegetableAmount,
      salad: saladAmount,
      sauce: 30,
    };
  }

  async function loadOrders() {
    setLoading(true);
    try {
      const dateObj = new Date(selectedDate + 'T12:00:00');
      const dayOfWeek = getDay(dateObj);
      const adjustedDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;

      if (adjustedDayOfWeek > 5) {
        setOrders([]);
        setLoading(false);
        return;
      }

      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select(`
          *,
          delivery_schedules!delivery_schedules_customer_id_fkey(*)
        `)
        .eq('is_active', true);

      if (customersError) throw customersError;

      const { data: menuData } = await supabase
        .from('monthly_menu')
        .select('*')
        .eq('menu_date', selectedDate)
        .eq('meal_type', selectedMealType)
        .maybeSingle() as { data: any };

      let menuRecipes = {
        protein: undefined,
        carb: undefined,
        vegetable: undefined,
        salad: undefined,
        sauce: undefined,
      };

      if (menuData) {
        const recipeIds = [
          menuData.protein_recipe_id,
          menuData.carb_recipe_id,
          menuData.vegetable_recipe_id,
          menuData.salad_recipe_id,
          menuData.sauce_recipe_id,
        ].filter(Boolean);

        if (recipeIds.length > 0) {
          const { data: recipesData } = await supabase
            .from('recipes')
            .select('*')
            .in('id', recipeIds);

          if (recipesData) {
            const recipesMap = new Map(recipesData.map((r: any) => [r.id, r]));
            menuRecipes = {
              protein: menuData.protein_recipe_id ? recipesMap.get(menuData.protein_recipe_id) : undefined,
              carb: menuData.carb_recipe_id ? recipesMap.get(menuData.carb_recipe_id) : undefined,
              vegetable: menuData.vegetable_recipe_id ? recipesMap.get(menuData.vegetable_recipe_id) : undefined,
              salad: menuData.salad_recipe_id ? recipesMap.get(menuData.salad_recipe_id) : undefined,
              sauce: menuData.sauce_recipe_id ? recipesMap.get(menuData.sauce_recipe_id) : undefined,
            };
          }
        }
      }

      const kitchenOrders: KitchenOrder[] = [];

      for (const customer of customersData || []) {
        const customerData = customer as any;
        const deliverySchedule = customerData.delivery_schedules?.find(
          (ds: any) =>
            ds.day_of_week === adjustedDayOfWeek &&
            ds.meal_type === selectedMealType &&
            ds.is_active
        );

        if (deliverySchedule && deliverySchedule.delivery_time && deliverySchedule.delivery_address) {
          const quantities = calculateQuantities(
            customerData,
            selectedMealType,
            menuRecipes.protein,
            menuRecipes.carb,
            menuRecipes.vegetable,
            menuRecipes.salad
          );

          kitchenOrders.push({
            customer,
            deliverySchedule,
            menuRecipes,
            quantities,
            status: 'pending',
          });
        }
      }

      kitchenOrders.sort((a, b) => {
        const timeA = a.deliverySchedule.delivery_time || '';
        const timeB = b.deliverySchedule.delivery_time || '';
        return timeA.localeCompare(timeB);
      });

      setOrders(kitchenOrders);
    } catch (error) {
      console.error('Error loading orders:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  function updateOrderStatus(index: number, newStatus: 'pending' | 'preparing' | 'ready') {
    setOrders(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], status: newStatus };
      return updated;
    });
  }

  const statusColors = {
    pending: 'bg-gray-100 text-gray-800 border-gray-300',
    preparing: 'bg-blue-100 text-blue-800 border-blue-300',
    ready: 'bg-green-100 text-green-800 border-green-300',
  };

  const statusLabels = {
    pending: 'Não iniciado',
    preparing: 'Em preparo',
    ready: 'Finalizado',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <ChefHat className="h-8 w-8 text-orange-600" />
            <h1 className="text-3xl font-bold text-gray-900">Cozinha</h1>
          </div>
          <p className="text-gray-600">Gerencie o preparo dos pedidos do dia</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Selecionar Data e Turno
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
                <Button onClick={loadOrders} disabled={loading} className="w-full">
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
            <p className="text-gray-600">Carregando pedidos...</p>
          </div>
        ) : orders.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 text-lg">Nenhum pedido para este dia e turno</p>
              <p className="text-gray-500 text-sm mt-2">
                Os pedidos aparecem automaticamente quando há entregas agendadas
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                {orders.length} {orders.length === 1 ? 'Pedido' : 'Pedidos'}
              </h2>
              <Badge variant="outline" className="text-sm">
                <Clock className="h-3 w-3 mr-1" />
                {format(new Date(selectedDate), 'dd/MM/yyyy')} - {selectedMealType === 'lunch' ? 'Almoço' : 'Jantar'}
              </Badge>
            </div>

            {orders.map((order, index) => (
              <Card key={`${order.customer.id}-${index}`} className="border-l-4 border-l-orange-500">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">{order.customer.name}</CardTitle>
                      <div className="flex flex-col gap-1 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-orange-600" />
                          <span className="font-semibold">Horário de entrega:</span>
                          <span className="text-base font-bold text-orange-600">{order.deliverySchedule.delivery_time}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span>{order.deliverySchedule.delivery_address}</span>
                        </div>
                      </div>
                    </div>
                    <div className="ml-4">
                      <Select
                        value={order.status}
                        onValueChange={(value: 'pending' | 'preparing' | 'ready') => updateOrderStatus(index, value)}
                      >
                        <SelectTrigger className={`w-[160px] border-2 ${statusColors[order.status]}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">{statusLabels.pending}</SelectItem>
                          <SelectItem value="preparing">{statusLabels.preparing}</SelectItem>
                          <SelectItem value="ready">{statusLabels.ready}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {order.menuRecipes.protein && order.quantities.protein > 0 ? (
                      <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-lg p-3">
                        <div>
                          <span className="text-sm font-semibold text-red-900">Proteína: </span>
                          <span className="text-sm text-red-700">{order.menuRecipes.protein.name}</span>
                        </div>
                        <span className="text-lg font-bold text-red-900">{Math.round(order.quantities.protein)}g</span>
                      </div>
                    ) : null}

                    {order.menuRecipes.carb && order.quantities.carb > 0 ? (
                      <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <div>
                          <span className="text-sm font-semibold text-amber-900">Carboidrato: </span>
                          <span className="text-sm text-amber-700">{order.menuRecipes.carb.name}</span>
                        </div>
                        <span className="text-lg font-bold text-amber-900">{Math.round(order.quantities.carb)}g</span>
                      </div>
                    ) : null}

                    {order.menuRecipes.vegetable && order.quantities.vegetable > 0 ? (
                      <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3">
                        <div>
                          <span className="text-sm font-semibold text-green-900">Legumes: </span>
                          <span className="text-sm text-green-700">{order.menuRecipes.vegetable.name}</span>
                        </div>
                        <span className="text-lg font-bold text-green-900">{Math.round(order.quantities.vegetable)}g</span>
                      </div>
                    ) : null}

                    {order.menuRecipes.salad && order.quantities.salad > 0 ? (
                      <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                        <div>
                          <span className="text-sm font-semibold text-emerald-900">Salada: </span>
                          <span className="text-sm text-emerald-700">{order.menuRecipes.salad.name}</span>
                        </div>
                        <span className="text-lg font-bold text-emerald-900">{Math.round(order.quantities.salad)}g</span>
                      </div>
                    ) : null}

                    {order.menuRecipes.sauce ? (
                      <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div>
                          <span className="text-sm font-semibold text-blue-900">Molho Salada: </span>
                          <span className="text-sm text-blue-700">{order.menuRecipes.sauce.name}</span>
                        </div>
                        <span className="text-lg font-bold text-blue-900">{Math.round(order.quantities.sauce)}g</span>
                      </div>
                    ) : null}

                    {!order.menuRecipes.protein && !order.menuRecipes.carb && (
                      <div className="text-center py-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-800">
                          Nenhum cardápio definido para esta data. Configure o cardápio mensal.
                        </p>
                      </div>
                    )}

                    {order.quantities.protein === 0 && order.quantities.carb === 0 && order.menuRecipes.protein && order.menuRecipes.carb && (
                      <div className="text-center py-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-sm text-amber-800">
                          Este cliente precisa ter as metas de macronutrientes configuradas.
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
