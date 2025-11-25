'use client';

import { useState, useEffect } from 'react';
import { Navigation } from '@/components/navigation';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Save, RefreshCw, Upload, Download, Sheet } from 'lucide-react';
import { toast } from 'sonner';

interface GlobalSettings {
  vegetables_amount: number;
  salad_amount: number;
  salad_dressing_amount: number;
}

interface SheetsSettings {
  spreadsheet_id: string;
  sheet_name: string;
  api_key: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<GlobalSettings>({
    vegetables_amount: 100,
    salad_amount: 100,
    salad_dressing_amount: 30,
  });
  const [sheetsSettings, setSheetsSettings] = useState<SheetsSettings>({
    spreadsheet_id: '',
    sheet_name: '',
    api_key: '',
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sheetsLoading, setSheetsLoading] = useState(false);
  const [sheetsSaving, setSheetsSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    loadSettings();
    loadSheetsSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('global_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          vegetables_amount: (data as any).vegetables_amount,
          salad_amount: (data as any).salad_amount,
          salad_dressing_amount: (data as any).salad_dressing_amount,
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  }

  async function loadSheetsSettings() {
    setSheetsLoading(true);
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', ['sheets_spreadsheet_id', 'sheets_sheet_name', 'sheets_api_key']);

      if (error) throw error;

      if (data) {
        const settingsMap = Object.fromEntries(
          data.map((s: any) => [s.key.replace('sheets_', ''), s.value])
        );
        setSheetsSettings({
          spreadsheet_id: settingsMap.spreadsheet_id || '',
          sheet_name: settingsMap.sheet_name || '',
          api_key: settingsMap.api_key || '',
        });
      }
    } catch (error) {
      console.error('Error loading sheets settings:', error);
      toast.error('Erro ao carregar configurações do Sheets');
    } finally {
      setSheetsLoading(false);
    }
  }

  async function saveSettings() {
    if (settings.vegetables_amount <= 0 || settings.salad_amount <= 0 || settings.salad_dressing_amount <= 0) {
      toast.error('Todos os valores devem ser maiores que zero');
      return;
    }

    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from('global_settings')
        .update({
          vegetables_amount: settings.vegetables_amount,
          salad_amount: settings.salad_amount,
          salad_dressing_amount: settings.salad_dressing_amount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', 1);

      if (error) throw error;

      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  }

  function handleChange(field: keyof GlobalSettings, value: string) {
    const numValue = parseInt(value) || 0;
    setSettings(prev => ({ ...prev, [field]: numValue }));
  }

  async function saveSheetsSettings() {
    if (!sheetsSettings.spreadsheet_id || !sheetsSettings.sheet_name || !sheetsSettings.api_key) {
      toast.error('Preencha todos os campos');
      return;
    }

    setSheetsSaving(true);
    try {
      const updates = [
        { key: 'sheets_spreadsheet_id', value: sheetsSettings.spreadsheet_id },
        { key: 'sheets_sheet_name', value: sheetsSettings.sheet_name },
        { key: 'sheets_api_key', value: sheetsSettings.api_key },
      ];

      for (const update of updates) {
        const { error } = await (supabase as any)
          .from('settings')
          .update({ value: update.value, updated_at: new Date().toISOString() })
          .eq('key', update.key);

        if (error) throw error;
      }

      toast.success('Configurações do Sheets salvas com sucesso!');
    } catch (error) {
      console.error('Error saving sheets settings:', error);
      toast.error('Erro ao salvar configurações do Sheets');
    } finally {
      setSheetsSaving(false);
    }
  }

  async function testExport(mealType: 'lunch' | 'dinner') {
    setExporting(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

      const response = await fetch(`${supabaseUrl}/functions/v1/export-to-sheets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          date: today,
          mealType,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.error || 'Erro ao exportar');
      }
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Erro ao exportar para Sheets');
    } finally {
      setExporting(false);
    }
  }

  async function testImport(mealType: 'lunch' | 'dinner') {
    setImporting(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

      const response = await fetch(`${supabaseUrl}/functions/v1/import-from-sheets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          date: today,
          mealType,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`${result.message} - Atualizados: ${result.updated}, Cancelados: ${result.cancelled}`);
      } else {
        toast.error(result.error || 'Erro ao importar');
      }
    } catch (error) {
      console.error('Error importing:', error);
      toast.error('Erro ao importar do Sheets');
    } finally {
      setImporting(false);
    }
  }

  function handleSheetsChange(field: keyof SheetsSettings, value: string) {
    setSheetsSettings(prev => ({ ...prev, [field]: value }));
  }

  async function syncOrders(mealType: 'lunch' | 'dinner') {
    setExporting(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      const { data: apiKeyData, error: apiKeyError } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'botconversa_api_key')
        .maybeSingle();

      if (apiKeyError || !apiKeyData) {
        toast.error('API key do Bot Conversa não configurada');
        return;
      }

      const botconversaApiKey = (apiKeyData as any).value;

      const targetDate = new Date(today);
      const dayOfWeek = targetDate.getDay() === 0 ? 7 : targetDate.getDay();

      const { data: deliverySchedules, error: schedulesError } = await supabase
        .from('delivery_schedules')
        .select(`
          id,
          customer_id,
          day_of_week,
          meal_type,
          delivery_address,
          delivery_time,
          customers!inner (
            id,
            name,
            phone,
            is_active
          )
        `)
        .eq('is_active', true)
        .eq('day_of_week', dayOfWeek)
        .eq('meal_type', mealType)
        .eq('customers.is_active', true);

      if (schedulesError) {
        toast.error('Erro ao buscar agendamentos');
        console.error(schedulesError);
        return;
      }

      if (!deliverySchedules || deliverySchedules.length === 0) {
        toast.info('Nenhum pedido encontrado para este dia e turno');
        return;
      }

      const { data: menuData } = await supabase
        .from('monthly_menu')
        .select(`
          menu_date,
          meal_type,
          protein:recipes!monthly_menu_protein_recipe_id_fkey(name),
          carb:recipes!monthly_menu_carb_recipe_id_fkey(name),
          vegetable:recipes!monthly_menu_vegetable_recipe_id_fkey(name),
          salad:recipes!monthly_menu_salad_recipe_id_fkey(name),
          sauce:recipes!monthly_menu_sauce_recipe_id_fkey(name)
        `)
        .eq('menu_date', today)
        .eq('meal_type', mealType)
        .maybeSingle();

      const orders = deliverySchedules.map((schedule: any) => {
        const customer = Array.isArray(schedule.customers) ? schedule.customers[0] : schedule.customers;
        const menu = menuData as any;
        return {
          customer_id: customer.id,
          customer_name: customer.name,
          phone: customer.phone,
          delivery_address: schedule.delivery_address,
          delivery_time: schedule.delivery_time,
          meal_type: schedule.meal_type,
          protein_name: menu?.protein?.name || '',
          carb_name: menu?.carb?.name || '',
          vegetable_name: menu?.vegetable?.name || '',
          salad_name: menu?.salad?.name || '',
          sauce_name: menu?.sauce?.name || '',
        };
      });

      const customFieldsResponse = await fetch('https://api.botconversa.com.br/custom-fields/', {
        method: 'GET',
        headers: {
          'API-KEY': botconversaApiKey,
        },
      });

      if (!customFieldsResponse.ok) {
        toast.error('Erro ao buscar custom fields do Bot Conversa');
        return;
      }

      const customFields = await customFieldsResponse.json();
      const fieldMapping: Record<string, string> = {};
      const requiredFields = ['Nome', 'Endereço', 'Horário do Pedido', 'Proteina', 'Carboidrato', 'Legumes', 'Salada', 'Molho Salada', 'Refeição'];

      for (const field of customFields) {
        if (requiredFields.includes(field.name)) {
          fieldMapping[field.name] = field.id;
        }
      }

      const missingFields = requiredFields.filter(name => !fieldMapping[name]);
      if (missingFields.length > 0) {
        toast.error(`Custom fields não encontrados: ${missingFields.join(', ')}`);
        return;
      }

      const results = [];
      let successCount = 0;

      for (const order of orders) {
        if (!order.phone) {
          results.push({ customer: order.customer_name, success: false, error: 'Sem telefone' });
          continue;
        }

        try {
          const searchResponse = await fetch(
            `https://api.botconversa.com.br/subscribers/?phone=${encodeURIComponent(order.phone)}`,
            {
              method: 'GET',
              headers: { 'API-KEY': botconversaApiKey },
            }
          );

          let subscriberId: string;

          if (searchResponse.ok) {
            const subscribers = await searchResponse.json();
            if (subscribers && subscribers.length > 0) {
              subscriberId = subscribers[0].id;
            } else {
              const createResponse = await fetch('https://api.botconversa.com.br/subscribers/', {
                method: 'POST',
                headers: {
                  'API-KEY': botconversaApiKey,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  phone: order.phone,
                  name: order.customer_name,
                }),
              });

              if (!createResponse.ok) {
                results.push({ customer: order.customer_name, success: false, error: 'Erro ao criar subscriber' });
                continue;
              }

              const newSubscriber = await createResponse.json();
              subscriberId = newSubscriber.id;
            }
          } else {
            results.push({ customer: order.customer_name, success: false, error: 'Erro ao buscar subscriber' });
            continue;
          }

          const customFieldUpdates = [
            { field_id: fieldMapping['Nome'], value: order.customer_name },
            { field_id: fieldMapping['Endereço'], value: order.delivery_address || '' },
            { field_id: fieldMapping['Horário do Pedido'], value: order.delivery_time || '' },
            { field_id: fieldMapping['Proteina'], value: order.protein_name },
            { field_id: fieldMapping['Carboidrato'], value: order.carb_name },
            { field_id: fieldMapping['Legumes'], value: order.vegetable_name },
            { field_id: fieldMapping['Salada'], value: order.salad_name },
            { field_id: fieldMapping['Molho Salada'], value: order.sauce_name },
            { field_id: fieldMapping['Refeição'], value: mealType },
          ];

          let allUpdated = true;
          for (const update of customFieldUpdates) {
            const updateResponse = await fetch(
              `https://api.botconversa.com.br/subscribers/${subscriberId}/custom-fields/${update.field_id}/`,
              {
                method: 'PUT',
                headers: {
                  'API-KEY': botconversaApiKey,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ value: update.value }),
              }
            );

            if (!updateResponse.ok) {
              allUpdated = false;
              break;
            }
          }

          if (allUpdated) {
            successCount++;
            results.push({ customer: order.customer_name, success: true });
          } else {
            results.push({ customer: order.customer_name, success: false, error: 'Erro ao atualizar campos' });
          }
        } catch (err) {
          results.push({ customer: order.customer_name, success: false, error: 'Erro na requisição' });
        }
      }

      toast.success(`Sincronização concluída! ${successCount}/${orders.length} pedidos sincronizados`);
      console.log('Resultados:', results);
    } catch (error) {
      console.error('Error syncing:', error);
      toast.error('Erro ao sincronizar com Bot Conversa');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="h-8 w-8 text-slate-600" />
            <h1 className="text-3xl font-bold text-gray-900">Configurações</h1>
          </div>
          <p className="text-gray-600">Configure as quantidades padrão e integração com Google Sheets</p>
        </div>

        <Tabs defaultValue="amounts" className="max-w-4xl">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="amounts">Quantidades Padrão</TabsTrigger>
            <TabsTrigger value="botconversa">Bot Conversa</TabsTrigger>
            <TabsTrigger value="sheets">
              <Sheet className="h-4 w-4 mr-2" />
              Google Sheets
            </TabsTrigger>
          </TabsList>

          <TabsContent value="amounts">
            {loading ? (
              <Card>
                <CardContent className="text-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">Carregando configurações...</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
              <CardHeader>
                <CardTitle>Quantidades Padrão</CardTitle>
                <CardDescription>
                  Estas quantidades serão usadas nos cálculos de todas as refeições.
                  Os valores são em gramas.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="vegetables">
                      Legumes (gramas)
                    </Label>
                    <Input
                      id="vegetables"
                      type="number"
                      min="0"
                      step="10"
                      value={settings.vegetables_amount}
                      onChange={(e) => handleChange('vegetables_amount', e.target.value)}
                      className="text-lg font-semibold"
                    />
                    <p className="text-xs text-gray-500">
                      Quantidade padrão de legumes por refeição
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="salad">
                      Salada (gramas)
                    </Label>
                    <Input
                      id="salad"
                      type="number"
                      min="0"
                      step="10"
                      value={settings.salad_amount}
                      onChange={(e) => handleChange('salad_amount', e.target.value)}
                      className="text-lg font-semibold"
                    />
                    <p className="text-xs text-gray-500">
                      Quantidade padrão de salada por refeição
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="dressing">
                      Molho Salada (gramas)
                    </Label>
                    <Input
                      id="dressing"
                      type="number"
                      min="0"
                      step="10"
                      value={settings.salad_dressing_amount}
                      onChange={(e) => handleChange('salad_dressing_amount', e.target.value)}
                      className="text-lg font-semibold"
                    />
                    <p className="text-xs text-gray-500">
                      Quantidade padrão de molho de salada por refeição
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={saveSettings}
                    disabled={saving}
                    className="flex-1"
                    size="lg"
                  >
                    {saving ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Salvar Configurações
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={loadSettings}
                    variant="outline"
                    disabled={loading || saving}
                    size="lg"
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>💡 Dica:</strong> As alterações serão aplicadas automaticamente nos cálculos da aba Cozinha.
                    Use múltiplos de 10g para facilitar a pesagem.
                  </p>
                </div>
              </CardContent>
            </Card>
            )}
          </TabsContent>

          <TabsContent value="botconversa">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Sincronizar Pedidos com Bot Conversa</CardTitle>
                  <CardDescription>
                    Envia os pedidos do dia para o Bot Conversa atualizar os custom fields dos subscribers
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-900 mb-3">
                      <strong>Como funciona:</strong>
                    </p>
                    <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                      <li>Clique em "Sincronizar Almoço" ou "Sincronizar Jantar"</li>
                      <li>O sistema busca todos os clientes que têm pedido para hoje</li>
                      <li>Para cada cliente, atualiza os custom fields no Bot Conversa com:
                        <ul className="ml-6 mt-1 space-y-1 list-disc list-inside">
                          <li>Nome, Endereço e Horário do Pedido</li>
                          <li>Itens do cardápio: Proteína, Carboidrato, Legumes, Salada e Molho</li>
                          <li>Tipo de refeição (almoço ou jantar)</li>
                        </ul>
                      </li>
                      <li>Depois você pode usar esses dados no fluxo do bot!</li>
                    </ol>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button
                      onClick={() => syncOrders('lunch')}
                      disabled={exporting}
                      size="lg"
                      className="h-20"
                    >
                      {exporting ? (
                        <>
                          <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                          Sincronizando...
                        </>
                      ) : (
                        <>
                          <Upload className="h-5 w-5 mr-2" />
                          Sincronizar Almoço
                        </>
                      )}
                    </Button>

                    <Button
                      onClick={() => syncOrders('dinner')}
                      disabled={exporting}
                      size="lg"
                      className="h-20"
                    >
                      {exporting ? (
                        <>
                          <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                          Sincronizando...
                        </>
                      ) : (
                        <>
                          <Upload className="h-5 w-5 mr-2" />
                          Sincronizar Jantar
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-900">
                      <strong>⚠️ Atenção:</strong> Certifique-se de que:
                    </p>
                    <ul className="text-sm text-yellow-800 mt-2 space-y-1 list-disc list-inside">
                      <li>A API key do Bot Conversa está configurada no banco de dados</li>
                      <li>Os custom fields estão criados no Bot Conversa com os nomes corretos</li>
                      <li>Os clientes têm telefone cadastrado</li>
                      <li>Existe um cardápio configurado para o dia de hoje</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="sheets">
            {sheetsLoading ? (
              <Card>
                <CardContent className="text-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">Carregando configurações...</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Configuração do Google Sheets</CardTitle>
                    <CardDescription>
                      Configure a integração com o Google Sheets para sincronização automática com o Botconversa
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="grid gap-2">
                        <Label htmlFor="spreadsheet_id">
                          ID da Planilha
                        </Label>
                        <Input
                          id="spreadsheet_id"
                          type="text"
                          value={sheetsSettings.spreadsheet_id}
                          onChange={(e) => handleSheetsChange('spreadsheet_id', e.target.value)}
                          placeholder="1WRGQYiyH9FuNJ-APBtZOj_oifKv6RLEwN-XaBi_S7ro"
                        />
                        <p className="text-xs text-gray-500">
                          Encontre na URL da planilha: docs.google.com/spreadsheets/d/[ID_AQUI]/edit
                        </p>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="sheet_name">
                          Nome da Aba
                        </Label>
                        <Input
                          id="sheet_name"
                          type="text"
                          value={sheetsSettings.sheet_name}
                          onChange={(e) => handleSheetsChange('sheet_name', e.target.value)}
                          placeholder="Pedidos Diários"
                        />
                        <p className="text-xs text-gray-500">
                          Nome da aba onde os dados serão sincronizados
                        </p>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="api_key">
                          API Key do Google Cloud
                        </Label>
                        <Input
                          id="api_key"
                          type="password"
                          value={sheetsSettings.api_key}
                          onChange={(e) => handleSheetsChange('api_key', e.target.value)}
                          placeholder="AIzaSy..."
                        />
                        <p className="text-xs text-gray-500">
                          Sua chave de API do Google Cloud Console
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        onClick={saveSheetsSettings}
                        disabled={sheetsSaving}
                        className="flex-1"
                      >
                        {sheetsSaving ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Salvando...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Salvar Configurações
                          </>
                        )}
                      </Button>

                      <Button
                        onClick={loadSheetsSettings}
                        variant="outline"
                        disabled={sheetsLoading || sheetsSaving}
                      >
                        <RefreshCw className={`h-4 w-4 ${sheetsLoading ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>URLs para Configurar no Botconversa</CardTitle>
                    <CardDescription>
                      Use estas URLs para configurar a integração no Botconversa
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                        <h3 className="font-semibold text-sm mb-2">1. Buscar Pedidos (GET)</h3>
                        <p className="text-xs text-gray-600 mb-3">
                          O Botconversa usa esta URL para pegar a lista de pedidos
                        </p>
                        <div className="bg-white border rounded p-3 font-mono text-xs break-all">
                          {process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/get-orders?date=YYYY-MM-DD&mealType=lunch
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          • date: Data no formato YYYY-MM-DD (ex: 2025-11-23)<br/>
                          • mealType: "lunch" para almoço ou "dinner" para jantar
                        </p>
                      </div>

                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                        <h3 className="font-semibold text-sm mb-2">2. Atualizar Pedido (POST)</h3>
                        <p className="text-xs text-gray-600 mb-3">
                          O Botconversa usa esta URL para enviar as respostas dos clientes
                        </p>
                        <div className="bg-white border rounded p-3 font-mono text-xs break-all">
                          {process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/update-order
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          Formato do JSON (escolha uma opção):<br/>
                          <span className="font-mono bg-white px-1">
                            {`{"orderId": "xxx", "novoEndereco": "Novo endereço", "novoHorario": "14:00"}`}
                          </span><br/>
                          OU para cancelar:<br/>
                          <span className="font-mono bg-white px-1">
                            {`{"orderId": "xxx", "cancelar": true}`}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-sm text-green-900">
                        <strong>Como funciona:</strong><br/>
                        1. O Botconversa chama a API para buscar os pedidos do dia<br/>
                        2. Envia mensagens no WhatsApp perguntando sobre mudanças<br/>
                        3. Quando o cliente responde, o Botconversa atualiza usando a segunda API<br/>
                        4. Tudo automático, sem precisar mexer no Google Sheets manualmente!
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
