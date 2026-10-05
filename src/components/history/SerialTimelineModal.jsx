"use client";

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Radio, 
  ShieldCheck, 
  ShieldAlert, 
  Clock, 
  Wrench, 
  CheckCircle2, 
  AlertTriangle, 
  Calendar, 
  User, 
  Building2, 
  Layers, 
  ExternalLink,
  Copy,
  Check,
  Cpu,
  Package
} from 'lucide-react';

export default function SerialTimelineModal({
  serial,
  onClose,
  onOpenOrder
}) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!serial) return;

    let isMounted = true;
    setIsLoading(true);

    fetch(`/api/search/serial/${encodeURIComponent(serial)}`)
      .then(res => res.json())
      .then(json => {
        if (isMounted) {
          if (json.success && json.data) {
            setData(json.data);
          } else {
            setData(null);
          }
        }
      })
      .catch(err => {
        console.error('Error fetching serial timeline:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [serial]);

  const handleCopySerial = () => {
    if (!serial) return;
    navigator.clipboard.writeText(serial);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!serial) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-navy/60 backdrop-blur-xs animate-fadeIn">
      <div 
        className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* CABECERA DEL MODAL */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 flex items-start justify-between gap-4 border-b border-slate-800">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-widest bg-red-600 text-white px-2 py-0.5 rounded">
                Hoja de Vida de Equipo
              </span>
              <button
                type="button"
                onClick={handleCopySerial}
                className="font-mono text-base sm:text-lg font-black tracking-wider text-slate-100 hover:text-white flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-0.5 rounded-lg border border-slate-700 transition-colors"
                title="Copiar número de serie"
              >
                <span>{serial}</span>
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={13} className="text-slate-400" />}
              </button>
            </div>

            <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-300 font-medium">
              <span>{data?.marca || 'Motorola'} <strong>{data?.modelo || 'Radio'}</strong></span>
              <span className="text-slate-600">•</span>
              <span className="bg-slate-800 px-2 py-0.5 rounded text-[11px] font-bold text-slate-200">
                Banda {data?.banda || 'VHF'}
              </span>
              <span className="text-slate-600">•</span>
              <span className="truncate max-w-[200px]" title={data?.clienteActual}>
                {data?.clienteActual || 'Cliente Taller'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors shrink-0"
            title="Cerrar modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* CONTENIDO SCROLLABLE */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          {isLoading ? (
            <div className="space-y-4 py-8">
              <div className="h-20 bg-slate-100 rounded-xl animate-pulse" />
              <div className="space-y-3">
                <div className="h-4 bg-slate-200 rounded w-1/3 animate-pulse" />
                <div className="h-16 bg-slate-100 rounded-xl animate-pulse" />
                <div className="h-16 bg-slate-100 rounded-xl animate-pulse" />
              </div>
            </div>
          ) : (
            <>
              {/* 1. BANNER DE ALERTA DE GARANTÍA ACTIVA */}
              {data?.garantia?.enGarantia ? (
                <div className="card bg-emerald-50/80 border-2 border-emerald-300 p-4 rounded-xl flex items-start gap-3 text-emerald-950">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <ShieldCheck size={22} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-extrabold text-sm sm:text-base text-emerald-900 tracking-tight">
                        GARANTÍA TÉCNICA DE TALLER ACTIVA
                      </h4>
                      <span className="text-[11px] font-black uppercase bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full">
                        {data.garantia.diasRestantes} días restantes
                      </span>
                    </div>
                    <p className="text-xs text-emerald-800 mt-0.5">
                      {data.garantia.mensaje}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="card bg-slate-50 border border-slate-200 p-3.5 rounded-xl flex items-center gap-3 text-slate-600">
                  <ShieldAlert size={20} className="text-slate-400 shrink-0" />
                  <p className="text-xs font-medium">
                    {data?.garantia?.mensaje || 'Equipo sin cobertura de garantía activa actualmente.'}
                  </p>
                </div>
              )}

              {/* 2. LÍNEA DE TIEMPO CRONOLÓGICA (HISTORIAL DE INGRESOS) */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-black uppercase tracking-wider text-navy flex items-center gap-2">
                    <Clock size={16} className="text-red-600" />
                    <span>Línea Cronológica de Ingresos ({data?.historial?.length || 0})</span>
                  </h4>
                </div>

                {!data?.historial || data.historial.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    No se registran órdenes de reparación previas para este equipo.
                  </div>
                ) : (
                  <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
                    {data.historial.map((item, index) => {
                      const isDelivered = item.ordenEstado === 'ENTREGADO';
                      const isRejected = item.reparacionRechazada;

                      return (
                        <div key={item.id || index} className="relative group">
                          {/* Dot Hito */}
                          <div className={`absolute -left-6 top-1.5 w-5 h-5 rounded-full border-2 border-white shadow-sm flex items-center justify-center ${
                            isRejected 
                              ? 'bg-red-500 text-white' 
                              : isDelivered 
                                ? 'bg-emerald-500 text-white' 
                                : 'bg-amber-500 text-white'
                          }`}>
                            {isRejected ? (
                              <X size={10} strokeWidth={3} />
                            ) : isDelivered ? (
                              <CheckCircle2 size={11} strokeWidth={3} />
                            ) : (
                              <Wrench size={10} strokeWidth={3} />
                            )}
                          </div>

                          {/* Tarjeta del Hito */}
                          <div className="card bg-white border border-slate-200/90 hover:border-navy/30 p-4 rounded-xl shadow-2xs space-y-2.5 transition-all">
                            {/* Cabecera del hito */}
                            <div className="flex items-start justify-between gap-2 flex-wrap">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-sm font-black text-navy">
                                    #{item.numeroOrden}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                    isRejected 
                                      ? 'bg-red-50 text-red-700 border-red-200' 
                                      : isDelivered 
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                        : 'bg-amber-50 text-amber-800 border-amber-200'
                                  }`}>
                                    {isRejected ? 'Rechazado' : item.ordenEstado}
                                  </span>
                                </div>
                                <p className="text-xs font-bold text-slate-700 mt-0.5 uppercase">
                                  {item.cliente}
                                </p>
                              </div>

                              <div className="text-right">
                                <span className="text-[11px] font-medium text-slate-400 block">
                                  {new Date(item.fecha).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </span>
                                <span className="font-mono text-xs font-black text-navy">
                                  {item.moneda === 'USD' ? '$' : 'Bs.'} {parseFloat(item.costoServicio + (item.totalRepuestos || 0)).toFixed(2)}
                                </span>
                              </div>
                            </div>

                            {/* Falla declarada */}
                            {item.fallaDeclarada && (
                              <div className="text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                <span className="font-bold text-slate-500 block text-[10px] uppercase">
                                  Falla Declarada:
                                </span>
                                <span className="text-slate-700">
                                  {item.fallaDeclarada}
                                </span>
                              </div>
                            )}

                            {/* Diagnóstico técnico */}
                            {item.textoDiagnostico && (
                              <div className="text-xs bg-blue-50/60 p-2.5 rounded-lg border border-blue-100">
                                <span className="font-bold text-blue-700 block text-[10px] uppercase">
                                  Diagnóstico Técnico:
                                </span>
                                <span className="text-blue-900">
                                  {item.textoDiagnostico}
                                </span>
                              </div>
                            )}

                            {/* Motivo de rechazo si aplica */}
                            {isRejected && item.motivoRechazo && (
                              <div className="text-xs bg-red-50 p-2.5 rounded-lg border border-red-200 text-red-800">
                                <span className="font-bold block text-[10px] uppercase">
                                  Motivo de Rechazo:
                                </span>
                                <span>{item.motivoRechazo}</span>
                              </div>
                            )}

                            {/* Fallas de circuito chips */}
                            {item.fallas && item.fallas.length > 0 && (
                              <div className="flex flex-wrap gap-1 pt-1">
                                {item.fallas.map((f, fi) => (
                                  <span 
                                    key={fi}
                                    className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1"
                                  >
                                    <Cpu size={10} className="text-red-500" />
                                    <span>{f.categoria}: {f.descripcion || f.codigo_falla}</span>
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Repuestos reemplazados */}
                            {item.repuestos && item.repuestos.length > 0 && (
                              <div className="pt-1 border-t border-slate-100 flex flex-wrap gap-1 text-[11px] text-slate-500">
                                <span className="font-bold text-[10px] uppercase text-slate-400 flex items-center gap-1">
                                  <Package size={11} /> Repuestos:
                                </span>
                                {item.repuestos.map((r, ri) => (
                                  <span key={ri} className="bg-slate-100 px-1.5 py-0.5 rounded font-medium text-slate-700 text-[10px]">
                                    {r.cantidad}x {r.descripcion}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Botón para abrir la orden */}
                            <div className="pt-2 flex justify-end">
                              <button
                                type="button"
                                onClick={() => {
                                  onClose();
                                  onOpenOrder({ id: item.ordenId, numero_orden: item.numeroOrden });
                                }}
                                className="text-xs font-bold text-navy hover:text-red-600 flex items-center gap-1 transition-colors"
                              >
                                <span>Abrir Orden Completa</span>
                                <ExternalLink size={12} />
                              </button>
                            </div>

                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* PIE DEL MODAL */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary py-2.5 px-6 text-xs sm:text-sm font-bold"
          >
            Cerrar Cronología
          </button>
        </div>

      </div>
    </div>
  );
}
