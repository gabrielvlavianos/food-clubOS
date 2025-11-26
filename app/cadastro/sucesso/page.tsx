'use client';

import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SuccessPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center px-4">
      <div className="max-w-2xl mx-auto text-center space-y-8">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 mb-4">
          <CheckCircle2 className="w-12 h-12 text-white" />
        </div>

        <h1 className="text-4xl md:text-5xl font-bold text-slate-900">
          Cadastro realizado com sucesso!
        </h1>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 space-y-4">
          <p className="text-lg text-slate-700">
            Recebemos seu cadastro e ele está em análise.
          </p>

          <p className="text-slate-600">
            Nossa equipe irá revisar suas informações e entraremos em contato em breve através do telefone ou e-mail fornecido.
          </p>

          <div className="pt-4">
            <div className="inline-flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 px-4 py-2 rounded-full">
              <div className="w-2 h-2 bg-emerald-600 rounded-full animate-pulse" />
              <span>Seu cadastro está sendo processado</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-slate-600 text-sm">
            Enquanto isso, você pode conhecer mais sobre o Food Club
          </p>

          <Button
            onClick={() => router.push('/cadastro')}
            variant="outline"
            size="lg"
            className="rounded-full"
          >
            Voltar para página inicial
          </Button>
        </div>
      </div>
    </div>
  );
}
