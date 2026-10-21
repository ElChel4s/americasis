"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Bell, Wrench, Check, X, Clock, Radio, User, ExternalLink, CheckCircle2 } from 'lucide-react';
import { OrdersService } from '@/lib/services/orders.service';
import Link from 'next/link';

export default function NotificationsBell({ userRole = '', onActionToast = null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [orders, setOrders] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const popoverRef = useRef(null);

  const fetchOrders = async () => {
    try {
      const list = await OrdersService.getOrders();
      setOrders(Array.isArray(list) ? list : []);
    } catch (e) {
      console.warn('Error loading orders in NotificationsBell:', e);
    }
  };

  useEffect(() => {
    fetchOrders();

    const handleUpdated = () => {
      fetchOrders();
    };

    window.addEventListener('america_orders_updated', handleUpdated);
    window.addEventListener('storage', handleUpdated);
    const interval = setInterval(fetchOrders, 8000);

    return () => {
      window.removeEventListener('america_orders_updated', handleUpdated);
      window.removeEventListener('storage', handleUpdated);
      clearInterval(interval);
    };
  }, []);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Solo visible para RECEPCION y ADMINISTRADOR
  const [effectiveRole, setEffectiveRole] = useState(userRole);

  useEffect(() => {
    if (userRole) {
      setEffectiveRole(userRole);
      return;
    }
    if (typeof window !== 'undefined') {
      try {
        const storedRole = localStorage.getItem('america_user_role');
        if (storedRole) setEffectiveRole(storedRole);
        else {
          const cachedUser = localStorage.getItem('america_user');
          if (cachedUser) setEffectiveRole(JSON.parse(cachedUser).rol);
        }
      } catch (e) {}
    }
  }, [userRole]);

  const normalizedRole = (effectiveRole || userRole || '').toUpperCase();
  const isAllowed = normalizedRole === 'RECEPCION' || normalizedRole === 'ADMINISTRADOR' || normalizedRole === 'ADMIN';

  // Filtrar órdenes con solicitud de asignación PENDIENTE
  const pendingRequests = orders.filter(o => {
    const sol = o.solicitud_asignacion;
    if (sol && sol.estado === 'PENDIENTE') return true;
    if (o.solicitud_edicion_estado === 'PENDIENTE') return true;
    return false;
  });

  const pendingCount = pendingRequests.length;

  const handleApprove = async (e, order) => {
    e.stopPropagation();
    try {
      setIsProcessing(true);
      const techName = order.solicitud_asignacion?.tecnico_nombre || order.solicitud_edicion_tecnico_nombre || 'Técnico Especialista';
      await OrdersService.aprobarAsignacion(order.id);
      await fetchOrders();
      if (onActionToast) {
        onActionToast(`Orden asignada exitosamente a ${techName}`);
      }
    } catch (err) {
      console.error('Error aprobando asignación:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (e, order) => {
    e.stopPropagation();
    try {
      setIsProcessing(true);
      await OrdersService.rechazarAsignacion(order.id);
      await fetchOrders();
      if (onActionToast) {
        onActionToast(`Solicitud rechazada para la orden #${order.numero_orden || order.id}`);
      }
    } catch (err) {
      console.error('Error rechazando asignación:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isAllowed) return null;

  return (
    <div className="relative inline-block" ref={popoverRef}>
      {/* Botón de la Campana */}
      <button
        type="button"
        id="btn-notifications-bell"
        onClick={() => setIsOpen(prev => !prev)}
        className="relative p-2 rounded-xl text-gray-600 hover:text-navy hover:bg-slate-100 transition-colors cursor-pointer border border-transparent hover:border-slate-200"
        title="Solicitudes de Asignación de Técnicos"
        aria-label="Campana de notificaciones"
      >
        <Bell size={20} className={pendingCount > 0 ? 'text-[#E30613]' : 'text-gray-500'} />
        {pendingCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-[#E30613] text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center animate-pulse shadow-md border-2 border-white">
            {pendingCount > 9 ? '9+' : pendingCount}
          </span>
        )}
      </button>

      {/* Popover / Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 origin-top-right">
          {/* Header del Popover */}
          <div className="p-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-red-100 text-[#E30613] rounded-lg">
                <Bell size={15} />
              </span>
              <div>
                <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                  Solicitudes de Asignación
                </h4>
                <p className="text-[10px] text-gray-500 font-medium">
                  {pendingCount === 1 ? '1 solicitud pendiente' : `${pendingCount} solicitudes pendientes`}
                </p>
              </div>
            </div>
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-black">
                {pendingCount} Pendiente{pendingCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Lista de Solicitudes */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
            {pendingRequests.length === 0 ? (
              <div className="p-6 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                  <CheckCircle2 size={20} />
                </div>
                <p className="text-xs font-bold text-gray-700">Sin solicitudes pendientes</p>
                <p className="text-[11px] text-gray-400">
                  Todas las asignaciones técnicas están al día.
                </p>
              </div>
            ) : (
              pendingRequests.map((ord) => {
                const sol = ord.solicitud_asignacion || {
                  tecnico_nombre: ord.solicitud_edicion_tecnico_nombre || 'Técnico Especialista',
                  fecha_solicitud: ord.solicitud_edicion_fecha || ord.updatedAt
                };
                const handyCount = ord.equipos?.length || 1;

                return (
                  <div key={ord.id} className="p-3.5 hover:bg-slate-50/80 transition-colors space-y-2.5">
                    {/* Datos del Técnico y Orden */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-black text-gray-900">
                            {sol.tecnico_nombre}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded-md font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            Técnico
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-700 leading-snug">
                          El técnico <strong className="text-gray-900 font-bold">{sol.tecnico_nombre}</strong> solicita la orden <strong className="text-navy font-mono font-bold">#{ord.numero_orden || ord.id}</strong> ({ord.razon_social || 'Cliente'} - {handyCount} {handyCount === 1 ? 'radio' : 'radios'})
                        </p>
                        <div className="flex items-center gap-3 text-[10px] text-gray-400 pt-0.5">
                          <span className="flex items-center gap-1">
                            <Radio size={11} className="text-[#E30613]" />
                            <span>{handyCount} {handyCount === 1 ? 'radio' : 'radios'}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={11} />
                            <span>{sol.fecha_solicitud ? new Date(sol.fecha_solicitud).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }) : 'Reciente'}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Botones de Acción Inmediata */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={(e) => handleApprove(e, ord)}
                        className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                      >
                        <Check size={14} />
                        <span>Aprobar Asignación</span>
                      </button>

                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={(e) => handleReject(e, ord)}
                        className="py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-red-50 hover:text-red-600 text-gray-600 font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer border border-slate-200 disabled:opacity-50"
                      >
                        <X size={14} />
                        <span>Rechazar</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
