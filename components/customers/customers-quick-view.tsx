'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { CustomerWithAddresses, Customer, Address } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, MapPin, Phone, Mail } from 'lucide-react';

export function CustomersQuickView() {
  const [customers, setCustomers] = useState<CustomerWithAddresses[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<CustomerWithAddresses[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

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
        .eq('is_active', true)
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

  if (loading) {
    return <div>Carregando clientes...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Clientes</h2>
          <p className="text-gray-600">Visualização rápida dos clientes ativos</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Buscar por nome, telefone ou e-mail..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map((customer) => {
          const defaultAddress = customer.addresses.find((a) => a.is_default) || customer.addresses[0];

          return (
            <Card key={customer.id}>
              <CardHeader>
                <CardTitle className="text-lg">{customer.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {customer.whatsapp && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span>{customer.whatsapp}</span>
                  </div>
                )}

                {customer.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span>{customer.email}</span>
                  </div>
                )}

                {defaultAddress && (
                  <div className="pt-2 border-t">
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                      <div>
                        <Badge variant="outline" className="mb-1 text-xs">
                          {defaultAddress.label}
                        </Badge>
                        <p className="text-gray-600">
                          {defaultAddress.street}
                          {defaultAddress.number && `, ${defaultAddress.number}`}
                          {defaultAddress.complement && ` - ${defaultAddress.complement}`}
                        </p>
                        <p className="text-gray-600">
                          {defaultAddress.neighborhood && `${defaultAddress.neighborhood}, `}
                          {defaultAddress.city} - {defaultAddress.state}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {customer.dietary_notes && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-gray-600 mb-1">Notas Dietéticas:</p>
                    <p className="text-sm italic">{customer.dietary_notes}</p>
                  </div>
                )}

                {customer.addresses.length > 1 && (
                  <p className="text-xs text-gray-500 pt-2">
                    + {customer.addresses.length - 1} outro(s) endereço(s)
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredCustomers.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          Nenhum cliente encontrado
        </div>
      )}
    </div>
  );
}
