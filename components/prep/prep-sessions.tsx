'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { PrepSessionWithItems, Recipe, PrepSession, PrepItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Printer } from 'lucide-react';
import { PrepSessionCard } from './prep-session-card';
import { CreatePrepSessionDialog } from './create-prep-session-dialog';

export function PrepSessions() {
  const [sessions, setSessions] = useState<PrepSessionWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    loadSessions();
  }, []);

  async function loadSessions() {
    try {
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('prep_sessions')
        .select('*')
        .order('date', { ascending: false });

      if (sessionsError) throw sessionsError;

      if (!sessionsData) {
        setSessions([]);
        return;
      }

      const sessionsWithItems: PrepSessionWithItems[] = await Promise.all(
        sessionsData.map(async (session: PrepSession) => {
          const { data: itemsData, error: itemsError } = await supabase
            .from('prep_items')
            .select('*')
            .eq('prep_session_id', session.id);

          if (itemsError) throw itemsError;

          if (!itemsData) {
            return {
              ...session,
              items: [],
            };
          }

          const itemsWithRecipes = await Promise.all(
            itemsData.map(async (item: PrepItem) => {
              const { data: recipeData, error: recipeError } = await supabase
                .from('recipes')
                .select('*')
                .eq('id', item.recipe_id)
                .maybeSingle();

              if (recipeError) throw recipeError;
              if (!recipeData) throw new Error('Recipe not found');

              return {
                ...item,
                recipe: recipeData,
              };
            })
          );

          return {
            ...session,
            items: itemsWithRecipes,
          };
        })
      );

      setSessions(sessionsWithItems);
    } catch (error) {
      console.error('Error loading prep sessions:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div>Carregando sessões de preparo...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Sessões de Preparo</h2>
          <p className="text-gray-600">Organize e calcule o preparo diário</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Sessão
        </Button>
      </div>

      <div className="space-y-4">
        {sessions.map((session) => (
          <PrepSessionCard
            key={session.id}
            session={session}
            onUpdate={loadSessions}
          />
        ))}
      </div>

      {sessions.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            Nenhuma sessão de preparo criada. Clique em &quot;Nova Sessão&quot; para começar.
          </CardContent>
        </Card>
      )}

      <CreatePrepSessionDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreated={loadSessions}
      />
    </div>
  );
}
