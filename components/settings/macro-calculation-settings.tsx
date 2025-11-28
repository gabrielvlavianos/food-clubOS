'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Save, RefreshCw, Calculator, Info } from 'lucide-react';
import { toast } from 'sonner';

interface MacroSettings {
  work_sedentary: number;
  work_moderate_active: number;
  work_very_active: number;

  aerobic_none: number;
  aerobic_1_2_light: number;
  aerobic_1_2_moderate: number;
  aerobic_1_2_intense: number;
  aerobic_3_4_light: number;
  aerobic_3_4_moderate: number;
  aerobic_3_4_intense: number;
  aerobic_5_6_light: number;
  aerobic_5_6_moderate: number;
  aerobic_5_6_intense: number;
  aerobic_daily_light: number;
  aerobic_daily_moderate: number;
  aerobic_daily_intense: number;

  strength_none: number;
  strength_1_2_light: number;
  strength_1_2_moderate: number;
  strength_1_2_intense: number;
  strength_3_4_light: number;
  strength_3_4_moderate: number;
  strength_3_4_intense: number;
  strength_5_6_light: number;
  strength_5_6_moderate: number;
  strength_5_6_intense: number;
  strength_daily_light: number;
  strength_daily_moderate: number;
  strength_daily_intense: number;

  goal_muscle_gain_multiplier: number;
  goal_weight_loss_multiplier: number;
  goal_maintenance_multiplier: number;
  goal_performance_multiplier: number;

  protein_muscle_gain: number;
  protein_weight_loss: number;
  protein_maintenance: number;
  protein_performance: number;

