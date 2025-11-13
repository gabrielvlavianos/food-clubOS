'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { CustomerWithAddresses } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import {
  MAIN_GOALS,
  COMMON_ALLERGENS,
  WORK_ROUTINES,
  FREQUENCY_OPTIONS,
  INTENSITY_OPTIONS,
  GENDER_OPTIONS,
} from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

interface EditCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
  customer: CustomerWithAddresses | null;
}

export function EditCustomerDialog({
  open,
  onOpenChange,
  onUpdated,
  customer,
}: EditCustomerDialogProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('');
  const [nutritionistName, setNutritionistName] = useState('não tenho');
  const [nutritionistPhone, setNutritionistPhone] = useState('');
  const [mainGoal, setMainGoal] = useState('');
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);
  const [foodRestrictions, setFoodRestrictions] = useState('');
  const [height, setHeight] = useState('');
  const [currentWeight, setCurrentWeight] = useState('');
  const [goalWeight, setGoalWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [muscleMass, setMuscleMass] = useState('');
  const [workRoutine, setWorkRoutine] = useState('');
  const [aerobicFrequency, setAerobicFrequency] = useState('');
  const [aerobicIntensity, setAerobicIntensity] = useState('');
  const [strengthFrequency, setStrengthFrequency] = useState('');
  const [strengthIntensity, setStrengthIntensity] = useState('');
  const [clinicalConditions, setClinicalConditions] = useState('');
  const [mealsPerDay, setMealsPerDay] = useState('');
  const [lunchCarbs, setLunchCarbs] = useState('');
  const [lunchProtein, setLunchProtein] = useState('');
  const [lunchFat, setLunchFat] = useState('');
  const [dinnerCarbs, setDinnerCarbs] = useState('');
  const [dinnerProtein, setDinnerProtein] = useState('');
  const [dinnerFat, setDinnerFat] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (customer && open) {
      setName(customer.name || '');
      setPhone(customer.phone || '');
      setBirthDate(customer.birth_date || '');
      setGender(customer.gender || '');
      setNutritionistName(customer.nutritionist_name || 'não tenho');
      setNutritionistPhone(customer.nutritionist_phone || '');
      setMainGoal(customer.main_goal || '');
      setSelectedAllergies(customer.allergies || []);
      setFoodRestrictions(customer.food_restrictions || '');
      setHeight(customer.height_cm?.toString() || '');
      setCurrentWeight(customer.current_weight_kg?.toString() || '');
      setGoalWeight(customer.goal_weight_kg?.toString() || '');
      setBodyFat(customer.body_fat_percentage?.toString() || '');
      setMuscleMass(customer.skeletal_muscle_mass?.toString() || '');
      setWorkRoutine(customer.work_routine || '');
      setAerobicFrequency(customer.aerobic_frequency || '');
      setAerobicIntensity(customer.aerobic_intensity || '');
      setStrengthFrequency(customer.strength_frequency || '');
      setStrengthIntensity(customer.strength_intensity || '');
      setClinicalConditions(customer.clinical_conditions || '');
      setMealsPerDay(customer.meals_per_day?.toString() || '');
      setLunchCarbs(customer.lunch_carbs?.toString() || '');
      setLunchProtein(customer.lunch_protein?.toString() || '');
      setLunchFat(customer.lunch_fat?.toString() || '');
      setDinnerCarbs(customer.dinner_carbs?.toString() || '');
      setDinnerProtein(customer.dinner_protein?.toString() || '');
      setDinnerFat(customer.dinner_fat?.toString() || '');
    }
  }, [customer, open]);

  function handleAllergyToggle(allergen: string) {
    setSelectedAllergies(prev =>
      prev.includes(allergen)
        ? prev.filter(a => a !== allergen)
        : [...prev, allergen]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customer) return;

    setLoading(true);

    try {
      const updateData: any = {
        name,
        phone: phone || null,
        birth_date: birthDate || null,
        gender: gender || null,
        nutritionist_name: nutritionistName,
        nutritionist_phone: nutritionistPhone || null,
        main_goal: mainGoal || null,
        allergies: selectedAllergies.length > 0 ? selectedAllergies : [],
        food_restrictions: foodRestrictions || null,
        height_cm: height ? parseFloat(height) : null,
        current_weight_kg: currentWeight ? parseFloat(currentWeight) : null,
        goal_weight_kg: goalWeight ? parseFloat(goalWeight) : null,
        body_fat_percentage: bodyFat ? parseFloat(bodyFat) : null,
        skeletal_muscle_mass: muscleMass ? parseFloat(muscleMass) : null,
        work_routine: workRoutine || null,
        aerobic_frequency: aerobicFrequency || null,
        aerobic_intensity: aerobicIntensity || null,
        strength_frequency: strengthFrequency || null,
        strength_intensity: strengthIntensity || null,
        clinical_conditions: clinicalConditions || null,
        meals_per_day: mealsPerDay ? parseInt(mealsPerDay) : null,
        lunch_carbs: lunchCarbs ? parseFloat(lunchCarbs) : null,
        lunch_protein: lunchProtein ? parseFloat(lunchProtein) : null,
        lunch_fat: lunchFat ? parseFloat(lunchFat) : null,
        dinner_carbs: dinnerCarbs ? parseFloat(dinnerCarbs) : null,
        dinner_protein: dinnerProtein ? parseFloat(dinnerProtein) : null,
        dinner_fat: dinnerFat ? parseFloat(dinnerFat) : null,
      };

      const { error: customerError } = await (supabase as any)
        .from('customers')
        .update(updateData)
        .eq('id', customer.id);

      if (customerError) throw customerError;

      toast({
        title: 'Cliente atualizado',
        description: 'Informações do cliente atualizadas com sucesso',
      });

      onOpenChange(false);
      onUpdated();
    } catch (error) {
      console.error('Error updating customer:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o cliente',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  if (!customer) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Cliente</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="personal">Pessoal</TabsTrigger>
              <TabsTrigger value="goals">Objetivos</TabsTrigger>
              <TabsTrigger value="macros">Macros</TabsTrigger>
              <TabsTrigger value="body">Corpo</TabsTrigger>
              <TabsTrigger value="health">Saúde</TabsTrigger>
            </TabsList>

            <TabsContent value="personal" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Telefone/WhatsApp</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="birthDate">Data de Nascimento</Label>
                  <Input
                    id="birthDate"
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="gender">Gênero</Label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger id="gender">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {GENDER_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nutritionistName">Nome do Nutricionista</Label>
                  <Input
                    id="nutritionistName"
                    value={nutritionistName}
                    onChange={(e) => setNutritionistName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="nutritionistPhone">Telefone do Nutricionista</Label>
                  <Input
                    id="nutritionistPhone"
                    value={nutritionistPhone}
                    onChange={(e) => setNutritionistPhone(e.target.value)}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="goals" className="space-y-4">
              <div>
                <Label htmlFor="mainGoal">Objetivo Principal</Label>
                <Select value={mainGoal} onValueChange={setMainGoal}>
                  <SelectTrigger id="mainGoal">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {MAIN_GOALS.map((goal) => (
                      <SelectItem key={goal} value={goal}>
                        {goal}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Alergias</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {COMMON_ALLERGENS.map((allergen) => (
                    <div key={allergen} className="flex items-center space-x-2">
                      <Checkbox
                        id={`allergen-${allergen}`}
                        checked={selectedAllergies.includes(allergen)}
                        onCheckedChange={() => handleAllergyToggle(allergen)}
                      />
                      <Label
                        htmlFor={`allergen-${allergen}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {allergen}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="foodRestrictions">Restrições Alimentares</Label>
                <Textarea
                  id="foodRestrictions"
                  value={foodRestrictions}
                  onChange={(e) => setFoodRestrictions(e.target.value)}
                  placeholder="Ex: Vegetariano, não come carne vermelha..."
                />
              </div>

              <div>
                <Label htmlFor="workRoutine">Rotina de Trabalho</Label>
                <Select value={workRoutine} onValueChange={setWorkRoutine}>
                  <SelectTrigger id="workRoutine">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {WORK_ROUTINES.map((routine) => (
                      <SelectItem key={routine} value={routine}>
                        {routine}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="font-medium">Exercícios Aeróbicos</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="aerobicFrequency">Frequência</Label>
                    <Select value={aerobicFrequency} onValueChange={setAerobicFrequency}>
                      <SelectTrigger id="aerobicFrequency">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {FREQUENCY_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="aerobicIntensity">Intensidade</Label>
                    <Select value={aerobicIntensity} onValueChange={setAerobicIntensity}>
                      <SelectTrigger id="aerobicIntensity">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {INTENSITY_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">Musculação</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="strengthFrequency">Frequência</Label>
                    <Select value={strengthFrequency} onValueChange={setStrengthFrequency}>
                      <SelectTrigger id="strengthFrequency">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {FREQUENCY_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="strengthIntensity">Intensidade</Label>
                    <Select value={strengthIntensity} onValueChange={setStrengthIntensity}>
                      <SelectTrigger id="strengthIntensity">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {INTENSITY_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="mealsPerDay">Refeições por Dia</Label>
                <Input
                  id="mealsPerDay"
                  type="number"
                  min="1"
                  max="10"
                  value={mealsPerDay}
                  onChange={(e) => setMealsPerDay(e.target.value)}
                />
              </div>
            </TabsContent>

            <TabsContent value="macros" className="space-y-4">
              <div className="space-y-3">
                <h4 className="font-medium text-lg">Almoço</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="lunchCarbs">Carboidratos (g)</Label>
                    <Input
                      id="lunchCarbs"
                      type="number"
                      step="0.1"
                      value={lunchCarbs}
                      onChange={(e) => setLunchCarbs(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="lunchProtein">Proteínas (g)</Label>
                    <Input
                      id="lunchProtein"
                      type="number"
                      step="0.1"
                      value={lunchProtein}
                      onChange={(e) => setLunchProtein(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="lunchFat">Gorduras (g)</Label>
                    <Input
                      id="lunchFat"
                      type="number"
                      step="0.1"
                      value={lunchFat}
                      onChange={(e) => setLunchFat(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="font-medium text-lg">Jantar</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="dinnerCarbs">Carboidratos (g)</Label>
                    <Input
                      id="dinnerCarbs"
                      type="number"
                      step="0.1"
                      value={dinnerCarbs}
                      onChange={(e) => setDinnerCarbs(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="dinnerProtein">Proteínas (g)</Label>
                    <Input
                      id="dinnerProtein"
                      type="number"
                      step="0.1"
                      value={dinnerProtein}
                      onChange={(e) => setDinnerProtein(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="dinnerFat">Gorduras (g)</Label>
                    <Input
                      id="dinnerFat"
                      type="number"
                      step="0.1"
                      value={dinnerFat}
                      onChange={(e) => setDinnerFat(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="body" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="height">Altura (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    step="0.1"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="currentWeight">Peso Atual (kg)</Label>
                  <Input
                    id="currentWeight"
                    type="number"
                    step="0.1"
                    value={currentWeight}
                    onChange={(e) => setCurrentWeight(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="goalWeight">Peso Desejado (kg)</Label>
                  <Input
                    id="goalWeight"
                    type="number"
                    step="0.1"
                    value={goalWeight}
                    onChange={(e) => setGoalWeight(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="bodyFat">Gordura Corporal (%)</Label>
                  <Input
                    id="bodyFat"
                    type="number"
                    step="0.1"
                    value={bodyFat}
                    onChange={(e) => setBodyFat(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="muscleMass">Massa Muscular Esquelética (%)</Label>
                <Input
                  id="muscleMass"
                  type="number"
                  step="0.1"
                  value={muscleMass}
                  onChange={(e) => setMuscleMass(e.target.value)}
                />
              </div>
            </TabsContent>

            <TabsContent value="health" className="space-y-4">
              <div>
                <Label htmlFor="clinicalConditions">Condições Clínicas</Label>
                <Textarea
                  id="clinicalConditions"
                  value={clinicalConditions}
                  onChange={(e) => setClinicalConditions(e.target.value)}
                  placeholder="Ex: Diabetes, hipertensão..."
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
