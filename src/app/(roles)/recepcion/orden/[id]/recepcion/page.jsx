"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Radio, Save, CheckCircle2, AlertCircle,
  Loader2, ShieldCheck, ChevronRight, Wrench, Building2,
  Lock, RefreshCw, UserCheck
} from 'lucide-react';
import { OrdersService } from '@/lib/services/orders.service';
import Step1Reception from '@/components/orders/Step1Reception';
import OrderPhaseNav from '@/components/orders/OrderPhaseNav';

function formatEquiposForStep1(equipos) {
  return (equipos || []).map((eq, i) => {
    const accObj = {};
    if (eq.accesoriosRecepcion && Object.keys(eq.accesoriosRecepcion).length > 0) {
      Object.assign(accObj, eq.accesoriosRecepcion);
    } else if (Array.isArray(eq.accesorios)) {
      eq.accesorios.forEach(acc => {
        if (acc.accesorio_nombre) {
          accObj[acc.accesorio_nombre] = acc.presencia || 'CON';
        }
      });
    }

    if (Object.keys(accObj).length === 0) {
      accObj['Antena'] = 'CON';
      accObj['Batería'] = 'CON';
      accObj['Cargador de Base'] = 'SIN';
      accObj['Clip de Cinturón'] = 'SIN';
      accObj['Otros'] = 'SIN';
    }

    return {
      ...eq,
      id: eq.id || `eq-${Date.now()}-${i}`,
      tempId: eq.tempId || eq.id || `eq-${Date.now()}-${i}`,
      orden_indice: eq.orden_indice || (i + 1),
      marca: eq.marca || 'Motorola',
      modelo: eq.modelo || '',
      numero_serie: eq.numero_serie || eq.serie || '',
      serie: eq.numero_serie || eq.serie || '',
      banda: eq.banda || 'VHF',
      falla_declarada_cliente: eq.falla_declarada_cliente || '',
      costo_servicio: eq.costo_servicio !== undefined ? eq.costo_servicio : 150,
      descripcion_servicio: eq.descripcion_servicio || 'Mantenimiento preventivo y calibración RF',
      reparacion_rechazada: Boolean(eq.reparacion_rechazada),
      motivo_rechazo: eq.motivo_rechazo || '',
      texto_diagnostico: eq.texto_diagnostico || '',
      notas_adicionales: eq.notas_adicionales || '',
      estado_individual: eq.estado_individual || 'RECIBIDO',
      accesoriosRecepcion: accObj,
      accesorios: eq.accesorios || [],
      fallas: eq.fallas || [],
      repuestos: eq.repuestos || [],
      imagenes: (Array.isArray(eq.imagenes) && eq.imagenes.length > 0)
        ? eq.imagenes
        : (Array.isArray(eq.imagenesRecepcion) && eq.imagenesRecepcion.length > 0 ? eq.imagenesRecepcion : []),
      imagenesRecepcion: (Array.isArray(eq.imagenesRecepcion) && eq.imagenesRecepcion.length > 0)
        ? eq.imagenesRecepcion
        : (Array.isArray(eq.imagenes) && eq.imagenes.length > 0 ? eq.imagenes : []),
      imagenesInternas: (Array.isArray(eq.imagenesInternas) && eq.imagenesInternas.length > 0)
        ? eq.imagenesInternas
        : (Array.isArray(eq.imagenesDiagnostico) && eq.imagenesDiagnostico.length > 0 ? eq.imagenesDiagnostico : []),
      imagenesDiagnostico: (Array.isArray(eq.imagenesDiagnostico) && eq.imagenesDiagnostico.length > 0)
        ? eq.imagenesDiagnostico
        : (Array.isArray(eq.imagenesInternas) && eq.imagenesInternas.length > 0 ? eq.imagenesInternas : []),
      antenaEstado: eq.antena_estado || eq.antenaEstado || 'OPERATIVA',
      antenaModelo: eq.antena_modelo_sugerido || eq.antenaModelo || '',
      bateriaModelo: eq.bateria_modelo || eq.bateriaModelo || '',
      bateriaSerie: eq.bateria_serie || eq.bateriaSerie || '',
      bateriaCarga: eq.bateria_porcentaje_carga !== undefined && eq.bateria_porcentaje_carga !== null ? eq.bateria_porcentaje_carga : 100,
      otrosDescripcion: eq.otros_descripcion || eq.otrosDescripcion || ''
    };
  });
}

