'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
import type { Customer } from '@/types';
import { Navigation } from '@/components/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, UserCheck, Clock, ExternalLink } from 'lucide-react';
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

  const [lunchCarbs, setLunchCarbs] = useState('');
  const [lunchProtein, setLunchProtein] = useState('');
  const [lunchFat, setLunchFat] = useState('');
  const [dinnerCarbs, setDinnerCarbs] = useState('');
  const [dinnerProtein, setDinnerProtein] = useState('');
  const [dinnerFat, setDinnerFat] = useState('');

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

  function openApprovalDialog(customer: PendingCustomer) {
    setSelectedCustomer(customer);
    setLunchCarbs(customer.lunch_carbs?.toString() || '');
    setLunchProtein(customer.lunch_protein?.toString() || '');
    setLunchFat(customer.lunch_fat?.toString() || '');
    setDinnerCarbs(customer.dinner_carbs?.toString() || '');
    setDinnerProtein(customer.dinner_protein?.toString() || '');
    setDinnerFat(customer.dinner_fat?.toString() || '');
    setShowApprovalDialog(true);
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
              <span className="font-medium">{customer.email || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Objetivo:</span>
              <span className="font-medium">{customer.main_goal || '-'}</span>
            </div>
            {customer.has_nutritionist && (
              <>
                <div className="flex justify-between">
                  <span className="text-slate-600">Nutricionista:</span>
                  <span className="font-medium">{customer.nutritionist_name || '-'}</span>
                </div>
                {customer.meal_plan_file_url && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Plano:</span>
                    <a
                      href={customer.meal_plan_file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                    >
                      Ver arquivo
                      <ExternalLink className="w-3 h-3" />
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
              </>
            )}
          </div>

          <Button
            onClick={() => openApprovalDialog(customer)}
            className="w-full"
            variant="default"
          >
            <UserCheck className="w-4 h-4 mr-2" />
            Revisar e Aprovar
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Navigation />
      <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Novos Entrantes</h1>
        <p className="text-slate-600">
          Clientes que finalizaram o cadastro e aguardam aprovação
        </p>
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
            <div className="border rounded-lg p-4 space-y-4 bg-slate-50">
              <h4 className="font-semibold text-lg">Almoço</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="lunchCarbs">Carboidratos (g)</Label>
                  <Input
                    id="lunchCarbs"
                    type="number"
                    step="0.01"
                    value={lunchCarbs}
                    onChange={(e) => setLunchCarbs(e.target.value)}
                    placeholder="50"
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
                    placeholder="35"
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
                    placeholder="15"
                  />
                </div>
              </div>
            </div>

            <div className="border rounded-lg p-4 space-y-4 bg-slate-50">
              <h4 className="font-semibold text-lg">Jantar</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="dinnerCarbs">Carboidratos (g)</Label>
                  <Input
                    id="dinnerCarbs"
                    type="number"
                    step="0.01"
                    value={dinnerCarbs}
                    onChange={(e) => setDinnerCarbs(e.target.value)}
                    placeholder="40"
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
                    placeholder="30"
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
                    placeholder="12"
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
      </div>
    </>
  );
}
