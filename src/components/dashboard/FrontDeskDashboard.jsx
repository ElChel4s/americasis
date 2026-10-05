"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Store, Plus, Search, Clock, Wrench, CheckCircle2,
  Printer, FileDown, Eye, AlertCircle, Building, Radio, ArrowRight,
  PackageCheck, Check, ChevronRight, RefreshCw, DollarSign, UserCheck,
  Send, ExternalLink, X, ShieldAlert, Sparkles
} from 'lucide-react';
import { OrdersService } from '@/lib/services/orders.service';
import { formatCurrency, normalizeCurrency } from '@/lib/utils/currencyFormat';
import { generateDocxBlob } from '@/lib/utils/docxExport';

export default function FrontDeskDashboard() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Modales
  const [viewingProgressOrder, setViewingProgressOrder] = useState(null);
  const [deliveryModalOrder, setDeliveryModalOrder] = useState(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await OrdersService.getOrders();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Error al cargar órdenes de mostrador:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  // 1. Filtrado de órdenes por columna del ciclo operativo
  // Columna 1: En Taller (RECIBIDO o EN_DIAGNOSTICO)
  const ordersEnTaller = useMemo(() => {
    return orders.filter(o => o.estado === 'RECIBIDO' || o.estado === 'EN_DIAGNOSTICO');
  }, [orders]);

  // Columna 2: Por Cotizar (DIAGNOSTICADO)
  const ordersPorCotizar = useMemo(() => {
    return orders.filter(o => o.estado === 'DIAGNOSTICADO');
  }, [orders]);

  // Columna 3: Listas para Entrega (COTIZADO)
  const ordersListasEntrega = useMemo(() => {
    return orders.filter(o => o.estado === 'COTIZADO');
  }, [orders]);

  // Búsqueda en tiempo real
  const filteredSearch = useMemo(() => {
    if (!searchTerm.trim()) return null;
    const term = searchTerm.toLowerCase();
    return orders.filter(o => {
      const matchClient = (o.razon_social || '').toLowerCase().includes(term);
      const matchOrden = (o.numero_orden || `OS-${o.id}`).toLowerCase().includes(term);
      const matchSerie = (o.equipos || []).some(eq =>
        (eq.serie || eq.numero_serie || '').toLowerCase().includes(term) ||
        (eq.modelo || '').toLowerCase().includes(term)
      );
      return matchClient || matchOrden || matchSerie;
    });
  }, [orders, searchTerm]);

  // Acción: Confirmar Entrega
  const handleConfirmDelivery = async (orderId) => {
    await OrdersService.deliverOrder(orderId);
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, estado: 'ENTREGADO', estado_global: 'ENTREGADO' } : o));
    setDeliveryModalOrder(null);
    showToast(`Orden #${orderId} entregada y cobrada con éxito.`);
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

      {/* Cabecera Principal de Mostrador / Recepción */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 bg-red-50 text-[#E30613] rounded-2xl shadow-sm">
              <Store size={22} />
            </span>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#E30613]">
                Atención al Cliente & Mostrador de Despacho
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight leading-tight">
                Tablero Operativo de Mostrador
              </h1>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-2 max-w-2xl leading-relaxed">
            Recepción de handies, seguimiento de avances de laboratorio y emisión de presupuestos oficiales.
          </p>
        </div>

        {/* Botón Superior Destacado */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => router.push('/recepcion/nueva-orden')}
            id="btn-nueva-orden-recepcion"
            className="flex items-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-sm rounded-2xl shadow-lg shadow-red-600/25 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Plus size={18} />
            <span>+ Nueva Orden de Servicio</span>
          </button>
        </div>
      </div>

      {/* Buscador Rápido de Estado en Mostrador */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por cliente (ej. Minera), N° orden (#OS-80412) o número de serie..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-[#E30613] focus:ring-4 focus:ring-red-500/10 transition-all"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Resultados de Búsqueda si hay término ingresado */}
      {filteredSearch && (
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
          <h3 className="font-bold text-xs uppercase tracking-wider text-gray-500">
            Resultados de búsqueda ({filteredSearch.length})
          </h3>
          {filteredSearch.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">No se encontraron coincidencias.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredSearch.map(o => (
                <div key={o.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-mono font-bold text-gray-900">#{o.numero_orden || o.id}</span>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-white border border-slate-200">
                      {o.estado}
                    </span>
                  </div>
                  <p className="font-bold text-xs text-gray-800 truncate">{o.razon_social}</p>
                  <div className="pt-2 flex justify-end">
                    {o.estado === 'DIAGNOSTICADO' ? (
                      <button
                        onClick={() => router.push(`/recepcion/orden/${o.id}/presupuesto`)}
                        className="text-xs font-bold text-red-600 hover:underline"
                      >
                        Fijar Costos &rarr;
                      </button>
                    ) : (
                      <button
                        onClick={() => setViewingProgressOrder(o)}
                        className="text-xs font-bold text-gray-600 hover:underline"
                      >
                        Ver Detalle &rarr;
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* LAS 3 COLUMNAS DEL FLUJO DE RECEPCIÓN */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUMNA 1: EN TALLER (RECIBIDO / EN_DIAGNOSTICO) */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5 space-y-4 flex flex-col h-full">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Wrench size={16} />
              </span>
              <div>
                <h2 className="font-black text-gray-900 text-sm sm:text-base">1. En Taller</h2>
                <p className="text-[11px] text-gray-400">Revisión técnica en mesa</p>
              </div>
            </div>
            <span className="text-xs font-black px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">
              {ordersEnTaller.length}
            </span>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px] pr-1">
            {ordersEnTaller.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-xs">
                No hay órdenes pendientes en mesa técnica.
              </div>
            ) : (
              ordersEnTaller.map((o) => (
                <div
                  key={o.id}
                  className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/60 hover:bg-white hover:border-slate-300 transition-all space-y-2.5"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-mono font-black text-gray-900 text-xs">
                      #{o.numero_orden || o.id}
                    </span>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                      o.estado === 'EN_DIAGNOSTICO' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-gray-700'
                    }`}>
                      {o.estado === 'EN_DIAGNOSTICO' ? 'En Mesa RF' : 'Recibido'}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-gray-800 text-xs truncate">
                      {o.razon_social || 'Cliente Mostrador'}
                    </h3>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {o.equipos?.length || 1} handy(s) en revisión
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                    <span className="text-[10px] text-gray-400 flex items-center gap-1">
                      <Clock size={11} />
                      {new Date(o.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>

                    <button
                      type="button"
                      onClick={() => setViewingProgressOrder(o)}
                      className="px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-gray-700 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Eye size={13} />
                      <span>Ver Avance</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* COLUMNA 2: POR COTIZAR (DIAGNOSTICADO) */}
        <div className="bg-white rounded-3xl border border-red-200/80 shadow-md p-5 space-y-4 flex flex-col h-full ring-2 ring-red-500/10">
          <div className="flex items-center justify-between pb-3 border-b border-red-100">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-red-50 text-[#E30613] flex items-center justify-center font-bold">
                <Sparkles size={16} />
              </span>
              <div>
                <h2 className="font-black text-gray-900 text-sm sm:text-base">2. Por Cotizar</h2>
                <p className="text-[11px] text-red-600 font-semibold">Técnico completó diagnóstico</p>
              </div>
            </div>
            <span className="text-xs font-black px-2.5 py-1 rounded-full bg-red-600 text-white">
              {ordersPorCotizar.length}
            </span>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px] pr-1">
            {ordersPorCotizar.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-xs">
                No hay órdenes esperando presupuesto en este momento.
              </div>
            ) : (
              ordersPorCotizar.map((o) => (
                <div
                  key={o.id}
                  className="p-4 rounded-2xl border border-red-200 bg-red-50/30 hover:bg-white hover:border-red-300 transition-all space-y-3 shadow-xs"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-mono font-black text-gray-900 text-xs">
                      #{o.numero_orden || o.id}
                    </span>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      Diagnóstico Listo
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-gray-900 text-xs truncate">
                      {o.razon_social || 'Cliente Mostrador'}
                    </h3>
                    <p className="text-[11px] text-gray-600 mt-0.5">
                      {o.equipos?.length || 1} equipo(s) con fallas dictaminadas
                    </p>
                  </div>

                  {/* Botón Directo Exigido: Fijar Costos y Generar Informe */}
                  <button
                    type="button"
                    onClick={() => router.push(`/recepcion/orden/${o.id}/presupuesto`)}
                    className="w-full py-2.5 px-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-xs rounded-xl shadow-md shadow-red-600/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span>Fijar Costos y Generar Informe</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* COLUMNA 3: LISTAS PARA ENTREGA (COTIZADO) */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5 space-y-4 flex flex-col h-full">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <PackageCheck size={16} />
              </span>
              <div>
                <h2 className="font-black text-gray-900 text-sm sm:text-base">3. Listas para Entrega</h2>
                <p className="text-[11px] text-gray-400">Presupuesto listo / Por entregar</p>
              </div>
            </div>
            <span className="text-xs font-black px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
              {ordersListasEntrega.length}
            </span>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px] pr-1">
            {ordersListasEntrega.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-xs">
                No hay órdenes pendientes de cobro y despacho.
              </div>
            ) : (
              ordersListasEntrega.map((o) => (
                <div
                  key={o.id}
                  className="p-4 rounded-2xl border border-slate-200/90 bg-emerald-50/20 hover:bg-white hover:border-emerald-300 transition-all space-y-3"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-mono font-black text-gray-900 text-xs">
                      #{o.numero_orden || o.id}
                    </span>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-600 text-white">
                      Cotizado
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-gray-900 text-xs truncate">
                      {o.razon_social || 'Cliente Mostrador'}
                    </h3>
                    <p className="text-xs font-mono font-black text-emerald-700 mt-1">
                      Total: {formatCurrency(o.sumatoria_total || 0, o.moneda || 'BOB')}
                    </p>
                  </div>

                  {/* Botón Directo: Ver Documentos / Entregar */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setDeliveryModalOrder(o)}
                      className="w-full py-2 px-3 bg-navy hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <UserCheck size={14} className="text-emerald-400" />
                      <span>Ver Documentos / Entregar</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* MODAL 1: VER AVANCE (MODO LECTURA PARA RECEPCIÓN) */}
      {viewingProgressOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-2xl w-full shadow-2xl border border-slate-200 max-h-[85vh] overflow-y-auto space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Wrench size={18} className="text-[#E30613]" />
                <h3 className="font-black text-gray-900 text-base">
                  Avance Técnico #{viewingProgressOrder.numero_orden || viewingProgressOrder.id}
                </h3>
              </div>
              <button onClick={() => setViewingProgressOrder(null)} className="p-1 rounded-lg text-gray-400 hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>

            <div>
              <p className="text-xs text-gray-500">Cliente / Empresa:</p>
              <p className="font-bold text-sm text-gray-900">{viewingProgressOrder.razon_social}</p>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600">Equipos en Revisión:</h4>
              {(viewingProgressOrder.equipos || []).map((eq, i) => (
                <div key={eq.id || i} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1">
                  <div className="flex justify-between font-bold text-gray-900">
                    <span>{eq.marca} {eq.modelo}</span>
                    <span className="font-mono text-gray-500">S/N: {eq.serie || eq.numero_serie || 'S/N'}</span>
                  </div>
                  <p className="text-gray-600">
                    <strong>Falla reportada:</strong> {eq.falla_declarada_cliente || 'Revisión general'}
                  </p>
                  {eq.texto_diagnostico && (
                    <p className="text-gray-800 bg-white p-2 rounded-xl border border-slate-200 mt-1">
                      <strong>Diagnóstico técnico:</strong> {eq.texto_diagnostico}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setViewingProgressOrder(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-gray-700 font-bold text-xs rounded-xl"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: VER DOCUMENTOS Y CONFIRMAR ENTREGA */}
      {deliveryModalOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <PackageCheck size={18} className="text-emerald-600" />
                <h3 className="font-black text-gray-900 text-base">
                  Entrega de Equipos #{deliveryModalOrder.numero_orden || deliveryModalOrder.id}
                </h3>
              </div>
              <button onClick={() => setDeliveryModalOrder(null)} className="p-1 rounded-lg text-gray-400 hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1.5 text-xs">
              <p><strong>Cliente:</strong> {deliveryModalOrder.razon_social}</p>
              <p><strong>Total Liquidación:</strong> <span className="font-mono font-bold text-emerald-700">{formatCurrency(deliveryModalOrder.sumatoria_total || 0, deliveryModalOrder.moneda)}</span></p>
              <p><strong>Radios listos:</strong> {deliveryModalOrder.equipos?.length || 1} equipo(s)</p>
            </div>

            {/* Opciones Documentales */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-gray-600 uppercase">Documentos Oficiales:</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => router.push(`/recepcion/orden/${deliveryModalOrder.id}/presupuesto?print=1`)}
                  className="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 font-bold text-xs text-gray-800 transition-all cursor-pointer"
                >
                  <Printer size={15} />
                  <span>Imprimir Informe</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    const blob = await generateDocxBlob(deliveryModalOrder);
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `Informe_Tecnico_${deliveryModalOrder.numero_orden}_${deliveryModalOrder.moneda}.docx`;
                    a.click();
                  }}
                  className="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 font-bold text-xs text-gray-800 transition-all cursor-pointer"
                >
                  <FileDown size={15} className="text-blue-600" />
                  <span>Descargar Word</span>
                </button>
              </div>
            </div>

            {/* Botón Confirmar Despacho y Cobro */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setDeliveryModalOrder(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-500 hover:bg-slate-100"
              >
                Volver
              </button>

              <button
                type="button"
                onClick={() => handleConfirmDelivery(deliveryModalOrder.id)}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all"
              >
                <Check size={16} />
                <span>Confirmar Entrega y Cobro</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
