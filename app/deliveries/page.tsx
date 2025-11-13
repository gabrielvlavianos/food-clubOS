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
import { Truck, Calendar, Clock, MapPin, Package, RefreshCw, Check, Phone } from 'lucide-react';
import type { Recipe } from '@/types';

interface OrderWithDetails {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  order_date: string;
  meal_type: 'lunch' | 'dinner';
  protein_recipe: Recipe;
  protein_amount_gr: number;
  carb_recipe: Recipe;
  carb_amount_gr: number;
  vegetable_recipe?: Recipe;
  vegetable_amount_gr?: number;
  salad_recipe?: Recipe;
  salad_amount_gr?: number;
  sauce_recipe?: Recipe;
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  delivery_address: string;
  delivery_time: string;
  status: 'pending' | 'preparing' | 'ready' | 'delivered';
  notes?: string;
}

export default function DeliveriesPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMealType, setSelectedMealType] = useState<'lunch' | 'dinner'>('lunch');
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDelivered, setShowDelivered] = useState(false);

  useEffect(() => {
    loadRecipes();
  }, []);

  useEffect(() => {
    loadOrders();
  }, [selectedDate, selectedMealType, showDelivered]);

  async function loadRecipes() {
    const { data } = await supabase
      .from('recipes')
      .select('*')
      .eq('is_active', true)
      .order('category, name');

    if (data) setRecipes(data);
  }

  async function loadOrders() {
    setLoading(true);
    try {
      const statusFilter = showDelivered ? ['delivered'] : ['ready'];

      const { data: ordersData, error } = await supabase
        .from('orders')
        .select(`
          *,
          customers!orders_customer_id_fkey(name, phone)
        `)
        .eq('order_date', selectedDate)
        .eq('meal_type', selectedMealType)
        .in('status', statusFilter)
        .order('delivery_time');

      if (error) throw error;

      if (ordersData && ordersData.length > 0) {
        const recipeIds = new Set<string>();
        ordersData.forEach((order: any) => {
          recipeIds.add(order.protein_recipe_id);
          recipeIds.add(order.carb_recipe_id);
          if (order.vegetable_recipe_id) recipeIds.add(order.vegetable_recipe_id);
          if (order.salad_recipe_id) recipeIds.add(order.salad_recipe_id);
          if (order.sauce_recipe_id) recipeIds.add(order.sauce_recipe_id);
        });

        const { data: recipesData } = await supabase
          .from('recipes')
          .select('*')
          .in('id', Array.from(recipeIds));

        const recipesMap = new Map<string, Recipe>(
          recipesData?.map((r: Recipe) => [r.id, r]) || []
        );

        const ordersWithDetails: OrderWithDetails[] = ordersData.map((order: any) => ({
          id: order.id,
          customer_id: order.customer_id,
          customer_name: order.customers.name,
          customer_phone: order.customers.phone || 'Sem telefone',
          order_date: order.order_date,
          meal_type: order.meal_type,
          protein_recipe: recipesMap.get(order.protein_recipe_id)!,
          protein_amount_gr: order.protein_amount_gr,
          carb_recipe: recipesMap.get(order.carb_recipe_id)!,
          carb_amount_gr: order.carb_amount_gr,
          vegetable_recipe: order.vegetable_recipe_id ? recipesMap.get(order.vegetable_recipe_id) : undefined,
          vegetable_amount_gr: order.vegetable_amount_gr,
          salad_recipe: order.salad_recipe_id ? recipesMap.get(order.salad_recipe_id) : undefined,
          salad_amount_gr: order.salad_amount_gr,
          sauce_recipe: order.sauce_recipe_id ? recipesMap.get(order.sauce_recipe_id) : undefined,
          total_calories: order.total_calories,
          total_protein: order.total_protein,
          total_carbs: order.total_carbs,
          total_fat: order.total_fat,
          delivery_address: order.delivery_address,
          delivery_time: order.delivery_time,
          status: order.status,
          notes: order.notes,
        }));

        setOrders(ordersWithDetails);
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  async function markAsDelivered(orderId: string) {
    const { error } = await (supabase as any)
      .from('orders')
      .update({ status: 'delivered' })
      .eq('id', orderId);

    if (!error) {
      loadOrders();
    }
  }

  const statusColors = {
    ready: 'bg-green-100 text-green-800',
    delivered: 'bg-purple-100 text-purple-800',
  };

  const statusLabels = {
    ready: 'Pronto para Entrega',
    delivered: 'Entregue',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Truck className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Dashboard de Entregas</h1>
          </div>
          <p className="text-gray-600">Gerencie as entregas prontas e finalize os pedidos entregues</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Selecionar Data e Turno
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <div>
                <Label htmlFor="filter">Filtro</Label>
                <Select value={showDelivered ? 'delivered' : 'ready'} onValueChange={(value) => setShowDelivered(value === 'delivered')}>
                  <SelectTrigger id="filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ready">Prontos para Entrega</SelectItem>
                    <SelectItem value="delivered">Já Entregues</SelectItem>
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
            <p className="text-gray-600">Carregando entregas...</p>
          </div>
        ) : orders.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 text-lg">
                {showDelivered ? 'Nenhuma entrega concluída' : 'Nenhum pedido pronto para entrega'}
              </p>
              <p className="text-gray-500 text-sm mt-2">
                {showDelivered
                  ? 'Os pedidos entregues aparecem aqui após serem finalizados'
                  : 'Os pedidos aparecem aqui quando a cozinha finaliza o preparo'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                {orders.length} {orders.length === 1 ? 'Entrega' : 'Entregas'}
              </h2>
              <div className="flex gap-2">
                <Badge variant="outline" className="text-sm">
                  <Clock className="h-3 w-3 mr-1" />
                  {selectedMealType === 'lunch' ? 'Almoço' : 'Jantar'}
                </Badge>
              </div>
            </div>

            {orders.map((order) => (
              <Card key={order.id} className="border-l-4 border-l-blue-500">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-lg">{order.customer_name}</CardTitle>
                        <Badge className={statusColors[order.status as 'ready' | 'delivered']}>
                          {statusLabels[order.status as 'ready' | 'delivered']}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          {order.customer_phone}
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Horário de entrega: {order.delivery_time || 'Sem horário'}
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          {order.delivery_address}
                        </div>
                      </div>
                    </div>
                    {order.status === 'ready' && (
                      <Button
                        onClick={() => markAsDelivered(order.id)}
                        size="lg"
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Check className="h-5 w-5 mr-2" />
                        Confirmar Entrega
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">Itens do Pedido</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center p-2 bg-red-50 border border-red-100 rounded">
                          <span className="text-sm font-medium text-red-900">{order.protein_recipe.name}</span>
                          <span className="text-sm font-bold text-red-900">{Math.round(order.protein_amount_gr)}g</span>
                        </div>

                        <div className="flex justify-between items-center p-2 bg-yellow-50 border border-yellow-100 rounded">
                          <span className="text-sm font-medium text-yellow-900">{order.carb_recipe.name}</span>
                          <span className="text-sm font-bold text-yellow-900">{Math.round(order.carb_amount_gr)}g</span>
                        </div>

                        {order.vegetable_recipe && (
                          <div className="flex justify-between items-center p-2 bg-green-50 border border-green-100 rounded">
                            <span className="text-sm font-medium text-green-900">{order.vegetable_recipe.name}</span>
                            <span className="text-sm font-bold text-green-900">{Math.round(order.vegetable_amount_gr || 0)}g</span>
                          </div>
                        )}

                        {order.salad_recipe && (
                          <div className="flex justify-between items-center p-2 bg-emerald-50 border border-emerald-100 rounded">
                            <span className="text-sm font-medium text-emerald-900">{order.salad_recipe.name}</span>
                            <span className="text-sm font-bold text-emerald-900">{Math.round(order.salad_amount_gr || 0)}g</span>
                          </div>
                        )}

                        {order.sauce_recipe && (
                          <div className="flex justify-between items-center p-2 bg-orange-50 border border-orange-100 rounded">
                            <span className="text-sm font-medium text-orange-900">{order.sauce_recipe.name}</span>
                            <span className="text-sm text-orange-700">À gosto</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">Informações Nutricionais</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="text-xs text-blue-700 mb-1">Calorias</div>
                          <div className="text-xl font-bold text-blue-900">{Math.round(order.total_calories)}</div>
                          <div className="text-xs text-blue-600">kcal</div>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="text-xs text-green-700 mb-1">Proteínas</div>
                          <div className="text-xl font-bold text-green-900">{order.total_protein.toFixed(1)}</div>
                          <div className="text-xs text-green-600">gramas</div>
                        </div>
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                          <div className="text-xs text-orange-700 mb-1">Carboidratos</div>
                          <div className="text-xl font-bold text-orange-900">{order.total_carbs.toFixed(1)}</div>
                          <div className="text-xs text-orange-600">gramas</div>
                        </div>
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                          <div className="text-xs text-purple-700 mb-1">Gorduras</div>
                          <div className="text-xl font-bold text-purple-900">{order.total_fat.toFixed(1)}</div>
                          <div className="text-xs text-purple-600">gramas</div>
                        </div>
                      </div>

                      {order.notes && (
                        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
                          <p className="text-sm font-medium text-amber-900 mb-1">Observações:</p>
                          <p className="text-sm text-amber-700">{order.notes}</p>
                        </div>
                      )}
                    </div>
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
