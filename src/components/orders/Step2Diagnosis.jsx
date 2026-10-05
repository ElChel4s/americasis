"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Cpu, 
  Mic, 
  MicOff, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  Check, 
  Camera, 
  Search, 
  X, 
  FileText, 
  ShieldCheck, 
  Loader2 
} from 'lucide-react';
import QrMobileModal from '@/components/modals/QrMobileModal';

// Lista de los 10 accesorios estándar requeridos
const ACCESORIOS_DEFAULT = [
  'Antena',
  'Batería',
  'Cargador completo',
  'Clip de cinturón',
  'Micrófono externo',
  'Adaptador',
  'Base de cargador',
  'Micrófono de radio',
  'Cable de alimentación',
  'Fuente de poder'
];

const CATEGORIAS_FALLAS = [
  { id: 'TODAS', label: 'Todas' },
  { id: 'TX', label: 'TX (Transmisión)' },
  { id: 'RX', label: 'RX (Recepción)' },
  { id: 'AUDIO', label: 'Audio & Micro' },
  { id: 'ALIMENTACION', label: 'Alimentación' },
  { id: 'LOGICA', label: 'Lógica & Display' },
  { id: 'CHASIS', label: 'Chasis & Conectores' },
];

const FALLAS_PLACA_PREDEFINIDAS = [
  // TX
  { codigo: 'ETAPA_TX', categoria: 'TX', label: 'Etapa TX Inoperativa', descripcion: 'Circuito transmisor sin emisión de portadora RF' },
  { codigo: 'MODULO_POTENCIA', categoria: 'TX', label: 'Módulo P.A. Degradado', descripcion: 'Potencia baja (<1.5 Watts) o transistores finales dañados' },
  { codigo: 'FRECUENCIA_DESPLAZADA', categoria: 'TX', label: 'Frecuencia Desplazada', descripcion: 'Oscilador descalibrado, error de frecuencia > 500 Hz' },
  { codigo: 'DISTORSION_TX', categoria: 'TX', label: 'Modulación TX Distorsionada', descripcion: 'Audio recortado o sobremodulación por desviador defectuoso' },
  { codigo: 'PTT_SWITCH', categoria: 'TX', label: 'Pulsador PTT Roto', descripcion: 'Microswitch lateral no conmuta a transmisión' },

  // RX
  { codigo: 'ETAPA_RX', categoria: 'RX', label: 'Etapa RX Sorda / Débil', descripcion: 'Sensibilidad degradada, no recibe señales lejanas' },
  { codigo: 'SQUELCH_ABIERTO', categoria: 'RX', label: 'Squelch Abierto Permanente', descripcion: 'Ruido blanco constante sin silenciamiento' },
  { codigo: 'DIODO_RX', categoria: 'RX', label: 'Diodo PIN RX en Corto', descripcion: 'Diodo de conmutación quemado por exceso de RF' },
  { codigo: 'FILTRO_FI', categoria: 'RX', label: 'Filtro FI Descalibrado', descripcion: 'Filtro cerámico de 455 kHz cristalizado con pérdida' },

  // Audio
  { codigo: 'CHIP_AUDIO', categoria: 'AUDIO', label: 'Amplificador Audio Mudo', descripcion: 'Sin salida al altavoz, chip BTL o capacitor en corto' },
  { codigo: 'PARLANTE_ROTO', categoria: 'AUDIO', label: 'Cono de Parlante Roto', descripcion: 'Membrana perforada o bobina abierta / raspando' },
  { codigo: 'MIC_INTERNO', categoria: 'AUDIO', label: 'Micrófono Electret Inoperativo', descripcion: 'Cápsula de micrófono interno muda o con falso contacto' },
  { codigo: 'POTENCIOMETRO_VOL', categoria: 'AUDIO', label: 'Potenciómetro Volumen Falso', descripcion: 'Pistas resistivas desgastadas o eje quebrado' },
  { codigo: 'SELECTOR_CANALES', categoria: 'AUDIO', label: 'Selector Canales Desgastado', descripcion: 'Encoder rotativo salta canales o gira libre' },

  // Alimentación
  { codigo: 'NO_ENCIENDE', categoria: 'ALIMENTACION', label: 'Equipo No Enciende', descripcion: 'Consumo cero o cortocircuito directo en fuente DC' },
  { codigo: 'BORNES_BATERIA', categoria: 'ALIMENTACION', label: 'Terminales Batería Sulfatados', descripcion: 'Contactos dorados deformados o con corrosión' },
  { codigo: 'SE_APAGA_PTT', categoria: 'ALIMENTACION', label: 'Se Apaga al Transmitir', descripcion: 'Caída brusca de voltaje por alta resistencia interna' },

  // Lógica
  { codigo: 'PANTALLA_LCD', categoria: 'LOGICA', label: 'Display LCD Roto', descripcion: 'Segmentos faltantes o cristal líquido derramado' },
  { codigo: 'FIRMWARE_CODEPLUG', categoria: 'LOGICA', label: 'Corrupción de Codeplug', descripcion: 'Error de memoria EEPROM o microcontrolador bloqueado' },

  // Chasis & Conectores
  { codigo: 'ENTRADA_HUMEDAD', categoria: 'CHASIS', label: 'Ingreso Humedad / Sulfato', descripcion: 'Placa con óxido de cobre y residuos minerales' },
  { codigo: 'CONECTOR_SMA', categoria: 'CHASIS', label: 'Conector Antena Quebrado', descripcion: 'Pin central SMA o rosca arrancada de la placa' },
  { codigo: 'CARCASA_FRACTURADA', categoria: 'CHASIS', label: 'Carcasa Frontal Rajada', descripcion: 'Sellos de protección IP54/IP67 comprometidos' }
];

