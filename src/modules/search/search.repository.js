import { query } from '../../lib/config/database';

const MOCK_ORDERS = [];
const OLD_MOCK_ORDERS = [
  {
    id: 124,
    numero_orden: 'OS-00124',
    cliente_id: 1,
    razon_social: 'MINERA SAN CRISTOBAL S.A.',
    nit_ci: '1020304050',
    cliente_telefono: '+591 2 2114455',
    cliente_email: 'logistica@sancristobal.com',
    persona_contacto: 'Ing. Carlos Mendoza (Jefe Telecomunicaciones)',
    recepcionista_nombre_manual: 'Ana Martínez',
    estado: 'EN_DIAGNOSTICO',
    moneda: 'BOB',
    tasa_cambio: 6.96,
    monto_subtotal_servicio: 300.00,
    monto_subtotal_accesorios: 420.00,
    sumatoria_total: 720.00,
    total_literal: 'SETECIENTOS VEINTE 00/100 BOLIVIANOS',
    creado_en: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    actualizado_en: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    total_equipos: 2,
    equipos: [
      {
        id: 101,
        orden_id: 124,
        orden_indice: 1,
        marca: 'Motorola',
        modelo: 'DEP450',
        numero_serie: '672TCX1234',
        banda: 'VHF',
        estado_individual: 'EN_DIAGNOSTICO',
        reparacion_rechazada: false,
        falla_declarada_cliente: 'No transmite potencia RF en canal 3',
        texto_diagnostico: 'Módulo amplificador de potencia RF con transistor final en cortocircuito.',
        descripcion_servicio: 'Mantenimiento preventivo, reemplazo de módulo PA y calibración',
        costo_servicio: 150.00,
        creado_en: new Date(Date.now() - 24 * 3600 * 1000).toISOString()
      },
      {
        id: 102,
        orden_id: 124,
        orden_indice: 2,
        marca: 'Motorola',
        modelo: 'DEP450',
        numero_serie: '672TCX5678',
        banda: 'VHF',
        estado_individual: 'EN_DIAGNOSTICO',
        reparacion_rechazada: false,
        falla_declarada_cliente: 'Audio con fritura y volumen muy bajo',
        texto_diagnostico: 'Cono de altavoz roto por saturación de polvo mineralizado.',
        descripcion_servicio: 'Limpieza ultrasónica de chasis y cambio de altavoz',
        costo_servicio: 150.00,
        creado_en: new Date(Date.now() - 24 * 3600 * 1000).toISOString()
      }
    ]
  },
  {
    id: 123,
    numero_orden: 'OS-00123',
    cliente_id: 2,
    razon_social: 'EMPRESA MINERA MANQUIRI S.A.',
    nit_ci: '1015243021',
    cliente_telefono: '+591 2 2445566',
    cliente_email: 'compras@manquiri.bo',
    persona_contacto: 'Lic. Roberto Vaca',
    recepcionista_nombre_manual: 'Marcelo Pardo',
    estado: 'ESPERANDO_REPUESTO',
    moneda: 'BOB',
    tasa_cambio: 6.96,
    monto_subtotal_servicio: 200.00,
    monto_subtotal_accesorios: 620.00,
    sumatoria_total: 820.00,
    total_literal: 'OCHOCIENTOS VEINTE 00/100 BOLIVIANOS',
    creado_en: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    actualizado_en: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    total_equipos: 1,
    equipos: [
      {
        id: 103,
        orden_id: 123,
        orden_indice: 1,
        marca: 'Motorola',
        modelo: 'DGP8550',
        numero_serie: '781TYA9901',
        banda: 'UHF',
        estado_individual: 'ESPERANDO_REPUESTO',
        reparacion_rechazada: false,
        falla_declarada_cliente: 'Display partido y perilla selectora rota tras caída',
        texto_diagnostico: 'Pantalla LCD monocromática quebrada, requiere cambio de carátula frontal completa.',
        descripcion_servicio: 'Sustitución de housing frontal y calibración digital MOTOTRBO',
        costo_servicio: 200.00,
        creado_en: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString()
      }
    ]
  },
  {
    id: 122,
    numero_orden: 'OS-00122',
    cliente_id: 3,
    razon_social: 'SEGURIDAD PRIVADA ATLAS S.R.L.',
    nit_ci: '1033445566',
    cliente_telefono: '+591 3 3322110',
    cliente_email: 'operaciones@atlas-seguridad.com',
    persona_contacto: 'Cap. Fernando Suárez',
    recepcionista_nombre_manual: 'Ana Martínez',
    estado: 'LISTO',
    moneda: 'BOB',
    tasa_cambio: 6.96,
    monto_subtotal_servicio: 150.00,
    monto_subtotal_accesorios: 200.00,
    sumatoria_total: 350.00,
    total_literal: 'TRESCIENTOS CINCUENTA 00/100 BOLIVIANOS',
    creado_en: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
    actualizado_en: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    total_equipos: 1,
    equipos: [
      {
        id: 104,
        orden_id: 122,
        orden_indice: 1,
        marca: 'Motorola',
        modelo: 'PRO5150',
        numero_serie: '422TCB4433',
        banda: 'VHF',
        estado_individual: 'LISTO',
        reparacion_rechazada: false,
        falla_declarada_cliente: 'Batería no retiene carga y antena desgastada',
        texto_diagnostico: 'Equipo operativo en parámetros RF. Batería de níquel agotada por ciclos de carga.',
        descripcion_servicio: 'Alineación de frecuencia y reemplazo de accesorios',
        costo_servicio: 150.00,
        creado_en: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString()
      }
    ]
  },
  {
    id: 121,
    numero_orden: 'OS-00121',
    cliente_id: 1,
    razon_social: 'MINERA SAN CRISTOBAL S.A.',
    nit_ci: '1020304050',
    cliente_telefono: '+591 2 2114455',
    cliente_email: 'logistica@sancristobal.com',
    persona_contacto: 'Ing. Carlos Mendoza',
    recepcionista_nombre_manual: 'Marcelo Pardo',
    estado: 'ENTREGADO',
    moneda: 'BOB',
    tasa_cambio: 6.96,
    monto_subtotal_servicio: 150.00,
    monto_subtotal_accesorios: 180.00,
    sumatoria_total: 330.00,
    total_literal: 'TRESCIENTOS TREINTA 00/100 BOLIVIANOS',
    creado_en: new Date(Date.now() - 18 * 24 * 3600 * 1000).toISOString(),
    actualizado_en: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(),
    total_equipos: 1,
    equipos: [
      {
        id: 105,
        orden_id: 121,
        orden_indice: 1,
        marca: 'Motorola',
        modelo: 'DEP450',
        numero_serie: '672TCX1234', // ¡Mismo serial para probar historial!
        banda: 'VHF',
        estado_individual: 'LISTO',
        reparacion_rechazada: false,
        falla_declarada_cliente: 'Potenciómetro de volumen con falso contacto',
        texto_diagnostico: 'Eje de potenciómetro desoldado del impreso principal.',
        descripcion_servicio: 'Resoldado de circuito impreso y calibración de modulación',
        costo_servicio: 150.00,
        creado_en: new Date(Date.now() - 18 * 24 * 3600 * 1000).toISOString()
      }
    ]
  },
  {
    id: 120,
    numero_orden: 'OS-00120',
    cliente_id: 4,
    razon_social: 'CONSTRUCTORA BOLIVIANA VIAL',
    nit_ci: '1044556677',
    cliente_telefono: '+591 4 4112233',
    cliente_email: 'equipos@bolivianavial.bo',
    persona_contacto: 'Ing. Hugo Morales',
    recepcionista_nombre_manual: 'Ana Martínez',
    estado: 'ENTREGADO',
    moneda: 'BOB',
    tasa_cambio: 6.96,
    monto_subtotal_servicio: 120.00,
    monto_subtotal_accesorios: 160.00,
    sumatoria_total: 280.00,
    total_literal: 'DOSCIENTOS OCHENTA 00/100 BOLIVIANOS',
    creado_en: new Date(Date.now() - 40 * 24 * 3600 * 1000).toISOString(),
    actualizado_en: new Date(Date.now() - 35 * 24 * 3600 * 1000).toISOString(),
    total_equipos: 1,
    equipos: [
      {
        id: 106,
        orden_id: 120,
        orden_indice: 1,
        marca: 'Vertex Standard',
        modelo: 'VX-231',
        numero_serie: '582VCK2211',
        banda: 'VHF',
        estado_individual: 'LISTO',
        reparacion_rechazada: false,
        falla_declarada_cliente: 'Conector de antena BNC flojo',
        texto_diagnostico: 'Conector SMA dañado por esfuerzo mecánico.',
        descripcion_servicio: 'Cambio de conector y prueba de potencia reflejada SWR',
        costo_servicio: 120.00,
        creado_en: new Date(Date.now() - 40 * 24 * 3600 * 1000).toISOString()
      }
    ]
  },
  {
    id: 119,
    numero_orden: 'OS-00119',
    cliente_id: 5,
    razon_social: 'TRANSPORTES PESADOS DEL SUR',
    nit_ci: '1066778899',
    cliente_telefono: '+591 2 2889900',
    cliente_email: 'gerencia@transur.bo',
    persona_contacto: 'Sr. Walter Quispe',
    recepcionista_nombre_manual: 'Marcelo Pardo',
    estado: 'RECHAZADO',
    moneda: 'BOB',
    tasa_cambio: 6.96,
    monto_subtotal_servicio: 0.00,
    monto_subtotal_accesorios: 0.00,
    sumatoria_total: 0.00,
    total_literal: 'CERO 00/100 BOLIVIANOS',
    creado_en: new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString(),
    actualizado_en: new Date(Date.now() - 58 * 24 * 3600 * 1000).toISOString(),
    total_equipos: 1,
    equipos: [
      {
        id: 107,
        orden_id: 119,
        orden_indice: 1,
        marca: 'Yaesu',
        modelo: 'FT-2980R',
        numero_serie: '911YSU8844',
        banda: 'VHF',
        estado_individual: 'RECHAZADO',
        reparacion_rechazada: true,
        motivo_rechazo: 'Equipo móvil con pista multicapa corroída por inversión de polaridad de batería 24V. Costo de reparación supera el 70% del valor comercial.',
        falla_declarada_cliente: 'Humo al conectar a la batería del camión',
        texto_diagnostico: 'Pistas quemadas y microcontrolador principal destruido por sobrevoltaje.',
        descripcion_servicio: 'Diagnóstico técnico no viable',
        costo_servicio: 0.00,
        creado_en: new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString()
      }
    ]
  }
];

