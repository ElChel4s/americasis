"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { Radio, Wrench, Calculator, FileText, CheckCircle2, ChevronRight, Building2 } from 'lucide-react';

const PHASES = [
  {
    phase: 1,
    label: 'Fase 1: Ingreso',
    fullName: '1. Recepción & Ingreso',
    icon: Radio,
    description: 'Registro de handies y accesorios'
  },
  {
    phase: 2,
    label: 'Fase 2: Diagnóstico',
    fullName: '2. Dictamen de Laboratorio',
    icon: Wrench,
    description: 'Fallas, parámetros RF y repuestos'
  },
  {
    phase: 3,
    label: 'Fase 3: Presupuesto',
    fullName: '3. Cotización Económica',
    icon: Calculator,
    description: 'Costos de servicio y repuestos'
  },
  {
    phase: 4,
    label: 'Fase 4: Informe A4',
    fullName: '4. Emisión Oficial A4 / PDF',
    icon: FileText,
    description: 'Documento membretado y Word'
  }
];

export default function OrderPhaseNav({
  orderId,
  currentPhase,
  orderNumber = '',
  clientName = '',
  status = 'EN_DIAGNOSTICO',
  userRole = 'RECEPCION'
}) {
  const router = useRouter();

  const getPhaseRoute = (phaseNum) => {
    switch (phaseNum) {
      case 1:
        return `/recepcion/orden/${orderId}/recepcion`;
      case 2:
        return `/tecnico/diagnostico/${orderId}`;
      case 3:
        return `/recepcion/orden/${orderId}/presupuesto`;
      case 4:
        return `/recepcion/orden/${orderId}/informe`;
      default:
        return '/';
    }
  };

  const getStatusBadge = (st) => {
    switch (st) {
      case 'RECIBIDO':
        return { label: 'Recibido', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'EN_DIAGNOSTICO':
        return { label: 'En Laboratorio', bg: 'bg-amber-50 text-amber-800 border-amber-200' };
      case 'DIAGNOSTICADO':
        return { label: 'Diagnosticado', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      case 'COTIZADO':
        return { label: 'Presupuestado', bg: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'EN_REPARACION':
        return { label: 'En Reparación', bg: 'bg-orange-50 text-orange-700 border-orange-200' };
      case 'LISTO':
        return { label: 'Listo p/ Entrega', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'ENTREGADO':
        return { label: 'Entregado', bg: 'bg-slate-100 text-slate-700 border-slate-200' };
      case 'RECHAZADO':
        return { label: 'Rechazado', bg: 'bg-red-50 text-red-700 border-red-200' };
      default:
        return { label: st || 'En Proceso', bg: 'bg-gray-100 text-gray-700 border-gray-200' };
    }
  };

  const statusInfo = getStatusBadge(status);

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-sm space-y-4 print:hidden">
      {/* Barra de Título y Datos de Orden */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="font-mono text-sm sm:text-base font-black text-navy bg-slate-100 px-3 py-1 rounded-xl">
            #{orderNumber || (orderId ? `OS-${String(orderId).padStart(5, '0')}` : 'OS-00000')}
          </span>
          {clientName && (
            <span className="text-xs sm:text-sm font-bold text-gray-700 uppercase flex items-center gap-1.5 truncate max-w-xs sm:max-w-md">
              <Building2 size={14} className="text-gray-400 shrink-0" />
              <span className="truncate">{clientName}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <span className={`px-2.5 py-1 rounded-xl text-[11px] font-black uppercase border ${statusInfo.bg}`}>
            {statusInfo.label}
          </span>
        </div>
      </div>

      {/* Selector de Fases Independientes con Accesos Directos */}
      <div>
        <div className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2 flex items-center justify-between">
          <span>Fases Operativas de la Orden (Navegación Directa):</span>
          <span className="text-[#E30613] font-bold">Acceso directo a pantallas independientes</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
          {PHASES.map((p) => {
            const isCurrent = currentPhase === p.phase;
            const Icon = p.icon;

            return (
              <button
                key={p.phase}
                type="button"
                id={`btn-phase-nav-${p.phase}`}
                onClick={() => {
                  if (!isCurrent) {
                    router.push(getPhaseRoute(p.phase));
                  }
                }}
                className={`relative p-3 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                  isCurrent
                    ? 'bg-navy text-white border-navy shadow-md ring-2 ring-red-500/20'
                    : 'bg-slate-50/80 hover:bg-slate-100/90 text-gray-700 border-slate-200/80 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black transition-all ${
                      isCurrent
                        ? 'bg-[#E30613] text-white shadow-xs'
                        : 'bg-white text-gray-600 border border-slate-200'
                    }`}
                  >
                    <Icon size={14} />
                  </span>

                  {isCurrent && (
                    <span className="text-[9px] font-black tracking-widest uppercase bg-[#E30613] text-white px-2 py-0.5 rounded-full">
                      ACTUAL
                    </span>
                  )}
                </div>

                <div>
                  <h4
                    className={`text-xs font-bold leading-tight ${
                      isCurrent ? 'text-white' : 'text-gray-900'
                    }`}
                  >
                    {p.fullName}
                  </h4>
                  <p
                    className={`text-[10px] mt-0.5 leading-tight truncate ${
                      isCurrent ? 'text-slate-300' : 'text-gray-500'
                    }`}
                  >
                    {p.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
