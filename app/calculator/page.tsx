'use client';

import { useState, useEffect } from 'react';
import { Navigation } from '@/components/navigation';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calculator as CalcIcon, Check } from 'lucide-react';
import type { Customer, Recipe } from '@/types';

interface MealCalculation {
  proteinAmount: number;
  carbAmount: number;
  vegetableAmount: number;
  saladAmount: number;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  adjustmentFactor: number;
}

export default function CalculatorPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedMealType, setSelectedMealType] = useState<'lunch' | 'dinner'>('lunch');
  const [selectedProteinId, setSelectedProteinId] = useState('');
  const [selectedCarbId, setSelectedCarbId] = useState('');
  const [selectedVegetableId, setSelectedVegetableId] = useState('');
  const [selectedSaladId, setSelectedSaladId] = useState('');
  const [selectedSauceId, setSelectedSauceId] = useState('');
  const [calculation, setCalculation] = useState<MealCalculation | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCustomers();
    loadRecipes();
  }, []);

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
      .eq('is_active', true)
      .order('category, name');

    if (data) setRecipes(data);
  }

  function calculateMeal() {
    const customer = customers.find(c => c.id === selectedCustomerId);
    const proteinRecipe = recipes.find(r => r.id === selectedProteinId);
    const carbRecipe = recipes.find(r => r.id === selectedCarbId);
    const vegetableRecipe = recipes.find(r => r.id === selectedVegetableId);
    const saladRecipe = recipes.find(r => r.id === selectedSaladId);

    if (!customer || !proteinRecipe || !carbRecipe) {
      return;
    }

    const targetProtein = selectedMealType === 'lunch' ? customer.lunch_protein : customer.dinner_protein;
    const targetCarbs = selectedMealType === 'lunch' ? customer.lunch_carbs : customer.dinner_carbs;
    const targetFat = selectedMealType === 'lunch' ? customer.lunch_fat : customer.dinner_fat;

    if (!targetProtein || !targetCarbs || !targetFat) {
      return;
    }

    let proteinAmount = (targetProtein / proteinRecipe.protein_per_100g) * 100;

    const proteinFromProteinRecipe = (proteinAmount / 100) * proteinRecipe.protein_per_100g;
    const carbsFromProteinRecipe = (proteinAmount / 100) * proteinRecipe.carb_per_100g;
    const fatFromProteinRecipe = (proteinAmount / 100) * proteinRecipe.fat_per_100g;
    const caloriesFromProteinRecipe = (proteinAmount / 100) * proteinRecipe.kcal_per_100g;

    const remainingCarbs = targetCarbs - carbsFromProteinRecipe;
    let carbAmount = (remainingCarbs / carbRecipe.carb_per_100g) * 100;

    const carbsFromCarbRecipe = (carbAmount / 100) * carbRecipe.carb_per_100g;
    const proteinFromCarbRecipe = (carbAmount / 100) * carbRecipe.protein_per_100g;
    const fatFromCarbRecipe = (carbAmount / 100) * carbRecipe.fat_per_100g;
    const caloriesFromCarbRecipe = (carbAmount / 100) * carbRecipe.kcal_per_100g;

    const vegetableAmount = vegetableRecipe ? 100 : 0;
    const saladAmount = saladRecipe ? 100 : 0;

    const caloriesFromVegetable = vegetableRecipe ? (vegetableAmount / 100) * vegetableRecipe.kcal_per_100g : 0;
    const proteinFromVegetable = vegetableRecipe ? (vegetableAmount / 100) * vegetableRecipe.protein_per_100g : 0;
    const carbsFromVegetable = vegetableRecipe ? (vegetableAmount / 100) * vegetableRecipe.carb_per_100g : 0;
    const fatFromVegetable = vegetableRecipe ? (vegetableAmount / 100) * vegetableRecipe.fat_per_100g : 0;

    const caloriesFromSalad = saladRecipe ? (saladAmount / 100) * saladRecipe.kcal_per_100g : 0;
    const proteinFromSalad = saladRecipe ? (saladAmount / 100) * saladRecipe.protein_per_100g : 0;
    const carbsFromSalad = saladRecipe ? (saladAmount / 100) * saladRecipe.carb_per_100g : 0;
    const fatFromSalad = saladRecipe ? (saladAmount / 100) * saladRecipe.fat_per_100g : 0;

    let totalCalories = caloriesFromProteinRecipe + caloriesFromCarbRecipe + caloriesFromVegetable + caloriesFromSalad;
    let totalProtein = proteinFromProteinRecipe + proteinFromCarbRecipe + proteinFromVegetable + proteinFromSalad;
    let totalCarbs = carbsFromProteinRecipe + carbsFromCarbRecipe + carbsFromVegetable + carbsFromSalad;
    let totalFat = fatFromProteinRecipe + fatFromCarbRecipe + fatFromVegetable + fatFromSalad;

    const targetCalories = (targetProtein * 4) + (targetCarbs * 4) + (targetFat * 9);

    const adjustmentFactor = targetCalories / totalCalories;

    proteinAmount = proteinAmount * adjustmentFactor;
    carbAmount = carbAmount * adjustmentFactor;

    totalCalories = totalCalories * adjustmentFactor;
    totalProtein = (proteinFromProteinRecipe + proteinFromCarbRecipe) * adjustmentFactor + proteinFromVegetable + proteinFromSalad;
    totalCarbs = (carbsFromProteinRecipe + carbsFromCarbRecipe) * adjustmentFactor + carbsFromVegetable + carbsFromSalad;
    totalFat = (fatFromProteinRecipe + fatFromCarbRecipe) * adjustmentFactor + fatFromVegetable + fatFromSalad;

    setCalculation({
      proteinAmount: Math.round(proteinAmount),
      carbAmount: Math.round(carbAmount),
      vegetableAmount,
      saladAmount,
      totalCalories: Math.round(totalCalories),
      totalProtein: Math.round(totalProtein * 10) / 10,
      totalCarbs: Math.round(totalCarbs * 10) / 10,
      totalFat: Math.round(totalFat * 10) / 10,
      adjustmentFactor: Math.round(adjustmentFactor * 100) / 100,
    });
  }

  function handleCalculate() {
    setLoading(true);
    try {
      calculateMeal();
    } finally {
      setLoading(false);
    }
  }

  const customer = customers.find(c => c.id === selectedCustomerId);
  const proteinRecipes = recipes.filter(r => r.category === 'Proteína');
  const carbRecipes = recipes.filter(r => r.category === 'Carboidrato');
  const vegetableRecipes = recipes.filter(r => r.category === 'Legumes');
  const saladRecipes = recipes.filter(r => r.category === 'Salada');
  const sauceRecipes = recipes.filter(r => r.category === 'Molho Salada');

  const targetProtein = customer && selectedMealType === 'lunch' ? customer.lunch_protein : customer?.dinner_protein;
  const targetCarbs = customer && selectedMealType === 'lunch' ? customer.lunch_carbs : customer?.dinner_carbs;
  const targetFat = customer && selectedMealType === 'lunch' ? customer.lunch_fat : customer?.dinner_fat;
  const targetCalories = targetProtein && targetCarbs && targetFat
    ? (targetProtein * 4) + (targetCarbs * 4) + (targetFat * 9)
    : 0;

  const canCalculate = selectedCustomerId && selectedProteinId && selectedCarbId && targetProtein && targetCarbs && targetFat;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Calculadora de Refeições</h1>
          <p className="text-gray-600 mt-1">Calcule automaticamente as quantidades ideais para cada cliente</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuração da Refeição</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="customer">Cliente</Label>
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

              {selectedCustomerId && (
                <div>
                  <Label htmlFor="mealType">Turno</Label>
                  <Select value={selectedMealType} onValueChange={(value: 'lunch' | 'dinner') => setSelectedMealType(value)}>
                    <SelectTrigger id="mealType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lunch">Almoço</SelectItem>
                      <SelectItem value="dinner">Jantar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {customer && targetProtein && targetCarbs && targetFat && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">Metas do Cliente ({selectedMealType === 'lunch' ? 'Almoço' : 'Jantar'})</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-blue-700">Proteínas:</span>
                      <span className="font-medium ml-2">{targetProtein}g</span>
                    </div>
                    <div>
                      <span className="text-blue-700">Carboidratos:</span>
                      <span className="font-medium ml-2">{targetCarbs}g</span>
                    </div>
                    <div>
                      <span className="text-blue-700">Gorduras:</span>
                      <span className="font-medium ml-2">{targetFat}g</span>
                    </div>
                    <div>
                      <span className="text-blue-700">Calorias:</span>
                      <span className="font-medium ml-2">{Math.round(targetCalories)} kcal</span>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="protein">Receita de Proteína *</Label>
                <Select value={selectedProteinId} onValueChange={setSelectedProteinId}>
                  <SelectTrigger id="protein">
                    <SelectValue placeholder="Selecione a proteína" />
                  </SelectTrigger>
                  <SelectContent>
                    {proteinRecipes.map((recipe) => (
                      <SelectItem key={recipe.id} value={recipe.id}>
                        {recipe.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="carb">Receita de Carboidrato *</Label>
                <Select value={selectedCarbId} onValueChange={setSelectedCarbId}>
                  <SelectTrigger id="carb">
                    <SelectValue placeholder="Selecione o carboidrato" />
                  </SelectTrigger>
                  <SelectContent>
                    {carbRecipes.map((recipe) => (
                      <SelectItem key={recipe.id} value={recipe.id}>
                        {recipe.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="vegetable">Receita de Legumes (Opcional)</Label>
                <Select value={selectedVegetableId || undefined} onValueChange={setSelectedVegetableId}>
                  <SelectTrigger id="vegetable">
                    <SelectValue placeholder="Nenhum" />
                  </SelectTrigger>
                  <SelectContent>
                    {vegetableRecipes.map((recipe) => (
                      <SelectItem key={recipe.id} value={recipe.id}>
                        {recipe.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="salad">Receita de Salada (Opcional)</Label>
                <Select value={selectedSaladId || undefined} onValueChange={setSelectedSaladId}>
                  <SelectTrigger id="salad">
                    <SelectValue placeholder="Nenhuma" />
                  </SelectTrigger>
                  <SelectContent>
                    {saladRecipes.map((recipe) => (
                      <SelectItem key={recipe.id} value={recipe.id}>
                        {recipe.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="sauce">Molho (Opcional)</Label>
                <Select value={selectedSauceId || undefined} onValueChange={setSelectedSauceId}>
                  <SelectTrigger id="sauce">
                    <SelectValue placeholder="Nenhum" />
                  </SelectTrigger>
                  <SelectContent>
                    {sauceRecipes.map((recipe) => (
                      <SelectItem key={recipe.id} value={recipe.id}>
                        {recipe.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleCalculate}
                disabled={!canCalculate || loading}
                className="w-full"
              >
                <CalcIcon className="h-4 w-4 mr-2" />
                Calcular Quantidades
              </Button>

              {!canCalculate && selectedCustomerId && (
                <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded p-3">
                  Este cliente precisa ter as metas de macronutrientes configuradas para o turno selecionado.
                </p>
              )}
            </CardContent>
          </Card>

          {calculation && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-600" />
                  Resultado do Cálculo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Quantidades por Receita</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-700">
                        {recipes.find(r => r.id === selectedProteinId)?.name}
                      </span>
                      <span className="font-bold text-lg">{calculation.proteinAmount}g</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-700">
                        {recipes.find(r => r.id === selectedCarbId)?.name}
                      </span>
                      <span className="font-bold text-lg">{calculation.carbAmount}g</span>
                    </div>
                    {selectedVegetableId && (
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="text-gray-700">
                          {recipes.find(r => r.id === selectedVegetableId)?.name}
                        </span>
                        <span className="font-bold text-lg">{calculation.vegetableAmount}g</span>
                      </div>
                    )}
                    {selectedSaladId && (
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="text-gray-700">
                          {recipes.find(r => r.id === selectedSaladId)?.name}
                        </span>
                        <span className="font-bold text-lg">{calculation.saladAmount}g</span>
                      </div>
                    )}
                    {selectedSauceId && (
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="text-gray-700">
                          {recipes.find(r => r.id === selectedSauceId)?.name}
                        </span>
                        <span className="font-bold text-lg">À gosto</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Totais Nutricionais</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="text-sm text-blue-700">Calorias</div>
                      <div className="text-xl font-bold text-blue-900">{calculation.totalCalories} kcal</div>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="text-sm text-green-700">Proteínas</div>
                      <div className="text-xl font-bold text-green-900">{calculation.totalProtein}g</div>
                    </div>
                    <div className="bg-orange-50 p-3 rounded-lg">
                      <div className="text-sm text-orange-700">Carboidratos</div>
                      <div className="text-xl font-bold text-orange-900">{calculation.totalCarbs}g</div>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-lg">
                      <div className="text-sm text-purple-700">Gorduras</div>
                      <div className="text-xl font-bold text-purple-900">{calculation.totalFat}g</div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-100 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">Fator de Ajuste</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {calculation.adjustmentFactor}x
                    <span className="text-sm font-normal text-gray-600 ml-2">
                      ({calculation.adjustmentFactor > 1 ? '+' : ''}{Math.round((calculation.adjustmentFactor - 1) * 100)}%)
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Este fator foi aplicado às receitas de proteína e carboidrato para atingir a meta calórica.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
