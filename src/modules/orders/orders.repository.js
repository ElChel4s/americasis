import { pool, withTransaction, query } from '../../lib/config/database';
import { numeroALetras } from '../../lib/common/numero-a-letras';

export const OrdersRepository = {
  /**
   * Crea una orden de servicio con todos sus equipos y accesorios
   */
  async createOrderTransaction(orderData, equiposData) {
    return withTransaction(async (client) => {
      // 1. Insertar la orden
      const { rows: orderRows } = await client.query(`
        INSERT INTO ordenes_servicio 
        (sucursal_id, cliente_id, usuario_recepcion_id, recepcionista_nombre_manual, estado, moneda, tasa_cambio, notas_internas, monto_subtotal_servicio, monto_subtotal_accesorios, sumatoria_total, total_literal) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, 0, 0, $9) 
        RETURNING *
      `, [
        orderData.sucursal_id || 1, 
        orderData.cliente_id || null, 
        orderData.usuario_recepcion_id || null, 
        orderData.recepcionista_nombre_manual || 'Recepcionista Turno',
        orderData.estado || 'BORRADOR', 
        orderData.moneda || 'BOB', 
        orderData.tasa_cambio || 6.96, 
        orderData.notas_internas || null,
        numeroALetras(0, orderData.moneda || 'BOB')
      ]);

      const orden = orderRows[0];

      // 2. Insertar equipos y accesorios
      const equipos = [];
      for (let i = 0; i < equiposData.length; i++) {
        const equipo = equiposData[i];
        
        let equipoMaestroId = null;
        if (equipo.numero_serie && equipo.numero_serie.trim()) {
          const { rows: maestroRows } = await client.query(`
            INSERT INTO equipos_maestro (numero_serie, marca, modelo, banda_defecto, cliente_propietario_id)
            VALUES (UPPER(TRIM($1)), $2, $3, $4, $5)
            ON CONFLICT (UPPER(TRIM(numero_serie))) DO UPDATE SET
              marca = COALESCE(EXCLUDED.marca, equipos_maestro.marca),
              modelo = COALESCE(EXCLUDED.modelo, equipos_maestro.modelo)
            RETURNING id
          `, [
            equipo.numero_serie.trim(), 
            equipo.marca || 'Motorola', 
            equipo.modelo || 'Genérico', 
            equipo.banda || 'VHF', 
            orderData.cliente_id || null
          ]);
          equipoMaestroId = maestroRows[0]?.id || null;
        }

        const { rows: eqRows } = await client.query(`
          INSERT INTO orden_equipos 
          (orden_id, equipo_maestro_id, orden_indice, marca, modelo, numero_serie, banda, estado_individual, falla_declarada_cliente, reparacion_rechazada, costo_servicio)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, false, 0)
          RETURNING *
        `, [
          orden.id,
          equipoMaestroId,
          i + 1,
          equipo.marca || 'Motorola',
          equipo.modelo || '',
          equipo.numero_serie ? equipo.numero_serie.toUpperCase().trim() : '',
          equipo.banda || 'VHF',
          'RECIBIDO',
          equipo.falla_declarada_cliente || ''
        ]);
        const ordenEquipo = eqRows[0];
        
        // Insertar accesorios
        if (equipo.accesorios && Array.isArray(equipo.accesorios)) {
          for (const acc of equipo.accesorios) {
            await client.query(`
              INSERT INTO equipo_accesorios_recepcion 
              (equipo_id, accesorio_nombre, presencia, antena_estado, antena_modelo_sugerido, bateria_modelo, bateria_serie, bateria_porcentaje_carga, otros_descripcion)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `, [
              ordenEquipo.id,
              acc.accesorio_nombre || 'Accesorio',
              acc.presencia || 'CON',
              acc.antena_estado || null,
              acc.antena_modelo_sugerido || null, 
              acc.bateria_modelo || null,
              acc.bateria_serie || null,
              acc.bateria_porcentaje_carga !== undefined ? acc.bateria_porcentaje_carga : null,
              acc.otros_descripcion || null
            ]);
          }
        }
        
        equipos.push(ordenEquipo);
      }

      return { orden, equipos };
    });
  },

  /**
   * Guarda o actualiza el diagnóstico de un equipo específico en la orden
   * y recalcula automáticamente los subtotales 1 y 2 de la orden.
   */
  async saveEquipmentDiagnosisTransaction(ordenId, equipoId, diagnosisData) {
    return withTransaction(async (client) => {
      const isRechazado = Boolean(diagnosisData.reparacion_rechazada);
      const costoServicio = isRechazado ? 0 : (parseFloat(diagnosisData.costo_servicio) || 0);

      // 1. Actualizar orden_equipos
      const { rows: updatedEqRows } = await client.query(`
        UPDATE orden_equipos
        SET estado_individual = $1,
            reparacion_rechazada = $2,
            motivo_rechazo = $3,
            texto_diagnostico = $4,
            notas_adicionales = $5,
            descripcion_servicio = $6,
            costo_servicio = $7,
            tecnico_nombre_manual = COALESCE($8, tecnico_nombre_manual),
            actualizado_en = NOW()
        WHERE id = $9 AND orden_id = $10
        RETURNING *
      `, [
        isRechazado ? 'RECHAZADO' : (diagnosisData.estado_individual || 'EN_DIAGNOSTICO'),
        isRechazado,
        diagnosisData.motivo_rechazo || null,
        diagnosisData.texto_diagnostico || '',
        diagnosisData.notas_adicionales || null,
        diagnosisData.descripcion_servicio || '',
        costoServicio,
        diagnosisData.tecnico_nombre_manual || null,
        equipoId,
        ordenId
      ]);

      if (updatedEqRows.length === 0) {
        throw new Error('Equipo no encontrado en esta orden de servicio');
      }

      const updatedEquipo = updatedEqRows[0];

      // 2. Sincronizar fallas de placa (equipo_fallas)
      await client.query(`DELETE FROM equipo_fallas WHERE equipo_id = $1`, [equipoId]);
      if (Array.isArray(diagnosisData.fallas) && diagnosisData.fallas.length > 0) {
        for (const falla of diagnosisData.fallas) {
          await client.query(`
            INSERT INTO equipo_fallas (equipo_id, codigo, label, descripcion, es_custom, reparado)
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [
            equipoId,
            falla.codigo || (falla.label ? falla.label.toUpperCase().replace(/\s+/g, '_') : 'FALLA_CUSTOM'),
            falla.label || 'Falla General',
            falla.descripcion || '',
            Boolean(falla.es_custom),
            Boolean(falla.reparado)
          ]);
        }
      }

      // 3. Sincronizar repuestos cotizados (equipo_repuestos_cotizados)
      // OJO: 'subtotal' es GENERATED ALWAYS, NO se pasa en el insert.
      await client.query(`DELETE FROM equipo_repuestos_cotizados WHERE equipo_id = $1`, [equipoId]);
      if (Array.isArray(diagnosisData.repuestos) && diagnosisData.repuestos.length > 0) {
        for (let idx = 0; idx < diagnosisData.repuestos.length; idx++) {
          const rep = diagnosisData.repuestos[idx];
          const cantidad = parseInt(rep.cantidad, 10) || 1;
          const precio = parseFloat(rep.precio) || 0;
          const seReemplaza = Boolean(rep.se_reemplaza);

          await client.query(`
            INSERT INTO equipo_repuestos_cotizados 
            (equipo_id, nombre, estado_condicion, se_reemplaza, porcentaje_carga, falla_detalle, cantidad, precio, es_opcional, aprobado_cliente, es_manual, orden_visual)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          `, [
            equipoId,
            rep.nombre || 'Repuesto / Accesorio',
            rep.estado_condicion || 'Operativa',
            seReemplaza,
            rep.porcentaje_carga !== undefined && rep.porcentaje_carga !== '' ? parseInt(rep.porcentaje_carga, 10) : null,
            rep.falla_detalle || null,
            cantidad,
            precio,
            Boolean(rep.es_opcional),
            rep.aprobado_cliente !== undefined ? Boolean(rep.aprobado_cliente) : true,
            Boolean(rep.es_manual),
            idx + 1
          ]);
        }
      }

      // 4. Recalcular Subtotal 1, Subtotal 2 y Sumatoria Total de la Orden
      const { rows: subtotal1Rows } = await client.query(`
        SELECT COALESCE(SUM(costo_servicio), 0) AS subtotal_servicio
        FROM orden_equipos
        WHERE orden_id = $1 AND (reparacion_rechazada IS FALSE OR reparacion_rechazada IS NULL)
      `, [ordenId]);
      const subtotal1 = parseFloat(subtotal1Rows[0].subtotal_servicio) || 0;

      const { rows: subtotal2Rows } = await client.query(`
        SELECT COALESCE(SUM(r.cantidad * r.precio), 0) AS subtotal_accesorios
        FROM equipo_repuestos_cotizados r
        JOIN orden_equipos e ON r.equipo_id = e.id
        WHERE e.orden_id = $1 
          AND (e.reparacion_rechazada IS FALSE OR e.reparacion_rechazada IS NULL)
          AND r.se_reemplaza = true
      `, [ordenId]);
      const subtotal2 = parseFloat(subtotal2Rows[0].subtotal_accesorios) || 0;

      const sumatoriaTotal = Number((subtotal1 + subtotal2).toFixed(2));

      // Obtener moneda actual de la orden
      const { rows: orderRows } = await client.query(`SELECT moneda, estado FROM ordenes_servicio WHERE id = $1`, [ordenId]);
      const moneda = orderRows[0]?.moneda || 'BOB';
      const literal = numeroALetras(sumatoriaTotal, moneda);

      // Actualizar orden
      const { rows: updatedOrderRows } = await client.query(`
        UPDATE ordenes_servicio
        SET monto_subtotal_servicio = $1,
            monto_subtotal_accesorios = $2,
            sumatoria_total = $3,
            total_literal = $4,
            estado = CASE WHEN estado = 'BORRADOR' THEN 'EN_DIAGNOSTICO'::estado_orden_enum ELSE estado END,
            actualizado_en = NOW()
        WHERE id = $5
        RETURNING *
      `, [subtotal1, subtotal2, sumatoriaTotal, literal, ordenId]);

      return {
        equipo: updatedEquipo,
        orden: updatedOrderRows[0],
        subtotales: {
          subtotal1_servicio: subtotal1,
          subtotal2_accesorios: subtotal2,
          sumatoria_total: sumatoriaTotal,
          total_literal: literal
        }
      };
    });
  },

  /**
   * Obtiene la orden completa con todos sus equipos, accesorios, fallas y repuestos
   */
  async getOrderWithDetails(orderId) {
    try {
      const { rows: orderRows } = await query(`
        SELECT o.*, 
               c.razon_social, c.nit_ci, c.telefono AS cliente_telefono, c.email AS cliente_email, c.persona_contacto, c.direccion AS cliente_direccion
        FROM ordenes_servicio o
        LEFT JOIN clientes c ON o.cliente_id = c.id
        WHERE o.id = $1
      `, [orderId]);

      if (orderRows.length === 0) return null;
      const orden = orderRows[0];

      // Equipos
      const { rows: equiposRows } = await query(`
        SELECT * FROM orden_equipos 
        WHERE orden_id = $1 
        ORDER BY orden_indice ASC, id ASC
      `, [orderId]);

      for (const eq of equiposRows) {
        const { rows: accRows } = await query(`
          SELECT * FROM equipo_accesorios_recepcion WHERE equipo_id = $1 ORDER BY id ASC
        `, [eq.id]);
        eq.accesorios = accRows;

        const { rows: fallasRows } = await query(`
          SELECT * FROM equipo_fallas WHERE equipo_id = $1 ORDER BY id ASC
        `, [eq.id]);
        eq.fallas = fallasRows;

        const { rows: repRows } = await query(`
          SELECT * FROM equipo_repuestos_cotizados WHERE equipo_id = $1 ORDER BY orden_visual ASC, id ASC
        `, [eq.id]);
        eq.repuestos = repRows;
      }

      orden.equipos = equiposRows;
      return orden;
    } catch (err) {
      console.warn('[OrdersRepository] Error al obtener orden o DB desconectada:', err.message);
      return null;
    }
  },

  async getAllActiveOrders(filters = {}) {
    try {
      let whereClause = "o.estado::text NOT IN ('ENTREGADO', 'ANULADO')";
      const params = [];

      if (filters.estados && Array.isArray(filters.estados) && filters.estados.length > 0) {
        params.push(filters.estados);
        whereClause += ` AND o.estado::text = ANY($${params.length}::text[])`;
      }

      if (filters.serie && typeof filters.serie === 'string' && filters.serie.trim()) {
        params.push(`%${filters.serie.trim().toUpperCase()}%`);
        whereClause += ` AND EXISTS (SELECT 1 FROM orden_equipos eq WHERE eq.orden_id = o.id AND UPPER(eq.numero_serie) LIKE $${params.length})`;
      }

      const limit = parseInt(filters.limit, 10) || 20;
      params.push(limit);
      const limitClause = `LIMIT $${params.length}`;

      const { rows } = await query(`
        SELECT o.*, c.razon_social, c.nit_ci,
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
        WHERE ${whereClause}
        ORDER BY o.creado_en DESC
        ${limitClause}
      `, params);
      return rows;
    } catch (err) {
      console.warn('[OrdersRepository] Error al consultar órdenes activas o DB desconectada:', err.message);
      return [];
    }
  }
};
