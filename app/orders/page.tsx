'use client';

import { useState, useEffect, useRef } from 'react';
import { Navigation } from '@/components/navigation';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Download, Upload } from 'lucide-react';
import type { Customer, DeliverySchedule, Recipe } from '@/types';
import { downloadExcelTemplate, parseExcelFile, exportToExcel, ExcelColumn } from '@/lib/excel-utils';

const ORDER_COLUMNS: ExcelColumn[] = [
  { header: 'Nome do Cliente', key: 'customer_name', example: 'João Silva' },
  { header: 'Data do Pedido', key: 'order_date', example: '2025-11-12' },
  { header: 'Turno', key: 'meal_type', example: 'lunch ou dinner' },
  { header: 'Horário de Entrega', key: 'delivery_time', example: '12:00' },
  { header: 'Endereço de Entrega', key: 'delivery_address', example: 'Rua ABC, 123' },
  { header: 'Precisa de Talheres', key: 'cutlery_needed', example: 'Sim' },
  { header: 'Receita 1', key: 'recipe_1_name', example: 'Frango Grelhado' },
  { header: 'Quantidade 1 (g)', key: 'recipe_1_quantity', example: '150' },
  { header: 'Receita 2', key: 'recipe_2_name', example: 'Arroz Integral' },
  { header: 'Quantidade 2 (g)', key: 'recipe_2_quantity', example: '100' },
  { header: 'Receita 3', key: 'recipe_3_name', example: 'Brócolis' },
  { header: 'Quantidade 3 (g)', key: 'recipe_3_quantity', example: '80' },
  { header: 'Status', key: 'status', example: 'pending' }
];

interface RecipeSelection {
  recipe_id: string;
  category: string;
  quantity_grams: number;
}

