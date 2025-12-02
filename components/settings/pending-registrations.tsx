'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserCheck, UserX, RefreshCw, User, Phone, Mail, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { formatPhoneNumber } from '@/lib/format-utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface PendingCustomer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  birth_date: string | null;
  has_nutritionist: boolean;
  nutritionist_name: string | null;
  created_at: string;
  main_goal: string | null;
}

export function PendingRegistrations() {
  const [pendingCustomers, setPendingCustomers] = useState<PendingCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadPendingCustomers();
  }, []);

  async function loadPendingCustomers() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, phone, email, birth_date, has_nutritionist, nutritionist_name, created_at, main_goal')
        .eq('status', 'pending_approval')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPendingCustomers((data as PendingCustomer[]) || []);
    } catch (error) {
      console.error('Error loading pending customers:', error);
      toast.error('Erro ao carregar cadastros pendentes');
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(customerId: string, customerName: string) {
    setActionLoading(customerId);
    try {
      // Buscar o telefone do cliente que está sendo aprovado
      const { data: pendingCustomer, error: fetchError } = await supabase
        .from('customers')
        .select('phone')
        .eq('id', customerId)
        .maybeSingle() as { data: { phone: string } | null; error: any };

      if (fetchError) throw fetchError;
      if (!pendingCustomer) {
        toast.error('Cliente não encontrado');
        return;
      }

      // Verificar se já existe um cliente ATIVO com o mesmo telefone
      const { data: existingCustomers, error: checkError } = await supabase
        .from('customers')
        .select('id, name, phone, status')
        .eq('phone', pendingCustomer.phone)
        .eq('status', 'active')
        .eq('is_active', true) as { data: any[] | null; error: any };

      if (checkError) throw checkError;

      // Se encontrou algum cliente ativo com o mesmo telefone
      if (existingCustomers && existingCustomers.length > 0) {
        const existingCustomer = existingCustomers[0];
        toast.error(
          `Já existe um cliente com esse número de telefone: ${existingCustomer.name}`,
          {
            description: 'Por favor, exclua o cliente duplicado antes de aprovar este cadastro.',
            duration: 6000,
          }
        );
        return;
      }

      // Se não houver conflito, aprovar o cliente
      const { error } = await (supabase as any)
        .from('customers')
        .update({
          status: 'active',
          is_active: true
        })
        .eq('id', customerId);

      if (error) throw error;

      toast.success(`${customerName} aprovado com sucesso!`);
      await loadPendingCustomers();
    } catch (error) {
      console.error('Error approving customer:', error);
      toast.error('Erro ao aprovar cadastro');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(customerId: string, customerName: string) {
    setActionLoading(customerId);
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId);

      if (error) throw error;

      toast.success(`Cadastro de ${customerName} rejeitado`);
      await loadPendingCustomers();
    } catch (error) {
      console.error('Error rejecting customer:', error);
      toast.error('Erro ao rejeitar cadastro');
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">Carregando cadastros pendentes...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Cadastros Pendentes de Aprovação
            </CardTitle>
            <CardDescription>
              Revise e aprove novos cadastros antes de aparecerem na base de clientes
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadPendingCustomers}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {pendingCustomers.length === 0 ? (
          <div className="text-center py-12">
            <UserCheck className="h-12 w-12 mx-auto text-green-500 mb-4" />
            <p className="text-gray-600 text-lg font-medium">Nenhum cadastro pendente</p>
            <p className="text-gray-500 text-sm mt-1">Todos os cadastros foram revisados</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingCustomers.map((customer) => (
              <div
                key={customer.id}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-yellow-50/50 border-yellow-200"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-900">{customer.name}</h3>
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                        Aguardando Aprovação
                      </Badge>
                      {customer.has_nutritionist && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          Com Nutricionista
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-700">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span>{formatPhoneNumber(customer.phone)}</span>
                      </div>
                      {customer.email && (
                        <div className="flex items-center gap-2 text-gray-700">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <span className="truncate">{customer.email}</span>
                        </div>
                      )}
                      {customer.birth_date && (
                        <div className="flex items-center gap-2 text-gray-700">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span>Nascimento: {new Date(customer.birth_date).toLocaleDateString('pt-BR')}</span>
                        </div>
                      )}
                      {customer.main_goal && (
                        <div className="flex items-center gap-2 text-gray-700">
                          <span className="text-gray-500">Objetivo:</span>
                          <span className="font-medium">{customer.main_goal}</span>
                        </div>
                      )}
                    </div>

                    {customer.has_nutritionist && customer.nutritionist_name && (
                      <div className="bg-blue-50 border border-blue-200 rounded p-2 text-sm">
                        <span className="text-blue-900">
                          <strong>Nutricionista:</strong> {customer.nutritionist_name}
                        </span>
                      </div>
                    )}

                    <div className="text-xs text-gray-500">
                      Cadastrado em: {new Date(customer.created_at).toLocaleString('pt-BR')}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleApprove(customer.id, customer.name)}
                      disabled={actionLoading === customer.id}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {actionLoading === customer.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <UserCheck className="h-4 w-4 mr-1" />
                          Aprovar
                        </>
                      )}
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={actionLoading === customer.id}
                        >
                          <UserX className="h-4 w-4 mr-1" />
                          Rejeitar
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Rejeitar cadastro?</AlertDialogTitle>
                          <AlertDialogDescription>
                            O cadastro de <strong>{customer.name}</strong> será excluído permanentemente do sistema.
                            Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleReject(customer.id, customer.name)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Rejeitar Cadastro
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900 mb-2">
              <strong>Como funciona:</strong>
            </p>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Novos cadastros ficam com status "Aguardando Aprovação"</li>
              <li>Clientes pendentes NÃO aparecem na lista de clientes</li>
              <li>Após aprovação, o cliente fica ativo e visível no sistema</li>
              <li>Ao rejeitar, o cadastro é excluído permanentemente</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
