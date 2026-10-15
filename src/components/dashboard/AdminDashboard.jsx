"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Shield, Users, Search, ChevronRight, Plus,
  Wrench, DollarSign, FileText, CheckCircle2, Clock,
  RefreshCw, Radio, Eye, ExternalLink, ArrowRight,
  UserCheck, ShieldAlert, Check, X
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
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Modales
  const [assignModalOrder, setAssignModalOrder] = useState(null);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  const fetchOrders = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const data = await OrdersService.getOrders();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Error al cargar órdenes de gerencia:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(false);

    OrdersService.getTechnicians().then(list => {
      setTechnicians(Array.isArray(list) ? list : []);
    }).catch(err => {
      console.warn('Error al cargar técnicos en admin:', err);
    });

    // Auto-sincronización silenciosa y discreta en segundo plano cada 10 segundos
    const syncInterval = setInterval(() => {
      fetchOrders(true);
    }, 10000);

    // Sincronizar de inmediato cuando la pestaña recupera el foco
    const handleFocus = () => {
      fetchOrders(true);
    };
    window.addEventListener('focus', handleFocus);

    const handleOrdersUpdated = () => {
      fetchOrders(true);
    };

    window.addEventListener('america_orders_updated', handleOrdersUpdated);
    window.addEventListener('storage', handleOrdersUpdated);
    return () => {
      clearInterval(syncInterval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('america_orders_updated', handleOrdersUpdated);
      window.removeEventListener('storage', handleOrdersUpdated);
    };
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const pendingRequests = useMemo(() => {
    return orders.filter(o => o.solicitud_edicion_estado === 'PENDIENTE');
  }, [orders]);

  const handleApproveRequest = async (orderId) => {
    try {
      const updated = await OrdersService.respondTechnicianPermission(orderId, true);
      setOrders(prev => prev.map(o => o.id === orderId ? updated : o));
      showToast('Permiso aprobado: Técnico habilitado para diagnosticar la orden.');
    } catch (err) {
      showToast('No se pudo aprobar la solicitud.');
    }
  };

  const handleRejectRequest = async (orderId) => {
    try {
      const updated = await OrdersService.respondTechnicianPermission(orderId, false);
      setOrders(prev => prev.map(o => o.id === orderId ? updated : o));
      showToast('Solicitud rechazada.');
    } catch (err) {
      showToast('No se pudo rechazar la solicitud.');
    }
  };

  const handleOpenAssignModal = (order) => {
    setAssignModalOrder(order);
    setSelectedTechnicianId(order.usuario_tecnico_id || order.tecnico_asignado_id || '');
  };

  const handleConfirmAssign = async () => {
    if (!assignModalOrder) return;
    setIsAssigning(true);
    try {
      const tech = technicians.find(t => String(t.id) === String(selectedTechnicianId));
      const techName = tech ? tech.nombre_completo : null;
      const updated = await OrdersService.assignTechnician(
        assignModalOrder.id,
        selectedTechnicianId || null,
        techName
      );
      setOrders(prev => prev.map(o => o.id === assignModalOrder.id ? updated : o));
      showToast(tech ? `Técnico "${techName}" asignado a la orden #${assignModalOrder.numero_orden || assignModalOrder.id}` : 'Asignación eliminada.');
      setAssignModalOrder(null);
    } catch (err) {
      showToast('Error al asignar técnico.');
    } finally {
      setIsAssigning(false);
    }
  };

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
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 p-4 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-xl flex items-center gap-2.5 text-xs font-bold animate-in slide-in-from-top-3">
          <CheckCircle2 size={18} className="text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Banner de Solicitudes Pendientes de Técnicos */}
      {pendingRequests.length > 0 && (
        <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-amber-50 border-2 border-indigo-300 rounded-3xl p-5 shadow-sm space-y-4 animate-in slide-in-from-top-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-indigo-600 text-white rounded-2xl shrink-0 shadow-sm shadow-indigo-600/30">
                <ShieldAlert size={20} />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-indigo-950">
                    Supervisión de Solicitudes de Edición Técnica
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-600 text-white">
                    {pendingRequests.length} pendiente(s)
                  </span>
                </div>
                <p className="text-xs text-indigo-900 mt-0.5">
                  Técnicos que requieren autorización para diagnosticar órdenes no asignadas:
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {pendingRequests.map(reqOrder => (
              <div
                key={reqOrder.id}
                className="bg-white p-4 rounded-2xl border border-indigo-200 shadow-xs flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-black text-xs text-gray-900">
                      #{reqOrder.numero_orden || reqOrder.id}
                    </span>
                    <span className="text-[10px] font-black uppercase bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded">
                      Permiso Requerido
                    </span>
                  </div>
                  <p className="text-xs font-bold text-gray-800 truncate mt-1">
                    {reqOrder.razon_social}
                  </p>
                  <p className="text-[11px] text-gray-600 mt-1">
                    Técnico: <strong className="text-indigo-950 underline">{reqOrder.solicitud_edicion_tecnico_nombre || 'Técnico'}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleApproveRequest(reqOrder.id)}
                    className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-black rounded-xl shadow-xs flex items-center justify-center gap-1 cursor-pointer transition-all"
                  >
                    <Check size={14} />
                    <span>Aprobar Permiso</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRejectRequest(reqOrder.id)}
                    className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-gray-600 text-xs font-bold rounded-xl cursor-pointer transition-all"
                  >
                    <X size={14} />
                    <span>Rechazar</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold shrink-0" title="Conexión en vivo con Supabase Cloud">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Nube en vivo</span>
            </div>

            <button
              onClick={() => fetchOrders(false)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-gray-600 hover:bg-slate-50 transition-colors cursor-pointer shrink-0"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin text-red-600' : ''} />
              <span>Refrescar</span>
            </button>
          </div>
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
                <th className="py-3.5 px-4">Técnico Asignado</th>
                <th className="py-3.5 px-4">Estado Operativo</th>
                <th className="py-3.5 px-4 text-right">Importe Liquidado</th>
                <th className="py-3.5 px-4 sm:px-6 text-right">Acciones de Edición Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
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

                      {/* Celda: Técnico Asignado (Selector Directo 1-Clic) */}
                      <td className="py-3.5 px-4">
                        <div className="min-w-[170px] space-y-1">
                          <select
                            value={ord.usuario_tecnico_id || ord.tecnico_asignado_id || ''}
                            onChange={async (e) => {
                              const techId = e.target.value;
                              const tech = technicians.find(t => String(t.id) === String(techId));
                              const techName = tech ? tech.nombre_completo : null;
                              try {
                                const updated = await OrdersService.assignTechnician(ord.id, techId || null, techName);
                                setOrders(prev => prev.map(item => item.id === ord.id ? updated : item));
                                showToast(tech ? `✓ Orden #${ord.numero_orden || ord.id} asignada a ${techName}` : 'Asignación removida');
                              } catch (err) {
                                showToast('Error al asignar técnico');
                              }
                            }}
                            className={`w-full py-1.5 px-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer focus:outline-none focus:ring-2 ${
                              ord.tecnico_nombre_manual
                                ? 'bg-emerald-50 text-emerald-950 border-emerald-300 focus:ring-emerald-500/20'
                                : 'bg-amber-50 text-amber-950 border-amber-300 focus:ring-amber-500/20 shadow-2xs'
                            }`}
                          >
                            <option value="">-- Sin Asignar --</option>
                            {technicians.map(t => (
                              <option key={t.id} value={t.id}>
                                👤 {t.nombre_completo}
                              </option>
                            ))}
                          </select>

                          {ord.solicitud_edicion_estado === 'PENDIENTE' && (
                            <div className="flex items-center justify-between bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-200 text-[10px]">
                              <span className="font-bold text-indigo-900 truncate max-w-[100px]">
                                Pide: {ord.solicitud_edicion_tecnico_nombre}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleApproveRequest(ord.id)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-2 py-0.5 rounded text-[9px] cursor-pointer shadow-xs"
                              >
                                Aprobar
                              </button>
                            </div>
                          )}
                        </div>
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

      {/* MODAL: DESIGNAR / ASIGNAR TÉCNICO DESDE GERENCIA */}
      {assignModalOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-red-50 text-[#E30613] rounded-xl">
                  <UserCheck size={18} />
                </span>
                <div>
                  <h3 className="font-black text-gray-900 text-sm">Designar Técnico Responsable</h3>
                  <p className="text-xs text-gray-500">Orden #{assignModalOrder.numero_orden || assignModalOrder.id}</p>
                </div>
              </div>
              <button
                onClick={() => setAssignModalOrder(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-gray-600">
                Seleccione el técnico que estará autorizado para diagnosticar, registrar fallas y cotizar repuestos para esta orden:
              </p>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider block">
                  Técnico Encargado:
                </label>
                <select
                  value={selectedTechnicianId}
                  onChange={(e) => setSelectedTechnicianId(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-[#E30613]"
                >
                  <option value="">-- Sin Asignar (Disponible para cualquier solicitud) --</option>
                  {technicians.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.nombre_completo} ({t.email})
                    </option>
                  ))}
                </select>
              </div>

              {selectedTechnicianId && (
                <div className="flex items-center gap-2 text-[11px] text-emerald-800 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 font-semibold">
                  <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                  <span>Este técnico tendrá permisos completos de edición en su mesa de trabajo.</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAssignModalOrder(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isAssigning}
                onClick={handleConfirmAssign}
                className="px-5 py-2.5 rounded-xl text-xs font-black bg-navy hover:bg-slate-800 text-white shadow-md cursor-pointer disabled:opacity-50 transition-all"
              >
                {isAssigning ? 'Guardando Asignación...' : 'Confirmar Asignación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
