"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import Step1Reception from '@/components/orders/Step1Reception';
import { OrdersService } from '@/lib/services/orders.service';

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
    'Cargador de Base': 'SIN',
    'Clip de Cinturón': 'SIN',
    'Otros': 'SIN'
  },
  falla_declarada_cliente: '',
  estado_individual: 'RECIBIDO',
  imagenes: []
});

export default function NuevaOrdenPage() {
  const router = useRouter();
  const [activeEquipoIndex, setActiveEquipoIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
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

  const [formData, setFormData] = useState({
    cliente: '',
    telefono: '',
    nit: '',
    ordenServicio: `OS-${Math.floor(Math.random() * 90000) + 10000}`,
    moneda: 'BOB',
    equipos: [DEFAULT_EQUIPO(0)]
  });

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
    if (formData.equipos.length >= 10) return;
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

  // Botón final de guardado exigido: [ Registrar Orden y Enviar a Taller ] -> estado RECIBIDO -> /recepcion/inicio
  const handleRegistrarYEnviarATaller = async (e) => {
    if (e?.preventDefault) {
      e.preventDefault();
    }

    if (!formData.cliente || !formData.cliente.trim()) {
      const msg = 'Por favor ingrese el nombre del cliente o razón social.';
      setErrorMsg(msg);
      alert(msg);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!formData.equipos || formData.equipos.length === 0) {
      const msg = 'Debe registrar al menos un equipo en la orden de servicio.';
      setErrorMsg(msg);
      alert(msg);
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      // 1. Sanitizar y mapear el payload (eliminar objetos File no serializables y transformar accesorios)
      const equiposSanitizados = formData.equipos.map((eq, i) => {
        const accs = Array.isArray(eq.accesorios) && eq.accesorios.length > 0
          ? eq.accesorios
          : Object.entries(eq.accesoriosRecepcion || {}).map(([nombre, presencia]) => ({
              accesorio_nombre: nombre,
              presencia: presencia || 'CON',
              antena_estado: eq.antenaEstado || null,
              antena_modelo_sugerido: eq.antenaModelo || null,
              bateria_modelo: eq.bateriaModelo || null,
              bateria_serie: eq.bateriaSerie || null,
              bateria_porcentaje_carga: parseInt(eq.bateriaCarga, 10) || null,
              otros_descripcion: eq.otrosDescripcion || null
            }));

        const imagenesSanitizadas = (eq.imagenes || []).map((img, imgIdx) => ({
          id: img.id || `img-${i}-${imgIdx}-${Date.now()}`,
          url: typeof img.url === 'string' ? img.url : '',
          name: img.name || `Evidencia ${imgIdx + 1}`,
          etapa: img.etapa || 'RECEPCION',
          sizeKb: img.sizeKb || null
        }));

        return {
          id: eq.id,
          orden_indice: i + 1,
          marca: eq.marca || 'Motorola',
          modelo: eq.modelo || '',
          numero_serie: (eq.serie || eq.numero_serie || `SER-${Date.now()}-${i}`).toUpperCase().trim(),
          serie: (eq.serie || eq.numero_serie || `SER-${Date.now()}-${i}`).toUpperCase().trim(),
          banda: eq.banda || 'VHF',
          falla_declarada_cliente: eq.falla_declarada_cliente || '',
          estado_individual: 'RECIBIDO',
          accesorios: accs,
          accesoriosRecepcion: eq.accesoriosRecepcion || {},
          imagenes: imagenesSanitizadas
        };
      });

      const payload = {
        ...formData,
        razon_social: formData.cliente.trim(),
        total_equipos: equiposSanitizados.length,
        estado: 'RECIBIDO',
        estado_global: 'RECIBIDO',
        equipos: equiposSanitizados
      };

      console.log('Iniciando guardado de orden...', payload);

      const savedOrder = await OrdersService.saveOrder(payload);

      if (!savedOrder) {
        throw new Error('El servicio de órdenes no devolvió la confirmación del guardado.');
      }

      console.log('Orden guardada exitosamente:', savedOrder);
      const returnUrl = userRole === 'ADMINISTRADOR' ? '/admin/inicio' : '/recepcion/inicio';
      router.push(returnUrl);
    } catch (error) {
      console.error("Error al guardar la orden:", error);
      const errMsg = error.message || "Error desconocido";
      setErrorMsg("No se pudo guardar la orden: " + errMsg);
      alert("No se pudo guardar la orden: " + errMsg);
      setIsSubmitting(false);
    }
  };

  const returnUrl = userRole === 'ADMINISTRADOR' ? '/admin/inicio' : '/recepcion/inicio';

  return (
    <div className="space-y-6 pb-20 font-sans">
      {/* Barra Superior de Retorno */}
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
        <button
          type="button"
          onClick={() => router.push(returnUrl)}
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-gray-900 bg-white hover:bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs transition-all cursor-pointer"
        >
          <ArrowLeft size={15} />
          <span suppressHydrationWarning>{userRole === 'ADMINISTRADOR' ? 'Volver al Panel de Gerencia' : 'Volver al Tablero de Recepción'}</span>
        </button>

        <span className="text-xs font-mono font-bold text-[#E30613] bg-red-50 border border-red-200 px-3 py-1 rounded-xl">
          Fase 1: Ingreso de Equipos (#{formData.ordenServicio})
        </span>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm font-semibold flex items-center gap-2 animate-in fade-in">
          <AlertCircle size={18} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Formulario Fase 1 */}
      <Step1Reception
        formData={formData}
        updateForm={updateForm}
        updateEquipo={updateEquipo}
        addEquipo={addEquipo}
        removeEquipo={removeEquipo}
        activeEquipoIndex={activeEquipoIndex}
        setActiveEquipoIndex={setActiveEquipoIndex}
      />

      {/* Botón Final Destacado: Registrar Orden y Enviar a Taller */}
      <div className="sticky bottom-4 z-40 bg-white/95 backdrop-blur-md p-4 rounded-3xl border border-slate-200 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 max-w-5xl mx-auto">
        <div>
          <h4 className="font-bold text-gray-900 text-sm">
            ¿Recepción completada para {formData.equipos.length} radio(s)?
          </h4>
          <p className="text-xs text-gray-500">
            Al registrar, la orden pasará a estado <strong>RECIBIDO</strong> y estará disponible en la mesa del técnico.
          </p>
        </div>

        <button
          type="button"
          disabled={isSubmitting}
          onClick={handleRegistrarYEnviarATaller}
          id="btn-registrar-enviar-taller"
          className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 active:scale-[0.98] text-white font-black text-sm rounded-2xl shadow-xl shadow-red-600/30 flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-60"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Registrando orden...</span>
            </>
          ) : (
            <>
              <Send size={18} />
              <span>Registrar Orden y Enviar a Taller</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
