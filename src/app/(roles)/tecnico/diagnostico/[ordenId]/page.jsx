"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Wrench, Send, Save, CheckCircle2,
  AlertCircle, Loader2, Radio, Camera, ShieldCheck,
  Check, Clock, Lock, ShieldAlert, UserCheck
} from 'lucide-react';
import { OrdersService } from '@/lib/services/orders.service';
import Step2Diagnosis from '@/components/orders/Step2Diagnosis';
import EquipmentTabs from '@/components/orders/EquipmentTabs';
import OrderPhaseNav from '@/components/orders/OrderPhaseNav';

export default function TecnicoDiagnosticoMesaPage() {
  const params = useParams();
  const router = useRouter();
  const ordenId = params.ordenId || params.id;

  const [order, setOrder] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeEquipoIdx, setActiveEquipoIdx] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    let isMounted = true;
    OrdersService.getOrderById(ordenId)
      .then(data => {
        if (!isMounted) return;
        if (data) {
          setOrder(data);
          setLoading(false);
        } else {
          OrdersService.removeOrderFromLocalCache(ordenId);
          setLoading(false);
          alert("La orden solicitada ya no existe o fue eliminada.");
          const role = typeof window !== 'undefined' ? (localStorage.getItem('america_user_role') || '') : '';
          const redirectPath = role === 'ADMINISTRADOR' ? '/admin/inicio' : (role === 'RECEPCION' ? '/recepcion/inicio' : '/tecnico/inicio');
          router.replace(redirectPath);
        }
      })
      .catch(err => {
        console.error('Error cargando orden en mesa técnica:', err);
        if (!isMounted) return;
        OrdersService.removeOrderFromLocalCache(ordenId);
        setLoading(false);
        alert("La orden solicitada ya no existe o fue eliminada.");
        const role = typeof window !== 'undefined' ? (localStorage.getItem('america_user_role') || '') : '';
        const redirectPath = role === 'ADMINISTRADOR' ? '/admin/inicio' : (role === 'RECEPCION' ? '/recepcion/inicio' : '/tecnico/inicio');
        router.replace(redirectPath);
      });

    fetch('/api/auth/me')
      .then(r => r.json())
      .then(j => {
        if (isMounted && j.success) {
          setCurrentUser(j.data);
        }
      })
      .catch(() => {});

    return () => { isMounted = false; };
  }, [ordenId, router]);

  const showFeedbackMsg = (text, type = 'success') => {
    setFeedback({ text, type });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Cálculo de permisos de edición:
  // - Administrador tiene acceso total de edición.
  // - Recepción tiene acceso total de visualización y edición del diagnóstico del técnico.
  // - El técnico asignado a la orden tiene permiso de edición.
  // - Los demás técnicos no asignados tienen acceso en modo solo consulta (pueden solicitar autorización).
  const isAdmin = currentUser?.rol === 'ADMINISTRADOR';
  const isRecepcion = currentUser?.rol === 'RECEPCION';
  const isTechnician = currentUser?.rol === 'TECNICO';

  const isAssigned = Boolean(
    order?.usuario_tecnico_id && (
      String(order.usuario_tecnico_id) === String(currentUser?.id) ||
      order.usuario_tecnico_id === currentUser?.id
    )
  ) || Boolean(
    order?.tecnico_nombre_manual && currentUser?.nombre_completo &&
    (order.tecnico_nombre_manual.toLowerCase().includes(currentUser.nombre_completo.toLowerCase()) ||
     currentUser.nombre_completo.toLowerCase().includes(order.tecnico_nombre_manual.toLowerCase()))
  ) || Boolean(
    order?.tecnico_asignado_id && String(order.tecnico_asignado_id) === String(currentUser?.id)
  ) || Boolean(
    order?.solicitud_asignacion && (
      String(order.solicitud_asignacion.tecnico_id) === String(currentUser?.id) ||
      (order.solicitud_asignacion.tecnico_nombre && currentUser?.nombre_completo &&
       order.solicitud_asignacion.tecnico_nombre.toLowerCase().includes(currentUser.nombre_completo.toLowerCase()))
    )
  ) || Boolean(
    order?.condiciones_comerciales_json?.solicitud_edicion && (
      String(order.condiciones_comerciales_json.solicitud_edicion.tecnico_id) === String(currentUser?.id) ||
      (order.condiciones_comerciales_json.solicitud_edicion.tecnico_nombre && currentUser?.nombre_completo &&
       order.condiciones_comerciales_json.solicitud_edicion.tecnico_nombre.toLowerCase().includes(currentUser.nombre_completo.toLowerCase()))
    )
  ) || (
    // En taller de radios, si no hay técnico asignado o está en recibido/pendiente, cualquier técnico puede diagnosticarlo
    isTechnician && (!order?.usuario_tecnico_id || !order?.tecnico_nombre_manual || order?.estado === 'RECIBIDO' || order?.estado === 'PENDIENTE_DIAGNOSTICO')
  );

  const canEdit = isAdmin || isRecepcion || isAssigned;

  const getReturnRoute = () => {
    if (isAdmin) return '/admin/inicio';
    if (isRecepcion) return '/recepcion/inicio';
    return '/tecnico/inicio';
  };

  const getReturnLabel = () => {
    if (isAdmin) return 'Volver al Panel de Gerencia';
    if (isRecepcion) return 'Volver al Tablero de Recepción';
    return 'Volver a Cola de Mesa';
  };

  const handleTomarOrdenDirecto = async () => {
    if (!currentUser) return;
    setIsRequestingPermission(true);
    try {
      const updated = await OrdersService.tomarYDiagnosticar(order.id, currentUser);
      if (updated) {
        setOrder(updated);
        showFeedbackMsg('✓ Orden asignada directamente a tu mesa técnica.');
      }
    } catch (err) {
      showFeedbackMsg('No se pudo asignar la orden.', 'error');
    } finally {
      setIsRequestingPermission(false);
    }
  };

  const updateEquipoDiagnosis = useCallback((data) => {
    setOrder(prev => {
      if (!prev) return prev;
      const newEquipos = [...(prev.equipos || [])];
      newEquipos[activeEquipoIdx] = {
        ...newEquipos[activeEquipoIdx],
        ...data
      };
      return { ...prev, equipos: newEquipos };
    });
  }, [activeEquipoIdx]);

  // Botón de salida 1: [ Guardar Avance ] (guarda como EN_DIAGNOSTICO)
  const handleGuardarAvance = async () => {
    if (!canEdit) return;
    setIsSaving(true);
    try {
      const updated = await OrdersService.saveDiagnosis(order.id, order.equipos, false);
      if (updated) setOrder(updated);
      showFeedbackMsg('✓ Avance técnico guardado en mesa (Estado: EN DIAGNÓSTICO).');
    } catch (err) {
      console.error('Error al guardar avance:', err);
      showFeedbackMsg('Error al guardar el avance: ' + (err.message || 'Error de conexión'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Botón de salida 2: [ Finalizar Diagnóstico y Enviar a Recepción / Guardar ]
  const handleFinalizarDiagnostico = async () => {
    if (!canEdit) return;
    setIsSaving(true);
    try {
      const updated = await OrdersService.saveDiagnosis(order.id, order.equipos, true);
      if (updated) setOrder(updated);
      const msg = isRecepcion 
        ? '✓ ¡Diagnóstico guardado con éxito por Recepción!' 
        : '✓ ¡Diagnóstico completado con éxito! Enviado a mostrador para presupuestar.';
      showFeedbackMsg(msg);
      setTimeout(() => {
        router.push(getReturnRoute());
      }, 800);
    } catch (err) {
      console.error('Error al finalizar diagnóstico:', err);
      showFeedbackMsg('Error al finalizar diagnóstico: ' + (err.message || 'Error de conexión'), 'error');
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
          onClick={() => router.push(getReturnRoute())}
          className="px-5 py-2.5 bg-navy text-white text-xs font-bold rounded-xl cursor-pointer"
        >
          {getReturnLabel()}
        </button>
      </div>
    );
  }

  const currentEquipo = order.equipos?.[activeEquipoIdx] || order.equipos?.[0] || {};
  const accesoriosRecepcion = (currentEquipo.accesoriosRecepcion && Object.keys(currentEquipo.accesoriosRecepcion).length > 0)
    ? currentEquipo.accesoriosRecepcion
    : (Array.isArray(currentEquipo.accesorios)
        ? currentEquipo.accesorios.reduce((acc, a) => {
            if (a.accesorio_nombre) acc[a.accesorio_nombre] = a.presencia || 'CON';
            return acc;
          }, {})
        : {});
  const fotosRecepcion = (Array.isArray(currentEquipo.imagenes) && currentEquipo.imagenes.length > 0)
    ? currentEquipo.imagenes
    : (Array.isArray(currentEquipo.imagenesRecepcion) && currentEquipo.imagenesRecepcion.length > 0
        ? currentEquipo.imagenesRecepcion
        : []);

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

      {/* Banner de Estado de Permisos de Edición */}
      {!canEdit && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-amber-200/70 text-amber-900 rounded-xl shrink-0 mt-0.5">
              <Lock size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-black text-amber-950 text-sm">
                  Modo Solo Consulta — Diagnóstico Protegido
                </h4>
                <span className="text-[10px] uppercase font-black bg-amber-200 text-amber-900 px-2 py-0.5 rounded-md">
                  Solo Lectura
                </span>
              </div>
              <p className="text-xs text-amber-800 mt-0.5">
                {order.tecnico_nombre_manual
                  ? `Esta orden está asignada al técnico "${order.tecnico_nombre_manual}". Puedes revisar todos los datos, pero para editar necesitas autorización.`
                  : `Esta orden aún no ha sido asignada a ningún técnico. Puedes consultar los datos o solicitar que Recepción te la asigne.`}
              </p>
            </div>
          </div>

          <div className="shrink-0 w-full sm:w-auto">
            {myPendingRequest ? (
              <div className="flex items-center gap-2 bg-amber-100/90 text-amber-900 px-4 py-2.5 rounded-xl border border-amber-300 text-xs font-bold shadow-xs">
                <Clock size={16} className="text-amber-700 animate-pulse" />
                <span>Solicitud enviada a Recepción (Pendiente)</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleSolicitarPermiso}
                disabled={isRequestingPermission}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-navy hover:bg-slate-800 active:scale-95 text-white text-xs font-black rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {isRequestingPermission ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Enviando solicitud...</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert size={15} />
                    <span>Solicitar Permiso para Diagnosticar</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Barra Superior de Retorno */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
        <button
          type="button"
          onClick={() => router.push(getReturnRoute())}
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-gray-900 bg-white hover:bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs transition-all cursor-pointer"
        >
          <ArrowLeft size={15} />
          <span>{getReturnLabel()}</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-mono font-bold text-gray-900 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs">
            #{order.numero_orden || order.id} — {order.razon_social}
          </span>
          <span className="text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-xl">
            Asignado a: <strong className="text-gray-900">{order.tecnico_nombre_manual || 'Sin Asignar'}</strong>
          </span>
          {isRecepcion && (
            <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-xl bg-blue-100 text-blue-800 border border-blue-300">
              Modo Edición: Mostrador & Recepción
            </span>
          )}
          {isAdmin && (
            <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-xl bg-slate-900 text-white shadow-xs">
              Modo Edición: Gerencia General
            </span>
          )}
          {!isAdmin && !isRecepcion && isAssigned && (
            <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-300">
              Técnico Asignado
            </span>
          )}
          <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-xl bg-amber-100 text-amber-800">
            Fase 2: Mesa de Diagnóstico
          </span>
        </div>
      </div>

      {/* Barra de Navegación de Fases Independientes */}
      <OrderPhaseNav
        orderId={order.id}
        currentPhase={2}
        orderNumber={order.numero_orden}
        clientName={order.razon_social}
        status={order.estado}
        userRole={currentUser?.rol}
      />

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
        readOnly={!canEdit}
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
            {canEdit
              ? 'Guarde avances preliminares o envíe el diagnóstico concluido a recepción para cotizar.'
              : 'Orden en modo lectura. Solo el técnico asignado o administrador pueden modificar el diagnóstico.'}
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {canEdit ? (
            <>
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
                    <span>
                      {isRecepcion 
                        ? 'Guardar Diagnóstico y Volver a Mostrador' 
                        : (isAdmin ? 'Guardar Diagnóstico (Gerencia)' : 'Finalizar Diagnóstico y Enviar a Recepción')}
                    </span>
                  </>
                )}
              </button>
            </>
          ) : (
            <div className="w-full sm:w-auto flex items-center gap-2">
              <button
                type="button"
                onClick={handleTomarOrdenDirecto}
                disabled={isRequestingPermission}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {isRequestingPermission ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Asignando orden...</span>
                  </>
                ) : (
                  <>
                    <Wrench size={16} />
                    <span>Tomar Orden y Asignarme</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
