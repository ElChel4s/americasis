"use client";

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft, Wrench, ShieldCheck, Printer, FileDown,
  Save, CheckCircle2, AlertCircle, Loader2, Sparkles,
  Eye, Check, Radio, Package, DollarSign
} from 'lucide-react';
import { OrdersService } from '@/lib/services/orders.service';
import Step3Budget from '@/components/orders/Step3Budget';
import OrderPhaseNav from '@/components/orders/OrderPhaseNav';
import { generateDocxBlob } from '@/lib/utils/docxExport';
import { formatCurrency, normalizeCurrency } from '@/lib/utils/currencyFormat';

function PresupuestoOrdenContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = params.id;
  const autoPrint = searchParams.get('print') === '1';

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeEquipoIdx, setActiveEquipoIdx] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [userRole, setUserRole] = useState('');

  useEffect(() => {
    try {
      const cached = localStorage.getItem('america_user_role');
      if (cached) setUserRole(cached);
    } catch {}

    fetch('/api/auth/me')
      .then(r => r.json())
      .then(j => {
        if (j.success && j.data?.rol) {
          setUserRole(j.data.rol);
        }
      })
      .catch(() => {});
  }, []);

  // Cargar orden (si es autoPrint, redirigir directo a la pantalla de informe A4)
  useEffect(() => {
    if (autoPrint) {
      router.replace(`/recepcion/orden/${orderId}/informe?print=1`);
      return;
    }

    let isMounted = true;
    OrdersService.getOrderById(orderId)
      .then(data => {
        if (!isMounted) return;
        if (data) {
          setOrder(data);
          setLoading(false);
        } else {
          OrdersService.removeOrderFromLocalCache(orderId);
          setLoading(false);
          alert("La orden solicitada ya no existe o fue eliminada.");
          const role = userRole || (typeof window !== 'undefined' ? localStorage.getItem('america_user_role') : '');
          const redirectPath = role === 'ADMINISTRADOR' ? '/admin/inicio' : (role === 'TECNICO' ? '/tecnico/inicio' : '/recepcion/inicio');
          router.replace(redirectPath);
        }
      })
      .catch(err => {
        console.error('Error cargando orden en presupuesto:', err);
        if (!isMounted) return;
        OrdersService.removeOrderFromLocalCache(orderId);
        setLoading(false);
        alert("La orden solicitada ya no existe o fue eliminada.");
        const role = userRole || (typeof window !== 'undefined' ? localStorage.getItem('america_user_role') : '');
        const redirectPath = role === 'ADMINISTRADOR' ? '/admin/inicio' : (role === 'TECNICO' ? '/tecnico/inicio' : '/recepcion/inicio');
        router.replace(redirectPath);
      });

    return () => { isMounted = false; };
  }, [orderId, autoPrint, router, userRole]);

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
        router.push(userRole === 'ADMINISTRADOR' ? '/admin/inicio' : '/recepcion/inicio');
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
          onClick={() => router.push(userRole === 'ADMINISTRADOR' ? '/admin/inicio' : '/recepcion/inicio')}
          className="px-5 py-2.5 bg-navy text-white text-xs font-bold rounded-xl cursor-pointer"
        >
          <span suppressHydrationWarning>{userRole === 'ADMINISTRADOR' ? 'Volver al Panel de Gerencia' : 'Volver al Inicio'}</span>
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
          onClick={() => router.push(userRole === 'ADMINISTRADOR' ? '/admin/inicio' : '/recepcion/inicio')}
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-gray-900 bg-white hover:bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs transition-all cursor-pointer"
        >
          <ArrowLeft size={15} />
          <span suppressHydrationWarning>{userRole === 'ADMINISTRADOR' ? 'Volver al Panel de Gerencia' : 'Volver al Tablero de Recepción'}</span>
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

      {/* 2. Barra de Navegación de Fases Independientes */}
      <OrderPhaseNav
        orderId={order.id}
        currentPhase={3}
        orderNumber={order.numero_orden}
        clientName={order.razon_social}
        status={order.estado}
        userRole={userRole}
      />

      {/* ============================================================== */}
      {/* SECCIÓN SUPERIOR: DIAGNÓSTICO DEL TÉCNICO EN MODO LECTURA */}
      {/* ============================================================== */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Wrench size={18} />
            </span>
            <div>
              <h2 className="text-base font-black text-gray-900">
                Dictamen Técnico del Laboratorio
              </h2>
              <p className="text-xs text-gray-500">
                Dictamen técnico oficial para fundamentar el presupuesto y la proforma al cliente.
              </p>
            </div>
          </div>

          <button
            type="button"
            id="btn-editar-diagnostico-desde-presupuesto"
            onClick={() => router.push(`/tecnico/diagnostico/${order.id}`)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-all self-start sm:self-center active:scale-95"
            title="Abrir mesa de trabajo para ver o modificar fallas y repuestos"
          >
            <Wrench size={13} className="text-[#E30613]" />
            <span>Editar Diagnóstico Técnico (Fase 2)</span>
          </button>
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
            Pase a la pantalla del informe A4 o confirme el presupuesto para actualizar el estado.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap sm:flex-nowrap">
          {/* Botón directo a Pantalla Fase 4: Informe A4 / PDF */}
          <button
            type="button"
            id="btn-ir-informe-a4"
            onClick={() => router.push(`/recepcion/orden/${order.id}/informe`)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-white hover:bg-slate-50 border border-slate-300 font-bold text-xs sm:text-sm text-gray-800 rounded-xl shadow-xs transition-all cursor-pointer"
            title="Ir a la pantalla oficial e independiente de Fase 4"
          >
            <Printer size={16} className="text-[#E30613]" />
            <span>Ver Informe A4 / PDF (Fase 4)</span>
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
    </div>
  );
}

export default function PresupuestoOrdenPage() {
  return (
    <Suspense fallback={
      <div className="py-20 text-center text-gray-400 flex flex-col items-center justify-center gap-2">
        <Loader2 size={24} className="animate-spin text-[#E30613]" />
        <span>Cargando expediente de cotización...</span>
      </div>
    }>
      <PresupuestoOrdenContent />
    </Suspense>
  );
}
