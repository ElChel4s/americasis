import { query } from '../../lib/config/database';

// Fallback en memoria en caso de desarrollo offline
let fallbackAccessories = [
  { id: 'acc-1', nombre: 'Antena', repuesto_sugerido_defecto: 'Antena Heliflex Original VHF/UHF', orden_visual: 1, activo: true, es_sistema: true },
  { id: 'acc-2', nombre: 'Batería', repuesto_sugerido_defecto: 'Batería Li-ion PMNN4077 / NNTN4497', orden_visual: 2, activo: true, es_sistema: true },
  { id: 'acc-3', nombre: 'Cargador completo', repuesto_sugerido_defecto: 'Cargador de Escritorio Rápido Completo', orden_visual: 3, activo: true, es_sistema: true },
  { id: 'acc-4', nombre: 'Clip de cinturón', repuesto_sugerido_defecto: 'Clip de Cinturón Original Motorola', orden_visual: 4, activo: true, es_sistema: true },
  { id: 'acc-5', nombre: 'Micrófono externo', repuesto_sugerido_defecto: 'Micrófono de Solapa Remoto PMMN4013', orden_visual: 5, activo: true, es_sistema: true },
  { id: 'acc-6', nombre: 'Adaptador', repuesto_sugerido_defecto: 'Adaptador / Transformador 220V', orden_visual: 6, activo: true, es_sistema: true },
  { id: 'acc-7', nombre: 'Base de cargador', repuesto_sugerido_defecto: 'Cuna de Carga Rápida', orden_visual: 7, activo: true, es_sistema: true },
  { id: 'acc-8', nombre: 'Micrófono de radio', repuesto_sugerido_defecto: 'Micrófono de Mano Estándar', orden_visual: 8, activo: true, es_sistema: true },
  { id: 'acc-9', nombre: 'Cable de alimentación', repuesto_sugerido_defecto: 'Cable de Poder DC con Fusible', orden_visual: 9, activo: true, es_sistema: true },
  { id: 'acc-10', nombre: 'Fuente de poder', repuesto_sugerido_defecto: 'Fuente de Poder Regulada 13.8V', orden_visual: 10, activo: true, es_sistema: true },
  { id: 'acc-11', nombre: 'Otros', repuesto_sugerido_defecto: 'Accesorio Especial Adicional', orden_visual: 99, activo: true, es_sistema: true },
];

