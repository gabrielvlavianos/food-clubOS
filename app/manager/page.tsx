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
import { LayoutDashboard, Calendar, Clock, MapPin, RefreshCw, Phone, Package, ChefHat, Truck, Navigation as NavigationIcon, CheckCircle2 } from 'lucide-react';
import { format, getDay } from 'date-fns';
import { formatPhoneNumber } from '@/lib/format-utils';
import type { Customer, DeliverySchedule } from '@/types';

interface OrderStatus {
  customer_id: string;
  kitchen_status: 'pending' | 'preparing' | 'ready';
  delivery_status: 'not_started' | 'driver_requested' | 'in_route' | 'delivered';
}

interface ManagerOrder {
  customer: Customer;
  deliverySchedule: DeliverySchedule;
  orderStatus: OrderStatus;
  pickupTime: string;
}

type KanbanStage = 'not_started' | 'kitchen' | 'expedition' | 'in_route' | 'delivered';

export default function ManagerPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMealType, setSelectedMealType] = useState<'lunch' | 'dinner'>('lunch');
  const [orders, setOrders] = useState<ManagerOrder[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadOrders();
  }, [selectedDate, selectedMealType]);

  function calculatePickupTime(deliveryTime: string): string {
    const [hours, minutes] = deliveryTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes - 30;
    const pickupHours = Math.floor(totalMinutes / 60);
    const pickupMinutes = totalMinutes % 60;
    return `${String(pickupHours).padStart(2, '0')}:${String(pickupMinutes).padStart(2, '0')}`;
  }

  function getKanbanStage(orderStatus: OrderStatus): KanbanStage {
    if (orderStatus.kitchen_status === 'pending') {
      return 'not_started';
    }

    if (orderStatus.kitchen_status === 'preparing') {
      return 'kitchen';
    }

    if (orderStatus.kitchen_status === 'ready') {
      if (orderStatus.delivery_status === 'in_route') {
        return 'in_route';
      }
      if (orderStatus.delivery_status === 'delivered') {
        return 'delivered';
      }
      return 'expedition';
    }

    return 'not_started';
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
        .eq('is_active', true);

      if (customersError) throw customersError;

      const { data: modifiedOrdersData } = await supabase
        .from('orders')
        .select('*')
        .eq('delivery_date', selectedDate)
        .eq('meal_type', selectedMealType)
        .neq('status', 'cancelled');

      const modifiedOrdersMap = new Map(
        modifiedOrdersData?.map((o: any) => [o.customer_id, o]) || []
      );

      const { data: statusData } = await supabase
        .from('order_status')
        .select('*')
        .eq('order_date', selectedDate)
        .eq('meal_type', selectedMealType);

      const statusMap = new Map(
        statusData?.map((s: any) => [s.customer_id, s]) || []
      );

      const managerOrders: ManagerOrder[] = [];

      for (const customer of customersData || []) {
        const customerData = customer as any;
        const modifiedOrder = modifiedOrdersMap.get(customerData.id);

        let deliverySchedule;

        if (modifiedOrder) {
          deliverySchedule = {
            ...customerData.delivery_schedules?.[0],
            delivery_time: modifiedOrder.delivery_time,
            delivery_address: modifiedOrder.delivery_address,
          };
        } else {
          deliverySchedule = customerData.delivery_schedules?.find(
            (ds: any) =>
              ds.day_of_week === adjustedDayOfWeek &&
              ds.meal_type === selectedMealType &&
              ds.is_active
          );
        }

        if (deliverySchedule && deliverySchedule.delivery_time && deliverySchedule.delivery_address) {
          const pickupTime = calculatePickupTime(deliverySchedule.delivery_time);
          const orderStatusData = statusMap.get(customerData.id);

          const orderStatus: OrderStatus = {
            customer_id: customerData.id,
            kitchen_status: orderStatusData?.kitchen_status || 'pending',
            delivery_status: orderStatusData?.delivery_status || 'not_started',
          };

          managerOrders.push({
            customer,
            deliverySchedule,
            orderStatus,
            pickupTime,
          });
        }
      }

      managerOrders.sort((a, b) => {
        const timeA = a.deliverySchedule.delivery_time || '';
        const timeB = b.deliverySchedule.delivery_time || '';
        return timeA.localeCompare(timeB);
      });

      setOrders(managerOrders);
    } catch (error) {
      console.error('Error loading orders:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  const notStartedOrders = orders.filter(o => getKanbanStage(o.orderStatus) === 'not_started');
  const kitchenOrders = orders.filter(o => getKanbanStage(o.orderStatus) === 'kitchen');
  const expeditionOrders = orders.filter(o => getKanbanStage(o.orderStatus) === 'expedition');
  const inRouteOrders = orders.filter(o => getKanbanStage(o.orderStatus) === 'in_route');
  const deliveredOrders = orders.filter(o => getKanbanStage(o.orderStatus) === 'delivered');

  function OrderCard({ order }: { order: ManagerOrder }) {
    const stage = getKanbanStage(order.orderStatus);

    const stageConfig = {
      not_started: {
        color: 'bg-gray-50 border-gray-300',
        badgeColor: 'bg-gray-200 text-gray-800',
        statusText: 'Não iniciado'
      },
      kitchen: {
        color: 'bg-orange-50 border-orange-300',
        badgeColor: 'bg-orange-200 text-orange-900',
        statusText: 'Em preparo'
      },
      expedition: {
        color: 'bg-blue-50 border-blue-300',
        badgeColor: 'bg-blue-200 text-blue-900',
        statusText: order.orderStatus.delivery_status === 'driver_requested' ? 'Motoboy solicitado' : 'Aguardando motoboy'
      },
      in_route: {
        color: 'bg-violet-50 border-violet-300',
        badgeColor: 'bg-violet-200 text-violet-900',
        statusText: 'Em rota'
      },
      delivered: {
        color: 'bg-green-50 border-green-300',
        badgeColor: 'bg-green-200 text-green-900',
        statusText: 'Entregue'
      },
    };

    const config = stageConfig[stage];

    return (
      <Card className={`${config.color} border-2 mb-3 hover:shadow-md transition-shadow`}>
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-gray-900 text-base mb-1">{order.customer.name}</h4>
                <Badge className={`${config.badgeColor} text-xs px-2 py-1`}>
                  {config.statusText}
                </Badge>
              </div>
            </div>

            <div className="text-sm text-gray-700 space-y-2">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-blue-600 flex-shrink-0" />
                <span className="font-medium">{formatPhoneNumber(order.customer.phone)}</span>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-600 flex-shrink-0" />
                <div className="flex flex-col">
                  <span className="text-xs text-gray-600">Solicitar motoboy:</span>
                  <span className="font-bold text-orange-600">{order.pickupTime}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-green-600 flex-shrink-0" />
                <div className="flex flex-col">
                  <span className="text-xs text-gray-600">Entrega:</span>
                  <span className="font-bold text-green-600">{order.deliverySchedule.delivery_time}</span>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-gray-600 flex-shrink-0 mt-0.5" />
                <span className="text-xs line-clamp-2">{order.deliverySchedule.delivery_address}</span>
              </div>
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
    color,
    description
  }: {
    title: string;
    orders: ManagerOrder[];
    icon: any;
    color: string;
    description: string;
  }) {
    return (
      <div className="flex-1 min-w-[300px]">
        <Card className={`${color} border-2 h-full`}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5" />
                  {title}
                </div>
                <p className="text-xs font-normal text-gray-600">{description}</p>
              </div>
              <Badge variant="secondary" className="text-lg font-bold px-3 py-1">
                {orders.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[calc(100vh-320px)] overflow-y-auto">
            {orders.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                Nenhum pedido
              </div>
            ) : (
              orders.map(order => (
                <OrderCard key={order.customer.id} order={order} />
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
            <LayoutDashboard className="h-8 w-8 text-slate-600" />
            <h1 className="text-3xl font-bold text-gray-900">Dashboard Gerencial</h1>
          </div>
          <p className="text-gray-600">Acompanhe o fluxo operacional dos pedidos em tempo real</p>
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
              <div className="flex items-end">
                <div className="w-full p-3 bg-gradient-to-r from-slate-100 to-slate-200 rounded-lg border-2 border-slate-300">
                  <div className="text-xs text-slate-700 font-medium">Total de Pedidos</div>
                  <div className="text-2xl font-bold text-slate-900">{orders.length}</div>
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
        ) : orders.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 text-lg">Nenhum pedido para este dia e turno</p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4">
            <KanbanColumn
              title="Não Iniciado"
              description="Pedidos aguardando início do preparo"
              orders={notStartedOrders}
              icon={Package}
              color="bg-gray-50 border-gray-300"
            />
            <KanbanColumn
              title="Cozinha"
              description="Pedidos em preparo"
              orders={kitchenOrders}
              icon={ChefHat}
              color="bg-orange-50 border-orange-300"
            />
            <KanbanColumn
              title="Expedição"
              description="Finalizados, aguardando retirada"
              orders={expeditionOrders}
              icon={Truck}
              color="bg-blue-50 border-blue-300"
            />
            <KanbanColumn
              title="Em Rota"
              description="Pedidos em rota de entrega"
              orders={inRouteOrders}
              icon={NavigationIcon}
              color="bg-violet-50 border-violet-300"
            />
            <KanbanColumn
              title="Entregue"
              description="Pedidos finalizados"
              orders={deliveredOrders}
              icon={CheckCircle2}
              color="bg-green-50 border-green-300"
            />
          </div>
        )}
      </main>
    </div>
  );
}
