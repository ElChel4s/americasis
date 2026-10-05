"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft, Wrench, ShieldCheck, Printer, FileDown,
  Save, CheckCircle2, AlertCircle, Loader2, Sparkles,
  Eye, Check, Radio, Package, DollarSign, X
} from 'lucide-react';
import { OrdersService } from '@/lib/services/orders.service';
import Step3Budget from '@/components/orders/Step3Budget';
import Step4ReportPreview from '@/components/orders/Step4ReportPreview';
import { generateDocxBlob } from '@/lib/utils/docxExport';
import { formatCurrency, normalizeCurrency } from '@/lib/utils/currencyFormat';

export default function PresupuestoOrdenPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = params.id;
  const autoPrint = searchParams.get('print') === '1';

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeEquipoIdx, setActiveEquipoIdx] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(autoPrint);
  const [feedback, setFeedback] = useState(null);

  // Cargar orden
  useEffect(() => {
    let isMounted = true;
    OrdersService.getOrderById(orderId).then(data => {
      if (isMounted) {
        if (data) {
          setOrder(data);
          if (autoPrint) setShowPreviewModal(true);
        }
        setLoading(false);
      }
    });
    return () => { isMounted = false; };
  }, [orderId, autoPrint]);

  const updateForm = (updates) => {
    setOrder(prev => ({ ...prev, ...updates }));
  };

  const updateEquipo = (idx, updates) => {
    setOrder(prev => {
      const newEquipos = [...(prev.equipos || [])];
      newEquipos[idx] = { ...newEquipos[idx], ...updates };
      return { ...prev, equipos: newEquipos };
    });
  };

  const showFeedbackMsg = (text, type = 'success') => {
    setFeedback({ text, type });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Botón directo exigido: [ Guardar Presupuesto ] -> transiciona a COTIZADO -> /recepcion/inicio
  const handleGuardarPresupuesto = async () => {
    setIsSaving(true);
    try {
      const subtotal1 = (order.equipos || []).reduce((sum, eq) => {
        if (eq.reparacion_rechazada && !eq.no_autorizo_revision) return sum;
        return sum + (parseFloat(eq.costo_servicio) || 0);
      }, 0);

      const subtotal2 = (order.equipos || []).reduce((sum, eq) => {
        return sum + (eq.repuestos || []).filter(r => r.se_reemplaza).reduce((s, r) => {
          return s + ((parseInt(r.cantidad, 10) || 1) * (parseFloat(r.precio) || 0));
        }, 0);
      }, 0);

      const total = subtotal1 + subtotal2;

      await OrdersService.saveBudget(order.id, {
        moneda: order.moneda || 'BOB',
        equipos: order.equipos,
        condiciones: order.condiciones,
        sumatoria_total: total
      });

      showFeedbackMsg('Presupuesto fijado con éxito. Estado actualizado a COTIZADO.');
      setTimeout(() => {
        router.push('/recepcion/inicio');
      }, 1000);
    } catch (err) {
      console.error('Error al guardar presupuesto:', err);
      showFeedbackMsg('Error al guardar presupuesto.', 'error');
      setIsSaving(false);
    }
  };

  // Botón directo exigido: [ Descargar Word .docx ]
  const handleDownloadDocx = async () => {
    try {
      const blob = await generateDocxBlob(order);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Informe_Tecnico_${order.numero_orden || order.id}_${order.moneda || 'BOB'}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Error generando archivo Word.');
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-gray-400 flex flex-col items-center justify-center gap-2">
        <Loader2 size={24} className="animate-spin text-[#E30613]" />
        <span>Cargando expediente de cotización...</span>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center max-w-lg mx-auto space-y-4 my-12">
        <AlertCircle size={36} className="text-red-600 mx-auto" />
        <h2 className="text-lg font-bold text-gray-900">Orden de Servicio No Encontrada</h2>
        <p className="text-xs text-gray-500">
          No se encontró la orden solicitada (#{orderId}).
        </p>
        <button
          onClick={() => router.push('/recepcion/inicio')}
          className="px-5 py-2.5 bg-navy text-white text-xs font-bold rounded-xl"
        >
          Volver al Inicio
        </button>
      </div>
    );
  }

  const currentEquipo = order.equipos?.[activeEquipoIdx] || order.equipos?.[0] || {};

  return (
    <div className="space-y-6 pb-24 font-sans max-w-6xl mx-auto">
      {/* Toast Feedback */}
      {feedback && (
        <div className={`fixed top-20 right-6 z-50 p-4 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-bold animate-in slide-in-from-top-3 ${
          feedback.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
        }`}>
          <CheckCircle2 size={18} className="text-emerald-600" />
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Barra Superior de Retorno */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
        <button
          type="button"
          onClick={() => router.push('/recepcion/inicio')}
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-gray-900 bg-white hover:bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs transition-all cursor-pointer"
        >
          <ArrowLeft size={15} />
          <span>Volver al Tablero de Recepción</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-gray-900 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs">
            #{order.numero_orden || order.id} — {order.razon_social}
          </span>
          <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-xl bg-red-100 text-red-800">
            {order.estado || 'DIAGNOSTICADO'}
          </span>
        </div>
      </div>

      {/* ============================================================== */}
      {/* SECCIÓN SUPERIOR: DIAGNÓSTICO DEL TÉCNICO EN MODO LECTURA */}
      {/* ============================================================== */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Wrench size={18} />
            </span>
            <div>
              <h2 className="text-base font-black text-gray-900">
                Diagnóstico Emitido por el Técnico (Modo Lectura)
              </h2>
              <p className="text-xs text-gray-500">
                Dictamen técnico oficial para fundamentar el presupuesto y la proforma al cliente.
              </p>
            </div>
          </div>
        </div>

        {/* Selector de Pestañas de Radio del Lote */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {(order.equipos || []).map((eq, i) => (
            <button
              key={eq.id || i}
              type="button"
              onClick={() => setActiveEquipoIdx(i)}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer whitespace-nowrap ${
                activeEquipoIdx === i
                  ? 'bg-navy text-white shadow-xs'
                  : 'bg-slate-100 text-gray-600 hover:bg-slate-200'
              }`}
            >
              Radio #{i + 1}: {eq.marca} {eq.modelo || 'S/M'}
            </button>
          ))}
        </div>

        {/* Ficha de Diagnóstico del Radio Activo */}
        <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-3 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-bold text-gray-900">
            <span>
              {currentEquipo.marca} {currentEquipo.modelo} — Serie: {currentEquipo.serie || currentEquipo.numero_serie || 'S/N'}
            </span>
            <span className="text-gray-500 font-normal">Banda: {currentEquipo.banda || 'VHF'}</span>
          </div>

          {/* Dictamen del Técnico */}
          <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
            <span className="font-bold text-gray-700 block uppercase text-[10px] tracking-wider">
              Diagnóstico / Trabajo Requerido:
            </span>
            <p className="text-gray-800 leading-relaxed">
              {currentEquipo.texto_diagnostico || 'Se realizó la revisión electrónica y de parámetros RF.'}
            </p>
          </div>

          {/* Fallas Identificadas */}
          {currentEquipo.fallas && currentEquipo.fallas.length > 0 && (
            <div>
              <span className="font-bold text-gray-700 block uppercase text-[10px] tracking-wider mb-1">
                Fallas de Laboratorio Registradas:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {currentEquipo.fallas.map((f, fi) => (
                  <span key={fi} className="px-2.5 py-1 rounded-lg bg-red-50 text-red-700 border border-red-200 font-bold text-[11px]">
                    {f.label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* SECCIÓN INFERIOR: FORMULARIO ECONÓMICO (FASE 3 - STEP3BUDGET) */}
      {/* ============================================================== */}
      <Step3Budget
        formData={order}
        updateForm={updateForm}
        updateEquipo={updateEquipo}
        activeEquipoIndex={activeEquipoIdx}
        setActiveEquipoIndex={setActiveEquipoIdx}
      />

      {/* ============================================================== */}
      {/* BOTONES DIRECTOS AL PIE EXIGIDOS */}
      {/* ============================================================== */}
      <div className="sticky bottom-4 z-40 bg-white/95 backdrop-blur-md p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4 max-w-6xl mx-auto">
        <div>
          <h4 className="font-black text-gray-900 text-sm">
            Emisión y Cierre de Cotización
          </h4>
          <p className="text-xs text-gray-500">
            Imprima la proforma oficial, descargue el archivo Word o confirme el presupuesto.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap sm:flex-nowrap">
          {/* Botón: [ Ver / Imprimir Informe A4 ] */}
          <button
            type="button"
            id="btn-ver-informe-a4"
            onClick={() => setShowPreviewModal(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-white hover:bg-slate-50 border border-slate-300 font-bold text-xs sm:text-sm text-gray-800 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Printer size={16} className="text-[#E30613]" />
            <span>Ver / Imprimir Informe A4</span>
          </button>

          {/* Botón: [ Descargar Word .docx ] */}
          <button
            type="button"
            id="btn-descargar-docx"
            onClick={handleDownloadDocx}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-white hover:bg-slate-50 border border-slate-300 font-bold text-xs sm:text-sm text-gray-800 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <FileDown size={16} className="text-blue-600" />
            <span>Descargar Word (.docx)</span>
          </button>

          {/* Botón: [ Guardar Presupuesto ] (cambia a COTIZADO) */}
          <button
            type="button"
            id="btn-guardar-presupuesto"
            disabled={isSaving}
            onClick={handleGuardarPresupuesto}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-red-600/25 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-60"
          >
            {isSaving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Guardar Presupuesto</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* MODAL DE VISTA PREVIA COMPLETA A4 PARA IMPRIMIR */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-start p-2 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-5xl bg-slate-100 rounded-3xl p-4 sm:p-6 space-y-4 shadow-2xl relative my-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 bg-white p-4 rounded-2xl">
              <div>
                <h3 className="font-black text-base text-gray-900">
                  Vista Previa del Informe Oficial — Orden #{order.numero_orden || order.id}
                </h3>
                <p className="text-xs text-gray-500">
                  Documento formal A4 listo para imprimir o guardar como PDF oficial.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
                >
                  <Printer size={15} />
                  <span>Imprimir Ahora</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowPreviewModal(false)}
                  className="p-2 rounded-xl text-gray-400 hover:bg-slate-100 cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Componente A4 Report Preview */}
            <Step4ReportPreview
              formData={order}
              updateForm={updateForm}
            />
          </div>
        </div>
      )}
    </div>
  );
}
