'use client';

import { CustomerWithAddresses } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Edit } from 'lucide-react';

interface CustomersTableProps {
  customers: CustomerWithAddresses[];
  onUpdate: () => void;
}

export function CustomersTable({ customers, onUpdate }: CustomersTableProps) {
  if (customers.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 bg-white rounded-lg border">
        Nenhum cliente encontrado
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Contato</TableHead>
            <TableHead>Macronutrientes</TableHead>
            <TableHead>Endereço Padrão</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((customer) => {
            const defaultAddress = customer.addresses.find((a) => a.is_default) || customer.addresses[0];

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
                    {customer.whatsapp && <p>{customer.whatsapp}</p>}
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
                  {defaultAddress ? (
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                      <div>
                        <Badge variant="outline" className="mb-1 text-xs">
                          {defaultAddress.label}
                        </Badge>
                        <p className="text-gray-600">
                          {defaultAddress.street}
                          {defaultAddress.number && `, ${defaultAddress.number}`}
                        </p>
                        <p className="text-gray-600">
                          {defaultAddress.city} - {defaultAddress.state}
                        </p>
                        {customer.addresses.length > 1 && (
                          <p className="text-xs text-gray-500 mt-1">
                            + {customer.addresses.length - 1} outro(s)
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">Nenhum endereço</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={customer.is_active ? 'default' : 'secondary'}>
                    {customer.is_active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
