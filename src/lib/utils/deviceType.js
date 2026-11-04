/**
 * Utilidades para clasificación y redacción técnica de equipos de radiocomunicación
 * AMÉRICA SISTEMAS DE COMUNICACIÓN SRL
 */

export const TIPOS_DISPOSITIVO = [
  'Handy / Portátil',
  'Radio Móvil / Base',
  'Repetidora / Estación Base'
];

export const CATALOGOS_ACCESORIOS_POR_TIPO = {
  'Handy / Portátil': [
    'Antena',
    'Batería',
    'Cargador de Base',
    'Clip de Cinturón',
    'Micrófono de Palma',
    'Manos Libres / PTT',
    'Eliminador de Batería',
    'Funda de Cuero',
    'Otros'
  ],
  'Radio Móvil / Base': [
    'Micrófono de Palma',
    'Cable de Alimentación DC',
    'Soporte de Montaje',
    'Antena Móvil / Base',
    'Parlante Externo',
    'Otros'
  ],
  'Repetidora / Estación Base': [
    'Cable de Alimentación AC / DC',
    'Duplexer',
    'Soporte de Rack',
    'Jumpers / Conectores RF',
    'Otros'
  ]
};

/**
 * Patrones conocidos para detección automática de Radios Móviles / Bases
 */
const PATRONES_MOVIL_BASE = [
  // Yaesu móviles
  /\bFTM[-_\s]?\d+/i,
  /\bFT[-_\s]?(2900|2980|1900|7900|8800|8900|2800|1802|1500)/i,
  // Motorola móviles
  /\bDGM[-_\s]?\d+/i,
  /\bDEM[-_\s]?\d+/i,
  /\bEM[-_\s]?(200|400)/i,
  /\bGM[-_\s]?(300|340|360|380|140|160|600|950)/i,
  /\bPRO[-_\s]?(3100|5100|7100)/i,
  /\bXPR[-_\s]?(4350|4550|5350|5550)/i,
  /\bCDM[-_\s]?(750|1250|1550)/i,
  /\bCM[-_\s]?(200|300)/i,
  /\bSM[-_\s]?(50|120)/i,
  /\bM[-_\s]?(120|130|208|216)/i,
  /\bMAXTRAC/i,
  // Vertex móviles
  /\bVX[-_\s]?(2100|2200|4500|4600|4100|4200|5500|6000)/i,
  // Kenwood móviles
  /\bTK[-_\s]?(7102|7160|7180|7302|7360|8102|8160|8180|8302|8360|760|762|860|862)/i,
  /\bTM[-_\s]?(271|281|471|481|V71|D710)/i,
  /\bNX[-_\s]?(700|800|720|820|3720|3820|5700|5800)/i,
  // Icom móviles
  /\bIC[-_\s]?(2200H|2300H|F5021|F6021|F5061|F6061|F110|F210|F510|F610|2730|208H|V8000)/i,
  // Hytera móviles
  /\bMD[-_\s]?(656|786|616|626|785|655)/i,
  /\bHM[-_\s]?(786|686|656)/i,
  // Palabras clave genéricas
  /\b(MOVIL|MÓVIL|MOBILE|BASE|VEHICULAR|VEHICULO)\b/i
];

/**
 * Patrones conocidos para Repetidoras / Estaciones Base
 */
const PATRONES_REPETIDORA = [
  /\bSLR[-_\s]?\d+/i,
  /\bCDR[-_\s]?(700|500)/i,
  /\bMTR[-_\s]?(2000|3000)/i,
  /\bGR[-_\s]?(1225|300|500)/i,
  /\bTKR[-_\s]?(750|850|720|820)/i,
  /\bNXR[-_\s]?(700|800|710|810)/i,
  /\bVXR[-_\s]?(7000|9000)/i,
  /\bRD[-_\s]?(986|985|625)/i,
  /\bHR[-_\s]?(1065|655)/i,
  /\b(REPETIDOR|REPETIDORA|REPEATER|ESTACION BASE|ESTACIÓN BASE)\b/i
];

/**
 * Determina el tipo de dispositivo normalizado de un equipo
 * @param {Object} equipo
 * @returns {'Handy / Portátil' | 'Radio Móvil / Base' | 'Repetidora / Estación Base'}
 */
