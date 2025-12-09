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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { History, Calendar, Search, RefreshCw, Clock, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { formatTime } from '@/lib/format-utils';

interface OrderHistoryRecord {
  id: string;
  customer_id: string;
  customer_name: string;
  order_date: string;
  meal_type: string;
  delivery_time: string;
  pickup_time: string;
  delivery_address: string;
  protein_name: string | null;
  protein_quantity: number;
  carb_name: string | null;
  carb_quantity: number;
  vegetable_name: string | null;
  vegetable_quantity: number;
  salad_name: string | null;
  salad_quantity: number;
  sauce_name: string | null;
  sauce_quantity: number;
  target_kcal: number;
  target_protein: number;
  target_carbs: number;
  target_fat: number;
  delivered_kcal: number;
  delivered_protein: number;
  delivered_carbs: number;
  delivered_fat: number;
  kitchen_status: string;
  delivery_status: string;
  created_at: string;
}

export default function OrderHistoryPage() {
  const [historyRecords, setHistoryRecords] = useState<OrderHistoryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMealType, setSelectedMealType] = useState<'all' | 'lunch' | 'dinner'>('all');
  const [customerSearch, setCustomerSearch] = useState('');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  useEffect(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    setStartDate(thirtyDaysAgo.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      loadHistory();
    }
  }, [startDate, endDate, selectedMealType]);

  async function loadHistory() {
    setLoading(true);
    try {
      let query = supabase
        .from('order_history')
        .select('*')
        .gte('order_date', startDate)
        .lte('order_date', endDate)
        .order('order_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (selectedMealType !== 'all') {
        query = query.eq('meal_type', selectedMealType);
      }

      const { data, error } = await query;

      if (error) throw error;

      let filteredData = data || [];

      if (customerSearch.trim()) {
        const searchLower = customerSearch.toLowerCase();
        filteredData = filteredData.filter(record =>
          record.customer_name.toLowerCase().includes(searchLower)
        );
      }

      setHistoryRecords(filteredData as OrderHistoryRecord[]);
    } catch (error) {
      console.error('Error loading history:', error);
      setHistoryRecords([]);
    } finally {
      setLoading(false);
    }
  }

  const kitchenStatusLabels: Record<string, string> = {
    pending: 'Não iniciado',
    preparing: 'Em preparo',
    ready: 'Finalizado',
  };

  const deliveryStatusLabels: Record<string, string> = {
    not_started: 'Não iniciado',
    driver_requested: 'Motoboy solicitado',
    in_route: 'Em rota',
    delivered: 'Entregue',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <History className="h-8 w-8 text-purple-600" />
            <h1 className="text-3xl font-bold text-gray-900">Histórico de Pedidos</h1>
          </div>
          <p className="text-gray-600">Consulte pedidos já executados e salvos no sistema</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Filtros de Busca
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <Label htmlFor="startDate">Data Inicial</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="endDate">Data Final</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="mealType">Turno</Label>
                <Select value={selectedMealType} onValueChange={(value: 'all' | 'lunch' | 'dinner') => setSelectedMealType(value)}>
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
              <div>
                <Label htmlFor="customerSearch">Cliente</Label>
                <Input
                  id="customerSearch"
                  type="text"
                  placeholder="Buscar por nome..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={loadHistory} disabled={loading} className="w-full">
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Buscar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">Carregando histórico...</p>
          </div>
        ) : historyRecords.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <History className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 text-lg">Nenhum pedido encontrado</p>
              <p className="text-gray-500 text-sm mt-2">
                Ajuste os filtros ou salve pedidos na página de Expedição
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {historyRecords.length} {historyRecords.length === 1 ? 'Pedido Encontrado' : 'Pedidos Encontrados'}
                </CardTitle>
                <Badge variant="outline">
                  <Calendar className="h-3 w-3 mr-1" />
                  {format(new Date(startDate), 'dd/MM/yyyy')} - {format(new Date(endDate), 'dd/MM/yyyy')}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Turno</TableHead>
                      <TableHead>Horário</TableHead>
                      <TableHead>Proteína</TableHead>
                      <TableHead>Carboidrato</TableHead>
                      <TableHead>Status Cozinha</TableHead>
                      <TableHead>Status Entrega</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historyRecords.map((record) => (
                      <>
                        <TableRow key={record.id} className="hover:bg-gray-50">
                          <TableCell className="font-medium">
                            {format(new Date(record.order_date + 'T12:00:00'), 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell className="font-semibold">{record.customer_name}</TableCell>
                          <TableCell>
                            <Badge variant={record.meal_type === 'lunch' ? 'default' : 'secondary'}>
                              {record.meal_type === 'lunch' ? 'Almoço' : 'Jantar'}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-semibold">{formatTime(record.delivery_time)}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div className="font-medium">{record.protein_name || '-'}</div>
                              <div className="text-gray-600">{record.protein_quantity}g</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div className="font-medium">{record.carb_name || '-'}</div>
                              <div className="text-gray-600">{record.carb_quantity}g</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {kitchenStatusLabels[record.kitchen_status] || record.kitchen_status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {deliveryStatusLabels[record.delivery_status] || record.delivery_status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setExpandedRow(expandedRow === record.id ? null : record.id)}
                            >
                              {expandedRow === record.id ? 'Ocultar' : 'Detalhes'}
                            </Button>
                          </TableCell>
                        </TableRow>
                        {expandedRow === record.id && (
                          <TableRow>
                            <TableCell colSpan={9} className="bg-gray-50">
                              <div className="p-4 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                      <MapPin className="h-4 w-4" />
                                      Informações de Entrega
                                    </h4>
                                    <div className="space-y-1 text-sm">
                                      <p><span className="font-medium">Endereço:</span> {record.delivery_address}</p>
                                      <p><span className="font-medium">Horário de entrega:</span> {formatTime(record.delivery_time)}</p>
                                      <p><span className="font-medium">Horário de solicitação:</span> {formatTime(record.pickup_time)}</p>
                                    </div>
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-sm mb-2">Quantidades Entregues</h4>
                                    <div className="space-y-1 text-sm">
                                      {record.protein_name && <p><span className="font-medium">Proteína:</span> {record.protein_name} - {record.protein_quantity}g</p>}
                                      {record.carb_name && <p><span className="font-medium">Carboidrato:</span> {record.carb_name} - {record.carb_quantity}g</p>}
                                      {record.vegetable_name && <p><span className="font-medium">Legumes:</span> {record.vegetable_name} - {record.vegetable_quantity}g</p>}
                                      {record.salad_name && <p><span className="font-medium">Salada:</span> {record.salad_name} - {record.salad_quantity}g</p>}
                                      {record.sauce_name && <p><span className="font-medium">Molho:</span> {record.sauce_name} - {record.sauce_quantity}g</p>}
                                    </div>
                                  </div>
                                </div>
                                <div className="border-t pt-4">
                                  <h4 className="font-semibold text-sm mb-3">Macronutrientes</h4>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="text-center p-3 bg-white rounded-lg border">
                                      <div className="text-xs text-gray-600 mb-1">Calorias</div>
                                      <div className="text-sm">
                                        <span className="font-bold text-gray-900">{Math.round(record.delivered_kcal)}</span>
                                        <span className="text-gray-500"> / {Math.round(record.target_kcal)}</span>
                                      </div>
                                    </div>
                                    <div className="text-center p-3 bg-white rounded-lg border">
                                      <div className="text-xs text-gray-600 mb-1">Proteína (g)</div>
                                      <div className="text-sm">
                                        <span className="font-bold text-gray-900">{record.delivered_protein.toFixed(1)}</span>
                                        <span className="text-gray-500"> / {Math.round(record.target_protein)}</span>
                                      </div>
                                    </div>
                                    <div className="text-center p-3 bg-white rounded-lg border">
                                      <div className="text-xs text-gray-600 mb-1">Carboidrato (g)</div>
                                      <div className="text-sm">
                                        <span className="font-bold text-gray-900">{record.delivered_carbs.toFixed(1)}</span>
                                        <span className="text-gray-500"> / {Math.round(record.target_carbs)}</span>
                                      </div>
                                    </div>
                                    <div className="text-center p-3 bg-white rounded-lg border">
                                      <div className="text-xs text-gray-600 mb-1">Gordura (g)</div>
                                      <div className="text-sm">
                                        <span className="font-bold text-gray-900">{record.delivered_fat.toFixed(1)}</span>
                                        <span className="text-gray-500"> / {Math.round(record.target_fat)}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <div className="text-xs text-gray-500 border-t pt-2">
                                  Salvo em: {format(new Date(record.created_at), 'dd/MM/yyyy \'às\' HH:mm')}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
