'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';
import type { Customer } from '@/types';
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
  DAYS_OF_WEEK,
  MEAL_TYPES
} from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

interface CreateCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

interface DeliveryScheduleForm {
  [key: string]: {
    time: string;
    address: string;
  };
}

export function CreateCustomerDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateCustomerDialogProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('');
  const [nutritionistName, setNutritionistName] = useState('não tenho');
  const [nutritionistPhone, setNutritionistPhone] = useState('');
  const [mainGoal, setMainGoal] = useState('');
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);
  const [foodRestrictions, setFoodRestrictions] = useState('');
  const [deliverySchedules, setDeliverySchedules] = useState<DeliveryScheduleForm>({});
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

  function handleAllergyToggle(allergen: string) {
    setSelectedAllergies(prev =>
      prev.includes(allergen)
        ? prev.filter(a => a !== allergen)
        : [...prev, allergen]
    );
  }

  function handleDeliveryScheduleChange(day: string, meal: string, field: 'time' | 'address', value: string) {
    const key = `${day}_${meal}`;
    setDeliverySchedules(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value
      }
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .insert([{
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
        }] as any)
        .select()
        .single();

      if (customerError) throw customerError;
      if (!customerData) throw new Error('Customer data not returned');

      const customer = customerData as Customer;

      const dayKeyToNumber: Record<string, number> = {
        'monday': 1,
        'tuesday': 2,
        'wednesday': 3,
        'thursday': 4,
        'friday': 5,
        'saturday': 6,
        'sunday': 0,
      };

      const schedules = Object.entries(deliverySchedules)
        .filter(([_, schedule]) => schedule.time || schedule.address)
        .map(([key, schedule]) => {
          const [day, meal] = key.split('_');
          return {
            customer_id: customer.id,
            day_of_week: dayKeyToNumber[day],
            meal_type: meal,
            delivery_time: schedule.time || null,
            delivery_address: schedule.address || null,
          };
        });

      if (schedules.length > 0) {
        const { error: scheduleError } = await supabase
          .from('delivery_schedules')
          .insert(schedules as any);

        if (scheduleError) throw scheduleError;
      }

      toast({
        title: 'Cliente criado',
        description: 'Cliente adicionado com sucesso',
      });

      resetForm();
      onOpenChange(false);
      onCreated();
    } catch (error) {
      console.error('Error creating customer:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o cliente',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setName('');
    setPhone('');
    setBirthDate('');
    setGender('');
    setNutritionistName('não tenho');
    setNutritionistPhone('');
    setMainGoal('');
    setSelectedAllergies([]);
    setFoodRestrictions('');
    setDeliverySchedules({});
    setHeight('');
    setCurrentWeight('');
    setGoalWeight('');
    setBodyFat('');
    setMuscleMass('');
    setWorkRoutine('');
    setAerobicFrequency('');
    setAerobicIntensity('');
    setStrengthFrequency('');
    setStrengthIntensity('');
    setClinicalConditions('');
    setMealsPerDay('');
    setLunchCarbs('');
    setLunchProtein('');
    setLunchFat('');
    setDinnerCarbs('');
    setDinnerProtein('');
    setDinnerFat('');
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Cliente - Cadastro Completo</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="personal">Pessoal</TabsTrigger>
              <TabsTrigger value="goals">Objetivos</TabsTrigger>
              <TabsTrigger value="macros">Macronutrientes</TabsTrigger>
              <TabsTrigger value="delivery">Entrega</TabsTrigger>
              <TabsTrigger value="health">Saúde & Fitness</TabsTrigger>
            </TabsList>

            <TabsContent value="personal" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="name">Nome Completo *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nome completo"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Telefone *</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+5511912345678"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="birthDate">Data de Nascimento</Label>
                  <Input
                    id="birthDate"
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="gender">Sexo</Label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger>
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

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="nutritionistName">Nome da Nutricionista</Label>
                  <Input
                    id="nutritionistName"
                    value={nutritionistName}
                    onChange={(e) => setNutritionistName(e.target.value)}
                    placeholder='Coloque "não tenho" se não tiver'
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="nutritionistPhone">Telefone da Nutricionista</Label>
                  <Input
                    id="nutritionistPhone"
                    value={nutritionistPhone}
                    onChange={(e) => setNutritionistPhone(e.target.value)}
                    placeholder="+5511912345678"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="goals" className="space-y-4">
              <div>
                <Label htmlFor="mainGoal">Objetivo Principal com o Food Club</Label>
                <Select value={mainGoal} onValueChange={setMainGoal}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione seu objetivo" />
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
                <Label>Alergias ou Intolerâncias Alimentares</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {COMMON_ALLERGENS.map((allergen) => (
                    <div key={allergen} className="flex items-center space-x-2">
                      <Checkbox
                        id={`allergy-${allergen}`}
                        checked={selectedAllergies.includes(allergen)}
                        onCheckedChange={() => handleAllergyToggle(allergen)}
                      />
                      <label
                        htmlFor={`allergy-${allergen}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {allergen}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="foodRestrictions">Alimentos que Não Consome por Escolha Própria</Label>
                <Textarea
                  id="foodRestrictions"
                  value={foodRestrictions}
                  onChange={(e) => setFoodRestrictions(e.target.value)}
                  placeholder="Ex: Carne vermelha, frutos do mar, etc."
                  rows={3}
                />
              </div>
            </TabsContent>

            <TabsContent value="macros" className="space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                Defina as metas de macronutrientes (em gramas) para cada refeição do dia.
              </p>

              <div className="border rounded-lg p-4 space-y-4">
                <h4 className="font-semibold text-lg text-gray-900">Almoço</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="lunchCarbs">Carboidratos (g)</Label>
                    <Input
                      id="lunchCarbs"
                      type="number"
                      step="0.01"
                      value={lunchCarbs}
                      onChange={(e) => setLunchCarbs(e.target.value)}
                      placeholder="Ex: 50"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lunchProtein">Proteínas (g)</Label>
                    <Input
                      id="lunchProtein"
                      type="number"
                      step="0.01"
                      value={lunchProtein}
                      onChange={(e) => setLunchProtein(e.target.value)}
                      placeholder="Ex: 35"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lunchFat">Gorduras (g)</Label>
                    <Input
                      id="lunchFat"
                      type="number"
                      step="0.01"
                      value={lunchFat}
                      onChange={(e) => setLunchFat(e.target.value)}
                      placeholder="Ex: 15"
                    />
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-4 space-y-4">
                <h4 className="font-semibold text-lg text-gray-900">Jantar</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="dinnerCarbs">Carboidratos (g)</Label>
                    <Input
                      id="dinnerCarbs"
                      type="number"
                      step="0.01"
                      value={dinnerCarbs}
                      onChange={(e) => setDinnerCarbs(e.target.value)}
                      placeholder="Ex: 40"
                    />
                  </div>
                  <div>
                    <Label htmlFor="dinnerProtein">Proteínas (g)</Label>
                    <Input
                      id="dinnerProtein"
                      type="number"
                      step="0.01"
                      value={dinnerProtein}
                      onChange={(e) => setDinnerProtein(e.target.value)}
                      placeholder="Ex: 30"
                    />
                  </div>
                  <div>
                    <Label htmlFor="dinnerFat">Gorduras (g)</Label>
                    <Input
                      id="dinnerFat"
                      type="number"
                      step="0.01"
                      value={dinnerFat}
                      onChange={(e) => setDinnerFat(e.target.value)}
                      placeholder="Ex: 12"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="delivery" className="space-y-4">
              <p className="text-sm text-gray-600">
                Configure os dias, horários e endereços de entrega. Deixe em branco os dias que não receberá.
              </p>

              {DAYS_OF_WEEK.map(({ key: day, label: dayLabel }) => (
                <div key={day} className="border rounded-lg p-4 space-y-3">
                  <h4 className="font-medium">{dayLabel}</h4>

                  {MEAL_TYPES.map(({ key: meal, label: mealLabel }) => (
                    <div key={meal} className="space-y-2 pl-4">
                      <p className="text-sm font-medium text-gray-700">{mealLabel}</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor={`${day}-${meal}-time`} className="text-xs">Horário</Label>
                          <Input
                            id={`${day}-${meal}-time`}
                            type="time"
                            value={deliverySchedules[`${day}_${meal}`]?.time || ''}
                            onChange={(e) => handleDeliveryScheduleChange(day, meal, 'time', e.target.value)}
                            placeholder="HH:MM"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`${day}-${meal}-address`} className="text-xs">Endereço</Label>
                          <Input
                            id={`${day}-${meal}-address`}
                            value={deliverySchedules[`${day}_${meal}`]?.address || ''}
                            onChange={(e) => handleDeliveryScheduleChange(day, meal, 'address', e.target.value)}
                            placeholder="Rua, número, CEP, complemento"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </TabsContent>

            <TabsContent value="health" className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="height">Altura (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    placeholder="175"
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
                    placeholder="82"
                  />
                </div>

                <div>
                  <Label htmlFor="goalWeight">Meta de Peso (kg)</Label>
                  <Input
                    id="goalWeight"
                    type="number"
                    step="0.1"
                    value={goalWeight}
                    onChange={(e) => setGoalWeight(e.target.value)}
                    placeholder="82"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bodyFat">% Gordura Corporal</Label>
                  <Input
                    id="bodyFat"
                    type="number"
                    step="0.1"
                    value={bodyFat}
                    onChange={(e) => setBodyFat(e.target.value)}
                    placeholder="16"
                  />
                </div>

                <div>
                  <Label htmlFor="muscleMass">Massa Muscular Esquelética (kg)</Label>
                  <Input
                    id="muscleMass"
                    type="number"
                    step="0.1"
                    value={muscleMass}
                    onChange={(e) => setMuscleMass(e.target.value)}
                    placeholder="35"
                  />
                </div>
              </div>

              <Separator />

              <div>
                <Label htmlFor="workRoutine">Rotina de Trabalho</Label>
                <Select value={workRoutine} onValueChange={setWorkRoutine}>
                  <SelectTrigger>
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="aerobicFrequency">Frequência de Atividade Aeróbica</Label>
                  <Select value={aerobicFrequency} onValueChange={setAerobicFrequency}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {FREQUENCY_OPTIONS.map((freq) => (
                        <SelectItem key={freq} value={freq}>
                          {freq}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="aerobicIntensity">Intensidade Aeróbica</Label>
                  <Select value={aerobicIntensity} onValueChange={setAerobicIntensity}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {INTENSITY_OPTIONS.map((intensity) => (
                        <SelectItem key={intensity} value={intensity}>
                          {intensity}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="strengthFrequency">Frequência de Treino de Força</Label>
                  <Select value={strengthFrequency} onValueChange={setStrengthFrequency}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {FREQUENCY_OPTIONS.map((freq) => (
                        <SelectItem key={freq} value={freq}>
                          {freq}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="strengthIntensity">Intensidade do Treino de Força</Label>
                  <Select value={strengthIntensity} onValueChange={setStrengthIntensity}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {INTENSITY_OPTIONS.map((intensity) => (
                        <SelectItem key={intensity} value={intensity}>
                          {intensity}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div>
                <Label htmlFor="clinicalConditions">Condições Clínicas ou Medicações</Label>
                <Textarea
                  id="clinicalConditions"
                  value={clinicalConditions}
                  onChange={(e) => setClinicalConditions(e.target.value)}
                  placeholder="Descreva condições clínicas relevantes ou medicações em uso"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="mealsPerDay">Número de Refeições por Dia</Label>
                <Input
                  id="mealsPerDay"
                  type="number"
                  min="1"
                  max="10"
                  value={mealsPerDay}
                  onChange={(e) => setMealsPerDay(e.target.value)}
                  placeholder="3"
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Criar Cliente'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
