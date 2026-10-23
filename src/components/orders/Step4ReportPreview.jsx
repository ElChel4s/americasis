"use client";

import React, { useState, useMemo, useEffect } from 'react';
import {
  Printer, FileDown, Loader2, Info, ArrowLeft,
  CheckCircle2, Camera, ShieldAlert, Sparkles, Building, Lock,
  Sliders, Trash2, Edit3, ChevronDown, ChevronUp, UserCheck
} from 'lucide-react';
import {
  formatCurrency,
  getImporteLiteral,
  CLAUSULA_CAMBIARIA_USD,
  getRevisionCostText,
  DEFAULT_REVISION_COST,
  normalizeCurrency
} from '@/lib/utils/currencyFormat';
import { generateDocxBlob } from '@/lib/utils/docxExport';
import { UsersService } from '@/lib/services/users.service';
import { resolveImageUrl } from '@/lib/services/orders.service';

function formatFechaBolivia(date = new Date()) {
  const MESES = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];
  const d = date instanceof Date && !isNaN(date) ? date : new Date();
  const dia = d.getDate();
  const mes = MESES[d.getMonth()];
  const anio = d.getFullYear();
  return `${dia} de ${mes} de ${anio}`;
}

function HeaderMembrete() {
  return (
    <div className="w-full mb-4 break-inside-avoid">
      <img
        src="/images/header_membrete.png"
        alt="AMERICA Sistemas de Comunicación - Membrete Oficial"
        className="w-full h-auto object-contain block max-h-[85px] sm:max-h-[105px]"
      />
    </div>
  );
}

function FooterMembrete() {
  return (
    <div className="w-full bg-white pt-2 break-inside-avoid">
      <img
        src="/images/footer_membrete.png"
        alt="AMERICA Sistemas de Comunicación - Marcas y Contacto"
        className="w-full h-auto object-contain block max-h-[75px] sm:max-h-[90px]"
      />
    </div>
  );
}