export function getDeviceType(equipo = {}) {
  // 1. Si viene explícito en tipo_dispositivo o tipoDispositivo
  const rawType = equipo.tipo_dispositivo || equipo.tipoDispositivo;
  if (rawType && TIPOS_DISPOSITIVO.includes(rawType)) {
    return rawType;
  }

  // 2. Si fue serializado en notas_adicionales
  if (equipo.notas_adicionales && typeof equipo.notas_adicionales === 'string') {
    const match = equipo.notas_adicionales.match(/TIPO_DISPOSITIVO:\s*([^;\n]+)/i);
    if (match && match[1]) {
      const parsed = match[1].trim();
      if (TIPOS_DISPOSITIVO.includes(parsed)) return parsed;
    }
  }

  // 3. Auto-detección por modelo / marca
  const modelo = String(equipo.modelo || '').trim();
  const falla = String(equipo.falla_declarada_cliente || '').trim();
  const fullText = `${equipo.marca || ''} ${modelo} ${falla}`.trim();

  for (const regex of PATRONES_REPETIDORA) {
    if (regex.test(fullText)) {
      return 'Repetidora / Estación Base';
    }
  }

  for (const regex of PATRONES_MOVIL_BASE) {
    if (regex.test(fullText)) {
      return 'Radio Móvil / Base';
    }
  }

  // Por defecto en taller de radiocomunicaciones
  return 'Handy / Portátil';
}

/**
 * Retorna el prefijo formal para títulos y redacciones
 * @param {Object|string} equipoOrType
 * @returns {string} 'Radio Móvil' | 'Handy' | 'Repetidora'
 */
export function getDevicePrefix(equipoOrType) {
  const tipo = typeof equipoOrType === 'string' ? equipoOrType : getDeviceType(equipoOrType);
  if (tipo === 'Radio Móvil / Base') return 'Radio Móvil';
  if (tipo === 'Repetidora / Estación Base') return 'Repetidora';
  return 'Handy';
}

/**
 * Retorna la etiqueta formateada para identificación de equipo
 * Ej: "Radio Móvil Yaesu FTM-3100" o "Handy Motorola DEP450"
 */
export function getDeviceFullLabel(equipo = {}, fallbackIdx = 1) {
  const prefix = getDevicePrefix(equipo);
  const marca = (equipo.marca || 'Motorola').trim();
  const modelo = (equipo.modelo || `Equipo #${fallbackIdx}`).trim();
  return `${prefix} ${marca} ${modelo}`.trim();
}

/**
 * Formatea la redacción de recepción de accesorios para la Sección 1 del informe
 * @param {Object} equipo
 * @returns {string} Texto redactado con estilo formal de taller
 */
