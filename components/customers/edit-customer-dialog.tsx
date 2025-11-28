'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { calculateMacroRecommendation } from '@/lib/calculations';
import type { CustomerWithAddresses, CustomerDocument } from '@/types';
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

interface EditCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
  customer: CustomerWithAddresses | null;
}

interface DeliveryScheduleForm {
  [key: string]: {
    id?: string;
    time: string;
    address: string;
  };
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
  const [otherAllergies, setOtherAllergies] = useState('');
  const [foodRestrictions, setFoodRestrictions] = useState('');
  const [medicationUse, setMedicationUse] = useState('');
  const [dietaryNotes, setDietaryNotes] = useState('');
  const [mealPlanFileUrl, setMealPlanFileUrl] = useState('');
  const [documents, setDocuments] = useState<CustomerDocument[]>([]);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [newFileDescription, setNewFileDescription] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
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
  const [hasNutritionist, setHasNutritionist] = useState(false);
  const [macroSuggestions, setMacroSuggestions] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    async function loadCustomerData() {
      if (customer && open) {
        setName(customer.name || '');
        setPhone(customer.phone || '');
        setBirthDate(customer.birth_date || '');
        setGender(customer.gender || '');
        setNutritionistName(customer.nutritionist_name || 'não tenho');
        setNutritionistPhone(customer.nutritionist_phone || '');
        setMainGoal(customer.main_goal || '');
        setSelectedAllergies(customer.allergies || []);
        setOtherAllergies(customer.other_allergies || '');
        setFoodRestrictions(customer.food_restrictions || '');
        setMedicationUse(customer.medication_use || '');
        setDietaryNotes(customer.dietary_notes || '');
        setMealPlanFileUrl(customer.meal_plan_file_url || '');

        const { data: customerDocuments } = await supabase
          .from('customer_documents')
          .select('*')
          .eq('customer_id', customer.id)
          .order('uploaded_at', { ascending: false });

        if (customerDocuments) {
          setDocuments(customerDocuments);
        }

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
        setHasNutritionist(customer.has_nutritionist || false);

        if (!customer.has_nutritionist &&
            customer.height_cm && customer.current_weight_kg &&
            customer.goal_weight_kg && customer.birth_date &&
            customer.work_routine && customer.aerobic_frequency &&
            customer.aerobic_intensity && customer.strength_frequency &&
            customer.strength_intensity && customer.main_goal) {
          try {
            const suggestions = await calculateMacroRecommendation({
              gender: customer.gender || 'Masculino',
              height_cm: customer.height_cm,
              current_weight_kg: customer.current_weight_kg,
              goal_weight_kg: customer.goal_weight_kg,
              work_routine: customer.work_routine,
              aerobic_frequency: customer.aerobic_frequency,
              aerobic_intensity: customer.aerobic_intensity,
              strength_frequency: customer.strength_frequency,
              strength_intensity: customer.strength_intensity,
              main_goal: customer.main_goal,
              birth_date: customer.birth_date,
              meals_per_day: customer.meals_per_day || 3
            });
            setMacroSuggestions(suggestions);
          } catch (error) {
            console.error('Error calculating macro suggestions:', error);
          }
        }

        const { data: schedules } = await supabase
          .from('delivery_schedules')
          .select('*')
          .eq('customer_id', customer.id);

        if (schedules) {
          const dayNumberToKey: Record<number, string> = {
            1: 'monday',
            2: 'tuesday',
            3: 'wednesday',
            4: 'thursday',
            5: 'friday',
            6: 'saturday',
            7: 'sunday',
          };

          const schedulesMap: DeliveryScheduleForm = {};
          schedules.forEach((schedule: any) => {
            const dayKey = dayNumberToKey[schedule.day_of_week];
            if (dayKey) {
              const key = `${dayKey}_${schedule.meal_type}`;
              schedulesMap[key] = {
                id: schedule.id,
                time: schedule.delivery_time || '',
                address: schedule.delivery_address || '',
              };
            }
          });
          setDeliverySchedules(schedulesMap);
        }
      }
    }

