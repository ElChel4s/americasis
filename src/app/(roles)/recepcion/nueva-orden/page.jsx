"use client";

import React, { useState } from 'react';
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
  const handleRegistrarYEnviarATaller = async () => {
    if (!formData.cliente.trim()) {
      setErrorMsg('Por favor ingrese el nombre del cliente o razón social.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const payload = {
        ...formData,
        razon_social: formData.cliente.trim(),
        total_equipos: formData.equipos.length,
        estado: 'RECIBIDO',
        estado_global: 'RECIBIDO'
      };

      await OrdersService.saveOrder(payload);
      router.push('/recepcion/inicio');
    } catch (err) {
      console.error('Error al registrar orden:', err);
      setErrorMsg('No se pudo guardar la orden de servicio. Intente nuevamente.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 font-sans">
      {/* Barra Superior de Retorno */}
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
        <button
          type="button"
          onClick={() => router.push('/recepcion/inicio')}
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-gray-900 bg-white hover:bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs transition-all cursor-pointer"
        >
          <ArrowLeft size={15} />
          <span>Volver al Tablero de Recepción</span>
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
