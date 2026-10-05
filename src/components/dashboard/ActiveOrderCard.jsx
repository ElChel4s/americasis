"use client";

import React from 'react';
import { 
  Radio, 
  Clock, 
  Wrench, 
  ChevronRight, 
  Camera, 
  User, 
  AlertCircle,
  CheckCircle2,
  Calendar,
  Layers
} from 'lucide-react';

const ESTADO_CONFIG = {
  BORRADOR: {
    label: 'Borrador Abierto',
    bg: 'bg-gray-100 text-gray-700 border-gray-200',
    dot: 'bg-gray-400'
  },
  RECIBIDO: {
    label: 'Recibido',
    bg: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-500'
  },
  EN_DIAGNOSTICO: {
    label: 'En Diagnóstico',
    bg: 'bg-amber-50 text-amber-800 border-amber-200',
    dot: 'bg-amber-500'
  },
  ESPERANDO_REPUESTO: {
    label: 'Esperando Repuesto',
    bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    dot: 'bg-indigo-500'
  },
  EN_REPARACION: {
    label: 'En Reparación',
    bg: 'bg-orange-50 text-orange-700 border-orange-200',
    dot: 'bg-orange-500'
  },
  LISTO: {
    label: 'Listo para Entrega',
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500'
  }
};

/**
 * Calcula tiempo relativo transcurrido desde la fecha de ingreso
 */
function formatearTiempo(fechaStr) {
  if (!fechaStr) return 'Reciente';
  const fecha = new Date(fechaStr);
  const diffMs = Date.now() - fecha.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHoras = Math.floor(diffMins / 60);
  const diffDias = Math.floor(diffHoras / 24);

  if (diffMins < 60) return `Hace ${Math.max(1, diffMins)} min`;
  if (diffHoras < 24) return `Hace ${diffHoras} hr${diffHoras > 1 ? 's' : ''}`;
  return `Hace ${diffDias} día${diffDias > 1 ? 's' : ''}`;
}

export default function ActiveOrderCard({ order, onContinue, onQuickView }) {
  const estadoInfo = ESTADO_CONFIG[order.estado] || ESTADO_CONFIG.EN_DIAGNOSTICO;
  const equipos = order.equipos || [];
  const totalEquipos = order.total_equipos || equipos.length || 1;

  // Resumen de modelos (ej. "3 Handies DEP450, PRO5150")
  const modelosUnicos = [...new Set(equipos.map(e => e.modelo).filter(Boolean))];
  const resumenModelos = modelosUnicos.length > 0 
    ? modelosUnicos.slice(0, 2).join(', ') + (modelosUnicos.length > 2 ? ` +${modelosUnicos.length - 2}` : '')
    : 'Handies VHF/UHF';

  const numeroOrden = order.numero_orden || `OS-${String(order.id).padStart(5, '0')}`;

  return (
    <div className="card group flex flex-col justify-between hover:border-red-500/30 hover:shadow-md transition-all">
      <div>
        {/* Cabecera de la Tarjeta */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-black text-navy tracking-tight group-hover:text-red-600 transition-colors">
                #{numeroOrden}
              </span>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${estadoInfo.bg}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${estadoInfo.dot} animate-pulse`} />
                {estadoInfo.label}
              </span>
            </div>
            <h4 className="text-base font-extrabold text-navy mt-1 line-clamp-1 uppercase tracking-tight">
              {order.razon_social || 'Consumidor Final'}
            </h4>
          </div>

          <span className="text-[11px] text-gray-400 font-medium whitespace-nowrap flex items-center gap-1 shrink-0">
            <Clock size={12} />
            {formatearTiempo(order.creado_en)}
          </span>
        </div>

        {/* Resumen de Flota / Radios */}
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 mb-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500 font-medium flex items-center gap-1.5">
              <Radio size={14} className="text-red-600" />
              {totalEquipos} radio{totalEquipos > 1 ? 's' : ''} en reparación
            </span>
            <span className="font-bold text-gray-700 truncate max-w-[140px]">
              {resumenModelos}
            </span>
          </div>

          {/* Micro lista de chips de series */}
          {equipos.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1 border-t border-slate-200/60">
              {equipos.slice(0, 3).map((eq, i) => (
                <span key={eq.id || i} className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white border border-slate-200 text-gray-600">
                  {eq.numero_serie || `Eq-${i+1}`}
                </span>
              ))}
              {equipos.length > 3 && (
                <span className="text-[10px] px-1 py-0.5 text-gray-400 font-bold">
                  +{equipos.length - 3} más
                </span>
              )}
            </div>
          )}
        </div>

        {/* Info adicional: Técnico asignado y moneda */}
        <div className="flex items-center justify-between text-xs text-gray-500 mb-4 px-1">
          <span className="flex items-center gap-1.5 truncate">
            <User size={13} className="text-gray-400" />
            <span className="truncate">{order.recepcionista_nombre_manual || 'Técnico Asignado'}</span>
          </span>
          <span className="font-mono font-bold text-gray-700 shrink-0">
            {order.moneda || 'BOB'} {parseFloat(order.sumatoria_total || 0).toFixed(2)}
          </span>
        </div>
      </div>

      {/* Botones de Acción */}
      <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onContinue(order)}
          className="flex-1 btn-primary py-2.5 px-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 shadow-sm"
        >
          <Wrench size={15} />
          <span>Continuar Diagnóstico</span>
          <ChevronRight size={14} />
        </button>

        <button
          type="button"
          onClick={() => onQuickView(order)}
          title="Ver resumen rápido y evidencias fotográficas"
          className="p-2.5 rounded-xl border border-slate-200 hover:border-navy hover:text-navy text-gray-500 bg-white transition-all shrink-0"
        >
          <Camera size={16} />
        </button>
      </div>
    </div>
  );
}