let fallbackFaults = [
  { codigo: 'ETAPA_TX', categoria: 'TX', label: 'Etapa TX Inoperativa', descripcion: 'Circuito transmisor sin emisión de portadora RF', activo: true, es_sistema: true },
  { codigo: 'MODULO_POTENCIA', categoria: 'TX', label: 'Módulo P.A. Degradado', descripcion: 'Potencia baja (<1.5 Watts) o transistores finales dañados', activo: true, es_sistema: true },
  { codigo: 'FRECUENCIA_DESPLAZADA', categoria: 'TX', label: 'Frecuencia Desplazada', descripcion: 'Oscilador descalibrado, error de frecuencia > 500 Hz', activo: true, es_sistema: true },
  { codigo: 'DISTORSION_TX', categoria: 'TX', label: 'Modulación TX Distorsionada', descripcion: 'Audio recortado o sobremodulación por desviador defectuoso', activo: true, es_sistema: true },
  { codigo: 'PTT_SWITCH', categoria: 'TX', label: 'Pulsador PTT Roto', descripcion: 'Microswitch lateral no conmuta a transmisión', activo: true, es_sistema: true },
  { codigo: 'ETAPA_RX', categoria: 'RX', label: 'Etapa RX Sorda / Débil', descripcion: 'Sensibilidad degradada, no recibe señales lejanas', activo: true, es_sistema: true },
  { codigo: 'SQUELCH_ABIERTO', categoria: 'RX', label: 'Squelch Abierto Permanente', descripcion: 'Ruido blanco constante sin silenciamiento', activo: true, es_sistema: true },
  { codigo: 'DIODO_RX', categoria: 'RX', label: 'Diodo PIN RX en Corto', descripcion: 'Diodo de conmutación quemado por exceso de RF', activo: true, es_sistema: true },
  { codigo: 'FILTRO_FI', categoria: 'RX', label: 'Filtro FI Descalibrado', descripcion: 'Filtro cerámico de 455 kHz cristalizado con pérdida', activo: true, es_sistema: true },
  { codigo: 'CHIP_AUDIO', categoria: 'AUDIO', label: 'Amplificador Audio Mudo', descripcion: 'Sin salida al altavoz, chip BTL o capacitor en corto', activo: true, es_sistema: true },
  { codigo: 'PARLANTE_ROTO', categoria: 'AUDIO', label: 'Cono de Parlante Roto', descripcion: 'Membrana perforada o bobina abierta / raspando', activo: true, es_sistema: true },
  { codigo: 'MIC_INTERNO', categoria: 'AUDIO', label: 'Micrófono Electret Inoperativo', descripcion: 'Cápsula de micrófono interno muda o con falso contacto', activo: true, es_sistema: true },
  { codigo: 'POTENCIOMETRO_VOL', categoria: 'AUDIO', label: 'Potenciómetro Volumen Falso', descripcion: 'Pistas resistivas desgastadas o eje quebrado', activo: true, es_sistema: true },
  { codigo: 'SELECTOR_CANALES', categoria: 'AUDIO', label: 'Selector Canales Desgastado', descripcion: 'Encoder rotativo salta canales o gira libre', activo: true, es_sistema: true },
  { codigo: 'NO_ENCIENDE', categoria: 'ALIMENTACION', label: 'Equipo No Enciende', descripcion: 'Consumo cero o cortocircuito directo en fuente DC', activo: true, es_sistema: true },
  { codigo: 'BORNES_BATERIA', categoria: 'ALIMENTACION', label: 'Terminales Batería Sulfatados', descripcion: 'Contactos dorados deformados o con corrosión', activo: true, es_sistema: true },
  { codigo: 'SE_APAGA_PTT', categoria: 'ALIMENTACION', label: 'Se Apaga al Transmitir', descripcion: 'Caída brusca de voltaje por alta resistencia interna', activo: true, es_sistema: true },
  { codigo: 'PANTALLA_LCD', categoria: 'LOGICA', label: 'Display LCD Roto', descripcion: 'Segmentos faltantes o cristal líquido derramado', activo: true, es_sistema: true },
  { codigo: 'FIRMWARE_CODEPLUG', categoria: 'LOGICA', label: 'Corrupción de Codeplug', descripcion: 'Error de memoria EEPROM o microcontrolador bloqueado', activo: true, es_sistema: true },
  { codigo: 'ENTRADA_HUMEDAD', categoria: 'CHASIS', label: 'Ingreso Humedad / Sulfato', descripcion: 'Placa con óxido de cobre y residuos minerales', activo: true, es_sistema: true },
  { codigo: 'CONECTOR_SMA', categoria: 'CHASIS', label: 'Conector Antena Quebrado', descripcion: 'Pin central SMA o rosca arrancada de la placa', activo: true, es_sistema: true },
  { codigo: 'CARCASA_FRACTURADA', categoria: 'CHASIS', label: 'Carcasa Frontal Rajada', descripcion: 'Sellos de protección IP54/IP67 comprometidos', activo: true, es_sistema: true },
];

