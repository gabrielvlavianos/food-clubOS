'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Recipe } from '@/types';
import { Navigation } from '@/components/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Download, Upload } from 'lucide-react';
import { RecipesTable } from '@/components/recipes/recipes-table';
import { CreateRecipeDialog } from '@/components/recipes/create-recipe-dialog';
import { downloadExcelTemplate, parseExcelFile, exportToExcel, ExcelColumn } from '@/lib/excel-utils';
import { useToast } from '@/hooks/use-toast';

const RECIPE_COLUMNS: ExcelColumn[] = [
  { header: 'Nome', key: 'name', example: 'Frango Grelhado' },
  { header: 'Categoria', key: 'category', example: 'Proteína' },
  { header: 'Calorias (100g)', key: 'calories', example: '165' },
  { header: 'Proteínas (100g)', key: 'protein', example: '31' },
  { header: 'Carboidratos (100g)', key: 'carbs', example: '0' },
  { header: 'Gorduras (100g)', key: 'fat', example: '3.6' },
  { header: 'Custo (100g)', key: 'cost', example: '8.50' },
  { header: 'Ativo', key: 'is_active', example: 'Sim' }
];

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadRecipes();
  }, []);

  useEffect(() => {
    filterRecipes();
  }, [recipes, searchTerm, categoryFilter]);

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

    setFilteredRecipes(filtered);
  }

  function handleDownloadTemplate() {
    downloadExcelTemplate('modelo-receitas.xlsx', RECIPE_COLUMNS);
    toast({
      title: 'Template baixado',
      description: 'Preencha o arquivo Excel e importe os dados.'
    });
  }

  function handleExportData() {
    const exportData = recipes.map(recipe => ({
      name: recipe.name,
      category: recipe.category,
      calories: recipe.kcal_per_100g,
      protein: recipe.protein_per_100g,
      carbs: recipe.carb_per_100g,
      fat: recipe.fat_per_100g,
      cost: recipe.cost_per_100g,
      is_active: recipe.is_active
    }));

    exportToExcel('receitas.xlsx', exportData, RECIPE_COLUMNS);
    toast({
      title: 'Dados exportados',
      description: `${recipes.length} receitas exportadas com sucesso.`
    });
  }

  async function handleImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const data = await parseExcelFile<any>(file, RECIPE_COLUMNS);

      let successCount = 0;
      let errorCount = 0;

      for (const row of data) {
        try {
          const recipeData: any = {
            name: row.name,
            category: row.category,
            kcal_per_100g: row.calories ? parseFloat(row.calories) : 0,
            protein_per_100g: row.protein ? parseFloat(row.protein) : 0,
            carb_per_100g: row.carbs ? parseFloat(row.carbs) : 0,
            fat_per_100g: row.fat ? parseFloat(row.fat) : 0,
            cost_per_100g: row.cost ? parseFloat(row.cost) : 0,
            allergens: [],
            notes: null,
            is_active: row.is_active === 'Sim' || row.is_active === true || row.is_active === 'TRUE'
          };

          const { error } = await supabase
            .from('recipes')
            .insert(recipeData);

          if (error) {
            console.error('Error importing recipe:', error);
            errorCount++;
          } else {
            successCount++;
          }
        } catch (error) {
          console.error('Error processing row:', error);
          errorCount++;
        }
      }

      toast({
        title: 'Importação concluída',
        description: `${successCount} receitas importadas com sucesso. ${errorCount > 0 ? `${errorCount} erros encontrados.` : ''}`
      });

      loadRecipes();
    } catch (error) {
      console.error('Error importing file:', error);
      toast({
        title: 'Erro na importação',
        description: 'Não foi possível importar o arquivo. Verifique o formato.',
        variant: 'destructive'
      });
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Receitas</h1>
          <p className="text-gray-600 mt-1">Gerencie fichas técnicas e macros</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
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
              <SelectItem value="Molho Salada">Molho Salada</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleDownloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Baixar Modelo
            </Button>
            <Button variant="outline" onClick={handleExportData}>
              <Download className="h-4 w-4 mr-2" />
              Exportar Dados
            </Button>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importing}>
              <Upload className="h-4 w-4 mr-2" />
              {importing ? 'Importando...' : 'Importar Excel'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImport}
              className="hidden"
            />
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Receita
            </Button>
          </div>
        </div>

        {loading ? (
          <div>Carregando receitas...</div>
        ) : (
          <RecipesTable recipes={filteredRecipes} onUpdate={loadRecipes} />
        )}

        <CreateRecipeDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onCreated={loadRecipes}
        />
      </main>
    </div>
  );
}
