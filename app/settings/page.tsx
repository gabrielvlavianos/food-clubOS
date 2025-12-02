'use client';

import { useState, useEffect } from 'react';
import { Navigation } from '@/components/navigation';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Save, RefreshCw, Upload, Download, Sheet, FileDown } from 'lucide-react';
import { toast } from 'sonner';
import { MacroCalculationSettings } from '@/components/settings/macro-calculation-settings';

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

interface GoogleMapsSettings {
  api_key: string;
}

interface DeliverySettings {
  kitchen_address: string;
  driver_prep_time_minutes: number;
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
  const [googleMapsSettings, setGoogleMapsSettings] = useState<GoogleMapsSettings>({
    api_key: '',
  });
  const [deliverySettings, setDeliverySettings] = useState<DeliverySettings>({
    kitchen_address: 'Rua Clodomiro Amazonas, 134',
    driver_prep_time_minutes: 10,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sheetsLoading, setSheetsLoading] = useState(false);
  const [sheetsSaving, setSheetsSaving] = useState(false);
  const [mapsLoading, setMapsLoading] = useState(false);
  const [mapsSaving, setMapsSaving] = useState(false);
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [deliverySaving, setDeliverySaving] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importingLunch, setImportingLunch] = useState(false);
  const [importingDinner, setImportingDinner] = useState(false);