export const CatalogsRepository = {
  /**
   * Obtiene todas las fallas de placa
   */
  async getFaults({ includeInactive = false } = {}) {
    try {
      const where = includeInactive ? '' : 'WHERE activo = true';
      const { rows } = await query(`
        SELECT codigo, categoria, label, descripcion, es_sistema, activo, creado_en
        FROM catalogo_fallas_placa
        ${where}
        ORDER BY categoria ASC, label ASC
      `);
      return rows;
    } catch (err) {
      return fallbackFaults.filter(f => includeInactive || f.activo);
    }
  },

  /**
   * Registra o actualiza una falla en el catálogo maestro
   */
  async createFault({ codigo, categoria = 'TX', label, descripcion = '', es_sistema = false }) {
    const cleanCode = (codigo || label)
      .toUpperCase()
      .trim()
      .replace(/[^A-Z0-9_]/g, '_');

    try {
      const { rows } = await query(`
        INSERT INTO catalogo_fallas_placa (codigo, categoria, label, descripcion, es_sistema, activo)
        VALUES ($1, $2, $3, $4, $5, true)
        ON CONFLICT (codigo) DO UPDATE
        SET categoria = EXCLUDED.categoria,
            label = EXCLUDED.label,
            descripcion = EXCLUDED.descripcion,
            activo = true
        RETURNING *
      `, [cleanCode, (categoria || 'TX').toUpperCase(), label.trim(), descripcion.trim(), es_sistema]);

      return rows[0];
    } catch (err) {
      const idx = fallbackFaults.findIndex(f => f.codigo === cleanCode);
      const newFalla = {
        codigo: cleanCode,
        categoria: (categoria || 'TX').toUpperCase(),
        label: label.trim(),
        descripcion: descripcion.trim(),
        activo: true,
        es_sistema,
      };
      if (idx >= 0) fallbackFaults[idx] = newFalla;
      else fallbackFaults.push(newFalla);
      return newFalla;
    }
  },

  /**
   * Actualiza datos de una falla existente
   */
  async updateFault(codigo, { categoria, label, descripcion, activo }) {
    try {
      const { rows } = await query(`
        UPDATE catalogo_fallas_placa
        SET 
          categoria = COALESCE($1, categoria),
          label = COALESCE($2, label),
          descripcion = COALESCE($3, descripcion),
          activo = COALESCE($4, activo)
        WHERE codigo = $5
        RETURNING *
      `, [
        categoria ? categoria.toUpperCase() : null,
        label ? label.trim() : null,
        descripcion !== undefined ? descripcion.trim() : null,
        activo !== undefined ? activo : null,
        codigo
      ]);
      return rows[0] || null;
    } catch (err) {
      const idx = fallbackFaults.findIndex(f => f.codigo === codigo);
      if (idx >= 0) {
        if (categoria) fallbackFaults[idx].categoria = categoria.toUpperCase();
        if (label) fallbackFaults[idx].label = label.trim();
        if (descripcion !== undefined) fallbackFaults[idx].descripcion = descripcion.trim();
        if (activo !== undefined) fallbackFaults[idx].activo = activo;
        return { ...fallbackFaults[idx] };
      }
      return null;
    }
  },

  /**
   * Obtiene el catálogo de accesorios de recepción
   */
  async getAccessories({ includeInactive = false } = {}) {
    try {
      const where = includeInactive ? '' : 'WHERE activo = true';
      const { rows } = await query(`
        SELECT id, nombre, repuesto_sugerido_defecto, es_sistema, orden_visual, activo, creado_en
        FROM catalogo_accesorios_recepcion
        ${where}
        ORDER BY orden_visual ASC, nombre ASC
      `);
      return rows;
    } catch (err) {
      return fallbackAccessories.filter(a => includeInactive || a.activo);
    }
  },

  /**
   * Registra un nuevo accesorio en el catálogo
   */
  async createAccessory({ nombre, repuesto_sugerido_defecto = '', es_sistema = false, orden_visual = 100 }) {
    try {
      const { rows } = await query(`
        INSERT INTO catalogo_accesorios_recepcion (nombre, repuesto_sugerido_defecto, es_sistema, orden_visual, activo)
        VALUES ($1, $2, $3, $4, true)
        ON CONFLICT (nombre) DO UPDATE
        SET repuesto_sugerido_defecto = COALESCE(EXCLUDED.repuesto_sugerido_defecto, catalogo_accesorios_recepcion.repuesto_sugerido_defecto),
            activo = true
        RETURNING *
      `, [nombre.trim(), repuesto_sugerido_defecto?.trim() || null, es_sistema, orden_visual]);

      return rows[0];
    } catch (err) {
      const newAcc = {
        id: `acc-${Date.now()}`,
        nombre: nombre.trim(),
        repuesto_sugerido_defecto: repuesto_sugerido_defecto?.trim() || null,
        es_sistema,
        orden_visual,
        activo: true
      };
      fallbackAccessories.push(newAcc);
      return newAcc;
    }
  },

  /**
   * Actualiza datos de un accesorio
   */
  async updateAccessory(id, { nombre, repuesto_sugerido_defecto, orden_visual, activo }) {
    try {
      const { rows } = await query(`
        UPDATE catalogo_accesorios_recepcion
        SET 
          nombre = COALESCE($1, nombre),
          repuesto_sugerido_defecto = COALESCE($2, repuesto_sugerido_defecto),
          orden_visual = COALESCE($3, orden_visual),
          activo = COALESCE($4, activo)
        WHERE id = $5
        RETURNING *
      `, [
        nombre ? nombre.trim() : null,
        repuesto_sugerido_defecto !== undefined ? (repuesto_sugerido_defecto ? repuesto_sugerido_defecto.trim() : null) : null,
        orden_visual !== undefined ? Number(orden_visual) : null,
        activo !== undefined ? activo : null,
        id
      ]);
      return rows[0] || null;
    } catch (err) {
      const idx = fallbackAccessories.findIndex(a => a.id === id || a.nombre === nombre);
      if (idx >= 0) {
        if (nombre) fallbackAccessories[idx].nombre = nombre.trim();
        if (repuesto_sugerido_defecto !== undefined) fallbackAccessories[idx].repuesto_sugerido_defecto = repuesto_sugerido_defecto;
        if (orden_visual !== undefined) fallbackAccessories[idx].orden_visual = Number(orden_visual);
        if (activo !== undefined) fallbackAccessories[idx].activo = activo;
        return { ...fallbackAccessories[idx] };
      }
      return null;
    }
  }
};
