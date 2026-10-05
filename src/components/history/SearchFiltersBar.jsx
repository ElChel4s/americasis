"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  X, 
  Filter, 
  Calendar, 
  ScanLine, 
  ChevronDown, 
  RotateCcw,
  Sparkles,
  Radio,
  SlidersHorizontal
} from 'lucide-react';

const ESTADOS_FILTRO = [
  { id: 'TODOS', label: 'Todos', dot: 'bg-slate-400' },
  { id: 'EN_DIAGNOSTICO', label: 'En Diagnóstico', dot: 'bg-amber-500' },
  { id: 'ESPERANDO_REPUESTO', label: 'Esperando Repuesto', dot: 'bg-indigo-500' },
  { id: 'LISTO', label: 'Listos para Entrega', dot: 'bg-emerald-500' },
  { id: 'ENTREGADO', label: 'Entregados', dot: 'bg-blue-500' },
  { id: 'RECHAZADO', label: 'Rechazados', dot: 'bg-red-500' },
  { id: 'BORRADOR', label: 'Borradores', dot: 'bg-gray-400' },
];

const MARCAS_RADIO = ['TODAS', 'Motorola', 'Vertex Standard', 'Yaesu', 'Kenwood', 'Hytera', 'Icom'];
const BANDAS_RADIO = ['TODAS', 'VHF', 'UHF'];

