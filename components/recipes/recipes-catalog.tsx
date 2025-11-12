'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Recipe } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Printer } from 'lucide-react';
import { formatMacro, formatCost } from '@/lib/calculations';

export function RecipesCatalog() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecipes();
  }, []);

  useEffect(() => {
    filterRecipes();
  }, [recipes, searchTerm, categoryFilter, activeFilter]);

  async function loadRecipes() {
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .order('name');

      if (error) throw error;
      setRecipes(data || []);
    } catch (error) {
      console.error('Error loading recipes:', error);
    } finally {
      setLoading(false);
    }
  }

  function filterRecipes() {
    let filtered = recipes;

    if (searchTerm) {
      filtered = filtered.filter((recipe) =>
        recipe.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter((recipe) => recipe.category === categoryFilter);
    }

    if (activeFilter !== 'all') {
      filtered = filtered.filter((recipe) =>
        activeFilter === 'active' ? recipe.is_active : !recipe.is_active
      );
    }

    setFilteredRecipes(filtered);
  }

  function getCategoryColor(category: string) {
    const colors: Record<string, string> = {
      'Proteína': 'bg-red-100 text-red-800',
      'Carboidrato': 'bg-amber-100 text-amber-800',
      'Legumes': 'bg-green-100 text-green-800',
      'Salada': 'bg-emerald-100 text-emerald-800',
      'Marinada': 'bg-purple-100 text-purple-800',
      'Molho': 'bg-blue-100 text-blue-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  }

  if (loading) {
    return <div>Carregando receitas...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar receitas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            <SelectItem value="Proteína">Proteína</SelectItem>
            <SelectItem value="Carboidrato">Carboidrato</SelectItem>
            <SelectItem value="Legumes">Legumes</SelectItem>
            <SelectItem value="Salada">Salada</SelectItem>
            <SelectItem value="Marinada">Marinada</SelectItem>
            <SelectItem value="Molho">Molho</SelectItem>
          </SelectContent>
        </Select>

        <Select value={activeFilter} onValueChange={setActiveFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="inactive">Inativos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRecipes.map((recipe) => (
          <Card key={recipe.id} className={!recipe.is_active ? 'opacity-60' : ''}>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-lg">{recipe.name}</CardTitle>
                <Button variant="ghost" size="icon" title="Imprimir ficha">
                  <Printer className="h-4 w-4" />
                </Button>
              </div>
              <Badge className={getCategoryColor(recipe.category)} variant="secondary">
                {recipe.category}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-gray-600">Kcal/100g</p>
                  <p className="font-medium">{formatMacro(recipe.kcal_per_100g)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Proteína/100g</p>
                  <p className="font-medium">{formatMacro(recipe.protein_per_100g)}g</p>
                </div>
                <div>
                  <p className="text-gray-600">Carbo/100g</p>
                  <p className="font-medium">{formatMacro(recipe.carb_per_100g)}g</p>
                </div>
                <div>
                  <p className="text-gray-600">Gordura/100g</p>
                  <p className="font-medium">{formatMacro(recipe.fat_per_100g)}g</p>
                </div>
              </div>

              <div className="pt-2 border-t">
                <p className="text-sm text-gray-600">Custo/100g</p>
                <p className="font-bold text-lg">{formatCost(recipe.cost_per_100g)}</p>
              </div>

              {recipe.allergens && recipe.allergens.length > 0 && recipe.allergens[0] !== 'nenhum' && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">Alérgenos:</p>
                  <div className="flex flex-wrap gap-1">
                    {recipe.allergens.map((allergen, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {allergen}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {recipe.notes && (
                <p className="text-sm text-gray-600 italic">{recipe.notes}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredRecipes.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          Nenhuma receita encontrada
        </div>
      )}
    </div>
  );
}
