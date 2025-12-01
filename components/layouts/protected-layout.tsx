"use client";

import { ProtectedRoute } from '@/components/auth/protected-route';
import { Navigation } from '@/components/navigation';

interface ProtectedLayoutProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedLayout({ children, requireAdmin = false }: ProtectedLayoutProps) {
  return (
    <ProtectedRoute requireAdmin={requireAdmin}>
      <Navigation />
      {children}
    </ProtectedRoute>
  );
}
