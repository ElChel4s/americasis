"use client";

import React, { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function GlobalErrorBoundary({ error, reset }) {
  useEffect(() => {
    console.error('Unhandled application error:', error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-lg w-full p-6 sm:p-8 text-center space-y-5 animate-in fade-in duration-300">
        <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl mx-auto flex items-center justify-center shadow-xs">
          <AlertTriangle size={32} />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-black text-gray-900 tracking-tight">
            Ha ocurrido un inconveniente al cargar la vista
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
            Se presentó una discrepancia en el navegador o datos técnicos. Puede reintentar la operación o volver al centro operativo.
          </p>
          {error?.message && (
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-left overflow-x-auto text-[11px] font-mono text-slate-600">
              {error.message}
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 shadow-md cursor-pointer transition-all"
          >
            <RefreshCw size={15} />
            <span>Reintentar Carga</span>
          </button>

          <button
            type="button"
            onClick={() => window.location.href = '/'}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-gray-700 bg-slate-100 hover:bg-slate-200 cursor-pointer transition-all"
          >
            <Home size={15} />
            <span>Volver al Inicio</span>
          </button>
        </div>
      </div>
    </div>
  );
}
