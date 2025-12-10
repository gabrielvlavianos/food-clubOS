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
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { History, Calendar, Search, RefreshCw, Clock, MapPin, Download, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { formatTime } from '@/lib/format-utils';
import * as XLSX from 'xlsx';

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
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
    cancelled: 'Cancelado',
  };

  const deliveryStatusLabels: Record<string, string> = {
    not_started: 'Não iniciado',
    driver_requested: 'Motoboy solicitado',
    in_route: 'Em rota',
    delivered: 'Entregue',
    cancelled: 'Cancelado',
  };

  function toggleSelectAll() {
    if (selectedRecords.size === historyRecords.length) {
      setSelectedRecords(new Set());
    } else {
      setSelectedRecords(new Set(historyRecords.map(r => r.id)));
    }
  }

  function toggleSelectRecord(recordId: string) {
    const newSelected = new Set(selectedRecords);
    if (newSelected.has(recordId)) {
      newSelected.delete(recordId);
    } else {
      newSelected.add(recordId);
    }
    setSelectedRecords(newSelected);
  }

  async function deleteSelectedRecords() {
    setDeleting(true);
    setShowDeleteDialog(false);

    try {
      const idsToDelete = Array.from(selectedRecords);

      const { error } = await supabase
        .from('order_history')
        .delete()
        .in('id', idsToDelete);

      if (error) throw error;

      alert(`${idsToDelete.length} ${idsToDelete.length === 1 ? 'pedido excluído' : 'pedidos excluídos'} com sucesso!`);

      setSelectedRecords(new Set());
      await loadHistory();
    } catch (error) {
      console.error('Error deleting records:', error);
      alert('Erro ao excluir pedidos do histórico');
    } finally {
      setDeleting(false);
    }
  }

  function exportAllToExcel() {
    if (historyRecords.length === 0) {
      alert('Não há registros para exportar');
      return;
    }

    const excelData = historyRecords.map((record) => ({
      'Nome': record.customer_name,
      'Horário': formatTime(record.delivery_time),
      'Horário de Solicitação': formatTime(record.pickup_time),
      'Endereço': record.delivery_address,
      'Proteína': record.protein_name || '-',
      'Quantidade Proteína (g)': record.protein_quantity,
      'Carboidrato': record.carb_name || '-',
      'Quantidade Carboidrato (g)': record.carb_quantity,
      'Legumes': record.vegetable_name || '-',
      'Quantidade Legumes (g)': record.vegetable_quantity,
      'Salada': record.salad_name || '-',
      'Quantidade Salada (g)': record.salad_quantity,
      'Molho': record.sauce_name || '-',
      'Quantidade Molho (g)': record.sauce_quantity,
      'Meta Kcal': Math.round(record.target_kcal),
      'Meta Proteínas (g)': Math.round(record.target_protein),
      'Meta Carboidratos (g)': Math.round(record.target_carbs),
      'Meta Gorduras (g)': Math.round(record.target_fat),
      'Entregue Kcal': Math.round(record.delivered_kcal),
      'Entregue Proteínas (g)': Number(record.delivered_protein.toFixed(1)),
      'Entregue Carboidratos (g)': Number(record.delivered_carbs.toFixed(1)),
      'Entregue Gorduras (g)': Number(record.delivered_fat.toFixed(1)),
      'Status Cozinha': kitchenStatusLabels[record.kitchen_status] || record.kitchen_status,
      'Status Expedição': deliveryStatusLabels[record.delivery_status] || record.delivery_status,
      'Data do Pedido': format(new Date(record.order_date + 'T12:00:00'), 'dd/MM/yyyy'),
      'Turno': record.meal_type === 'lunch' ? 'Almoço' : 'Jantar',
      'Data de Atualização': format(new Date(record.created_at), 'dd/MM/yyyy HH:mm'),
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);

    const columnWidths = [
      { wch: 20 },
      { wch: 12 },
      { wch: 20 },
      { wch: 40 },
      { wch: 25 },
      { wch: 22 },
      { wch: 25 },
      { wch: 25 },
      { wch: 25 },
      { wch: 22 },
      { wch: 25 },
      { wch: 22 },
      { wch: 25 },
      { wch: 22 },
      { wch: 12 },
      { wch: 18 },
      { wch: 22 },
      { wch: 18 },
      { wch: 15 },
      { wch: 22 },
      { wch: 26 },
      { wch: 22 },
      { wch: 18 },
      { wch: 18 },
      { wch: 16 },
      { wch: 12 },
      { wch: 20 },
    ];
    worksheet['!cols'] = columnWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Histórico de Pedidos');

    const fileName = `historico_pedidos_${format(new Date(startDate), 'dd-MM-yyyy')}_a_${format(new Date(endDate), 'dd-MM-yyyy')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  }

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
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button onClick={loadHistory} disabled={loading} className="w-full">
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Buscar
                </Button>
                <Button
                  onClick={() => exportAllToExcel()}
                  disabled={historyRecords.length === 0}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar para Excel
                </Button>
                <Button
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={selectedRecords.size === 0 || deleting}
                  className="w-full bg-red-600 hover:bg-red-700"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {deleting ? 'Excluindo...' : `Excluir Selecionados (${selectedRecords.size})`}
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
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={selectedRecords.size === historyRecords.length && historyRecords.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
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
                    {historyRecords.map((record) => {
                      const isCancelled = record.kitchen_status === 'cancelled' || record.delivery_status === 'cancelled';
                      return (
                      <>
                        <TableRow key={record.id} className={`hover:bg-gray-50 ${isCancelled ? 'bg-red-50/50' : ''}`}>
                          <TableCell>
                            <Checkbox
                              checked={selectedRecords.has(record.id)}
                              onCheckedChange={() => toggleSelectRecord(record.id)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            {format(new Date(record.order_date + 'T12:00:00'), 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell className="font-semibold">
                            {record.customer_name}
                            {isCancelled && (
                              <Badge variant="destructive" className="ml-2 bg-red-500 text-xs">CANCELADO</Badge>
                            )}
                          </TableCell>
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
                            <Badge
                              variant="outline"
                              className={`text-xs ${isCancelled ? 'bg-red-100 text-red-800 border-red-300' : ''}`}
                            >
                              {kitchenStatusLabels[record.kitchen_status] || record.kitchen_status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`text-xs ${isCancelled ? 'bg-red-100 text-red-800 border-red-300' : ''}`}
                            >
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
                            <TableCell colSpan={10} className="bg-gray-50">
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
                    );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Você tem certeza que deseja excluir {selectedRecords.size} {selectedRecords.size === 1 ? 'pedido' : 'pedidos'} do histórico?
                <br /><br />
                <strong className="text-red-600">Esta ação não pode ser desfeita!</strong>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={deleteSelectedRecords} className="bg-red-600 hover:bg-red-700">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}
