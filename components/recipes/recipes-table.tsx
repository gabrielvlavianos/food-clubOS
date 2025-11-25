'use client';

import { useState } from 'react';
import { Recipe } from '@/types';
import { Database } from '@/types/database';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Edit, Copy, Trash2, ArrowUpDown } from 'lucide-react';
import { formatMacro, formatCost } from '@/lib/calculations';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

type SortField = 'name' | 'category' | 'kcal_per_100g' | 'protein_per_100g' | 'carb_per_100g' | 'fat_per_100g' | 'cost_per_100g';
type SortOrder = 'asc' | 'desc';

interface RecipesTableProps {
  recipes: Recipe[];
  onUpdate: () => void;
  onEdit?: (recipe: Recipe) => void;
  onDuplicate?: (recipe: Recipe) => void;
  onDelete?: (recipe: Recipe) => void;
}

export function RecipesTable({ recipes, onUpdate, onEdit, onDuplicate, onDelete }: RecipesTableProps) {
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const { toast } = useToast();

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  }

  const sortedRecipes = [...recipes].sort((a, b) => {
    if (!sortField) return 0;

    let aValue = a[sortField];
    let bValue = b[sortField];

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  async function handleToggleStatus(recipeId: string, currentStatus: boolean) {
    setUpdatingStatus(recipeId);
    try {
      const newStatus = !currentStatus;

      const { error } = await supabase
        .from('recipes')
        // @ts-expect-error - TypeScript has issues with Supabase update typing
        .update({ is_active: newStatus })
        .eq('id', recipeId);

      if (error) throw error;

      toast({
        title: 'Status atualizado',
        description: `Receita ${newStatus ? 'ativada' : 'desativada'} com sucesso`,
      });

      onUpdate();
    } catch (error) {
      console.error('Error updating recipe status:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o status',
        variant: 'destructive',
      });
    } finally {
      setUpdatingStatus(null);
    }
  }

  function getCategoryColor(category: string) {
    const colors: Record<string, string> = {
      'Proteína': 'bg-red-100 text-red-800',
      'Carboidrato': 'bg-amber-100 text-amber-800',
      'Legumes': 'bg-green-100 text-green-800',
      'Salada': 'bg-emerald-100 text-emerald-800',
      'Marinada': 'bg-purple-100 text-purple-800',
      'Molho Salada': 'bg-blue-100 text-blue-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  }

  function SortableHeader({ field, children, className }: { field: SortField; children: React.ReactNode; className?: string }) {
    return (
      <TableHead className={className}>
        <button
          onClick={() => handleSort(field)}
          className="flex items-center gap-1 hover:text-gray-900 transition-colors font-medium"
        >
          {children}
          <ArrowUpDown className="h-3 w-3" />
        </button>
      </TableHead>
    );
  }

  if (recipes.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 bg-white rounded-lg border">
        Nenhuma receita encontrada
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <SortableHeader field="name">Nome</SortableHeader>
            <SortableHeader field="category">Categoria</SortableHeader>
            <SortableHeader field="kcal_per_100g" className="text-right">Kcal/100g</SortableHeader>
            <SortableHeader field="protein_per_100g" className="text-right">Prot/100g</SortableHeader>
            <SortableHeader field="carb_per_100g" className="text-right">Carb/100g</SortableHeader>
            <SortableHeader field="fat_per_100g" className="text-right">Gord/100g</SortableHeader>
            <SortableHeader field="cost_per_100g" className="text-right">Custo/100g</SortableHeader>
            <TableHead>Status</TableHead>
            <TableHead className="text-right w-[140px]">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedRecipes.map((recipe) => (
            <TableRow key={recipe.id} className={!recipe.is_active ? 'opacity-60' : ''}>
              <TableCell>
                <div>
                  <p className="font-medium">{recipe.name}</p>
                  {recipe.allergens && recipe.allergens.length > 0 && recipe.allergens[0] !== 'nenhum' && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {recipe.allergens.map((allergen, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {allergen}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge className={getCategoryColor(recipe.category)} variant="secondary">
                  {recipe.category}
                </Badge>
              </TableCell>
              <TableCell className="text-right">{formatMacro(recipe.kcal_per_100g)}</TableCell>
              <TableCell className="text-right">{formatMacro(recipe.protein_per_100g)}g</TableCell>
              <TableCell className="text-right">{formatMacro(recipe.carb_per_100g)}g</TableCell>
              <TableCell className="text-right">{formatMacro(recipe.fat_per_100g)}g</TableCell>
              <TableCell className="text-right font-medium">{formatCost(recipe.cost_per_100g)}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={recipe.is_active}
                    onCheckedChange={() => handleToggleStatus(recipe.id, recipe.is_active)}
                    disabled={updatingStatus === recipe.id}
                  />
                  <span className={`text-sm font-medium ${
                    recipe.is_active ? 'text-gray-900' : 'text-gray-400'
                  }`}>
                    {recipe.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-right w-[140px]">
                <div className="flex justify-end gap-1 whitespace-nowrap">
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Editar"
                    onClick={() => onEdit?.(recipe)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Duplicar"
                    onClick={() => onDuplicate?.(recipe)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Excluir"
                    onClick={() => onDelete?.(recipe)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
