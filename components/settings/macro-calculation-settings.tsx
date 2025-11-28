'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Save, RefreshCw, Calculator } from 'lucide-react';
import { toast } from 'sonner';

interface MacroSettings {
  work_sedentary: number;
  work_light_active: number;
  work_moderate_active: number;
  work_very_active: number;
  work_extremely_active: number;

  freq_none: number;
  freq_1_2_week: number;
  freq_3_4_week: number;
  freq_5_6_week: number;
  freq_daily: number;

  intensity_light: number;
  intensity_moderate: number;
  intensity_intense: number;

  exercise_bonus_multiplier: number;

  goal_weight_loss_offset: number;
  goal_maintenance_offset: number;
  goal_muscle_gain_offset: number;
  goal_definition_offset: number;
  goal_performance_offset: number;
  goal_health_offset: number;

  protein_weight_loss: number;
  protein_maintenance: number;
  protein_muscle_gain: number;
  protein_definition: number;
  protein_performance: number;
  protein_health: number;

  fat_percentage_muscle_gain: number;
  fat_percentage_default: number;

  lunch_percentage: number;
  dinner_percentage: number;

  meals_2_lunch_dinner_pct: number;
  meals_3_lunch_dinner_pct: number;
  meals_4_lunch_dinner_pct: number;
  meals_5plus_lunch_dinner_pct: number;
}