export const SearchRepository = {
  /**
   * Búsqueda avanzada y paginada de órdenes de servicio
   * (Consulta PostgreSQL/Supabase con fallback inteligente a datos locales)
   */
  async searchOrders(filters = {}) {
    try {
      const conditions = [];
      const params = [];

      // 1. Omnibar: Búsqueda por texto
      if (filters.q && typeof filters.q === 'string' && filters.q.trim()) {
        const term = `%${filters.q.trim()}%`;
        params.push(term);
        const pIdx = params.length;
        conditions.push(`(
          o.numero_orden ILIKE $${pIdx} OR 
          CAST(o.id AS TEXT) ILIKE $${pIdx} OR
          c.razon_social ILIKE $${pIdx} OR 
          c.nit_ci ILIKE $${pIdx} OR 
          c.persona_contacto ILIKE $${pIdx} OR
          EXISTS (
            SELECT 1 FROM orden_equipos eq 
            WHERE eq.orden_id = o.id 
              AND (eq.numero_serie ILIKE $${pIdx} OR eq.modelo ILIKE $${pIdx})
          )
        )`);
      }

      // 2. Filtro por Estado
      if (filters.estado && filters.estado !== 'TODOS') {
        if (Array.isArray(filters.estado)) {
          params.push(filters.estado);
          conditions.push(`o.estado::text = ANY($${params.length}::text[])`);
        } else {
          params.push(filters.estado);
          conditions.push(`o.estado::text = $${params.length}`);
        }
      }

      // 3. Filtro por Rango de Fechas
      if (filters.desde) {
        params.push(filters.desde);
        conditions.push(`o.creado_en >= $${params.length}::timestamp`);
      }
      if (filters.hasta) {
        params.push(`${filters.hasta} 23:59:59`);
        conditions.push(`o.creado_en <= $${params.length}::timestamp`);
      }

      // 4. Filtro por Marca
      if (filters.marca && filters.marca !== 'TODAS') {
        params.push(`%${filters.marca}%`);
        conditions.push(`EXISTS (SELECT 1 FROM orden_equipos eq WHERE eq.orden_id = o.id AND eq.marca ILIKE $${params.length})`);
      }

      // 5. Filtro por Banda
      if (filters.banda && filters.banda !== 'TODAS') {
        params.push(filters.banda);
        conditions.push(`EXISTS (SELECT 1 FROM orden_equipos eq WHERE eq.orden_id = o.id AND eq.banda = $${params.length})`);
      }

      // 6. Filtro por Serie específica directa
      if (filters.serie && filters.serie.trim()) {
        params.push(`%${filters.serie.trim().toUpperCase()}%`);
        conditions.push(`EXISTS (SELECT 1 FROM orden_equipos eq WHERE eq.orden_id = o.id AND UPPER(eq.numero_serie) LIKE $${params.length})`);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Consulta de conteo total para paginación
      const countSql = `
        SELECT COUNT(*) AS total
        FROM ordenes_servicio o
        LEFT JOIN clientes c ON o.cliente_id = c.id
        ${whereClause}
      `;
      const { rows: countRows } = await query(countSql, params);
      const totalRecords = parseInt(countRows[0]?.total || 0, 10);

      // Paginación
      const limit = Math.max(1, Math.min(100, parseInt(filters.limit, 10) || 15));
      const page = Math.max(1, parseInt(filters.page, 10) || 1);
      const offset = (page - 1) * limit;

      const dataParams = [...params, limit, offset];
      const dataSql = `
        SELECT o.*, 
               c.razon_social, 
               c.nit_ci, 
               c.telefono AS cliente_telefono, 
               c.email AS cliente_email,
               c.persona_contacto,
               (SELECT COUNT(*) FROM orden_equipos e WHERE e.orden_id = o.id) AS total_equipos,
               COALESCE(
                 (SELECT json_agg(json_build_object(
                    'id', eq.id,
                    'orden_id', eq.orden_id,
                    'orden_indice', eq.orden_indice,
                    'marca', eq.marca,
                    'modelo', eq.modelo,
                    'numero_serie', eq.numero_serie,
                    'banda', eq.banda,
                    'estado_individual', eq.estado_individual,
                    'reparacion_rechazada', eq.reparacion_rechazada,
                    'motivo_rechazo', eq.motivo_rechazo,
                    'falla_declarada_cliente', eq.falla_declarada_cliente,
                    'costo_servicio', eq.costo_servicio,
                    'creado_en', eq.creado_en
                  ) ORDER BY eq.orden_indice)
                  FROM orden_equipos eq
                  WHERE eq.orden_id = o.id
                 ), '[]'::json
               ) AS equipos
        FROM ordenes_servicio o
        LEFT JOIN clientes c ON o.cliente_id = c.id
        ${whereClause}
        ORDER BY o.creado_en DESC
        LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}
      `;

      const { rows: orders } = await query(dataSql, dataParams);

      return {
        orders,
        pagination: {
          total: totalRecords,
          page,
          limit,
          totalPages: Math.ceil(totalRecords / limit) || 1
        }
      };
    } catch (err) {
      console.warn('[SearchRepository] Supabase/PostgreSQL no conectado aún. Usando dataset mock del taller.', err.message);
      
      // Fallback en memoria con exactamente los mismos filtros
      let result = [...MOCK_ORDERS];

      // Filtro Omnibar
      if (filters.q && filters.q.trim()) {
        const queryTerm = filters.q.toLowerCase().trim();
        result = result.filter(o => 
          (o.numero_orden || '').toLowerCase().includes(queryTerm) ||
          (o.razon_social || '').toLowerCase().includes(queryTerm) ||
          (o.nit_ci || '').toLowerCase().includes(queryTerm) ||
          (o.persona_contacto || '').toLowerCase().includes(queryTerm) ||
          (o.equipos || []).some(e => 
            (e.numero_serie || '').toLowerCase().includes(queryTerm) ||
            (e.modelo || '').toLowerCase().includes(queryTerm)
          )
        );
      }

      // Filtro Estado
      if (filters.estado && filters.estado !== 'TODOS') {
        if (Array.isArray(filters.estado)) {
          result = result.filter(o => filters.estado.includes(o.estado));
        } else {
          result = result.filter(o => o.estado === filters.estado);
        }
      }

      // Filtro Marca
      if (filters.marca && filters.marca !== 'TODAS') {
        result = result.filter(o => (o.equipos || []).some(e => (e.marca || '').toLowerCase().includes(filters.marca.toLowerCase())));
      }

      // Filtro Banda
      if (filters.banda && filters.banda !== 'TODAS') {
        result = result.filter(o => (o.equipos || []).some(e => e.banda === filters.banda));
      }

      // Filtro Serie directa
      if (filters.serie && filters.serie.trim()) {
        const sQuery = filters.serie.toUpperCase().trim();
        result = result.filter(o => (o.equipos || []).some(e => (e.numero_serie || '').toUpperCase().includes(sQuery)));
      }

      // Paginación local
      const limit = Math.max(1, Math.min(100, parseInt(filters.limit, 10) || 15));
      const page = Math.max(1, parseInt(filters.page, 10) || 1);
      const total = result.length;
      const paginatedOrders = result.slice((page - 1) * limit, page * limit);

      return {
        orders: paginatedOrders,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1
        }
      };
    }
  },

  /**
   * Obtiene la cronología completa de un equipo por su número de serie
   * (Consulta PostgreSQL/Supabase con fallback inteligente a datos locales)
   */
  async getSerialTimeline(numeroSerie) {
    const cleanSerial = (numeroSerie || '').trim().toUpperCase();
    if (!cleanSerial) return null;

    try {
      // 1. Buscar en orden_equipos todas las apariciones
      const { rows: equiposRows } = await query(`
        SELECT eq.*,
               o.id AS orden_id,
               o.numero_orden,
               o.estado AS orden_estado,
               o.moneda,
               o.tasa_cambio,
               o.recepcionista_nombre_manual,
               o.creado_en AS orden_creado_en,
               o.actualizado_en AS orden_actualizado_en,
               c.id AS cliente_id,
               c.razon_social,
               c.nit_ci,
               c.telefono AS cliente_telefono,
               c.persona_contacto
        FROM orden_equipos eq
        JOIN ordenes_servicio o ON eq.orden_id = o.id
        LEFT JOIN clientes c ON o.cliente_id = c.id
        WHERE UPPER(TRIM(eq.numero_serie)) = $1
        ORDER BY eq.creado_en DESC
      `, [cleanSerial]);

      if (equiposRows.length > 0) {
        // Cargar detalles de cada visita
        const timeline = [];
        for (const eq of equiposRows) {
          const { rows: fallas } = await query(`SELECT * FROM equipo_fallas WHERE equipo_id = $1 ORDER BY id ASC`, [eq.id]);
          const { rows: repuestos } = await query(`SELECT * FROM equipo_repuestos_cotizados WHERE equipo_id = $1 ORDER BY id ASC`, [eq.id]);
          const { rows: evidencias } = await query(`SELECT * FROM equipo_evidencias WHERE equipo_id = $1 ORDER BY id ASC`, [eq.id]);

          timeline.push({
            id: eq.id,
            ordenId: eq.orden_id,
            numeroOrden: eq.numero_orden || `OS-${String(eq.orden_id).padStart(5, '0')}`,
            ordenEstado: eq.orden_estado,
            estadoIndividual: eq.estado_individual,
            reparacionRechazada: eq.reparacion_rechazada,
            motivoRechazo: eq.motivo_rechazo,
            fecha: eq.creado_en || eq.orden_creado_en,
            fechaActualizacion: eq.orden_actualizado_en,
            moneda: eq.moneda,
            cliente: eq.razon_social || 'Consumidor Final',
            clienteTelefono: eq.cliente_telefono,
            recepcionista: eq.recepcionista_nombre_manual || 'Personal de Turno',
            fallaDeclarada: eq.falla_declarada_cliente,
            textoDiagnostico: eq.texto_diagnostico,
            descripcionServicio: eq.descripcion_servicio,
            costoServicio: parseFloat(eq.costo_servicio) || 0,
            fallas,
            repuestos,
            evidencias,
            totalRepuestos: repuestos
              .filter(r => r.se_reemplaza)
              .reduce((sum, r) => sum + (parseFloat(r.precio) * (parseInt(r.cantidad, 10) || 1)), 0)
          });
        }

        const ultimoCierre = equiposRows.find(e => e.orden_estado === 'ENTREGADO' || e.orden_estado === 'LISTO') || equiposRows[0];
        const fechaRef = new Date(ultimoCierre.orden_actualizado_en || ultimoCierre.creado_en);
        const ahora = new Date();
        const diffMs = ahora.getTime() - fechaRef.getTime();
        const diasTranscurridos = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
        const DIAS_GARANTIA = 90;
        const enGarantia = diasTranscurridos <= DIAS_GARANTIA && (ultimoCierre.orden_estado === 'ENTREGADO' || ultimoCierre.orden_estado === 'LISTO');
        const diasRestantes = enGarantia ? DIAS_GARANTIA - diasTranscurridos : 0;
        const fechaVence = new Date(fechaRef.getTime() + (DIAS_GARANTIA * 24 * 60 * 60 * 1000));

        return {
          serie: cleanSerial,
          marca: equiposRows[0].marca,
          modelo: equiposRows[0].modelo,
          banda: equiposRows[0].banda,
          clienteActual: equiposRows[0].razon_social || 'Consumidor Final',
          totalIngresos: timeline.length,
          garantia: {
            enGarantia,
            diasRestantes,
            diasTranscurridos,
            fechaVencimiento: fechaVence.toISOString(),
            ultimoEstado: ultimoCierre.orden_estado,
            mensaje: enGarantia 
              ? `Garantía técnica vigente. Le restan ${diasRestantes} días (vence el ${fechaVence.toLocaleDateString('es-BO')}).`
              : `Garantía vencida (hace ${diasTranscurridos} días de su último servicio).`
          },
          historial: timeline
        };
      }
    } catch (err) {
      console.warn('[SearchRepository] Supabase/PostgreSQL no conectado para serial. Usando dataset mock del taller.', err.message);
    }

    // Fallback Mock para Número de Serie
    // Buscar en todas las órdenes mock si existe este equipo
    const matchingEquipos = [];
    MOCK_ORDERS.forEach(ord => {
      (ord.equipos || []).forEach(eq => {
        if ((eq.numero_serie || '').toUpperCase() === cleanSerial) {
          matchingEquipos.push({
            id: eq.id,
            ordenId: ord.id,
            numeroOrden: ord.numero_orden,
            ordenEstado: ord.estado,
            estadoIndividual: eq.estado_individual,
            reparacionRechazada: eq.reparacion_rechazada,
            motivoRechazo: eq.motivo_rechazo,
            fecha: eq.creado_en || ord.creado_en,
            fechaActualizacion: ord.actualizado_en,
            moneda: ord.moneda,
            cliente: ord.razon_social,
            clienteTelefono: ord.cliente_telefono,
            recepcionista: ord.recepcionista_nombre_manual,
            fallaDeclarada: eq.falla_declarada_cliente,
            textoDiagnostico: eq.texto_diagnostico,
            descripcionServicio: eq.descripcion_servicio,
            costoServicio: eq.costo_servicio,
            fallas: [
              { categoria: 'TRANSMISION', codigo_falla: 'TX-01', descripcion: 'Falla de potencia en etapa amplificadora' },
              { categoria: 'AUDIO', codigo_falla: 'AUD-01', descripcion: 'Limpieza de jack de accesorios y calibración' }
            ],
            repuestos: [
              { descripcion: 'Antena helicoidal VHF original', cantidad: 1, precio: 90, se_reemplaza: true }
            ],
            evidencias: [],
            totalRepuestos: 90
          });
        }
      });
    });

    if (matchingEquipos.length === 0) {
      // Si se buscó una serie nueva no registrada, devolver estructura con 0 ingresos
      return {
        serie: cleanSerial,
        marca: 'Motorola',
        modelo: 'DEP450',
        banda: 'VHF',
        clienteActual: 'Equipo sin historial en taller',
        totalIngresos: 0,
        garantia: {
          enGarantia: false,
          diasRestantes: 0,
          diasTranscurridos: 0,
          mensaje: 'Este número de serie no cuenta con registros de ingreso previos en el taller.'
        },
        historial: []
      };
    }

    // Ordenar de más reciente a más antiguo
    matchingEquipos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    // Si tiene un registro previo entregado (ej. OS-00121 hace 15 días)
    const tieneCierrePrevio = matchingEquipos.some(e => e.ordenEstado === 'ENTREGADO');
    const DIAS_GARANTIA = 90;
    const diasTranscurridos = tieneCierrePrevio ? 15 : 0;
    const enGarantia = tieneCierrePrevio && diasTranscurridos <= DIAS_GARANTIA;
    const diasRestantes = enGarantia ? DIAS_GARANTIA - diasTranscurridos : 0;
    const fechaVence = new Date(Date.now() + (diasRestantes * 24 * 3600 * 1000));

    return {
      serie: cleanSerial,
      marca: matchingEquipos[0].marca || 'Motorola',
      modelo: matchingEquipos[0].modelo || 'DEP450',
      banda: matchingEquipos[0].banda || 'VHF',
      clienteActual: matchingEquipos[0].cliente || 'Consumidor Final',
      totalIngresos: matchingEquipos.length,
      garantia: {
        enGarantia,
        diasRestantes,
        diasTranscurridos,
        fechaVencimiento: fechaVence.toISOString(),
        mensaje: enGarantia 
          ? `Garantía técnica de taller ACTIVA. Le restan ${diasRestantes} días de cobertura (vence el ${fechaVence.toLocaleDateString('es-BO')}).`
          : `Garantía no activa para este número de serie.`
      },
      historial: matchingEquipos
    };
  }
};
