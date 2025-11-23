'use client';

import { useState, useEffect } from 'react';
import { Navigation } from '@/components/navigation';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, Save, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface GlobalSettings {
  vegetables_amount: number;
  salad_amount: number;
  salad_dressing_amount: number;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<GlobalSettings>({
    vegetables_amount: 100,
    salad_amount: 100,
    salad_dressing_amount: 30,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="h-8 w-8 text-slate-600" />
            <h1 className="text-3xl font-bold text-gray-900">Configurações</h1>
          </div>
          <p className="text-gray-600">Configure as quantidades padrão dos componentes das refeições</p>
        </div>

        {loading ? (
          <Card>
            <CardContent className="text-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">Carregando configurações...</p>
            </CardContent>
          </Card>
        ) : (
          <div className="max-w-2xl">
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
          </div>
        )}
      </main>
    </div>
  );
}
