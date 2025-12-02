'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
import type { Customer } from '@/types';
import { ProtectedLayout } from '@/components/layouts/protected-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, UserCheck, Clock, ExternalLink, Trash2, Download, FileDown, ChevronDown, ChevronUp } from 'lucide-react';
import * as XLSX from 'xlsx';
import { calculateMacroRecommendation } from '@/lib/calculations';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type PendingCustomer = Customer;

export default function EntrantesPage() {
  const [withNutritionist, setWithNutritionist] = useState<PendingCustomer[]>([]);
  const [withoutNutritionist, setWithoutNutritionist] = useState<PendingCustomer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<PendingCustomer | null>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<PendingCustomer | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const [lunchCarbs, setLunchCarbs] = useState('');
  const [lunchProtein, setLunchProtein] = useState('');
  const [lunchFat, setLunchFat] = useState('');
  const [dinnerCarbs, setDinnerCarbs] = useState('');
  const [dinnerProtein, setDinnerProtein] = useState('');
  const [dinnerFat, setDinnerFat] = useState('');
  const [macroSuggestions, setMacroSuggestions] = useState<any>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    loadPendingCustomers();
  }, []);

  async function loadPendingCustomers() {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('status', 'pending_approval')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const customers = (data || []) as PendingCustomer[];
      setWithNutritionist(customers.filter(c => c.has_nutritionist));
      setWithoutNutritionist(customers.filter(c => !c.has_nutritionist));
    } catch (error) {
      console.error('Error loading pending customers:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os clientes pendentes',
        variant: 'destructive',
      });
    }
  }

  async function openApprovalDialog(customer: PendingCustomer) {
    setSelectedCustomer(customer);
    setLunchCarbs(customer.lunch_carbs?.toString() || '');
    setLunchProtein(customer.lunch_protein?.toString() || '');
    setLunchFat(customer.lunch_fat?.toString() || '');
    setDinnerCarbs(customer.dinner_carbs?.toString() || '');
    setDinnerProtein(customer.dinner_protein?.toString() || '');
    setDinnerFat(customer.dinner_fat?.toString() || '');
    setMacroSuggestions(null);
    setShowApprovalDialog(true);

    if (!customer.has_nutritionist &&
        customer.height_cm && customer.current_weight_kg &&
        customer.goal_weight_kg && customer.birth_date &&
        customer.work_routine && customer.aerobic_frequency &&
        customer.aerobic_intensity && customer.strength_frequency &&
        customer.strength_intensity && customer.main_goal) {
      setLoadingSuggestions(true);
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

        if (!customer.lunch_carbs) {
          setLunchCarbs(suggestions.lunch.carb.toString());
          setLunchProtein(suggestions.lunch.protein.toString());
          setLunchFat(suggestions.lunch.fat.toString());
          setDinnerCarbs(suggestions.dinner.carb.toString());
          setDinnerProtein(suggestions.dinner.protein.toString());
          setDinnerFat(suggestions.dinner.fat.toString());
        }
      } catch (error) {
        console.error('Error calculating macro suggestions:', error);
      } finally {
        setLoadingSuggestions(false);
      }
    }
  }

  function toggleCardExpansion(customerId: string) {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(customerId)) {
      newExpanded.delete(customerId);
    } else {
      newExpanded.add(customerId);
    }
    setExpandedCards(newExpanded);
  }

  async function deleteCustomer() {
    if (!customerToDelete) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerToDelete.id);

      if (error) throw error;

      toast({
        title: 'Cliente excluído',
        description: `${customerToDelete.name} foi removido do sistema`,
      });

      setShowDeleteDialog(false);
      setCustomerToDelete(null);
      loadPendingCustomers();
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o cliente',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  function exportToExcel() {
    const allCustomers = [...withNutritionist, ...withoutNutritionist];

    const dataToExport = allCustomers.map(customer => ({
      'Nome': customer.name,
      'Email': customer.email || '-',
      'Telefone': customer.phone || '-',
      'Data Cadastro': new Date(customer.created_at).toLocaleDateString('pt-BR'),
      'Tem Nutricionista': customer.has_nutritionist ? 'Sim' : 'Não',
      'Nutricionista': customer.nutritionist_name || '-',
      'Contato Nutri': customer.nutritionist_phone || '-',
      'Objetivo': customer.main_goal || '-',
      'Peso Atual (kg)': customer.current_weight_kg || '-',
      'Peso Alvo (kg)': customer.goal_weight_kg || '-',
      'Altura (cm)': customer.height_cm || '-',
      'Gênero': customer.gender || '-',
      'Data Nascimento': customer.birth_date || '-',
      'Restrições': customer.food_restrictions || '-',
      'Alergias': customer.allergies?.join(', ') || '-',
      'Condições Clínicas': customer.clinical_conditions || '-',
      'Medicamentos': customer.medication_use || '-',
      'Rotina Trabalho': customer.work_routine || '-',
      'Freq Aeróbico': customer.aerobic_frequency || '-',
      'Intensidade Aeróbico': customer.aerobic_intensity || '-',
      'Freq Musculação': customer.strength_frequency || '-',
      'Intensidade Musculação': customer.strength_intensity || '-',
      'Refeições/Dia': customer.meals_per_day || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Novos Entrantes');

    const fileName = `novos-entrantes-${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);

    toast({
      title: 'Exportado!',
      description: 'Dados exportados para Excel com sucesso',
    });
  }

  async function approveCustomer() {
    if (!selectedCustomer) return;

    if (!lunchCarbs || !lunchProtein || !lunchFat || !dinnerCarbs || !dinnerProtein || !dinnerFat) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha todos os macronutrientes antes de aprovar',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await (supabase as any)
        .from('customers')
        .update({
          status: 'active',
          lunch_carbs: parseFloat(lunchCarbs),
          lunch_protein: parseFloat(lunchProtein),
          lunch_fat: parseFloat(lunchFat),
          dinner_carbs: parseFloat(dinnerCarbs),
          dinner_protein: parseFloat(dinnerProtein),
          dinner_fat: parseFloat(dinnerFat),
        })
        .eq('id', selectedCustomer.id);

      if (error) throw error;

      toast({
        title: 'Cliente aprovado!',
        description: `${selectedCustomer.name} foi aprovado e está ativo no sistema`,
      });

      setShowApprovalDialog(false);
      setSelectedCustomer(null);
      loadPendingCustomers();
    } catch (error) {
      console.error('Error approving customer:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível aprovar o cliente',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  function CustomerCard({ customer }: { customer: PendingCustomer }) {
    const isExpanded = expandedCards.has(customer.id);

    return (
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg">{customer.name}</CardTitle>
              <CardDescription className="flex items-center gap-2">
                <Clock className="w-3 h-3" />
                {new Date(customer.created_at).toLocaleDateString('pt-BR')}
              </CardDescription>
            </div>
            <Badge variant={customer.has_nutritionist ? 'default' : 'secondary'}>
              {customer.has_nutritionist ? 'Com Nutri' : 'Sem Nutri'}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Telefone:</span>
              <span className="font-medium">{customer.phone || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Email:</span>
              <span className="font-medium text-right break-all">{customer.email || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Objetivo:</span>
              <span className="font-medium text-right">{customer.main_goal || '-'}</span>
            </div>

            {customer.has_nutritionist && (
              <>
                <div className="flex justify-between">
                  <span className="text-slate-600">Nutricionista:</span>
                  <span className="font-medium">{customer.nutritionist_name || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Contato Nutri:</span>
                  <span className="font-medium">{customer.nutritionist_phone || '-'}</span>
                </div>
                {customer.meal_plan_file_url && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Plano Alimentar:</span>
                    <a
                      href={customer.meal_plan_file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-white px-3 py-1 rounded-md text-xs hover:opacity-90 transition-opacity"
                      style={{ backgroundColor: '#5F7469' }}
                      download
                    >
                      <FileDown className="w-3 h-3" />
                      Baixar PDF
                    </a>
                  </div>
                )}
              </>
            )}

            {!customer.has_nutritionist && (
              <>
                <div className="flex justify-between">
                  <span className="text-slate-600">Peso:</span>
                  <span className="font-medium">{customer.current_weight_kg}kg → {customer.goal_weight_kg}kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Altura:</span>
                  <span className="font-medium">{customer.height_cm}cm</span>
                </div>
                {customer.gender && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Gênero:</span>
                    <span className="font-medium">{customer.gender}</span>
                  </div>
                )}
                {customer.birth_date && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Data Nascimento:</span>
                    <span className="font-medium">{new Date(customer.birth_date).toLocaleDateString('pt-BR')}</span>
                  </div>
                )}
              </>
            )}

            {isExpanded && (
              <div className="space-y-2 pt-3 border-t border-slate-200">
                {customer.food_restrictions && (
                  <div className="flex flex-col gap-1">
                    <span className="text-slate-600">Restrições Alimentares:</span>
                    <span className="font-medium text-sm bg-slate-50 p-2 rounded">{customer.food_restrictions}</span>
                  </div>
                )}
                {customer.allergies && customer.allergies.length > 0 && (
                  <div className="flex flex-col gap-1">
                    <span className="text-slate-600">Alergias:</span>
                    <span className="font-medium text-sm bg-red-50 p-2 rounded text-red-800">{customer.allergies.join(', ')}</span>
                  </div>
                )}
                {customer.clinical_conditions && (
                  <div className="flex flex-col gap-1">
                    <span className="text-slate-600">Condições Clínicas:</span>
                    <span className="font-medium text-sm bg-slate-50 p-2 rounded">{customer.clinical_conditions}</span>
                  </div>
                )}
                {customer.medication_use && (
                  <div className="flex flex-col gap-1">
                    <span className="text-slate-600">Uso de Medicamentos:</span>
                    <span className="font-medium text-sm bg-slate-50 p-2 rounded">{customer.medication_use}</span>
                  </div>
                )}
                {customer.body_fat_percentage && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">% Gordura:</span>
                    <span className="font-medium">{customer.body_fat_percentage}%</span>
                  </div>
                )}
                {customer.skeletal_muscle_mass && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Massa Muscular:</span>
                    <span className="font-medium">{customer.skeletal_muscle_mass}kg</span>
                  </div>
                )}
                {customer.work_routine && (
                  <div className="flex flex-col gap-1">
                    <span className="text-slate-600">Rotina de Trabalho:</span>
                    <span className="font-medium text-sm bg-slate-50 p-2 rounded">{customer.work_routine}</span>
                  </div>
                )}
                {customer.aerobic_frequency && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Frequência Aeróbico:</span>
                    <span className="font-medium text-right">{customer.aerobic_frequency}</span>
                  </div>
                )}
                {customer.aerobic_intensity && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Intensidade Aeróbico:</span>
                    <span className="font-medium text-right">{customer.aerobic_intensity}</span>
                  </div>
                )}
                {customer.strength_frequency && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Frequência Musculação:</span>
                    <span className="font-medium text-right">{customer.strength_frequency}</span>
                  </div>
                )}
                {customer.strength_intensity && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Intensidade Musculação:</span>
                    <span className="font-medium text-right">{customer.strength_intensity}</span>
                  </div>
                )}
                {customer.meals_per_day && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Refeições por Dia:</span>
                    <span className="font-medium">{customer.meals_per_day}</span>
                  </div>
                )}
                {customer.dietary_notes && (
                  <div className="flex flex-col gap-1">
                    <span className="text-slate-600">Observações Nutricionais:</span>
                    <span className="font-medium text-sm bg-slate-50 p-2 rounded">{customer.dietary_notes}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <Button
            onClick={() => toggleCardExpansion(customer.id)}
            variant="outline"
            className="w-full"
            size="sm"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4 mr-2" />
                Ver Menos
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-2" />
                Ver Todas Informações
              </>
            )}
          </Button>

          <div className="flex gap-2">
            <Button
              onClick={() => openApprovalDialog(customer)}
              className="flex-1"
              variant="default"
            >
              <UserCheck className="w-4 h-4 mr-2" />
              Revisar e Aprovar
            </Button>
            <Button
              onClick={() => {
                setCustomerToDelete(customer);
                setShowDeleteDialog(true);
              }}
              variant="destructive"
              size="icon"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <ProtectedLayout>
    <>
      <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Novos Entrantes</h1>
          <p className="text-slate-600">
            Clientes que finalizaram o cadastro e aguardam aprovação
          </p>
        </div>
        <Button
          onClick={exportToExcel}
          variant="outline"
          className="flex items-center gap-2"
          disabled={withNutritionist.length === 0 && withoutNutritionist.length === 0}
        >
          <Download className="w-4 h-4" />
          Exportar Excel
        </Button>
      </div>

      <Tabs defaultValue="with-nutritionist" className="space-y-6">
        <TabsList>
          <TabsTrigger value="with-nutritionist" className="flex items-center gap-2">
            Com Nutricionista
            {withNutritionist.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {withNutritionist.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="without-nutritionist" className="flex items-center gap-2">
            Sem Nutricionista
            {withoutNutritionist.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {withoutNutritionist.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="with-nutritionist">
          {withNutritionist.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-slate-600">
                Nenhum cliente com nutricionista aguardando aprovação
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {withNutritionist.map((customer) => (
                <CustomerCard key={customer.id} customer={customer} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="without-nutritionist">
          {withoutNutritionist.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-slate-600">
                Nenhum cliente sem nutricionista aguardando aprovação
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {withoutNutritionist.map((customer) => (
                <CustomerCard key={customer.id} customer={customer} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Aprovar Cliente: {selectedCustomer?.name}</DialogTitle>
            <DialogDescription>
              Defina os macronutrientes e aprove o cliente para o sistema
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {selectedCustomer && (
              <div className="border rounded-lg p-4 bg-blue-50 space-y-2 text-sm">
                <h4 className="font-semibold text-blue-900 mb-3">Resumo do Cliente</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-blue-700">Email:</span>
                    <p className="font-medium text-blue-900">{selectedCustomer.email || '-'}</p>
                  </div>
                  <div>
                    <span className="text-blue-700">Telefone:</span>
                    <p className="font-medium text-blue-900">{selectedCustomer.phone || '-'}</p>
                  </div>
                  <div>
                    <span className="text-blue-700">Objetivo:</span>
                    <p className="font-medium text-blue-900">{selectedCustomer.main_goal || '-'}</p>
                  </div>
                  {selectedCustomer.has_nutritionist && (
                    <>
                      <div>
                        <span className="text-blue-700">Nutricionista:</span>
                        <p className="font-medium text-blue-900">{selectedCustomer.nutritionist_name || '-'}</p>
                      </div>
                      {selectedCustomer.meal_plan_file_url && (
                        <div className="col-span-2">
                          <a
                            href={selectedCustomer.meal_plan_file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-white px-3 py-2 rounded-md text-sm hover:opacity-90 transition-opacity w-fit"
                            style={{ backgroundColor: '#5F7469' }}
                            download
                          >
                            <FileDown className="w-4 h-4" />
                            Baixar Plano Alimentar (PDF)
                          </a>
                        </div>
                      )}
                    </>
                  )}
                  {!selectedCustomer.has_nutritionist && (
                    <>
                      <div>
                        <span className="text-blue-700">Peso:</span>
                        <p className="font-medium text-blue-900">{selectedCustomer.current_weight_kg}kg → {selectedCustomer.goal_weight_kg}kg</p>
                      </div>
                      <div>
                        <span className="text-blue-700">Altura:</span>
                        <p className="font-medium text-blue-900">{selectedCustomer.height_cm}cm</p>
                      </div>
                    </>
                  )}
                  {selectedCustomer.allergies && selectedCustomer.allergies.length > 0 && (
                    <div className="col-span-2 bg-red-100 p-2 rounded border border-red-300">
                      <span className="text-red-700 font-semibold">Alergias:</span>
                      <p className="font-medium text-red-900">{selectedCustomer.allergies.join(', ')}</p>
                    </div>
                  )}
                  {selectedCustomer.food_restrictions && (
                    <div className="col-span-2">
                      <span className="text-blue-700">Restrições:</span>
                      <p className="font-medium text-blue-900">{selectedCustomer.food_restrictions}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedCustomer && !selectedCustomer.has_nutritionist && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🤖</span>
                  <div>
                    <p className="font-semibold text-blue-900">Recomendação Automática</p>
                    <p className="text-xs text-blue-700">Cliente sem nutricionista - valores calculados com base nas informações fornecidas</p>
                  </div>
                </div>
                {loadingSuggestions && (
                  <p className="text-sm text-blue-700">Calculando recomendações...</p>
                )}
                {!loadingSuggestions && macroSuggestions && (
                  <div className="text-xs text-blue-800 mt-2 space-y-1">
                    <p className="font-medium">Meta diária: {macroSuggestions.daily.kcal} kcal</p>
                    <p>Proteína: {macroSuggestions.daily.protein}g | Carboidrato: {macroSuggestions.daily.carb}g | Gordura: {macroSuggestions.daily.fat}g</p>
                  </div>
                )}
              </div>
            )}

            <div className="border rounded-lg p-4 space-y-4 bg-slate-50">
              <h4 className="font-semibold text-lg">Almoço</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <Label htmlFor="lunchCarbs">Carboidratos (g)</Label>
                    {selectedCustomer && !selectedCustomer.has_nutritionist && macroSuggestions && (
                      <span className="text-xs text-blue-600 font-medium">↗ {macroSuggestions.lunch.carb}g</span>
                    )}
                  </div>
                  <Input
                    id="lunchCarbs"
                    type="number"
                    step="0.01"
                    value={lunchCarbs}
                    onChange={(e) => setLunchCarbs(e.target.value)}
                    placeholder={macroSuggestions ? macroSuggestions.lunch.carb.toString() : "50"}
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <Label htmlFor="lunchProtein">Proteínas (g)</Label>
                    {selectedCustomer && !selectedCustomer.has_nutritionist && macroSuggestions && (
                      <span className="text-xs text-blue-600 font-medium">↗ {macroSuggestions.lunch.protein}g</span>
                    )}
                  </div>
                  <Input
                    id="lunchProtein"
                    type="number"
                    step="0.01"
                    value={lunchProtein}
                    onChange={(e) => setLunchProtein(e.target.value)}
                    placeholder={macroSuggestions ? macroSuggestions.lunch.protein.toString() : "35"}
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <Label htmlFor="lunchFat">Gorduras (g)</Label>
                    {selectedCustomer && !selectedCustomer.has_nutritionist && macroSuggestions && (
                      <span className="text-xs text-blue-600 font-medium">↗ {macroSuggestions.lunch.fat}g</span>
                    )}
                  </div>
                  <Input
                    id="lunchFat"
                    type="number"
                    step="0.01"
                    value={lunchFat}
                    onChange={(e) => setLunchFat(e.target.value)}
                    placeholder={macroSuggestions ? macroSuggestions.lunch.fat.toString() : "15"}
                  />
                </div>
              </div>
            </div>

            <div className="border rounded-lg p-4 space-y-4 bg-slate-50">
              <h4 className="font-semibold text-lg">Jantar</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <Label htmlFor="dinnerCarbs">Carboidratos (g)</Label>
                    {selectedCustomer && !selectedCustomer.has_nutritionist && macroSuggestions && (
                      <span className="text-xs text-blue-600 font-medium">↗ {macroSuggestions.dinner.carb}g</span>
                    )}
                  </div>
                  <Input
                    id="dinnerCarbs"
                    type="number"
                    step="0.01"
                    value={dinnerCarbs}
                    onChange={(e) => setDinnerCarbs(e.target.value)}
                    placeholder={macroSuggestions ? macroSuggestions.dinner.carb.toString() : "40"}
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <Label htmlFor="dinnerProtein">Proteínas (g)</Label>
                    {selectedCustomer && !selectedCustomer.has_nutritionist && macroSuggestions && (
                      <span className="text-xs text-blue-600 font-medium">↗ {macroSuggestions.dinner.protein}g</span>
                    )}
                  </div>
                  <Input
                    id="dinnerProtein"
                    type="number"
                    step="0.01"
                    value={dinnerProtein}
                    onChange={(e) => setDinnerProtein(e.target.value)}
                    placeholder={macroSuggestions ? macroSuggestions.dinner.protein.toString() : "30"}
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <Label htmlFor="dinnerFat">Gorduras (g)</Label>
                    {selectedCustomer && !selectedCustomer.has_nutritionist && macroSuggestions && (
                      <span className="text-xs text-blue-600 font-medium">↗ {macroSuggestions.dinner.fat}g</span>
                    )}
                  </div>
                  <Input
                    id="dinnerFat"
                    type="number"
                    step="0.01"
                    value={dinnerFat}
                    onChange={(e) => setDinnerFat(e.target.value)}
                    placeholder={macroSuggestions ? macroSuggestions.dinner.fat.toString() : "12"}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowApprovalDialog(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button onClick={approveCustomer} disabled={loading}>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {loading ? 'Aprovando...' : 'Aprovar Cliente'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o cadastro de <strong>{customerToDelete?.name}</strong>?
              <br />
              <br />
              Esta ação não pode ser desfeita e todos os dados serão permanentemente removidos.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setCustomerToDelete(null);
              }}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={deleteCustomer}
              disabled={loading}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {loading ? 'Excluindo...' : 'Excluir Cliente'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </>
    </ProtectedLayout>
  );
}
