"use client";

import React from 'react';
import { Radio, Wrench, Calculator, FileText, CheckCircle2 } from 'lucide-react';

export const WIZARD_STEPS = [
  { id: 1, label: 'Recepción', shortLabel: 'Ingreso', icon: Radio },
  { id: 2, label: 'Diagnóstico', shortLabel: 'Taller', icon: Wrench },
  { id: 3, label: 'Presupuesto', shortLabel: 'Costos', icon: Calculator },
  { id: 4, label: 'Informe', shortLabel: 'Salida', icon: FileText },
];

/**
 * Indicador de progreso del wizard (diseño de demo_web_america).
 * Diferencia: los pasos son clicables para saltar directo (onStepClick).
 */
export default function StepIndicator({ currentStep, onStepClick }) {
  return (
    <div className="w-full max-w-3xl mx-auto mb-8 sm:mb-10 px-2 print:hidden">
      <div className="flex justify-between relative">
        <div className="absolute left-[12%] right-[12%] top-[22px] sm:top-[26px] h-1 sm:h-1.5 bg-gray-200 rounded-full" />
        <div
          className="absolute left-[12%] top-[22px] sm:top-[26px] h-1 sm:h-1.5 rounded-full transition-all duration-700 ease-out"
          style={{
            background: 'linear-gradient(90deg, #E30613, #ff4d5a)',
            width: `${((currentStep - 1) / (WIZARD_STEPS.length - 1)) * 76}%`,
          }}
        />

        {WIZARD_STEPS.map((step) => {
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;
          const Icon = step.icon;

          return (
            <button
              type="button"
              key={step.id}
              id={`step-indicator-${step.id}`}
              onClick={() => onStepClick?.(step.id)}
              className="flex flex-col items-center gap-2 sm:gap-3 z-10 w-16 sm:w-24 group"
            >
              <div
                className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                  isActive
                    ? 'scale-110 shadow-lg shadow-red-500/30 ring-4 ring-red-100'
                    : isCompleted
                      ? 'scale-100 group-hover:scale-105'
                      : 'scale-90 opacity-50 group-hover:opacity-80'
                }`}
                style={{
                  background: isActive
                    ? 'linear-gradient(135deg, #E30613, #ff4d5a)'
                    : isCompleted ? '#E30613' : 'white',
                  border: !isActive && !isCompleted ? '2px solid #e2e8f0' : 'none',
                  color: isActive || isCompleted ? 'white' : '#94a3b8',
                }}
              >
                {isCompleted ? <CheckCircle2 size={22} /> : <Icon size={20} />}
              </div>
              <span
                className={`text-[10px] sm:text-xs font-bold tracking-wide transition-colors duration-300 text-center ${
                  isActive ? 'text-gray-900' : isCompleted ? 'text-gray-600' : 'text-gray-400'
                }`}
              >
                <span className="sm:hidden">{step.shortLabel}</span>
                <span className="hidden sm:inline">{step.label}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
