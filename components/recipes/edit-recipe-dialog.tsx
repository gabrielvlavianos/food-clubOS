'use client';

import { useState, useEffect } from 'react';
import { Recipe } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface EditRecipeDialogProps {
  recipe: Recipe | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}

const ALLERGENS_OPTIONS = [
  'glúten', 'lactose', 'ovos', 'soja', 'amendoim',
  'frutos do mar', 'peixe', 'nozes', 'gergelim'
];

const CATEGORIES = [
  'Proteína',
  'Carboidrato',
  'Legumes',
  'Salada',
  'Marinada',
  'Molho Salada'
];

export function EditRecipeDialog({ recipe, open, onOpenChange, onUpdated }: EditRecipeDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    kcal_per_100g: '',
    protein_per_100g: '',
    carb_per_100g: '',
    fat_per_100g: '',
    price_per_kg: '',
    notes: '',
    is_active: true
  });
  const [allergens, setAllergens] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (recipe) {
      setFormData({
        name: recipe.name,
        category: recipe.category,
        kcal_per_100g: recipe.kcal_per_100g.toString(),
        protein_per_100g: recipe.protein_per_100g.toString(),
        carb_per_100g: recipe.carb_per_100g.toString(),
        fat_per_100g: recipe.fat_per_100g.toString(),
        price_per_kg: ((recipe as any).price_per_kg || 0).toString(),
        notes: recipe.notes || '',
        is_active: recipe.is_active
      });
      setAllergens(recipe.allergens || []);
    }
  }, [recipe]);

  function handleChange(field: string, value: string | boolean) {
    setFormData(prev => ({ ...prev, [field]: value }));
  }

  function toggleAllergen(allergen: string) {
    setAllergens(prev =>
      prev.includes(allergen)
        ? prev.filter(a => a !== allergen)
        : [...prev, allergen]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!recipe) return;

    setSaving(true);
    try {
      const updateData = {
        name: formData.name,
        category: formData.category,
        kcal_per_100g: parseFloat(formData.kcal_per_100g),
        protein_per_100g: parseFloat(formData.protein_per_100g),
        carb_per_100g: parseFloat(formData.carb_per_100g),
        fat_per_100g: parseFloat(formData.fat_per_100g),
        cost_per_100g: parseFloat(formData.price_per_kg) || 0,
        price_per_kg: parseFloat(formData.price_per_kg) || 0,
        allergens: allergens.length > 0 ? allergens : ['nenhum'],
        notes: formData.notes || null,
        is_active: formData.is_active
      };

      const { error } = await supabase
        .from('recipes')
        // @ts-expect-error - TypeScript has issues with Supabase update typing
        .update(updateData)
        .eq('id', recipe.id);

      if (error) throw error;

      toast({
        title: 'Receita atualizada',
        description: 'A receita foi atualizada com sucesso.'
      });

      onUpdated();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating recipe:', error);

      // Check if error is due to duplicate name
      const errorMessage = error?.message || '';
      const isDuplicate = errorMessage.includes('idx_recipes_name_unique') || errorMessage.includes('duplicate');

      toast({
        title: 'Erro ao atualizar receita',
        description: isDuplicate
          ? 'Já existe uma receita com este nome. Por favor, use um nome diferente.'
          : 'Não foi possível atualizar a receita.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Receita</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="name">Nome da Receita *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="category">Categoria *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => handleChange('category', value)}
                required
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="kcal">Calorias (kcal/100g) *</Label>
              <Input
                id="kcal"
                type="number"
                step="0.1"
                value={formData.kcal_per_100g}
                onChange={(e) => handleChange('kcal_per_100g', e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="protein">Proteínas (g/100g) *</Label>
              <Input
                id="protein"
                type="number"
                step="0.1"
                value={formData.protein_per_100g}
                onChange={(e) => handleChange('protein_per_100g', e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="carb">Carboidratos (g/100g) *</Label>
              <Input
                id="carb"
                type="number"
                step="0.1"
                value={formData.carb_per_100g}
                onChange={(e) => handleChange('carb_per_100g', e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="fat">Gorduras (g/100g) *</Label>
              <Input
                id="fat"
                type="number"
                step="0.1"
                value={formData.fat_per_100g}
                onChange={(e) => handleChange('fat_per_100g', e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="price">Preço (R$/kg)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price_per_kg}
                onChange={(e) => handleChange('price_per_kg', e.target.value)}
              />
            </div>

            <div className="col-span-2">
              <Label>Alérgenos</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {ALLERGENS_OPTIONS.map(allergen => (
                  <Badge
                    key={allergen}
                    variant={allergens.includes(allergen) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleAllergen(allergen)}
                  >
                    {allergen}
                    {allergens.includes(allergen) && (
                      <X className="ml-1 h-3 w-3" />
                    )}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="col-span-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                rows={3}
              />
            </div>

            <div className="col-span-2">
              <div className="flex items-center gap-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => handleChange('is_active', checked)}
                />
                <Label htmlFor="is_active">Receita ativa</Label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
