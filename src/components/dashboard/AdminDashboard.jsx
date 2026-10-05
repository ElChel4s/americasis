"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Shield, Users, Search, ChevronRight, Plus,
  Wrench, DollarSign, FileText, CheckCircle2, Clock,
  RefreshCw, Radio, Eye, ExternalLink, ArrowRight
} from 'lucide-react';
import { OrdersService } from '@/lib/services/orders.service';
import { formatCurrency } from '@/lib/utils/currencyFormat';

const ESTADOS_FILTRO = [
  { id: 'ALL', label: 'Todas las Órdenes' },
  { id: 'RECIBIDO', label: '1. Recibido' },
  { id: 'EN_DIAGNOSTICO', label: '2. En Mesa' },
  { id: 'DIAGNOSTICADO', label: '3. Diagnosticado' },
  { id: 'COTIZADO', label: '4. Cotizado' },
  { id: 'ENTREGADO', label: '5. Entregado' },
];

export default function AdminDashboard({ onNewOrder }) {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await OrdersService.getOrders();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Error al cargar órdenes de gerencia:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const currentStatus = o.estado || o.estado_global || 'RECIBIDO';
      const matchStatus = filterStatus === 'ALL' || currentStatus === filterStatus;
      if (!matchStatus) return false;

      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      const matchClient = (o.razon_social || '').toLowerCase().includes(term);
      const matchOrden = (o.numero_orden || `OS-${o.id}`).toLowerCase().includes(term);
      const matchSerie = (o.equipos || []).some(eq =>
        (eq.serie || eq.numero_serie || '').toLowerCase().includes(term) ||
        (eq.modelo || '').toLowerCase().includes(term)
      );
      return matchClient || matchOrden || matchSerie;
    });
  }, [orders, filterStatus, searchTerm]);

  // Contadores por estado
  const statusCounts = useMemo(() => {
    const counts = { ALL: orders.length, RECIBIDO: 0, EN_DIAGNOSTICO: 0, DIAGNOSTICADO: 0, COTIZADO: 0, ENTREGADO: 0 };
    orders.forEach(o => {
      const st = o.estado || o.estado_global || 'RECIBIDO';
      if (counts[st] !== undefined) counts[st] += 1;
    });
    return counts;
  }, [orders]);

  return (
    <div className="space-y-6 animate-slideUp font-sans pb-16">
      {/* Cabecera Ejecutiva de Gerencia General */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 bg-navy text-white rounded-2xl shadow-sm">
              <Shield size={22} />
            </span>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#E30613]">
                Gerencia General & Supervisión Operativa
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight leading-tight">
                Supervisión Global de Flujos
              </h1>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-2 max-w-2xl leading-relaxed">
            Monitoreo unificado de todas las órdenes en taller, acceso irrestricto de edición técnica y presupuestaria.
          </p>
        </div>

        {/* Acciones de Gerencia */}
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <Link
            href="/admin/personal"
            id="btn-admin-personal"
            className="flex items-center gap-2 px-4 py-3 bg-white hover:bg-slate-50 text-gray-800 font-bold text-xs rounded-xl border border-slate-200 shadow-xs transition-all"
          >
            <Users size={16} className="text-navy" />
            <span>Gestionar Personal</span>
          </Link>

          <button
            onClick={() => router.push('/recepcion/nueva-orden')}
            id="btn-admin-nueva-orden"
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-600/20 transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>+ Nueva Orden</span>
          </button>
        </div>
      </div>

      {/* Buscador y Filtros de Estado Unificados */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-96">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por cliente, N° orden o serie de equipo..."
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
            <span>Refrescar Lista</span>
          </button>
        </div>

        {/* Filtros de Estado */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-100">
          {ESTADOS_FILTRO.map((st) => (
            <button
              key={st.id}
              onClick={() => setFilterStatus(st.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                filterStatus === st.id
                  ? 'bg-navy text-white shadow-xs'
                  : 'bg-slate-50 text-gray-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span>{st.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                filterStatus === st.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-gray-700'
              }`}>
                {statusCounts[st.id] || 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Tabla Unificada de Flujos */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-black uppercase tracking-wider text-gray-500 border-b border-slate-200">
                <th className="py-3.5 px-4 sm:px-6">N° Orden</th>
                <th className="py-3.5 px-4">Cliente / Razón Social</th>
                <th className="py-3.5 px-4">Equipos</th>
                <th className="py-3.5 px-4">Estado Operativo</th>
                <th className="py-3.5 px-4 text-right">Importe Liquidado</th>
                <th className="py-3.5 px-4 sm:px-6 text-right">Acciones de Edición Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    No hay órdenes que coincidan con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredOrders.map(ord => {
                  const estado = ord.estado || ord.estado_global || 'RECIBIDO';
                  return (
                    <tr key={ord.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 sm:px-6 font-mono font-black text-gray-900">
                        #{ord.numero_orden || `OS-${ord.id}`}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-gray-800 block truncate max-w-[200px]">
                          {ord.razon_social || 'Cliente Mostrador'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-gray-600">
                        {ord.equipos?.length || ord.total_equipos || 1} radio(s)
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${
                          estado === 'ENTREGADO' ? 'bg-emerald-100 text-emerald-800' :
                          estado === 'COTIZADO' ? 'bg-blue-100 text-blue-800' :
                          estado === 'DIAGNOSTICADO' ? 'bg-purple-100 text-purple-800' :
                          estado === 'EN_DIAGNOSTICO' ? 'bg-amber-100 text-amber-800' :
                          'bg-slate-100 text-gray-700'
                        }`}>
                          {estado.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-black text-gray-900">
                        {formatCurrency(ord.sumatoria_total || 0, ord.moneda || 'BOB')}
                      </td>
                      <td className="py-3.5 px-4 sm:px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Botón 1: Mesa Técnica */}
                          <button
                            type="button"
                            onClick={() => router.push(`/tecnico/diagnostico/${ord.id}`)}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-gray-700 font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer"
                            title="Abrir mesa de diagnóstico técnico"
                          >
                            <Wrench size={13} className="text-[#E30613]" />
                            <span>Mesa Técnica</span>
                          </button>

                          {/* Botón 2: Presupuesto y Cotización */}
                          <button
                            type="button"
                            onClick={() => router.push(`/recepcion/orden/${ord.id}/presupuesto`)}
                            className="px-2.5 py-1.5 rounded-lg bg-navy hover:bg-slate-800 text-white font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                            title="Fijar costos, imprimir A4 o descargar Word"
                          >
                            <DollarSign size={13} className="text-emerald-400" />
                            <span>Presupuesto / Doc</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
