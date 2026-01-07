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
import { ChefHat, Calendar, Clock, MapPin, Package, RefreshCw, AlertTriangle, Send } from 'lucide-react';
import { format, getDay } from 'date-fns';
import type { Recipe, Customer, DeliverySchedule } from '@/types';
import { formatTime } from '@/lib/format-utils';
import { calculateOrderQuantities } from '@/lib/calculations';

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
  isCancelled?: boolean;
  hasModifiedProtein?: boolean;
  hasModifiedCarb?: boolean;
  sischefOrderId?: string | null;
  productionTimeRange?: {
    start: string;
    end: string;
  };
}

export default function KitchenDashboardPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMealType, setSelectedMealType] = useState<'lunch' | 'dinner'>('lunch');
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendingToSischef, setSendingToSischef] = useState<string | null>(null);
  const [globalSettings, setGlobalSettings] = useState({
    vegetables_amount: 100,
    salad_amount: 100,
    salad_dressing_amount: 30,
  });
  const [driverPrepTime, setDriverPrepTime] = useState(10);

  useEffect(() => {
    loadGlobalSettings();
  }, []);

  useEffect(() => {
    loadOrders();
  }, [selectedDate, selectedMealType, globalSettings, driverPrepTime]);

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

      const { data: driverTimeData } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'driver_prep_time_minutes')
        .maybeSingle();

      if (driverTimeData) {
        const value = (driverTimeData as any).value;
        if (value) {
          const parsedValue = parseInt(value);
          if (!isNaN(parsedValue)) {
            setDriverPrepTime(parsedValue);
          }
        }
      }
    } catch (error) {
      console.error('Error loading global settings:', error);
    }
  }

  // IMPORTANTE: Esta função NÃO inclui o molho (sauce) no cálculo dos macros
  // Apenas: Proteína + Carboidrato + Legumes + Salada
  function calculateActualMacros(
    quantities: any,
    proteinRecipe?: Recipe,
    carbRecipe?: Recipe,
    vegetableRecipe?: Recipe,
    saladRecipe?: Recipe,
    sauceRecipe?: Recipe
  ) {
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
      kcal: Math.round(totalKcal),
      protein: Math.round(totalProtein * 10) / 10,
      carbs: Math.round(totalCarbs * 10) / 10,
      fat: Math.round(totalFat * 10) / 10,
    };
  }

  function calculatePickupTime(deliveryTime: string | null, travelTimeMinutes: number | null, driverPrepTime: number): string | null {
    if (!deliveryTime) return null;

    const travelTime = travelTimeMinutes || 20;
    const [hours, minutes] = deliveryTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes - (travelTime + driverPrepTime);
    const pickupHours = Math.floor(totalMinutes / 60);
    const pickupMinutes = totalMinutes % 60;
    return `${String(pickupHours).padStart(2, '0')}:${String(pickupMinutes).padStart(2, '0')}`;
  }

  function calculateProductionTimeRange(deliveryTime: string | null, travelTimeMinutes: number | null, driverPrepTime: number = 10) {
    if (!deliveryTime) return null;

    const pickupTime = calculatePickupTime(deliveryTime, travelTimeMinutes, driverPrepTime);
    if (!pickupTime) return null;

    const travelTime = travelTimeMinutes || 20;
    const [hours, minutes] = pickupTime.split(':').map(Number);

    const endDate = new Date();
    endDate.setHours(hours, minutes, 0, 0);
    endDate.setMinutes(endDate.getMinutes() + travelTime);

    const startDate = new Date(endDate);
    startDate.setMinutes(startDate.getMinutes() - 10);

    const formatHHMM = (date: Date) => {
      return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    };

    return {
      start: formatHHMM(startDate),
      end: formatHHMM(endDate),
    };
  }

  async function loadOrders() {
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

      // Criar Map usando chave composta: customer_id + meal_type + date
      // Isso garante que não haja confusão entre almoço e jantar
      const modifiedOrdersMap = new Map(
        modifiedOrdersData?.map((o: any) => [`${o.customer_id}_${o.meal_type}_${o.order_date}`, o]) || []
      );

      const { data: statusData } = await supabase
        .from('order_status')
        .select('*')
        .eq('order_date', selectedDate)
        .eq('meal_type', selectedMealType);

      const statusMap = new Map(
        statusData?.map((s: any) => [s.customer_id, s]) || []
      );

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
        // Buscar usando a chave composta
        const modifiedOrder = modifiedOrdersMap.get(`${customerData.id}_${selectedMealType}_${selectedDate}`);

        if (modifiedOrder) {
          const defaultSchedule = customerData.delivery_schedules?.find(
            (ds: any) =>
              ds.day_of_week === adjustedDayOfWeek &&
              ds.meal_type === selectedMealType &&
              ds.is_active
          );

          const deliverySchedule = {
            ...defaultSchedule,
            delivery_time: modifiedOrder.modified_delivery_time || defaultSchedule?.delivery_time,
            delivery_address: modifiedOrder.modified_delivery_address || defaultSchedule?.delivery_address,
          };

          const customMenuRecipes: any = { ...menuRecipes };
          let hasModifiedProtein = false;
          let hasModifiedCarb = false;

          if (modifiedOrder.protein_recipe_id) {
            const { data: customProtein } = await supabase
              .from('recipes')
              .select('*')
              .eq('id', modifiedOrder.protein_recipe_id)
              .maybeSingle();
            if (customProtein) {
              customMenuRecipes.protein = customProtein;
              hasModifiedProtein = menuRecipes.protein?.id !== customProtein.id;
            }
          } else if (modifiedOrder.modified_protein_name) {
            const { data: customProtein } = await supabase
              .from('recipes')
              .select('*')
              .eq('name', modifiedOrder.modified_protein_name)
              .maybeSingle();
            if (customProtein) {
              customMenuRecipes.protein = customProtein;
              hasModifiedProtein = menuRecipes.protein?.id !== customProtein.id;
            }
          }

          if (modifiedOrder.carb_recipe_id) {
            const { data: customCarb } = await supabase
              .from('recipes')
              .select('*')
              .eq('id', modifiedOrder.carb_recipe_id)
              .maybeSingle();
            if (customCarb) {
              customMenuRecipes.carb = customCarb;
              hasModifiedCarb = menuRecipes.carb?.id !== customCarb.id;
            }
          } else if (modifiedOrder.modified_carb_name) {
            const { data: customCarb } = await supabase
              .from('recipes')
              .select('*')
              .eq('name', modifiedOrder.modified_carb_name)
              .maybeSingle();
            if (customCarb) {
              customMenuRecipes.carb = customCarb;
              hasModifiedCarb = menuRecipes.carb?.id !== customCarb.id;
            }
          }

          const quantities = calculateOrderQuantities(
            customerData,
            selectedMealType,
            globalSettings,
            customMenuRecipes.protein,
            customMenuRecipes.carb,
            customMenuRecipes.vegetable,
            customMenuRecipes.salad
          );

          const orderStatus = statusMap.get(customerData.id);

          const isCancelled = modifiedOrder.is_cancelled || modifiedOrder.status === 'cancelled';

          const productionTimeRange = calculateProductionTimeRange(
            deliverySchedule.delivery_time,
            deliverySchedule.travel_time_minutes,
            driverPrepTime
          );

          kitchenOrders.push({
            id: modifiedOrder.id,
            customer,
            deliverySchedule,
            menuRecipes: customMenuRecipes,
            quantities,
            status: orderStatus?.kitchen_status || 'pending',
            isCancelled,
            hasModifiedProtein,
            hasModifiedCarb,
            sischefOrderId: modifiedOrder.sischef_order_id,
            productionTimeRange: productionTimeRange || undefined,
          });
        } else {
          const deliverySchedule = customerData.delivery_schedules?.find(
            (ds: any) =>
              ds.day_of_week === adjustedDayOfWeek &&
              ds.meal_type === selectedMealType &&
              ds.is_active
          );

          if (deliverySchedule && deliverySchedule.delivery_time && deliverySchedule.delivery_address) {
            const quantities = calculateOrderQuantities(
              customerData,
              selectedMealType,
              globalSettings,
              menuRecipes.protein,
              menuRecipes.carb,
              menuRecipes.vegetable,
              menuRecipes.salad
            );

            const orderStatus = statusMap.get(customerData.id);

            const productionTimeRange = calculateProductionTimeRange(
              deliverySchedule.delivery_time,
              deliverySchedule.travel_time_minutes,
              driverPrepTime
            );

            kitchenOrders.push({
              customer,
              deliverySchedule,
              menuRecipes,
              quantities,
              status: orderStatus?.kitchen_status || 'pending',
              productionTimeRange: productionTimeRange || undefined,
            });
          }
        }
      }

      kitchenOrders.sort((a, b) => {
        const timeA = a.productionTimeRange?.end || a.deliverySchedule.delivery_time || '';
        const timeB = b.productionTimeRange?.end || b.deliverySchedule.delivery_time || '';
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

  async function updateOrderStatus(index: number, newStatus: 'pending' | 'preparing' | 'ready') {
    const order = orders[index];

    const { error } = await (supabase as any)
      .from('order_status')
      .upsert({
        customer_id: order.customer.id,
        order_date: selectedDate,
        meal_type: selectedMealType,
        kitchen_status: newStatus,
      }, {
        onConflict: 'customer_id,order_date,meal_type'
      });

    if (!error) {
      setOrders(prev => {
        const updated = [...prev];
        updated[index] = { ...updated[index], status: newStatus };
        return updated;
      });
    }
  }

  async function sendToSischef(customerOrder: KitchenOrder) {
    if (customerOrder.isCancelled) {
      alert('Não é possível enviar pedidos cancelados para o Sischef');
      return;
    }

    setSendingToSischef(customerOrder.customer.id);

    try {
      let orderId = customerOrder.id;

      if (!orderId) {
        const { data: existingOrder } = await supabase
          .from('orders')
          .select('id')
          .eq('customer_id', customerOrder.customer.id)
          .eq('order_date', selectedDate)
          .eq('meal_type', selectedMealType)
          .maybeSingle();

        if (existingOrder) {
          orderId = (existingOrder as any).id;
        } else {
          const { data: newOrder, error: createError } = await supabase
            .from('orders')
            .insert({
              customer_id: customerOrder.customer.id,
              order_date: selectedDate,
              meal_type: selectedMealType,
              protein_recipe_id: customerOrder.menuRecipes.protein?.id || null,
              protein_amount_gr: customerOrder.quantities.protein || 0,
              carb_recipe_id: customerOrder.menuRecipes.carb?.id || null,
              carb_amount_gr: customerOrder.quantities.carb || 0,
              vegetable_recipe_id: customerOrder.menuRecipes.vegetable?.id || null,
              vegetable_amount_gr: customerOrder.quantities.vegetable || 0,
              salad_recipe_id: customerOrder.menuRecipes.salad?.id || null,
              salad_amount_gr: customerOrder.quantities.salad || 0,
              sauce_recipe_id: customerOrder.menuRecipes.sauce?.id || null,
              sauce_amount_gr: customerOrder.quantities.sauce || 0,
              delivery_address: customerOrder.deliverySchedule.delivery_address || customerOrder.customer.address || '',
              delivery_time: customerOrder.deliverySchedule.delivery_time || null,
              status: 'pending',
            })
            .select()
            .single();

          if (createError || !newOrder) {
            throw new Error('Falha ao criar pedido: ' + (createError?.message || 'Pedido não retornado'));
          }

          orderId = (newOrder as any).id;
        }
      }

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/send-order-to-sischef`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ order_id: orderId }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.missing_recipes) {
          alert(
            `Erro: Algumas receitas não estão sincronizadas com o Sischef:\n\n${result.missing_recipes.map((r: any) => `- ${r.name} (${r.category})`).join('\n')}\n\nPor favor, sincronize as receitas antes de enviar o pedido.`
          );
        } else {
          alert(`Erro ao enviar para Sischef: ${result.error || 'Erro desconhecido'}`);
        }
        return;
      }

      const wasAlreadySent = orders.find(o => o.customer.id === customerOrder.customer.id)?.sischefOrderId;

      alert(
        result.sischef_response
          ? `Pedido ${wasAlreadySent ? 'atualizado' : 'enviado'} com sucesso para o Sischef!${result.sischef_order_id ? `\n\nID no Sischef: ${result.sischef_order_id}` : ''}`
          : `Pedido validado com sucesso!\n\n${result.message || ''}`
      );

      // Atualizar estado local com o novo sischef_order_id
      if (result.sischef_order_id) {
        setOrders(prev => prev.map(o =>
          o.customer.id === customerOrder.customer.id
            ? { ...o, sischefOrderId: result.sischef_order_id }
            : o
        ));
      }
    } catch (error) {
      console.error('Error sending to Sischef:', error);
      alert(`Erro ao enviar para Sischef: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setSendingToSischef(null);
    }
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

{orders.map((order, index) => {
              const mealType = selectedMealType;
              const targetKcal = ((mealType === 'lunch' ? Number(order.customer.lunch_protein) : Number(order.customer.dinner_protein)) * 4) +
                                 ((mealType === 'lunch' ? Number(order.customer.lunch_carbs) : Number(order.customer.dinner_carbs)) * 4) +
                                 ((mealType === 'lunch' ? Number(order.customer.lunch_fat) : Number(order.customer.dinner_fat)) * 9);
              const targetProtein = mealType === 'lunch' ? Number(order.customer.lunch_protein) : Number(order.customer.dinner_protein);
              const targetCarbs = mealType === 'lunch' ? Number(order.customer.lunch_carbs) : Number(order.customer.dinner_carbs);
              const targetFat = mealType === 'lunch' ? Number(order.customer.lunch_fat) : Number(order.customer.dinner_fat);

              const actualMacros = calculateActualMacros(
                order.quantities,
                order.menuRecipes.protein,
                order.menuRecipes.carb,
                order.menuRecipes.vegetable,
                order.menuRecipes.salad,
                order.menuRecipes.sauce
              );

              return (
              <Card key={`${order.customer.id}-${index}`} className={`border-l-4 ${order.isCancelled ? 'border-l-red-400 bg-red-50/30' : 'border-l-orange-500'}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-xl">{order.customer.name}</CardTitle>
                        {order.isCancelled && (
                          <Badge variant="destructive" className="bg-red-500">CANCELADO</Badge>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-orange-600" />
                          <span className="font-semibold">Horário:</span>
                          <span className="text-base font-bold text-orange-600">{formatTime(order.deliverySchedule.delivery_time)}</span>
                        </div>
                        {order.productionTimeRange && (
                          <div className="flex items-center gap-2 bg-green-50 border-2 border-green-500 rounded-lg px-3 py-2 mt-1">
                            <ChefHat className="h-5 w-5 text-green-700" />
                            <span className="font-bold text-green-900">Janela de Produção:</span>
                            <span className="text-base font-bold text-green-700">
                              {formatTime(order.productionTimeRange.start)} - {formatTime(order.productionTimeRange.end)}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span>{order.deliverySchedule.delivery_address}</span>
                        </div>
                      </div>

                      {/* Dietary restrictions and allergies section */}
                      {(() => {
                        const hasAllergies = order.customer.allergies?.some(a => a !== 'Outros' && a !== 'Nenhum') || order.customer.other_allergies;
                        const hasRestrictions = order.customer.food_restrictions;
                        return (hasAllergies || hasRestrictions) && (
                          <div className="mt-3 p-3 bg-yellow-50 border-2 border-yellow-400 rounded-lg">
                            <div className="space-y-1">
                              {hasAllergies && (
                                <div>
                                  <span className="font-bold text-red-700 text-sm">⚠️ ALERGIAS: </span>
                                  <span className="text-sm text-gray-900 font-semibold">
                                    {order.customer.allergies?.filter(a => a !== 'Outros' && a !== 'Nenhum').join(', ')}
                                    {order.customer.allergies?.filter(a => a !== 'Outros' && a !== 'Nenhum').length > 0 && order.customer.other_allergies ? ', ' : ''}
                                    {order.customer.other_allergies}
                                  </span>
                                </div>
                              )}
                              {hasRestrictions && (
                                <div>
                                  <span className="font-bold text-orange-700 text-sm">📋 RESTRIÇÕES: </span>
                                  <span className="text-sm text-gray-800">{order.customer.food_restrictions}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                    <div className="ml-4 flex flex-col gap-2">
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
                      {!order.isCancelled && (
                        <Button
                          onClick={() => sendToSischef(order)}
                          disabled={sendingToSischef === order.customer.id}
                          variant="outline"
                          size="sm"
                          className={`w-[160px] border-2 ${
                            order.sischefOrderId
                              ? 'border-green-500 text-green-700 hover:bg-green-50'
                              : 'border-orange-500 text-orange-700 hover:bg-orange-50'
                          }`}
                        >
                          <Send className="h-3 w-3 mr-1" />
                          {sendingToSischef === order.customer.id
                            ? 'Enviando...'
                            : order.sischefOrderId
                              ? '✓ Reenviar'
                              : 'Enviar Sischef'}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h3 className="font-semibold text-sm text-gray-700 mb-2">Quantidades</h3>

                      {order.menuRecipes.protein && order.quantities.protein > 0 ? (
                        <div className={`flex items-center justify-between rounded-md p-2 ${
                          order.hasModifiedProtein
                            ? 'bg-red-200 border-4 border-red-600 shadow-lg'
                            : 'bg-red-50 border border-red-200'
                        }`}>
                          <div className="flex items-center gap-2 flex-1">
                            {order.hasModifiedProtein && (
                              <AlertTriangle className="h-5 w-5 text-red-700 flex-shrink-0" />
                            )}
                            <div>
                              <span className={`text-xs font-semibold ${order.hasModifiedProtein ? 'text-red-900' : 'text-red-900'}`}>
                                Proteína:
                              </span>
                              <span className={`text-xs ml-1 ${order.hasModifiedProtein ? 'font-bold text-red-900' : 'text-red-700'}`}>
                                {order.menuRecipes.protein.name}
                              </span>
                            </div>
                          </div>
                          <span className={`text-base font-bold ml-2 ${order.hasModifiedProtein ? 'text-red-900' : 'text-red-900'}`}>
                            {order.quantities.protein}g
                          </span>
                        </div>
                      ) : null}

                      {order.menuRecipes.carb && order.quantities.carb > 0 ? (
                        <div className={`flex items-center justify-between rounded-md p-2 ${
                          order.hasModifiedCarb
                            ? 'bg-amber-200 border-4 border-amber-600 shadow-lg'
                            : 'bg-amber-50 border border-amber-200'
                        }`}>
                          <div className="flex items-center gap-2 flex-1">
                            {order.hasModifiedCarb && (
                              <AlertTriangle className="h-5 w-5 text-amber-700 flex-shrink-0" />
                            )}
                            <div>
                              <span className={`text-xs font-semibold ${order.hasModifiedCarb ? 'text-amber-900' : 'text-amber-900'}`}>
                                Carboidrato:
                              </span>
                              <span className={`text-xs ml-1 ${order.hasModifiedCarb ? 'font-bold text-amber-900' : 'text-amber-700'}`}>
                                {order.menuRecipes.carb.name}
                              </span>
                            </div>
                          </div>
                          <span className={`text-base font-bold ml-2 ${order.hasModifiedCarb ? 'text-amber-900' : 'text-amber-900'}`}>
                            {order.quantities.carb}g
                          </span>
                        </div>
                      ) : null}

                      {order.menuRecipes.vegetable && order.quantities.vegetable > 0 ? (
                        <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-md p-2">
                          <div className="flex-1">
                            <span className="text-xs font-semibold text-green-900">Legumes: </span>
                            <span className="text-xs text-green-700">{order.menuRecipes.vegetable.name}</span>
                          </div>
                          <span className="text-base font-bold text-green-900 ml-2">{order.quantities.vegetable}g</span>
                        </div>
                      ) : null}

                      {order.menuRecipes.salad && order.quantities.salad > 0 ? (
                        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-md p-2">
                          <div className="flex-1">
                            <span className="text-xs font-semibold text-emerald-900">Salada: </span>
                            <span className="text-xs text-emerald-700">{order.menuRecipes.salad.name}</span>
                          </div>
                          <span className="text-base font-bold text-emerald-900 ml-2">{order.quantities.salad}g</span>
                        </div>
                      ) : null}

                      {order.menuRecipes.sauce ? (
                        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-md p-2">
                          <div className="flex-1">
                            <span className="text-xs font-semibold text-blue-900">Molho: </span>
                            <span className="text-xs text-blue-700">{order.menuRecipes.sauce.name}</span>
                          </div>
                          <span className="text-base font-bold text-blue-900 ml-2">{order.quantities.sauce}g</span>
                        </div>
                      ) : null}

                      {!order.menuRecipes.protein && !order.menuRecipes.carb && (
                        <div className="text-center py-3 bg-yellow-50 border border-yellow-200 rounded-md">
                          <p className="text-xs text-yellow-800">
                            Nenhum cardápio definido
                          </p>
                        </div>
                      )}

                      {order.quantities.protein === 0 && order.quantities.carb === 0 && order.menuRecipes.protein && order.menuRecipes.carb && (
                        <div className="text-center py-3 bg-amber-50 border border-amber-200 rounded-md">
                          <p className="text-xs text-amber-800">
                            Metas não configuradas
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="bg-slate-50 border-2 border-slate-300 rounded-lg p-3">
                      <h3 className="font-semibold text-sm text-slate-900 mb-3 text-center">Macronutrientes</h3>
                      <div className="space-y-2">
                        <div className="grid grid-cols-3 gap-2 text-xs font-semibold text-slate-600 border-b border-slate-300 pb-1">
                          <div></div>
                          <div className="text-center">Meta</div>
                          <div className="text-center">Entregue</div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 items-center py-1">
                          <div className="text-xs font-medium text-slate-700">Kcal</div>
                          <div className="text-center text-sm font-bold text-slate-900">{Math.round(targetKcal)}</div>
                          <div className="text-center text-sm font-bold text-orange-600">{actualMacros.kcal}</div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 items-center py-1 bg-red-50 rounded px-1">
                          <div className="text-xs font-medium text-red-700">Proteína (g)</div>
                          <div className="text-center text-sm font-bold text-slate-900">{targetProtein}</div>
                          <div className="text-center text-sm font-bold text-orange-600">{actualMacros.protein}</div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 items-center py-1 bg-amber-50 rounded px-1">
                          <div className="text-xs font-medium text-amber-700">Carboidrato (g)</div>
                          <div className="text-center text-sm font-bold text-slate-900">{targetCarbs}</div>
                          <div className="text-center text-sm font-bold text-orange-600">{actualMacros.carbs}</div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 items-center py-1 bg-yellow-50 rounded px-1">
                          <div className="text-xs font-medium text-yellow-700">Gordura (g)</div>
                          <div className="text-center text-sm font-bold text-slate-900">{targetFat}</div>
                          <div className="text-center text-sm font-bold text-orange-600">{actualMacros.fat}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