  fat_muscle_gain: number;
  fat_weight_loss: number;
  fat_maintenance: number;
  fat_performance: number;

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
              Ajuste os multiplicadores usados no cálculo automático de macronutrientes
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-900 space-y-2">
              <p className="font-semibold">Fórmula de Cálculo:</p>
              <p className="font-mono text-xs bg-blue-100 p-2 rounded">
                GET Ajustado = TMB × Fator¹(Rotina) × Fator²(Aeróbico) × Fator³(Musculação) × Fator⁴(Objetivo)
              </p>
              <p className="text-xs">
                <strong>TMB</strong> = Taxa Metabólica Basal (Mifflin-St Jeor)<br/>
                <strong>Kcal por Refeição</strong> = GET Ajustado × % Refeição (ex: 55%) × % Nº Refeições (ex: 70%)<br/>
                <strong>Proteína</strong> = Peso (kg) × g/kg por Objetivo<br/>
                <strong>Gordura</strong> = Peso (kg) × g/kg por Objetivo<br/>
                <strong>Carboidrato</strong> = (Kcal - Proteína×4 - Gordura×9) ÷ 4
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Fator 1: Rotina de Trabalho</h3>
            <p className="text-sm text-gray-600 mb-4">Multiplicadores da TMB baseados na rotina diária</p>
            <div className="grid grid-cols-3 gap-4">
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
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Fator 2: Atividade Aeróbica</h3>
            <p className="text-sm text-gray-600 mb-4">Multiplicadores baseados em Frequência × Intensidade</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border p-2 text-left">Frequência</th>
                    <th className="border p-2">Leve</th>
                    <th className="border p-2">Moderada</th>
                    <th className="border p-2">Intensa</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border p-2 font-medium">Nenhuma vez</td>
                    <td className="border p-2" colSpan={3}>
                      <Input
                        type="number"
                        step="0.01"
                        value={settings.aerobic_none}
                        onChange={(e) => handleChange('aerobic_none', e.target.value)}
                        className="font-mono text-center"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="border p-2 font-medium">1-2 vezes/semana</td>
                    <td className="border p-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={settings.aerobic_1_2_light}
                        onChange={(e) => handleChange('aerobic_1_2_light', e.target.value)}
                        className="font-mono text-center"
                      />
                    </td>
                    <td className="border p-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={settings.aerobic_1_2_moderate}
                        onChange={(e) => handleChange('aerobic_1_2_moderate', e.target.value)}
                        className="font-mono text-center"
                      />
                    </td>
                    <td className="border p-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={settings.aerobic_1_2_intense}
                        onChange={(e) => handleChange('aerobic_1_2_intense', e.target.value)}
                        className="font-mono text-center"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="border p-2 font-medium">3-4 vezes/semana</td>
                    <td className="border p-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={settings.aerobic_3_4_light}
                        onChange={(e) => handleChange('aerobic_3_4_light', e.target.value)}
                        className="font-mono text-center"
                      />
                    </td>
                    <td className="border p-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={settings.aerobic_3_4_moderate}
                        onChange={(e) => handleChange('aerobic_3_4_moderate', e.target.value)}
                        className="font-mono text-center"
                      />
                    </td>
                    <td className="border p-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={settings.aerobic_3_4_intense}
                        onChange={(e) => handleChange('aerobic_3_4_intense', e.target.value)}
                        className="font-mono text-center"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="border p-2 font-medium">5-6 vezes/semana</td>
                    <td className="border p-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={settings.aerobic_5_6_light}
                        onChange={(e) => handleChange('aerobic_5_6_light', e.target.value)}
                        className="font-mono text-center"
                      />
                    </td>
                    <td className="border p-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={settings.aerobic_5_6_moderate}
                        onChange={(e) => handleChange('aerobic_5_6_moderate', e.target.value)}
                        className="font-mono text-center"
                      />
                    </td>
                    <td className="border p-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={settings.aerobic_5_6_intense}
                        onChange={(e) => handleChange('aerobic_5_6_intense', e.target.value)}
                        className="font-mono text-center"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="border p-2 font-medium">Todos os dias</td>
                    <td className="border p-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={settings.aerobic_daily_light}
                        onChange={(e) => handleChange('aerobic_daily_light', e.target.value)}
                        className="font-mono text-center"
                      />
                    </td>
                    <td className="border p-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={settings.aerobic_daily_moderate}
                        onChange={(e) => handleChange('aerobic_daily_moderate', e.target.value)}
                        className="font-mono text-center"
                      />
                    </td>
                    <td className="border p-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={settings.aerobic_daily_intense}
                        onChange={(e) => handleChange('aerobic_daily_intense', e.target.value)}
                        className="font-mono text-center"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Fator 3: Musculação</h3>
            <p className="text-sm text-gray-600 mb-4">Multiplicadores baseados em Frequência × Intensidade</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border p-2 text-left">Frequência</th>
                    <th className="border p-2">Leve</th>
                    <th className="border p-2">Moderada</th>
                    <th className="border p-2">Intensa</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border p-2 font-medium">Nenhuma vez</td>
                    <td className="border p-2" colSpan={3}>
                      <Input
                        type="number"
                        step="0.01"
                        value={settings.strength_none}
                        onChange={(e) => handleChange('strength_none', e.target.value)}
                        className="font-mono text-center"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="border p-2 font-medium">1-2 vezes/semana</td>
                    <td className="border p-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={settings.strength_1_2_light}
                        onChange={(e) => handleChange('strength_1_2_light', e.target.value)}
                        className="font-mono text-center"
                      />
                    </td>
                    <td className="border p-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={settings.strength_1_2_moderate}
                        onChange={(e) => handleChange('strength_1_2_moderate', e.target.value)}
                        className="font-mono text-center"
                      />
                    </td>
                    <td className="border p-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={settings.strength_1_2_intense}
                        onChange={(e) => handleChange('strength_1_2_intense', e.target.value)}
                        className="font-mono text-center"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="border p-2 font-medium">3-4 vezes/semana</td>
                    <td className="border p-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={settings.strength_3_4_light}
                        onChange={(e) => handleChange('strength_3_4_light', e.target.value)}
                        className="font-mono text-center"
                      />
                    </td>
                    <td className="border p-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={settings.strength_3_4_moderate}
                        onChange={(e) => handleChange('strength_3_4_moderate', e.target.value)}
                        className="font-mono text-center"
                      />
                    </td>
                    <td className="border p-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={settings.strength_3_4_intense}
                        onChange={(e) => handleChange('strength_3_4_intense', e.target.value)}
                        className="font-mono text-center"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="border p-2 font-medium">5-6 vezes/semana</td>
                    <td className="border p-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={settings.strength_5_6_light}
                        onChange={(e) => handleChange('strength_5_6_light', e.target.value)}
                        className="font-mono text-center"
                      />
                    </td>
                    <td className="border p-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={settings.strength_5_6_moderate}
                        onChange={(e) => handleChange('strength_5_6_moderate', e.target.value)}
                        className="font-mono text-center"
                      />
                    </td>
                    <td className="border p-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={settings.strength_5_6_intense}
                        onChange={(e) => handleChange('strength_5_6_intense', e.target.value)}
                        className="font-mono text-center"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="border p-2 font-medium">Todos os dias</td>
                    <td className="border p-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={settings.strength_daily_light}
                        onChange={(e) => handleChange('strength_daily_light', e.target.value)}
                        className="font-mono text-center"
                      />
                    </td>
                    <td className="border p-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={settings.strength_daily_moderate}
                        onChange={(e) => handleChange('strength_daily_moderate', e.target.value)}
                        className="font-mono text-center"
                      />
                    </td>
                    <td className="border p-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={settings.strength_daily_intense}
                        onChange={(e) => handleChange('strength_daily_intense', e.target.value)}
                        className="font-mono text-center"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Fator 4: Objetivo</h3>
            <p className="text-sm text-gray-600 mb-4">Multiplicadores do GET baseados no objetivo</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="goal_muscle_gain_multiplier" className="text-xs">Hipertrofia/Ganho</Label>
                <Input
                  id="goal_muscle_gain_multiplier"
                  type="number"
                  step="0.01"
                  value={settings.goal_muscle_gain_multiplier}
                  onChange={(e) => handleChange('goal_muscle_gain_multiplier', e.target.value)}
                  className="font-mono"
                />
              </div>
              <div>
                <Label htmlFor="goal_weight_loss_multiplier" className="text-xs">Perda de Gordura</Label>
                <Input
                  id="goal_weight_loss_multiplier"
                  type="number"
                  step="0.01"
                  value={settings.goal_weight_loss_multiplier}
                  onChange={(e) => handleChange('goal_weight_loss_multiplier', e.target.value)}
                  className="font-mono"
                />
              </div>
              <div>
                <Label htmlFor="goal_maintenance_multiplier" className="text-xs">Manutenção</Label>
                <Input
                  id="goal_maintenance_multiplier"
                  type="number"
                  step="0.01"
                  value={settings.goal_maintenance_multiplier}
                  onChange={(e) => handleChange('goal_maintenance_multiplier', e.target.value)}
                  className="font-mono"
                />
              </div>
              <div>
                <Label htmlFor="goal_performance_multiplier" className="text-xs">Performance</Label>
                <Input
                  id="goal_performance_multiplier"
                  type="number"
                  step="0.01"
                  value={settings.goal_performance_multiplier}
                  onChange={(e) => handleChange('goal_performance_multiplier', e.target.value)}
                  className="font-mono"
                />
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Proteína por Objetivo</h3>
            <p className="text-sm text-gray-600 mb-4">Gramas por kg de peso corporal</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="protein_muscle_gain" className="text-xs">Hipertrofia/Ganho</Label>
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
                <Label htmlFor="protein_weight_loss" className="text-xs">Perda de Gordura</Label>
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
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Gordura por Objetivo</h3>
            <p className="text-sm text-gray-600 mb-4">Gramas por kg de peso corporal</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="fat_muscle_gain" className="text-xs">Hipertrofia/Ganho</Label>
                <Input
                  id="fat_muscle_gain"
                  type="number"
                  step="0.1"
                  value={settings.fat_muscle_gain}
                  onChange={(e) => handleChange('fat_muscle_gain', e.target.value)}
                  className="font-mono"
                />
              </div>
              <div>
                <Label htmlFor="fat_weight_loss" className="text-xs">Perda de Gordura</Label>
                <Input
                  id="fat_weight_loss"
                  type="number"
                  step="0.1"
                  value={settings.fat_weight_loss}
                  onChange={(e) => handleChange('fat_weight_loss', e.target.value)}
                  className="font-mono"
                />
              </div>
              <div>
                <Label htmlFor="fat_maintenance" className="text-xs">Manutenção</Label>
                <Input
                  id="fat_maintenance"
                  type="number"
                  step="0.1"
                  value={settings.fat_maintenance}
                  onChange={(e) => handleChange('fat_maintenance', e.target.value)}
                  className="font-mono"
                />
              </div>
              <div>
                <Label htmlFor="fat_performance" className="text-xs">Performance</Label>
                <Input
                  id="fat_performance"
                  type="number"
                  step="0.1"
                  value={settings.fat_performance}
                  onChange={(e) => handleChange('fat_performance', e.target.value)}
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