function EditarRecepcionContent() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id;

  const [order, setOrder] = useState(null);
  const [formData, setFormData] = useState(null);
  const [activeEquipoIndex, setActiveEquipoIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [userRole, setUserRole] = useState('');

  // 1. Obtener rol del usuario autenticado
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

  // 2. Cargar orden completa
  useEffect(() => {
    let isMounted = true;
    OrdersService.getOrderById(orderId)
      .then(data => {
        if (!isMounted) return;
        if (data) {
          setOrder(data);
          const mapped = {
            id: data.id,
            cliente_id: data.cliente_id,
            ordenServicio: data.numero_orden || data.ordenServicio || `OS-${String(data.id).padStart(5, '0')}`,
            numero_orden: data.numero_orden || data.ordenServicio || `OS-${String(data.id).padStart(5, '0')}`,
            cliente: data.razon_social || data.cliente || '',
            razon_social: data.razon_social || data.cliente || '',
            nit_ci: data.nit_ci || data.nit || '',
            telefono: data.cliente_telefono || data.telefono || '',
            cliente_telefono: data.cliente_telefono || data.telefono || '',
            email: data.cliente_email || data.email || '',
            cliente_email: data.cliente_email || data.email || '',
            direccion: data.cliente_direccion || data.direccion || '',
            cliente_direccion: data.cliente_direccion || data.direccion || '',
            persona_contacto: data.persona_contacto || '',
            moneda: data.moneda || 'BOB',
            usuario_tecnico_id: data.usuario_tecnico_id || data.tecnicoAsignadoId || data.tecnico_asignado_id || '',
            tecnicoAsignadoId: data.usuario_tecnico_id || data.tecnicoAsignadoId || data.tecnico_asignado_id || '',
            tecnico_asignado_id: data.usuario_tecnico_id || data.tecnicoAsignadoId || data.tecnico_asignado_id || '',
            tecnico_nombre_manual: data.tecnico_nombre_manual || data.tecnicoNombre || '',
            tecnicoNombre: data.tecnico_nombre_manual || data.tecnicoNombre || '',
            recepcionista_nombre_manual: data.recepcionista_nombre_manual || '',
            notas_internas: data.notas_internas || '',
            equipos: formatEquiposForStep1(data.equipos)
          };
          setFormData(mapped);
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
        console.error('Error cargando orden:', err);
        if (!isMounted) return;
        OrdersService.removeOrderFromLocalCache(orderId);
        setLoading(false);
        alert("La orden solicitada ya no existe o fue eliminada.");
        const role = userRole || (typeof window !== 'undefined' ? localStorage.getItem('america_user_role') : '');
        const redirectPath = role === 'ADMINISTRADOR' ? '/admin/inicio' : (role === 'TECNICO' ? '/tecnico/inicio' : '/recepcion/inicio');
        router.replace(redirectPath);
      });

    return () => { isMounted = false; };
  }, [orderId, router, userRole]);

  const canEdit = userRole === 'RECEPCION' || userRole === 'ADMINISTRADOR';

  const updateForm = (updates) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const updateEquipo = (index, updates) => {
    setFormData(prev => {
      const newEquipos = [...prev.equipos];
      newEquipos[index] = { ...newEquipos[index], ...updates };
      return { ...prev, equipos: newEquipos };
    });
  };

  const addEquipo = () => {
    if (formData.equipos.length >= 15) return;
    const newIdx = formData.equipos.length;
    const nuevoEquipo = {
      id: `eq-${Date.now()}-${newIdx}`,
      orden_indice: newIdx + 1,
      marca: 'Motorola',
      modelo: '',
      numero_serie: '',
      serie: '',
      banda: 'VHF',
      accesoriosRecepcion: {
        'Antena': 'CON',
        'Batería': 'CON',
        'Cargador de Base': 'SIN',
        'Clip de Cinturón': 'SIN',
        'Otros': 'SIN'
      },
      accesorios: [],
      falla_declarada_cliente: '',
      estado_individual: 'RECIBIDO',
      imagenes: []
    };

    setFormData(prev => ({
      ...prev,
      equipos: [...prev.equipos, nuevoEquipo]
    }));
    setActiveEquipoIndex(newIdx);
  };

  const removeEquipo = (index, e) => {
    if (e) e.stopPropagation();
    if (formData.equipos.length <= 1) return;
    setFormData(prev => {
      const filtered = prev.equipos.filter((_, i) => i !== index);
      return { ...prev, equipos: filtered };
    });
    if (activeEquipoIndex >= formData.equipos.length - 1) {
      setActiveEquipoIndex(Math.max(0, formData.equipos.length - 2));
    }
  };

  const showFeedbackMsg = (text, type = 'success') => {
    setFeedback({ text, type });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleGuardarCambios = async () => {
    if (!canEdit) {
      showFeedbackMsg('No tiene permisos para editar la recepción. Solo Recepción y Administrador.', 'error');
      return;
    }

    if (!formData.cliente || !formData.cliente.trim()) {
      showFeedbackMsg('Por favor ingrese el nombre del cliente o empresa.', 'error');
      return;
    }

    if (!formData.equipos || formData.equipos.length === 0) {
      showFeedbackMsg('Debe registrar al menos un equipo en la orden.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const savedResult = await OrdersService.updateReception(order.id, formData);
      showFeedbackMsg('¡Datos de recepción guardados exitosamente!', 'success');
      // Recargar orden para confirmar cambios sincronizados directamente con Supabase
      const refreshed = await OrdersService.getOrderById(order.id);
      const finalOrder = refreshed || savedResult;
      if (finalOrder) {
        setOrder(finalOrder);
        setFormData(prev => ({
          ...prev,
          ...finalOrder,
          equipos: formatEquiposForStep1(finalOrder.equipos)
        }));
      }
    } catch (err) {
      console.error('Error guardando cambios de recepción:', err);
      showFeedbackMsg(err.message || 'Error al guardar los cambios de recepción', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-[#E30613]" />
        <p className="text-gray-500 font-bold text-sm">Cargando expediente de recepción #{orderId}...</p>
      </div>
    );
  }

  if (!order || !formData) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold text-gray-900">Orden no encontrada</h2>
        <p className="text-gray-500 text-sm">No se pudo recuperar la orden con identificador #{orderId}.</p>
        <button
          onClick={() => router.push(userRole === 'ADMINISTRADOR' ? '/admin/inicio' : '/recepcion/inicio')}
          className="px-5 py-2.5 bg-slate-900 text-white font-bold rounded-xl text-sm"
        >
          Volver al Inicio
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-24 animate-slideUp">
      {/* Toast Feedback */}
      {feedback && (
        <div className={`fixed top-20 right-6 z-50 p-4 rounded-2xl border shadow-xl flex items-center gap-2.5 text-xs font-bold animate-in slide-in-from-top-3 ${
          feedback.type === 'error'
            ? 'bg-red-50 text-red-800 border-red-200'
            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
        }`}>
          {feedback.type === 'error' ? <AlertCircle size={18} className="text-red-600" /> : <CheckCircle2 size={18} className="text-emerald-600" />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Barra superior de regreso y título */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push(userRole === 'ADMINISTRADOR' ? '/admin/inicio' : '/recepcion/inicio')}
            className="p-2.5 rounded-2xl bg-white border border-slate-200 text-gray-600 hover:text-gray-900 hover:bg-slate-50 transition-all shadow-xs cursor-pointer"
            title="Volver al panel"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-red-50 text-[#E30613] rounded-lg">
                <Radio size={16} />
              </span>
              <span className="text-[11px] font-black uppercase tracking-wider text-red-600">
                Fase 1: Recepción & Ingreso de Equipos
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              Edición de Recepción de Mostrador
            </h1>
          </div>
        </div>

        {/* Acciones Rápidas de Cabecera */}
        <div className="flex items-center gap-2 flex-wrap">
          {canEdit ? (
            <button
              type="button"
              id="btn-guardar-recepcion-top"
              disabled={isSaving}
              onClick={handleGuardarCambios}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-red-600/20 active:scale-95 transition-all cursor-pointer"
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              <span>Guardar Cambios</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold">
              <Lock size={14} className="text-amber-600" />
              <span>Modo Solo Lectura (Solo Recepción y Admin)</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => router.push(`/tecnico/diagnostico/${order.id}`)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-gray-800 font-bold text-xs sm:text-sm shadow-xs transition-all cursor-pointer"
          >
            <span>Ir a Diagnóstico</span>
            <ChevronRight size={16} className="text-gray-400" />
          </button>
        </div>
      </div>

      {/* Componente Modular de Navegación de Fases Independientes */}
      <OrderPhaseNav
        orderId={order.id}
        currentPhase={1}
        orderNumber={order.numero_orden}
        clientName={order.razon_social || order.cliente}
        status={order.estado}
        userRole={userRole}
      />

      {/* Banner Informativo si no tiene permisos */}
      {!canEdit && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-amber-900 text-xs sm:text-sm">
          <Lock size={20} className="text-amber-600 shrink-0" />
          <div>
            <span className="font-bold">Vista informativa de recepción.</span> Los cambios en clientes, números de serie y accesorios solo pueden ser guardados por personal de Mostrador (Recepción) o Administradores del ERP.
          </div>
        </div>
      )}

      {/* Formulario Modular de Recepción */}
      <div className={!canEdit ? 'pointer-events-none opacity-80' : ''}>
        <Step1Reception
          formData={formData}
          updateForm={updateForm}
          updateEquipo={updateEquipo}
          addEquipo={addEquipo}
          removeEquipo={removeEquipo}
          activeEquipoIndex={activeEquipoIndex}
          setActiveEquipoIndex={setActiveEquipoIndex}
        />
      </div>

      {/* Barra Inferior Fija de Guardado */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200/90 py-3.5 px-4 sm:px-8 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span className="font-mono font-bold bg-slate-100 px-2 py-0.5 rounded text-gray-800">
              #{order.numero_orden || order.id}
            </span>
            <span>•</span>
            <span className="font-bold uppercase truncate max-w-xs">{formData.cliente || 'Sin cliente'}</span>
            <span>•</span>
            <span className="text-slate-500">{formData.equipos.length} equipo(s) en orden</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => router.push(userRole === 'ADMINISTRADOR' ? '/admin/inicio' : '/recepcion/inicio')}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-gray-700 bg-white hover:bg-slate-50 text-xs font-bold transition-all"
            >
              Cerrar
            </button>

            {canEdit && (
              <button
                type="button"
                id="btn-guardar-recepcion-bottom"
                disabled={isSaving}
                onClick={handleGuardarCambios}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-red-600/25 active:scale-95 transition-all cursor-pointer"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                <span>Guardar Cambios de Recepción</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => router.push(`/tecnico/diagnostico/${order.id}`)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm shadow-xs transition-all cursor-pointer"
            >
              <span>Fase 2: Diagnóstico</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EditarRecepcionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-[#E30613]" />
        <p className="text-gray-500 font-bold text-sm">Cargando expediente de recepción...</p>
      </div>
    }>
      <EditarRecepcionContent />
    </Suspense>
  );
}
