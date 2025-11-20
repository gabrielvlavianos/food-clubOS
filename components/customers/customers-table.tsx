'use client';

import { useState } from 'react';
import { CustomerWithAddresses } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import { EditCustomerDialog } from './edit-customer-dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface CustomersTableProps {
  customers: CustomerWithAddresses[];
  onUpdate: () => void;
}

export function CustomersTable({ customers, onUpdate }: CustomersTableProps) {
  const [editingCustomer, setEditingCustomer] = useState<CustomerWithAddresses | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<CustomerWithAddresses | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  async function handleDelete() {
    if (!deletingCustomer) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', deletingCustomer.id);

      if (error) throw error;

      toast({
        title: 'Cliente removido',
        description: 'Cliente removido com sucesso',
      });

      setDeletingCustomer(null);
      onUpdate();
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover o cliente',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  }

  if (customers.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 bg-white rounded-lg border">
        Nenhum cliente encontrado
      </div>
    );
  }

  return (
    <>
    <div className="bg-white rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Contato</TableHead>
            <TableHead>Macronutrientes</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((customer) => {
            return (
              <TableRow key={customer.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{customer.name}</p>
                    {customer.dietary_notes && (
                      <p className="text-xs text-gray-500 italic">{customer.dietary_notes}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {customer.phone && <p>{customer.phone}</p>}
                    {customer.email && <p className="text-gray-600">{customer.email}</p>}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-xs space-y-1">
                    {(customer.lunch_carbs || customer.lunch_protein || customer.lunch_fat) ? (
                      <div>
                        <p className="font-medium text-gray-700">Almoço:</p>
                        <p className="text-gray-600">
                          C: {customer.lunch_carbs || '-'}g | P: {customer.lunch_protein || '-'}g | G: {customer.lunch_fat || '-'}g
                        </p>
                      </div>
                    ) : null}
                    {(customer.dinner_carbs || customer.dinner_protein || customer.dinner_fat) ? (
                      <div>
                        <p className="font-medium text-gray-700">Jantar:</p>
                        <p className="text-gray-600">
                          C: {customer.dinner_carbs || '-'}g | P: {customer.dinner_protein || '-'}g | G: {customer.dinner_fat || '-'}g
                        </p>
                      </div>
                    ) : null}
                    {!(customer.lunch_carbs || customer.lunch_protein || customer.lunch_fat || customer.dinner_carbs || customer.dinner_protein || customer.dinner_fat) && (
                      <span className="text-gray-400">Não definido</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={customer.is_active ? 'default' : 'secondary'}>
                    {customer.is_active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingCustomer(customer)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingCustomer(customer)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>

    <EditCustomerDialog
      open={!!editingCustomer}
      onOpenChange={(open) => !open && setEditingCustomer(null)}
      onUpdated={onUpdate}
      customer={editingCustomer}
    />

    <AlertDialog open={!!deletingCustomer} onOpenChange={(open) => !open && setDeletingCustomer(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação não pode ser desfeita. Isso removerá permanentemente o cliente{' '}
            <strong>{deletingCustomer?.name}</strong> e todos os dados relacionados.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDeleting ? 'Removendo...' : 'Remover'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