export default function SearchFiltersBar({
  searchQuery,
  onSearchChange,
  selectedEstado,
  onEstadoChange,
  marca,
  onMarcaChange,
  banda,
  onBandaChange,
  fechaDesde,
  fechaHasta,
  onDateRangeChange,
  onResetFilters,
  totalResults,
  isLoading
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchQuery || '');
  const searchInputRef = useRef(null);

  // Sincronizar input con prop
  useEffect(() => {
    setLocalSearch(searchQuery || '');
  }, [searchQuery]);

  // Debounce de 300ms para emitir la búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== searchQuery) {
        onSearchChange(localSearch);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [localSearch, searchQuery, onSearchChange]);

  const handleClearSearch = () => {
    setLocalSearch('');
    onSearchChange('');
    searchInputRef.current?.focus();
  };

  const handlePistolaFocus = () => {
    searchInputRef.current?.focus();
    searchInputRef.current?.select();
  };

  const isAnyFilterActive = selectedEstado !== 'TODOS' || 
    marca !== 'TODAS' || 
    banda !== 'TODAS' || 
    Boolean(fechaDesde) || 
    Boolean(fechaHasta) || 
    Boolean(searchQuery);

  return (
    <div className="space-y-4">
      {/* 1. OMNIBAR DE BÚSQUEDA MULTICRITERIO */}
      <div className="card bg-white border border-slate-200/90 shadow-sm p-3.5 sm:p-5">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          
          {/* Input Omnicanal */}
          <div className="relative flex-1">
            <div className="relative flex items-center">
              <Search className="absolute left-3.5 text-slate-400 pointer-events-none" size={20} />
              
              <input
                ref={searchInputRef}
                type="text"
                id="omnibar-search-input"
                placeholder="Buscar por N° Orden (OS-00124), Cliente, NIT/CI, Contacto o Serie (S/N)..."
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    onSearchChange(localSearch.trim());
                  }
                }}
                className="input-field pl-11 pr-20 py-3.5 text-sm sm:text-base bg-slate-50/80 focus:bg-white border-2 border-slate-200 focus:border-red-500 rounded-xl transition-all font-medium tracking-tight placeholder:text-slate-400"
              />

              {/* Botones integrados en el input */}
              <div className="absolute right-2.5 flex items-center gap-1.5">
                {localSearch && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="p-1.5 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                    title="Limpiar búsqueda"
                  >
                    <X size={16} />
                  </button>
                )}

                <button
                  type="button"
                  onClick={handlePistolaFocus}
                  className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 bg-slate-100 hover:bg-red-50 hover:text-red-600 transition-colors border border-slate-200"
                  title="Enfocar para disparo de pistola o lector de código de barras"
                >
                  <ScanLine size={14} className="text-red-500" />
                  <span>Escanear</span>
                </button>
              </div>
            </div>
          </div>

          {/* Botón Filtros Avanzados y Contador */}
          <div className="flex items-center justify-between md:justify-end gap-2 shrink-0">
            <button
              type="button"
              id="btn-toggle-filtros-avanzados"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`px-4 py-3 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 border transition-all ${
                showAdvanced || (marca !== 'TODAS' || banda !== 'TODAS' || fechaDesde || fechaHasta)
                  ? 'bg-navy text-white border-navy shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <SlidersHorizontal size={16} />
              <span>Filtros Avanzados</span>
              {(marca !== 'TODAS' || banda !== 'TODAS' || fechaDesde || fechaHasta) && (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              )}
            </button>

            {isAnyFilterActive && (
              <button
                type="button"
                onClick={onResetFilters}
                className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-slate-200"
                title="Restablecer todos los filtros"
              >
                <RotateCcw size={16} />
              </button>
            )}
          </div>
        </div>

        {/* 2. CHIPS DE ESTADO OPERATIVO (FILTRO RÁPIDO) */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 max-w-full no-scrollbar">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 mr-1 shrink-0 flex items-center gap-1">
              <Filter size={12} /> Estado:
            </span>
            {ESTADOS_FILTRO.map((est) => {
              const isSelected = selectedEstado === est.id;
              return (
                <button
                  key={est.id}
                  type="button"
                  id={`chip-estado-${est.id.toLowerCase()}`}
                  onClick={() => onEstadoChange(est.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-navy text-white shadow-sm ring-2 ring-navy/20'
                      : 'bg-slate-100/90 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${est.dot} ${isSelected ? 'ring-1 ring-white' : ''}`} />
                  <span>{est.label}</span>
                </button>
              );
            })}
          </div>

          {/* Contador de resultados */}
          <div className="text-xs font-bold text-slate-500 whitespace-nowrap ml-auto flex items-center gap-1.5">
            {isLoading ? (
              <span className="text-red-600 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                Buscando...
              </span>
            ) : (
              <span>
                <strong className="text-navy font-black">{totalResults}</strong> órdenes encontradas
              </span>
            )}
          </div>
        </div>

        {/* 3. PANEL DESPLEGABLE DE FILTROS AVANZADOS */}
        {showAdvanced && (
          <div className="mt-4 pt-4 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 animate-slideDown bg-slate-50/70 p-4 rounded-xl">
            
            {/* Filtro Marca */}
            <div>
              <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider block mb-1">
                Marca del Radio
              </label>
              <select
                value={marca}
                onChange={(e) => onMarcaChange(e.target.value)}
                className="input-field py-2 text-xs bg-white"
              >
                {MARCAS_RADIO.map(m => (
                  <option key={m} value={m}>{m === 'TODAS' ? 'Todas las marcas' : m}</option>
                ))}
              </select>
            </div>

            {/* Filtro Banda */}
            <div>
              <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider block mb-1">
                Banda de Frecuencia
              </label>
              <select
                value={banda}
                onChange={(e) => onBandaChange(e.target.value)}
                className="input-field py-2 text-xs bg-white"
              >
                {BANDAS_RADIO.map(b => (
                  <option key={b} value={b}>{b === 'TODAS' ? 'Todas las bandas (VHF / UHF)' : b}</option>
                ))}
              </select>
            </div>

            {/* Fecha Desde */}
            <div>
              <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider block mb-1">
                Ingreso Desde
              </label>
              <input
                type="date"
                value={fechaDesde || ''}
                onChange={(e) => onDateRangeChange(e.target.value, fechaHasta)}
                className="input-field py-2 text-xs bg-white"
              />
            </div>

            {/* Fecha Hasta */}
            <div>
              <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider block mb-1">
                Ingreso Hasta
              </label>
              <input
                type="date"
                value={fechaHasta || ''}
                onChange={(e) => onDateRangeChange(fechaDesde, e.target.value)}
                className="input-field py-2 text-xs bg-white"
              />
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
