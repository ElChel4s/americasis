"use client";

import React, { useMemo, useEffect } from 'react';
import {
  DollarSign, Wrench, ShieldCheck, AlertCircle, Plus, Trash2,
  FileText, Clock, Calendar, CheckSquare, Sparkles, ShieldAlert,
  Info, Check, ChevronRight, Lock
} from 'lucide-react';
import EquipmentTabs from '@/components/orders/EquipmentTabs';
import {
  formatCurrency,
  getImporteLiteral,
  CLAUSULA_CAMBIARIA_USD,
  DEFAULT_REVISION_COST,
  normalizeCurrency
} from '@/lib/utils/currencyFormat';

const GARANTIA_OPTIONS = [
  {
    id: 'ESTANDAR_5_DIAS',
    label: 'Garantía Estándar (5 días)',
    desc: 'Equipos operativos estándar',
    texto: '5 días calendario a partir de la entrega para verificación operativa de los trabajos realizados.'
  },
  {
    id: 'DIAS_30',
    label: 'Garantía Extendida (30 días)',
    desc: 'Reparación integral con repuestos nuevos',
    texto: '30 días calendario por el mismo trabajo realizado y repuestos cambiados, no cubre golpes, humedad ni sobrecargas.'
  },
  {
    id: 'SIN_GARANTIA',
    label: 'Sin Garantía',
    desc: 'Modelos descontinuados o daño por agua',
    texto: 'Sin garantía debido a tratarse de modelo descontinuado/antiguo o presentar daños severos previos por sulfato/humedad.'
  }
];

