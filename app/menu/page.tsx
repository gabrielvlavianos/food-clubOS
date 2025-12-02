// @ts-nocheck
'use client';

import { useState, useEffect, useRef } from 'react';
import { ProtectedLayout } from '@/components/layouts/protected-layout';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Plus, Edit, Trash2, Download, Upload } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { MonthlyMenu, Recipe } from '@/types';
import { downloadExcelTemplate, parseExcelFile, exportToExcel, ExcelColumn } from '@/lib/excel-utils';

const MENU_COLUMNS: ExcelColumn[] = [
  { header: 'Data', key: 'menu_date', example: '24/11/2025' },
  { header: 'Turno', key: 'meal_type', example: 'Almoço' },
  { header: 'Proteina', key: 'protein_recipe_name', example: 'Filé de frango grelhado' },
  { header: 'Carboidrato', key: 'carb_recipe_name', example: 'Batata-doce assada com alecrim' },
  { header: 'Legumes', key: 'vegetable_recipe_name', example: 'Abobrinha e cenoura grelhadas' },
  { header: 'Salada', key: 'salad_recipe_name', example: 'Mix de folhas, tomate e pepino' },
  { header: 'Molho Salada', key: 'sauce_recipe_name', example: 'Vinagrete clássico' },
  { header: 'Observações', key: 'notes', example: '' }
];

interface MenuWithRecipes extends MonthlyMenu {
  protein_recipe?: Recipe;
  carb_recipe?: Recipe;
  vegetable_recipe?: Recipe;
  salad_recipe?: Recipe;
  sauce_recipe?: Recipe;
}

export const dynamic = 'force-dynamic';

