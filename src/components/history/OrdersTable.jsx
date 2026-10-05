"use client";

import React, { useState } from 'react';
import { 
  Eye, 
  FileText, 
  FileDown, 
  Clock, 
  Radio, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  ChevronLeft,
  User, 
  Building2,
  Calendar,
  Layers,
  Wrench,
  Inbox,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const ESTADO_BADGES = {
  BORRADOR: {
    label: 'Borrador Abierto',
    bg: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-400'
  },
  RECIBIDO: {
    label: 'Recibido',
    bg: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-500'
  },
  EN_DIAGNOSTICO: {
    label: 'En Diagnóstico',
    bg: 'bg-amber-50 text-amber-800 border-amber-200',
    dot: 'bg-amber-500'
  },
  ESPERANDO_REPUESTO: {
    label: 'Esperando Repuesto',
    bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    dot: 'bg-indigo-500'
  },
  EN_REPARACION: {
    label: 'En Reparación',
    bg: 'bg-orange-50 text-orange-700 border-orange-200',
    dot: 'bg-orange-500'
  },
  LISTO: {
    label: 'Listo para Entrega',
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500'
  },
  ENTREGADO: {
    label: 'Entregado al Cliente',
    bg: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-600'
  },
  RECHAZADO: {
    label: 'Reparación Rechazada',
    bg: 'bg-red-50 text-red-700 border-red-200',
    dot: 'bg-red-500'
  }
};

function formatearFecha(fechaStr) {
  if (!fechaStr) return 'N/D';
  const d = new Date(fechaStr);
  return d.toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatearTiempoRelativo(fechaStr) {
  if (!fechaStr) return '';
  const d = new Date(fechaStr);
  const diffMs = Date.now() - d.getTime();
  const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDias === 0) return 'Hoy';
  if (diffDias === 1) return 'Ayer';
  if (diffDias < 30) return `Hace ${diffDias} días`;
  return `Hace ${Math.floor(diffDias / 30)} mes(es)`;
}

export default function OrdersTable({
  orders = [],
  isLoading = false,
  pagination = { page: 1, totalPages: 1, total: 0 },
  onPageChange,
  onSelectOrder,
  onSelectSerial,
  onPrintReport
}) {
  const [downloadingDocxId, setDownloadingDocxId] = useState(null);

  const handleDownloadDocx = async (e, orderId) => {
    e.stopPropagation();
    try {
      setDownloadingDocxId(orderId);
      const res = await fetch(`/api/reports/docx?ordenId=${orderId}`);
      if (!res.ok) {
        throw new Error('Error al generar el documento Word');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Informe_Tecnico_OS_${String(orderId).padStart(5, '0')}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error descargando docx:', err);
      alert('No se pudo descargar el archivo Word. Verifique que la orden tenga datos técnicos.');
    } finally {
      setDownloadingDocxId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="card bg-white border border-slate-200/90 shadow-sm p-6 space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="animate-pulse flex items-center justify-between p-4 bg-slate-50/70 rounded-xl gap-4">
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-slate-200 rounded w-1/4" />
              <div className="h-5 bg-slate-200 rounded w-2/3" />
            </div>
            <div className="h-8 bg-slate-200 rounded w-28 hidden sm:block" />
            <div className="h-8 bg-slate-200 rounded w-24" />
          </div>
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="card bg-white border border-slate-200/90 shadow-sm text-center py-16 px-4">
        <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-2xl mx-auto flex items-center justify-center mb-4">
          <Radio size={32} />
        </div>
        <h3 className="text-lg font-extrabold text-navy mb-1">
          No se encontraron órdenes de servicio
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mb-6">
          No hay órdenes que coincidan con los criterios de búsqueda o filtros seleccionados. Intente limpiar los términos o buscar por otro número de serie o cliente.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 1. VISTA DE TABLA ESTRUCTURADA (ESCRITORIO / LAPTOP) */}
      <div className="card bg-white border border-slate-200/90 shadow-sm p-0 overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200/80 text-[11px] font-black uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-4">N° Orden & Fecha</th>
                <th className="py-3.5 px-4">Cliente / Razón Social</th>
                <th className="py-3.5 px-4">Equipos & Series (S/N)</th>
                <th className="py-3.5 px-4">Estado Operativo</th>
                <th className="py-3.5 px-4 text-right">Total Facturado</th>
                <th className="py-3.5 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm font-medium">
              {orders.map((ord) => {
                const estadoInfo = ESTADO_BADGES[ord.estado] || ESTADO_BADGES.EN_DIAGNOSTICO;
                const equipos = ord.equipos || [];
                const numeroOrden = ord.numero_orden || `OS-${String(ord.id).padStart(5, '0')}`;

                return (
                  <tr 
                    key={ord.id}
                    onClick={() => onSelectOrder(ord)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    {/* N° Orden & Fecha */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-mono text-sm font-black text-navy group-hover:text-red-600 transition-colors">
                          #{numeroOrden}
                        </span>
                        <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium mt-0.5">
                          <Calendar size={11} />
                          <span>{formatearFecha(ord.creado_en)}</span>
                          <span className="text-slate-300">•</span>
                          <span>{formatearTiempoRelativo(ord.creado_en)}</span>
                        </div>
                      </div>
                    </td>

                    {/* Cliente */}
                    <td className="py-4 px-4 max-w-xs">
                      <div className="flex flex-col">
                        <span className="font-bold text-navy truncate uppercase" title={ord.razon_social}>
                          {ord.razon_social || 'Consumidor Final'}
                        </span>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                          {ord.nit_ci && (
                            <span className="font-mono bg-slate-100 px-1.5 py-0.2 rounded text-[10px]">
                              NIT: {ord.nit_ci}
                            </span>
                          )}
                          {ord.persona_contacto && (
                            <span className="truncate max-w-[140px]" title={ord.persona_contacto}>
                              {ord.persona_contacto}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Equipos & Series */}
                    <td className="py-4 px-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full border border-slate-200">
                            <Layers size={10} className="text-[#E30613]" />
                            {equipos.length} {equipos.length === 1 ? 'Radio' : 'Radios'}
                          </span>
                        </div>

                        {/* Chips de Series clickeables para abrir cronología vital */}
                        <div className="flex flex-wrap gap-1 mt-1 max-w-sm">
                          {equipos.map((eq, idx) => (
                            <button
                              key={eq.id || idx}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (eq.numero_serie) {
                                  onSelectSerial(eq.numero_serie);
                                }
                              }}
                              className="inline-flex items-center gap-1 font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-50 hover:bg-red-50 text-slate-700 hover:text-red-600 border border-slate-200 hover:border-red-300 transition-all shadow-2xs"
                              title="Ver hoja de vida y cronología vital de este radio"
                            >
                              <span className="text-slate-400 font-sans text-[10px]">{eq.modelo || 'Radio'}:</span>
                              <span>{eq.numero_serie || 'S/N'}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </td>

                    {/* Estado Operativo */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${estadoInfo.bg}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${estadoInfo.dot} animate-pulse`} />
                        {estadoInfo.label}
                      </span>
                    </td>

                    {/* Total Facturado */}
                    <td className="py-4 px-4 text-right whitespace-nowrap">
                      <div className="flex flex-col items-end">
                        <span className="font-mono text-sm font-black text-navy">
                          {ord.moneda === 'USD' ? '$' : 'Bs.'} {parseFloat(ord.sumatoria_total || 0).toFixed(2)}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {ord.moneda === 'USD' 
                            ? `≈ Bs. ${(parseFloat(ord.sumatoria_total || 0) * (ord.tasa_cambio || 6.96)).toFixed(2)}`
                            : `≈ $ ${(parseFloat(ord.sumatoria_total || 0) / (ord.tasa_cambio || 6.96)).toFixed(2)}`}
                        </span>
                      </div>
                    </td>

                    {/* Acciones Rápidas */}
                    <td className="py-4 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onSelectOrder(ord)}
                          className="p-2 rounded-xl text-slate-600 hover:text-navy hover:bg-slate-100 transition-colors border border-slate-200"
                          title="Ver Detalle y Hoja de Ruta"
                        >
                          <Eye size={15} />
                        </button>

                        <button
                          type="button"
                          onClick={() => onPrintReport(ord)}
                          className="p-2 rounded-xl text-slate-600 hover:text-red-600 hover:bg-red-50 transition-colors border border-slate-200"
                          title="Reimprimir Informe Oficial Membretado (PDF / Impresión A4)"
                        >
                          <FileText size={15} />
                        </button>

                        <button
                          type="button"
                          disabled={downloadingDocxId === ord.id}
                          onClick={(e) => handleDownloadDocx(e, ord.id)}
                          className="p-2 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors border border-slate-200"
                          title="Descargar Informe Técnico en Word (.docx editable)"
                        >
                          <FileDown size={15} className={downloadingDocxId === ord.id ? 'animate-bounce text-blue-600' : ''} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. VISTA DE TARJETAS EN MÓVIL Y TABLET */}
      <div className="grid grid-cols-1 gap-3.5 md:hidden">
        {orders.map((ord) => {
          const estadoInfo = ESTADO_BADGES[ord.estado] || ESTADO_BADGES.EN_DIAGNOSTICO;
          const equipos = ord.equipos || [];
          const numeroOrden = ord.numero_orden || `OS-${String(ord.id).padStart(5, '0')}`;

          return (
            <div 
              key={ord.id}
              onClick={() => onSelectOrder(ord)}
              className="card bg-white border border-slate-200/90 shadow-sm p-4 space-y-3 cursor-pointer active:scale-[0.99] transition-transform"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-black text-navy">
                      #{numeroOrden}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${estadoInfo.bg}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${estadoInfo.dot}`} />
                      {estadoInfo.label}
                    </span>
                  </div>
                  <h4 className="font-bold text-navy text-sm uppercase mt-1">
                    {ord.razon_social || 'Consumidor Final'}
                  </h4>
                </div>
                <div className="text-right">
                  <span className="font-mono text-sm font-black text-navy block">
                    {ord.moneda === 'USD' ? '$' : 'Bs.'} {parseFloat(ord.sumatoria_total || 0).toFixed(2)}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {formatearFecha(ord.creado_en)}
                  </span>
                </div>
              </div>

              {/* Equipos y series */}
              <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-1">
                {equipos.map((eq, i) => (
                  <button
                    key={eq.id || i}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (eq.numero_serie) {
                        onSelectSerial(eq.numero_serie);
                      }
                    }}
                    className="font-mono text-[10px] font-bold px-2 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200"
                  >
                    {eq.modelo}: {eq.numero_serie}
                  </button>
                ))}
              </div>

              {/* Botones de acción móvil */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onSelectOrder(ord)}
                  className="flex-1 py-2 rounded-xl text-xs font-bold text-navy bg-slate-100 hover:bg-slate-200 flex items-center justify-center gap-1.5"
                >
                  <Eye size={14} /> Detalle
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPrintReport(ord);
                  }}
                  className="p-2 rounded-xl text-slate-600 bg-slate-100 hover:text-red-600"
                  title="PDF"
                >
                  <FileText size={16} />
                </button>
                <button
                  type="button"
                  onClick={(e) => handleDownloadDocx(e, ord.id)}
                  className="p-2 rounded-xl text-slate-600 bg-slate-100 hover:text-blue-600"
                  title="Word"
                >
                  <FileDown size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. PAGINACIÓN */}
      {pagination.totalPages > 1 && (
        <div className="card bg-white border border-slate-200/90 shadow-sm p-3.5 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500 font-medium">
            Página <strong className="text-navy">{pagination.page}</strong> de <strong className="text-navy">{pagination.totalPages}</strong> ({pagination.total} órdenes en total)
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => onPageChange(pagination.page - 1)}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-slate-600"
            >
              <ChevronLeft size={16} />
            </button>

            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).slice(0, 5).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                className={`w-8 h-8 rounded-xl text-xs font-bold transition-all ${
                  p === pagination.page 
                    ? 'bg-navy text-white shadow-sm' 
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {p}
              </button>
            ))}

            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => onPageChange(pagination.page + 1)}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-slate-600"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
