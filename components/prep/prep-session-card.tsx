'use client';

import { PrepSessionWithItems } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Printer, FileText } from 'lucide-react';
import { calculateSessionSummary, formatMacro, formatCost, formatWeight } from '@/lib/calculations';
import { format } from 'date-fns';

interface PrepSessionCardProps {
  session: PrepSessionWithItems;
  onUpdate: () => void;
}

export function PrepSessionCard({ session, onUpdate }: PrepSessionCardProps) {
  const summary = calculateSessionSummary(session.items);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{session.title}</CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              {format(new Date(session.date), 'dd/MM/yyyy')}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <FileText className="h-4 w-4 mr-2" />
              Lista de Preparo
            </Button>
            <Button variant="outline" size="sm">
              <Printer className="h-4 w-4 mr-2" />
              Etiquetas
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {session.notes && (
          <p className="text-sm text-gray-600 italic">{session.notes}</p>
        )}

        <div className="space-y-3">
          <h4 className="font-medium">Itens</h4>
          {session.items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{item.recipe.name}</p>
                  <Badge variant="outline" className="text-xs">
                    {item.recipe.category}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">
                  {formatWeight(item.total_weight_gr)}
                  {item.servings && ` • ${item.servings} porções`}
                </p>
              </div>
              <div className="text-right text-sm">
                {item.recipe.category !== 'Marinada' && (
                  <p className="text-gray-600">
                    {formatMacro((item.recipe.kcal_per_100g / 100) * item.total_weight_gr)} kcal
                  </p>
                )}
                <p className="font-medium">
                  {formatCost((item.recipe.cost_per_100g / 100) * item.total_weight_gr)}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t pt-4">
          <h4 className="font-medium mb-3">Resumo Total</h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-xs text-gray-600">Calorias</p>
              <p className="text-lg font-bold text-blue-900">
                {formatMacro(summary.grandTotals.kcal)}
              </p>
              <p className="text-xs text-gray-600">kcal</p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <p className="text-xs text-gray-600">Proteína</p>
              <p className="text-lg font-bold text-green-900">
                {formatMacro(summary.grandTotals.protein)}
              </p>
              <p className="text-xs text-gray-600">g</p>
            </div>
            <div className="bg-amber-50 p-3 rounded-lg">
              <p className="text-xs text-gray-600">Carboidrato</p>
              <p className="text-lg font-bold text-amber-900">
                {formatMacro(summary.grandTotals.carb)}
              </p>
              <p className="text-xs text-gray-600">g</p>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg">
              <p className="text-xs text-gray-600">Gordura</p>
              <p className="text-lg font-bold text-orange-900">
                {formatMacro(summary.grandTotals.fat)}
              </p>
              <p className="text-xs text-gray-600">g</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs text-gray-600">Custo Total</p>
              <p className="text-lg font-bold text-gray-900">
                {formatCost(summary.grandTotals.cost)}
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            * Macros excluem marinadas. Custo inclui todos os itens.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