export default function OrdersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedShift, setSelectedShift] = useState<'lunch' | 'dinner' | ''>('');
  const [deliverySchedules, setDeliverySchedules] = useState<DeliverySchedule[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<DeliverySchedule | null>(null);
  const [cutleryNeeded, setCutleryNeeded] = useState(false);
  const [recipeSelections, setRecipeSelections] = useState<RecipeSelection[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadCustomers();
    loadRecipes();
    loadOrders();
  }, []);

  useEffect(() => {
    if (selectedCustomerId && selectedDate && selectedShift) {
      loadDeliverySchedule();
    }
  }, [selectedCustomerId, selectedDate, selectedShift]);

  async function loadCustomers() {
    const { data } = await supabase
      .from('customers')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (data) setCustomers(data);
  }

  async function loadRecipes() {
    const { data } = await supabase
      .from('recipes')
      .select('*')
      .order('category, name');

    if (data) setRecipes(data);
  }

  async function loadOrders() {
    const { data } = await supabase
      .from('orders')
      .select(`
        *,
        customer:customers(name),
        order_items(*, recipe:recipes(name))
      `)
      .order('order_date', { ascending: false });

    if (data) setOrders(data);
  }

  async function loadDeliverySchedule() {
    const date = new Date(selectedDate);
    const dayOfWeekMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayOfWeek = dayOfWeekMap[date.getDay()];

    const { data } = await supabase
      .from('delivery_schedules')
      .select('*')
      .eq('customer_id', selectedCustomerId)
      .eq('day_of_week', dayOfWeek)
      .eq('meal_type', selectedShift)
      .maybeSingle();

    setSelectedSchedule(data);
  }

  function addRecipeSelection() {
    setRecipeSelections([
      ...recipeSelections,
      { recipe_id: '', category: '', quantity_grams: 0 }
    ]);
  }

  function removeRecipeSelection(index: number) {
    setRecipeSelections(recipeSelections.filter((_, i) => i !== index));
  }

  function updateRecipeSelection(index: number, field: keyof RecipeSelection, value: string | number) {
    const updated = [...recipeSelections];
    if (field === 'recipe_id') {
      const recipe = recipes.find(r => r.id === value);
      if (recipe) {
        updated[index] = {
          ...updated[index],
          recipe_id: value as string,
          category: recipe.category
        };
      }
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setRecipeSelections(updated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedSchedule) {
      toast({
        title: 'Erro',
        description: 'Cliente não tem horário de entrega configurado para este dia/turno',
        variant: 'destructive',
      });
      return;
    }

    if (recipeSelections.length === 0) {
      toast({
        title: 'Erro',
        description: 'Adicione pelo menos uma receita ao pedido',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id: selectedCustomerId,
          delivery_schedule_id: selectedSchedule.id,
          order_date: selectedDate,
          meal_type: selectedShift as 'lunch' | 'dinner',
          delivery_time: selectedSchedule.delivery_time,
          delivery_address: selectedSchedule.delivery_address,
          cutlery_needed: cutleryNeeded,
          status: 'pending' as 'pending'
        } as any)
        .select()
        .single();

      if (orderError) throw orderError;
      if (!orderData) throw new Error('Order data not returned');

      const order = orderData as any;

      const orderItems = recipeSelections
        .filter(sel => sel.recipe_id && sel.quantity_grams > 0)
        .map(sel => ({
          order_id: order.id,
          recipe_id: sel.recipe_id,
          recipe_category: sel.category as any,
          quantity_grams: sel.quantity_grams
        }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems as any);

      if (itemsError) throw itemsError;

      toast({
        title: 'Pedido criado',
        description: 'Pedido cadastrado com sucesso',
      });

      resetForm();
    } catch (error) {
      console.error('Error creating order:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o pedido',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setSelectedCustomerId('');
    setSelectedDate('');
    setSelectedShift('');
    setSelectedSchedule(null);
    setCutleryNeeded(false);
    setRecipeSelections([]);
  }

  function handleDownloadTemplate() {
    downloadExcelTemplate('modelo-pedidos.xlsx', ORDER_COLUMNS);
    toast({
      title: 'Template baixado',
      description: 'Preencha o arquivo Excel e importe os dados.'
    });
  }

  function handleExportData() {
    const exportData = orders.map(order => {
      const items = order.order_items || [];
      return {
        customer_name: order.customer?.name || '',
        order_date: order.order_date,
        meal_type: order.meal_type,
        delivery_time: order.delivery_time,
        delivery_address: order.delivery_address,
        cutlery_needed: order.cutlery_needed,
        recipe_1_name: items[0]?.recipe?.name || '',
        recipe_1_quantity: items[0]?.quantity_grams || '',
        recipe_2_name: items[1]?.recipe?.name || '',
        recipe_2_quantity: items[1]?.quantity_grams || '',
        recipe_3_name: items[2]?.recipe?.name || '',
        recipe_3_quantity: items[2]?.quantity_grams || '',
        status: order.status
      };
    });

    exportToExcel('pedidos.xlsx', exportData, ORDER_COLUMNS);
    toast({
      title: 'Dados exportados',
      description: `${orders.length} pedidos exportados com sucesso.`
    });
  }

  async function handleImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const data = await parseExcelFile<any>(file, ORDER_COLUMNS);

      let successCount = 0;
      let errorCount = 0;

      for (const row of data) {
        try {
          const customer = customers.find(c => c.name === row.customer_name);
          if (!customer) {
            console.error('Customer not found:', row.customer_name);
            errorCount++;
            continue;
          }

          const date = new Date(row.order_date);
          const dayOfWeekMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
          const dayOfWeek = dayOfWeekMap[date.getDay()];

          const { data: scheduleData } = await supabase
            .from('delivery_schedules')
            .select('*')
            .eq('customer_id', customer.id)
            .eq('day_of_week', dayOfWeek)
            .eq('meal_type', row.meal_type)
            .maybeSingle();

          if (!scheduleData) {
            console.error('Delivery schedule not found for:', row.customer_name, dayOfWeek, row.meal_type);
            errorCount++;
            continue;
          }

          const schedule = scheduleData as any;

          const { data: orderData, error: orderError } = await supabase
            .from('orders')
            .insert({
              customer_id: customer.id,
              delivery_schedule_id: schedule.id,
              order_date: row.order_date,
              meal_type: row.meal_type,
              delivery_time: row.delivery_time || schedule.delivery_time,
              delivery_address: row.delivery_address || schedule.delivery_address,
              cutlery_needed: row.cutlery_needed === 'Sim' || row.cutlery_needed === true,
              status: row.status || 'pending'
            } as any)
            .select()
            .single();

          if (orderError || !orderData) {
            console.error('Error creating order:', orderError);
            errorCount++;
            continue;
          }

          const order = orderData as any;

          const orderItems = [];
          for (let i = 1; i <= 3; i++) {
            const recipeName = row[`recipe_${i}_name`];
            const quantity = row[`recipe_${i}_quantity`];

            if (recipeName && quantity) {
              const recipe = recipes.find(r => r.name === recipeName);
              if (recipe) {
                orderItems.push({
                  order_id: order.id,
                  recipe_id: recipe.id,
                  recipe_category: recipe.category,
                  quantity_grams: parseFloat(quantity)
                });
              }
            }
          }

          if (orderItems.length > 0) {
            const { error: itemsError } = await supabase
              .from('order_items')
              .insert(orderItems as any);

            if (itemsError) {
              console.error('Error inserting order items:', itemsError);
            }
          }

          successCount++;
        } catch (error) {
          console.error('Error processing row:', error);
          errorCount++;
        }
      }

      toast({
        title: 'Importação concluída',
        description: `${successCount} pedidos importados com sucesso. ${errorCount > 0 ? `${errorCount} erros encontrados.` : ''}`
      });

      loadOrders();
    } catch (error) {
      console.error('Error importing file:', error);
      toast({
        title: 'Erro na importação',
        description: 'Não foi possível importar o arquivo. Verifique o formato.',
        variant: 'destructive'
      });
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Cadastro de Pedidos</h1>
            <p className="text-gray-600 mt-1">Crie pedidos para os clientes</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleDownloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Baixar Modelo
            </Button>
            <Button variant="outline" onClick={handleExportData}>
              <Download className="h-4 w-4 mr-2" />
              Exportar Dados
            </Button>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importing}>
              <Upload className="h-4 w-4 mr-2" />
              {importing ? 'Importando...' : 'Importar Excel'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImport}
              className="hidden"
            />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Novo Pedido</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="customer">Cliente *</Label>
                  <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                    <SelectTrigger id="customer">
                      <SelectValue placeholder="Selecione o cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="date">Data *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="shift">Turno *</Label>
                  <Select value={selectedShift} onValueChange={(v) => setSelectedShift(v as 'lunch' | 'dinner')}>
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

              {selectedSchedule && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-medium text-blue-900 mb-2">Informações de Entrega</h3>
                  <p className="text-sm text-blue-800">
                    <strong>Horário:</strong> {selectedSchedule.delivery_time || 'Não definido'}
                  </p>
                  <p className="text-sm text-blue-800">
                    <strong>Endereço:</strong> {selectedSchedule.delivery_address || 'Não definido'}
                  </p>
                </div>
              )}

              {selectedCustomerId && selectedDate && selectedShift && !selectedSchedule && (
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    Este cliente não tem horário de entrega configurado para este dia/turno.
                  </p>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="cutlery"
                  checked={cutleryNeeded}
                  onCheckedChange={(checked) => setCutleryNeeded(checked as boolean)}
                />
                <label htmlFor="cutlery" className="text-sm font-medium">
                  Cliente recebe talheres
                </label>
              </div>

              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-lg">Receitas do Pedido</h3>
                  <Button type="button" onClick={addRecipeSelection} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Receita
                  </Button>
                </div>

                <div className="space-y-3">
                  {recipeSelections.map((selection, index) => (
                    <div key={index} className="flex gap-3 items-end">
                      <div className="flex-1">
                        <Label>Receita</Label>
                        <Select
                          value={selection.recipe_id}
                          onValueChange={(v) => updateRecipeSelection(index, 'recipe_id', v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a receita" />
                          </SelectTrigger>
                          <SelectContent>
                            {recipes.map((recipe) => (
                              <SelectItem key={recipe.id} value={recipe.id}>
                                {recipe.category} - {recipe.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="w-32">
                        <Label>Quantidade (g)</Label>
                        <Input
                          type="number"
                          value={selection.quantity_grams || ''}
                          onChange={(e) => updateRecipeSelection(index, 'quantity_grams', parseFloat(e.target.value) || 0)}
                          placeholder="0"
                        />
                      </div>

                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removeRecipeSelection(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}

                  {recipeSelections.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      Nenhuma receita adicionada. Clique em "Adicionar Receita" para começar.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading || !selectedSchedule}>
                  {loading ? 'Salvando...' : 'Criar Pedido'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
