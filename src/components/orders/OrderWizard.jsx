"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Radio as RadioIcon, Layers } from 'lucide-react';
import StepIndicator from '@/components/layout/StepIndicator';
import WizardFooter from '@/components/layout/WizardFooter';
import Step1Reception from '@/components/orders/Step1Reception';
import Step2Diagnosis from '@/components/orders/Step2Diagnosis';
import Step3Pricing from '@/components/orders/Step3Pricing';
import Step4ReportPreview from '@/components/orders/Step4ReportPreview';

const DEFAULT_EQUIPO = (index) => ({
  id: Date.now() + index,
  orden_indice: index + 1,
  marca: 'Motorola',
  modelo: '',
  numero_serie: '',
  serie: '',
  banda: 'VHF',
  accesoriosRecepcion: {
    'Antena': 'CON',
    'Batería': 'CON',
    'Cargador': 'SIN',
    'Clip': 'SIN',
    'Micrófono': 'SIN',
    'Otros': 'SIN'
  },
  falla_declarada_cliente: '',
  estado_individual: 'EN_DIAGNOSTICO',
  reparacion_rechazada: false,
  motivo_rechazo: '',
  texto_diagnostico: '',
  notas_adicionales: '',
  descripcion_servicio: 'Mantenimiento preventivo y calibración RF',
  costo_servicio: 150,
  fallas: [],
  repuestos: [],
  imagenes: []
});

function ServiceOrderWizardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const ordenParam = searchParams.get('orden');
  const nuevoParam = searchParams.get('nuevo');
  const flotaParam = searchParams.get('flota');
  const pasoParam = searchParams.get('paso');

  // Si hay algún parámetro activo de orden o nuevo ingreso, abrimos el wizard
  const [isWizardOpen, setIsWizardOpen] = useState(Boolean(ordenParam || nuevoParam || flotaParam));
  const [activeStep, setActiveStep] = useState(pasoParam ? parseInt(pasoParam, 10) : 1);
  const [activeEquipoIndex, setActiveEquipoIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState(null);
  const [ordenId, setOrdenId] = useState(ordenParam || null);

  // Estado del usuario y perspectiva operativa (RBAC)
  const [currentUser, setCurrentUser] = useState(null);
  const [activePerspective, setActivePerspective] = useState(null);

  // Cargar usuario autenticado para determinar pantalla de inicio por rol
  useEffect(() => {
    let isMounted = true;
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        if (isMounted && d.success && d.data) {
          setCurrentUser(d.data);
          const rol = d.data.rol;
          if (rol === 'RECEPCION') {
            setActivePerspective('frontdesk');
          } else if (rol === 'TECNICO') {
            setActivePerspective('technician');
          } else {
            setActivePerspective('admin');
          }
        }
      })
      .catch(err => {
        console.warn('Error al verificar sesión en workspace:', err);
      });
    return () => { isMounted = false; };
  }, []);

  const effectivePerspective = useMemo(() => {
    if (activePerspective) return activePerspective;
    if (currentUser?.rol === 'RECEPCION') return 'frontdesk';
    if (currentUser?.rol === 'TECNICO') return 'technician';
    return 'admin';
  }, [activePerspective, currentUser]);

  const [formData, setFormData] = useState({
    cliente: '',
    ordenServicio: '',
    moneda: 'BOB',
    equipos: [DEFAULT_EQUIPO(0)]
  });

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Cargar orden si viene en el URL (?orden=ID)
  useEffect(() => {
    let active = true;

    const timer = setTimeout(() => {
      if (!active) return;

      if (!ordenParam) {
        if (flotaParam) {
          setOrdenId(null);
          setFormData({
            cliente: '',
            ordenServicio: '',
            moneda: 'BOB',
            equipos: Array.from({ length: 5 }, (_, i) => DEFAULT_EQUIPO(i))
          });
          setIsWizardOpen(true);
        } else if (nuevoParam) {
          setOrdenId(null);
          setFormData({
            cliente: '',
            ordenServicio: '',
            moneda: 'BOB',
            equipos: [DEFAULT_EQUIPO(0)]
          });
          setIsWizardOpen(true);
        } else {
          setOrdenId(null);
          setIsWizardOpen(false);
        }
        return;
      }

      async function loadOrder() {
        try {
          const res = await fetch(`/api/orders/${ordenParam}`);
          const json = await res.json();
          if (active && json.success && json.data) {
            const ord = json.data;
            setOrdenId(ord.id);
            setFormData({
              cliente: ord.razon_social || '',
              ordenServicio: ord.numero_orden || `OS-${ord.id}`,
              moneda: ord.moneda || 'BOB',
              equipos: (ord.equipos && ord.equipos.length > 0)
                ? ord.equipos.map((eq, i) => ({
                    id: eq.id || Date.now() + i,
                    orden_indice: eq.orden_indice || i + 1,
                    marca: eq.marca || 'Motorola',
                    modelo: eq.modelo || '',
                    numero_serie: eq.numero_serie || '',
                    serie: eq.numero_serie || '',
                    banda: eq.banda || 'VHF',
                    accesoriosRecepcion: eq.accesoriosRecepcion || {
                      'Antena': 'CON', 'Batería': 'CON', 'Cargador': 'SIN', 'Clip': 'SIN', 'Otros': 'SIN'
                    },
                    falla_declarada_cliente: eq.falla_declarada_cliente || '',
                    estado_individual: eq.estado_individual || 'EN_DIAGNOSTICO',
                    reparacion_rechazada: Boolean(eq.reparacion_rechazada),
                    motivo_rechazo: eq.motivo_rechazo || '',
                    texto_diagnostico: eq.texto_diagnostico || '',
                    notas_adicionales: eq.notas_adicionales || '',
                    descripcion_servicio: eq.descripcion_servicio || 'Mantenimiento preventivo',
                    costo_servicio: eq.costo_servicio !== undefined ? eq.costo_servicio : 150,
                    fallas: eq.fallas || [],
                    repuestos: eq.repuestos || [],
                    imagenes: eq.evidencias || eq.imagenes || []
                  }))
                : [DEFAULT_EQUIPO(0)]
            });
            setIsWizardOpen(true);
            if (pasoParam) setActiveStep(parseInt(pasoParam, 10));
            showToast(`Orden #${ord.numero_orden || ord.id} cargada.`);
          }
        } catch (err) {
          console.error('Error cargando orden:', err);
        }
      }

      loadOrder();
    }, 0);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [ordenParam, nuevoParam, flotaParam, pasoParam]);

  const updateForm = (updates) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const updateEquipo = useCallback((index, updates) => {
    setFormData(prev => {
      const newEquipos = [...prev.equipos];
      newEquipos[index] = { ...newEquipos[index], ...updates };
      return { ...prev, equipos: newEquipos };
    });
  }, []);

  const addEquipo = () => {
    setFormData(prev => ({
      ...prev,
      equipos: [...prev.equipos, DEFAULT_EQUIPO(prev.equipos.length)]
    }));
    setActiveEquipoIndex(formData.equipos.length);
  };

  const removeEquipo = (index, e) => {
    if (e) e.stopPropagation();
    if (formData.equipos.length <= 1) return;
    setFormData(prev => {
      const newEquipos = prev.equipos.filter((_, i) => i !== index);
      return { ...prev, equipos: newEquipos };
    });
    if (activeEquipoIndex >= formData.equipos.length - 1) {
      setActiveEquipoIndex(Math.max(0, formData.equipos.length - 2));
    }
  };

  const currentRadio = formData.equipos[activeEquipoIndex] || formData.equipos[0];

  // Disparadores de acciones rápidas desde el Dashboard
  const handleNewOrder = () => {
    setOrdenId(null);
    setFormData({
      cliente: '',
      ordenServicio: '',
      moneda: 'BOB',
      equipos: [DEFAULT_EQUIPO(0)]
    });
    setActiveEquipoIndex(0);
    setActiveStep(1);
    setIsWizardOpen(true);
    router.push('/?nuevo=1');
  };

  const handleNewFleet = () => {
    setOrdenId(null);
    setFormData({
      cliente: '',
      ordenServicio: '',
      moneda: 'BOB',
      equipos: Array.from({ length: 5 }, (_, i) => DEFAULT_EQUIPO(i))
    });
    setActiveEquipoIndex(0);
    setActiveStep(1);
    setIsWizardOpen(true);
    router.push('/?flota=1');
  };

  const handleOpenOrder = (orderOrId, targetStep = 2) => {
    const id = typeof orderOrId === 'object' && orderOrId !== null ? orderOrId.id : orderOrId;
    setActiveStep(targetStep);
    setIsWizardOpen(true);
    router.push(`/?orden=${id}&paso=${targetStep}`);
  };

  const handleBackToDashboard = () => {
    setIsWizardOpen(false);
    router.push('/');
  };

  // Guardar diagnóstico del equipo activo vía PUT
  const handleSaveDiagnosis = async (diagnosisPayload) => {
    updateEquipo(activeEquipoIndex, diagnosisPayload);

    if (ordenId && currentRadio?.id) {
      try {
        setIsSaving(true);
        const res = await fetch(`/api/orders/${ordenId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            equipoId: currentRadio.id,
            diagnosis: diagnosisPayload
          })
        });
        const json = await res.json();
        if (json.success) {
          showToast(`Diagnóstico del Equipo ${activeEquipoIndex + 1} guardado en BD.`);
        } else {
          showToast(json.message || 'Error al guardar diagnóstico en BD', 'error');
        }
      } catch (err) {
        console.error(err);
        showToast('Error de conexión al guardar diagnóstico', 'error');
      } finally {
        setIsSaving(false);
      }
    } else {
      showToast(`Diagnóstico del Equipo ${activeEquipoIndex + 1} actualizado en memoria.`);
    }
  };

  const handleGuardarOrden = async (estadoFinal = 'BORRADOR') => {
    try {
      setIsSaving(true);
      const { OrdersService } = await import('@/lib/services/orders.service');
      
      const payload = {
        id: ordenId || undefined,
        cliente_id: null,
        razon_social: formData.cliente || 'Consumidor Final',
        recepcionista_nombre_manual: 'Recepción Mostrador',
        estado: estadoFinal,
        moneda: formData.moneda,
        tasa_cambio: 6.96,
        notas_internas: `Cliente: ${formData.cliente || 'Consumidor Final'} - Orden: ${formData.ordenServicio || 'S/N'}`,
        equipos: formData.equipos.map((eq, i) => {
          const accs = Object.keys(eq.accesoriosRecepcion || {}).map(nombre => ({
            accesorio_nombre: nombre,
            presencia: eq.accesoriosRecepcion[nombre] || 'SIN',
            antena_estado: nombre.toLowerCase() === 'antena' ? eq.antenaEstado : null,
            antena_modelo_sugerido: nombre.toLowerCase() === 'antena' ? eq.antenaModelo : null,
            bateria_modelo: nombre.toLowerCase().includes('bater') ? eq.bateriaModelo : null,
            bateria_serie: nombre.toLowerCase().includes('bater') ? eq.bateriaSerie : null,
            bateria_porcentaje_carga: nombre.toLowerCase().includes('bater') ? parseInt(eq.bateriaCarga, 10) || null : null,
            otros_descripcion: nombre.toLowerCase() === 'otros' ? eq.otrosDescripcion : null,
          }));

          return {
            orden_indice: i + 1,
            marca: eq.marca || 'Motorola',
            modelo: eq.modelo || 'DEP450',
            numero_serie: eq.serie || eq.numero_serie || `SER-${Date.now()}-${i}`,
            banda: eq.banda || 'VHF',
            falla_declarada_cliente: eq.falla_declarada_cliente || '',
            reparacion_rechazada: Boolean(eq.reparacion_rechazada),
            motivo_rechazo: eq.motivo_rechazo || null,
            texto_diagnostico: eq.texto_diagnostico || '',
            descripcion_servicio: eq.descripcion_servicio || 'Mantenimiento preventivo y calibración RF',
            costo_servicio: parseFloat(eq.costo_servicio) || 0,
            accesorios: accs,
            fallas: eq.fallas || [],
            repuestos: eq.repuestos || []
          };
        })
      };

      const nuevaOrden = await OrdersService.saveOrder(payload);

      if (nuevaOrden) {
        setOrdenId(nuevaOrden.id);
        showToast(`Orden #${nuevaOrden.numero_orden || nuevaOrden.id} guardada exitosamente en el ERP América SIS!`);
        // Only redirect if it's not already viewing the order
        if (!ordenParam) {
          router.push(`/?orden=${nuevaOrden.id}`);
        }
      } else {
        showToast('No se pudo guardar la orden de servicio.', 'error');
      }
    } catch (err) {
      console.error('Error guardando orden:', err);
      showToast('Error de red al guardar la orden', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFinishOrder = async () => {
    await handleGuardarOrden('EN_DIAGNOSTICO'); // Pasa al área de laboratorio
    showToast('Orden completada y registrada en el ERP América SIS.');
  };

  return (
    <div>
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-4 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl text-sm font-semibold flex items-center gap-2 animate-in slide-in-from-top-4 ${
          notification.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
        }`}>
          {notification.message}
        </div>
      )}

      {/* VISTA WIZARD DE 4 PASOS */}
      <div className="space-y-4">
        <div className="pb-28 sm:pb-32 animate-slideUp">
          
          {/* Barra de Retorno al Dashboard */}
          <div className="mb-6 flex items-center justify-between border-b border-slate-200/80 pb-3 print:hidden">
            <button
              type="button"
              onClick={handleBackToDashboard}
              className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-navy bg-white hover:bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200 shadow-sm transition-all"
            >
              <ArrowLeft size={15} />
              <span>Volver al Centro de Comando (Dashboard)</span>
            </button>

            <span className="text-xs font-mono font-bold text-navy bg-slate-100 px-3 py-1 rounded-lg">
              {ordenId ? `Orden en Taller #${formData.ordenServicio || ordenId}` : 'Nueva Orden en Proceso'}
            </span>
          </div>

          {/* Step Indicator Central */}
          <StepIndicator 
            currentStep={activeStep} 
            onStepClick={(stepId) => setActiveStep(stepId)} 
          />

          {/* Contenido Dinámico por Paso */}
          <div className="mt-1 sm:mt-2">
            {activeStep === 1 && (
              <Step1Reception
                formData={formData}
                updateForm={updateForm}
                updateEquipo={updateEquipo}
                activeEquipoIndex={activeEquipoIndex}
                setActiveEquipoIndex={setActiveEquipoIndex}
                addEquipo={addEquipo}
                removeEquipo={removeEquipo}
                onNext={() => setActiveStep(2)}
              />
            )}

            {activeStep === 2 && (
              <Step2Diagnosis 
                key={currentRadio?.id || activeEquipoIndex}
                equipo={currentRadio}
                moneda={formData.moneda}
                tasaCambio={6.96}
                onChange={(diagData) => updateEquipo(activeEquipoIndex, diagData)}
                onSave={handleSaveDiagnosis}
                isLoading={isSaving}
              />
            )}

            {activeStep === 3 && (
              <Step3Pricing
                formData={formData}
                updateForm={updateForm}
                updateEquipo={updateEquipo}
                activeEquipoIndex={activeEquipoIndex}
                setActiveEquipoIndex={setActiveEquipoIndex}
                currentUser={currentUser}
                userRole={currentUser?.rol}
                onNext={() => setActiveStep(4)}
                onPrevious={() => setActiveStep(2)}
              />
            )}

            {activeStep === 4 && (
              <Step4ReportPreview
                formData={formData}
                updateForm={updateForm}
                currentUser={currentUser}
                userRole={currentUser?.rol}
                onPrevious={() => setActiveStep(3)}
              />
            )}
          </div>

          {/* Footer Flotante Fijo Inferior */}
          <WizardFooter 
            currentStep={activeStep}
            totalSteps={4}
            onPrev={() => setActiveStep(prev => Math.max(1, prev - 1))}
            onNext={() => setActiveStep(prev => Math.min(4, prev + 1))}
            onSave={handleGuardarOrden}
            onFinish={handleFinishOrder}
            isSaving={isSaving}
          />
        </div>
      </div>
    </div>
  );
}

export default function OrderWizard() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Cargando Wizard...</div>}>
      <ServiceOrderWizardContent />
    </Suspense>
  );
}
