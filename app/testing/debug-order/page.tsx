'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, CheckCircle, XCircle } from 'lucide-react';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';

interface OrderDetails {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  order_date: string;
  meal_type: string;
  delivery_time: string;
  delivery_address: string;
  protein_recipe_id: string;
  protein_name: string;
  protein_sischef_id: string;
  protein_amount_gr: number;
  carb_recipe_id: string;
  carb_name: string;
  carb_sischef_id: string;
  carb_amount_gr: number;
  vegetable_recipe_id: string;
  vegetable_name: string;
  vegetable_sischef_id: string;
  vegetable_amount_gr: number;
  salad_recipe_id: string;
  salad_name: string;
  salad_sischef_id: string;
  salad_amount_gr: number;
  sauce_recipe_id: string;
  sauce_name: string;
  sauce_sischef_id: string;
  sauce_amount_gr: number;
  status: string;
  created_at: string;
}

interface SisChefPayload {
  customer: {
    name: string;
    phone: string;
    email?: string;
  };
  delivery: {
    address: string;
    time: string;
    date: string;
  };
  items: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    unit: string;
  }>;
  observations: string;
}

export default function DebugOrderPage() {
  const [orders, setOrders] = useState<OrderDetails[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetails | null>(null);
  const [payload, setPayload] = useState<SisChefPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadRecentOrders();
  }, []);

  const loadRecentOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_order_details_for_debug', {
        days_ago: 1
      });

      if (error) {
        // Fallback: consulta manual
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select(`
            *,
            customers!inner(name, phone)
          `)
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false })
          .limit(10);

        if (ordersError) throw ordersError;

        // Buscar receitas manualmente
        const ordersWithRecipes = await Promise.all(
          (ordersData || []).map(async (order: any) => {
            const recipeIds = [
              order.protein_recipe_id,
              order.carb_recipe_id,
              order.vegetable_recipe_id,
              order.salad_recipe_id,
              order.sauce_recipe_id
            ].filter(Boolean);

            const { data: recipes } = await supabase
              .from('recipes')
              .select('id, name, sischef_external_id')
              .in('id', recipeIds);

            const getRecipe = (id: string) => recipes?.find(r => r.id === id);

            const proteinRecipe = getRecipe(order.protein_recipe_id);
            const carbRecipe = getRecipe(order.carb_recipe_id);
            const vegRecipe = getRecipe(order.vegetable_recipe_id);
            const saladRecipe = getRecipe(order.salad_recipe_id);
            const sauceRecipe = getRecipe(order.sauce_recipe_id);

            return {
              id: order.id,
              customer_id: order.customer_id,
              customer_name: order.customers.name,
              customer_phone: order.customers.phone,
              order_date: order.order_date,
              meal_type: order.meal_type,
              delivery_time: order.delivery_time,
              delivery_address: order.delivery_address,
              protein_recipe_id: order.protein_recipe_id,
              protein_name: proteinRecipe?.name || '',
              protein_sischef_id: proteinRecipe?.sischef_external_id || '',
              protein_amount_gr: parseFloat(order.protein_amount_gr),
              carb_recipe_id: order.carb_recipe_id,
              carb_name: carbRecipe?.name || '',
              carb_sischef_id: carbRecipe?.sischef_external_id || '',
              carb_amount_gr: parseFloat(order.carb_amount_gr),
              vegetable_recipe_id: order.vegetable_recipe_id,
              vegetable_name: vegRecipe?.name || '',
              vegetable_sischef_id: vegRecipe?.sischef_external_id || '',
              vegetable_amount_gr: parseFloat(order.vegetable_amount_gr),
              salad_recipe_id: order.salad_recipe_id,
              salad_name: saladRecipe?.name || '',
              salad_sischef_id: saladRecipe?.sischef_external_id || '',
              salad_amount_gr: parseFloat(order.salad_amount_gr),
              sauce_recipe_id: order.sauce_recipe_id,
              sauce_name: sauceRecipe?.name || '',
              sauce_sischef_id: sauceRecipe?.sischef_external_id || '',
              sauce_amount_gr: parseFloat(order.sauce_amount_gr),
              status: order.status,
              created_at: order.created_at
            };
          })
        );

        setOrders(ordersWithRecipes);
      } else {
        setOrders(data || []);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os pedidos',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const generatePayload = (order: OrderDetails): SisChefPayload => {
    const items = [
      {
        product_id: order.protein_sischef_id,
        product_name: order.protein_name,
        quantity: order.protein_amount_gr,
        unit: 'g'
      },
      {
        product_id: order.carb_sischef_id,
        product_name: order.carb_name,
        quantity: order.carb_amount_gr,
        unit: 'g'
      },
      {
        product_id: order.vegetable_sischef_id,
        product_name: order.vegetable_name,
        quantity: order.vegetable_amount_gr,
        unit: 'g'
      },
      {
        product_id: order.salad_sischef_id,
        product_name: order.salad_name,
        quantity: order.salad_amount_gr,
        unit: 'g'
      },
      {
        product_id: order.sauce_sischef_id,
        product_name: order.sauce_name,
        quantity: order.sauce_amount_gr,
        unit: 'g'
      }
    ].filter(item => item.product_id && item.product_name);

    return {
      customer: {
        name: order.customer_name,
        phone: order.customer_phone
      },
      delivery: {
        address: order.delivery_address,
        time: order.delivery_time,
        date: order.order_date
      },
      items,
      observations: `Pedido de ${order.meal_type === 'lunch' ? 'almoço' : 'jantar'}`
    };
  };

  const handleSelectOrder = (order: OrderDetails) => {
    setSelectedOrder(order);
    setPayload(generatePayload(order));
    setResponse(null);
  };

  const handleSendToSisChef = async () => {
    if (!selectedOrder) return;

    setSending(true);
    setResponse(null);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-order-to-sischef`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ order_id: selectedOrder.id })
        }
      );

      const data = await res.json();
      setResponse({ status: res.status, data });

      if (res.ok) {
        toast({
          title: 'Sucesso!',
          description: 'Pedido enviado ao SisChef',
        });
      } else {
        toast({
          title: 'Erro',
          description: data.error || 'Falha ao enviar pedido',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error sending to SisChef:', error);
      setResponse({ error: String(error) });
      toast({
        title: 'Erro',
        description: 'Falha na comunicação com a API',
        variant: 'destructive'
      });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Toaster />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Debug - Pedidos SisChef</h1>
          <p className="text-muted-foreground">Visualize exatamente o que está sendo enviado ao SisChef</p>
        </div>
        <Button onClick={loadRecentOrders} variant="outline">
          Recarregar
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lista de pedidos */}
        <Card>
          <CardHeader>
            <CardTitle>Pedidos Recentes (24h)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {orders.length === 0 ? (
              <p className="text-muted-foreground">Nenhum pedido encontrado</p>
            ) : (
              orders.map((order) => (
                <div
                  key={order.id}
                  className={`p-4 border rounded-lg cursor-pointer hover:bg-accent transition-colors ${
                    selectedOrder?.id === order.id ? 'bg-accent' : ''
                  }`}
                  onClick={() => handleSelectOrder(order)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{order.customer_name}</p>
                      <p className="text-sm text-muted-foreground">{order.customer_phone}</p>
                      <p className="text-sm text-muted-foreground mt-1">{order.delivery_address}</p>
                    </div>
                    <Badge variant={order.status === 'pending' ? 'outline' : 'default'}>
                      {order.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                    <span>{new Date(order.order_date).toLocaleDateString('pt-BR')}</span>
                    <span>•</span>
                    <span>{order.delivery_time}</span>
                    <span>•</span>
                    <span>{order.meal_type === 'lunch' ? 'Almoço' : 'Jantar'}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Detalhes do pedido selecionado */}
        {selectedOrder && payload && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Payload que será enviado ao SisChef</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Cliente */}
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      {payload.customer.name ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      Cliente
                    </h3>
                    <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
{JSON.stringify(payload.customer, null, 2)}
                    </pre>
                  </div>

                  {/* Entrega */}
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      {payload.delivery.address ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      Entrega
                    </h3>
                    <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
{JSON.stringify(payload.delivery, null, 2)}
                    </pre>
                  </div>

                  {/* Itens */}
                  <div>
                    <h3 className="font-semibold mb-2">Itens ({payload.items.length})</h3>
                    <pre className="bg-muted p-3 rounded text-sm overflow-x-auto max-h-64">
{JSON.stringify(payload.items, null, 2)}
                    </pre>
                  </div>

                  {/* Observações */}
                  <div>
                    <h3 className="font-semibold mb-2">Observações</h3>
                    <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
{payload.observations}
                    </pre>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Botão de envio */}
            <Card>
              <CardContent className="pt-6">
                <Button
                  onClick={handleSendToSisChef}
                  disabled={sending}
                  className="w-full"
                  size="lg"
                >
                  {sending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Enviar ao SisChef
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Resposta */}
            {response && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {response.status === 200 ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    Resposta do SisChef
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="bg-muted p-4 rounded text-sm overflow-x-auto">
{JSON.stringify(response, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
