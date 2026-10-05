"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Wrench, Send, Save, CheckCircle2,
  AlertCircle, Loader2, Radio, Camera, ShieldCheck,
  Check, Clock
} from 'lucide-react';
import { OrdersService } from '@/lib/services/orders.service';
import Step2Diagnosis from '@/components/orders/Step2Diagnosis';
import EquipmentTabs from '@/components/orders/EquipmentTabs';

export default function TecnicoDiagnosticoMesaPage() {
  const params = useParams();
  const router = useRouter();
  const ordenId = params.ordenId || params.id;

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeEquipoIdx, setActiveEquipoIdx] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    let isMounted = true;
    OrdersService.getOrderById(ordenId).then(data => {
      if (isMounted) {
        if (data) setOrder(data);
        setLoading(false);
      }
    });
    return () => { isMounted = false; };
  }, [ordenId]);

  const showFeedbackMsg = (text, type = 'success') => {
    setFeedback({ text, type });
    setTimeout(() => setFeedback(null), 4000);
  };

  const updateEquipoDiagnosis = (data) => {
    setOrder(prev => {
      const newEquipos = [...(prev.equipos || [])];
      newEquipos[activeEquipoIdx] = {
        ...newEquipos[activeEquipoIdx],
        ...data
      };
      return { ...prev, equipos: newEquipos };
    });
  };

  // Botón de salida 1: [ Guardar Avance ] (guarda como EN_DIAGNOSTICO)
  const handleGuardarAvance = async () => {
    setIsSaving(true);
    try {
      await OrdersService.saveDiagnosis(order.id, order.equipos, false);
      showFeedbackMsg('Avance técnico guardado en mesa (Estado: EN DIAGNÓSTICO).');
    } catch (err) {
      console.error('Error al guardar avance:', err);
      showFeedbackMsg('No se pudo guardar el avance.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Botón de salida 2: [ Finalizar Diagnóstico y Enviar a Recepción ] (guarda como DIAGNOSTICADO y vuelve a /tecnico/inicio)
  const handleFinalizarDiagnostico = async () => {
    setIsSaving(true);
    try {
      await OrdersService.saveDiagnosis(order.id, order.equipos, true);
      showFeedbackMsg('¡Diagnóstico completado con éxito! Enviado a mostrador para presupuestar.');
      setTimeout(() => {
        router.push('/tecnico/inicio');
      }, 800);
    } catch (err) {
      console.error('Error al finalizar diagnóstico:', err);
      showFeedbackMsg('Error al finalizar diagnóstico.', 'error');
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-gray-400 flex flex-col items-center justify-center gap-2">
        <Loader2 size={24} className="animate-spin text-[#E30613]" />
        <span>Cargando mesa de diagnóstico técnico...</span>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center max-w-lg mx-auto space-y-4 my-12">
        <AlertCircle size={36} className="text-red-600 mx-auto" />
        <h2 className="text-lg font-bold text-gray-900">Orden No Encontrada</h2>
        <p className="text-xs text-gray-500">
          No se encontró el expediente solicitado en la mesa técnica.
        </p>
        <button
          onClick={() => router.push('/tecnico/inicio')}
          className="px-5 py-2.5 bg-navy text-white text-xs font-bold rounded-xl"
        >
          Volver a la Mesa de Trabajo
        </button>
      </div>
    );
  }

  const currentEquipo = order.equipos?.[activeEquipoIdx] || order.equipos?.[0] || {};
  const accesoriosRecepcion = currentEquipo.accesoriosRecepcion || {};
  const fotosRecepcion = currentEquipo.imagenes || [];

  return (
    <div className="space-y-6 pb-28 font-sans max-w-6xl mx-auto">
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
          onClick={() => router.push('/tecnico/inicio')}
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-gray-900 bg-white hover:bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs transition-all cursor-pointer"
        >
          <ArrowLeft size={15} />
          <span>Volver a Cola de Mesa</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-gray-900 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs">
            #{order.numero_orden || order.id} — {order.razon_social}
          </span>
          <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-xl bg-amber-100 text-amber-800">
            Fase 2: Mesa de Diagnóstico
          </span>
        </div>
      </div>

      {/* Pestañas por handy del lote */}
      <EquipmentTabs
        equipos={order.equipos || []}
        activeIndex={activeEquipoIdx}
        onSelect={setActiveEquipoIdx}
        showAdd={false}
      />

      {/* ============================================================== */}
      {/* SECCIÓN ARRIBA: DATOS DE RECEPCIÓN (MODO LECTURA) */}
      {/* ============================================================== */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-slate-100 text-gray-700 rounded-xl">
              <ShieldCheck size={18} />
            </span>
            <div>
              <h3 className="font-black text-gray-900 text-sm sm:text-base">
                Datos de Recepción en Mostrador (Modo Lectura)
              </h3>
              <p className="text-xs text-gray-500">
                Condiciones y accesorios declarados con que ingresó el equipo #{activeEquipoIdx + 1}.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold text-gray-400 uppercase bg-slate-100 px-2 py-0.5 rounded">
            Solo Consulta
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Columna Izquierda: Checklist de Accesorios */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
            <span className="font-bold text-gray-700 uppercase tracking-wider text-[10px] block">
              Checklist de Accesorios Recepcionados:
            </span>
            <div className="flex flex-wrap gap-2 pt-1">
              {Object.keys(accesoriosRecepcion).length === 0 ? (
                <span className="text-gray-400 italic">No se especificaron accesorios en mostrador.</span>
              ) : (
                Object.entries(accesoriosRecepcion).map(([acc, estado]) => (
                  <span
                    key={acc}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold text-[11px] ${
                      estado === 'CON'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-slate-200/80 text-gray-500 line-through'
                    }`}
                  >
                    <span>{acc}</span>
                    <span className="text-[9px] uppercase font-black">({estado})</span>
                  </span>
                ))
              )}
            </div>

            {currentEquipo.falla_declarada_cliente && (
              <div className="pt-2 border-t border-slate-200/60">
                <span className="font-bold text-gray-600 text-[10px] uppercase block">
                  Falla Declarada por el Cliente:
                </span>
                <p className="text-gray-800 italic mt-0.5">
                  &quot;{currentEquipo.falla_declarada_cliente}&quot;
                </p>
              </div>
            )}
          </div>

          {/* Columna Derecha: Fotos Externas de Ingreso */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
            <span className="font-bold text-gray-700 uppercase tracking-wider text-[10px] block flex items-center gap-1.5">
              <Camera size={13} className="text-[#E30613]" />
              <span>Fotos Exteriores de Recepción ({fotosRecepcion.length}):</span>
            </span>

            {fotosRecepcion.length === 0 ? (
              <div className="h-20 flex items-center justify-center text-gray-400 italic text-[11px]">
                Sin fotos tomadas en mostrador.
              </div>
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {fotosRecepcion.map((img, fi) => (
                  <div key={fi} className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 shrink-0 bg-white shadow-xs">
                    <img src={img.url} alt={`Recepción ${fi+1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* SECCIÓN ABAJO: HERRAMIENTAS DE LABORATORIO (STEP2DIAGNOSIS) */}
      {/* ============================================================== */}
      <Step2Diagnosis
        key={currentEquipo?.id || activeEquipoIdx}
        equipo={currentEquipo}
        moneda={order.moneda || 'BOB'}
        hidePrices={true}
        onChange={updateEquipoDiagnosis}
        isLoading={isSaving}
      />

      {/* ============================================================== */}
      {/* BOTONES DE SALIDA FIJOS EXIGIDOS */}
      {/* ============================================================== */}
      <div className="sticky bottom-4 z-40 bg-white/95 backdrop-blur-md p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 max-w-6xl mx-auto">
        <div>
          <h4 className="font-black text-gray-900 text-sm">
            Control de Mesa Técnica
          </h4>
          <p className="text-xs text-gray-500">
            Guarde avances preliminares o envíe el diagnóstico concluido a recepción para cotizar.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Botón 1: [ Guardar Avance ] (guarda como EN_DIAGNOSTICO) */}
          <button
            type="button"
            id="btn-guardar-avance"
            disabled={isSaving}
            onClick={handleGuardarAvance}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3.5 bg-white hover:bg-slate-50 border border-slate-300 font-bold text-xs sm:text-sm text-gray-800 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            <Save size={16} />
            <span>Guardar Avance</span>
          </button>

          {/* Botón 2: [ Finalizar Diagnóstico y Enviar a Recepción ] (guarda como DIAGNOSTICADO y vuelve a /tecnico/inicio) */}
          <button
            type="button"
            id="btn-finalizar-diagnostico"
            disabled={isSaving}
            onClick={handleFinalizarDiagnostico}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 active:scale-[0.98] text-white font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-red-600/25 transition-all cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Enviando...</span>
              </>
            ) : (
              <>
                <Send size={16} />
                <span>Finalizar Diagnóstico y Enviar a Recepción</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
