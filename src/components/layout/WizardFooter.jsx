"use client";

import React from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2, Save, Loader2 } from 'lucide-react';

/**
 * Barra de navegación flotante inferior del wizard (diseño de demo_web_america).
 * Añade: botón "Guardar" persistente (POST/PUT a la BD) en todos los pasos.
 */
export default function WizardFooter({ currentStep, totalSteps = 4, onPrev, onNext, onSave, onFinish, isSaving = false }) {
  const isLast = currentStep === totalSteps;

  return (
    <div className="fixed bottom-0 left-0 right-0 p-3 sm:p-4 z-40 bg-gradient-to-t from-slate-100 via-slate-100/95 to-transparent print:hidden">
      <div className="mx-auto max-w-4xl">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-[0_-4px_30px_rgba(0,0,0,0.08)] border border-gray-200/60 p-3 sm:p-4 flex justify-between items-center gap-3">
          <button
            type="button"
            id="footer-btn-atras"
            onClick={onPrev}
            disabled={currentStep === 1}
            className="btn-ghost"
          >
            <ChevronLeft size={18} />
            <span className="hidden sm:inline">Atrás</span>
          </button>

          <div className="hidden md:flex items-center gap-1.5">
            {Array.from({ length: totalSteps }, (_, i) => i + 1).map(s => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  s < currentStep ? 'w-8 bg-green-500' : s === currentStep ? 'w-12 bg-red-500' : 'w-4 bg-gray-200'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="footer-btn-guardar"
              onClick={onSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-navy bg-white border-2 border-slate-200 hover:border-navy/30 transition-all disabled:opacity-50"
            >
              {isSaving ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}
              <span className="hidden sm:inline">{isSaving ? 'Guardando…' : 'Guardar'}</span>
            </button>

            {!isLast ? (
              <button type="button" id="footer-btn-siguiente" onClick={onNext} className="btn-primary px-6 sm:px-8">
                <span>Siguiente</span>
                <ChevronRight size={18} />
              </button>
            ) : (
              <button
                type="button"
                id="footer-btn-finalizar"
                onClick={onFinish}
                disabled={isSaving}
                className="flex items-center gap-2 px-6 sm:px-8 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-emerald-600 to-green-500 shadow-lg shadow-green-500/25 hover:shadow-green-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                <CheckCircle2 size={18} />
                <span>Finalizar Orden</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