export default function Step3Budget({
  formData = { moneda: 'BOB', equipos: [], condiciones: {} },
  updateForm,
  updateEquipo,
  activeEquipoIndex = 0,
  setActiveEquipoIndex,
  currentUser,
  userRole,
  onNext,
  onPrevious
}) {
  const isTecnico = (userRole || currentUser?.rol) === 'TECNICO';
  const moneda = normalizeCurrency(formData.moneda || 'BOB');

  // Inicializar condiciones comerciales si no existen
  const condiciones = useMemo(() => {
    return {
      incluirConclusiones: false,
      conclusiones: [
        'Los equipos operan en ambientes industriales con exposición a polvo y vibraciones mecánicas.',
        'Se recomienda programar limpiezas y calibración preventiva periódica cada 6 meses.'
      ],
      incluirGarantiaBaterias: true,
      diasVigencia: 5,
      tiempoEntrega: '1 a 2 semanas',
      costoRevision: DEFAULT_REVISION_COST[moneda],
      tipoGarantia: 'ESTANDAR_5_DIAS',
      textoGarantia: GARANTIA_OPTIONS[0].texto,
      referenciaAdicional: '',
      ...(formData.condiciones || {})
    };
  }, [formData.condiciones, moneda]);

  const updateCondiciones = (updates) => {
    if (isTecnico) return;
    updateForm({
      condiciones: {
        ...condiciones,
        ...updates
      }
    });
  };

  // Cambio de moneda: actualiza el costo de revisión por defecto
  const handleMonedaChange = (newMoneda) => {
    if (isTecnico) return;
    const defaultCost = DEFAULT_REVISION_COST[newMoneda];
    updateForm({
      moneda: newMoneda,
      condiciones: {
        ...condiciones,
        costoRevision: defaultCost
      }
    });

    // Si algún equipo tiene marcado "no autorizó", actualizar su costo al nuevo costo de revisión
    formData.equipos.forEach((eq, idx) => {
      if (eq.no_autorizo_revision) {
        updateEquipo(idx, { costo_servicio: defaultCost });
      }
    });
  };

  const equipo = formData.equipos[activeEquipoIndex] || {};

  // Auto-generación de descripción de servicio basada en fallas y repuestos de Fase 2
  const generarDescripcionTrabajo = (eq) => {
    if (eq.no_autorizo_revision) {
      return '(El cliente no autorizo la reparación, solo se cobra el servicio de revisión y diagnostico)';
    }

    const componentes = [];
    if (eq.fallas && eq.fallas.length > 0) {
      eq.fallas.forEach(f => {
        if (f.label) componentes.push(f.label.toLowerCase());
      });
    }
    if (eq.repuestos && eq.repuestos.length > 0) {
      eq.repuestos.filter(r => r.se_reemplaza).forEach(r => {
        if (r.nombre) componentes.push(r.nombre.toLowerCase());
      });
    }

    const compTexto = componentes.length > 0 
      ? `cambio de ${Array.from(new Set(componentes)).slice(0, 3).join(', ')}, ` 
      : '';

    return `(Servicio técnico, ${compTexto}revisión general, limpieza, ajuste-calibración de parámetros y mantenimiento general)`;
  };

  // Efecto para precargar descripción si está vacía
  useEffect(() => {
    if (equipo && !equipo.descripcion_servicio && formData.equipos.length > 0) {
      const desc = generarDescripcionTrabajo(equipo);
      updateEquipo(activeEquipoIndex, { descripcion_servicio: desc });
    }
  }, [activeEquipoIndex, equipo?.no_autorizo_revision]);

  // Manejo de toggle "no autorizó reparación"
  const handleToggleNoAutorizo = (checked) => {
    if (isTecnico) return;
    const revCost = condiciones.costoRevision || DEFAULT_REVISION_COST[moneda];
    updateEquipo(activeEquipoIndex, {
      no_autorizo_revision: checked,
      costo_servicio: checked ? revCost : (equipo.costo_servicio || 150),
      descripcion_servicio: checked 
        ? '(El cliente no autorizo la reparación, solo se cobra el servicio de revisión y diagnostico)'
        : generarDescripcionTrabajo({ ...equipo, no_autorizo_revision: false })
    });
  };

  // Cálculo de Subtotal 1 (Servicio técnico de todos los equipos)
  const subtotal1 = useMemo(() => {
    return formData.equipos.reduce((sum, eq) => {
      if (eq.reparacion_rechazada && !eq.no_autorizo_revision) return sum;
      return sum + (parseFloat(eq.costo_servicio) || 0);
    }, 0);
  }, [formData.equipos]);

  // Cálculo de Subtotal 2 (Accesorios de todos los equipos)
  const todosAccesorios = useMemo(() => {
    const list = [];
    formData.equipos.forEach((eq, eqIdx) => {
      // Repuestos cotizados en Fase 2
      (eq.repuestos || []).forEach((rep, repIdx) => {
        if (rep.se_reemplaza) {
          list.push({
            id: `rep-${eqIdx}-${repIdx}`,
            equipoIdx: eqIdx,
            equipoNombre: `${eq.marca} ${eq.modelo || `Eq. ${eqIdx + 1}`}`,
            nombre: rep.nombre || 'Repuesto / Accesorio',
            cantidad: parseInt(rep.cantidad, 10) || 1,
            precio: parseFloat(rep.precio) || 0,
            es_opcional: Boolean(rep.es_opcional)
          });
        }
      });

      // Si la antena fue sugerida para reemplazo en Fase 1
      if (eq.antenaEstado === 'REEMPLAZO' && !(eq.repuestos || []).some(r => r.nombre?.toLowerCase().includes('antena'))) {
        list.push({
          id: `ant-${eqIdx}`,
          equipoIdx: eqIdx,
          equipoNombre: `${eq.marca} ${eq.modelo || `Eq. ${eqIdx + 1}`}`,
          nombre: `Antena ${eq.banda || 'VHF'} (${eq.antenaModelo || 'Original'})`,
          cantidad: 1,
          precio: moneda === 'USD' ? 25 : 175,
          es_opcional: true,
          origen: 'fase1'
        });
      }

      // Si la batería fue sugerida para reemplazo en Fase 1 o baja carga
      if ((eq.bateriaEstado === 'REEMPLAZO' || (parseInt(eq.bateriaCarga, 10) > 0 && parseInt(eq.bateriaCarga, 10) < 70)) && !(eq.repuestos || []).some(r => r.nombre?.toLowerCase().includes('bater'))) {
        list.push({
          id: `bat-${eqIdx}`,
          equipoIdx: eqIdx,
          equipoNombre: `${eq.marca} ${eq.modelo || `Eq. ${eqIdx + 1}`}`,
          nombre: `Batería Li-Ion ${eq.bateriaModelo || 'Alta Capacidad'}`,
          cantidad: 1,
          precio: moneda === 'USD' ? 55 : 380,
          es_opcional: false,
          origen: 'fase1'
        });
      }
    });
    return list;
  }, [formData.equipos, moneda]);

  // Actualizar un accesorio en la lista
  const handleUpdateAccesorio = (accItem, field, value) => {
    if (isTecnico) return;
    const eq = formData.equipos[accItem.equipoIdx];
    if (!eq) return;

    const repuestos = [...(eq.repuestos || [])];
    const repIndex = repuestos.findIndex(r => r.nombre === accItem.nombre);

    if (repIndex >= 0) {
      repuestos[repIndex] = {
        ...repuestos[repIndex],
        [field]: field === 'precio' || field === 'cantidad' ? parseFloat(value) || 0 : value
      };
      updateEquipo(accItem.equipoIdx, { repuestos });
    } else {
      // Si era sugerencia de Fase 1, se integra a repuestos de Fase 2
      const nuevoRep = {
        nombre: accItem.nombre,
        cantidad: accItem.cantidad,
        precio: accItem.precio,
        se_reemplaza: true,
        es_opcional: accItem.es_opcional,
        [field]: field === 'precio' || field === 'cantidad' ? parseFloat(value) || 0 : value
      };
      updateEquipo(accItem.equipoIdx, { repuestos: [...repuestos, nuevoRep] });
    }
  };

  // Subtotal 2 de accesorios (suma todos los accesorios cotizados)
  const subtotal2 = useMemo(() => {
    return todosAccesorios.reduce((sum, item) => {
      return sum + (item.cantidad * item.precio);
    }, 0);
  }, [todosAccesorios]);

  // Sumatoria total general
  const sumatoriaTotal = useMemo(() => {
    return subtotal1 + subtotal2;
  }, [subtotal1, subtotal2]);

  return (
    <div className="space-y-6 animate-slideUp font-sans pb-16">
      {/* Aviso de Modo Solo Lectura para Técnicos */}
      {isTecnico && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center gap-3 text-amber-800 text-xs sm:text-sm font-medium">
          <Lock size={18} className="text-amber-600 shrink-0" />
          <span>
            <strong>Modo Consulta Técnica:</strong> Su perfil tiene acceso de visualización. Los precios, moneda de cobro y condiciones comerciales son administrados exclusivamente por Recepción y Gerencia.
          </span>
        </div>
      )}

      {/* Cabecera del Paso */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            Fase 3: Presupuesto y Términos Comerciales
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Defina la moneda oficial, mano de obra por radio y condiciones para el informe formal.
          </p>
        </div>

        {/* 1. Selector Dual de Moneda (Bs. vs Usd.) */}
        <div className="flex items-center gap-1.5 p-1.5 bg-slate-200/80 rounded-2xl shrink-0 self-start sm:self-auto">
          <button
            type="button"
            disabled={isTecnico}
            onClick={() => handleMonedaChange('BOB')}
            className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              moneda === 'BOB'
                ? 'bg-white text-gray-900 shadow-md ring-1 ring-slate-300'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <span>Bolivianos</span>
            <span className={`text-[10px] px-2 py-0.5 rounded font-black ${
              moneda === 'BOB' ? 'bg-red-50 text-[#E30613]' : 'bg-slate-300 text-gray-600'
            }`}>
              Bs.
            </span>
          </button>

          <button
            type="button"
            disabled={isTecnico}
            onClick={() => handleMonedaChange('USD')}
            className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              moneda === 'USD'
                ? 'bg-white text-gray-900 shadow-md ring-1 ring-slate-300'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <span>Dólares</span>
            <span className={`text-[10px] px-2 py-0.5 rounded font-black ${
              moneda === 'USD' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-300 text-gray-600'
            }`}>
              Usd.
            </span>
          </button>
        </div>
      </div>

      {/* Tabs de Selección de Equipos de la Flota */}
      <EquipmentTabs
        equipos={formData.equipos}
        activeIndex={activeEquipoIndex}
        onSelect={setActiveEquipoIndex}
        showAdd={false}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* COLUMNA IZQUIERDA: DESGLOSE DE COSTOS (SUBTOTAL 1 Y 2) */}
        <div className="lg:col-span-7 space-y-6">
          {/* 2. Desglose Económico por Equipos (Subtotal 1) */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-red-50 text-[#E30613] rounded-xl">
                  <Wrench size={18} />
                </span>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">
                    Sub total 1: Servicio Técnico y Mano de Obra
                  </h3>
                  <p className="text-xs text-gray-400">
                    Radio seleccionado: {equipo.marca} {equipo.modelo} — Serie: {equipo.serie || equipo.numero_serie || 'S/N'}
                  </p>
                </div>
              </div>
            </div>

            {/* Checkbox: Cliente No Autorizó la Reparación */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-3">
              <input
                type="checkbox"
                id={`check-no-autorizo-${activeEquipoIndex}`}
                disabled={isTecnico}
                checked={Boolean(equipo.no_autorizo_revision)}
                onChange={(e) => handleToggleNoAutorizo(e.target.checked)}
                className="mt-1 h-4 w-4 rounded text-red-600 focus:ring-red-500 cursor-pointer"
              />
              <label htmlFor={`check-no-autorizo-${activeEquipoIndex}`} className="text-xs text-gray-700 font-medium cursor-pointer">
                <strong className="block text-gray-900 font-bold">
                  El cliente no autorizó la reparación (solo cobro de revisión)
                </strong>
                Si se activa, se aplica automáticamente la nota legal y el monto fijo de revisión acordado ({formatCurrency(condiciones.costoRevision, moneda)}).
              </label>
            </div>

            {/* Monto de Mano de Obra */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                  Mano de Obra / Servicio Técnico ({moneda === 'USD' ? 'Usd.' : 'Bs.'})
                </label>
                {equipo.no_autorizo_revision && (
                  <span className="text-[11px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                    Tarifa de Revisión Aplicada
                  </span>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-gray-400 text-base">
                  {moneda === 'USD' ? 'Usd.' : 'Bs.'}
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  disabled={isTecnico}
                  value={equipo.costo_servicio !== undefined ? equipo.costo_servicio : ''}
                  onChange={(e) => updateEquipo(activeEquipoIndex, { costo_servicio: e.target.value })}
                  placeholder="0.00"
                  className="w-full pl-16 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xl font-black text-gray-900 focus:outline-none focus:bg-white focus:border-[#E30613] disabled:bg-slate-100 disabled:text-gray-500"
                />
              </div>
            </div>

            {/* Descripción Técnica del Trabajo a realizar */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-gray-700 block mb-1.5">
                Descripción del Trabajo Técnico Realizado / Por Realizar
              </label>
              <textarea
                rows={3}
                disabled={isTecnico}
                value={equipo.descripcion_servicio || ''}
                onChange={(e) => updateEquipo(activeEquipoIndex, { descripcion_servicio: e.target.value })}
                placeholder="(Servicio técnico, revisión general, limpieza, ajuste-calibración de parámetros y mantenimiento general)"
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-gray-800 focus:outline-none focus:bg-white focus:border-[#E30613] disabled:bg-slate-100 leading-relaxed"
              />
              <p className="text-[11px] text-gray-400 mt-1 italic">
                Este texto aparecerá textualmente entre paréntesis debajo del equipo en la cotización oficial.
              </p>
            </div>

            {/* Total parcial Subtotal 1 */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs sm:text-sm font-bold">
              <span className="text-gray-500">Sub total 1 Servicio Técnico (Todos los radios):</span>
              <span className="font-mono text-gray-900 text-base font-black">
                {formatCurrency(subtotal1, moneda)}
              </span>
            </div>
          </div>

          {/* 3. Desglose de Accesorios y Repuestos (Subtotal 2) */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <ShieldCheck size={18} />
                </span>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">
                    Sub total 2: Accesorios y Repuestos Cotizados
                  </h3>
                  <p className="text-xs text-gray-400">
                    Piezas marcadas para reemplazo en Fase 1 y 2
                  </p>
                </div>
              </div>
            </div>

            {todosAccesorios.length === 0 ? (
              <div className="p-6 text-center text-gray-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs">
                No hay accesorios o repuestos marcados con reemplazo para esta orden.
              </div>
            ) : (
              <div className="space-y-3">
                {todosAccesorios.map((item) => {
                  const itemSubtotal = item.cantidad * item.precio;
                  return (
                    <div
                      key={item.id}
                      className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-800 text-sm">{item.nombre}</span>
                          {item.es_opcional && (
                            <span className="text-[10px] font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                              Opcional
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-gray-400 block mt-0.5">
                          Para: {item.equipoNombre}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 flex-wrap">
                        {/* Cantidad */}
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-gray-400 uppercase font-bold">Cant:</span>
                          <input
                            type="number"
                            min="1"
                            disabled={isTecnico}
                            value={item.cantidad}
                            onChange={(e) => handleUpdateAccesorio(item, 'cantidad', e.target.value)}
                            className="w-14 px-2 py-1 bg-white border border-slate-200 rounded-lg text-center font-mono font-bold"
                          />
                        </div>

                        {/* Precio Unitario */}
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-gray-400 uppercase font-bold">P.U:</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            disabled={isTecnico}
                            value={item.precio}
                            onChange={(e) => handleUpdateAccesorio(item, 'precio', e.target.value)}
                            className="w-20 px-2 py-1 bg-white border border-slate-200 rounded-lg text-right font-mono font-bold"
                          />
                        </div>

                        {/* Checkbox Opcional */}
                        <label className="flex items-center gap-1.5 text-[11px] text-gray-600 font-medium cursor-pointer">
                          <input
                            type="checkbox"
                            disabled={isTecnico}
                            checked={item.es_opcional}
                            onChange={(e) => handleUpdateAccesorio(item, 'es_opcional', e.target.checked)}
                            className="rounded text-amber-600 cursor-pointer"
                          />
                          <span>Opcional</span>
                        </label>

                        {/* Total Línea */}
                        <span className="font-mono font-black text-gray-900 min-w-[90px] text-right">
                          {formatCurrency(itemSubtotal, moneda)}
                        </span>
                      </div>
                    </div>
                  );
                })}

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs sm:text-sm font-bold">
                  <span className="text-gray-500">Sub total 2 Accesorios y Repuestos:</span>
                  <span className="font-mono text-gray-900 text-base font-black">
                    {formatCurrency(subtotal2, moneda)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* COLUMNA DERECHA: RESUMEN EJECUTIVO Y PARÁMETROS COMERCIALES */}
        <div className="lg:col-span-5 space-y-6">
          {/* 4. Tarjeta Ejecutiva Navy (#0B1B2B) con Sumatoria Total e Importe Literal */}
          <div className="bg-[#0B1B2B] text-white rounded-3xl p-6 sm:p-7 shadow-xl relative overflow-hidden space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#E30613]">
                Liquidación Económica
              </span>
              <span className="text-xs font-mono font-bold bg-white/10 px-2.5 py-1 rounded-lg">
                {moneda === 'USD' ? 'DÓLARES (Usd.)' : 'BOLIVIANOS (Bs.)'}
              </span>
            </div>

            {/* Desglose resumido */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-gray-300">
                <span>Sub total 1 (Servicio técnico):</span>
                <span className="font-mono font-bold">{formatCurrency(subtotal1, moneda)}</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Sub total 2 (Accesorios/Repuestos):</span>
                <span className="font-mono font-bold">{formatCurrency(subtotal2, moneda)}</span>
              </div>
            </div>

            {/* Sumatoria Total */}
            <div className="pt-3 border-t border-white/10 text-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                SUMATORIA TOTAL: Servicio técnico + Accesorios
              </span>
              <div className="text-3xl sm:text-4xl font-black text-white tracking-tight drop-shadow font-mono">
                {formatCurrency(sumatoriaTotal, moneda)}
              </div>
            </div>

            {/* Importe Literal Oficial */}
            <div className="p-3.5 bg-white/5 border border-white/10 rounded-2xl">
              <p className="text-[11px] leading-relaxed font-bold uppercase text-gray-200">
                {getImporteLiteral(sumatoriaTotal, moneda)}
              </p>

              {/* Cláusula cambiaria obligatoria para USD */}
              {moneda === 'USD' && (
                <p className="text-[11px] font-bold text-amber-300 mt-2.5 pt-2 border-t border-white/10 leading-relaxed">
                  {CLAUSULA_CAMBIARIA_USD}
                </p>
              )}
            </div>
          </div>

          {/* 5. Configuración de Parámetros y Cláusulas del Documento */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-5">
            <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider flex items-center gap-2">
              <FileText size={16} className="text-[#E30613]" />
              <span>Condiciones y Parámetros del Documento</span>
            </h3>

            {/* Selector de Garantía */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-2">
                Garantía de Reparación
              </label>
              <div className="space-y-2">
                {GARANTIA_OPTIONS.map((opt) => (
                  <label
                    key={opt.id}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer text-xs ${
                      condiciones.tipoGarantia === opt.id
                        ? 'bg-red-50/60 border-red-300 text-gray-900 font-bold'
                        : 'bg-slate-50 border-slate-200 text-gray-600 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="radio"
                      name="tipoGarantia"
                      disabled={isTecnico}
                      checked={condiciones.tipoGarantia === opt.id}
                      onChange={() => updateCondiciones({ tipoGarantia: opt.id, textoGarantia: opt.texto })}
                      className="mt-0.5 text-red-600 cursor-pointer"
                    />
                    <div>
                      <span className="block font-bold">{opt.label}</span>
                      <span className="text-[10px] text-gray-500 font-normal">{opt.desc}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Switches de Cláusulas */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              {/* Switch Conclusiones / Recomendaciones */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-gray-800 block">
                    Sección Conclusiones / Recomendaciones
                  </span>
                  <span className="text-[11px] text-gray-400">
                    Muestra viñetas de análisis técnico antes de los precios
                  </span>
                </div>
                <input
                  type="checkbox"
                  disabled={isTecnico}
                  checked={condiciones.incluirConclusiones}
                  onChange={(e) => updateCondiciones({ incluirConclusiones: e.target.checked })}
                  className="h-4 w-4 rounded text-red-600 cursor-pointer"
                />
              </div>

              {/* Switch Garantía Baterías */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-gray-800 block">
                    Garantía de Baterías Nuevas (3 meses)
                  </span>
                  <span className="text-[11px] text-gray-400">
                    Incluye la cláusula de prueba para baterías adquiridas
                  </span>
                </div>
                <input
                  type="checkbox"
                  disabled={isTecnico}
                  checked={condiciones.incluirGarantiaBaterias}
                  onChange={(e) => updateCondiciones({ incluirGarantiaBaterias: e.target.checked })}
                  className="h-4 w-4 rounded text-red-600 cursor-pointer"
                />
              </div>
            </div>

            {/* Inputs editables de términos */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                  Vigencia Informe
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    disabled={isTecnico}
                    value={condiciones.diasVigencia}
                    onChange={(e) => updateCondiciones({ diasVigencia: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-gray-800"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">días</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                  Tiempo Entrega
                </label>
                <input
                  type="text"
                  disabled={isTecnico}
                  value={condiciones.tiempoEntrega}
                  onChange={(e) => updateCondiciones({ tiempoEntrega: e.target.value })}
                  placeholder="1 a 2 semanas"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-gray-800"
                />
              </div>
            </div>

            {/* Costo de revisión por no autorización */}
            <div>
              <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                Costo Revisión por No Autorización ({moneda === 'USD' ? 'Usd.' : 'Bs.'})
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                disabled={isTecnico}
                value={condiciones.costoRevision}
                onChange={(e) => updateCondiciones({ costoRevision: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-gray-800"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
