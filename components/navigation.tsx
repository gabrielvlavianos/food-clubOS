'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Users, BookOpen, ChefHat, CalendarDays, UtensilsCrossed, Truck, LayoutDashboard, Settings, UserPlus } from 'lucide-react';

const navItems = [
  { href: '/manager', label: 'Gerencial', icon: LayoutDashboard },
  { href: '/kitchen', label: 'Cozinha', icon: UtensilsCrossed },
  { href: '/prep', label: 'Produção', icon: ChefHat },
  { href: '/deliveries', label: 'Expedição', icon: Truck },
  { href: '/menu', label: 'Cardápio Mensal', icon: CalendarDays },
  { href: '/customers', label: 'Clientes', icon: Users },
  { href: '/entrantes', label: 'Novos Entrantes', icon: UserPlus },
  { href: '/recipes', label: 'Receitas', icon: BookOpen },
  { href: '/settings', label: 'Configurações', icon: Settings },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="border-b bg-white">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center">
          <Link href="/cadastro" className="flex items-center gap-3 mr-8 hover:opacity-80 transition-opacity">
            <svg width="32" height="32" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="100" cy="100" r="80" stroke="#5F7469" strokeWidth="6" fill="none" opacity="0.3"/>
              <path d="M100 50 L100 150 M100 50 L85 70 M100 50 L115 70" stroke="#5F7469" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M85 80 Q70 85 70 100 Q70 115 85 120" stroke="#5F7469" strokeWidth="5" fill="none"/>
              <path d="M115 80 Q130 85 130 100 Q130 115 115 120" stroke="#5F7469" strokeWidth="5" fill="none"/>
              <circle cx="85" cy="60" r="6" fill="#7A9283"/>
              <circle cx="115" cy="65" r="6" fill="#7A9283"/>
            </svg>
            <span className="text-xl font-bold" style={{ color: '#3D3D3D', letterSpacing: '0.05em' }}>PURIC</span>
          </Link>
          <div className="flex gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