export function formatEquipmentReceptionText(equipo = {}) {
  const tipo = getDeviceType(equipo);
  const prefix = getDevicePrefix(equipo);
  const marca = (equipo.marca || 'Motorola').trim();
  const modelo = (equipo.modelo || 'Radio').trim();
  const banda = (equipo.banda || 'VHF').trim();
  const serie = (equipo.serie || equipo.numero_serie || 'S/N').trim();
  const acc = equipo.accesoriosRecepcion || {};

  // Caso A: Radio Móvil / Base
  if (tipo === 'Radio Móvil / Base') {
    const micPresencia = acc['Micrófono de Palma'] || acc['Microfono de Palma'] || 'CON';
    const micConector = acc['Micrófono de Palma_conector'] || acc['Microfono de Palma_conector'];
    const cablePresencia = acc['Cable de Alimentación DC'] || acc['Cable de Alimentacion DC'] || 'CON';
    const soportePresencia = acc['Soporte de Montaje'] || 'CON';
    const otros = acc['Otros'] === 'CON' && equipo.otrosDescripcion ? `, ${equipo.otrosDescripcion}` : '';

    let accesorioDetalle = '';
    if (micPresencia === 'CON') {
      const conectorTxt = micConector ? ` (${micConector})` : '';
      if (cablePresencia === 'CON' && soportePresencia === 'CON') {
        accesorioDetalle = `Con micrófono de palma${conectorTxt} y accesorios de montaje`;
      } else if (cablePresencia === 'CON') {
        accesorioDetalle = `Con micrófono de palma${conectorTxt} y cable de alimentación DC`;
      } else if (soportePresencia === 'CON') {
        accesorioDetalle = `Con micrófono de palma${conectorTxt} y soporte de montaje`;
      } else {
        accesorioDetalle = `Con micrófono de palma${conectorTxt}`;
      }
    } else {
      if (cablePresencia === 'CON' || soportePresencia === 'CON') {
        accesorioDetalle = 'Sin micrófono de palma, con accesorios de montaje';
      } else {
        accesorioDetalle = 'Sin micrófono de palma ni cables de montaje';
      }
    }

    if (otros) accesorioDetalle += otros;

    return `${prefix} ${marca} ${modelo} ${banda} – Serie: ${serie} - ${accesorioDetalle}.`;
  }

  // Caso B: Repetidora / Estación Base
  if (tipo === 'Repetidora / Estación Base') {
    const cableAC = acc['Cable de Alimentación AC / DC'] || 'CON';
    const duplexer = acc['Duplexer'] || 'CON';
    const rack = acc['Soporte de Rack'] || 'CON';
    const otros = acc['Otros'] === 'CON' && equipo.otrosDescripcion ? `, ${equipo.otrosDescripcion}` : '';

    const partes = [];
    if (cableAC === 'CON') partes.push('cable de poder');
    if (duplexer === 'CON') partes.push('duplexer');
    if (rack === 'CON') partes.push('soporte para rack');

    const accDetalle = partes.length > 0 
      ? `Con ${partes.join(', ')}` 
      : 'Sin cables ni módulos externos';

    return `${prefix} ${marca} ${modelo} ${banda} – Serie: ${serie} - ${accDetalle}${otros}.`;
  }

  // Caso C: Handy / Portátil
  const bat = acc['Batería'] || acc['Bateria'] || 'CON';
  const ant = acc['Antena'] || 'CON';
  const clip = acc['Clip de Cinturón'] || acc['Clip de Cinturon'] || 'CON';
  const carg = acc['Cargador de Base'] || 'SIN';
  const mic = acc['Micrófono de Palma'] || acc['Microfono de Palma'] || 'SIN';
  const otros = acc['Otros'] === 'CON' && equipo.otrosDescripcion ? `, ${equipo.otrosDescripcion}` : '';

  const presentes = [];
  if (bat === 'CON') presentes.push('batería');
  if (ant === 'CON') presentes.push('antena');
  if (clip === 'CON') presentes.push('clip');
  if (carg === 'CON') presentes.push('cargador de base');
  if (mic === 'CON') presentes.push('micrófono de palma');

  let accDetalle = '';
  if (presentes.length >= 3) {
    accDetalle = `Con ${presentes.slice(0, -1).join(', ')} y ${presentes[presentes.length - 1]}`;
  } else if (presentes.length > 0) {
    accDetalle = `Con ${presentes.join(' y ')}`;
  } else {
    accDetalle = 'Sin accesorios (solo cuerpo de radio)';
  }

  return `${prefix} ${marca} ${modelo} ${banda} – Serie: ${serie} - ${accDetalle}${otros}.`;
}

export const DEFAULT_GENERIC_SERVICE_DESCRIPTION = '(Servicio técnico, revisión general, limpieza, ajuste-calibración de parámetros y mantenimiento general)';

/**
 * Genera la descripción técnica formal del trabajo por equipo
 * incorporando fallas de placa y repuestos cotizados en Fase 2.
 * @param {Object} equipo
 * @returns {string}
 */
export function generarDescripcionServicio(equipo = {}) {
  if (equipo.no_autorizo_revision) {
    return '(El cliente no autorizo la reparación, solo se cobra el servicio de revisión y diagnostico)';
  }

  // 1. Extraer fallas registradas en Fase 2 (códigos o labels)
  const fallas = (equipo.fallas_placa || equipo.equipo_fallas || equipo.fallas || [])
    .map(f => {
      if (typeof f === 'string') return f.trim();
      return f.label || f.codigo || f.nombre || '';
    })
    .filter(Boolean);

  // 2. Extraer repuestos con reemplazo sugerido
  const repuestos = (equipo.repuestos_cotizados || equipo.equipo_repuestos_cotizados || equipo.repuestos || [])
    .filter(r => r.se_reemplaza)
    .map(r => (typeof r === 'string' ? r : r.nombre || ''))
    .filter(Boolean);

  const intervenciones = [...new Set([...fallas, ...repuestos])];

  if (intervenciones.length > 0) {
    const detalleIntervencion = intervenciones.join(', ');
    return `(Servicio técnico, reparación/reemplazo de ${detalleIntervencion}, revisión general, limpieza, ajuste-calibración de parámetros y mantenimiento general)`;
  }

  // Si el usuario guardó un texto_diagnostico específico no genérico en Fase 2, respetarlo si no hay fallas/repuestos
  const diag = String(equipo.texto_diagnostico || '').trim();
  if (diag && diag !== DEFAULT_GENERIC_SERVICE_DESCRIPTION && !diag.startsWith('(Servicio técnico, revisión general')) {
    return diag.startsWith('(') && diag.endsWith(')') ? diag : `(${diag})`;
  }

  // Si no hubo fallas específicas registradas, usar el texto base:
  return DEFAULT_GENERIC_SERVICE_DESCRIPTION;
}

