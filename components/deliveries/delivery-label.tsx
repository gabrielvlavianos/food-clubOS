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
        <div className="border-b-4 border-orange-500 pb-4 mb-4">
          <h1 className="text-3xl font-bold text-gray-900">{customer.name}</h1>
          <div className="mt-2 space-y-1">
            <p className="text-lg font-semibold text-orange-600">
              Horário: {formatTime(deliverySchedule.delivery_time)}
            </p>
            <p className="text-sm text-gray-600">
              {deliverySchedule.delivery_address}
            </p>
          </div>
        </div>

        {/* Quantities Section */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-3">Quantidades</h2>
          <div className="space-y-2">
            {menuRecipes.protein && quantities.protein > 0 && (
              <div className="flex justify-between items-center bg-red-50 border-2 border-red-200 rounded-lg p-3">
                <div>
                  <span className="font-semibold text-red-900">Proteína: </span>
                  <span className="text-red-800">{menuRecipes.protein.name}</span>
                </div>
                <span className="text-2xl font-bold text-red-900">{quantities.protein}g</span>
              </div>
            )}

            {menuRecipes.carb && quantities.carb > 0 && (
              <div className="flex justify-between items-center bg-yellow-50 border-2 border-yellow-200 rounded-lg p-3">
                <div>
                  <span className="font-semibold text-yellow-900">Carboidrato: </span>
                  <span className="text-yellow-800">{menuRecipes.carb.name}</span>
                </div>
                <span className="text-2xl font-bold text-yellow-900">{quantities.carb}g</span>
              </div>
            )}

            {menuRecipes.vegetable && quantities.vegetable > 0 && (
              <div className="flex justify-between items-center bg-green-50 border-2 border-green-200 rounded-lg p-3">
                <div>
                  <span className="font-semibold text-green-900">Legumes: </span>
                  <span className="text-green-800">{menuRecipes.vegetable.name}</span>
                </div>
                <span className="text-2xl font-bold text-green-900">{quantities.vegetable}g</span>
              </div>
            )}

            {menuRecipes.salad && quantities.salad > 0 && (
              <div className="flex justify-between items-center bg-green-50 border-2 border-green-200 rounded-lg p-3">
                <div>
                  <span className="font-semibold text-green-900">Salada: </span>
                  <span className="text-green-800">{menuRecipes.salad.name}</span>
                </div>
                <span className="text-2xl font-bold text-green-900">{quantities.salad}g</span>
              </div>
            )}

            {menuRecipes.sauce && quantities.sauce > 0 && (
              <div className="flex justify-between items-center bg-blue-50 border-2 border-blue-200 rounded-lg p-3">
                <div>
                  <span className="font-semibold text-blue-900">Molho: </span>
                  <span className="text-blue-800">{menuRecipes.sauce.name}</span>
                </div>
                <span className="text-2xl font-bold text-blue-900">{quantities.sauce}g</span>
              </div>
            )}
          </div>
        </div>

        {/* Macronutrients Section */}
        <div className="border-2 border-gray-300 rounded-lg p-4">
          <h2 className="text-xl font-bold text-gray-900 mb-3 text-center">Macronutrientes</h2>

          <div className="grid grid-cols-3 gap-3 font-semibold text-gray-600 border-b-2 border-gray-300 pb-2 mb-2">
            <div></div>
            <div className="text-center">Meta</div>
            <div className="text-center">Entregue</div>
          </div>

          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-3 items-center py-2 border-b border-gray-200">
              <div className="font-semibold">Kcal</div>
              <div className="text-center text-lg font-bold">{Math.round(targetMacros.kcal)}</div>
              <div className="text-center text-lg font-bold text-orange-600">{Math.round(actualMacros.kcal)}</div>
            </div>

            <div className="grid grid-cols-3 gap-3 items-center py-2 border-b border-gray-200">
              <div className="font-semibold">Proteína (g)</div>
              <div className="text-center text-lg font-bold">{Math.round(targetMacros.protein)}</div>
              <div className="text-center text-lg font-bold text-orange-600">{actualMacros.protein.toFixed(1)}</div>
            </div>

            <div className="grid grid-cols-3 gap-3 items-center py-2 border-b border-gray-200">
              <div className="font-semibold">Carboidrato (g)</div>
              <div className="text-center text-lg font-bold">{Math.round(targetMacros.carbs)}</div>
              <div className="text-center text-lg font-bold text-orange-600">{actualMacros.carbs.toFixed(1)}</div>
            </div>

            <div className="grid grid-cols-3 gap-3 items-center py-2">
              <div className="font-semibold">Gordura (g)</div>
              <div className="text-center text-lg font-bold">{Math.round(targetMacros.fat)}</div>
              <div className="text-center text-lg font-bold text-orange-600">{actualMacros.fat.toFixed(1)}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

DeliveryLabel.displayName = 'DeliveryLabel';
