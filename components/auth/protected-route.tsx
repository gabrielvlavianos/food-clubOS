"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, userRole, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = '/login';
    } else if (!loading && requireAdmin && userRole !== 'ADMIN') {
      router.push('/customers');
    }
  }, [user, userRole, loading, router, requireAdmin]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-stone-50 to-white">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-[#5F7469] mx-auto" />
          <p className="text-slate-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-stone-50 to-white">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-[#5F7469] mx-auto" />
          <p className="text-slate-600">Redirecionando para login...</p>
        </div>
      </div>
    );
  }

  if (requireAdmin && userRole !== 'ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-stone-50 to-white">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-[#5F7469] mx-auto" />
          <p className="text-slate-600">Redirecionando...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
