'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import { RegistrationForm } from '@/components/cadastro/registration-form';

export default function CadastroPage() {
  const [showForm, setShowForm] = useState(false);

  const scrollToForm = () => {
    setShowForm(true);
    setTimeout(() => {
      document.getElementById('form-section')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }, 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <section className="min-h-screen flex flex-col items-center justify-center px-4 py-16 relative">
        <div className="absolute inset-0 bg-grid-slate-200 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10" />

        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 mb-8 shadow-xl">
            <span className="text-4xl font-bold text-white">FC</span>
          </div>

          <h1 className="text-6xl md:text-7xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              Food Club
            </span>
          </h1>

          <p className="text-2xl md:text-3xl text-slate-700 font-light max-w-3xl mx-auto leading-relaxed">
            Refeições balanceadas, personalizadas para os seus objetivos
          </p>

          <div className="pt-8 space-y-6 max-w-2xl mx-auto">
            <div className="grid md:grid-cols-3 gap-6 text-left">
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100 hover:shadow-xl transition-shadow">
                <div className="text-3xl mb-3">🎯</div>
                <h3 className="font-semibold text-slate-900 mb-2">Personalizado</h3>
                <p className="text-sm text-slate-600">Refeições calculadas de acordo com suas metas nutricionais</p>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100 hover:shadow-xl transition-shadow">
                <div className="text-3xl mb-3">🚀</div>
                <h3 className="font-semibold text-slate-900 mb-2">Prático</h3>
                <p className="text-sm text-slate-600">Receba suas refeições prontas no horário e local que escolher</p>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100 hover:shadow-xl transition-shadow">
                <div className="text-3xl mb-3">💚</div>
                <h3 className="font-semibold text-slate-900 mb-2">Saudável</h3>
                <p className="text-sm text-slate-600">Ingredientes frescos e macronutrientes balanceados</p>
              </div>
            </div>

            <Button
              onClick={scrollToForm}
              size="lg"
              className="text-lg px-12 py-7 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-xl hover:shadow-2xl transition-all hover:scale-105"
            >
              Começar meu cadastro
            </Button>

            <p className="text-sm text-slate-500">
              Cadastro grátis • Sem compromisso • Cancelamento flexível
            </p>
          </div>
        </div>

        <button
          onClick={scrollToForm}
          className="absolute bottom-12 left-1/2 -translate-x-1/2 animate-bounce text-emerald-600 hover:text-emerald-700 transition-colors"
          aria-label="Scroll para formulário"
        >
          <ChevronDown className="w-10 h-10" />
        </button>
      </section>

      {showForm && (
        <section id="form-section" className="min-h-screen py-16 px-4">
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 p-8 md:p-12">
              <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">
                Vamos começar seu cadastro
              </h2>

              <RegistrationForm />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
