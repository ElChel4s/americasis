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
  const [currentUser, setCurrentUser] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('america_user');
        if (cached) return JSON.parse(cached);
      } catch (e) {}
    }
    return null;
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'MINE' | 'PENDING' | 'DONE'
  const [requestingId, setRequestingId] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

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

  const handleRequestAssignment = async (ord) => {
    try {
      setRequestingId(ord.id);
      await OrdersService.solicitarAsignacion(ord.id, currentUser);
      await fetchOrders();
      showToast('Solicitud enviada a Recepción/Administración');
    } catch (err) {
      console.error('Error al solicitar asignación:', err);
      showToast('Error al enviar la solicitud.');
    } finally {
      setRequestingId(null);
    }
  };

  useEffect(() => {
    fetchOrders();

    fetch('/api/auth/me')
      .then(r => r.json())
      .then(j => {
        if (j.success && j.data) {
          setCurrentUser(j.data);
          try {
            localStorage.setItem('america_user', JSON.stringify(j.data));
          } catch (e) {}
        }
      })
      .catch(() => {});

    const handleOrdersUpdated = () => {
      fetchOrders();
    };

    window.addEventListener('america_orders_updated', handleOrdersUpdated);
    window.addEventListener('storage', handleOrdersUpdated);
    return () => {
      window.removeEventListener('america_orders_updated', handleOrdersUpdated);
      window.removeEventListener('storage', handleOrdersUpdated);
    };
  }, []);

  // Verificar si la orden está asignada al usuario actual
  const isOrderAssignedToMe = (order) => {
    if (!currentUser) return false;
    // Si la solicitud de asignación fue aprobada para este técnico
    if (order.solicitud_asignacion && order.solicitud_asignacion.estado === 'APROBADA' &&
        (String(order.solicitud_asignacion.tecnico_id) === String(currentUser.id) ||
         (order.solicitud_asignacion.tecnico_nombre && currentUser.nombre_completo &&
          currentUser.nombre_completo.toLowerCase() === order.solicitud_asignacion.tecnico_nombre.toLowerCase()))) {
      return true;
    }
    if (order.tecnico_asignado_id && String(order.tecnico_asignado_id) === String(currentUser.id)) return true;
    if (order.usuario_tecnico_id && String(order.usuario_tecnico_id) === String(currentUser.id)) return true;
    if (order.tecnicoAsignadoId && String(order.tecnicoAsignadoId) === String(currentUser.id)) return true;
    if (order.tecnico_nombre_manual && currentUser.nombre_completo &&
        (order.tecnico_nombre_manual.toLowerCase().includes(currentUser.nombre_completo.toLowerCase()) ||
         currentUser.nombre_completo.toLowerCase().includes(order.tecnico_nombre_manual.toLowerCase()))) return true;
    if (order.tecnicoNombre && currentUser.nombre_completo &&
        (order.tecnicoNombre.toLowerCase().includes(currentUser.nombre_completo.toLowerCase()) ||
         currentUser.nombre_completo.toLowerCase().includes(order.tecnicoNombre.toLowerCase()))) return true;
    return false;
  };

  // Contadores para las pestañas
  const counts = useMemo(() => {
    let mine = 0;
    let pending = 0;
    let done = 0;

    orders.forEach(o => {
      if (isOrderAssignedToMe(o)) mine++;
      if (o.estado === 'RECIBIDO' || o.estado === 'PENDIENTE_DIAGNOSTICO' || o.estado === 'EN_DIAGNOSTICO' || !o.estado) {
        pending++;
      } else {
        done++;
      }
    });

    return { all: orders.length, mine, pending, done };
  }, [orders, currentUser]);

  // Filtrado por pestaña y buscador
  const tabFilteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (activeTab === 'MINE') return isOrderAssignedToMe(o);
      if (activeTab === 'PENDING') {
        return o.estado === 'RECIBIDO' || o.estado === 'PENDIENTE_DIAGNOSTICO' || o.estado === 'EN_DIAGNOSTICO' || !o.estado;
      }
      if (activeTab === 'DONE') {
        return o.estado !== 'RECIBIDO' && o.estado !== 'PENDIENTE_DIAGNOSTICO' && o.estado !== 'EN_DIAGNOSTICO' && Boolean(o.estado);
      }
      return true; // 'ALL' muestra todas las notas
    });
  }, [orders, activeTab, currentUser]);

  // Filtrado por buscador
  const filteredOrders = useMemo(() => {
    if (!searchTerm.trim()) return tabFilteredOrders;
    const term = searchTerm.toLowerCase();
    return tabFilteredOrders.filter(o => {
      const matchClient = (o.razon_social || '').toLowerCase().includes(term);
      const matchOrden = (o.numero_orden || `OS-${o.id}`).toLowerCase().includes(term);
      const matchTecnico = (o.tecnico_nombre_manual || '').toLowerCase().includes(term);
      const matchSerie = (o.equipos || []).some(eq =>
        (eq.serie || eq.numero_serie || '').toLowerCase().includes(term) ||
        (eq.modelo || '').toLowerCase().includes(term)
      );
      return matchClient || matchOrden || matchSerie || matchTecnico;
    });
  }, [tabFilteredOrders, searchTerm]);

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
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 p-4 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-xl flex items-center gap-2.5 text-xs font-bold animate-in slide-in-from-top-3">
          <CheckCircle2 size={18} className="text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}

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
              <span className="text-[10px] font-bold text-gray-400 uppercase block">Total de Órdenes</span>
              <span className="text-xl font-black text-gray-900 leading-none">{counts.all}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-red-50 text-[#E30613] flex items-center justify-center font-bold">
              <Radio size={18} />
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-2xl flex items-center gap-3">
            <div className="text-right">
              <span className="text-[10px] font-bold text-gray-400 uppercase block">Mis Asignadas</span>
              <span className="text-xl font-black text-emerald-600 leading-none">{counts.mine}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Wrench size={18} />
            </div>
          </div>
        </div>
      </div>

      {/* Buscador Rápido y Pestañas de Vista */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-96">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por cliente, N° orden, técnico o serie..."
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

        {/* Pestañas de Filtrado de Notas */}
        <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setActiveTab('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'ALL'
                ? 'bg-navy text-white shadow-xs'
                : 'bg-slate-50 text-gray-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <span>Todas las Notas / Órdenes</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
              activeTab === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-200 text-gray-700'
            }`}>
              {counts.all}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('MINE')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'MINE'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-slate-50 text-gray-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <span>Mis Órdenes Asignadas</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
              activeTab === 'MINE' ? 'bg-white/20 text-white' : 'bg-slate-200 text-gray-700'
            }`}>
              {counts.mine}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('PENDING')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'PENDING'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-50 text-gray-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <span>Pendientes en Mesa</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
              activeTab === 'PENDING' ? 'bg-white/20 text-white' : 'bg-slate-200 text-gray-700'
            }`}>
              {counts.pending}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('DONE')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'DONE'
                ? 'bg-slate-700 text-white shadow-xs'
                : 'bg-slate-50 text-gray-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <span>Concluidas / Presupuestadas</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
              activeTab === 'DONE' ? 'bg-white/20 text-white' : 'bg-slate-200 text-gray-700'
            }`}>
              {counts.done}
            </span>
          </button>
        </div>
      </div>

      {/* Lista de Órdenes en Mesa Técnica */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-black text-gray-900">
              {activeTab === 'ALL' && 'Todas las Notas de Taller (Acceso Global)'}
              {activeTab === 'MINE' && 'Mis Órdenes Asignadas para Diagnosticar'}
              {activeTab === 'PENDING' && 'Órdenes Pendientes de Diagnóstico en Mesa'}
              {activeTab === 'DONE' && 'Historial de Órdenes Diagnosticadas / Presupuestadas'}
            </h2>
            <p className="text-xs text-gray-500">
              Todos los técnicos pueden consultar los expedientes. Para editar fallas y repuestos se requiere asignación o autorización de Recepción.
            </p>
          </div>
          <span className="text-xs font-black px-3 py-1 rounded-full bg-slate-100 text-gray-700">
            {filteredOrders.length} orden(es)
          </span>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="py-16 text-center text-gray-400 space-y-2">
            <CheckCircle2 size={36} className="text-emerald-500 mx-auto" />
            <h3 className="font-bold text-gray-700 text-sm">No hay órdenes para mostrar</h3>
            <p className="text-xs text-gray-400">No se encontraron expedientes con el filtro actual.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredOrders.map((ord) => {
              const equiposCount = ord.equipos?.length || 1;
              const tiempoEspera = getTiempoEspera(ord.createdAt);
              const assignedToMe = isOrderAssignedToMe(ord);
              const isAdmin = currentUser?.rol === 'ADMINISTRADOR';

              const sol = ord.solicitud_asignacion || (ord.solicitud_edicion_estado ? {
                estado: ord.solicitud_edicion_estado,
                tecnico_id: ord.solicitud_edicion_tecnico_id,
                tecnico_nombre: ord.solicitud_edicion_tecnico_nombre
              } : null);

              const isPending = sol?.estado === 'PENDIENTE';
              const isMyPending = isPending && (
                String(sol.tecnico_id) === String(currentUser?.id) ||
                (currentUser?.nombre_completo && sol.tecnico_nombre &&
                 currentUser.nombre_completo.toLowerCase() === sol.tecnico_nombre.toLowerCase())
              );
              const isOtherPending = isPending && !isMyPending;

              return (
                <div
                  key={ord.id}
                  className="p-5 sm:p-6 hover:bg-slate-50/70 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-black text-sm sm:text-base text-gray-900">
                        #{ord.numero_orden || ord.id}
                      </span>

                      {/* Estado operativo */}
                      <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded ${
                        ord.estado === 'EN_DIAGNOSTICO' ? 'bg-amber-100 text-amber-800' :
                        ord.estado === 'DIAGNOSTICADO' ? 'bg-purple-100 text-purple-800' :
                        ord.estado === 'COTIZADO' ? 'bg-blue-100 text-blue-800' :
                        ord.estado === 'ENTREGADO' ? 'bg-emerald-100 text-emerald-800' :
                        'bg-red-50 text-red-700 border border-red-200 font-bold'
                      }`}>
                        {ord.estado === 'EN_DIAGNOSTICO' ? 'En Mesa RF' :
                         ord.estado === 'DIAGNOSTICADO' ? 'Diagnosticado' :
                         ord.estado === 'COTIZADO' ? 'Cotizado' :
                         ord.estado === 'ENTREGADO' ? 'Entregado' : 'Pendiente Diagnóstico'}
                      </span>

                      {/* Badges de Asignación */}
                      {assignedToMe ? (
                        <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 shadow-xs">
                          <CheckCircle2 size={11} className="text-emerald-600" />
                          <span>Asignada a ti</span>
                        </span>
                      ) : isMyPending ? (
                        <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 animate-pulse">
                          <Clock size={11} className="text-amber-700" />
                          <span>Esperando Aprobación</span>
                        </span>
                      ) : isOtherPending ? (
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                          <Clock size={11} className="text-amber-600" />
                          <span>Solicitada por: {sol.tecnico_nombre}</span>
                        </span>
                      ) : ord.tecnico_nombre_manual ? (
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          Técnico: <strong className="text-gray-900">{ord.tecnico_nombre_manual}</strong>
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                          Disponible para Asignación
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm sm:text-base font-bold text-gray-900">
                      {ord.razon_social || 'Cliente Mostrador'}
                    </h3>

                    <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap pt-0.5">
                      <span className="flex items-center gap-1 font-semibold text-gray-700">
                        <Radio size={13} className="text-[#E30613]" />
                        <span>{equiposCount} equipo(s) en lote</span>
                      </span>

                      <span suppressHydrationWarning className="flex items-center gap-1 text-gray-500">
                        <Clock size={13} />
                        <span suppressHydrationWarning>{tiempoEspera}</span>
                      </span>

                      {ord.equipos?.[0]?.falla_declarada_cliente && (
                        <span className="text-gray-600 italic truncate max-w-xs">
                          Falla: &quot;{ord.equipos[0].falla_declarada_cliente}&quot;
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Botones Dinámicos de Acción */}
                  <div className="shrink-0 flex items-center justify-end gap-2 flex-wrap">
                    {/* Caso 1: Asignada a este técnico (o Admin) -> Botón verde destacado [ Diagnosticar Equipos ] */}
                    {(assignedToMe || isAdmin) ? (
                      <button
                        type="button"
                        id={`btn-diagnosticar-equipo-${ord.id}`}
                        onClick={() => router.push(`/tecnico/diagnostico/${ord.id}`)}
                        className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-black text-xs sm:text-sm rounded-xl shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        <Wrench size={16} />
                        <span>Diagnosticar Equipos</span>
                        <ArrowRight size={15} />
                      </button>
                    ) : isMyPending ? (
                      /* Caso 2: Solicitud enviada por el usuario actual -> Botón deshabilitado amarillo/ámbar con reloj/spinner */
                      <button
                        type="button"
                        disabled
                        id={`btn-esperando-aprobacion-${ord.id}`}
                        className="w-full sm:w-auto px-4 py-2.5 bg-amber-100 border border-amber-300 text-amber-900 font-bold text-xs sm:text-sm rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-not-allowed opacity-95"
                      >
                        <RefreshCw size={15} className="animate-spin text-amber-700" />
                        <span>Solicitud Enviada - Esperando Aprobación</span>
                      </button>
                    ) : isOtherPending ? (
                      /* Caso 3: Solicitud de otro técnico */
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled
                          className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 border border-slate-300 text-slate-500 font-bold text-xs sm:text-sm rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-not-allowed"
                        >
                          <Clock size={15} />
                          <span>Solicitada por {sol?.tecnico_nombre || 'otro técnico'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => router.push(`/tecnico/diagnostico/${ord.id}`)}
                          className="p-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-gray-600 rounded-xl transition-all cursor-pointer"
                          title="Ver nota en modo consulta"
                        >
                          <Eye size={16} />
                        </button>
                      </div>
                    ) : (
                      /* Caso 4: solicitud_asignacion == null -> Botón azul [ Solicitar Asignación ] */
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          id={`btn-solicitar-asignacion-${ord.id}`}
                          disabled={requestingId === ord.id}
                          onClick={() => handleRequestAssignment(ord)}
                          className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-black text-xs sm:text-sm rounded-xl shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
                        >
                          {requestingId === ord.id ? (
                            <>
                              <RefreshCw size={15} className="animate-spin" />
                              <span>Enviando...</span>
                            </>
                          ) : (
                            <>
                              <Wrench size={15} />
                              <span>Solicitar Asignación</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => router.push(`/tecnico/diagnostico/${ord.id}`)}
                          className="p-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-gray-600 rounded-xl transition-all cursor-pointer"
                          title="Ver nota de ingreso"
                        >
                          <Eye size={16} />
                        </button>
                      </div>
                    )}
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
