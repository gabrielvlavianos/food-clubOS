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
import { ChefHat, Calendar, Clock, MapPin, Package, RefreshCw, Utensils } from 'lucide-react';
import type { Recipe } from '@/types';

interface OrderWithDetails {
  id: string;
  customer_id: string;
  customer_name: string;
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

export default function KitchenDashboardPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMealType, setSelectedMealType] = useState<'lunch' | 'dinner'>('lunch');
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingOrder, setEditingOrder] = useState<string | null>(null);

  useEffect(() => {
    loadRecipes();
  }, []);

  useEffect(() => {
    loadOrders();
  }, [selectedDate, selectedMealType]);

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
      const { data: ordersData, error } = await supabase
        .from('orders')
        .select(`
          *,
          customers!orders_customer_id_fkey(name)
        `)
        .eq('order_date', selectedDate)
        .eq('meal_type', selectedMealType)
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

  async function updateOrderStatus(orderId: string, newStatus: 'pending' | 'preparing' | 'ready' | 'delivered') {
    const { error } = await (supabase as any)
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (!error) {
      loadOrders();
    }
  }

  async function updateOrderRecipe(
    orderId: string,
    field: 'protein_recipe_id' | 'carb_recipe_id' | 'vegetable_recipe_id' | 'salad_recipe_id' | 'sauce_recipe_id',
    recipeId: string
  ) {
    const { error } = await (supabase as any)
      .from('orders')
      .update({ [field]: recipeId })
      .eq('id', orderId);

    if (!error) {
      loadOrders();
    }
  }

  const statusColors = {
    pending: 'bg-gray-100 text-gray-800',
    preparing: 'bg-blue-100 text-blue-800',
    ready: 'bg-green-100 text-green-800',
    delivered: 'bg-purple-100 text-purple-800',
  };

  const statusLabels = {
    pending: 'Pendente',
    preparing: 'Preparando',
    ready: 'Pronto',
    delivered: 'Entregue',
  };

  const proteinRecipes = recipes.filter(r => r.category === 'Proteína');
  const carbRecipes = recipes.filter(r => r.category === 'Carboidrato');
  const vegetableRecipes = recipes.filter(r => r.category === 'Legumes');
  const saladRecipes = recipes.filter(r => r.category === 'Salada');
  const sauceRecipes = recipes.filter(r => r.category === 'Molho');

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <ChefHat className="h-8 w-8 text-orange-600" />
            <h1 className="text-3xl font-bold text-gray-900">Dashboard da Cozinha</h1>
          </div>
          <p className="text-gray-600">Gerencie as entregas do dia e prepare os pedidos</p>
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
              <div className="flex gap-2">
                <Badge variant="outline" className="text-sm">
                  <Clock className="h-3 w-3 mr-1" />
                  {selectedMealType === 'lunch' ? 'Almoço' : 'Jantar'}
                </Badge>
              </div>
            </div>

            {orders.map((order) => (
              <Card key={order.id} className="border-l-4 border-l-orange-500">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-1">{order.customer_name}</CardTitle>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {order.delivery_time || 'Sem horário'}
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {order.delivery_address}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge className={statusColors[order.status]}>
                        {statusLabels[order.status]}
                      </Badge>
                      <Select
                        value={order.status}
                        onValueChange={(value: any) => updateOrderStatus(order.id, value)}
                      >
                        <SelectTrigger className="w-[140px] h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pendente</SelectItem>
                          <SelectItem value="preparing">Preparando</SelectItem>
                          <SelectItem value="ready">Pronto</SelectItem>
                          <SelectItem value="delivered">Entregue</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Utensils className="h-4 w-4" />
                        Receitas e Quantidades
                      </h4>
                      <div className="space-y-3">
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-red-900">Proteína</span>
                            <span className="text-lg font-bold text-red-900">{Math.round(order.protein_amount_gr)}g</span>
                          </div>
                          {editingOrder === order.id ? (
                            <Select
                              value={order.protein_recipe.id}
                              onValueChange={(value) => updateOrderRecipe(order.id, 'protein_recipe_id', value)}
                            >
                              <SelectTrigger className="w-full bg-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {proteinRecipes.map((recipe) => (
                                  <SelectItem key={recipe.id} value={recipe.id}>
                                    {recipe.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <p className="text-sm text-red-700">{order.protein_recipe.name}</p>
                          )}
                        </div>

                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-yellow-900">Carboidrato</span>
                            <span className="text-lg font-bold text-yellow-900">{Math.round(order.carb_amount_gr)}g</span>
                          </div>
                          {editingOrder === order.id ? (
                            <Select
                              value={order.carb_recipe.id}
                              onValueChange={(value) => updateOrderRecipe(order.id, 'carb_recipe_id', value)}
                            >
                              <SelectTrigger className="w-full bg-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {carbRecipes.map((recipe) => (
                                  <SelectItem key={recipe.id} value={recipe.id}>
                                    {recipe.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <p className="text-sm text-yellow-700">{order.carb_recipe.name}</p>
                          )}
                        </div>

                        {order.vegetable_recipe && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-green-900">Legumes</span>
                              <span className="text-lg font-bold text-green-900">{Math.round(order.vegetable_amount_gr || 0)}g</span>
                            </div>
                            {editingOrder === order.id ? (
                              <Select
                                value={order.vegetable_recipe.id}
                                onValueChange={(value) => updateOrderRecipe(order.id, 'vegetable_recipe_id', value)}
                              >
                                <SelectTrigger className="w-full bg-white">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {vegetableRecipes.map((recipe) => (
                                    <SelectItem key={recipe.id} value={recipe.id}>
                                      {recipe.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <p className="text-sm text-green-700">{order.vegetable_recipe.name}</p>
                            )}
                          </div>
                        )}

                        {order.salad_recipe && (
                          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-emerald-900">Salada</span>
                              <span className="text-lg font-bold text-emerald-900">{Math.round(order.salad_amount_gr || 0)}g</span>
                            </div>
                            {editingOrder === order.id ? (
                              <Select
                                value={order.salad_recipe.id}
                                onValueChange={(value) => updateOrderRecipe(order.id, 'salad_recipe_id', value)}
                              >
                                <SelectTrigger className="w-full bg-white">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {saladRecipes.map((recipe) => (
                                    <SelectItem key={recipe.id} value={recipe.id}>
                                      {recipe.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <p className="text-sm text-emerald-700">{order.salad_recipe.name}</p>
                            )}
                          </div>
                        )}

                        {order.sauce_recipe && (
                          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-orange-900">Molho</span>
                              <span className="text-sm text-orange-700">À gosto</span>
                            </div>
                            {editingOrder === order.id ? (
                              <Select
                                value={order.sauce_recipe.id}
                                onValueChange={(value) => updateOrderRecipe(order.id, 'sauce_recipe_id', value)}
                              >
                                <SelectTrigger className="w-full bg-white">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {sauceRecipes.map((recipe) => (
                                    <SelectItem key={recipe.id} value={recipe.id}>
                                      {recipe.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <p className="text-sm text-orange-700">{order.sauce_recipe.name}</p>
                            )}
                          </div>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingOrder(editingOrder === order.id ? null : order.id)}
                          className="w-full"
                        >
                          {editingOrder === order.id ? 'Concluir Edição' : 'Trocar Receitas'}
                        </Button>
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
