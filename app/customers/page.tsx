'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { CustomerWithAddresses, Customer, Address } from '@/types';
import { Navigation } from '@/components/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Download, Upload } from 'lucide-react';
import { CustomersTable } from '@/components/customers/customers-table';
import { CreateCustomerDialog } from '@/components/customers/create-customer-dialog';
import { downloadExcelTemplate, parseExcelFile, exportToExcel, ExcelColumn } from '@/lib/excel-utils';
import { useToast } from '@/hooks/use-toast';

const CUSTOMER_COLUMNS: ExcelColumn[] = [
  { header: 'Nome', key: 'name', example: 'João Silva' },
  { header: 'WhatsApp', key: 'whatsapp', example: '+5511999999999' },
  { header: 'Email', key: 'email', example: 'joao@email.com' },
  { header: 'Telefone', key: 'phone', example: '+5511988888888' },
  { header: 'Data de Nascimento', key: 'birth_date', example: '1990-01-15' },
  { header: 'Gênero', key: 'gender', example: 'M ou F' },
  { header: 'Nome do Nutricionista', key: 'nutritionist_name', example: 'Dra. Maria' },
  { header: 'Telefone do Nutricionista', key: 'nutritionist_phone', example: '+5511977777777' },
  { header: 'Objetivo Principal', key: 'main_goal', example: 'Perda de peso' },
  { header: 'Alergias', key: 'allergies', example: 'Amendoim, Camarão' },
  { header: 'Restrições Alimentares', key: 'food_restrictions', example: 'Sem glúten' },
  { header: 'Condições Clínicas', key: 'clinical_conditions', example: 'Diabetes tipo 2' },
  { header: 'Uso de Medicamentos', key: 'medication_use', example: 'Metformina' },
  { header: 'Altura (cm)', key: 'height_cm', example: '175' },
  { header: 'Peso Atual (kg)', key: 'current_weight_kg', example: '85.5' },
  { header: 'Peso Meta (kg)', key: 'goal_weight_kg', example: '75' },
  { header: 'Percentual de Gordura', key: 'body_fat_percentage', example: '25' },
  { header: 'Massa Muscular', key: 'skeletal_muscle_mass', example: '35' },
  { header: 'Rotina de Trabalho', key: 'work_routine', example: 'Escritório' },
  { header: 'Frequência Aeróbico', key: 'aerobic_frequency', example: '3x por semana' },
  { header: 'Intensidade Aeróbico', key: 'aerobic_intensity', example: 'Moderada' },
  { header: 'Frequência Musculação', key: 'strength_frequency', example: '4x por semana' },
  { header: 'Intensidade Musculação', key: 'strength_intensity', example: 'Alta' },
  { header: 'Refeições por Dia', key: 'meals_per_day', example: '5' },
  { header: 'Notas sobre Dieta', key: 'dietary_notes', example: 'Prefere comida caseira' },
  { header: 'Carboidratos Almoço (g)', key: 'lunch_carbs', example: '50' },
  { header: 'Proteínas Almoço (g)', key: 'lunch_protein', example: '35' },
  { header: 'Gorduras Almoço (g)', key: 'lunch_fat', example: '15' },
  { header: 'Carboidratos Jantar (g)', key: 'dinner_carbs', example: '40' },
  { header: 'Proteínas Jantar (g)', key: 'dinner_protein', example: '30' },
  { header: 'Gorduras Jantar (g)', key: 'dinner_fat', example: '12' },
  { header: 'Ativo', key: 'is_active', example: 'Sim' },
  { header: 'Segunda-Feira Almoço', key: 'monday_lunch', example: 'Sim' },
  { header: 'Horário Seg Almoço', key: 'monday_lunch_time', example: '12:00' },
  { header: 'Endereço Seg Almoço', key: 'monday_lunch_address', example: 'Rua A, 123' },
  { header: 'Segunda-Feira Jantar', key: 'monday_dinner', example: 'Não' },
  { header: 'Horário Seg Jantar', key: 'monday_dinner_time', example: '19:00' },
  { header: 'Endereço Seg Jantar', key: 'monday_dinner_address', example: 'Rua A, 123' },
  { header: 'Terça-Feira Almoço', key: 'tuesday_lunch', example: 'Sim' },
  { header: 'Horário Ter Almoço', key: 'tuesday_lunch_time', example: '12:00' },
  { header: 'Endereço Ter Almoço', key: 'tuesday_lunch_address', example: 'Rua A, 123' },
  { header: 'Terça-Feira Jantar', key: 'tuesday_dinner', example: 'Não' },
  { header: 'Horário Ter Jantar', key: 'tuesday_dinner_time', example: '19:00' },
  { header: 'Endereço Ter Jantar', key: 'tuesday_dinner_address', example: 'Rua A, 123' },
  { header: 'Quarta-Feira Almoço', key: 'wednesday_lunch', example: 'Sim' },
  { header: 'Horário Qua Almoço', key: 'wednesday_lunch_time', example: '12:00' },
  { header: 'Endereço Qua Almoço', key: 'wednesday_lunch_address', example: 'Rua A, 123' },
  { header: 'Quarta-Feira Jantar', key: 'wednesday_dinner', example: 'Não' },
  { header: 'Horário Qua Jantar', key: 'wednesday_dinner_time', example: '19:00' },
  { header: 'Endereço Qua Jantar', key: 'wednesday_dinner_address', example: 'Rua A, 123' },
  { header: 'Quinta-Feira Almoço', key: 'thursday_lunch', example: 'Sim' },
  { header: 'Horário Qui Almoço', key: 'thursday_lunch_time', example: '12:00' },
  { header: 'Endereço Qui Almoço', key: 'thursday_lunch_address', example: 'Rua A, 123' },
  { header: 'Quinta-Feira Jantar', key: 'thursday_dinner', example: 'Não' },
  { header: 'Horário Qui Jantar', key: 'thursday_dinner_time', example: '19:00' },
  { header: 'Endereço Qui Jantar', key: 'thursday_dinner_address', example: 'Rua A, 123' },
  { header: 'Sexta-Feira Almoço', key: 'friday_lunch', example: 'Sim' },
  { header: 'Horário Sex Almoço', key: 'friday_lunch_time', example: '12:00' },
  { header: 'Endereço Sex Almoço', key: 'friday_lunch_address', example: 'Rua A, 123' },
  { header: 'Sexta-Feira Jantar', key: 'friday_dinner', example: 'Não' },
  { header: 'Horário Sex Jantar', key: 'friday_dinner_time', example: '19:00' },
  { header: 'Endereço Sex Jantar', key: 'friday_dinner_address', example: 'Rua A, 123' }
];

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerWithAddresses[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<CustomerWithAddresses[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    filterCustomers();
  }, [customers, searchTerm]);

  async function loadCustomers() {
    try {
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('*')
        .order('name');

      if (customersError) throw customersError;

      if (!customersData) {
        setCustomers([]);
        return;
      }

      const customersWithAddresses: CustomerWithAddresses[] = await Promise.all(
        customersData.map(async (customer: Customer) => {
          const { data: addressesData, error: addressesError } = await supabase
            .from('addresses')
            .select('*')
            .eq('customer_id', customer.id);

          if (addressesError) throw addressesError;

          return {
            ...customer,
            addresses: (addressesData as Address[]) || [],
          };
        })
      );

      setCustomers(customersWithAddresses);
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setLoading(false);
    }
  }

  function filterCustomers() {
    if (!searchTerm) {
      setFilteredCustomers(customers);
      return;
    }

    const filtered = customers.filter((customer) =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.whatsapp?.includes(searchTerm) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    setFilteredCustomers(filtered);
  }

  function handleDownloadTemplate() {
    downloadExcelTemplate('modelo-clientes.xlsx', CUSTOMER_COLUMNS);
    toast({
      title: 'Template baixado',
      description: 'Preencha o arquivo Excel e importe os dados.'
    });
  }

  function handleExportData() {
    const exportData = customers.map(customer => ({
      name: customer.name,
      whatsapp: customer.whatsapp,
      email: customer.email,
      phone: customer.phone,
      birth_date: customer.birth_date,
      gender: customer.gender,
      nutritionist_name: customer.nutritionist_name,
      nutritionist_phone: customer.nutritionist_phone,
      main_goal: customer.main_goal,
      allergies: customer.allergies?.join(', '),
      food_restrictions: customer.food_restrictions,
      clinical_conditions: customer.clinical_conditions,
      medication_use: customer.medication_use,
      height_cm: customer.height_cm,
      current_weight_kg: customer.current_weight_kg,
      goal_weight_kg: customer.goal_weight_kg,
      body_fat_percentage: customer.body_fat_percentage,
      skeletal_muscle_mass: customer.skeletal_muscle_mass,
      work_routine: customer.work_routine,
      aerobic_frequency: customer.aerobic_frequency,
      aerobic_intensity: customer.aerobic_intensity,
      strength_frequency: customer.strength_frequency,
      strength_intensity: customer.strength_intensity,
      meals_per_day: customer.meals_per_day,
      dietary_notes: customer.dietary_notes,
      lunch_carbs: customer.lunch_carbs,
      lunch_protein: customer.lunch_protein,
      lunch_fat: customer.lunch_fat,
      dinner_carbs: customer.dinner_carbs,
      dinner_protein: customer.dinner_protein,
      dinner_fat: customer.dinner_fat,
      is_active: customer.is_active
    }));

    exportToExcel('clientes.xlsx', exportData, CUSTOMER_COLUMNS);
    toast({
      title: 'Dados exportados',
      description: `${customers.length} clientes exportados com sucesso.`
    });
  }

  async function handleImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const data = await parseExcelFile<any>(file, CUSTOMER_COLUMNS);

      let successCount = 0;
      let errorCount = 0;

      for (const row of data) {
        try {
          const customerData: any = {
            name: row.name,
            whatsapp: row.whatsapp,
            email: row.email || null,
            phone: row.phone || null,
            birth_date: row.birth_date || null,
            gender: row.gender || null,
            nutritionist_name: row.nutritionist_name || 'não tenho',
            nutritionist_phone: row.nutritionist_phone || null,
            main_goal: row.main_goal || null,
            allergies: row.allergies ? row.allergies.split(',').map((s: string) => s.trim()) : [],
            food_restrictions: row.food_restrictions || null,
            clinical_conditions: row.clinical_conditions || null,
            medication_use: row.medication_use || null,
            height_cm: row.height_cm ? parseFloat(row.height_cm) : null,
            current_weight_kg: row.current_weight_kg ? parseFloat(row.current_weight_kg) : null,
            goal_weight_kg: row.goal_weight_kg ? parseFloat(row.goal_weight_kg) : null,
            body_fat_percentage: row.body_fat_percentage ? parseFloat(row.body_fat_percentage) : null,
            skeletal_muscle_mass: row.skeletal_muscle_mass ? parseFloat(row.skeletal_muscle_mass) : null,
            work_routine: row.work_routine || null,
            aerobic_frequency: row.aerobic_frequency || null,
            aerobic_intensity: row.aerobic_intensity || null,
            strength_frequency: row.strength_frequency || null,
            strength_intensity: row.strength_intensity || null,
            meals_per_day: row.meals_per_day ? parseInt(row.meals_per_day) : null,
            dietary_notes: row.dietary_notes || null,
            lunch_carbs: row.lunch_carbs ? parseFloat(row.lunch_carbs) : null,
            lunch_protein: row.lunch_protein ? parseFloat(row.lunch_protein) : null,
            lunch_fat: row.lunch_fat ? parseFloat(row.lunch_fat) : null,
            dinner_carbs: row.dinner_carbs ? parseFloat(row.dinner_carbs) : null,
            dinner_protein: row.dinner_protein ? parseFloat(row.dinner_protein) : null,
            dinner_fat: row.dinner_fat ? parseFloat(row.dinner_fat) : null,
            is_active: row.is_active === 'Sim' || row.is_active === true || row.is_active === 'TRUE'
          };

          const { data: insertedCustomer, error } = await (supabase as any)
            .from('customers')
            .insert(customerData)
            .select()
            .single();

          if (error) {
            console.error('Error importing customer:', error);
            errorCount++;
          } else {
            const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
            const meals = ['lunch', 'dinner'];
            const dayOfWeekMap: { [key: string]: number } = {
              'monday': 1,
              'tuesday': 2,
              'wednesday': 3,
              'thursday': 4,
              'friday': 5
            };

            for (const day of days) {
              for (const meal of meals) {
                const activeKey = `${day}_${meal}`;
                const timeKey = `${day}_${meal}_time`;
                const addressKey = `${day}_${meal}_address`;

                const isActive = row[activeKey] === 'Sim' || row[activeKey] === 'sim' || row[activeKey] === 'TRUE';
                const deliveryTime = row[timeKey];
                const deliveryAddress = row[addressKey];

                if (isActive && deliveryTime && deliveryAddress) {
                  await (supabase as any)
                    .from('delivery_schedules')
                    .insert({
                      customer_id: insertedCustomer.id,
                      day_of_week: dayOfWeekMap[day],
                      meal_type: meal,
                      delivery_time: deliveryTime,
                      delivery_address: deliveryAddress,
                      is_active: true
                    });
                }
              }
            }

            successCount++;
          }
        } catch (error) {
          console.error('Error processing row:', error);
          errorCount++;
        }
      }

      toast({
        title: 'Importação concluída',
        description: `${successCount} clientes importados com sucesso. ${errorCount > 0 ? `${errorCount} erros encontrados.` : ''}`
      });

      loadCustomers();
    } catch (error) {
      console.error('Error importing file:', error);
      toast({
        title: 'Erro na importação',
        description: 'Não foi possível importar o arquivo. Verifique o formato.',
        variant: 'destructive'
      });
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-600 mt-1">Gerencie clientes e endereços</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por nome, telefone ou e-mail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleDownloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Baixar Modelo
            </Button>
            <Button variant="outline" onClick={handleExportData}>
              <Download className="h-4 w-4 mr-2" />
              Exportar Dados
            </Button>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importing}>
              <Upload className="h-4 w-4 mr-2" />
              {importing ? 'Importando...' : 'Importar Excel'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImport}
              className="hidden"
            />
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Cliente
            </Button>
          </div>
        </div>

        {loading ? (
          <div>Carregando clientes...</div>
        ) : (
          <CustomersTable customers={filteredCustomers} onUpdate={loadCustomers} />
        )}

        <CreateCustomerDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onCreated={loadCustomers}
        />
      </main>
    </div>
  );
}
