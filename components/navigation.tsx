'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Users, BookOpen, ChefHat, CalendarDays, UtensilsCrossed, Truck, LayoutDashboard, Settings, UserPlus } from 'lucide-react';

const navItems = [
  { href: '/manager', label: 'Gerencial', icon: LayoutDashboard },
  { href: '/kitchen', label: 'Cozinha', icon: UtensilsCrossed },
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
          <div className="flex items-center gap-2 mr-8">
            <ChefHat className="h-6 w-6" />
            <span className="text-xl font-bold">Food Club OS</span>
          </div>
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
