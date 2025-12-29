'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, CheckCircle, XCircle, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TestOrder {
  id: string;
  order_date: string;
  meal_type: string;
  delivery_address: string;
  delivery_time: string;
  status: string;
  customer_name: string;
  phone: string;
  carb_name: string;
  carb_sischef_id: string;
  carb_amount_gr: number;
  protein_name: string;
  protein_sischef_id: string;
  protein_amount_gr: number;
}

interface TestResult {
  order_id: string;
  success: boolean;
  payload?: any;
  response?: any;
  error?: string;
}

export default function SischefTestingPage() {
  const [orders, setOrders] = useState<TestOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingOrderId, setTestingOrderId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [viewingPayload, setViewingPayload] = useState<any>(null);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_date,
          meal_type,
          delivery_address,
          delivery_time,
          status,
          customer_id,
          carb_recipe_id,
          protein_recipe_id,
          carb_amount_gr,
          protein_amount_gr,
          customers!inner (
            name,
            phone
          ),
          carb_recipe:recipes!carb_recipe_id (
            name,
            sischef_external_id
          ),
          protein_recipe:recipes!protein_recipe_id (
            name,
            sischef_external_id
          )
        `)
        .gte('order_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('order_date', { ascending: false })
        .order('meal_type')
        .limit(10);

      if (error) throw error;

      const formattedOrders = data?.map((order: any) => ({
        id: order.id,
        order_date: order.order_date,
        meal_type: order.meal_type,
        delivery_address: order.delivery_address,
        delivery_time: order.delivery_time,
        status: order.status,
        customer_name: order.customers.name,
        phone: order.customers.phone,
        carb_name: order.carb_recipe?.name || 'N/A',
        carb_sischef_id: order.carb_recipe?.sischef_external_id || null,
        carb_amount_gr: order.carb_amount_gr,
        protein_name: order.protein_recipe?.name || 'N/A',
        protein_sischef_id: order.protein_recipe?.sischef_external_id || null,
        protein_amount_gr: order.protein_amount_gr,
      })) || [];

      setOrders(formattedOrders);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const testSendToSischef = async (orderId: string) => {
    setTestingOrderId(orderId);
    try {
      const apiUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-order-to-sischef`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ order_id: orderId }),
      });

      const result = await response.json();

      setTestResults(prev => ({
        ...prev,
        [orderId]: {
          order_id: orderId,
          success: response.ok,
          payload: result.payload,
          response: result.sischef_response || result,
          error: result.error || null,
        },
      }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [orderId]: {
          order_id: orderId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      }));
    } finally {
      setTestingOrderId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getMealTypeLabel = (mealType: string) => {
    return mealType === 'lunch' ? 'Almoço' : 'Jantar';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Testes de Integração - SisChef</h1>
        <p className="text-muted-foreground">
          Teste o envio de pedidos para o SisChef e visualize os payloads e respostas
        </p>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nenhum pedido disponível para teste
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const result = testResults[order.id];
            const hasSischefIds = order.carb_sischef_id && order.protein_sischef_id;

            return (
              <Card key={order.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-lg">
                        {order.customer_name}
                      </CardTitle>
                      <Badge variant="outline">
                        {getMealTypeLabel(order.meal_type)}
                      </Badge>
                      <Badge variant="secondary">
                        {formatDate(order.order_date)}
                      </Badge>
                      {!hasSischefIds && (
                        <Badge variant="destructive">
                          IDs SisChef faltando
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {result && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setViewingPayload(result)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver Detalhes
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={() => testSendToSischef(order.id)}
                        disabled={testingOrderId === order.id || !hasSischefIds}
                      >
                        {testingOrderId === order.id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            Enviando...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-1" />
                            Testar Envio
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  <CardDescription>
                    {order.delivery_address} - {order.delivery_time}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm font-medium mb-1">Carboidrato</p>
                      <p className="text-sm text-muted-foreground">
                        {order.carb_name} ({order.carb_amount_gr}g)
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ID SisChef: {order.carb_sischef_id || 'Não vinculado'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-1">Proteína</p>
                      <p className="text-sm text-muted-foreground">
                        {order.protein_name} ({order.protein_amount_gr}g)
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ID SisChef: {order.protein_sischef_id || 'Não vinculado'}
                      </p>
                    </div>
                  </div>

                  {result && (
                    <div className={`p-4 rounded-lg border ${
                      result.success
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        {result.success ? (
                          <>
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            <span className="font-medium text-green-900">
                              Enviado com sucesso!
                            </span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-5 w-5 text-red-600" />
                            <span className="font-medium text-red-900">
                              Erro no envio
                            </span>
                          </>
                        )}
                      </div>
                      {result.error && (
                        <p className="text-sm text-red-800">{result.error}</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!viewingPayload} onOpenChange={() => setViewingPayload(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Detalhes da Requisição</DialogTitle>
            <DialogDescription>
              Payload enviado e resposta do SisChef
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh]">
            {viewingPayload && (
              <div className="space-y-4">
                {viewingPayload.success && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-green-900">
                        Enviado com sucesso!
                      </span>
                    </div>
                  </div>
                )}

                {viewingPayload.error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <XCircle className="h-5 w-5 text-red-600" />
                      <span className="font-medium text-red-900">Erro</span>
                    </div>
                    <p className="text-sm text-red-800">{viewingPayload.error}</p>
                  </div>
                )}

                <div>
                  <h3 className="font-semibold mb-2">Payload Enviado:</h3>
                  <pre className="bg-slate-50 p-4 rounded-lg overflow-x-auto text-xs">
                    {JSON.stringify(viewingPayload.payload, null, 2)}
                  </pre>
                </div>

                {viewingPayload.response && (
                  <div>
                    <h3 className="font-semibold mb-2">Resposta do SisChef:</h3>
                    <pre className="bg-slate-50 p-4 rounded-lg overflow-x-auto text-xs">
                      {JSON.stringify(viewingPayload.response, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
