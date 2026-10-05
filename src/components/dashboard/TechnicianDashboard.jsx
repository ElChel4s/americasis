"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Wrench, Clock, Radio, Search, CheckCircle2,
  AlertCircle, ChevronRight, RefreshCw, Flame,
  FileText, ArrowRight, Eye, ShieldAlert, Cpu
} from 'lucide-react';
import { OrdersService } from '@/lib/services/orders.service';

export default function TechnicianDashboard() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await OrdersService.getOrders();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Error al cargar órdenes de laboratorio:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Lista de órdenes para el técnico: RECIBIDO o EN_DIAGNOSTICO
  const activeOrders = useMemo(() => {
    return orders.filter(o => o.estado === 'RECIBIDO' || o.estado === 'EN_DIAGNOSTICO');
  }, [orders]);

  // Filtrado por buscador
  const filteredOrders = useMemo(() => {
    if (!searchTerm.trim()) return activeOrders;
    const term = searchTerm.toLowerCase();
    return activeOrders.filter(o => {
      const matchClient = (o.razon_social || '').toLowerCase().includes(term);
      const matchOrden = (o.numero_orden || `OS-${o.id}`).toLowerCase().includes(term);
      const matchSerie = (o.equipos || []).some(eq =>
        (eq.serie || eq.numero_serie || '').toLowerCase().includes(term) ||
        (eq.modelo || '').toLowerCase().includes(term)
      );
      return matchClient || matchOrden || matchSerie;
    });
  }, [activeOrders, searchTerm]);

  // Formateador de tiempo transcurrido
  const getTiempoEspera = (dateStr) => {
    if (!dateStr) return 'Reciente';
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays} día(s) en espera`;
    if (diffHours > 0) return `${diffHours} hora(s) en espera`;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    return `${Math.max(1, diffMinutes)} min en espera`;
  };

  return (
    <div className="space-y-6 animate-slideUp font-sans pb-16">
      {/* Cabecera Técnica del Laboratorio */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 bg-navy text-white rounded-2xl shadow-sm">
              <Cpu size={22} />
            </span>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#E30613]">
                Laboratorio Especializado RF & Diagnóstico
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight leading-tight">
                Mesa de Trabajo Técnica
              </h1>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-2 max-w-2xl leading-relaxed">
            Cola de órdenes ingresadas en mostrador listas para revisión física, calibración de potencia y banco de pruebas.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-2xl flex items-center gap-3">
            <div className="text-right">
              <span className="text-[10px] font-bold text-gray-400 uppercase block">Pendientes en Mesa</span>
              <span className="text-xl font-black text-gray-900 leading-none">{activeOrders.length}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Wrench size={18} />
            </div>
          </div>
        </div>
      </div>

      {/* Buscador Rápido de Mesa Técnica */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por cliente, N° orden o serie de radio..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-[#E30613] font-medium"
          />
        </div>

        <button
          onClick={fetchOrders}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-gray-600 hover:bg-slate-50 transition-colors cursor-pointer shrink-0"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin text-red-600' : ''} />
          <span>Actualizar Cola</span>
        </button>
      </div>

      {/* Lista de Órdenes en Mesa Técnica (RECIBIDO / EN_DIAGNOSTICO) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-black text-gray-900">
              Órdenes de Servicio en Cola de Laboratorio
            </h2>
            <p className="text-xs text-gray-500">
              Seleccione una orden para abrir la mesa de pruebas y registrar fallas por handy.
            </p>
          </div>
          <span className="text-xs font-black px-3 py-1 rounded-full bg-slate-100 text-gray-700">
            {filteredOrders.length} orden(es)
          </span>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="py-16 text-center text-gray-400 space-y-2">
            <CheckCircle2 size={36} className="text-emerald-500 mx-auto" />
            <h3 className="font-bold text-gray-700 text-sm">Mesa de trabajo al día</h3>
            <p className="text-xs text-gray-400">No hay órdenes pendientes de diagnóstico en este momento.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredOrders.map((ord) => {
              const equiposCount = ord.equipos?.length || 1;
              const tiempoEspera = getTiempoEspera(ord.createdAt);

              return (
                <div
                  key={ord.id}
                  className="p-5 sm:p-6 hover:bg-slate-50/70 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono font-black text-sm sm:text-base text-gray-900">
                        #{ord.numero_orden || ord.id}
                      </span>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                        ord.estado === 'EN_DIAGNOSTICO' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-gray-700'
                      }`}>
                        {ord.estado === 'EN_DIAGNOSTICO' ? 'En Mesa RF' : 'Recibido en Mostrador'}
                      </span>
                    </div>

                    <h3 className="text-sm sm:text-base font-bold text-gray-900">
                      {ord.razon_social || 'Cliente Mostrador'}
                    </h3>

                    <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap pt-0.5">
                      <span className="flex items-center gap-1 font-semibold text-gray-700">
                        <Radio size={13} className="text-[#E30613]" />
                        <span>{equiposCount} equipo(s) en lote</span>
                      </span>

                      <span className="flex items-center gap-1 text-gray-500">
                        <Clock size={13} />
                        <span>{tiempoEspera}</span>
                      </span>

                      {ord.equipos?.[0]?.falla_declarada_cliente && (
                        <span className="text-gray-600 italic truncate max-w-xs">
                          Falla: &quot;{ord.equipos[0].falla_declarada_cliente}&quot;
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Botón de Acción Exigido: [ Abrir Diagnóstico en Mesa ] */}
                  <div className="shrink-0 flex items-center justify-end">
                    <button
                      type="button"
                      id={`btn-abrir-mesa-${ord.id}`}
                      onClick={() => router.push(`/tecnico/diagnostico/${ord.id}`)}
                      className="w-full sm:w-auto px-5 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 active:scale-[0.98] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-red-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <Wrench size={16} />
                      <span>Abrir Diagnóstico en Mesa</span>
                      <ArrowRight size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
