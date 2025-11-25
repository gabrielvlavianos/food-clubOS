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
import { Truck, Calendar, Clock, MapPin, Package, RefreshCw, Phone } from 'lucide-react';
import { format, getDay } from 'date-fns';
import type { Customer, DeliverySchedule } from '@/types';
import { formatPhoneNumber } from '@/lib/format-utils';

interface DeliveryOrder {
  customer: Customer;
  deliverySchedule: DeliverySchedule;
  kitchenStatus: 'pending' | 'preparing' | 'ready';
  deliveryStatus: 'not_started' | 'driver_requested' | 'in_route' | 'delivered';
  pickupTime: string;
}

export default function ExpeditionPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMealType, setSelectedMealType] = useState<'lunch' | 'dinner'>('lunch');
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
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
        .eq('order_date', selectedDate)
        .eq('meal_type', selectedMealType)
        .eq('is_cancelled', false);

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

      const deliveryOrders: DeliveryOrder[] = [];

      for (const customer of customersData || []) {
        const customerData = customer as any;
        const modifiedOrder = modifiedOrdersMap.get(customerData.id);

        let deliverySchedule;

        if (modifiedOrder) {
          const defaultSchedule = customerData.delivery_schedules?.find(
            (ds: any) =>
              ds.day_of_week === adjustedDayOfWeek &&
              ds.meal_type === selectedMealType &&
              ds.is_active
          );
          deliverySchedule = {
            ...defaultSchedule,
            delivery_time: modifiedOrder.modified_delivery_time || defaultSchedule?.delivery_time,
            delivery_address: modifiedOrder.modified_delivery_address || defaultSchedule?.delivery_address,
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
          const orderStatus = statusMap.get(customerData.id);

          deliveryOrders.push({
            customer,
            deliverySchedule,
            kitchenStatus: orderStatus?.kitchen_status || 'pending',
            deliveryStatus: orderStatus?.delivery_status || 'not_started',
            pickupTime,
          });
        }
      }

      deliveryOrders.sort((a, b) => {
        const timeA = a.deliverySchedule.delivery_time || '';
        const timeB = b.deliverySchedule.delivery_time || '';
        return timeA.localeCompare(timeB);
      });

      setOrders(deliveryOrders);
    } catch (error) {
      console.error('Error loading orders:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  async function updateDeliveryStatus(
    index: number,
    newStatus: 'not_started' | 'driver_requested' | 'in_route' | 'delivered'
  ) {
    const order = orders[index];

    const { error } = await (supabase as any)
      .from('order_status')
      .upsert({
        customer_id: order.customer.id,
        order_date: selectedDate,
        meal_type: selectedMealType,
        delivery_status: newStatus,
      }, {
        onConflict: 'customer_id,order_date,meal_type'
      });

    if (!error) {
      setOrders(prev => {
        const updated = [...prev];
        updated[index] = { ...updated[index], deliveryStatus: newStatus };
        return updated;
      });
    }
  }

  const kitchenStatusColors = {
    pending: 'bg-gray-100 text-gray-800 border-gray-300',
    preparing: 'bg-blue-100 text-blue-800 border-blue-300',
    ready: 'bg-green-100 text-green-800 border-green-300',
  };

  const kitchenStatusLabels = {
    pending: 'Não iniciado',
    preparing: 'Em preparo',
    ready: 'Finalizado',
  };

  const deliveryStatusColors = {
    not_started: 'bg-gray-100 text-gray-800 border-gray-300',
    driver_requested: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    in_route: 'bg-blue-100 text-blue-800 border-blue-300',
    delivered: 'bg-green-100 text-green-800 border-green-300',
  };

  const deliveryStatusLabels = {
    not_started: 'Não iniciado',
    driver_requested: 'Motoboy solicitado',
    in_route: 'Em rota de entrega',
    delivered: 'Pedido entregue',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Truck className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Expedição</h1>
          </div>
          <p className="text-gray-600">Gerencie as entregas e acompanhe o status dos pedidos</p>
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
            <p className="text-gray-600">Carregando entregas...</p>
          </div>
        ) : orders.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 text-lg">Nenhuma entrega para este dia e turno</p>
              <p className="text-gray-500 text-sm mt-2">
                As entregas aparecem automaticamente quando há pedidos agendados
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                {orders.length} {orders.length === 1 ? 'Entrega' : 'Entregas'}
              </h2>
              <Badge variant="outline" className="text-sm">
                <Clock className="h-3 w-3 mr-1" />
                {format(new Date(selectedDate), 'dd/MM/yyyy')} - {selectedMealType === 'lunch' ? 'Almoço' : 'Jantar'}
              </Badge>
            </div>

            {orders.map((order, index) => (
              <Card key={`${order.customer.id}-${index}`} className="border-l-4 border-l-blue-500">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-3">{order.customer.name}</CardTitle>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-gray-700">
                          <Phone className="h-4 w-4 text-blue-600" />
                          <span className="font-medium">Telefone:</span>
                          <span className="font-semibold">{formatPhoneNumber(order.customer.phone)}</span>
                        </div>

                        <div className="flex items-center gap-2 text-gray-700">
                          <Clock className="h-4 w-4 text-orange-600" />
                          <span className="font-medium">Solicitar motoboy:</span>
                          <span className="text-base font-bold text-orange-600">{order.pickupTime}</span>
                        </div>

                        <div className="flex items-center gap-2 text-gray-700">
                          <Clock className="h-4 w-4 text-green-600" />
                          <span className="font-medium">Horário de entrega:</span>
                          <span className="text-base font-bold text-green-600">{order.deliverySchedule.delivery_time}</span>
                        </div>

                        <div className="flex items-center gap-2 text-gray-700">
                          <MapPin className="h-4 w-4 text-gray-600" />
                          <span className="font-medium">Endereço:</span>
                          <span>{order.deliverySchedule.delivery_address}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs text-gray-600 mb-1 block">Status Cozinha</Label>
                        <Badge className={`${kitchenStatusColors[order.kitchenStatus]} text-xs px-3 py-1 border-2`}>
                          {kitchenStatusLabels[order.kitchenStatus]}
                        </Badge>
                      </div>

                      <div>
                        <Label className="text-xs text-gray-600 mb-1 block">Status Expedição</Label>
                        <Select
                          value={order.deliveryStatus}
                          onValueChange={(value: 'not_started' | 'driver_requested' | 'in_route' | 'delivered') =>
                            updateDeliveryStatus(index, value)
                          }
                        >
                          <SelectTrigger className={`w-[180px] border-2 ${deliveryStatusColors[order.deliveryStatus]}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="not_started">{deliveryStatusLabels.not_started}</SelectItem>
                            <SelectItem value="driver_requested">{deliveryStatusLabels.driver_requested}</SelectItem>
                            <SelectItem
                              value="in_route"
                              disabled={order.kitchenStatus !== 'ready'}
                            >
                              {deliveryStatusLabels.in_route}
                              {order.kitchenStatus !== 'ready' && ' (requer finalização)'}
                            </SelectItem>
                            <SelectItem
                              value="delivered"
                              disabled={order.kitchenStatus !== 'ready'}
                            >
                              {deliveryStatusLabels.delivered}
                              {order.kitchenStatus !== 'ready' && ' (requer finalização)'}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        {order.kitchenStatus !== 'ready' && (order.deliveryStatus === 'not_started' || order.deliveryStatus === 'driver_requested') && (
                          <p className="text-xs text-blue-600 mt-1">
                            💡 Você pode solicitar o motoboy durante o preparo
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