export function MacroCalculationSettings() {
  const [settings, setSettings] = useState<MacroSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('macro_calculation_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings(data as any);
      }
    } catch (error) {
      console.error('Error loading macro settings:', error);
      toast.error('Erro ao carregar configurações de cálculo');
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    if (!settings) return;

    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from('macro_calculation_settings')
        .update({
          ...settings,
          updated_at: new Date().toISOString(),
        })
        .eq('id', 1);

      if (error) throw error;

      toast.success('Configurações de cálculo salvas com sucesso!');
    } catch (error) {
      console.error('Error saving macro settings:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  }

  function handleChange(field: keyof MacroSettings, value: string) {
    const numValue = parseFloat(value) || 0;
    setSettings(prev => prev ? { ...prev, [field]: numValue } : null);
  }

  if (loading || !settings) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">Carregando configurações...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Calculator className="h-6 w-6 text-blue-600" />
          <div>
            <CardTitle>Configurações de Cálculo de Macros</CardTitle>
            <CardDescription>
              Ajuste os fatores usados no cálculo automático de macronutrientes. Alterações afetam todas as recomendações.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Rotina de Trabalho</h3>
            <p className="text-sm text-gray-600 mb-4">Multiplicadores de atividade base (somados a 1.2)</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="work_sedentary" className="text-xs">Sedentário</Label>
                <Input
                  id="work_sedentary"
                  type="number"
                  step="0.01"
                  value={settings.work_sedentary}
                  onChange={(e) => handleChange('work_sedentary', e.target.value)}
                  className="font-mono"
                />
              </div>
              <div>
                <Label htmlFor="work_light_active" className="text-xs">Levemente Ativo</Label>
                <Input
                  id="work_light_active"
                  type="number"
                  step="0.01"
                  value={settings.work_light_active}
                  onChange={(e) => handleChange('work_light_active', e.target.value)}
                  className="font-mono"
                />
              </div>
              <div>
                <Label htmlFor="work_moderate_active" className="text-xs">Moderadamente Ativo</Label>
                <Input
                  id="work_moderate_active"
                  type="number"
                  step="0.01"
                  value={settings.work_moderate_active}
                  onChange={(e) => handleChange('work_moderate_active', e.target.value)}
                  className="font-mono"
                />
              </div>
              <div>
                <Label htmlFor="work_very_active" className="text-xs">Muito Ativo</Label>
                <Input
                  id="work_very_active"
                  type="number"
                  step="0.01"
                  value={settings.work_very_active}
                  onChange={(e) => handleChange('work_very_active', e.target.value)}
                  className="font-mono"
                />
              </div>
              <div>
                <Label htmlFor="work_extremely_active" className="text-xs">Extremamente Ativo</Label>
                <Input
                  id="work_extremely_active"
                  type="number"
                  step="0.01"
                  value={settings.work_extremely_active}
                  onChange={(e) => handleChange('work_extremely_active', e.target.value)}
                  className="font-mono"
                />
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Atividade Física</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Frequência (pontos)</p>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                  <div>
                    <Label htmlFor="freq_none" className="text-xs">Nenhuma</Label>
                    <Input
                      id="freq_none"
                      type="number"
                      step="0.1"
                      value={settings.freq_none}
                      onChange={(e) => handleChange('freq_none', e.target.value)}
                      className="font-mono"
                    />
                  </div>
                  <div>
                    <Label htmlFor="freq_1_2_week" className="text-xs">1-2x/sem</Label>
                    <Input
                      id="freq_1_2_week"
                      type="number"
                      step="0.1"
                      value={settings.freq_1_2_week}
                      onChange={(e) => handleChange('freq_1_2_week', e.target.value)}
                      className="font-mono"
                    />
                  </div>
                  <div>
                    <Label htmlFor="freq_3_4_week" className="text-xs">3-4x/sem</Label>
                    <Input
                      id="freq_3_4_week"
                      type="number"
                      step="0.1"
                      value={settings.freq_3_4_week}
                      onChange={(e) => handleChange('freq_3_4_week', e.target.value)}
                      className="font-mono"
                    />
                  </div>
                  <div>
                    <Label htmlFor="freq_5_6_week" className="text-xs">5-6x/sem</Label>
                    <Input
                      id="freq_5_6_week"
                      type="number"
                      step="0.1"
                      value={settings.freq_5_6_week}
                      onChange={(e) => handleChange('freq_5_6_week', e.target.value)}
                      className="font-mono"
                    />
                  </div>
                  <div>
                    <Label htmlFor="freq_daily" className="text-xs">Diário</Label>
                    <Input
                      id="freq_daily"
                      type="number"
                      step="0.1"
                      value={settings.freq_daily}
                      onChange={(e) => handleChange('freq_daily', e.target.value)}
                      className="font-mono"
                    />
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Intensidade (multiplicador)</p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="intensity_light" className="text-xs">Leve</Label>
                    <Input
                      id="intensity_light"
                      type="number"
                      step="0.1"
                      value={settings.intensity_light}
                      onChange={(e) => handleChange('intensity_light', e.target.value)}
                      className="font-mono"
                    />
                  </div>
                  <div>
                    <Label htmlFor="intensity_moderate" className="text-xs">Moderada</Label>
                    <Input
                      id="intensity_moderate"
                      type="number"
                      step="0.1"
                      value={settings.intensity_moderate}
                      onChange={(e) => handleChange('intensity_moderate', e.target.value)}
                      className="font-mono"
                    />
                  </div>
                  <div>
                    <Label htmlFor="intensity_intense" className="text-xs">Intensa</Label>
                    <Input
                      id="intensity_intense"
                      type="number"
                      step="0.1"
                      value={settings.intensity_intense}
                      onChange={(e) => handleChange('intensity_intense', e.target.value)}
                      className="font-mono"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="exercise_bonus_multiplier" className="text-sm font-medium">Multiplicador de Bônus de Exercício</Label>
                <Input
                  id="exercise_bonus_multiplier"
                  type="number"
                  step="0.01"
                  value={settings.exercise_bonus_multiplier}
                  onChange={(e) => handleChange('exercise_bonus_multiplier', e.target.value)}
                  className="font-mono max-w-xs"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Aplicado ao score combinado de frequência × intensidade
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Ajuste Calórico por Objetivo</h3>
            <p className="text-sm text-gray-600 mb-4">Offset em kcal aplicado ao TDEE</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="goal_weight_loss_offset" className="text-xs">Emagrecimento</Label>
                <Input
                  id="goal_weight_loss_offset"
                  type="number"
                  step="10"
                  value={settings.goal_weight_loss_offset}
                  onChange={(e) => handleChange('goal_weight_loss_offset', e.target.value)}
                  className="font-mono"
                />
              </div>
              <div>
                <Label htmlFor="goal_maintenance_offset" className="text-xs">Manutenção</Label>
                <Input
                  id="goal_maintenance_offset"
                  type="number"
                  step="10"
                  value={settings.goal_maintenance_offset}
                  onChange={(e) => handleChange('goal_maintenance_offset', e.target.value)}
                  className="font-mono"
                />
              </div>
              <div>
                <Label htmlFor="goal_muscle_gain_offset" className="text-xs">Ganho Muscular</Label>
                <Input
                  id="goal_muscle_gain_offset"
                  type="number"
                  step="10"
                  value={settings.goal_muscle_gain_offset}
                  onChange={(e) => handleChange('goal_muscle_gain_offset', e.target.value)}
                  className="font-mono"
                />
              </div>
              <div>
                <Label htmlFor="goal_definition_offset" className="text-xs">Definição</Label>
                <Input
                  id="goal_definition_offset"
                  type="number"
                  step="10"
                  value={settings.goal_definition_offset}
                  onChange={(e) => handleChange('goal_definition_offset', e.target.value)}
                  className="font-mono"
                />
              </div>
              <div>
                <Label htmlFor="goal_performance_offset" className="text-xs">Performance</Label>
                <Input
                  id="goal_performance_offset"
                  type="number"
                  step="10"
                  value={settings.goal_performance_offset}
                  onChange={(e) => handleChange('goal_performance_offset', e.target.value)}
                  className="font-mono"
                />
              </div>
              <div>
                <Label htmlFor="goal_health_offset" className="text-xs">Saúde/Bem-estar</Label>
                <Input
                  id="goal_health_offset"
                  type="number"
                  step="10"
                  value={settings.goal_health_offset}
                  onChange={(e) => handleChange('goal_health_offset', e.target.value)}
                  className="font-mono"
                />
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Proteína por Objetivo</h3>
            <p className="text-sm text-gray-600 mb-4">Gramas por kg de peso corporal</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="protein_weight_loss" className="text-xs">Emagrecimento</Label>
                <Input
                  id="protein_weight_loss"
                  type="number"
                  step="0.1"
                  value={settings.protein_weight_loss}
                  onChange={(e) => handleChange('protein_weight_loss', e.target.value)}
                  className="font-mono"
                />
              </div>
              <div>
                <Label htmlFor="protein_maintenance" className="text-xs">Manutenção</Label>
                <Input
                  id="protein_maintenance"
                  type="number"
                  step="0.1"
                  value={settings.protein_maintenance}
                  onChange={(e) => handleChange('protein_maintenance', e.target.value)}
                  className="font-mono"
                />
              </div>
              <div>
                <Label htmlFor="protein_muscle_gain" className="text-xs">Ganho Muscular</Label>
                <Input
                  id="protein_muscle_gain"
                  type="number"
                  step="0.1"
                  value={settings.protein_muscle_gain}
                  onChange={(e) => handleChange('protein_muscle_gain', e.target.value)}
                  className="font-mono"
                />
              </div>
              <div>
                <Label htmlFor="protein_definition" className="text-xs">Definição</Label>
                <Input
                  id="protein_definition"
                  type="number"
                  step="0.1"
                  value={settings.protein_definition}
                  onChange={(e) => handleChange('protein_definition', e.target.value)}
                  className="font-mono"
                />
              </div>
              <div>
                <Label htmlFor="protein_performance" className="text-xs">Performance</Label>
                <Input
                  id="protein_performance"
                  type="number"
                  step="0.1"
                  value={settings.protein_performance}
                  onChange={(e) => handleChange('protein_performance', e.target.value)}
                  className="font-mono"
                />
              </div>
              <div>
                <Label htmlFor="protein_health" className="text-xs">Saúde/Bem-estar</Label>
                <Input
                  id="protein_health"
                  type="number"
                  step="0.1"
                  value={settings.protein_health}
                  onChange={(e) => handleChange('protein_health', e.target.value)}
                  className="font-mono"
                />
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Percentual de Gordura</h3>
            <p className="text-sm text-gray-600 mb-4">% das calorias totais</p>
            <div className="grid grid-cols-2 gap-4 max-w-md">
              <div>
                <Label htmlFor="fat_percentage_muscle_gain" className="text-xs">Ganho Muscular</Label>
                <Input
                  id="fat_percentage_muscle_gain"
                  type="number"
                  step="0.01"
                  value={settings.fat_percentage_muscle_gain}
                  onChange={(e) => handleChange('fat_percentage_muscle_gain', e.target.value)}
                  className="font-mono"
                />
              </div>
              <div>
                <Label htmlFor="fat_percentage_default" className="text-xs">Padrão (outros)</Label>
                <Input
                  id="fat_percentage_default"
                  type="number"
                  step="0.01"
                  value={settings.fat_percentage_default}
                  onChange={(e) => handleChange('fat_percentage_default', e.target.value)}
                  className="font-mono"
                />
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Distribuição Almoço vs Jantar</h3>
            <p className="text-sm text-gray-600 mb-4">Percentual dos macros destinados a cada refeição</p>
            <div className="grid grid-cols-2 gap-4 max-w-md">
              <div>
                <Label htmlFor="lunch_percentage" className="text-xs">Almoço (%)</Label>
                <Input
                  id="lunch_percentage"
                  type="number"
                  step="0.01"
                  value={settings.lunch_percentage}
                  onChange={(e) => handleChange('lunch_percentage', e.target.value)}
                  className="font-mono"
                />
              </div>
              <div>
                <Label htmlFor="dinner_percentage" className="text-xs">Jantar (%)</Label>
                <Input
                  id="dinner_percentage"
                  type="number"
                  step="0.01"
                  value={settings.dinner_percentage}
                  onChange={(e) => handleChange('dinner_percentage', e.target.value)}
                  className="font-mono"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              A soma deve ser 1.0 (100%). Ex: 0.55 + 0.45 = 1.0
            </p>
          </div>

          <Separator />

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Distribuição por Número de Refeições</h3>
            <p className="text-sm text-gray-600 mb-4">% das calorias diárias para almoço+jantar</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="meals_2_lunch_dinner_pct" className="text-xs">2 refeições</Label>
                <Input
                  id="meals_2_lunch_dinner_pct"
                  type="number"
                  step="0.01"
                  value={settings.meals_2_lunch_dinner_pct}
                  onChange={(e) => handleChange('meals_2_lunch_dinner_pct', e.target.value)}
                  className="font-mono"
                />
              </div>
              <div>
                <Label htmlFor="meals_3_lunch_dinner_pct" className="text-xs">3 refeições</Label>
                <Input
                  id="meals_3_lunch_dinner_pct"
                  type="number"
                  step="0.01"
                  value={settings.meals_3_lunch_dinner_pct}
                  onChange={(e) => handleChange('meals_3_lunch_dinner_pct', e.target.value)}
                  className="font-mono"
                />
              </div>
              <div>
                <Label htmlFor="meals_4_lunch_dinner_pct" className="text-xs">4 refeições</Label>
                <Input
                  id="meals_4_lunch_dinner_pct"
                  type="number"
                  step="0.01"
                  value={settings.meals_4_lunch_dinner_pct}
                  onChange={(e) => handleChange('meals_4_lunch_dinner_pct', e.target.value)}
                  className="font-mono"
                />
              </div>
              <div>
                <Label htmlFor="meals_5plus_lunch_dinner_pct" className="text-xs">5+ refeições</Label>
                <Input
                  id="meals_5plus_lunch_dinner_pct"
                  type="number"
                  step="0.01"
                  value={settings.meals_5plus_lunch_dinner_pct}
                  onChange={(e) => handleChange('meals_5plus_lunch_dinner_pct', e.target.value)}
                  className="font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-6 border-t">
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

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-900 mb-2">
            <strong>Atenção:</strong>
          </p>
          <p className="text-sm text-amber-800">
            As alterações afetam imediatamente todas as recomendações de macros para clientes sem nutricionista.
            Use valores pequenos para fazer ajustes finos e teste os resultados antes de aplicar mudanças grandes.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