  useEffect(() => {
    loadSettings();
    loadSheetsSettings();
    loadGoogleMapsSettings();
    loadDeliverySettings();
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

  async function exportTodayToSheets() {
    setExporting(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

      const lunchResponse = await fetch(`${supabaseUrl}/functions/v1/export-orders-to-sheets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          date: today,
          mealType: 'lunch',
        }),
      });

      const lunchResult = await lunchResponse.json();

      const dinnerResponse = await fetch(`${supabaseUrl}/functions/v1/export-orders-to-sheets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          date: today,
          mealType: 'dinner',
        }),
      });

      const dinnerResult = await dinnerResponse.json();

      if (lunchResult.success && dinnerResult.success) {
        toast.success(`Exportado com sucesso! Almoço: ${lunchResult.totalRows} pedidos, Jantar: ${dinnerResult.totalRows} pedidos`);
      } else {
        const errors = [];
        if (!lunchResult.success) errors.push(`Almoço: ${lunchResult.error}`);
        if (!dinnerResult.success) errors.push(`Jantar: ${dinnerResult.error}`);
        toast.error(errors.join(' | '));
      }
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Erro ao exportar para Sheets');
    } finally {
      setExporting(false);
    }
  }

  async function importLunchFromSheets() {
    setImportingLunch(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

      console.log('=== IMPORT LUNCH ===');
      console.log('Date:', today);
      console.log('URL:', `${supabaseUrl}/functions/v1/import-orders-from-sheets`);

      const response = await fetch(`${supabaseUrl}/functions/v1/import-orders-from-sheets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          date: today,
          mealType: 'lunch',
        }),
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      const result = await response.json();
      console.log('Result:', JSON.stringify(result, null, 2));

      if (result.success) {
        toast.success(`Almoço: ${result.updatedCount} pedidos atualizados, ${result.cancelledCount} cancelados`);
        if (result.debug) {
          console.log('=== DEBUG INFO ===');
          result.debug.forEach((item: any, index: number) => {
            console.log(`${index + 1}.`, item);
          });
        }
      } else {
        toast.error(`Erro ao importar almoço: ${result.error}`);
        console.error('Import failed:', result);
      }
    } catch (error) {
      console.error('Error importing lunch:', error);
      toast.error('Erro ao importar dados do almoço');
    } finally {
      setImportingLunch(false);
    }
  }

  async function importDinnerFromSheets() {
    setImportingDinner(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

      const response = await fetch(`${supabaseUrl}/functions/v1/import-orders-from-sheets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          date: today,
          mealType: 'dinner',
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`Jantar: ${result.updatedCount} pedidos atualizados, ${result.cancelledCount} cancelados`);
      } else {
        toast.error(`Erro ao importar jantar: ${result.error}`);
      }
    } catch (error) {
      console.error('Error importing dinner:', error);
      toast.error('Erro ao importar dados do jantar');
    } finally {
      setImportingDinner(false);
    }
  }


  function handleSheetsChange(field: keyof SheetsSettings, value: string) {
    setSheetsSettings(prev => ({ ...prev, [field]: value }));
  }

  async function loadGoogleMapsSettings() {
    setMapsLoading(true);
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('key, value')
        .eq('key', 'google_maps_api_key')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setGoogleMapsSettings({
          api_key: (data as any).value || '',
        });
      }
    } catch (error) {
      console.error('Error loading Google Maps settings:', error);
      toast.error('Erro ao carregar configurações do Google Maps');
    } finally {
      setMapsLoading(false);
    }
  }

  async function saveGoogleMapsSettings() {
    if (!googleMapsSettings.api_key) {
      toast.error('Preencha a API Key do Google Maps');
      return;
    }

    setMapsSaving(true);
    try {
      console.log('Saving Google Maps API Key:', googleMapsSettings.api_key);

      const { data, error } = await (supabase as any)
        .from('settings')
        .upsert(
          { key: 'google_maps_api_key', value: googleMapsSettings.api_key, updated_at: new Date().toISOString() },
          { onConflict: 'key' }
        )
        .select();

      console.log('Upsert result:', { data, error });

      if (error) throw error;

      toast.success('API Key do Google Maps salva com sucesso!');
      await loadGoogleMapsSettings(); // Reload to confirm
    } catch (error) {
      console.error('Error saving Google Maps settings:', error);
      toast.error('Erro ao salvar API Key do Google Maps');
    } finally {
      setMapsSaving(false);
    }
  }

  function handleGoogleMapsChange(value: string) {
    setGoogleMapsSettings({ api_key: value });
  }

  async function loadDeliverySettings() {
    setDeliveryLoading(true);
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', ['kitchen_address', 'driver_prep_time_minutes']);

      if (error) throw error;

      if (data) {
        const settingsMap = Object.fromEntries(
          data.map((s: any) => [s.key, s.value])
        );
        setDeliverySettings({
          kitchen_address: settingsMap.kitchen_address || 'Rua Clodomiro Amazonas, 134',
          driver_prep_time_minutes: parseInt(settingsMap.driver_prep_time_minutes || '10'),
        });
      }
    } catch (error) {
      console.error('Error loading delivery settings:', error);
      toast.error('Erro ao carregar configurações de entrega');
    } finally {
      setDeliveryLoading(false);
    }
  }

  async function saveDeliverySettings() {
    if (!deliverySettings.kitchen_address || deliverySettings.driver_prep_time_minutes <= 0) {
      toast.error('Preencha todos os campos corretamente');
      return;
    }

    setDeliverySaving(true);
    try {
      const updates = [
        { key: 'kitchen_address', value: deliverySettings.kitchen_address },
        { key: 'driver_prep_time_minutes', value: deliverySettings.driver_prep_time_minutes.toString() },
      ];

      for (const update of updates) {
        const { error } = await (supabase as any)
          .from('settings')
          .upsert(
            { key: update.key, value: update.value, updated_at: new Date().toISOString() },
            { onConflict: 'key' }
          );

        if (error) throw error;
      }

      toast.success('Configurações de entrega salvas com sucesso!');
      await loadDeliverySettings();
    } catch (error) {
      console.error('Error saving delivery settings:', error);
      toast.error('Erro ao salvar configurações de entrega');
    } finally {
      setDeliverySaving(false);
    }
  }

  async function recalculateAllTravelTimes() {
    setRecalculating(true);
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

      const response = await fetch(`${supabaseUrl}/functions/v1/recalculate-all-travel-times`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`Recalculado com sucesso! ${result.successCount} endereços atualizados`);
        if (result.errorCount > 0) {
          toast.error(`${result.errorCount} endereços com erro. Verifique os logs.`);
          console.error('Errors:', result.errors);
        }
      } else {
        toast.error(`Erro ao recalcular: ${result.error}`);
      }
    } catch (error) {
      console.error('Error recalculating:', error);
      toast.error('Erro ao recalcular tempos de viagem');
    } finally {
      setRecalculating(false);
    }
  }

  function handleDeliveryChange(field: keyof DeliverySettings, value: string | number) {
    setDeliverySettings(prev => ({ ...prev, [field]: value }));
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
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="amounts">Quantidades Padrão</TabsTrigger>
            <TabsTrigger value="macros">Cálculo de Macros</TabsTrigger>
            <TabsTrigger value="delivery">Entrega</TabsTrigger>
            <TabsTrigger value="maps">Google Maps</TabsTrigger>
            <TabsTrigger value="export">
              <Sheet className="h-4 w-4 mr-2" />
              Sheets
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

          <TabsContent value="macros">
            <MacroCalculationSettings />
          </TabsContent>

          <TabsContent value="delivery">
            {deliveryLoading ? (
              <Card>
                <CardContent className="text-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">Carregando configurações...</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Configurações de Entrega</CardTitle>
                  <CardDescription>
                    Configure o endereço da cozinha e o tempo de chegada do motoboy para cálculos precisos de horário de solicitação.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="kitchenAddress">
                        Endereço da Cozinha
                      </Label>
                      <Input
                        id="kitchenAddress"
                        type="text"
                        value={deliverySettings.kitchen_address}
                        onChange={(e) => handleDeliveryChange('kitchen_address', e.target.value)}
                        placeholder="Rua Clodomiro Amazonas, 134"
                        className="text-base"
                      />
                      <p className="text-xs text-gray-500">
                        Endereço completo da cozinha para cálculo de rotas
                      </p>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="driverPrepTime">
                        Tempo de Chegada do Motoboy (minutos)
                      </Label>
                      <Input
                        id="driverPrepTime"
                        type="number"
                        min="0"
                        step="1"
                        value={deliverySettings.driver_prep_time_minutes}
                        onChange={(e) => handleDeliveryChange('driver_prep_time_minutes', parseInt(e.target.value) || 0)}
                        className="text-lg font-semibold"
                      />
                      <p className="text-xs text-gray-500">
                        Tempo estimado para o motoboy aceitar e chegar na cozinha
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      onClick={saveDeliverySettings}
                      disabled={deliverySaving}
                      className="flex-1"
                      size="lg"
                    >
                      {deliverySaving ? (
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
                      onClick={loadDeliverySettings}
                      variant="outline"
                      disabled={deliveryLoading || deliverySaving}
                      size="lg"
                    >
                      <RefreshCw className={`h-4 w-4 ${deliveryLoading ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>

                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      Recalcular Tempos de Viagem
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Use este botão para recalcular os tempos de viagem de todos os endereços cadastrados no sistema usando as configurações atuais e tráfego em tempo real.
                    </p>
                    <Button
                      onClick={recalculateAllTravelTimes}
                      disabled={recalculating}
                      size="lg"
                      variant="outline"
                      className="w-full"
                    >
                      {recalculating ? (
                        <>
                          <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                          Recalculando...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-5 w-5 mr-2" />
                          Recalcular Todos os Tempos de Viagem
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-900 mb-2">
                      <strong>Como funciona o cálculo:</strong>
                    </p>
                    <p className="text-sm text-blue-800">
                      Horário de Solicitar Motoboy = Horário de Entrega - (Tempo de Viagem + Tempo de Chegada do Motoboy)
                    </p>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-900 mb-2">
                      <strong>Quando recalcular:</strong>
                    </p>
                    <ul className="text-sm text-green-800 space-y-1 list-disc list-inside">
                      <li>Após mudar o endereço da cozinha</li>
                      <li>Após alterar a API Key do Google Maps</li>
                      <li>Periodicamente para atualizar com dados de tráfego atuais</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="maps">
            {mapsLoading ? (
              <Card>
                <CardContent className="text-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">Carregando configurações...</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Google Maps Distance Matrix API</CardTitle>
                  <CardDescription>
                    Configure a API Key do Google Maps para calcular tempos de entrega precisos baseados em rotas reais de moto.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="mapsApiKey">
                        API Key do Google Maps
                      </Label>
                      <Input
                        id="mapsApiKey"
                        type="password"
                        value={googleMapsSettings.api_key}
                        onChange={(e) => handleGoogleMapsChange(e.target.value)}
                        placeholder="AIza...."
                        className="font-mono"
                      />
                      <p className="text-xs text-gray-500">
                        Sua chave da API Distance Matrix. Mantenha em segredo!
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      onClick={saveGoogleMapsSettings}
                      disabled={mapsSaving}
                      className="flex-1"
                      size="lg"
                    >
                      {mapsSaving ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Salvar API Key
                        </>
                      )}
                    </Button>

                    <Button
                      onClick={loadGoogleMapsSettings}
                      variant="outline"
                      disabled={mapsLoading || mapsSaving}
                      size="lg"
                    >
                      <RefreshCw className={`h-4 w-4 ${mapsLoading ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-900 mb-3">
                      <strong>Como obter sua API Key:</strong>
                    </p>
                    <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                      <li>Acesse o <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="underline font-semibold">Google Cloud Console</a></li>
                      <li>Crie um novo projeto ou selecione um existente</li>
                      <li>Ative a <strong>Distance Matrix API</strong></li>
                      <li>Vá em &quot;Credenciais&quot; e crie uma API Key</li>
                      <li>Cole a chave no campo acima</li>
                    </ol>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-900 mb-2">
                      <strong>O que será calculado:</strong>
                    </p>
                    <ul className="text-sm text-green-800 space-y-1 list-disc list-inside">
                      <li>Tempo real de viagem de moto da cozinha até cada cliente</li>
                      <li>Considera tráfego em tempo real</li>
                      <li>Adiciona automaticamente 10 minutos (tempo do motoboy aceitar)</li>
                      <li>Horário ideal para solicitar o motoboy será mais preciso</li>
                    </ul>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-900 mb-2">
                      <strong>Endereço da Cozinha:</strong>
                    </p>
                    <p className="text-sm text-yellow-800 font-mono">
                      Rua Clodomiro Amazonas, 134
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="export">
            <Card>
              <CardHeader>
                <CardTitle>Exportar Pedidos do Dia</CardTitle>
                <CardDescription>
                  Exporta automaticamente todos os pedidos de almoço e jantar do dia atual para o Google Sheets
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900 mb-3">
                    <strong>Exportação Automática:</strong>
                  </p>
                  <p className="text-sm text-blue-800 mb-2">
                    Os pedidos são exportados automaticamente todos os dias às 6:00 da manhã (horário de Brasília) para as abas &quot;Almoço&quot; e &quot;Jantar&quot; do Google Sheets.
                  </p>
                  <p className="text-sm text-blue-800">
                    Use o botão abaixo caso precise atualizar manualmente os dados após fazer alguma alteração no sistema.
                  </p>
                </div>

                <div className="flex justify-center">
                  <Button
                    onClick={exportTodayToSheets}
                    disabled={exporting}
                    size="lg"
                    className="h-16 px-8 text-lg"
                  >
                    {exporting ? (
                      <>
                        <RefreshCw className="h-6 w-6 mr-3 animate-spin" />
                        Exportando...
                      </>
                    ) : (
                      <>
                        <Upload className="h-6 w-6 mr-3" />
                        Atualizar Planilha de Hoje
                      </>
                    )}
                  </Button>
                </div>

                <div className="border-t border-gray-200 my-8 pt-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Importar Alterações dos Clientes
                  </h3>

                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-purple-900 mb-3">
                      <strong>Importação Automática:</strong>
                    </p>
                    <p className="text-sm text-purple-800 mb-2">
                      <strong>Almoço:</strong> 10:00, 10:30 e 11:00
                    </p>
                    <p className="text-sm text-purple-800 mb-3">
                      <strong>Jantar:</strong> 16:00, 16:30 e 17:00
                    </p>
                    <p className="text-sm text-purple-800">
                      Use os botões abaixo para importar manualmente as alterações dos clientes (cancelamentos, mudanças de endereço, horário, proteína e carboidrato).
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button
                      onClick={importLunchFromSheets}
                      disabled={importingLunch}
                      size="lg"
                      variant="outline"
                      className="h-16 text-lg"
                    >
                      {importingLunch ? (
                        <>
                          <RefreshCw className="h-5 w-5 mr-3 animate-spin" />
                          Importando Almoço...
                        </>
                      ) : (
                        <>
                          <FileDown className="h-5 w-5 mr-3" />
                          Importar Almoço
                        </>
                      )}
                    </Button>

                    <Button
                      onClick={importDinnerFromSheets}
                      disabled={importingDinner}
                      size="lg"
                      variant="outline"
                      className="h-16 text-lg"
                    >
                      {importingDinner ? (
                        <>
                          <RefreshCw className="h-5 w-5 mr-3 animate-spin" />
                          Importando Jantar...
                        </>
                      ) : (
                        <>
                          <FileDown className="h-5 w-5 mr-3" />
                          Importar Jantar
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-900 mb-2">
                    <strong>Formato da Planilha (Exportação):</strong>
                  </p>
                  <p className="text-xs text-green-800 font-mono">
                    Nome | Telefone | Endereço | Data | Horário | Proteína | Carboidrato | Legumes | Salada | Molho Salada | Refeição
                  </p>
                </div>

                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <p className="text-sm text-orange-900 mb-2">
                    <strong>Colunas de Importação:</strong>
                  </p>
                  <p className="text-xs text-orange-800 mb-3 font-mono">
                    Novo Endereço | Novo Horário | Nova Proteína | Novo Carboidrato
                  </p>
                  <ul className="text-xs text-orange-800 space-y-1 list-disc list-inside">
                    <li>Se &quot;Novo Endereço&quot; = &quot;Cancelado&quot; → pedido é cancelado</li>
                    <li>Alterações aplicam apenas para a refeição do dia</li>
                    <li>Se vazio, usa o valor padrão da programação</li>
                  </ul>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-900 mb-2">
                    <strong>O que é exportado:</strong>
                  </p>
                  <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                    <li>Todos os clientes ativos com pedidos agendados para hoje</li>
                    <li>Cardápio do dia (proteína, carboidrato, legumes, salada e molho)</li>
                    <li>Endereço e horário de entrega de cada cliente</li>
                    <li>Os pedidos são ordenados por horário de entrega</li>
                  </ul>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <p className="text-sm text-slate-900 mb-2">
                    <strong>Link da Planilha:</strong>
                  </p>
                  <a
                    href="https://docs.google.com/spreadsheets/d/1WRGQYiyH9FuNJ-APBtZOj_oifKv6RLEwN-XaBi_S7ro/edit"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline text-sm break-all"
                  >
                    https://docs.google.com/spreadsheets/d/1WRGQYiyH9FuNJ-APBtZOj_oifKv6RLEwN-XaBi_S7ro/edit
                  </a>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
