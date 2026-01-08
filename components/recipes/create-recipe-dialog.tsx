'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { RECIPE_CATEGORIES } from '@/types';

interface CreateRecipeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function CreateRecipeDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateRecipeDialogProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>('');
  const [allergens, setAllergens] = useState('');
  const [notes, setNotes] = useState('');
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [carb, setCarb] = useState('');
  const [fat, setFat] = useState('');
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const allergensArray = allergens
        .split(',')
        .map((a) => a.trim())
        .filter((a) => a.length > 0);

      const { error } = await supabase.from('recipes').insert([{
        name,
        category: category as any,
        allergens: allergensArray.length > 0 ? allergensArray : ['nenhum'],
        notes: notes || null,
        kcal_per_100g: parseFloat(kcal),
        protein_per_100g: parseFloat(protein),
        carb_per_100g: parseFloat(carb),
        fat_per_100g: parseFloat(fat),
        cost_per_100g: parseFloat(price) || 0,
        price_per_kg: parseFloat(price) || 0,
      }] as any);

      if (error) throw error;

      toast({
        title: 'Receita criada',
        description: 'Receita adicionada com sucesso',
      });

      resetForm();
      onOpenChange(false);
      onCreated();
    } catch (error: any) {
      console.error('Error creating recipe:', error);

      // Check if error is due to duplicate name
      const errorMessage = error?.message || '';
      const isDuplicate = errorMessage.includes('idx_recipes_name_unique') || errorMessage.includes('duplicate');

      toast({
        title: 'Erro ao criar receita',
        description: isDuplicate
          ? 'Já existe uma receita com este nome. Por favor, use um nome diferente.'
          : 'Não foi possível criar a receita',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setName('');
    setCategory('');
    setAllergens('');
    setNotes('');
    setKcal('');
    setProtein('');
    setCarb('');
    setFat('');
    setPrice('');
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Receita</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="name">Nome da Receita *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Peito de Frango Grelhado"
                required
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="category">Categoria *</Label>
              <Select value={category} onValueChange={setCategory} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {RECIPE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label htmlFor="allergens">Alérgenos (separados por vírgula)</Label>
              <Input
                id="allergens"
                value={allergens}
                onChange={(e) => setAllergens(e.target.value)}
                placeholder="Ex: glúten, lácteos, peixe"
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-medium mb-3">Macros por 100g</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="kcal">Calorias (kcal) *</Label>
                <Input
                  id="kcal"
                  type="number"
                  step="0.1"
                  min="0"
                  value={kcal}
                  onChange={(e) => setKcal(e.target.value)}
                  placeholder="165.0"
                  required
                />
              </div>

              <div>
                <Label htmlFor="protein">Proteína (g) *</Label>
                <Input
                  id="protein"
                  type="number"
                  step="0.1"
                  min="0"
                  value={protein}
                  onChange={(e) => setProtein(e.target.value)}
                  placeholder="31.0"
                  required
                />
              </div>

              <div>
                <Label htmlFor="carb">Carboidrato (g) *</Label>
                <Input
                  id="carb"
                  type="number"
                  step="0.1"
                  min="0"
                  value={carb}
                  onChange={(e) => setCarb(e.target.value)}
                  placeholder="0.0"
                  required
                />
              </div>

              <div>
                <Label htmlFor="fat">Gordura (g) *</Label>
                <Input
                  id="fat"
                  type="number"
                  step="0.1"
                  min="0"
                  value={fat}
                  onChange={(e) => setFat(e.target.value)}
                  placeholder="3.6"
                  required
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <Label htmlFor="price">Preço por kg (R$)</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="25.00"
            />
          </div>

          <div>
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações sobre a receita..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Criando...' : 'Criar Receita'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
