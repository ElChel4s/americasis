"use client";

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Radio, 
  FileText, 
  FileDown, 
  Clock, 
  Calendar, 
  User, 
  Building2, 
  Phone, 
  Mail, 
  Layers, 
  Cpu, 
  Package, 
  Wrench, 
  CheckCircle2, 
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Printer
} from 'lucide-react';

const ESTADO_CONFIG = {
  BORRADOR: { label: 'Borrador', bg: 'bg-slate-100 text-slate-700 border-slate-200' },
  RECIBIDO: { label: 'Recibido', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
  EN_DIAGNOSTICO: { label: 'En Diagnóstico', bg: 'bg-amber-50 text-amber-800 border-amber-200' },
  ESPERANDO_REPUESTO: { label: 'Esperando Repuesto', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  EN_REPARACION: { label: 'En Reparación', bg: 'bg-orange-50 text-orange-700 border-orange-200' },
  LISTO: { label: 'Listo para Entrega', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  ENTREGADO: { label: 'Entregado', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
  RECHAZADO: { label: 'Rechazado', bg: 'bg-red-50 text-red-700 border-red-200' }
};

export default function OrderDetailDrawer({
  order,
  isOpen,
  onClose,
  onPrintReport,
  onSelectSerial,
  onContinueInWizard
}) {
  const [orderDetails, setOrderDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [downloadingDocx, setDownloadingDocx] = useState(false);
  const [activeEquipoTab, setActiveEquipoTab] = useState(0);

  useEffect(() => {
    if (!order?.id || !isOpen) {
      setOrderDetails(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    fetch(`/api/orders/${order.id}`)
      .then(res => res.json())
      .then(json => {
        if (isMounted) {
          if (json.success && json.data) {
            setOrderDetails(json.data);
          } else {
            setOrderDetails(order); // fallback al prop
          }
        }
      })
      .catch(err => {
        console.warn('Error fetching order details:', err);
        if (isMounted) setOrderDetails(order);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [order, isOpen]);

  if (!isOpen) return null;

  const currentOrder = orderDetails || order;
  const equipos = currentOrder?.equipos || [];
  const activeEquipo = equipos[activeEquipoTab] || equipos[0] || {};
  const estadoInfo = ESTADO_CONFIG[currentOrder?.estado] || ESTADO_CONFIG.EN_DIAGNOSTICO;
  const numeroOrden = currentOrder?.numero_orden || `OS-${String(currentOrder?.id).padStart(5, '0')}`;

  const handleDownloadDocx = async () => {
    if (!currentOrder?.id) return;
    try {
      setDownloadingDocx(true);
      const res = await fetch(`/api/reports/docx?ordenId=${currentOrder.id}`);
      if (!res.ok) throw new Error('Error al descargar');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Informe_Tecnico_${numeroOrden}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('No se pudo generar el archivo Word.');
    } finally {
      setDownloadingDocx(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-fadeIn">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-navy/40 backdrop-blur-xs transition-opacity"
        onClick={onClose} 
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-2xl bg-white shadow-2xl border-l border-slate-200 flex flex-col animate-slideLeft">
          
          {/* CABECERA DEL DRAWER */}
          <div className="bg-slate-900 text-white p-5 sm:p-6 flex items-start justify-between gap-4 border-b border-slate-800 shrink-0">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xl font-black text-white">
                  #{numeroOrden}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${estadoInfo.bg}`}>
                  {estadoInfo.label}
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-200 uppercase tracking-tight">
                {currentOrder?.razon_social || 'Consumidor Final'}
              </h3>
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Calendar size={13} />
                  {currentOrder?.creado_en ? new Date(currentOrder.creado_en).toLocaleDateString('es-BO') : 'N/D'}
                </span>
                <span>•</span>
                <span>Atendido por: {currentOrder?.recepcionista_nombre_manual || 'Personal Taller'}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* CONTENIDO SCROLLABLE */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
            {isLoading ? (
              <div className="space-y-4 py-8 animate-pulse">
                <div className="h-24 bg-slate-100 rounded-xl" />
                <div className="h-48 bg-slate-100 rounded-xl" />
                <div className="h-32 bg-slate-100 rounded-xl" />
              </div>
            ) : (
              <>
                {/* 1. INFORMACIÓN DEL CLIENTE */}
                <div className="card bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Building2 size={13} />
                    <span>Datos de Facturación y Contacto</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">NIT / CI:</span>
                      <span className="font-mono font-bold text-slate-700">{currentOrder?.nit_ci || 'Sin NIT registrado'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Contacto:</span>
                      <span className="font-bold text-slate-700">{currentOrder?.persona_contacto || 'No especificado'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Teléfono:</span>
                      <span className="text-slate-700">{currentOrder?.cliente_telefono || 'No registrado'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Correo:</span>
                      <span className="text-slate-700">{currentOrder?.cliente_email || 'No registrado'}</span>
                    </div>
                  </div>
                </div>

                {/* 2. EQUIPOS EN LA ORDEN (CON PESTAÑAS) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-navy flex items-center gap-1.5">
                      <Layers size={14} className="text-red-600" />
                      <span>Radios en Esta Orden ({equipos.length})</span>
                    </h4>
                  </div>

                  {/* Selector de equipo */}
                  {equipos.length > 1 && (
                    <div className="flex gap-1.5 overflow-x-auto pb-1">
                      {equipos.map((eq, idx) => (
                        <button
                          key={eq.id || idx}
                          type="button"
                          onClick={() => setActiveEquipoTab(idx)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                            activeEquipoTab === idx 
                              ? 'bg-navy text-white shadow-xs' 
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          Radio #{idx + 1}: {eq.modelo || 'Equipo'}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Ficha técnica del equipo activo */}
                  <div className="card bg-white border border-slate-200/90 shadow-2xs p-4 rounded-xl space-y-4">
                    <div className="flex items-start justify-between gap-2 flex-wrap pb-3 border-b border-slate-100">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Modelo & Frecuencia
                        </span>
                        <h4 className="text-base font-extrabold text-navy">
                          {activeEquipo.marca || 'Motorola'} {activeEquipo.modelo || 'DEP450'}
                        </h4>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Número de Serie
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (activeEquipo.numero_serie) {
                              onSelectSerial(activeEquipo.numero_serie);
                            }
                          }}
                          className="font-mono text-sm font-black text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2 py-0.5 rounded border border-red-200 transition-colors inline-flex items-center gap-1"
                          title="Consultar cronología vital de este radio"
                        >
                          <span>{activeEquipo.numero_serie || 'SIN SERIE'}</span>
                          <ExternalLink size={12} />
                        </button>
                      </div>
                    </div>

                    {/* Falla declarada */}
                    {activeEquipo.falla_declarada_cliente && (
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">
                          Falla Declarada por el Cliente:
                        </span>
                        <p className="text-slate-700 font-medium">
                          {activeEquipo.falla_declarada_cliente}
                        </p>
                      </div>
                    )}

                    {/* Diagnóstico de laboratorio */}
                    {activeEquipo.texto_diagnostico && (
                      <div className="bg-blue-50/60 p-3 rounded-lg border border-blue-100 text-xs">
                        <span className="text-[10px] font-bold uppercase text-blue-700 block mb-0.5">
                          Diagnóstico Técnico de Laboratorio:
                        </span>
                        <p className="text-blue-950 font-medium">
                          {activeEquipo.texto_diagnostico}
                        </p>
                      </div>
                    )}

                    {/* Fallas checklist */}
                    {activeEquipo.fallas && activeEquipo.fallas.length > 0 && (
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1.5">
                          Circuitos Diagnosticados:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {activeEquipo.fallas.map((f, i) => (
                            <span key={i} className="text-[11px] font-bold px-2 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                              <Cpu size={12} className="text-red-500" />
                              <span>{f.categoria}: {f.descripcion || f.codigo_falla}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Repuestos cotizados / cambiados */}
                    {activeEquipo.repuestos && activeEquipo.repuestos.length > 0 && (
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1.5">
                          Repuestos Cotizados / Reemplazados:
                        </span>
                        <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden text-xs">
                          {activeEquipo.repuestos.map((r, i) => (
                            <div key={i} className="p-2.5 flex items-center justify-between gap-2 bg-slate-50/50">
                              <div>
                                <span className="font-bold text-slate-700 block">
                                  {r.cantidad}x {r.descripcion}
                                </span>
                                {r.codigo_parte && (
                                  <span className="text-[10px] font-mono text-slate-400">P/N: {r.codigo_parte}</span>
                                )}
                              </div>
                              <span className="font-mono font-bold text-navy">
                                {currentOrder?.moneda === 'USD' ? '$' : 'Bs.'} {(parseFloat(r.precio) * (parseInt(r.cantidad, 10) || 1)).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                </div>

                {/* 3. RESUMEN FINANCIERO */}
                <div className="card bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2.5">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
                    Resumen Financiero del Servicio
                  </h4>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal 1 (Mano de obra y calibración RF):</span>
                      <span className="font-mono font-bold">
                        {currentOrder?.moneda === 'USD' ? '$' : 'Bs.'} {parseFloat(currentOrder?.monto_subtotal_servicio || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal 2 (Repuestos y accesorios sustituidos):</span>
                      <span className="font-mono font-bold">
                        {currentOrder?.moneda === 'USD' ? '$' : 'Bs.'} {parseFloat(currentOrder?.monto_subtotal_accesorios || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-slate-200 flex justify-between text-sm sm:text-base font-extrabold text-navy">
                      <span>Total General:</span>
                      <span className="font-mono text-red-600">
                        {currentOrder?.moneda === 'USD' ? '$' : 'Bs.'} {parseFloat(currentOrder?.sumatoria_total || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* PIE DE ACCIONES DEL DRAWER */}
          <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => onContinueInWizard(currentOrder)}
              className="btn-primary py-2.5 px-4 text-xs font-bold flex items-center gap-1.5"
            >
              <Wrench size={14} />
              <span>Abrir en Taller</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onPrintReport(currentOrder)}
                className="py-2.5 px-3 rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-100 text-xs font-bold flex items-center gap-1.5 transition-colors"
                title="Imprimir informe en A4 oficial"
              >
                <Printer size={14} />
                <span>Imprimir PDF</span>
              </button>

              <button
                type="button"
                disabled={downloadingDocx}
                onClick={handleDownloadDocx}
                className="py-2.5 px-3 rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-100 text-xs font-bold flex items-center gap-1.5 transition-colors"
                title="Descargar documento Word editable"
              >
                <FileDown size={14} className={downloadingDocx ? 'animate-bounce text-blue-600' : ''} />
                <span>Word (.docx)</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