// Generador e inicializador de los 10 accesorios estándar + extras
const inicializarEvaluacionAccesorios = (equipoActual = {}) => {
  const accsRecepcion = equipoActual.accesoriosRecepcion || {};
  const repuestosGuardados = equipoActual.repuestos || [];

  const mapaGuardados = new Map();
  repuestosGuardados.forEach(r => {
    if (r.nombre) {
      mapaGuardados.set(r.nombre.trim().toLowerCase(), r);
    }
  });

  const resultado = [];

  ACCESORIOS_DEFAULT.forEach((nombre, idx) => {
    const key = nombre.trim().toLowerCase();
    const isBateria = key.includes('bater');
    const guardado = mapaGuardados.get(key);

    // Verificar si vino con el radio según recepción
    let recibidoEnMostrador = false;
    for (const [recKey, val] of Object.entries(accsRecepcion)) {
      if (val === 'CON' && (recKey.toLowerCase().includes(key) || key.includes(recKey.toLowerCase()))) {
        recibidoEnMostrador = true;
        break;
      }
    }

    if (guardado) {
      resultado.push({
        ...guardado,
        id: guardado.id || `acc-std-${idx}`,
        nombre: guardado.nombre || nombre,
        estado_condicion: guardado.estado_condicion || (guardado.se_reemplaza ? 'Se sugiere reemplazo' : null),
        se_reemplaza: Boolean(guardado.se_reemplaza),
        porcentaje_carga: isBateria 
          ? (guardado.porcentaje_carga !== undefined && guardado.porcentaje_carga !== null ? guardado.porcentaje_carga : (parseInt(equipoActual.bateriaCarga, 10) || 100))
          : null,
        falla_detalle: guardado.falla_detalle || '',
        repuesto_sugerido: guardado.repuesto_sugerido || `${nombre} Original`,
        cantidad: guardado.cantidad || 1,
        precio: guardado.precio !== undefined ? guardado.precio : 0,
        es_manual: false,
        recibido_mostrador: recibidoEnMostrador
      });
      mapaGuardados.delete(key);
    } else {
      resultado.push({
        id: `acc-std-${idx}`,
        nombre: nombre,
        estado_condicion: null,
        se_reemplaza: false,
        porcentaje_carga: isBateria ? (parseInt(equipoActual.bateriaCarga, 10) || 100) : null,
        falla_detalle: '',
        repuesto_sugerido: `${nombre} Original`,
        cantidad: 1,
        precio: isBateria ? 280 : (key.includes('anten') ? 90 : (key.includes('cargador') ? 180 : 50)),
        es_manual: false,
        recibido_mostrador: recibidoEnMostrador
      });
    }
  });

  // Conservar repuestos manuales adicionales previamente guardados
  mapaGuardados.forEach((guardado, key) => {
    resultado.push({
      ...guardado,
      id: guardado.id || `manual-${Date.now()}-${key}`,
      es_manual: true
    });
  });

  return resultado;
};