    loadCustomerData();
  }, [customer, open]);

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

  async function handleAddDocument() {
    if (!newFile || !customer) return;

    setUploadingFile(true);
    try {
      const fileExt = newFile.name.split('.').pop();
      const fileName = `${customer.id}-${Date.now()}.${fileExt}`;
      const filePath = `customer-documents/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('customer-files')
        .upload(filePath, newFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('customer-files')
        .getPublicUrl(filePath);

      const { error: dbError } = await (supabase as any)
        .from('customer_documents')
        .insert({
          customer_id: customer.id,
          file_name: newFile.name,
          file_url: publicUrl,
          file_type: 'document',
          description: newFileDescription.trim() || 'Documento sem descrição',
        });

      if (dbError) throw dbError;

      const { data: customerDocuments } = await supabase
        .from('customer_documents')
        .select('*')
        .eq('customer_id', customer.id)
        .order('uploaded_at', { ascending: false });

      if (customerDocuments) {
        setDocuments(customerDocuments);
      }

      setNewFile(null);
      setNewFileDescription('');

      toast({
        title: 'Documento adicionado',
        description: 'Documento enviado com sucesso',
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível enviar o arquivo',
        variant: 'destructive',
      });
    } finally {
      setUploadingFile(false);
    }
  }

  async function handleDeleteDocument(documentId: string) {
    if (!customer) return;

    try {
      const { error } = await supabase
        .from('customer_documents')
        .delete()
        .eq('id', documentId);

      if (error) throw error;

      const { data: customerDocuments } = await supabase
        .from('customer_documents')
        .select('*')
        .eq('customer_id', customer.id)
        .order('uploaded_at', { ascending: false });

      if (customerDocuments) {
        setDocuments(customerDocuments);
      }

      toast({
        title: 'Documento removido',
        description: 'Documento removido com sucesso',
      });
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover o documento',
        variant: 'destructive',
      });
    }
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
        other_allergies: otherAllergies || null,
        food_restrictions: foodRestrictions || null,
        medication_use: medicationUse || null,
        dietary_notes: dietaryNotes || null,
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

      const dayKeyToNumber: Record<string, number> = {
        'monday': 1,
        'tuesday': 2,
        'wednesday': 3,
        'thursday': 4,
        'friday': 5,
        'saturday': 6,
        'sunday': 7,
      };

      for (const [key, schedule] of Object.entries(deliverySchedules)) {
        const [day, meal] = key.split('_');
        const dayOfWeek = dayKeyToNumber[day];

        const hasData = schedule.time && schedule.address;

        if (hasData) {
          const scheduleData = {
            customer_id: customer.id,
            day_of_week: dayOfWeek,
            meal_type: meal,
            delivery_time: schedule.time,
            delivery_address: schedule.address,
            is_active: true
          };

          if (schedule.id) {
            await (supabase as any)
              .from('delivery_schedules')
              .update(scheduleData)
              .eq('id', schedule.id);
          } else {
            await (supabase as any)
              .from('delivery_schedules')
              .insert(scheduleData);
          }
        } else if (schedule.id) {
          await (supabase as any)
            .from('delivery_schedules')
            .delete()
            .eq('id', schedule.id);
        }
      }

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
          <DialogTitle>Editar Cliente - {customer.name}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="personal">Pessoal</TabsTrigger>
              <TabsTrigger value="goals">Objetivos</TabsTrigger>
              <TabsTrigger value="macros">Macronutrientes</TabsTrigger>
              <TabsTrigger value="delivery">Entrega</TabsTrigger>
              <TabsTrigger value="health">Saúde & Fitness</TabsTrigger>
              <TabsTrigger value="files">Arquivos</TabsTrigger>
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
                <div>
                  <Label htmlFor="nutritionistName">Nutricionista</Label>
                  <Input
                    id="nutritionistName"
                    value={nutritionistName}
                    onChange={(e) => setNutritionistName(e.target.value)}
                    placeholder="Nome do nutricionista ou 'não tenho'"
                  />
                </div>

                <div>
                  <Label htmlFor="nutritionistPhone">Contato do Nutricionista</Label>
                  <Input
                    id="nutritionistPhone"
                    value={nutritionistPhone}
                    onChange={(e) => setNutritionistPhone(e.target.value)}
                    placeholder="Telefone ou WhatsApp"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="goals" className="space-y-4">
              <div>
                <Label htmlFor="mainGoal">Objetivo Principal</Label>
                <Select value={mainGoal} onValueChange={setMainGoal}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o objetivo principal" />
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

              <Separator />

              <div>
                <Label className="mb-3 block">Alergias Alimentares</Label>
                <div className="grid grid-cols-3 gap-3">
                  {COMMON_ALLERGENS.map((allergen) => (
                    <div key={allergen} className="flex items-center space-x-2">
                      <Checkbox
                        id={`edit-allergen-${allergen}`}
                        checked={selectedAllergies.includes(allergen)}
                        onCheckedChange={() => handleAllergyToggle(allergen)}
                      />
                      <Label
                        htmlFor={`edit-allergen-${allergen}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {allergen}
                      </Label>
                    </div>
                  ))}
                </div>
                {selectedAllergies.includes('Outros') && (
                  <div className="mt-3">
                    <Label htmlFor="otherAllergies">Outras Alergias ou Intolerâncias</Label>
                    <Textarea
                      id="otherAllergies"
                      value={otherAllergies}
                      onChange={(e) => setOtherAllergies(e.target.value)}
                      placeholder="Descreva outras alergias ou intolerâncias"
                      rows={2}
                    />
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="foodRestrictions">Restrições Alimentares ou Preferências</Label>
                <Textarea
                  id="foodRestrictions"
                  value={foodRestrictions}
                  onChange={(e) => setFoodRestrictions(e.target.value)}
                  placeholder="Ex: Vegetariano, não come carne vermelha, prefere frango..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="medicationUse">Uso de Medicamentos</Label>
                <Textarea
                  id="medicationUse"
                  value={medicationUse}
                  onChange={(e) => setMedicationUse(e.target.value)}
                  placeholder="Liste os medicamentos em uso"
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="dietaryNotes">Notas Dietéticas</Label>
                <Textarea
                  id="dietaryNotes"
                  value={dietaryNotes}
                  onChange={(e) => setDietaryNotes(e.target.value)}
                  placeholder="Informações adicionais sobre a dieta"
                  rows={2}
                />
              </div>
            </TabsContent>

            <TabsContent value="macros" className="space-y-4">
              {!hasNutritionist && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🤖</span>
                    <div>
                      <p className="font-semibold text-blue-900">Recomendação Automática</p>
                      <p className="text-xs text-blue-700">Cliente sem nutricionista - valores calculados com base nas informações fornecidas</p>
                    </div>
                  </div>
                  {macroSuggestions && (
                    <div className="text-xs text-blue-800 mt-2 space-y-1">
                      <p className="font-medium">Meta diária: {macroSuggestions.daily.kcal} kcal</p>
                      <p>Proteína: {macroSuggestions.daily.protein}g | Carboidrato: {macroSuggestions.daily.carb}g | Gordura: {macroSuggestions.daily.fat}g</p>
                    </div>
                  )}
                </div>
              )}
              {hasNutritionist && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">👩‍⚕️</span>
                    <div>
                      <p className="font-semibold text-green-900">Com Nutricionista</p>
                      <p className="text-xs text-green-700">Valores fornecidos pela nutricionista do cliente</p>
                    </div>
                  </div>
                </div>
              )}
              <p className="text-sm text-gray-600">
                Defina as metas de macronutrientes para cada refeição do dia.
              </p>

              <div className="border rounded-lg p-4 space-y-4">
                <h4 className="font-semibold text-lg text-gray-900">Almoço</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <Label htmlFor="lunchCarbs">Carboidratos (g)</Label>
                      {!hasNutritionist && macroSuggestions && (
                        <span className="text-xs text-blue-600 font-medium">↗ {macroSuggestions.lunch.carb}g</span>
                      )}
                    </div>
                    <Input
                      id="lunchCarbs"
                      type="number"
                      step="0.01"
                      value={lunchCarbs}
                      onChange={(e) => setLunchCarbs(e.target.value)}
                      placeholder={!hasNutritionist && macroSuggestions ? `Sugestão: ${macroSuggestions.lunch.carb}` : "Ex: 50"}
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <Label htmlFor="lunchProtein">Proteínas (g)</Label>
                      {!hasNutritionist && macroSuggestions && (
                        <span className="text-xs text-blue-600 font-medium">↗ {macroSuggestions.lunch.protein}g</span>
                      )}
                    </div>
                    <Input
                      id="lunchProtein"
                      type="number"
                      step="0.01"
                      value={lunchProtein}
                      onChange={(e) => setLunchProtein(e.target.value)}
                      placeholder={!hasNutritionist && macroSuggestions ? `Sugestão: ${macroSuggestions.lunch.protein}` : "Ex: 35"}
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <Label htmlFor="lunchFat">Gorduras (g)</Label>
                      {!hasNutritionist && macroSuggestions && (
                        <span className="text-xs text-blue-600 font-medium">↗ {macroSuggestions.lunch.fat}g</span>
                      )}
                    </div>
                    <Input
                      id="lunchFat"
                      type="number"
                      step="0.01"
                      value={lunchFat}
                      onChange={(e) => setLunchFat(e.target.value)}
                      placeholder={!hasNutritionist && macroSuggestions ? `Sugestão: ${macroSuggestions.lunch.fat}` : "Ex: 15"}
                    />
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-4 space-y-4">
                <h4 className="font-semibold text-lg text-gray-900">Jantar</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <Label htmlFor="dinnerCarbs">Carboidratos (g)</Label>
                      {!hasNutritionist && macroSuggestions && (
                        <span className="text-xs text-blue-600 font-medium">↗ {macroSuggestions.dinner.carb}g</span>
                      )}
                    </div>
                    <Input
                      id="dinnerCarbs"
                      type="number"
                      step="0.01"
                      value={dinnerCarbs}
                      onChange={(e) => setDinnerCarbs(e.target.value)}
                      placeholder={!hasNutritionist && macroSuggestions ? `Sugestão: ${macroSuggestions.dinner.carb}` : "Ex: 40"}
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <Label htmlFor="dinnerProtein">Proteínas (g)</Label>
                      {!hasNutritionist && macroSuggestions && (
                        <span className="text-xs text-blue-600 font-medium">↗ {macroSuggestions.dinner.protein}g</span>
                      )}
                    </div>
                    <Input
                      id="dinnerProtein"
                      type="number"
                      step="0.01"
                      value={dinnerProtein}
                      onChange={(e) => setDinnerProtein(e.target.value)}
                      placeholder={!hasNutritionist && macroSuggestions ? `Sugestão: ${macroSuggestions.dinner.protein}` : "Ex: 30"}
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <Label htmlFor="dinnerFat">Gorduras (g)</Label>
                      {!hasNutritionist && macroSuggestions && (
                        <span className="text-xs text-blue-600 font-medium">↗ {macroSuggestions.dinner.fat}g</span>
                      )}
                    </div>
                    <Input
                      id="dinnerFat"
                      type="number"
                      step="0.01"
                      value={dinnerFat}
                      onChange={(e) => setDinnerFat(e.target.value)}
                      placeholder={!hasNutritionist && macroSuggestions ? `Sugestão: ${macroSuggestions.dinner.fat}` : "Ex: 12"}
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

            <TabsContent value="files" className="space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                Gerencie documentos do cliente como planos alimentares, exames e prescrições.
              </p>

              {documents.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm">Documentos Anexados</h3>
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{doc.file_name}</p>
                        <div className="flex gap-2 text-xs text-gray-600 mt-1">
                          <span>{new Date(doc.uploaded_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        {doc.description && (
                          <p className="text-xs text-gray-600 mt-1">{doc.description}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(doc.file_url, '_blank')}
                        >
                          Ver
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteDocument(doc.id)}
                        >
                          Remover
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Separator />

              <div className="space-y-4">
                <h3 className="font-semibold text-sm">Adicionar Novo Documento</h3>

                <div>
                  <Label htmlFor="fileDescription">Descrição *</Label>
                  <Input
                    id="fileDescription"
                    value={newFileDescription}
                    onChange={(e) => setNewFileDescription(e.target.value)}
                    placeholder="Ex: Plano Alimentar Abril 2024"
                  />
                </div>

                <div>
                  <Label htmlFor="newFile">Arquivo</Label>
                  <Input
                    id="newFile"
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setNewFile(file);
                      }
                    }}
                    disabled={uploadingFile}
                  />
                  {newFile && (
                    <p className="text-sm text-gray-600 mt-1">
                      Arquivo selecionado: {newFile.name}
                    </p>
                  )}
                </div>

                <Button
                  type="button"
                  onClick={handleAddDocument}
                  disabled={!newFile || !newFileDescription.trim() || uploadingFile}
                  className="w-full"
                >
                  {uploadingFile ? 'Enviando...' : 'Adicionar Documento'}
                </Button>
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
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
