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
import { LayoutDashboard, Calendar, Clock, MapPin, RefreshCw, Phone, Package, User } from 'lucide-react';

interface OrderCard {
  id: string;
  customer_name: string;
  customer_phone: string;
  meal_type: 'lunch' | 'dinner';
  delivery_time: string;
  delivery_address: string;
  status: 'pending' | 'preparing' | 'ready' | 'delivered';
  total_calories: number;
  protein_recipe_name: string;
  carb_recipe_name: string;
}

export default function ManagerPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMealType, setSelectedMealType] = useState<'all' | 'lunch' | 'dinner'>('all');
  const [orders, setOrders] = useState<OrderCard[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadOrders();
  }, [selectedDate, selectedMealType]);

  async function loadOrders() {
    setLoading(true);
    try {
      let query = supabase
        .from('orders')
        .select(`
          id,
          meal_type,
          delivery_time,
          delivery_address,
          status,
          total_calories,
          customers!orders_customer_id_fkey(name, phone),
          protein_recipe:recipes!orders_protein_recipe_id_fkey(name),
          carb_recipe:recipes!orders_carb_recipe_id_fkey(name)
        `)
        .eq('order_date', selectedDate)
        .order('delivery_time');

      if (selectedMealType !== 'all') {
        query = query.eq('meal_type', selectedMealType);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data) {
        const ordersData: OrderCard[] = data.map((order: any) => ({
          id: order.id,
          customer_name: order.customers.name,
          customer_phone: order.customers.phone || 'Sem telefone',
          meal_type: order.meal_type,
          delivery_time: order.delivery_time,
          delivery_address: order.delivery_address,
          status: order.status,
          total_calories: order.total_calories,
          protein_recipe_name: order.protein_recipe.name,
          carb_recipe_name: order.carb_recipe.name,
        }));
        setOrders(ordersData);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  async function updateOrderStatus(orderId: string, newStatus: string) {
    const { error } = await (supabase as any)
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (!error) {
      loadOrders();
    }
  }

  const pendingOrders = orders.filter(o => o.status === 'pending');
  const preparingOrders = orders.filter(o => o.status === 'preparing');
  const readyOrders = orders.filter(o => o.status === 'ready');
  const deliveredOrders = orders.filter(o => o.status === 'delivered');

  const statusConfig = {
    pending: { label: 'Pendente', color: 'bg-gray-100 border-gray-300', badgeColor: 'bg-gray-200 text-gray-800' },
    preparing: { label: 'Em Preparo', color: 'bg-orange-50 border-orange-200', badgeColor: 'bg-orange-200 text-orange-900' },
    ready: { label: 'Pronto', color: 'bg-green-50 border-green-200', badgeColor: 'bg-green-200 text-green-900' },
    delivered: { label: 'Entregue', color: 'bg-blue-50 border-blue-200', badgeColor: 'bg-blue-200 text-blue-900' },
  };

  function OrderCardComponent({ order }: { order: OrderCard }) {
    const config = statusConfig[order.status];

    return (
      <Card className={`${config.color} border-2 mb-3 hover:shadow-md transition-shadow cursor-move`}>
        <CardContent className="p-4">
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900 truncate">{order.customer_name}</h4>
                <p className="text-xs text-gray-600 flex items-center gap-1 mt-1">
                  <Clock className="h-3 w-3" />
                  {order.delivery_time}
                </p>
              </div>
              <Badge className={`${config.badgeColor} text-xs px-2 py-1`}>
                {order.meal_type === 'lunch' ? 'Almoço' : 'Jantar'}
              </Badge>
            </div>

            <div className="text-xs text-gray-700 space-y-1">
              <p className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                <span className="truncate">{order.customer_phone}</span>
              </p>
              <p className="flex items-start gap-1">
                <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <span className="line-clamp-2">{order.delivery_address}</span>
              </p>
            </div>

            <div className="pt-2 border-t border-gray-200">
              <div className="text-xs text-gray-600 space-y-1">
                <p className="truncate">🍖 {order.protein_recipe_name}</p>
                <p className="truncate">🍚 {order.carb_recipe_name}</p>
                <p className="font-medium text-gray-800">{Math.round(order.total_calories)} kcal</p>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              {order.status === 'pending' && (
                <Button
                  size="sm"
                  onClick={() => updateOrderStatus(order.id, 'preparing')}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-xs h-7"
                >
                  Iniciar Preparo
                </Button>
              )}
              {order.status === 'preparing' && (
                <Button
                  size="sm"
                  onClick={() => updateOrderStatus(order.id, 'ready')}
                  className="w-full bg-green-600 hover:bg-green-700 text-xs h-7"
                >
                  Finalizar
                </Button>
              )}
              {order.status === 'ready' && (
                <Button
                  size="sm"
                  onClick={() => updateOrderStatus(order.id, 'delivered')}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-xs h-7"
                >
                  Confirmar Entrega
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  function KanbanColumn({
    title,
    orders,
    icon: Icon,
    color
  }: {
    title: string;
    orders: OrderCard[];
    icon: any;
    color: string;
  }) {
    return (
      <div className="flex-1 min-w-[280px]">
        <Card className={`${color} border-2`}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base">
              <div className="flex items-center gap-2">
                <Icon className="h-5 w-5" />
                {title}
              </div>
              <Badge variant="secondary" className="text-sm">
                {orders.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[calc(100vh-280px)] overflow-y-auto">
            {orders.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                Nenhum pedido
              </div>
            ) : (
              orders.map(order => (
                <OrderCardComponent key={order.id} order={order} />
              ))
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <LayoutDashboard className="h-8 w-8 text-purple-600" />
            <h1 className="text-3xl font-bold text-gray-900">Dashboard Gerencial</h1>
          </div>
          <p className="text-gray-600">Visão geral de todos os pedidos em tempo real</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Filtros
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
                <Select value={selectedMealType} onValueChange={(value: any) => setSelectedMealType(value)}>
                  <SelectTrigger id="mealType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
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
              <div className="flex items-end">
                <div className="w-full p-3 bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg border-2 border-purple-200">
                  <div className="text-xs text-purple-700 font-medium">Total de Pedidos</div>
                  <div className="text-2xl font-bold text-purple-900">{orders.length}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">Carregando pedidos...</p>
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4">
            <KanbanColumn
              title="Pendente"
              orders={pendingOrders}
              icon={Package}
              color="bg-gray-50 border-gray-200"
            />
            <KanbanColumn
              title="Em Preparo"
              orders={preparingOrders}
              icon={Clock}
              color="bg-orange-50 border-orange-200"
            />
            <KanbanColumn
              title="Pronto"
              orders={readyOrders}
              icon={Package}
              color="bg-green-50 border-green-200"
            />
            <KanbanColumn
              title="Entregue"
              orders={deliveredOrders}
              icon={User}
              color="bg-blue-50 border-blue-200"
            />
          </div>
        )}
      </main>
    </div>
  );
}
