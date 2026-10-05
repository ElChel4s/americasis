"use client";

import React from 'react';
import { Radio, Plus, X } from 'lucide-react';

const ESTADO_BADGE = {
  RECIBIDO: { label: 'Recibido', cls: 'bg-blue-50 text-blue-600' },
  EN_DIAGNOSTICO: { label: 'Diagnóstico', cls: 'bg-amber-50 text-amber-600' },
  EN_REPARACION: { label: 'Reparación', cls: 'bg-amber-50 text-amber-600' },
  LISTO: { label: 'Listo', cls: 'bg-emerald-50 text-emerald-600' },
  RECHAZADO: { label: 'Rechazado', cls: 'bg-red-100 text-red-600' },
};

const getEstado = (equipo) =>
  equipo.reparacion_rechazada ? 'RECHAZADO' : (equipo.estado_individual || 'RECIBIDO');

/**
 * Pestañas de handies de la flota (diseño de demo_web_america) con badge de estado individual.
 */
export default function EquipmentTabs({ equipos = [], activeIndex = 0, onSelect, onAdd, onRemove, showAdd = true }) {
  return (
    <div className="mb-5">
      <div className="flex items-end gap-1.5 overflow-x-auto pb-1">
        {equipos.map((equipo, idx) => {
          const active = idx === activeIndex;
          const estado = ESTADO_BADGE[getEstado(equipo)] || ESTADO_BADGE.RECIBIDO;
          const rechazado = getEstado(equipo) === 'RECHAZADO';
          return (
            <button
              type="button"
              key={equipo.id || idx}
              id={`equipo-tab-${idx + 1}`}
              onClick={() => onSelect?.(idx)}
              className={`relative group flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-bold whitespace-nowrap transition-all border-b-2 ${
                active
                  ? 'bg-white border-red-500 text-gray-900 shadow-sm'
                  : 'bg-gray-100 border-transparent text-gray-500 hover:bg-gray-200 hover:text-gray-700'
              } ${rechazado && !active ? 'opacity-70' : ''}`}
            >
              <Radio size={14} className={active ? 'text-red-500' : 'text-gray-400'} />
              <span className={rechazado ? 'line-through decoration-red-400/60' : ''}>
                <span className="text-gray-400 font-semibold mr-1">{idx + 1}:</span>
                {equipo.modelo || `Equipo ${idx + 1}`}
              </span>
              <span className={`text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded ${estado.cls}`}>
                {estado.label}
              </span>
              {showAdd && equipos.length > 1 && onRemove && (
                <span
                  onClick={(e) => { e.stopPropagation(); onRemove(idx, e); }}
                  className="ml-0.5 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-100 hover:text-red-600 transition-all cursor-pointer"
                  title="Eliminar equipo"
                >
                  <X size={12} />
                </span>
              )}
            </button>
          );
        })}
        {showAdd && equipos.length < 10 && onAdd && (
          <button
            type="button"
            id="btn-agregar-equipo"
            onClick={onAdd}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-t-xl text-sm font-bold text-red-500 bg-red-50 hover:bg-red-100 border-b-2 border-transparent transition-all whitespace-nowrap"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">Agregar equipo</span>
            <span className="sm:hidden">Añadir</span>
          </button>
        )}
      </div>
      <div className="h-px bg-gray-200 -mt-px" />
    </div>
  );
}