export default function Step2Diagnosis({ 
  equipo = {}, 
  moneda = 'BOB', 
  tasaCambio = 6.96,
  onSave, 
  onChange,
  isLoading = false,
  hidePrices = true
}) {
  // 1. Procedencia del Servicio (Aceptada / Rechazada)
  const [reparacionRechazada, setReparacionRechazada] = useState(Boolean(equipo.reparacion_rechazada));
  const [motivoRechazo, setMotivoRechazo] = useState(equipo.motivo_rechazo || '');

  // 2. Accesorios Pre-Cargados y Evaluación Técnica
  const [repuestos, setRepuestos] = useState(() => inicializarEvaluacionAccesorios(equipo));

  // 3. Fallas de Placa con Buscador y Filtro por Categoría
  const [fallasCatalogo, setFallasCatalogo] = useState(FALLAS_PLACA_PREDEFINIDAS);
  const [fallasSeleccionadas, setFallasSeleccionadas] = useState(equipo.fallas || []);
  const [busquedaFalla, setBusquedaFalla] = useState('');
  const [categoriaFallaActiva, setCategoriaFallaActiva] = useState('TODAS');
  const [showAddFaultModal, setShowAddFaultModal] = useState(false);
  const [nuevaFalla, setNuevaFalla] = useState({ label: '', categoria: 'TX', descripcion: '', guardarEnCatalogo: true });

  // 4. Modal de Código QR para Fotos con Celular y Galería
  const [showQrModal, setShowQrModal] = useState(false);
  const [imagenesInternas, setImagenesInternas] = useState(equipo.imagenesInternas || []);
  const [isOptimizing, setIsOptimizing] = useState(false);

  // 5. Dictado por Voz y Redacción Oficial
  const [textoDiagnostico, setTextoDiagnostico] = useState(equipo.texto_diagnostico || '');
  const [notasAdicionales, setNotasAdicionales] = useState(equipo.notas_adicionales || '');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  // Cargar catálogo de fallas desde API
  useEffect(() => {
    let isMounted = true;
    fetch('/api/catalogs/faults')
      .then(r => r.json())
      .then(json => {
        if (isMounted && json.success && Array.isArray(json.data) && json.data.length > 0) {
          setFallasCatalogo(json.data);
        }
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, []);

  // Web Speech API
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = 'es-BO';
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event) => {
          let transcript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          setTextoDiagnostico((prev) => (prev ? `${prev.trim()} ${transcript}` : transcript));
        };

        recognition.onerror = () => setIsListening(false);
        recognition.onend = () => setIsListening(false);
        recognitionRef.current = recognition;
      }
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Tu navegador no soporta Web Speech API para dictado por voz.');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const aplicarPlantilla = (texto) => {
    setTextoDiagnostico((prev) => prev ? `${prev.trim()}. ${texto}` : texto);
  };

  // Generador automático de texto técnico basado en fallas y repuestos
  const sintetizarTextoTecnico = (fallas, repuestosList) => {
    if (fallas.length === 0) {
      return `Se procedió con la verificación de recepción y transmisión del equipo ${equipo.modelo || 'radio'}. El equipo no presenta fallas críticas aparentes en placa lógica; se recomienda mantenimiento preventivo, limpieza ultrasónica y ajuste-calibración de parámetros de RF.`;
    }

    const nombresFallas = fallas.map(f => (f.label || f.descripcion || '').toLowerCase()).filter(Boolean).join(', ');
    const acciones = fallas.map(f => `revisión y reparación de ${(f.label || f.descripcion || '').toLowerCase()}`).join(', ');

    let texto = `Se procedió con la inspección en banco de trabajo del equipo ${equipo.modelo || 'radio'}. Se detectaron anomalías en: ${nombresFallas}. Corresponde realizar ${acciones}, además de limpieza técnica profunda y calibración de modulación/potencia en monitor de servicio.`;

    const piezasParaCambio = (repuestosList || []).filter(r => r.se_reemplaza);
    if (piezasParaCambio.length > 0) {
      const items = piezasParaCambio.map(p => `${p.nombre || 'Pieza'} (${p.falla_detalle || p.estado_condicion || 'Reemplazo'})`).join(', ');
      texto += `\n\nRepuestos con reemplazo sugerido: ${items}.`;
    }

    return texto;
  };

  // Manejo de condición en accesorios: Operativa / Dañado/Roto / Se sugiere reemplazo
  const handleSetCondicion = (idx, condicion) => {
    const copia = [...repuestos];
    const item = copia[idx];
    if (item.estado_condicion === condicion) {
      // Toggle off si se vuelve a presionar el mismo
      item.estado_condicion = null;
      item.se_reemplaza = false;
    } else {
      item.estado_condicion = condicion;
      item.se_reemplaza = (condicion === 'Se sugiere reemplazo');
    }
    setRepuestos(copia);

    // Actualizar texto técnico automáticamente
    const nuevoTexto = sintetizarTextoTecnico(fallasSeleccionadas, copia);
    setTextoDiagnostico(nuevoTexto);
  };

  const handleRepuestoChange = (index, field, value) => {
    const copia = [...repuestos];
    copia[index] = { ...copia[index], [field]: value };
    setRepuestos(copia);
  };

  const agregarAccesorioManual = () => {
    setRepuestos([
      ...repuestos,
      {
        id: `manual-${Date.now()}`,
        nombre: 'Nuevo Accesorio Manual',
        estado_condicion: null,
        se_reemplaza: false,
        porcentaje_carga: null,
        falla_detalle: '',
        repuesto_sugerido: '',
        cantidad: 1,
        precio: 0,
        es_manual: true,
        recibido_mostrador: false
      }
    ]);
  };

  const eliminarRepuesto = (index) => {
    setRepuestos(repuestos.filter((_, i) => i !== index));
  };

  // Manejo de selección de fallas
  const toggleFalla = (falla) => {
    let updated;
    const existe = fallasSeleccionadas.some(f => f.codigo === falla.codigo);
    if (existe) {
      updated = fallasSeleccionadas.filter(f => f.codigo !== falla.codigo);
    } else {
      updated = [...fallasSeleccionadas, {
        codigo: falla.codigo,
        label: falla.label,
        descripcion: falla.descripcion,
        categoria: falla.categoria,
        es_custom: !falla.es_sistema,
        reparado: false
      }];
    }
    setFallasSeleccionadas(updated);
    
    // Auto-generar redacción técnica formal instantánea
    const nuevoTexto = sintetizarTextoTecnico(updated, repuestos);
    setTextoDiagnostico(nuevoTexto);
  };

  const handleCrearFalla = async (e) => {
    e.preventDefault();
    if (!nuevaFalla.label.trim()) return;

    const codigoGenerado = nuevaFalla.label.toUpperCase().trim().replace(/[^A-Z0-9_]/g, '_');
    const fallaObj = {
      codigo: codigoGenerado,
      label: nuevaFalla.label.trim(),
      categoria: nuevaFalla.categoria || 'TX',
      descripcion: nuevaFalla.descripcion.trim(),
      es_sistema: false
    };

    if (nuevaFalla.guardarEnCatalogo) {
      try {
        await fetch('/api/catalogs/faults', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fallaObj)
        });
      } catch (err) {}
    }

    setFallasCatalogo(prev => [...prev, fallaObj]);
    setFallasSeleccionadas(prev => [...prev, { ...fallaObj, es_custom: true, reparado: false }]);
    setNuevaFalla({ label: '', categoria: 'TX', descripcion: '', guardarEnCatalogo: true });
    setShowAddFaultModal(false);
  };

  // Cálculos para propagar al estado global
  const subtotal1_servicio = reparacionRechazada ? 0 : (parseFloat(equipo.costo_servicio) || 150);
  const subtotal2_accesorios = reparacionRechazada 
    ? 0 
    : repuestos
        .filter(r => r.se_reemplaza)
        .reduce((acc, curr) => acc + ((parseInt(curr.cantidad, 10) || 1) * (parseFloat(curr.precio) || 0)), 0);
  const totalEquipo = subtotal1_servicio + subtotal2_accesorios;

  // Payload sincronizado
  const diagnosisPayload = useMemo(() => ({
    reparacion_rechazada: reparacionRechazada,
    motivo_rechazo: reparacionRechazada ? motivoRechazo : null,
    estado_individual: reparacionRechazada ? 'RECHAZADO' : 'EN_DIAGNOSTICO',
    texto_diagnostico: textoDiagnostico,
    notas_adicionales: notasAdicionales,
    descripcion_servicio: equipo.descripcion_servicio || 'Mantenimiento preventivo, limpieza ultrasónica y calibración RF en monitor de servicio',
    costo_servicio: subtotal1_servicio,
    fallas: fallasSeleccionadas,
    repuestos: repuestos,
    imagenesInternas: imagenesInternas,
    subtotales: {
      subtotal1_servicio,
      subtotal2_accesorios,
      total: totalEquipo
    }
  }), [reparacionRechazada, motivoRechazo, textoDiagnostico, notasAdicionales, equipo.descripcion_servicio, subtotal1_servicio, subtotal2_accesorios, totalEquipo, fallasSeleccionadas, repuestos, imagenesInternas]);

  const lastSyncedRef = useRef('');

  useEffect(() => {
    const payloadStr = JSON.stringify(diagnosisPayload);
    if (lastSyncedRef.current !== payloadStr) {
      lastSyncedRef.current = payloadStr;
      onChange?.(diagnosisPayload);
    }
  }, [diagnosisPayload, onChange]);

  // Fallas filtradas por buscador y categoría
  const fallasFiltradas = useMemo(() => {
    return fallasCatalogo.filter(f => {
      if (categoriaFallaActiva !== 'TODAS' && f.categoria && f.categoria !== categoriaFallaActiva) {
        return false;
      }
      if (busquedaFalla.trim()) {
        const q = busquedaFalla.toLowerCase().trim();
        const label = (f.label || '').toLowerCase();
        const desc = (f.descripcion || '').toLowerCase();
        const cod = (f.codigo || '').toLowerCase();
        return label.includes(q) || desc.includes(q) || cod.includes(q);
      }
      return true;
    });
  }, [fallasCatalogo, categoriaFallaActiva, busquedaFalla]);

  return (
    <div className="space-y-6 animate-slideUp font-sans pb-10">
      
      {/* ============================================================== */}
      {/* 1. PROCEDENCIA DEL SERVICIO (Aceptada / Rechazada) */}
      {/* ============================================================== */}
      <div className={`p-4 sm:p-5 rounded-3xl border transition-all ${
        reparacionRechazada 
          ? 'bg-red-50/60 border-red-200 text-red-900 shadow-sm' 
          : 'bg-white border-slate-200/80 text-gray-800 shadow-sm'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              reparacionRechazada ? 'bg-red-600 text-white' : 'bg-emerald-50 text-emerald-600'
            }`}>
              <ShieldCheck size={18} />
            </div>
            <div>
              <h4 className="text-sm sm:text-base font-bold text-gray-900 leading-tight">
                Procedencia del Servicio
              </h4>
              <p className="text-xs text-gray-500 mt-0.5">
                Determine si la reparación procede o es rechazada (irreparable/no costeable).
              </p>
            </div>
          </div>

          {/* Toggle Segmentado Aceptada / Rechazada */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl self-start sm:self-auto shrink-0">
            <button
              type="button"
              onClick={() => setReparacionRechazada(false)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                !reparacionRechazada
                  ? 'bg-[#00a86b] text-white shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Aceptada
            </button>
            <button
              type="button"
              onClick={() => setReparacionRechazada(true)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                reparacionRechazada
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Rechazada
            </button>
          </div>
        </div>

        {reparacionRechazada && (
          <div className="mt-4 pt-3 border-t border-red-200 animate-slideUp">
            <label className="block text-xs font-bold text-red-800 uppercase mb-1">
              Motivo Técnico de Rechazo / Inviabilidad:
            </label>
            <input
              type="text"
              value={motivoRechazo}
              onChange={(e) => setMotivoRechazo(e.target.value)}
              placeholder="Ej. Placa multicapa sulfatada con pistas internas cortadas / Microcontrolador descontinuado..."
              className="w-full px-3.5 py-2.5 bg-white border border-red-300 rounded-xl text-xs sm:text-sm text-gray-900 outline-none focus:ring-2 focus:ring-red-500/20 font-medium"
            />
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* 2. ESTADO DE ACCESORIOS Y DIAGNÓSTICO */}
      {/* ============================================================== */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-gray-900">
                Estado de Accesorios y Diagnóstico
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Revise piezas, capacidad de batería y determine reemplazos
              </p>
            </div>
          </div>
        </div>

        {/* Lista de Accesorios con botones individuales */}
        <div className="space-y-2.5">
          {repuestos.map((item, idx) => {
            const nombreItem = item.nombre || '';
            const esBateria = nombreItem.toLowerCase().includes('bater') || (item.porcentaje_carga !== null && item.porcentaje_carga !== undefined);

            return (
              <div 
                key={item.id || idx}
                className="rounded-2xl border border-slate-200/80 bg-white hover:border-slate-300 p-4 transition-all space-y-3"
              >
                {/* Fila Principal */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    {item.es_manual ? (
                      <input
                        type="text"
                        value={item.nombre}
                        onChange={(e) => handleRepuestoChange(idx, 'nombre', e.target.value)}
                        placeholder="Nombre del accesorio..."
                        className="font-bold text-gray-900 text-sm sm:text-base border-b border-dashed border-slate-300 focus:border-[#E30613] outline-none bg-transparent"
                      />
                    ) : (
                      <span className="font-bold text-gray-900 text-sm sm:text-base">
                        {nombreItem}
                      </span>
                    )}

                    {item.recibido_mostrador && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        Recibido (CON)
                      </span>
                    )}
                  </div>

                  {/* Grupo de 3 Botones de Estado */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleSetCondicion(idx, 'Operativa')}
                      className={`px-3.5 sm:px-4 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        item.estado_condicion === 'Operativa'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-white text-gray-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      Operativa
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSetCondicion(idx, 'Dañado/Roto')}
                      className={`px-3.5 sm:px-4 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        item.estado_condicion === 'Dañado/Roto'
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                          : 'bg-white text-gray-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      Dañado/Roto
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSetCondicion(idx, 'Se sugiere reemplazo')}
                      className={`px-3.5 sm:px-4 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        item.estado_condicion === 'Se sugiere reemplazo'
                          ? 'bg-red-600 text-white border-red-600 shadow-xs'
                          : 'bg-white text-gray-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      Se sugiere reemplazo
                    </button>

                    {item.es_manual && (
                      <button
                        type="button"
                        onClick={() => eliminarRepuesto(idx)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer ml-1"
                        title="Eliminar accesorio manual"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Sub-fila para Batería: Capacidad y Retención de Carga */}
                {esBateria && (
                  <div className="pt-2.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-slideUp">
                    <div className="flex items-center gap-2">
                      <span className="text-amber-500 text-sm">⚡</span>
                      <span className="text-xs font-bold text-gray-700">
                        Capacidad / Retención de Carga:
                      </span>
                      <span className={`text-xs font-mono font-black px-2.5 py-0.5 rounded-full border ${
                        (item.porcentaje_carga ?? 100) >= 80 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : (item.porcentaje_carga ?? 100) >= 50 
                          ? 'bg-amber-50 text-amber-700 border-amber-200' 
                          : 'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {item.porcentaje_carga ?? 100}%
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {[100, 80, 50, 20, 0].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => handleRepuestoChange(idx, 'porcentaje_carga', pct)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                            item.porcentaje_carga === pct
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : 'bg-white text-gray-700 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}

                      {/* Input Otro % */}
                      <div className="relative inline-flex items-center">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          placeholder="Otro %"
                          value={[100, 80, 50, 20, 0].includes(item.porcentaje_carga) ? '' : (item.porcentaje_carga ?? '')}
                          onChange={(e) => {
                            const val = e.target.value === '' ? null : Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0));
                            handleRepuestoChange(idx, 'porcentaje_carga', val);
                          }}
                          className={`w-20 px-2 py-1 text-xs text-center border rounded-lg font-medium outline-none transition-all ${
                            ![100, 80, 50, 20, 0].includes(item.porcentaje_carga) && item.porcentaje_carga !== null
                              ? 'bg-blue-50 border-blue-500 text-blue-900 font-bold'
                              : 'bg-white border-slate-200 text-gray-700 placeholder:text-gray-400 focus:border-blue-500'
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Botón de Agregar Accesorio Manual */}
          <button
            type="button"
            onClick={agregarAccesorioManual}
            className="w-full py-3.5 border-2 border-dashed border-slate-200 hover:border-slate-300 rounded-2xl text-xs sm:text-sm font-bold text-gray-600 hover:text-gray-900 hover:bg-slate-50/60 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
          >
            <Plus size={16} className="text-gray-400" />
            <span>+ Agregar accesorio manual</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. DETECCIÓN Y CHECKLIST DE FALLAS DE PLACA */}
      {/* ============================================================== */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5 sm:p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <Cpu size={18} className="text-[#E30613]" />
              <h3 className="text-base sm:text-lg font-black text-gray-900">
                Chequeo y Fallas de Placa / Circuito Electrónico
              </h3>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Filtre o busque fallas de circuito para registrar anomalías y redactar el informe técnico automáticamente.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Buscador de Fallas */}
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar falla (ej. potencia, audio)..."
                value={busquedaFalla}
                onChange={(e) => setBusquedaFalla(e.target.value)}
                className="pl-8 pr-7 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:border-[#E30613] outline-none w-48 sm:w-60 font-medium"
              />
              {busquedaFalla && (
                <button
                  type="button"
                  onClick={() => setBusquedaFalla('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Añadir Falla Personalizada */}
            <button
              type="button"
              onClick={() => setShowAddFaultModal(true)}
              className="flex items-center gap-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-gray-800 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
            >
              <Plus size={14} className="text-[#E30613]" />
              <span>+ Nueva Falla</span>
            </button>
          </div>
        </div>

        {/* Pestañas de Categoría */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-bold scrollbar-none">
          {CATEGORIAS_FALLAS.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoriaFallaActiva(cat.id)}
              className={`px-3 py-1.5 rounded-xl shrink-0 transition-all cursor-pointer ${
                categoriaFallaActiva === cat.id
                  ? 'bg-navy text-white shadow-xs'
                  : 'bg-slate-50 text-gray-600 hover:bg-slate-100'
              }`}
            >
              {cat.label}
            </button>
          ))}
          <span className="ml-auto text-[11px] font-bold text-gray-400 shrink-0">
            {fallasSeleccionadas.length} seleccionada(s)
          </span>
        </div>

        {/* Grid de Fallas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
          {fallasFiltradas.length === 0 ? (
            <div className="col-span-full py-8 text-center text-gray-400 text-xs">
              No se encontraron fallas con el criterio &quot;{busquedaFalla}&quot;. Puede presionar <strong>+ Nueva Falla</strong> para registrarla.
            </div>
          ) : (
            fallasFiltradas.map((falla) => {
              const isSelected = fallasSeleccionadas.some(f => f.codigo === falla.codigo);

              return (
                <button
                  key={falla.codigo}
                  type="button"
                  onClick={() => toggleFalla(falla)}
                  className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    isSelected 
                      ? 'border-red-400 bg-red-50/50 shadow-xs ring-1 ring-red-500/20' 
                      : 'border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className={`text-xs font-bold uppercase leading-tight ${isSelected ? 'text-red-700' : 'text-gray-900'}`}>
                      {falla.label}
                    </span>
                    <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 mt-0.5 ${
                      isSelected ? 'bg-red-600 border-red-600 text-white' : 'border-slate-300 bg-white'
                    }`}>
                      {isSelected && <Check size={11} className="stroke-[3]" />}
                    </div>
                  </div>
                  <span className="text-[11px] text-gray-500 line-clamp-2 mt-1">
                    {falla.descripcion}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* 4. EVIDENCIAS FOTOGRÁFICAS DE DIAGNÓSTICO INTERNO / PLACA */}
      {/* ============================================================== */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Camera size={18} className="text-[#E30613]" />
            <h3 className="text-base sm:text-lg font-black text-gray-900">
              Fotos de Diagnóstico Interno / Placa
            </h3>
          </div>
          <span className="text-[11px] font-bold text-gray-500 bg-slate-100 px-2 py-0.5 rounded-full">
            {imagenesInternas.length} foto(s)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button 
            type="button"
            onClick={() => setShowQrModal(true)}
            className="w-full border-2 border-emerald-300 bg-emerald-50/40 hover:bg-emerald-50/80 rounded-2xl p-3.5 flex items-center gap-3 text-emerald-800 transition-all group cursor-pointer text-left shadow-xs"
          >
            <div className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
              <Camera size={20} />
            </div>
            <div>
              <p className="font-black text-xs sm:text-sm text-emerald-950 leading-tight">Tomar con Celular</p>
              <p className="text-[10px] text-emerald-700 mt-0.5 font-bold">Escanear Código QR</p>
            </div>
          </button>

          <label className={`w-full border border-slate-200 hover:border-slate-300 bg-slate-50/60 hover:bg-slate-100/60 rounded-2xl p-3.5 flex items-center gap-3 text-gray-700 transition-all group cursor-pointer text-left ${isOptimizing ? 'opacity-60 cursor-not-allowed' : ''}`}>
            <input 
              type="file" 
              accept="image/*" 
              multiple 
              className="hidden" 
              disabled={isOptimizing}
              onChange={async (e) => {
                const files = e.target.files;
                if (!files || files.length === 0) return;
                setIsOptimizing(true);
                try {
                  const { compressImage } = await import('@/lib/utils/imageCompressor');
                  const newPreviews = [...imagenesInternas];
                  
                  const optimizations = Array.from(files).map(async (file) => {
                    const optimizedFile = await compressImage(file, {
                      maxWidth: 1200,
                      maxHeight: 1200,
                      quality: 0.78,
                      returnType: 'file'
                    });
                    const url = URL.createObjectURL(optimizedFile);
                    return { url, name: optimizedFile.name, file: optimizedFile, etapa: 'DIAGNOSTICO' };
                  });
                  
                  const compressedFiles = await Promise.all(optimizations);
                  newPreviews.push(...compressedFiles);
                  setImagenesInternas(newPreviews);
                } catch (err) {
                  console.error('Error optimizando imágenes en Step 2:', err);
                  alert('Error al optimizar imágenes.');
                } finally {
                  setIsOptimizing(false);
                  e.target.value = '';
                }
              }}
            />
            <div className="w-10 h-10 bg-white border border-slate-200 text-navy rounded-xl flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
              {isOptimizing ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
            </div>
            <div>
              <p className="font-bold text-xs sm:text-sm text-gray-900 leading-tight">
                {isOptimizing ? 'Optimizando...' : 'Subir desde PC'}
              </p>
              <p className="text-[10px] text-gray-500 mt-0.5">
                {isOptimizing ? 'Procesando imágenes' : 'Explorar archivos locales'}
              </p>
            </div>
          </label>
        </div>

        {/* Galería interna */}
        {imagenesInternas.length === 0 ? (
          <p className="text-[11px] text-gray-400 italic text-center py-2">
            No hay fotos internas. Suba fotos del estado de la placa, sulfato o componentes dañados.
          </p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1">
            {imagenesInternas.map((img, idx) => (
              <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200 shadow-xs bg-slate-100">
                <img src={img.url} alt={`Evidencia Interna ${idx + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    const filtered = imagenesInternas.filter((_, i) => i !== idx);
                    setImagenesInternas(filtered);
                  }}
                  className="absolute top-1.5 right-1.5 bg-black/60 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all shadow-md"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* 5. DICTADO POR VOZ Y REDACCIÓN OFICIAL DEL INFORME TÉCNICO */}
      {/* ============================================================== */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-[#E30613]" />
              <h3 className="text-base sm:text-lg font-black text-gray-900">
                Redacción del Informe Técnico de Laboratorio
              </h3>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Texto que se imprime en el informe membretado oficial y se exporta a Word para el cliente.
            </p>
          </div>

          <button
            type="button"
            onClick={toggleListening}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
              isListening 
                ? 'bg-red-600 text-white animate-pulse' 
                : 'bg-navy text-white hover:bg-slate-800'
            }`}
          >
            {isListening ? (
              <>
                <MicOff size={15} /> <span>Grabando audio... (Clic para parar)</span>
              </>
            ) : (
              <>
                <Mic size={15} className="text-red-400" /> <span>Dictar por Voz (Web Speech)</span>
              </>
            )}
          </button>
        </div>

        {/* Atajos de Frases Rápidas de Telecomunicaciones */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-400 font-bold flex items-center gap-1">
            <Sparkles size={13} className="text-amber-500" /> Insertar plantilla rápida:
          </span>
          {[
            'Potencia RF baja (< 1 Watt en TX)',
            'Audio distorsionado en recepción por cono dañado',
            'Diodo PIN quemado por descarga electrostática',
            'Batería agotada, pérdida de retención de carga en ciclos',
            'Antena descalibrada con alto ROE en banda VHF'
          ].map((snippet, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => aplicarPlantilla(snippet)}
              className="text-[11px] bg-slate-50 border border-slate-200 hover:border-red-300 hover:text-red-600 px-2.5 py-1 rounded-lg transition-colors text-gray-600 font-medium cursor-pointer"
            >
              + {snippet}
            </button>
          ))}
        </div>

        <textarea
          rows={4}
          value={textoDiagnostico}
          onChange={(e) => setTextoDiagnostico(e.target.value)}
          placeholder="Describa el diagnóstico técnico oficial, mediciones osciloscópicas, frecuencia y potencia obtenidas en el banco de pruebas..."
          className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs sm:text-sm text-gray-900 focus:bg-white focus:border-[#E30613] focus:ring-4 focus:ring-red-500/10 outline-none transition-all font-medium"
        />
      </div>

      {/* Modal para Añadir Falla Personalizada */}
      {showAddFaultModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Cpu size={18} className="text-[#E30613]" />
                <h3 className="font-black text-gray-900 text-base">Añadir Falla de Circuito</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setShowAddFaultModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCrearFalla} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Nombre de la Falla *
                </label>
                <input
                  type="text"
                  required
                  value={nuevaFalla.label}
                  onChange={(e) => setNuevaFalla({ ...nuevaFalla, label: e.target.value })}
                  placeholder="Ej: VCO Bloqueado / PLL Desenganchado"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-gray-900 focus:bg-white focus:border-[#E30613] outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Categoría Técnica
                </label>
                <select
                  value={nuevaFalla.categoria}
                  onChange={(e) => setNuevaFalla({ ...nuevaFalla, categoria: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-gray-900 focus:bg-white focus:border-[#E30613] outline-none font-semibold"
                >
                  <option value="TX">Transmisión RF (TX)</option>
                  <option value="RX">Recepción RF (RX)</option>
                  <option value="AUDIO">Audio & Micrófono</option>
                  <option value="ALIMENTACION">Alimentación & Batería</option>
                  <option value="LOGICA">Lógica & Display</option>
                  <option value="CHASIS">Chasis & Conectores</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Descripción Técnica (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={nuevaFalla.descripcion}
                  onChange={(e) => setNuevaFalla({ ...nuevaFalla, descripcion: e.target.value })}
                  placeholder="Circuito oscilador sin enganche por capacitor defectuoso..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:border-[#E30613] outline-none"
                />
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-gray-700 pt-1">
                <input
                  type="checkbox"
                  checked={nuevaFalla.guardarEnCatalogo}
                  onChange={(e) => setNuevaFalla({ ...nuevaFalla, guardarEnCatalogo: e.target.checked })}
                  className="w-4 h-4 rounded text-red-600 focus:ring-red-500 accent-red-600"
                />
                <span>Guardar en el catálogo permanente de fallas</span>
              </label>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddFaultModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-slate-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-red-600 to-red-700 text-white shadow-sm hover:from-red-500 transition-all"
                >
                  Guardar Falla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Sincronización Móvil vía Código QR */}
      <QrMobileModal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        ordenId={equipo.orden_id || '1'}
        equipoId={equipo.id}
        equipoNombre={`${equipo.marca || 'Radio'} ${equipo.modelo || ''} (S/N: ${equipo.numero_serie || 'Pendiente'})`}
      />
    </div>
  );
}
