'use client';

import { Navigation } from '@/components/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RecipesCatalog } from '@/components/recipes/recipes-catalog';
import { PrepSessions } from '@/components/prep/prep-sessions';
import { CustomersQuickView } from '@/components/customers/customers-quick-view';

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard da Cozinha</h1>
          <p className="text-gray-600 mt-1">Gestão de receitas, preparo e clientes</p>
        </div>

        <Tabs defaultValue="recipes" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="recipes">Catálogo de Receitas</TabsTrigger>
            <TabsTrigger value="prep">Sessões de Preparo</TabsTrigger>
            <TabsTrigger value="customers">Clientes</TabsTrigger>
          </TabsList>

          <TabsContent value="recipes" className="mt-6">
            <RecipesCatalog />
          </TabsContent>

          <TabsContent value="prep" className="mt-6">
            <PrepSessions />
          </TabsContent>

          <TabsContent value="customers" className="mt-6">
            <CustomersQuickView />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
