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
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
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
    cep: string;
    address: string;
    number: string;
    complement: string;
    addressDetails?: {
      street: string;
      neighborhood: string;
      city: string;
      state: string;
    };
  };
}

interface SelectedDayMeal {
  [key: string]: boolean;
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
  const [otherAllergies, setOtherAllergies] = useState('');
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

  const [selectedDaysMeals, setSelectedDaysMeals] = useState<SelectedDayMeal>({});
  const [deliverySchedules, setDeliverySchedules] = useState<DeliveryScheduleForm>({});
  const [loadingCep, setLoadingCep] = useState<string>('');

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

  const handleDayMealToggle = (day: string, meal: string) => {
    const key = `${day}_${meal}`;
    setSelectedDaysMeals(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleDeliveryScheduleChange = (day: string, meal: string, field: 'time' | 'cep' | 'number' | 'complement', value: string) => {
    const key = `${day}_${meal}`;
    setDeliverySchedules(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        time: prev[key]?.time || '',
        cep: prev[key]?.cep || '',
        address: prev[key]?.address || '',
        number: prev[key]?.number || '',
        complement: prev[key]?.complement || '',
        [field]: value
      }
    }));
  };

  const fetchAddressByCep = async (cep: string, day: string, meal: string) => {
    const key = `${day}_${meal}`;
    const cleanCep = cep.replace(/\D/g, '');

    if (cleanCep.length !== 8) {
      return;
    }

    setLoadingCep(key);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();

      if (data.erro) {
        toast({
          title: 'CEP não encontrado',
          description: 'Verifique o CEP digitado e tente novamente.',
          variant: 'destructive',
        });
        return;
      }

      const fullAddress = `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}`;

      setDeliverySchedules(prev => ({
        ...prev,
        [key]: {
          ...prev[key],
          time: prev[key]?.time || '',
          cep: cleanCep,
          address: fullAddress,
          number: prev[key]?.number || '',
          complement: prev[key]?.complement || '',
          addressDetails: {
            street: data.logradouro,
            neighborhood: data.bairro,
            city: data.localidade,
            state: data.uf,
          }
        }
      }));
    } catch (error) {
      toast({
        title: 'Erro ao buscar CEP',
        description: 'Não foi possível buscar o endereço. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoadingCep('');
    }
  };

  const replicateAddress = (sourceDay: string, sourceMeal: string) => {
    const sourceKey = `${sourceDay}_${sourceMeal}`;
    const sourceSchedule = deliverySchedules[sourceKey];

    if (!sourceSchedule || !sourceSchedule.cep || !sourceSchedule.time) {
      toast({
        title: 'Dados incompletos',
        description: 'Preencha horário, CEP e endereço antes de replicar.',
        variant: 'destructive',
      });
      return;
    }

    const updated = { ...deliverySchedules };

    Object.entries(selectedDaysMeals).forEach(([key, isSelected]) => {
      if (isSelected && key !== sourceKey) {
        const [, meal] = key.split('_');
        if (meal === sourceMeal) {
          updated[key] = {
            ...updated[key],
            time: sourceSchedule.time,
            cep: sourceSchedule.cep,
            address: sourceSchedule.address,
            number: sourceSchedule.number,
            complement: sourceSchedule.complement,
            addressDetails: sourceSchedule.addressDetails,
          };
        }
      }
    });

    setDeliverySchedules(updated);
    toast({
      title: 'Horário e endereço replicados',
      description: `Dados copiados para todos os ${sourceMeal === 'lunch' ? 'almoços' : 'jantares'} selecionados.`,
    });
  };

  const validateCurrentSection = (): boolean => {
    if (hasNutritionist) {
      if (currentSection === 0) {
        const missingFields = [];
        if (!name?.trim()) missingFields.push('Nome Completo');
        if (!phone?.trim()) missingFields.push('Telefone');
        if (!email?.trim()) missingFields.push('Email');
        if (!birthDate?.trim()) missingFields.push('Data de Nascimento');
        if (!gender?.trim()) missingFields.push('Gênero');

        if (missingFields.length > 0) {
          toast({
            title: 'Campos obrigatórios faltando',
            description: `Preencha: ${missingFields.join(', ')}`,
            variant: 'destructive'
          });
          return false;
        }
      } else if (currentSection === 1) {
        const missingFields = [];
        if (!nutritionistName?.trim()) missingFields.push('Nome da Nutricionista');
        if (!nutritionistPhone?.trim()) missingFields.push('Telefone da Nutricionista');

        if (missingFields.length > 0) {
          toast({
            title: 'Campos obrigatórios faltando',
            description: `Preencha: ${missingFields.join(', ')}`,
            variant: 'destructive'
          });
          return false;
        }
      }
    } else {
      if (currentSection === 0) {
        const missingFields = [];
        if (!name?.trim()) missingFields.push('Nome Completo');
        if (!phone?.trim()) missingFields.push('Telefone');
        if (!email?.trim()) missingFields.push('Email');
        if (!birthDate?.trim()) missingFields.push('Data de Nascimento');
        if (!gender?.trim()) missingFields.push('Gênero');

        if (missingFields.length > 0) {
          toast({
            title: 'Campos obrigatórios faltando',
            description: `Preencha: ${missingFields.join(', ')}`,
            variant: 'destructive'
          });
          return false;
        }
      } else if (currentSection === 1) {
        if (!mainGoal?.trim()) {
          toast({
            title: 'Campo obrigatório faltando',
            description: 'Selecione seu Objetivo Principal',
            variant: 'destructive'
          });
          return false;
        }
      } else if (currentSection === 2) {
        const missingFields = [];
        if (!height?.trim()) missingFields.push('Altura');
        if (!currentWeight?.trim()) missingFields.push('Peso Atual');
        if (!goalWeight?.trim()) missingFields.push('Meta de Peso');

        if (missingFields.length > 0) {
          toast({
            title: 'Campos obrigatórios faltando',
            description: `Preencha: ${missingFields.join(', ')}`,
            variant: 'destructive'
          });
          return false;
        }
      } else if (currentSection === 3) {
        const missingFields = [];
        if (!workRoutine?.trim()) missingFields.push('Rotina de Trabalho');
        if (!aerobicFrequency?.trim()) missingFields.push('Frequência Aeróbico');
        if (!aerobicIntensity?.trim()) missingFields.push('Intensidade Aeróbico');
        if (!strengthFrequency?.trim()) missingFields.push('Frequência Musculação');
        if (!strengthIntensity?.trim()) missingFields.push('Intensidade Musculação');

        if (missingFields.length > 0) {
          toast({
            title: 'Campos obrigatórios faltando',
            description: `Preencha: ${missingFields.join(', ')}`,
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

  // Helper para garantir que valores vazios sejam null
  const sanitizeValue = (value: string | undefined | null) => {
    if (!value || value.trim() === '') return null;
    return value;
  };

  // Helper para converter números de forma segura
  const safeParseFloat = (value: string | undefined | null) => {
    if (!value || value.trim() === '') return null;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? null : parsed;
  };

  const safeParseInt = (value: string | undefined | null) => {
    if (!value || value.trim() === '') return null;
    const parsed = parseInt(value);
    return isNaN(parsed) ? null : parsed;
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    console.log('🚀 Iniciando cadastro...');

    if (!hasNutritionist && !mainGoal) {
      toast({
        title: 'Campo obrigatório',
        description: 'Por favor, selecione seu objetivo principal',
        variant: 'destructive'
      });
      return;
    }

    const selectedKeys = Object.entries(selectedDaysMeals).filter(([_, selected]) => selected).map(([key]) => key);

    if (selectedKeys.length === 0) {
      toast({
        title: 'Agenda obrigatória',
        description: 'Selecione pelo menos um dia e turno de entrega',
        variant: 'destructive'
      });
      return;
    }

    const incompleteSchedules = selectedKeys.filter(key => {
      const schedule = deliverySchedules[key];
      return !schedule || !schedule.time || !schedule.cep || !schedule.number;
    });

    if (incompleteSchedules.length > 0) {
      toast({
        title: 'Agenda incompleta',
        description: 'Preencha horário, CEP e número para todos os dias selecionados',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    try {
      console.log('📝 Validações passaram, iniciando inserção no banco...');
      let mealPlanFileUrl: string | null = null;

      if (mealPlanFile && hasNutritionist) {
        console.log('📤 Fazendo upload do arquivo...');
        const fileExt = mealPlanFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('meal-plans')
          .upload(filePath, mealPlanFile, {
            contentType: mealPlanFile.type,
            upsert: false
          });

        if (uploadError) {
          console.error('❌ Upload error:', uploadError);
          throw new Error('Erro ao fazer upload do arquivo');
        }

        const { data: { publicUrl } } = supabase.storage
          .from('meal-plans')
          .getPublicUrl(filePath);

        mealPlanFileUrl = publicUrl;
        console.log('✅ Upload concluído');
      }

      console.log('👤 Criando cliente no banco...');
      const customerPayload = {
        name: sanitizeValue(name),
        phone: sanitizeValue(phone),
        email: sanitizeValue(email),
        birth_date: sanitizeValue(birthDate),
        gender: sanitizeValue(gender),
        has_nutritionist: hasNutritionist,
        status: 'pending_approval',
        nutritionist_name: hasNutritionist ? sanitizeValue(nutritionistName) : null,
        nutritionist_phone: hasNutritionist ? sanitizeValue(nutritionistPhone) : null,
        meal_plan_file_url: sanitizeValue(mealPlanFileUrl),
        main_goal: sanitizeValue(mainGoal),
        allergies: selectedAllergies.length > 0 ? selectedAllergies : null,
        other_allergies: sanitizeValue(otherAllergies),
        food_restrictions: sanitizeValue(foodRestrictions),
        clinical_conditions: sanitizeValue(clinicalConditions),
        medication_use: sanitizeValue(medicationUse),
        dietary_notes: sanitizeValue(dietaryNotes),
        height_cm: !hasNutritionist ? safeParseFloat(height) : null,
        current_weight_kg: !hasNutritionist ? safeParseFloat(currentWeight) : null,
        goal_weight_kg: !hasNutritionist ? safeParseFloat(goalWeight) : null,
        body_fat_percentage: !hasNutritionist ? safeParseFloat(bodyFat) : null,
        skeletal_muscle_mass: !hasNutritionist ? safeParseFloat(muscleMass) : null,
        work_routine: !hasNutritionist ? sanitizeValue(workRoutine) : null,
        aerobic_frequency: !hasNutritionist ? sanitizeValue(aerobicFrequency) : null,
        aerobic_intensity: !hasNutritionist ? sanitizeValue(aerobicIntensity) : null,
        strength_frequency: !hasNutritionist ? sanitizeValue(strengthFrequency) : null,
        strength_intensity: !hasNutritionist ? sanitizeValue(strengthIntensity) : null,
        meals_per_day: !hasNutritionist ? safeParseInt(mealsPerDay) : null,
      };

      console.log('📦 Payload do cliente:', customerPayload);

      const { data: customerData, error: customerError } = await (supabase as any)
        .from('customers')
        .insert([customerPayload])
        .select()
        .single();

      if (customerError) {
        console.error('❌ Erro ao criar cliente:', customerError);
        throw customerError;
      }
      if (!customerData) {
        console.error('❌ Customer data não retornado');
        throw new Error('Customer data not returned');
      }

      console.log('✅ Cliente criado:', customerData.id);

      const dayKeyToNumber: Record<string, number> = {
        'monday': 1,
        'tuesday': 2,
        'wednesday': 3,
        'thursday': 4,
        'friday': 5,
        'saturday': 6,
        'sunday': 7,
      };

      console.log('📅 Criando agendas de entrega...');
      const schedules = selectedKeys.map(key => {
        const [day, meal] = key.split('_');
        const schedule = deliverySchedules[key];

        const fullAddress = schedule.addressDetails
          ? `${schedule.addressDetails.street}, ${schedule.number}${schedule.complement ? ', ' + schedule.complement : ''}, ${schedule.addressDetails.neighborhood}, ${schedule.addressDetails.city} - ${schedule.addressDetails.state}`
          : `${schedule.address}, ${schedule.number}${schedule.complement ? ', ' + schedule.complement : ''}`;

        return {
          customer_id: customerData.id,
          day_of_week: dayKeyToNumber[day],
          meal_type: meal,
          delivery_time: schedule.time,
          delivery_address: fullAddress,
        };
      });

      console.log('📦 Payload das agendas:', schedules);

      if (schedules.length > 0) {
        const { error: scheduleError } = await supabase
          .from('delivery_schedules')
          .insert(schedules as any);

        if (scheduleError) {
          console.error('❌ Erro ao criar agendas:', scheduleError);
          throw scheduleError;
        }
        console.log('✅ Agendas criadas');
      }

      if (mealPlanFileUrl && mealPlanFile) {
        console.log('📄 Salvando documento...');
        const { error: documentError } = await (supabase as any)
          .from('customer_documents')
          .insert({
            customer_id: customerData.id,
            file_name: mealPlanFile.name,
            file_url: mealPlanFileUrl,
            file_type: 'document',
            description: '1º Envio Plano Alimentar',
          });

        if (documentError) {
          console.error('⚠️ Erro ao salvar documento:', documentError);
        } else {
          console.log('✅ Documento salvo');
        }
      }

      console.log('🎉 Cadastro concluído com sucesso!');

      toast({
        title: 'Cadastro realizado!',
        description: 'Seu cadastro foi enviado e está em análise. Em breve entraremos em contato!',
      });

      window.location.href = '/cadastro/sucesso';
    } catch (error: any) {
      console.error('❌ Erro no cadastro:', error);
      console.error('Detalhes do erro:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        full: error
      });

      let errorMessage = 'Não foi possível completar seu cadastro. Tente novamente.';

      if (error.message?.includes('unique') || error.code === '23505') {
        errorMessage = 'Já existe um cadastro com este telefone ou e-mail.';
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: 'Erro no cadastro',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  if (step === 'choice') {
    return (
      <div className="space-y-6 sm:space-y-8">
        <div className="text-center space-y-2 sm:space-y-3 px-2">
          <h2 className="text-xl sm:text-2xl font-semibold text-slate-900">
            Você tem acompanhamento nutricional?
          </h2>
          <p className="text-sm sm:text-base text-slate-600">
            Isso nos ajudará a personalizar melhor seu atendimento
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <Card
            className="p-6 sm:p-8 cursor-pointer hover:shadow-lg transition-all hover:scale-105 border-2 hover:border-[#5F7469]"
            onClick={() => handleNutritionistChoice(true)}
          >
            <div className="text-center space-y-3 sm:space-y-4">
              <div className="text-4xl sm:text-5xl">👩‍⚕️</div>
              <h3 className="text-lg sm:text-xl font-semibold text-slate-900">
                Sim, tenho nutricionista
              </h3>
              <p className="text-xs sm:text-sm text-slate-600">
                Você poderá enviar seu plano alimentar e trabalharemos junto com sua nutricionista
              </p>
            </div>
          </Card>

          <Card
            className="p-6 sm:p-8 cursor-pointer hover:shadow-lg transition-all hover:scale-105 border-2 hover:border-[#5F7469]"
            onClick={() => handleNutritionistChoice(false)}
          >
            <div className="text-center space-y-3 sm:space-y-4">
              <div className="text-4xl sm:text-5xl">🎯</div>
              <h3 className="text-lg sm:text-xl font-semibold text-slate-900">
                Não tenho nutricionista
              </h3>
              <p className="text-xs sm:text-sm text-slate-600">
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
    <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
      <div className="flex items-center justify-between mb-6 sm:mb-8">
        <div className="flex-1">
          <div className="flex items-center gap-1 sm:gap-2">
            {sections.map((section, idx) => (
              <div key={idx} className="flex items-center flex-1">
                <div className={`flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full text-xs sm:text-sm font-semibold ${
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
                  <div className={`flex-1 h-0.5 sm:h-1 mx-1 sm:mx-2 ${
                    idx < currentSection ? 'bg-stone-300' : 'bg-stone-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="mt-2 text-xs sm:text-sm font-medium text-slate-700">
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
                <PhoneInput
                  id="phone"
                  international
                  defaultCountry="BR"
                  value={phone}
                  onChange={(value) => setPhone(value || '')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
              <PhoneInput
                id="nutritionistPhone"
                international
                defaultCountry="BR"
                value={nutritionistPhone}
                onChange={(value) => setNutritionistPhone(value || '')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
              <Label htmlFor="mainGoal">Objetivo Principal{!hasNutritionist && ' *'}</Label>
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
              {selectedAllergies.includes('Outros') && (
                <div className="mt-3">
                  <Label htmlFor="otherAllergies">Especifique outras alergias ou intolerâncias</Label>
                  <Textarea
                    id="otherAllergies"
                    value={otherAllergies}
                    onChange={(e) => setOtherAllergies(e.target.value)}
                    placeholder="Descreva outras alergias ou intolerâncias"
                    className="mt-1"
                  />
                </div>
              )}
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
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-blue-900 font-medium mb-2">
                Como funciona:
              </p>
              <ol className="text-xs sm:text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Selecione os dias e turnos que deseja receber suas refeições</li>
                <li>Preencha horário, CEP e endereço para cada dia selecionado</li>
                <li>Use o botão "Replicar" para copiar endereços entre os mesmos turnos</li>
              </ol>
            </div>

            <div className="border rounded-lg p-3 sm:p-4 bg-white">
              <h4 className="font-semibold text-slate-900 mb-3 sm:mb-4 text-sm sm:text-base">Selecione os dias e turnos</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {DAYS_OF_WEEK.map(({ key: day, label: dayLabel }) => (
                  <div key={day} className="space-y-2">
                    <p className="font-medium text-slate-700 text-sm sm:text-base">{dayLabel}</p>
                    <div className="flex gap-3 sm:gap-4 pl-2 sm:pl-3">
                      {MEAL_TYPES.map(({ key: meal, label: mealLabel }) => (
                        <div key={meal} className="flex items-center space-x-2">
                          <Checkbox
                            id={`select-${day}-${meal}`}
                            checked={selectedDaysMeals[`${day}_${meal}`] || false}
                            onCheckedChange={() => handleDayMealToggle(day, meal)}
                          />
                          <label
                            htmlFor={`select-${day}-${meal}`}
                            className="text-xs sm:text-sm font-medium leading-none cursor-pointer"
                          >
                            {mealLabel}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {Object.entries(selectedDaysMeals).some(([_, selected]) => selected) && (
              <div className="border rounded-lg p-3 sm:p-4 bg-white space-y-4">
                <h4 className="font-semibold text-slate-900 text-sm sm:text-base">Configure horário e endereço</h4>

                {DAYS_OF_WEEK.map(({ key: day, label: dayLabel }) => (
                  <div key={day}>
                    {MEAL_TYPES.map(({ key: meal, label: mealLabel }) => {
                      const dayMealKey = `${day}_${meal}`;
                      if (!selectedDaysMeals[dayMealKey]) return null;

                      const schedule = deliverySchedules[dayMealKey];
                      const isLoadingThisCep = loadingCep === dayMealKey;

                      return (
                        <div key={dayMealKey} className="border-l-4 border-l-blue-500 bg-slate-50 rounded-lg p-3 sm:p-4 mb-3 space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                            <h5 className="font-medium text-slate-900 text-sm sm:text-base">
                              {dayLabel} - {mealLabel}
                            </h5>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => replicateAddress(day, meal)}
                              disabled={!schedule?.cep || !schedule?.number}
                              className="text-xs w-full sm:w-auto"
                            >
                              Replicar {meal === 'lunch' ? 'almoços' : 'jantares'}
                            </Button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <Label htmlFor={`${dayMealKey}-time`} className="text-xs sm:text-sm">
                                Horário * <span className="text-xs text-slate-500">({meal === 'lunch' ? '11:30-14:00' : '18:00-21:00'})</span>
                              </Label>
                              <Input
                                id={`${dayMealKey}-time`}
                                type="time"
                                value={schedule?.time || ''}
                                onChange={(e) => handleDeliveryScheduleChange(day, meal, 'time', e.target.value)}
                                min={meal === 'lunch' ? '11:30' : '18:00'}
                                max={meal === 'lunch' ? '14:00' : '21:00'}
                                required
                                className="text-sm"
                              />
                            </div>

                            <div>
                              <Label htmlFor={`${dayMealKey}-cep`} className="text-xs sm:text-sm">
                                CEP *
                              </Label>
                              <div className="flex gap-2">
                                <Input
                                  id={`${dayMealKey}-cep`}
                                  value={schedule?.cep || ''}
                                  onChange={(e) => {
                                    const value = e.target.value.replace(/\D/g, '');
                                    handleDeliveryScheduleChange(day, meal, 'cep', value);
                                    if (value.length === 8) {
                                      fetchAddressByCep(value, day, meal);
                                    }
                                  }}
                                  placeholder="00000000"
                                  maxLength={8}
                                  required
                                  disabled={isLoadingThisCep}
                                  className="text-sm"
                                />
                                {isLoadingThisCep && (
                                  <div className="flex items-center">
                                    <div className="animate-spin h-4 w-4 sm:h-5 sm:w-5 border-2 border-blue-500 border-t-transparent rounded-full" />
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {schedule?.address && (
                            <div className="space-y-3 bg-white p-3 rounded border">
                              <div>
                                <Label className="text-xs text-slate-600">Endereço encontrado</Label>
                                <p className="text-xs sm:text-sm font-medium text-slate-900 break-words">{schedule.address}</p>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <Label htmlFor={`${dayMealKey}-number`} className="text-xs sm:text-sm">
                                    Número *
                                  </Label>
                                  <Input
                                    id={`${dayMealKey}-number`}
                                    value={schedule.number || ''}
                                    onChange={(e) => handleDeliveryScheduleChange(day, meal, 'number', e.target.value)}
                                    placeholder="123"
                                    required
                                    className="text-sm"
                                  />
                                </div>

                                <div>
                                  <Label htmlFor={`${dayMealKey}-complement`} className="text-xs sm:text-sm">
                                    Complemento
                                  </Label>
                                  <Input
                                    id={`${dayMealKey}-complement`}
                                    value={schedule.complement || ''}
                                    onChange={(e) => handleDeliveryScheduleChange(day, meal, 'complement', e.target.value)}
                                    placeholder="Apto 101, Bloco A"
                                    className="text-sm"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 pt-6 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={prevSection}
          disabled={currentSection === 0 || loading}
          className="w-full sm:w-auto"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>

        {!isLastSection ? (
          <Button
            type="button"
            onClick={nextSection}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            Próximo
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button type="submit" disabled={loading} className="w-full sm:w-auto">
            {loading ? 'Enviando...' : 'Finalizar Cadastro'}
          </Button>
        )}
      </div>
    </form>
  );
}