export default function Step4ReportPreview({
  formData = { moneda: 'BOB', equipos: [], cliente: '', ordenServicio: '', condiciones: {} },
  updateForm,
  currentUser,
  userRole,
  onPrevious
}) {
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [revisionEditable, setRevisionEditable] = useState(
    formData.condiciones?.referenciaAdicional || ''
  );
  const [showConfigPanel, setShowConfigPanel] = useState(true);

  const isTecnico = (userRole || currentUser?.rol) === 'TECNICO';
  const moneda = normalizeCurrency(formData.moneda || 'BOB');

  const [localCondiciones, setLocalCondiciones] = useState(() => ({
    incluirConclusiones: false,
    conclusiones: [
      'Los equipos operan en ambientes industriales con exposición a polvo y vibraciones mecánicas.',
      'Se recomienda programar limpiezas y calibración preventiva periódica cada 6 meses.'
    ],
    conclusionesTexto: 'Los equipos operan en ambientes industriales con exposición a polvo y vibraciones mecánicas.\nSe recomienda programar limpiezas y calibración preventiva periódica cada 6 meses.',
    incluirNotas: false,
    notasObservaciones: '',
    incluirPoliticasGenerales: true,
    incluirGarantiaBaterias: true,
    diasVigencia: 5,
    tiempoEntrega: '1 a 2 semanas',
    costoRevision: DEFAULT_REVISION_COST[moneda],
    tipoGarantia: 'ESTANDAR_5_DIAS',
    textoGarantia: '5 días calendario a partir de la entrega para verificación operativa.',
    referenciaAdicional: '',
    tecnicoFirmanteNombre: '',
    tecnicoFirmanteCargo: '',
    ...(formData.condiciones || {})
  }));

  const condiciones = useMemo(() => ({
    ...localCondiciones,
    ...(formData.condiciones || {})
  }), [localCondiciones, formData.condiciones]);

  const handleUpdateCondicion = (updates) => {
    setLocalCondiciones(prev => ({ ...prev, ...updates }));
    if (updateForm) {
      updateForm({
        condiciones: {
          ...condiciones,
          ...updates
        }
      });
    }
  };

  const [tecnicosList, setTecnicosList] = useState([]);

  useEffect(() => {
    UsersService.initStorage();
    setTecnicosList(UsersService.getTecnicos());
    const handleUsers = () => setTecnicosList(UsersService.getTecnicos());
    window.addEventListener('americasis_users_updated', handleUsers);
    return () => window.removeEventListener('americasis_users_updated', handleUsers);
  }, []);

  const tecnicoAsignado = useMemo(() => {
    const techId = formData.usuario_tecnico_id || formData.tecnicoAsignadoId || formData.tecnico_asignado_id;
    if (techId) {
      const match = tecnicosList.find(t => 
        String(t.id) === String(techId) || 
        (t.legacy_id && String(t.legacy_id) === String(techId)) ||
        (String(techId).includes('ramiro') && t.nombre_completo.includes('Ramiro'))
      );
      if (match) return match;
    }
    const techName = formData.tecnicoNombre || formData.tecnico_nombre_manual;
    if (techName) {
      const match = tecnicosList.find(t => t.nombre_completo.toLowerCase() === techName.toLowerCase());
      if (match) return match;
      return { nombre_completo: techName, cargo: 'Técnico Especialista RF' };
    }
    if (currentUser?.rol === 'TECNICO') {
      return currentUser;
    }
    const ramiro = tecnicosList.find(t => t.nombre_completo.includes('Ramiro'));
    return ramiro || { nombre_completo: 'Ramiro Condori', cargo: 'Técnico Especialista RF' };
  }, [formData.usuario_tecnico_id, formData.tecnicoAsignadoId, formData.tecnico_asignado_id, formData.tecnicoNombre, formData.tecnico_nombre_manual, currentUser, tecnicosList]);

  const tecnicoFirmanteNombre = condiciones.tecnicoFirmanteNombre || tecnicoAsignado?.nombre_completo || 'Ramiro Condori';
  const tecnicoFirmanteCargo = condiciones.tecnicoFirmanteCargo || tecnicoAsignado?.cargo || 'Técnico Especialista RF';

  const conclusionesList = useMemo(() => {
    if (condiciones.conclusionesTexto && typeof condiciones.conclusionesTexto === 'string') {
      return condiciones.conclusionesTexto.split('\n').map(s => s.trim()).filter(Boolean);
    }
    if (Array.isArray(condiciones.conclusiones)) {
      return condiciones.conclusiones.filter(Boolean);
    }
    return [];
  }, [condiciones.conclusionesTexto, condiciones.conclusiones]);

  const currentDate = useMemo(() => {
    return formatFechaBolivia();
  }, []);

  // Subtotal 1 (Servicio técnico)
  const subtotal1 = useMemo(() => {
    return (formData.equipos || []).reduce((sum, eq) => {
      if (eq.reparacion_rechazada && !eq.no_autorizo_revision) return sum;
      return sum + (parseFloat(eq.costo_servicio) || 0);
    }, 0);
  }, [formData.equipos]);

  // Lista consolidada de accesorios y repuestos
  const accesoriosCotizados = useMemo(() => {
    const list = [];
    (formData.equipos || []).forEach((eq, eqIdx) => {
      (eq.repuestos || []).forEach((rep) => {
        if (rep.se_reemplaza) {
          list.push({
            nombre: rep.nombre || rep.descripcion || 'Repuesto',
            cantidad: parseInt(rep.cantidad, 10) || 1,
            precio: parseFloat(rep.precio) || 0,
            es_opcional: Boolean(rep.es_opcional),
            equipoNombre: `${eq.marca || 'Radio'} ${eq.modelo || `Eq. ${eqIdx + 1}`}`
          });
        }
      });

      if (eq.antenaEstado === 'REEMPLAZO' && !(eq.repuestos || []).some(r => (r.nombre || r.descripcion || '').toLowerCase().includes('antena'))) {
        list.push({
          nombre: `Antena ${eq.banda || 'VHF'} (${eq.antenaModelo || 'Original'})`,
          cantidad: 1,
          precio: moneda === 'USD' ? 25 : 175,
          es_opcional: true,
          equipoNombre: `${eq.marca || 'Radio'} ${eq.modelo || `Eq. ${eqIdx + 1}`}`
        });
      }

      if ((eq.bateriaEstado === 'REEMPLAZO' || (parseInt(eq.bateriaCarga, 10) > 0 && parseInt(eq.bateriaCarga, 10) < 70)) && !(eq.repuestos || []).some(r => (r.nombre || r.descripcion || '').toLowerCase().includes('bater'))) {
        list.push({
          nombre: `Batería Li-Ion ${eq.bateriaModelo || 'Alta Capacidad'}`,
          cantidad: 1,
          precio: moneda === 'USD' ? 55 : 380,
          es_opcional: false,
          equipoNombre: `${eq.marca || 'Radio'} ${eq.modelo || `Eq. ${eqIdx + 1}`}`
        });
      }
    });
    return list;
  }, [formData.equipos, moneda]);

  const subtotal2 = useMemo(() => {
    return accesoriosCotizados.reduce((sum, item) => sum + (item.cantidad * item.precio), 0);
  }, [accesoriosCotizados]);

  const sumatoriaTotal = useMemo(() => {
    return subtotal1 + subtotal2;
  }, [subtotal1, subtotal2]);

  // Lista de accesorios de recepción para Sección 1
  const getAccesoriosRecepcionStr = (eq) => {
    const arr = [];
    if (Array.isArray(eq.accesorios)) {
      eq.accesorios.forEach(a => {
        if (a.estado_ingreso === 'CON') {
          arr.push(`con ${String(a.tipo_accesorio).toLowerCase()}`);
        }
      });
    } else if (eq.accesoriosRecepcion && typeof eq.accesoriosRecepcion === 'object') {
      Object.keys(eq.accesoriosRecepcion).forEach((k) => {
        if (eq.accesoriosRecepcion[k] === 'CON') {
          arr.push(`con ${k.toLowerCase()}`);
        }
      });
    }
    if (arr.length === 0) return 'Con accesorios básicos';
    return arr.join(', ');
  };

  // Fotos multi-equipo organizadas por cada radio y clasificadas en Recepción vs Diagnóstico para Sección 7 (Anexo Fotográfico)
  const equiposConFotos = useMemo(() => {
    const seenUrls = new Set();
    const result = [];

    (formData.equipos || []).forEach((eq, eqIdx) => {
      const handyNum = eq.orden_indice || (eqIdx + 1);
      const handyLabel = `${eq.marca || 'Motorola'} ${eq.modelo || `Handy #${handyNum}`}`.trim();
      const serie = eq.serie || eq.numero_serie || `Handy #${handyNum}`;

      // 1. Recolectar candidatos de fotos de recepción (exterior)
      const rawRecepcion = [
        ...(Array.isArray(eq.imagenesRecepcion) ? eq.imagenesRecepcion : []),
        ...(Array.isArray(eq.fotosRecepcion) ? eq.fotosRecepcion : []),
        ...(Array.isArray(eq.imagenes) ? eq.imagenes.filter(img => {
          const et = String(img?.etapa || img?.tipo || '').toUpperCase();
          return et !== 'DIAGNOSTICO' && et !== 'INTERNA' && et !== 'INTERNO';
        }) : []),
        ...(Array.isArray(eq.evidencias) ? eq.evidencias.filter(img => {
          const et = String(img?.etapa || img?.tipo || '').toUpperCase();
          return et !== 'DIAGNOSTICO' && et !== 'INTERNA' && et !== 'INTERNO';
        }) : []),
        ...(Array.isArray(eq.fotos) ? eq.fotos.filter(img => {
          const et = String(img?.etapa || img?.tipo || '').toUpperCase();
          return et !== 'DIAGNOSTICO' && et !== 'INTERNA' && et !== 'INTERNO';
        }) : [])
      ];

      // 2. Recolectar candidatos de fotos de diagnóstico (interior / placa)
      const rawDiagnostico = [
        ...(Array.isArray(eq.imagenesInternas) ? eq.imagenesInternas : []),
        ...(Array.isArray(eq.imagenesDiagnostico) ? eq.imagenesDiagnostico : []),
        ...(Array.isArray(eq.fotosDiagnostico) ? eq.fotosDiagnostico : []),
        ...(Array.isArray(eq.imagenes) ? eq.imagenes.filter(img => {
          const et = String(img?.etapa || img?.tipo || '').toUpperCase();
          return et === 'DIAGNOSTICO' || et === 'INTERNA' || et === 'INTERNO';
        }) : []),
        ...(Array.isArray(eq.evidencias) ? eq.evidencias.filter(img => {
          const et = String(img?.etapa || img?.tipo || '').toUpperCase();
          return et === 'DIAGNOSTICO' || et === 'INTERNA' || et === 'INTERNO';
        }) : []),
        ...(Array.isArray(eq.fotos) ? eq.fotos.filter(img => {
          const et = String(img?.etapa || img?.tipo || '').toUpperCase();
          return et === 'DIAGNOSTICO' || et === 'INTERNA' || et === 'INTERNO';
        }) : [])
      ];

      const reception = [];
      rawRecepcion.forEach((img, i) => {
        const url = resolveImageUrl(img);
        if (!url || seenUrls.has(url)) return;
        seenUrls.add(url);
        reception.push({
          ...img,
          url,
          equipoLabel: handyLabel,
          serie,
          etapa: 'Recepción',
          etiqueta: img?.name || img?.nombre_archivo || `Foto Exterior #${i + 1}`
        });
      });

      const diagnosis = [];
      rawDiagnostico.forEach((img, i) => {
        const url = resolveImageUrl(img);
        if (!url || seenUrls.has(url)) return;
        seenUrls.add(url);
        diagnosis.push({
          ...img,
          url,
          equipoLabel: handyLabel,
          serie,
          etapa: 'Diagnóstico',
          etiqueta: img?.name || img?.nombre_archivo || `Foto Placa / Daño #${i + 1}`
        });
      });

      if (reception.length > 0 || diagnosis.length > 0) {
        result.push({
          equipoIndex: eqIdx,
          handyLabel,
          serie,
          reception,
          diagnosis,
          totalFotos: reception.length + diagnosis.length
        });
      }
    });

    return result;
  }, [formData.equipos]);

  const tieneFotos = equiposConFotos.length > 0;

  const ordenNumeroStr = formData.ordenServicio || formData.numero_orden || (formData.id ? `OS-${String(formData.id).padStart(5, '0')}` : 'PROV');
  const clienteNombreStr = formData.cliente || formData.razon_social || 'CLIENTE NO ESPECIFICADO';

  // Manejo de exportación a Word (.docx)
  const handleExportDocx = async () => {
    try {
      setIsExportingDocx(true);
      const docxPayload = {
        ...formData,
        cliente: clienteNombreStr,
        ordenServicio: ordenNumeroStr,
        condiciones: {
          ...condiciones,
          conclusiones: conclusionesList,
          tecnicoFirmanteNombre,
          tecnicoFirmanteCargo
        }
      };
      const blob = await generateDocxBlob(docxPayload, currentUser);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const osName = ordenNumeroStr.replace(/[^a-zA-Z0-9_-]/g, '_');
      a.download = `Informe_Tecnico_${osName}_${moneda}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error al exportar DOCX:', err);
      alert('Ocurrió un error al generar el archivo Word (.docx). Verifique los datos ingresados.');
    } finally {
      setIsExportingDocx(false);
    }
  };

  return (
    <div className="space-y-6 animate-slideUp font-sans pb-16">
      {/* Barra de Acciones y Botones de Exportación */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm print:hidden">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <span>Fase 4: Vista Previa y Emisión Oficial</span>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${moneda === 'USD' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
              }`}>
              Formato {moneda === 'USD' ? 'Dólares (Usd.)' : 'Bolivianos (Bs.)'}
            </span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Compruebe la redacción milimétrica antes de imprimir en tamaño A4 o descargar el archivo Word.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {/* Botón Word DOCX */}
          <button
            type="button"
            id="btn-export-docx"
            onClick={handleExportDocx}
            disabled={isExportingDocx}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-gray-800 bg-white border border-slate-300 hover:bg-slate-50 shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            {isExportingDocx ? (
              <>
                <Loader2 size={16} className="animate-spin text-[#E30613]" />
                <span>Generando Word...</span>
              </>
            ) : (
              <>
                <FileDown size={16} className="text-blue-600" />
                <span>Exportar Word (.docx)</span>
              </>
            )}
          </button>

          {/* Botón Imprimir PDF */}
          <button
            type="button"
            id="btn-print-pdf"
            onClick={() => window.print()}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 shadow-lg shadow-red-600/25 transition-all cursor-pointer"
          >
            <Printer size={16} />
            <span>Imprimir PDF (A4)</span>
          </button>
        </div>
      </div>

      {/* Alerta de Configuración de Impresión */}
      <div className="bg-blue-50 border border-blue-200/80 p-3.5 rounded-2xl flex items-start gap-3 text-blue-900 text-xs font-medium print:hidden">
        <Info size={18} className="text-blue-600 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Aviso de impresión profesional:</strong> En la ventana de impresión del navegador, asegúrese de seleccionar tamaño <strong>A4</strong>, márgenes <strong>Predeterminados / Ninguno</strong> y desmarcar la casilla <em>&quot;Encabezados y pies de página&quot;</em> para que se utilicen con nitidez los membretes oficiales.
        </p>
      </div>

      {/* Panel de Personalización y Ocultamiento de Notas / Secciones */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 sm:p-5 print:hidden space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Sliders size={18} className="text-[#E30613]" />
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">
              Personalizar y Ocultar Notas / Secciones del Informe
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setShowConfigPanel(!showConfigPanel)}
            className="text-xs font-bold text-gray-500 hover:text-gray-800 flex items-center gap-1 cursor-pointer"
          >
            {showConfigPanel ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            <span>{showConfigPanel ? 'Ocultar ajustes' : 'Mostrar ajustes'}</span>
          </button>
        </div>

        {showConfigPanel && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {/* 1. Conclusiones */}
            <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-gray-800 flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(condiciones.incluirConclusiones)}
                    onChange={(e) => handleUpdateCondicion({ incluirConclusiones: e.target.checked })}
                    className="rounded text-red-600 cursor-pointer"
                  />
                  <span>Conclusiones / Recom.</span>
                </label>
                {condiciones.incluirConclusiones && (
                  <button
                    type="button"
                    onClick={() => handleUpdateCondicion({ conclusionesTexto: '', conclusiones: [] })}
                    className="text-[10px] text-red-600 hover:text-red-700 font-bold flex items-center gap-0.5 cursor-pointer"
                    title="Borrar texto de conclusiones"
                  >
                    <Trash2 size={11} /> Limpiar
                  </button>
                )}
              </div>
              {condiciones.incluirConclusiones && (
                <textarea
                  rows={3}
                  value={condiciones.conclusionesTexto || (Array.isArray(condiciones.conclusiones) ? condiciones.conclusiones.join('\n') : '')}
                  onChange={(e) => handleUpdateCondicion({
                    conclusionesTexto: e.target.value,
                    conclusiones: e.target.value.split('\n').filter(Boolean)
                  })}
                  placeholder="Escriba las conclusiones o recomendaciones..."
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-gray-800 focus:outline-none focus:border-[#E30613]"
                />
              )}
              <p className="text-[10px] text-gray-400">
                {condiciones.incluirConclusiones ? 'Se mostrará antes del cuadro de costos.' : 'Sección oculta en A4 y Word.'}
              </p>
            </div>

            {/* 2. Observaciones / Notas Específicas */}
            <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-gray-800 flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(condiciones.incluirNotas)}
                    onChange={(e) => handleUpdateCondicion({ incluirNotas: e.target.checked })}
                    className="rounded text-red-600 cursor-pointer"
                  />
                  <span>Observaciones / Notas</span>
                </label>
                {condiciones.incluirNotas && (
                  <button
                    type="button"
                    onClick={() => handleUpdateCondicion({ notasObservaciones: '' })}
                    className="text-[10px] text-red-600 hover:text-red-700 font-bold flex items-center gap-0.5 cursor-pointer"
                    title="Borrar notas"
                  >
                    <Trash2 size={11} /> Limpiar
                  </button>
                )}
              </div>
              {condiciones.incluirNotas && (
                <textarea
                  rows={3}
                  value={condiciones.notasObservaciones || ''}
                  onChange={(e) => handleUpdateCondicion({ notasObservaciones: e.target.value })}
                  placeholder="Ej. Requerimiento especial para CAINSA..."
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-gray-800 focus:outline-none focus:border-[#E30613]"
                />
              )}
              <p className="text-[10px] text-gray-400">
                {condiciones.incluirNotas ? 'Se agregará como sección destacada.' : 'Sin notas forzadas.'}
              </p>
            </div>

            {/* 3. Políticas Generales de Empresa */}
            <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2">
              <label className="font-bold text-gray-800 flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={condiciones.incluirPoliticasGenerales !== false}
                  onChange={(e) => handleUpdateCondicion({ incluirPoliticasGenerales: e.target.checked })}
                  className="rounded text-red-600 cursor-pointer"
                />
                <span>Políticas de Empresa</span>
              </label>
              <p className="text-[11px] text-gray-500 leading-snug">
                {condiciones.incluirPoliticasGenerales !== false
                  ? 'Incluye cláusula legal de estimación y prueba operativa.'
                  : 'Documento limpio sin cláusulas legales fijas (ideal CAINSA).'}
              </p>
            </div>

            {/* 4. Selector de Técnico Firmante */}
            <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2">
              <label className="font-bold text-gray-800 flex items-center gap-1.5">
                <UserCheck size={14} className="text-[#E30613]" />
                <span>Técnico Firmante</span>
              </label>
              <select
                value={condiciones.tecnicoFirmanteNombre || tecnicoAsignado?.nombre_completo || ''}
                onChange={(e) => {
                  const selName = e.target.value;
                  const match = tecnicosList.find(t => t.nombre_completo === selName);
                  handleUpdateCondicion({
                    tecnicoFirmanteNombre: selName,
                    tecnicoFirmanteCargo: match?.cargo || 'Técnico Especialista RF'
                  });
                  if (match && formData.id) {
                    OrdersService.assignTechnician(formData.id, match.id, selName).catch(() => {});
                  }
                }}
                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-gray-800 focus:outline-none focus:border-[#E30613] cursor-pointer"
              >
                {tecnicosList.map(t => (
                  <option key={t.id} value={t.nombre_completo}>
                    👤 {t.nombre_completo} ({t.cargo || 'Técnico RF'})
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-gray-400">
                Firma derecha: <strong className="text-gray-700">{tecnicoFirmanteNombre}</strong>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* CONTENEDOR DE HOJAS A4 */}
      <div className="bg-slate-300/60 p-2 sm:p-8 rounded-3xl overflow-x-auto print:bg-transparent print:p-0 print:overflow-visible flex flex-col items-center">

        {/* ============================================================== */}
        {/* PÁGINA 1: INFORME TÉCNICO Y ECONÓMICO */}
        {/* ============================================================== */}
        <div className="a4-paper bg-white shadow-2xl print:shadow-none print:m-0 mb-8 print:mb-0 relative font-sans text-gray-900 leading-snug">

          {/* Membrete Superior Oficial */}
          <HeaderMembrete />

          <div className="px-2 sm:px-6 space-y-4 text-[12.5px] sm:text-[13px] text-gray-900">

            {/* A. Encabezado Oficial */}
            <div className="flex flex-col sm:flex-row justify-between items-start text-xs font-medium">
              <div>
                <p suppressHydrationWarning>Santa Cruz de la Sierra, {currentDate}</p>
              </div>
            </div>

            {/* Destinatario */}
            <div className="space-y-0.5">
              <p className="font-medium text-xs">Señores:</p>
              <p className="font-black text-sm sm:text-base text-gray-900 uppercase tracking-tight">
                {clienteNombreStr}
              </p>
              <p className="font-medium text-xs">Presente. -</p>
            </div>

            {/* Referencia Oficial */}
            <div className="pt-1">
              <p className="font-black underline underline-offset-4 text-xs sm:text-sm tracking-wide text-gray-900">
                REF.: INFORME TECNICO PRELIMINAR DE ORDEN DE SERVICIO: N° {ordenNumeroStr}
                {revisionEditable ? ` ${revisionEditable}` : ''}
              </p>
            </div>

            {/* Saludo inicial */}
            <p className="text-justify text-xs sm:text-sm">
              Atendiendo a su requerimiento, le enviamos el informe técnico de la Orden de Servicio.
            </p>

            {/* B. Sección 1: Solicitud del Cliente */}
            <div className="space-y-1 pt-1">
              <h3 className="font-black underline underline-offset-2 text-xs sm:text-sm text-gray-900">
                1. Solicitud del cliente:
              </h3>
              <p className="font-medium text-xs text-gray-700">
                Para reparación y mantenimiento general de equipos:
              </p>
              <ul className="list-disc list-inside space-y-1 text-xs text-gray-800 pl-2">
                {(formData.equipos || []).map((eq, idx) => (
                  <li key={eq.id || idx}>
                    <span className="font-bold">
                      Handy {eq.marca || 'Motorola'} {eq.modelo || 'Radio'} {eq.banda || 'VHF'}
                    </span>
                    {' – '}
                    <span className="font-mono">Serie: {eq.serie || eq.numero_serie || 'S/N'}</span>
                    {' - '}
                    <span>{getAccesoriosRecepcionStr(eq)}.</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* C. Sección 2: Diagnóstico de Radios */}
            <div className="space-y-2 pt-1">
              <h3 className="font-black underline underline-offset-2 text-xs sm:text-sm text-gray-900">
                2. Diagnóstico de radios:
              </h3>

              {(formData.equipos || []).map((eq, idx) => (
                <div key={eq.id || idx} className="space-y-1 text-xs pl-1">
                  <p className="font-black text-gray-900">
                    [{idx + 1}]. {eq.marca || 'Motorola'} {eq.modelo || 'Radio'} {eq.banda || 'VHF'} – Serie: {eq.serie || eq.numero_serie || 'S/N'}, se realizó la revisión general del equipo:
                  </p>

                  {eq.reparacion_rechazada ? (
                    <p className="font-black text-red-700 uppercase bg-red-50 p-2 rounded border border-red-200 text-[11px] leading-relaxed">
                      NOTA: EQUIPO NO REPARADO NO AUTORIZADO POR EL CLIENTE, REPARACION COTIZADA {formatCurrency(eq.costo_servicio || condiciones.costoRevision, moneda)}, SI SE DESEA REPARAR EL EQUIPO, SE DEBE ACTUALIZAR EL PRECIO.
                    </p>
                  ) : (
                    <div className="space-y-0.5 pl-3">
                      {/* Viñetas de placa */}
                      {eq.fallas && eq.fallas.length > 0 ? (
                        eq.fallas.map((f, fi) => (
                          <p key={fi} className="text-gray-800">
                            - El equipo presenta falla en <strong className="font-bold">{f.label?.toLowerCase() || 'componente de placa'}</strong>, requiere ajuste-calibración de parámetros, limpieza y mantenimiento general.
                          </p>
                        ))
                      ) : (
                        <p className="text-gray-800">
                          - El equipo presenta desgaste por uso operativo, requiere ajuste-calibración de parámetros, limpieza y mantenimiento general.
                        </p>
                      )}

                      {/* Viñeta antena */}
                      {eq.antenaEstado === 'REEMPLAZO' && (
                        <p className="text-gray-800">
                          - La antena presenta desgaste por uso, pero está funcionando con normalidad, se recomienda su reemplazo, se cotizará en forma opcional.
                        </p>
                      )}

                      {/* Viñeta batería */}
                      {(eq.bateriaEstado === 'REEMPLAZO' || (parseInt(eq.bateriaCarga, 10) > 0 && parseInt(eq.bateriaCarga, 10) < 70)) && (
                        <p className="text-gray-800">
                          - La batería {eq.bateriaModelo || 'del radio'}, tiene una capacidad de carga del {eq.bateriaCarga || 45}% se debe reemplazar, se cotizará en accesorios.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* D. Sección 3: Conclusiones / Recomendaciones (Condicional) */}
            {condiciones.incluirConclusiones && conclusionesList.length > 0 && (
              <div className="space-y-1 pt-1 break-inside-avoid">
                <h3 className="font-black underline underline-offset-2 text-xs sm:text-sm text-gray-900 uppercase">
                  CONCLUSIONES / RECOMENDACIONES:
                </h3>
                <p className="text-xs font-medium text-gray-700">
                  De acuerdo a la revisión realizada se observa:
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-xs text-gray-800 pl-2">
                  {conclusionesList.map((c, ci) => (
                    <li key={ci}>{c}</li>
                  ))}
                </ul>
                <p className="text-xs italic text-gray-600 pt-0.5">
                  Confirmarnos si se procede con el servicio técnico indicado.
                </p>
              </div>
            )}

            {/* D.2 Observaciones / Notas Adicionales (Condicional) */}
            {condiciones.incluirNotas && condiciones.notasObservaciones?.trim() && (
              <div className="space-y-1 pt-1.5 border-t border-gray-200 break-inside-avoid">
                <h3 className="font-black underline underline-offset-2 text-xs sm:text-sm text-gray-900 uppercase">
                  OBSERVACIONES / NOTAS:
                </h3>
                <p className="text-xs text-gray-800 whitespace-pre-line pl-2 leading-relaxed">
                  {condiciones.notasObservaciones.trim()}
                </p>
              </div>
            )}

            {/* E. Sección 4: Cuadro Económico ("Costo del Servicio:") */}
            <div className="space-y-2 pt-1">
              <h3 className="font-black underline underline-offset-2 text-xs sm:text-sm text-gray-900">
                Costo del Servicio:
              </h3>
              <p className="text-xs font-medium text-gray-700">
                Costo de la reparación, cambio de repuestos, mantenimiento y control operativo:
              </p>

              {/* Bloque 1: Servicio Técnico */}
              <div className="space-y-1.5 pt-1">
                {(formData.equipos || []).map((eq, idx) => {
                  const costo = parseFloat(eq.costo_servicio) || 0;
                  const desc = eq.descripcion_servicio || '(Servicio técnico, revisión general, limpieza, ajuste-calibración de parámetros y mantenimiento general)';

                  return (
                    <div key={eq.id || idx} className="text-xs">
                      <div className="flex justify-between items-center font-bold text-gray-900">
                        <span>{eq.marca || 'Radio'} {eq.modelo || ''} – Serie: {eq.serie || eq.numero_serie || 'S/N'}</span>
                        <span className="font-mono">{formatCurrency(costo, moneda)}</span>
                      </div>
                      <p className="text-[11px] text-gray-600 italic pl-2">
                        {desc}
                      </p>
                    </div>
                  );
                })}

                {/* Línea de Cierre Subtotal 1 */}
                <div className="flex justify-between items-center font-bold text-xs pt-1 border-t border-dotted border-gray-400">
                  <span>Sub total 1 Servicio técnico ...................................................</span>
                  <span className="font-mono font-black">{formatCurrency(subtotal1, moneda)}</span>
                </div>
              </div>

              {/* Bloque 2: Accesorios (Solo si existen) */}
              {accesoriosCotizados.length > 0 && (
                <div className="space-y-1 pt-1.5">
                  <p className="font-bold text-xs text-gray-900">Accesorios:</p>
                  {accesoriosCotizados.map((acc, ai) => {
                    const itemTotal = acc.cantidad * acc.precio;
                    return (
                      <div key={ai} className="flex justify-between items-center text-xs text-gray-800">
                        <span>
                          {acc.nombre} ({acc.cantidad} Unid X {formatCurrency(acc.precio, moneda)} c/u)
                          {acc.es_opcional && <span className="font-bold text-amber-700 ml-1">[Opcional]</span>}
                        </span>
                        <span className="font-mono">{formatCurrency(itemTotal, moneda)}</span>
                      </div>
                    );
                  })}

                  {/* Línea de Cierre Subtotal 2 */}
                  <div className="flex justify-between items-center font-bold text-xs pt-1 border-t border-dotted border-gray-400">
                    <span>Sub total 2 Accesorios .........................................................</span>
                    <span className="font-mono font-black">{formatCurrency(subtotal2, moneda)}</span>
                  </div>
                </div>
              )}

              {/* Sumatoria Total */}
              <div className="pt-2 border-t-2 border-gray-900">
                <div className="flex justify-between items-center font-black text-xs sm:text-sm text-gray-900">
                  <span className="tracking-tight">
                    SUMATORIA TOTAL: Servicio técnico + Accesorios ----------------------------------------
                  </span>
                  <span className="font-mono text-sm sm:text-base">{formatCurrency(sumatoriaTotal, moneda)}</span>
                </div>

                {/* Importe Literal Oficial */}
                <p className="text-xs font-bold text-gray-900 uppercase pt-1">
                  {getImporteLiteral(sumatoriaTotal, moneda)}
                </p>

                {/* Cláusula cambiaria obligatoria para USD */}
                {moneda === 'USD' && (
                  <p className="text-[11.5px] font-black text-gray-900 pt-1 leading-snug">
                    {CLAUSULA_CAMBIARIA_USD}
                  </p>
                )}
              </div>
            </div>

            {/* F. Sección 5: Términos Comerciales y Políticas */}
            <div className="space-y-1 pt-2 border-t border-gray-300 text-[11px] leading-relaxed text-gray-800">
              <h4 className="font-bold text-xs text-gray-900 uppercase">
                Términos Comerciales:
              </h4>
              <p>• <strong>Forma de pago:</strong> Al contado.</p>
              <p>• <strong>Vigencia de informe:</strong> {condiciones.diasVigencia || 5} días para su aprobación a partir de la fecha de entrega del presente informe.</p>
              <p>• <strong>Accesorios y repuestos:</strong> Disponibles en Stock, salvo ventas sin previo aviso.</p>
              <p>• <strong>Entrega de equipos reparados:</strong> {condiciones.tiempoEntrega || '1 a 2 semanas'}, posterior al día de la autorización por escrito del presente informe.</p>
              <p>• <strong>Garantía de la reparación:</strong> {condiciones.textoGarantia || '5 días calendario a partir de la entrega para verificación operativa.'}</p>

              {condiciones.incluirGarantiaBaterias && (
                <p>• <strong>Tiempo de prueba de baterías:</strong> Las baterías nuevas cuentan con 3 meses de garantía por defectos de fábrica.</p>
              )}

              <p>• <strong>Cuenta de cheque:</strong> Para pagos con cheque, este debe ser girado a nombre de: <strong>AMERICA SISTEMAS DE COMUNICACIÓN KEMLO SRL</strong></p>
              {condiciones.incluirPoliticasGenerales !== false ? (
                <>
                  <p>• <strong>Penalidad por no autorización:</strong> {getRevisionCostText(condiciones.costoRevision, moneda)}</p>

                  <div className="pt-2 text-[10px] text-gray-600 space-y-1">
                    <p className="font-bold text-gray-700 uppercase">Condiciones y Políticas Generales de la Empresa:</p>
                    <p className="text-justify">
                      SERVICIOS - Toda cotización de servicios, como ser instalaciones, servicio técnico, revisiones, reparaciones, mantenimientos, etc., son solo una estimación del precio por servicio y no el precio final, el cual variará de acuerdo a la particularidad de cada servicio. Se debe tomar en cuenta que en cada servicio se debe realizar las pruebas operativas de los equipos y posteriormente se pueden requerir más cambios de repuestos u accesorios, que serán cobrados de forma adicional.
                    </p>
                    <p className="italic pt-0.5">Sin otro particular, me despido.</p>
                  </div>
                </>
              ) : (
                <div className="pt-2 text-[11px] text-gray-700">
                  <p className="italic pt-0.5">Sin otro particular, me despido atentamente.</p>
                </div>
              )}
            </div>

            {/* G. Sección 6: Firmas al Pie */}
            <div className="pt-6 pb-2 grid grid-cols-2 gap-8 text-center text-[11px] leading-tight break-inside-avoid">
              <div>
                <div className="w-48 mx-auto border-t border-gray-900 pt-1 font-bold text-gray-900">
                  {currentUser?.nombre_completo || 'Atención al Cliente'}
                </div>
                <p className="text-[10px] text-gray-600">
                  {currentUser?.rol === 'ADMINISTRADOR' ? 'Administración / Gerencia' : 'Asistente de Servicio Técnico'}
                </p>
                <p className="text-[9.5px] text-gray-400 font-semibold">AMERICA SISTEMAS DE COMUNICACIÓN</p>
              </div>

              <div>
                <div className="w-48 mx-auto border-t border-gray-900 pt-1 font-bold text-gray-900">
                  {tecnicoFirmanteNombre}
                </div>
                <p className="text-[10px] text-gray-600">
                  {tecnicoFirmanteCargo}
                </p>
                <p className="text-[9.5px] text-gray-400 font-semibold">AMERICA SISTEMAS DE COMUNICACIÓN</p>
              </div>
            </div>

          </div>

          {/* Membrete Inferior Oficial */}
          <div className="mt-auto">
            <FooterMembrete />
          </div>
        </div>

        {/* ============================================================== */}
        {/* PÁGINA 2: ANEXO FOTOGRÁFICO (Página 2 A4 si hay fotos) */}
        {/* ============================================================== */}
        {tieneFotos && (
          <div className="a4-paper bg-white shadow-2xl print:shadow-none print:m-0 page-break relative font-sans text-gray-900 leading-snug">
            {/* Membrete Superior Oficial */}
            <HeaderMembrete />

            <div className="px-2 sm:px-6 space-y-6 text-gray-900">
              <div className="text-center space-y-1">
                <h2 className="text-base sm:text-lg font-black underline underline-offset-4 uppercase tracking-wider text-gray-900">
                  ANEXO FOTOGRAFICO OFICIAL
                </h2>
                <p className="text-xs text-gray-600 font-medium">
                  Registro visual de ingreso e inspección técnica de laboratorio por radio intervenida.
                </p>
              </div>

              {/* Bloques de evidencias organizados por cada radio */}
              <div className="space-y-6">
                {equiposConFotos.map((eqFoto, eqIdx) => (
                  <div key={eqIdx} className="border border-gray-300 rounded-2xl p-4 bg-slate-50/60 space-y-4 break-inside-avoid shadow-xs">
                    {/* Encabezado del Radio */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-gray-300">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-gray-900 text-white text-xs font-black flex items-center justify-center shrink-0">
                          {eqIdx + 1}
                        </span>
                        <h3 className="font-black text-sm text-gray-900 uppercase">
                          {eqFoto.handyLabel}
                        </h3>
                      </div>
                      <span className="font-mono text-xs font-bold bg-white border border-gray-300 px-3 py-1 rounded-lg text-gray-900 self-start sm:self-auto">
                        S/N: {eqFoto.serie}
                      </span>
                    </div>

                    {/* Dos Bloques Claros por Radio */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Bloque 1: Registro de Ingreso (Recepción) */}
                      <div className="space-y-2.5 bg-white p-3.5 rounded-xl border border-gray-200">
                        <div className="flex items-center gap-2 pb-1.5 border-b border-gray-200">
                          <Camera size={14} className="text-[#E30613]" />
                          <h4 className="font-black text-xs uppercase text-gray-900">
                            Registro de Ingreso (Recepción)
                          </h4>
                          <span className="ml-auto text-[10px] font-bold text-gray-500">
                            ({eqFoto.reception.length})
                          </span>
                        </div>

                        {eqFoto.reception.length === 0 ? (
                          <p className="text-[11px] text-gray-400 italic py-4 text-center">
                            Sin fotos de ingreso registradas en mostrador.
                          </p>
                        ) : (
                          <div className="grid grid-cols-2 gap-2.5">
                            {eqFoto.reception.map((foto, fi) => (
                              <div key={fi} className="border border-gray-200 p-1.5 bg-slate-50 rounded-lg space-y-1">
                                <img
                                  src={foto.url}
                                  alt={foto.etiqueta}
                                  className="w-full h-36 object-contain rounded bg-white"
                                />
                                <div className="text-[10px] text-gray-800 text-center font-medium truncate pt-0.5">
                                  {foto.etiqueta}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Bloque 2: Evidencia Técnica de Daños y Laboratorio */}
                      <div className="space-y-2.5 bg-white p-3.5 rounded-xl border border-gray-200">
                        <div className="flex items-center gap-2 pb-1.5 border-b border-gray-200">
                          <Sparkles size={14} className="text-blue-600" />
                          <h4 className="font-black text-xs uppercase text-gray-900">
                            Evidencia Técnica de Daños y Laboratorio
                          </h4>
                          <span className="ml-auto text-[10px] font-bold text-gray-500">
                            ({eqFoto.diagnosis.length})
                          </span>
                        </div>

                        {eqFoto.diagnosis.length === 0 ? (
                          <p className="text-[11px] text-gray-400 italic py-4 text-center">
                            Sin fotos de daños o placa en laboratorio.
                          </p>
                        ) : (
                          <div className="grid grid-cols-2 gap-2.5">
                            {eqFoto.diagnosis.map((foto, fi) => (
                              <div key={fi} className="border border-gray-200 p-1.5 bg-slate-50 rounded-lg space-y-1">
                                <img
                                  src={foto.url}
                                  alt={foto.etiqueta}
                                  className="w-full h-36 object-contain rounded bg-white"
                                />
                                <div className="text-[10px] text-blue-900 text-center font-medium truncate pt-0.5">
                                  {foto.etiqueta}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Membrete Inferior Oficial */}
            <div className="mt-auto">
              <FooterMembrete />
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
