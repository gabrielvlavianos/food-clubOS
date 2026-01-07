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
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white">
      <section className="min-h-screen flex flex-col items-center justify-center px-4 py-16 relative">
        <div className="absolute inset-0 opacity-30 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10"
             style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #5F7469 1px, transparent 0)', backgroundSize: '32px 32px' }}
        />

        <div className="max-w-5xl mx-auto text-center space-y-8">
          <div className="mb-12">
            <svg width="180" height="180" viewBox="0 0 200 200" className="mx-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="100" cy="100" r="80" stroke="#5F7469" strokeWidth="3" fill="none" opacity="0.3"/>
              <circle cx="100" cy="100" r="70" stroke="#5F7469" strokeWidth="3" fill="none" opacity="0.5"/>

              <path d="M100 50 L100 150 M100 50 L85 70 M100 50 L115 70" stroke="#5F7469" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>

              <path d="M85 80 Q70 85 70 100 Q70 115 85 120" stroke="#5F7469" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
              <path d="M115 80 Q130 85 130 100 Q130 115 115 120" stroke="#5F7469" strokeWidth="2.5" fill="none" strokeLinecap="round"/>

              <path d="M90 90 Q85 95 85 105 Q85 115 95 120" stroke="#5F7469" strokeWidth="2" fill="none" strokeLinecap="round"/>
              <path d="M110 90 Q115 95 115 105 Q115 115 105 120" stroke="#5F7469" strokeWidth="2" fill="none" strokeLinecap="round"/>

              <circle cx="85" cy="60" r="4" fill="#7A9283"/>
              <circle cx="115" cy="65" r="4" fill="#7A9283"/>
              <circle cx="130" cy="85" r="3" fill="#7A9283"/>
            </svg>
          </div>

          <h1 className="text-7xl md:text-8xl font-bold tracking-tight mb-6" style={{ color: '#3D3D3D', letterSpacing: '0.02em' }}>
            PURIC
          </h1>

          <p className="text-xl md:text-2xl font-light max-w-2xl mx-auto leading-relaxed mb-8" style={{ color: '#5F7469' }}>
            Nutrição limpa. Precisão total. Experiência impecável.
          </p>

          <div className="max-w-3xl mx-auto space-y-6 text-left bg-white/60 backdrop-blur-sm rounded-3xl p-8 border border-stone-200 shadow-lg">
            <p className="text-lg leading-relaxed text-stone-700">
              A PURIC é um sistema inteligente de refeições pensado para quem busca <strong className="text-stone-900">saúde, praticidade e consistência</strong>.
            </p>

            <p className="text-lg leading-relaxed text-stone-700">
              Nossa cozinha opera com <strong className="text-stone-900">pureza máxima</strong>: não usamos nenhum contaminante, conservante ou preparo que comprometa a qualidade. Tudo é feito com controle rigoroso — do corte ao envio.
            </p>

            <p className="text-lg leading-relaxed text-stone-700">
              <strong className="text-stone-900">Entregamos nutrição sob medida.</strong><br/>
              Cada receita é desenvolvida para bater exatamente os seus macronutrientes, garantindo resultados reais e uma rotina mais organizada.
            </p>

            <p className="text-lg leading-relaxed text-stone-700">
              <strong className="text-stone-900">E acima de tudo, cuidamos da experiência.</strong><br/>
              Do atendimento à entrega, cada detalhe é tratado com precisão para que você receba sempre o melhor.
            </p>
          </div>

          <div className="pt-8">
            <Button
              onClick={scrollToForm}
              size="lg"
              style={{ backgroundColor: '#5F7469' }}
              className="text-lg px-12 py-7 rounded-full hover:opacity-90 shadow-xl hover:shadow-2xl transition-all hover:scale-105 text-white"
            >
              Começar meu cadastro
            </Button>

            <p className="text-sm text-stone-500 mt-6">
              Cadastro grátis • Sem compromisso • Cancelamento flexível
            </p>
          </div>
        </div>

        <button
          onClick={scrollToForm}
          className="absolute bottom-12 left-1/2 -translate-x-1/2 animate-bounce transition-colors"
          style={{ color: '#5F7469' }}
          aria-label="Scroll para formulário"
        >
          <ChevronDown className="w-10 h-10" />
        </button>
      </section>

      {showForm && (
        <section id="form-section" className="min-h-screen py-8 sm:py-16 px-4 bg-stone-50">
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-stone-200 p-4 sm:p-8 md:p-12">
              <h2 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-center" style={{ color: '#3D3D3D' }}>
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