export default function MenuPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [menus, setMenus] = useState<MenuWithRecipes[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState<MonthlyMenu | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    menu_date: '',
    meal_type: '' as 'lunch' | 'dinner' | '',
    protein_recipe_id: '',
    carb_recipe_id: '',
    vegetable_recipe_id: '',
    salad_recipe_id: '',
    sauce_recipe_id: '',
    notes: ''
  });

  useEffect(() => {
    loadRecipes();
    loadMenus();
  }, [currentMonth]);

  async function loadRecipes() {
    const { data } = await supabase
      .from('recipes')
      .select('*')
      .order('category, name');

    if (data) setRecipes(data);
  }

  async function loadMenus() {
    setLoading(true);
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);

    const { data } = await supabase
      .from('monthly_menu')
      .select('*')
      .gte('menu_date', format(start, 'yyyy-MM-dd'))
      .lte('menu_date', format(end, 'yyyy-MM-dd'))
      .order('menu_date, meal_type');

    if (data) {
      const menusWithRecipes = await Promise.all(
        data.map(async (menu: MonthlyMenu) => {
          const menuWithRecipes: MenuWithRecipes = { ...menu };

          if (menu.protein_recipe_id) {
            const { data: recipe } = await supabase
              .from('recipes')
              .select('*')
              .eq('id', menu.protein_recipe_id)
              .maybeSingle();
            if (recipe) menuWithRecipes.protein_recipe = recipe;
          }

          if (menu.carb_recipe_id) {
            const { data: recipe } = await supabase
              .from('recipes')
              .select('*')
              .eq('id', menu.carb_recipe_id)
              .maybeSingle();
            if (recipe) menuWithRecipes.carb_recipe = recipe;
          }

          if (menu.vegetable_recipe_id) {
            const { data: recipe } = await supabase
              .from('recipes')
              .select('*')
              .eq('id', menu.vegetable_recipe_id)
              .maybeSingle();
            if (recipe) menuWithRecipes.vegetable_recipe = recipe;
          }

          if (menu.salad_recipe_id) {
            const { data: recipe } = await supabase
              .from('recipes')
              .select('*')
              .eq('id', menu.salad_recipe_id)
              .maybeSingle();
            if (recipe) menuWithRecipes.salad_recipe = recipe;
          }

          if (menu.sauce_recipe_id) {
            const { data: recipe } = await supabase
              .from('recipes')
              .select('*')
              .eq('id', menu.sauce_recipe_id)
              .maybeSingle();
            if (recipe) menuWithRecipes.sauce_recipe = recipe;
          }

          return menuWithRecipes;
        })
      );

      setMenus(menusWithRecipes);
    }

    setLoading(false);
  }

  function openDialog(menu?: MonthlyMenu) {
    if (menu) {
      setEditingMenu(menu);
      setFormData({
        menu_date: menu.menu_date,
        meal_type: menu.meal_type,
        protein_recipe_id: menu.protein_recipe_id || '',
        carb_recipe_id: menu.carb_recipe_id || '',
        vegetable_recipe_id: menu.vegetable_recipe_id || '',
        salad_recipe_id: menu.salad_recipe_id || '',
        sauce_recipe_id: menu.sauce_recipe_id || '',
        notes: menu.notes || ''
      });
    } else {
      setEditingMenu(null);
      setFormData({
        menu_date: '',
        meal_type: '',
        protein_recipe_id: '',
        carb_recipe_id: '',
        vegetable_recipe_id: '',
        salad_recipe_id: '',
        sauce_recipe_id: '',
        notes: ''
      });
    }
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      const menuData: any = {
        menu_date: formData.menu_date,
        meal_type: formData.meal_type as 'lunch' | 'dinner',
        protein_recipe_id: formData.protein_recipe_id || null,
        carb_recipe_id: formData.carb_recipe_id || null,
        vegetable_recipe_id: formData.vegetable_recipe_id || null,
        salad_recipe_id: formData.salad_recipe_id || null,
        sauce_recipe_id: formData.sauce_recipe_id || null,
        notes: formData.notes || null
      };

      if (editingMenu) {
        // @ts-ignore
        const { error } = await supabase
          .from('monthly_menu')
          .update(menuData)
          .eq('id', editingMenu.id);

        if (error) throw error;

        toast({
          title: 'Cardápio atualizado',
          description: 'Cardápio atualizado com sucesso',
        });
      } else {
        // @ts-ignore
        const { error } = await supabase
          .from('monthly_menu')
          .insert(menuData);

        if (error) throw error;

        toast({
          title: 'Cardápio criado',
          description: 'Cardápio cadastrado com sucesso',
        });
      }

      setDialogOpen(false);
      loadMenus();
    } catch (error: any) {
      console.error('Error saving menu:', error);

      if (error?.code === '23505') {
        toast({
          title: 'Erro',
          description: 'Já existe um cardápio para esta data e turno',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Erro',
          description: 'Não foi possível salvar o cardápio',
          variant: 'destructive',
        });
      }
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir este cardápio?')) return;

    try {
      const { error } = await supabase
        .from('monthly_menu')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Cardápio excluído',
        description: 'Cardápio removido com sucesso',
      });

      loadMenus();
    } catch (error) {
      console.error('Error deleting menu:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o cardápio',
        variant: 'destructive',
      });
    }
  }

  function handleDownloadTemplate() {
    downloadExcelTemplate('modelo-cardapio.xlsx', MENU_COLUMNS);
    toast({
      title: 'Template baixado',
      description: 'Preencha o arquivo Excel com os nomes das receitas e importe os dados.'
    });
  }

  function handleExportData() {
    const exportData = menus.map(menu => {
      const [year, month, day] = menu.menu_date.split('-');
      const formattedDate = `${day}/${month}/${year}`;
      const mealTypeLabel = menu.meal_type === 'lunch' ? 'Almoço' : 'Jantar';

      return {
        menu_date: formattedDate,
        meal_type: mealTypeLabel,
        protein_recipe_name: menu.protein_recipe?.name || '',
        carb_recipe_name: menu.carb_recipe?.name || '',
        vegetable_recipe_name: menu.vegetable_recipe?.name || '',
        salad_recipe_name: menu.salad_recipe?.name || '',
        sauce_recipe_name: menu.sauce_recipe?.name || '',
        notes: menu.notes || ''
      };
    });

    exportToExcel('cardapio.xlsx', exportData, MENU_COLUMNS);
    toast({
      title: 'Dados exportados',
      description: `${menus.length} cardápios exportados com sucesso.`
    });
  }

  function parseDateFromExcel(dateValue: any): string | null {
    if (!dateValue) return null;

    if (typeof dateValue === 'number') {
      const excelEpoch = new Date(1899, 11, 30);
      const date = new Date(excelEpoch.getTime() + dateValue * 86400000);
      return format(date, 'yyyy-MM-dd');
    }

    if (typeof dateValue === 'string') {
      const brDateMatch = dateValue.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (brDateMatch) {
        const [, day, month, year] = brDateMatch;
        return `${year}-${month}-${day}`;
      }

      const isoDateMatch = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (isoDateMatch) {
        return dateValue;
      }
    }

    return null;
  }

  function parseMealType(mealValue: any): 'lunch' | 'dinner' | null {
    if (!mealValue) return null;

    const value = mealValue.toString().toLowerCase().trim();

    if (value === 'almoço' || value === 'almoco' || value === 'lunch') {
      return 'lunch';
    }

    if (value === 'jantar' || value === 'dinner') {
      return 'dinner';
    }

    return null;
  }

  async function handleImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const data = await parseExcelFile<any>(file, MENU_COLUMNS);

      let successCount = 0;
      let errorCount = 0;

      for (const row of data) {
        try {
          const menuDate = parseDateFromExcel(row.menu_date);
          const mealType = parseMealType(row.meal_type);

          if (!menuDate || !mealType) {
            console.error('Invalid date or meal type:', row);
            errorCount++;
            continue;
          }

          const proteinRecipe = recipes.find(r =>
            r.name.toLowerCase().trim() === row.protein_recipe_name?.toLowerCase().trim()
          );
          const carbRecipe = recipes.find(r =>
            r.name.toLowerCase().trim() === row.carb_recipe_name?.toLowerCase().trim()
          );
          const vegetableRecipe = recipes.find(r =>
            r.name.toLowerCase().trim() === row.vegetable_recipe_name?.toLowerCase().trim()
          );
          const saladRecipe = recipes.find(r =>
            r.name.toLowerCase().trim() === row.salad_recipe_name?.toLowerCase().trim()
          );
          const sauceRecipe = recipes.find(r =>
            r.name.toLowerCase().trim() === row.sauce_recipe_name?.toLowerCase().trim()
          );

          const menuData: any = {
            menu_date: menuDate,
            meal_type: mealType,
            protein_recipe_id: proteinRecipe?.id || null,
            carb_recipe_id: carbRecipe?.id || null,
            vegetable_recipe_id: vegetableRecipe?.id || null,
            salad_recipe_id: saladRecipe?.id || null,
            sauce_recipe_id: sauceRecipe?.id || null,
            notes: row.notes || null
          };

          const { error } = await supabase
            .from('monthly_menu')
            .insert(menuData);

          if (error) {
            console.error('Error importing menu:', error);
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
        description: `${successCount} cardápios importados com sucesso. ${errorCount > 0 ? `${errorCount} erros encontrados.` : ''}`
      });

      loadMenus();
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

  const monthDays = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  function getMenuForDate(date: Date, mealType: 'lunch' | 'dinner') {
    return menus.find(
      m => m.menu_date === format(date, 'yyyy-MM-dd') && m.meal_type === mealType
    );
  }

  const proteinRecipes = recipes.filter(r => r.category === 'Proteína');
  const carbRecipes = recipes.filter(r => r.category === 'Carboidrato');
  const vegetableRecipes = recipes.filter(r => r.category === 'Legumes');
  const saladRecipes = recipes.filter(r => r.category === 'Salada');
  const sauceRecipes = recipes.filter(r => r.category === 'Molho Salada');

  return (
    <ProtectedLayout>
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Cardápio Mensal</h1>
              <p className="text-gray-600 mt-1">Defina as receitas para cada dia e turno</p>
            </div>
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
            </div>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => openDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Cardápio
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingMenu ? 'Editar Cardápio' : 'Novo Cardápio'}
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="date">Data *</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.menu_date}
                      onChange={(e) => setFormData({ ...formData, menu_date: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="meal">Turno *</Label>
                    <Select
                      value={formData.meal_type || undefined}
                      onValueChange={(v) => setFormData({ ...formData, meal_type: v as 'lunch' | 'dinner' })}
                    >
                      <SelectTrigger id="meal">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lunch">Almoço</SelectItem>
                        <SelectItem value="dinner">Jantar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="protein">Proteína (opcional)</Label>
                  <Select
                    value={formData.protein_recipe_id || undefined}
                    onValueChange={(v) => setFormData({ ...formData, protein_recipe_id: v })}
                  >
                    <SelectTrigger id="protein">
                      <SelectValue placeholder="Selecione a receita de proteína" />
                    </SelectTrigger>
                    <SelectContent>
                      {proteinRecipes.map((recipe) => (
                        <SelectItem key={recipe.id} value={recipe.id}>
                          {recipe.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="carb">Carboidrato (opcional)</Label>
                  <Select
                    value={formData.carb_recipe_id || undefined}
                    onValueChange={(v) => setFormData({ ...formData, carb_recipe_id: v })}
                  >
                    <SelectTrigger id="carb">
                      <SelectValue placeholder="Selecione a receita de carboidrato" />
                    </SelectTrigger>
                    <SelectContent>
                      {carbRecipes.map((recipe) => (
                        <SelectItem key={recipe.id} value={recipe.id}>
                          {recipe.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="vegetable">Legumes (opcional)</Label>
                  <Select
                    value={formData.vegetable_recipe_id || undefined}
                    onValueChange={(v) => setFormData({ ...formData, vegetable_recipe_id: v })}
                  >
                    <SelectTrigger id="vegetable">
                      <SelectValue placeholder="Selecione a receita de legumes" />
                    </SelectTrigger>
                    <SelectContent>
                      {vegetableRecipes.map((recipe) => (
                        <SelectItem key={recipe.id} value={recipe.id}>
                          {recipe.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="salad">Salada (opcional)</Label>
                  <Select
                    value={formData.salad_recipe_id || undefined}
                    onValueChange={(v) => setFormData({ ...formData, salad_recipe_id: v })}
                  >
                    <SelectTrigger id="salad">
                      <SelectValue placeholder="Selecione a receita de salada" />
                    </SelectTrigger>
                    <SelectContent>
                      {saladRecipes.map((recipe) => (
                        <SelectItem key={recipe.id} value={recipe.id}>
                          {recipe.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="sauce">Molho (opcional)</Label>
                  <Select
                    value={formData.sauce_recipe_id || undefined}
                    onValueChange={(v) => setFormData({ ...formData, sauce_recipe_id: v })}
                  >
                    <SelectTrigger id="sauce">
                      <SelectValue placeholder="Selecione o molho" />
                    </SelectTrigger>
                    <SelectContent>
                      {sauceRecipes.map((recipe) => (
                        <SelectItem key={recipe.id} value={recipe.id}>
                          {recipe.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingMenu ? 'Atualizar' : 'Criar'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                  Mês Anterior
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>
                  Hoje
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                  Próximo Mês
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center py-8 text-gray-500">Carregando cardápios...</p>
            ) : (
              <div className="space-y-6">
                {monthDays.map((date) => {
                  const lunchMenu = getMenuForDate(date, 'lunch');
                  const dinnerMenu = getMenuForDate(date, 'dinner');
                  const dayName = format(date, 'EEEE', { locale: ptBR });

                  return (
                    <div key={date.toISOString()} className="border rounded-lg p-4">
                      <h3 className="font-bold text-lg mb-3">
                        {format(date, 'dd/MM/yyyy')} - {dayName.charAt(0).toUpperCase() + dayName.slice(1)}
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="border rounded-lg p-3 bg-amber-50">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-amber-900">Almoço</h4>
                            <div className="flex gap-1">
                              {lunchMenu && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openDialog(lunchMenu)}
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDelete(lunchMenu.id)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </>
                              )}
                              {!lunchMenu && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setFormData({
                                      ...formData,
                                      menu_date: format(date, 'yyyy-MM-dd'),
                                      meal_type: 'lunch'
                                    });
                                    setDialogOpen(true);
                                  }}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </div>

                          {lunchMenu ? (
                            <div className="text-sm space-y-1">
                              <p><strong>Proteína:</strong> {lunchMenu.protein_recipe?.name || '-'}</p>
                              <p><strong>Carboidrato:</strong> {lunchMenu.carb_recipe?.name || '-'}</p>
                              <p><strong>Legumes:</strong> {lunchMenu.vegetable_recipe?.name || '-'}</p>
                              <p><strong>Salada:</strong> {lunchMenu.salad_recipe?.name || '-'}</p>
                              <p><strong>Molho Salada:</strong> {lunchMenu.sauce_recipe?.name || '-'}</p>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500">Nenhum cardápio definido</p>
                          )}
                        </div>

                        <div className="border rounded-lg p-3 bg-blue-50">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-blue-900">Jantar</h4>
                            <div className="flex gap-1">
                              {dinnerMenu && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openDialog(dinnerMenu)}
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDelete(dinnerMenu.id)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </>
                              )}
                              {!dinnerMenu && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setFormData({
                                      ...formData,
                                      menu_date: format(date, 'yyyy-MM-dd'),
                                      meal_type: 'dinner'
                                    });
                                    setDialogOpen(true);
                                  }}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </div>

                          {dinnerMenu ? (
                            <div className="text-sm space-y-1">
                              <p><strong>Proteína:</strong> {dinnerMenu.protein_recipe?.name || '-'}</p>
                              <p><strong>Carboidrato:</strong> {dinnerMenu.carb_recipe?.name || '-'}</p>
                              <p><strong>Legumes:</strong> {dinnerMenu.vegetable_recipe?.name || '-'}</p>
                              <p><strong>Salada:</strong> {dinnerMenu.salad_recipe?.name || '-'}</p>
                              <p><strong>Molho Salada:</strong> {dinnerMenu.sauce_recipe?.name || '-'}</p>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500">Nenhum cardápio definido</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
    </ProtectedLayout>
  );
}
