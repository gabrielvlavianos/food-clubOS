'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card } from '@/components/ui/card';
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
import { Upload, ChevronRight, ChevronLeft } from 'lucide-react';

interface DeliveryScheduleForm {
  [key: string]: {
    time: string;
    address: string;
  };
}

export function RegistrationForm() {
  const [step, setStep] = useState<'choice' | 'form'>('choice');
  const [hasNutritionist, setHasNutritionist] = useState<boolean | null>(null);
  const [currentSection, setCurrentSection] = useState(0);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('');

  const [nutritionistName, setNutritionistName] = useState('');
  const [nutritionistPhone, setNutritionistPhone] = useState('');
  const [mealPlanFile, setMealPlanFile] = useState<File | null>(null);

  const [mainGoal, setMainGoal] = useState('');
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);
  const [foodRestrictions, setFoodRestrictions] = useState('');
  const [clinicalConditions, setClinicalConditions] = useState('');
  const [medicationUse, setMedicationUse] = useState('');
  const [dietaryNotes, setDietaryNotes] = useState('');

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
  const [mealsPerDay, setMealsPerDay] = useState('');

  const [deliverySchedules, setDeliverySchedules] = useState<DeliveryScheduleForm>({});

  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleNutritionistChoice = (choice: boolean) => {
    setHasNutritionist(choice);
    setStep('form');
  };

  const handleAllergyToggle = (allergen: string) => {
    setSelectedAllergies(prev =>
      prev.includes(allergen)
        ? prev.filter(a => a !== allergen)
        : [...prev, allergen]
    );
  };

  const handleDeliveryScheduleChange = (day: string, meal: string, field: 'time' | 'address', value: string) => {
    const key = `${day}_${meal}`;
    setDeliverySchedules(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value
      }
    }));
  };

  const validateCurrentSection = (): boolean => {
    if (hasNutritionist) {
      if (currentSection === 0) {
        if (!name || !phone || !email || !birthDate || !gender) {
          toast({
            title: 'Campos obrigatórios',
            description: 'Preencha todos os campos obrigatórios da seção',
            variant: 'destructive'
          });
          return false;
        }
      } else if (currentSection === 1) {
        if (!nutritionistName || !nutritionistPhone) {
          toast({
            title: 'Campos obrigatórios',
            description: 'Preencha os dados da nutricionista',
            variant: 'destructive'
          });
          return false;
        }
      }
    } else {
      if (currentSection === 0) {
        if (!name || !phone || !email || !birthDate || !gender) {
          toast({
            title: 'Campos obrigatórios',
            description: 'Preencha todos os campos obrigatórios da seção',
            variant: 'destructive'
          });
          return false;
        }
      } else if (currentSection === 2) {
        if (!height || !currentWeight || !goalWeight) {
          toast({
            title: 'Campos obrigatórios',
            description: 'Preencha altura, peso atual e meta de peso',
            variant: 'destructive'
          });
          return false;
        }
      } else if (currentSection === 3) {
        if (!workRoutine || !aerobicFrequency || !aerobicIntensity || !strengthFrequency || !strengthIntensity) {
          toast({
            title: 'Campos obrigatórios',
            description: 'Preencha todos os campos de rotina e atividade física',
            variant: 'destructive'
          });
          return false;
        }
      }
    }
    return true;
  };

  const nextSection = () => {
    if (validateCurrentSection()) {
      setCurrentSection(prev => prev + 1);
    }
  };

  const prevSection = () => {
    setCurrentSection(prev => prev - 1);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const hasSchedules = Object.values(deliverySchedules).some(s => s.time || s.address);
    if (!hasSchedules) {
      toast({
        title: 'Agenda obrigatória',
        description: 'Configure pelo menos um dia de entrega',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    try {
      const { data: customerData, error: customerError } = await (supabase as any)
        .from('customers')
        .insert([{
          name,
          phone: phone || null,
          email: email || null,
          birth_date: birthDate || null,
          gender: gender || null,
          has_nutritionist: hasNutritionist,
          status: 'pending_approval',
          nutritionist_name: hasNutritionist ? nutritionistName : null,
          nutritionist_phone: hasNutritionist ? nutritionistPhone : null,
          main_goal: mainGoal || null,
          allergies: selectedAllergies,
          food_restrictions: foodRestrictions || null,
          clinical_conditions: clinicalConditions || null,
          medication_use: medicationUse || null,
          dietary_notes: dietaryNotes || null,
          height_cm: !hasNutritionist && height ? parseFloat(height) : null,
          current_weight_kg: !hasNutritionist && currentWeight ? parseFloat(currentWeight) : null,
          goal_weight_kg: !hasNutritionist && goalWeight ? parseFloat(goalWeight) : null,
          body_fat_percentage: !hasNutritionist && bodyFat ? parseFloat(bodyFat) : null,
          skeletal_muscle_mass: !hasNutritionist && muscleMass ? parseFloat(muscleMass) : null,
          work_routine: !hasNutritionist ? workRoutine : null,
          aerobic_frequency: !hasNutritionist ? aerobicFrequency : null,
          aerobic_intensity: !hasNutritionist ? aerobicIntensity : null,
          strength_frequency: !hasNutritionist ? strengthFrequency : null,
          strength_intensity: !hasNutritionist ? strengthIntensity : null,
          meals_per_day: !hasNutritionist && mealsPerDay ? parseInt(mealsPerDay) : null,
        }])
        .select()
        .single();

      if (customerError) throw customerError;
      if (!customerData) throw new Error('Customer data not returned');

      const dayKeyToNumber: Record<string, number> = {
        'monday': 1,
        'tuesday': 2,
        'wednesday': 3,
        'thursday': 4,
        'friday': 5,
        'saturday': 6,
        'sunday': 7,
      };

      const schedules = Object.entries(deliverySchedules)
        .filter(([_, schedule]) => schedule.time || schedule.address)
        .map(([key, schedule]) => {
          const [day, meal] = key.split('_');
          return {
            customer_id: customerData.id,
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
        title: 'Cadastro realizado!',
        description: 'Seu cadastro foi enviado e está em análise. Em breve entraremos em contato!',
      });

      window.location.href = '/cadastro/sucesso';
    } catch (error) {
      console.error('Error creating customer:', error);
      toast({
        title: 'Erro no cadastro',
        description: 'Não foi possível completar seu cadastro. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  if (step === 'choice') {
    return (
      <div className="space-y-8">
        <div className="text-center space-y-3">
          <h2 className="text-2xl font-semibold text-slate-900">
            Você tem acompanhamento nutricional?
          </h2>
          <p className="text-slate-600">
            Isso nos ajudará a personalizar melhor seu atendimento
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card
            className="p-8 cursor-pointer hover:shadow-lg transition-all hover:scale-105 border-2 hover:border-[#5F7469]"
            onClick={() => handleNutritionistChoice(true)}
          >
            <div className="text-center space-y-4">
              <div className="text-5xl">👩‍⚕️</div>
              <h3 className="text-xl font-semibold text-slate-900">
                Sim, tenho nutricionista
              </h3>
              <p className="text-sm text-slate-600">
                Você poderá enviar seu plano alimentar e trabalharemos junto com sua nutricionista
              </p>
            </div>
          </Card>

          <Card
            className="p-8 cursor-pointer hover:shadow-lg transition-all hover:scale-105 border-2 hover:border-[#5F7469]"
            onClick={() => handleNutritionistChoice(false)}
          >
            <div className="text-center space-y-4">
              <div className="text-5xl">🎯</div>
              <h3 className="text-xl font-semibold text-slate-900">
                Não tenho nutricionista
              </h3>
              <p className="text-sm text-slate-600">
                Calcularemos seus macronutrientes com base nas suas informações e objetivos
              </p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const sectionsWithNutritionist = [
    { title: 'Dados Pessoais', key: 'personal' },
    { title: 'Nutricionista', key: 'nutritionist' },
    { title: 'Objetivos e Restrições', key: 'goals' },
    { title: 'Agenda de Entregas', key: 'delivery' },
  ];

  const sectionsWithoutNutritionist = [
    { title: 'Dados Pessoais', key: 'personal' },
    { title: 'Objetivos e Restrições', key: 'goals' },
    { title: 'Dados Físicos', key: 'physical' },
    { title: 'Rotina e Atividades', key: 'routine' },
    { title: 'Agenda de Entregas', key: 'delivery' },
  ];

  const sections = hasNutritionist ? sectionsWithNutritionist : sectionsWithoutNutritionist;
  const isLastSection = currentSection === sections.length - 1;

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {sections.map((section, idx) => (
              <div key={idx} className="flex items-center flex-1">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${
                  idx === currentSection
                    ? 'text-white'
                    : idx < currentSection
                    ? 'bg-stone-200 text-stone-500'
                    : 'bg-stone-200 text-stone-500'
                }`}
                style={idx === currentSection ? { backgroundColor: '#5F7469' } : {}}>
                  {idx + 1}
                </div>
                {idx < sections.length - 1 && (
                  <div className={`flex-1 h-1 mx-2 ${
                    idx < currentSection ? 'bg-stone-300' : 'bg-stone-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="mt-2 text-sm font-medium text-slate-700">
            {sections[currentSection].title}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {currentSection === 0 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nome Completo *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome completo"
                required
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
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
                <Label htmlFor="email">E-mail *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="birthDate">Data de Nascimento *</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="gender">Sexo *</Label>
                <Select value={gender} onValueChange={setGender} required>
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
          </div>
        )}

        {hasNutritionist && currentSection === 1 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="nutritionistName">Nome da Nutricionista *</Label>
              <Input
                id="nutritionistName"
                value={nutritionistName}
                onChange={(e) => setNutritionistName(e.target.value)}
                placeholder="Nome completo"
                required
              />
            </div>

            <div>
              <Label htmlFor="nutritionistPhone">Telefone da Nutricionista *</Label>
              <Input
                id="nutritionistPhone"
                value={nutritionistPhone}
                onChange={(e) => setNutritionistPhone(e.target.value)}
                placeholder="+5511912345678"
                required
              />
            </div>

            <div>
              <Label htmlFor="mealPlanFile">Plano Alimentar (PDF ou Imagem)</Label>
              <div className="mt-2 flex items-center gap-4">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => document.getElementById('mealPlanFile')?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {mealPlanFile ? mealPlanFile.name : 'Escolher arquivo'}
                </Button>
                <input
                  id="mealPlanFile"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => setMealPlanFile(e.target.files?.[0] || null)}
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Opcional: Envie seu plano alimentar para facilitar o atendimento
              </p>
            </div>
          </div>
        )}

        {((hasNutritionist && currentSection === 2) || (!hasNutritionist && currentSection === 1)) && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="mainGoal">Objetivo Principal</Label>
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
              <Label>Alergias ou Intolerâncias</Label>
              <div className="grid md:grid-cols-2 gap-3 mt-2">
                {COMMON_ALLERGENS.map((allergen) => (
                  <div key={allergen} className="flex items-center space-x-2">
                    <Checkbox
                      id={`allergy-${allergen}`}
                      checked={selectedAllergies.includes(allergen)}
                      onCheckedChange={() => handleAllergyToggle(allergen)}
                    />
                    <label
                      htmlFor={`allergy-${allergen}`}
                      className="text-sm font-medium leading-none"
                    >
                      {allergen}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="foodRestrictions">Alimentos que não consome por escolha</Label>
              <Textarea
                id="foodRestrictions"
                value={foodRestrictions}
                onChange={(e) => setFoodRestrictions(e.target.value)}
                placeholder="Ex: Carne vermelha, frutos do mar..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="clinicalConditions">Condições Clínicas</Label>
              <Textarea
                id="clinicalConditions"
                value={clinicalConditions}
                onChange={(e) => setClinicalConditions(e.target.value)}
                placeholder="Descreva condições clínicas relevantes"
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="medicationUse">Uso de Medicamentos</Label>
              <Textarea
                id="medicationUse"
                value={medicationUse}
                onChange={(e) => setMedicationUse(e.target.value)}
                placeholder="Medicações em uso"
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="dietaryNotes">Observações Adicionais</Label>
              <Textarea
                id="dietaryNotes"
                value={dietaryNotes}
                onChange={(e) => setDietaryNotes(e.target.value)}
                placeholder="Outras informações importantes"
                rows={2}
              />
            </div>
          </div>
        )}

        {!hasNutritionist && currentSection === 2 && (
          <div className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="height">Altura (cm) *</Label>
                <Input
                  id="height"
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="175"
                  required
                />
              </div>

              <div>
                <Label htmlFor="currentWeight">Peso Atual (kg) *</Label>
                <Input
                  id="currentWeight"
                  type="number"
                  step="0.1"
                  value={currentWeight}
                  onChange={(e) => setCurrentWeight(e.target.value)}
                  placeholder="70"
                  required
                />
              </div>

              <div>
                <Label htmlFor="goalWeight">Meta de Peso (kg) *</Label>
                <Input
                  id="goalWeight"
                  type="number"
                  step="0.1"
                  value={goalWeight}
                  onChange={(e) => setGoalWeight(e.target.value)}
                  placeholder="65"
                  required
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bodyFat">% Gordura Corporal (se souber)</Label>
                <Input
                  id="bodyFat"
                  type="number"
                  step="0.1"
                  value={bodyFat}
                  onChange={(e) => setBodyFat(e.target.value)}
                  placeholder="20"
                />
              </div>

              <div>
                <Label htmlFor="muscleMass">Massa Muscular (kg - se souber)</Label>
                <Input
                  id="muscleMass"
                  type="number"
                  step="0.1"
                  value={muscleMass}
                  onChange={(e) => setMuscleMass(e.target.value)}
                  placeholder="30"
                />
              </div>
            </div>
          </div>
        )}

        {!hasNutritionist && currentSection === 3 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="workRoutine">Rotina de Trabalho *</Label>
              <Select value={workRoutine} onValueChange={setWorkRoutine} required>
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

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="aerobicFrequency">Frequência Aeróbica *</Label>
                <Select value={aerobicFrequency} onValueChange={setAerobicFrequency} required>
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
                <Label htmlFor="aerobicIntensity">Intensidade Aeróbica *</Label>
                <Select value={aerobicIntensity} onValueChange={setAerobicIntensity} required>
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

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="strengthFrequency">Frequência Musculação *</Label>
                <Select value={strengthFrequency} onValueChange={setStrengthFrequency} required>
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
                <Label htmlFor="strengthIntensity">Intensidade Musculação *</Label>
                <Select value={strengthIntensity} onValueChange={setStrengthIntensity} required>
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

            <div>
              <Label htmlFor="mealsPerDay">Refeições por Dia</Label>
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
          </div>
        )}

        {isLastSection && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 mb-4">
              Configure os dias e horários em que deseja receber suas refeições. Você pode escolher almoço, jantar ou ambos para cada dia.
            </p>

            {DAYS_OF_WEEK.map(({ key: day, label: dayLabel }) => (
              <div key={day} className="border rounded-lg p-4 space-y-3 bg-slate-50">
                <h4 className="font-medium text-slate-900">{dayLabel}</h4>

                {MEAL_TYPES.map(({ key: meal, label: mealLabel }) => (
                  <div key={meal} className="space-y-2 pl-4">
                    <p className="text-sm font-medium text-slate-700">{mealLabel}</p>
                    <div className="grid md:grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor={`${day}-${meal}-time`} className="text-xs">Horário</Label>
                        <Input
                          id={`${day}-${meal}-time`}
                          type="time"
                          value={deliverySchedules[`${day}_${meal}`]?.time || ''}
                          onChange={(e) => handleDeliveryScheduleChange(day, meal, 'time', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`${day}-${meal}-address`} className="text-xs">Endereço</Label>
                        <Input
                          id={`${day}-${meal}-address`}
                          value={deliverySchedules[`${day}_${meal}`]?.address || ''}
                          onChange={(e) => handleDeliveryScheduleChange(day, meal, 'address', e.target.value)}
                          placeholder="Endereço completo"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-between pt-6 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={prevSection}
          disabled={currentSection === 0 || loading}
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>

        {!isLastSection ? (
          <Button
            type="button"
            onClick={nextSection}
            disabled={loading}
          >
            Próximo
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button type="submit" disabled={loading}>
            {loading ? 'Enviando...' : 'Finalizar Cadastro'}
          </Button>
        )}
      </div>
    </form>
  );
}
