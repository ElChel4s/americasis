"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Check, Plus, Tag, X, ChevronDown, Package } from 'lucide-react';
import { searchRepuestos, getPrecioRepuesto } from '@/lib/utils/repuestosCatalog';

export default function RepuestoCombobox({
  moneda = 'BOB',
  placeholder = "Buscar repuesto (ej: NNTN4497, Batería, PTT, DEP450)...",
  onSelect,
  className = ""
}) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [categoria, setCategoria] = useState('TODAS');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const results = useMemo(() => {
    return searchRepuestos(query, categoria).slice(0, 15);
  }, [query, categoria]);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (item) => {
    const precio = getPrecioRepuesto(item, moneda);
    onSelect?.({
      ...item,
      precioCalculado: precio
    });
    setQuery('');
    setIsOpen(false);
  };

  const handleAddCustom = () => {
    if (!query.trim()) return;
    onSelect?.({
      id: `custom-${Date.now()}`,
      nombre: query.trim(),
      modelo_compatible: 'Específico',
      categoria: 'Personalizado',
      precioCalculado: moneda === 'USD' ? 20 : 140
    });
    setQuery('');
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div className="relative flex items-center">
        <Search size={16} className="absolute left-3.5 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:bg-white focus:border-[#E30613] focus:ring-2 focus:ring-red-500/10 transition-all shadow-xs"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            className="absolute right-3 p-0.5 text-gray-400 hover:text-gray-600 rounded-full cursor-pointer"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Menú Flotante de Resultados */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden max-h-80 flex flex-col animate-in fade-in zoom-in-95 duration-150">
          {/* Barra de Filtro de Categorías */}
          <div className="flex items-center gap-1 p-2 bg-slate-50 border-b border-slate-100 overflow-x-auto text-[11px] font-bold shrink-0">
            {['TODAS', 'Baterías', 'Antenas', 'Pulsadores y Conmutadores', 'Audio y Micrófonos', 'Semiconductores y RF'].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoria(cat)}
                className={`px-2.5 py-1 rounded-lg transition-all shrink-0 cursor-pointer ${
                  categoria === cat
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'text-gray-600 hover:bg-slate-200/70'
                }`}
              >
                {cat === 'TODAS' ? 'Todos' : cat}
              </button>
            ))}
          </div>

          {/* Lista de Repuestos */}
          <div className="overflow-y-auto divide-y divide-slate-100 p-1 flex-1">
            {results.length > 0 ? (
              results.map((item) => {
                const precio = getPrecioRepuesto(item, moneda);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item)}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-red-50/70 transition-colors flex items-center justify-between gap-3 group cursor-pointer"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span className="p-1.5 bg-slate-100 group-hover:bg-red-100 text-gray-500 group-hover:text-red-600 rounded-lg shrink-0 mt-0.5 transition-colors">
                        <Package size={14} />
                      </span>
                      <div className="min-w-0">
                        <span className="font-bold text-gray-900 text-xs sm:text-sm block truncate group-hover:text-red-700">
                          {item.nombre}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-400">
                          <span className="bg-slate-100 text-slate-700 font-bold px-1.5 py-0.2 rounded text-[10px]">
                            {item.categoria}
                          </span>
                          <span className="truncate">Compat: {item.modelo_compatible}</span>
                        </div>
                      </div>
                    </div>

                    {/* Precios Base */}
                    <div className="text-right shrink-0">
                      <span className="font-mono font-black text-xs sm:text-sm text-gray-900 block group-hover:text-red-600">
                        {moneda === 'USD' ? `$${precio.toFixed(2)}` : `${precio.toFixed(2)} Bs.`}
                      </span>
                      <span className="text-[10px] text-gray-400 block font-mono">
                        {moneda === 'USD' ? `${item.precio_bs} Bs.` : `$${item.precio_usd}`}
                      </span>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-4 text-center space-y-2">
                <p className="text-xs text-gray-500">
                  No se encontraron repuestos con &quot;<strong>{query}</strong>&quot;
                </p>
                {query.trim() && (
                  <button
                    type="button"
                    onClick={handleAddCustom}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 text-xs font-bold transition-all cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Añadir &quot;{query}&quot; como ítem cotizado</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