/**
 * Retorna la descripción efectiva de un equipo para presupuestos e informes.
 * Si fue editada manualmente o difiere de la genérica, se respeta la del equipo.
 * De lo contrario, se autogenera dinámicamente según fallas/repuestos.
 * @param {Object} equipo
 * @returns {string}
 */
export function getDescripcionEfectiva(equipo = {}) {
  if (!equipo) return DEFAULT_GENERIC_SERVICE_DESCRIPTION;

  if (equipo.no_autorizo_revision) {
    return '(El cliente no autorizo la reparación, solo se cobra el servicio de revisión y diagnostico)';
  }

  const descActual = String(equipo.descripcion_servicio || '').trim();

  // Si el usuario modificó manualmente el texto en Fase 3
  if (equipo.descripcion_servicio_manual && descActual) {
    return descActual;
  }

  // Si tiene un texto no vacío y NO es exactamente el texto genérico base
  const isGeneric = !descActual || 
    descActual === DEFAULT_GENERIC_SERVICE_DESCRIPTION ||
    (descActual.startsWith('(Servicio técnico, revisión general') && descActual.endsWith('mantenimiento general)'));

  if (!isGeneric) {
    return descActual;
  }

  // Si es genérico o está vacío, autogenerar según fallas y repuestos
  return generarDescripcionServicio(equipo);
}


/**
 * Retorna las líneas limpias de diagnóstico técnico para un equipo en la sección 2 del informe.
 * Aplica prioridad exclusiva: si el usuario/técnico redactó o editó texto_diagnostico,
 * se utiliza ÚNICAMENTE dicho texto (limpiando guiones iniciales redundantes para evitar "• - -").
 * Si no hay texto manual, se genera el texto a partir de las fallas registradas de la placa.
 * @param {Object} equipo
 * @returns {string[]}
 */
export function obtenerLineasDiagnosticoEquipo(equipo = {}) {
  if (!equipo) return [];

  // 1. Si el usuario redactó/editó en Fase 2 o 3, usar ÚNICAMENTE su texto:
  const textoManual = String(equipo.texto_diagnostico || '').trim();
  if (textoManual.length > 0) {
    const rawLines = textoManual.split('\n');
    const cleanedLines = rawLines
      .map(line => line.trim().replace(/^[-–—•*\s]+/, '').trim())
      .filter(line => line.length > 0);

    if (cleanedLines.length > 0) {
      return cleanedLines;
    }
  }

  // 2. Fallback: Si no hay texto manual, usar las fallas autogeneradas de la placa:
  const fallas = (equipo.fallas_placa || equipo.equipo_fallas || equipo.fallas || [])
    .map(f => {
      if (typeof f === 'string') return f.trim();
      return f.label || f.descripcion || f.nombre || '';
    })
    .filter(Boolean);

  if (fallas.length > 0) {
    return [
      `El equipo presenta falla en ${fallas.join(', ')}, requiere ajuste-calibración de parámetros, limpieza y mantenimiento general.`
    ];
  }

  // 3. Fallback base:
  return [
    'Revisión técnica general, pruebas de transmisión/recepción operativas y mantenimiento preventivo.'
  ];
}

/**
 * Retorna el texto unificado de diagnóstico técnico para un equipo (sección 2).
 * @param {Object} equipo
 * @returns {string}
 */
export function obtenerTextoDiagnosticoEquipo(equipo = {}) {
  const lineas = obtenerLineasDiagnosticoEquipo(equipo);
  return lineas.join('\n');
}
