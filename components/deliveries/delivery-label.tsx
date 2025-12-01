'use client';

import { forwardRef } from 'react';
import type { Customer, DeliverySchedule, Recipe } from '@/types';
import { formatTime } from '@/lib/format-utils';

interface DeliveryLabelProps {
  customer: Customer;
  deliverySchedule: DeliverySchedule;
  mealType: 'lunch' | 'dinner';
  orderDate: string;
  menuRecipes: {
    protein?: Recipe;
    carb?: Recipe;
    vegetable?: Recipe;
    salad?: Recipe;
    sauce?: Recipe;
  };
  quantities: {
    protein: number;
    carb: number;
    vegetable: number;
    salad: number;
    sauce: number;
  };
  actualMacros: {
    kcal: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  targetMacros: {
    kcal: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

export const DeliveryLabel = forwardRef<HTMLDivElement, DeliveryLabelProps>(
  ({ customer, deliverySchedule, mealType, orderDate, menuRecipes, quantities, actualMacros, targetMacros }, ref) => {
    return (
      <div ref={ref} className="p-8 bg-white" style={{ width: '100%', maxWidth: '800px' }}>
        <style jsx>{`
          @media print {
            @page {
              size: A4;
              margin: 10mm;
            }
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        `}</style>

        {/* Header */}
        <div className="border-b-4 border-black pb-3 mb-4">
          <h1 className="text-4xl font-black text-black">{customer.name}</h1>
          <div className="mt-2 space-y-1">
            <p className="text-2xl font-black text-black">
              Horário: {formatTime(deliverySchedule.delivery_time)}
            </p>
            <p className="text-lg font-bold text-black">
              {deliverySchedule.delivery_address}
            </p>
          </div>
        </div>

        {/* Quantities Section */}
        <div className="mb-4">
          <h2 className="text-2xl font-black text-black mb-3">Quantidades</h2>
          <div className="space-y-2">
            {menuRecipes.protein && quantities.protein > 0 && (
              <div className="flex justify-between items-center border-2 border-black rounded-lg p-3">
                <div>
                  <span className="text-lg font-black text-black">Proteína: </span>
                  <span className="text-lg font-bold text-black">{menuRecipes.protein.name}</span>
                </div>
                <span className="text-3xl font-black text-black">{quantities.protein}g</span>
              </div>
            )}

            {menuRecipes.carb && quantities.carb > 0 && (
              <div className="flex justify-between items-center border-2 border-black rounded-lg p-3">
                <div>
                  <span className="text-lg font-black text-black">Carboidrato: </span>
                  <span className="text-lg font-bold text-black">{menuRecipes.carb.name}</span>
                </div>
                <span className="text-3xl font-black text-black">{quantities.carb}g</span>
              </div>
            )}

            {menuRecipes.vegetable && quantities.vegetable > 0 && (
              <div className="flex justify-between items-center border-2 border-black rounded-lg p-3">
                <div>
                  <span className="text-lg font-black text-black">Legumes: </span>
                  <span className="text-lg font-bold text-black">{menuRecipes.vegetable.name}</span>
                </div>
                <span className="text-3xl font-black text-black">{quantities.vegetable}g</span>
              </div>
            )}

            {menuRecipes.salad && quantities.salad > 0 && (
              <div className="flex justify-between items-center border-2 border-black rounded-lg p-3">
                <div>
                  <span className="text-lg font-black text-black">Salada: </span>
                  <span className="text-lg font-bold text-black">{menuRecipes.salad.name}</span>
                </div>
                <span className="text-3xl font-black text-black">{quantities.salad}g</span>
              </div>
            )}

            {menuRecipes.sauce && quantities.sauce > 0 && (
              <div className="flex justify-between items-center border-2 border-black rounded-lg p-3">
                <div>
                  <span className="text-lg font-black text-black">Molho: </span>
                  <span className="text-lg font-bold text-black">{menuRecipes.sauce.name}</span>
                </div>
                <span className="text-3xl font-black text-black">{quantities.sauce}g</span>
              </div>
            )}
          </div>
        </div>

        {/* Macronutrients Section */}
        <div className="border-2 border-black rounded-lg p-3 mb-3">
          <h2 className="text-2xl font-black text-black mb-3 text-center">Macronutrientes</h2>

          <div className="grid grid-cols-3 gap-3 font-black text-black text-lg border-b-2 border-black pb-2 mb-2">
            <div></div>
            <div className="text-center">Meta</div>
            <div className="text-center">Entregue</div>
          </div>

          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-3 items-center py-2 border-b border-black">
              <div className="text-lg font-black">Kcal</div>
              <div className="text-center text-xl font-black">{Math.round(targetMacros.kcal)}</div>
              <div className="text-center text-xl font-black">{Math.round(actualMacros.kcal)}</div>
            </div>

            <div className="grid grid-cols-3 gap-3 items-center py-2 border-b border-black">
              <div className="text-lg font-black">Proteína (g)</div>
              <div className="text-center text-xl font-black">{Math.round(targetMacros.protein)}</div>
              <div className="text-center text-xl font-black">{actualMacros.protein.toFixed(1)}</div>
            </div>

            <div className="grid grid-cols-3 gap-3 items-center py-2 border-b border-black">
              <div className="text-lg font-black">Carboidrato (g)</div>
              <div className="text-center text-xl font-black">{Math.round(targetMacros.carbs)}</div>
              <div className="text-center text-xl font-black">{actualMacros.carbs.toFixed(1)}</div>
            </div>

            <div className="grid grid-cols-3 gap-3 items-center py-2">
              <div className="text-lg font-black">Gordura (g)</div>
              <div className="text-center text-xl font-black">{Math.round(targetMacros.fat)}</div>
              <div className="text-center text-xl font-black">{actualMacros.fat.toFixed(1)}</div>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="border-2 border-black rounded-lg p-2 text-center">
          <p className="text-sm font-black text-black">
            * As informações nutricionais do molho da salada não estão sendo consideradas nos macronutrientes acima
          </p>
        </div>
      </div>
    );
  }
);

DeliveryLabel.displayName = 'DeliveryLabel';
