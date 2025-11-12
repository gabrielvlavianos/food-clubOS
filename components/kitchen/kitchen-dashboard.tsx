'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Printer } from 'lucide-react';
import { format, addDays, startOfWeek } from 'date-fns';
import { OrderWithDetails, Order, OrderItem, Customer, NutritionPlan, Recipe } from '@/types';

export function KitchenDashboard() {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedShift, setSelectedShift] = useState<'lunch' | 'dinner' | ''>('');
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [weekDates, setWeekDates] = useState<Array<{ date: Date; label: string }>>([]);

  useEffect(() => {
    generateWeekDates();
  }, []);

  useEffect(() => {
    if (selectedDate && selectedShift) {
      loadOrders();
    }
  }, [selectedDate, selectedShift]);

  function generateWeekDates() {
    const today = new Date();
    const startWeek = startOfWeek(today, { weekStartsOn: 1 });

    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = addDays(startWeek, i);
      const dayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
      const label = `${format(date, 'dd/MM')} - ${dayNames[date.getDay()]}`;
      dates.push({ date, label });
    }

    setWeekDates(dates);

    if (dates.length > 0) {
      setSelectedDate(dates.find(d => d.date.getDay() !== 0 && d.date.getDay() !== 6)?.date.toISOString().split('T')[0] || dates[0].date.toISOString().split('T')[0]);
    }
  }

  async function loadOrders() {
    if (!selectedDate || !selectedShift) return;

    setLoading(true);
    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('order_date', selectedDate)
        .eq('meal_type', selectedShift)
        .order('delivery_time', { ascending: true });

      if (ordersError) throw ordersError;

      if (!ordersData || ordersData.length === 0) {
        setOrders([]);
        return;
      }

      const ordersWithDetails = await Promise.all(
        ordersData.map(async (order: Order) => {
          const { data: customer } = await supabase
            .from('customers')
            .select('*')
            .eq('id', order.customer_id)
            .maybeSingle();

          if (!customer) throw new Error('Customer not found');

          const { data: items } = await supabase
            .from('order_items')
            .select('*')
            .eq('order_id', order.id);

          let itemsWithRecipes: Array<OrderItem & { recipe: Recipe }> = [];
          if (items && items.length > 0) {
            itemsWithRecipes = await Promise.all(
              items.map(async (item: OrderItem) => {
                const { data: recipe } = await supabase
                  .from('recipes')
                  .select('*')
                  .eq('id', item.recipe_id)
                  .maybeSingle();

                if (!recipe) throw new Error('Recipe not found');

                return {
                  ...item,
                  recipe: recipe as Recipe
                };
              })
            );
          }

          const { data: nutritionPlan } = await supabase
            .from('nutrition_plans')
            .select('*')
            .eq('customer_id', order.customer_id)
            .maybeSingle();

          return {
            ...order,
            customer: customer as Customer,
            items: itemsWithRecipes,
            nutrition_plan: nutritionPlan ? (nutritionPlan as NutritionPlan) : undefined
          };
        })
      );

      setOrders(ordersWithDetails);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  }

  function calculatePlateMacros(items: Array<{ recipe: Recipe; quantity_grams: number }>) {
    let totalKcal = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;

    items.forEach(item => {
      if (item.recipe.category === 'Marinada') return;

      const factor = item.quantity_grams / 100;
      totalKcal += item.recipe.kcal_per_100g * factor;
      totalProtein += item.recipe.protein_per_100g * factor;
      totalCarbs += item.recipe.carb_per_100g * factor;
      totalFat += item.recipe.fat_per_100g * factor;
    });

    return {
      kcal: Math.round(totalKcal * 10) / 10,
      protein: Math.round(totalProtein * 10) / 10,
      carbs: Math.round(totalCarbs * 10) / 10,
      fat: Math.round(totalFat * 10) / 10
    };
  }

  function formatPhone(phone: string | null) {
    if (!phone) return '-';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 13) {
      return `+${cleaned.slice(0, 2)}(${cleaned.slice(2, 4)})${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
    }
    return phone;
  }

  function handlePrint() {
    window.print();
  }

  const shiftLabel = selectedShift === 'lunch' ? 'Almoço' : selectedShift === 'dinner' ? 'Jantar' : '';
  const dateLabel = weekDates.find(d => d.date.toISOString().split('T')[0] === selectedDate)?.label || '';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Seleção de Dia e Turno
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="date">Dia</Label>
              <Select value={selectedDate} onValueChange={setSelectedDate}>
                <SelectTrigger id="date">
                  <SelectValue placeholder="Selecione o dia" />
                </SelectTrigger>
                <SelectContent>
                  {weekDates.map(({ date, label }) => (
                    <SelectItem key={date.toISOString()} value={date.toISOString().split('T')[0]}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="shift">Turno</Label>
              <Select value={selectedShift} onValueChange={(value) => setSelectedShift(value as 'lunch' | 'dinner')}>
                <SelectTrigger id="shift">
                  <SelectValue placeholder="Selecione o turno" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lunch">Almoço</SelectItem>
                  <SelectItem value="dinner">Jantar</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedDate && selectedShift && (
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                <span>
                  Entregas para: <strong>{dateLabel}</strong> - <strong>{shiftLabel}</strong>
                </span>
              </div>
              <Button onClick={handlePrint} variant="outline" size="sm">
                <Printer className="h-4 w-4 mr-2" />
                Imprimir Lista
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {loading && (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            Carregando pedidos...
          </CardContent>
        </Card>
      )}

      {!loading && selectedDate && selectedShift && (
        <>
          {orders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                Nenhum pedido para este dia e turno
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {orders.map((order, index) => {
                const plateMacros = calculatePlateMacros(order.items);
                const carboItem = order.items.find(i => i.recipe.category === 'Carboidrato');
                const proteinItem = order.items.find(i => i.recipe.category === 'Proteína');
                const vegetableItem = order.items.find(i => i.recipe.category === 'Legumes');
                const saladItem = order.items.find(i => i.recipe.category === 'Salada');
                const sauceItem = order.items.find(i => i.recipe.category === 'Molho');

                return (
                  <Card key={order.id} className="overflow-hidden">
                    <div className="bg-gray-800 text-white px-6 py-3 flex items-center justify-between">
                      <h3 className="text-xl font-bold">Pedido #{index + 1}</h3>
                      <span className="text-sm opacity-80">{order.customer.name}</span>
                    </div>

                    <CardContent className="p-6 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-4 border-r pr-6">
                          <h4 className="font-bold text-lg text-gray-700 uppercase tracking-wide">
                            Bloco 1 - Delivery
                          </h4>

                          <div className="space-y-3">
                            <div>
                              <p className="text-xs text-gray-500 uppercase">Nome</p>
                              <p className="font-medium">{order.customer.name}</p>
                            </div>

                            <div>
                              <p className="text-xs text-gray-500 uppercase">Telefone</p>
                              <p className="font-medium">{formatPhone(order.customer.phone)}</p>
                            </div>

                            <div>
                              <p className="text-xs text-gray-500 uppercase">Horário do Pedido</p>
                              <p className="font-medium">{order.delivery_time || '-'}</p>
                            </div>

                            <div>
                              <p className="text-xs text-gray-500 uppercase">Solicitação Motoboy</p>
                              <p className="font-medium text-gray-400">{order.motoboy_request_time || '(em branco)'}</p>
                            </div>

                            <div>
                              <p className="text-xs text-gray-500 uppercase">Endereço de Entrega</p>
                              <p className="font-medium text-sm">{order.delivery_address || '-'}</p>
                            </div>

                            <div>
                              <p className="text-xs text-gray-500 uppercase">Recebe Talheres</p>
                              <p className="font-medium">
                                {order.cutlery_needed ? (
                                  <span className="text-green-600">✓ Sim</span>
                                ) : (
                                  <span className="text-gray-400">✗ Não</span>
                                )}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4 border-r pr-6">
                          <h4 className="font-bold text-lg text-gray-700 uppercase tracking-wide">
                            Bloco 2 - Cozinha
                          </h4>

                          <div className="space-y-3">
                            <div className="bg-amber-50 p-3 rounded-lg">
                              <p className="text-xs text-amber-700 uppercase font-semibold">Carboidrato</p>
                              <p className="font-bold text-lg">{carboItem?.recipe.name || '-'}</p>
                              <p className="text-sm text-amber-700">{carboItem ? `${carboItem.quantity_grams}g` : '-'}</p>
                            </div>

                            <div className="bg-red-50 p-3 rounded-lg">
                              <p className="text-xs text-red-700 uppercase font-semibold">Proteína</p>
                              <p className="font-bold text-lg">{proteinItem?.recipe.name || '-'}</p>
                              <p className="text-sm text-red-700">{proteinItem ? `${proteinItem.quantity_grams}g` : '-'}</p>
                            </div>

                            <div className="bg-green-50 p-3 rounded-lg">
                              <p className="text-xs text-green-700 uppercase font-semibold">Legumes</p>
                              <p className="font-bold text-lg">{vegetableItem?.recipe.name || '-'}</p>
                              <p className="text-sm text-green-700">{vegetableItem ? `${vegetableItem.quantity_grams}g` : '-'}</p>
                            </div>

                            <div className="bg-emerald-50 p-3 rounded-lg">
                              <p className="text-xs text-emerald-700 uppercase font-semibold">Salada</p>
                              <p className="font-bold text-lg">{saladItem?.recipe.name || '-'}</p>
                              <p className="text-sm text-emerald-700">{saladItem ? `${saladItem.quantity_grams}g` : '-'}</p>
                            </div>

                            <div className="bg-blue-50 p-3 rounded-lg">
                              <p className="text-xs text-blue-700 uppercase font-semibold">Molho Salada</p>
                              <p className="font-bold text-lg">{sauceItem?.recipe.name || '-'}</p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h4 className="font-bold text-lg text-gray-700 uppercase tracking-wide">
                            Bloco 3 - Consulta
                          </h4>

                          <div className="space-y-2">
                            <div className="flex justify-between items-center pb-2 border-b">
                              <span className="text-sm text-gray-600">Calorias (prato)</span>
                              <span className="font-bold">{plateMacros.kcal} kcal</span>
                            </div>
                            <div className="flex justify-between items-center pb-2 border-b">
                              <span className="text-sm text-gray-600">Calorias (target)</span>
                              <span className="font-medium text-gray-500">
                                {order.nutrition_plan?.target_calories || '-'} kcal
                              </span>
                            </div>

                            <div className="flex justify-between items-center pb-2 border-b">
                              <span className="text-sm text-gray-600">Carboidrato (prato)</span>
                              <span className="font-bold">{plateMacros.carbs}g</span>
                            </div>
                            <div className="flex justify-between items-center pb-2 border-b">
                              <span className="text-sm text-gray-600">Carboidrato (target)</span>
                              <span className="font-medium text-gray-500">
                                {order.nutrition_plan?.target_carbs_g || '-'}g
                              </span>
                            </div>

                            <div className="flex justify-between items-center pb-2 border-b">
                              <span className="text-sm text-gray-600">Proteína (prato)</span>
                              <span className="font-bold">{plateMacros.protein}g</span>
                            </div>
                            <div className="flex justify-between items-center pb-2 border-b">
                              <span className="text-sm text-gray-600">Proteína (target)</span>
                              <span className="font-medium text-gray-500">
                                {order.nutrition_plan?.target_protein_g || '-'}g
                              </span>
                            </div>

                            <div className="flex justify-between items-center pb-2 border-b">
                              <span className="text-sm text-gray-600">Gordura (prato)</span>
                              <span className="font-bold">{plateMacros.fat}g</span>
                            </div>
                            <div className="flex justify-between items-center pb-2">
                              <span className="text-sm text-gray-600">Gordura (target)</span>
                              <span className="font-medium text-gray-500">
                                {order.nutrition_plan?.target_fat_g || '-'}g
                              </span>
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
        </>
      )}

      {!selectedDate && !selectedShift && (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            Selecione o dia e o turno para visualizar os pedidos
          </CardContent>
        </Card>
      )}
    </div>
  );
}
