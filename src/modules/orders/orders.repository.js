import { pool, withTransaction, query } from '../../lib/config/database';
import { supabase } from '../../lib/config/supabase-client';
import { numeroALetras } from '../../lib/common/numero-a-letras';

export const OrdersRepository = {
  /**
   * Crea una orden de servicio con todos sus equipos y accesorios.
   * Soporta Supabase Cloud nativo con fallback a PostgreSQL Pool local.
   */
  async createOrderTransaction(orderData, equiposData) {
    // 1. PRIORIDAD: Si Supabase Client está configurado, persistir en Supabase Cloud
    if (supabase) {
      try {
        return await this.createOrderSupabase(orderData, equiposData);
      } catch (supabaseErr) {
        console.warn('[OrdersRepository] Falló inserción directa en Supabase:', supabaseErr.message);
        // Si falla por RLS o red, intentar vía Pool si existe
      }
    }

    // 2. Fallback a PostgreSQL directo vía Pool
    return withTransaction(async (client) => {
      // Resolver cliente_id válido si viene nulo
      let clienteId = orderData.cliente_id;
      if (!clienteId) {
        const razonSocial = orderData.razon_social || orderData.cliente_nombre || 'Consumidor Final';
        const { rows: clientRows } = await client.query(`
          INSERT INTO clientes (razon_social, nit_ci, telefono, direccion)
          VALUES ($1, $2, $3, $4)
          RETURNING id
        `, [razonSocial, orderData.nit_ci || null, orderData.telefono || null, orderData.direccion || null]);
        clienteId = clientRows[0]?.id;
      }

      // Resolver sucursal_id
      let sucursalId = orderData.sucursal_id;
      if (!sucursalId || typeof sucursalId !== 'string' || sucursalId.length < 30) {
        const { rows: sucRows } = await client.query(`SELECT id FROM sucursales LIMIT 1`);
        sucursalId = sucRows[0]?.id || 'a0000000-0000-0000-0000-000000000001';
      }

      // Insertar orden de servicio
      const { rows: orderRows } = await client.query(`
        INSERT INTO ordenes_servicio 
        (sucursal_id, cliente_id, usuario_recepcion_id, recepcionista_nombre_manual, usuario_tecnico_id, tecnico_nombre_manual, estado, moneda, tasa_cambio, notas_internas, monto_subtotal_servicio, monto_subtotal_accesorios, sumatoria_total, total_literal) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 0, 0, 0, $11) 
        RETURNING *
      `, [
        sucursalId, 
        clienteId, 
        orderData.usuario_recepcion_id || null, 
        orderData.recepcionista_nombre_manual || 'Recepcionista Turno',
        orderData.usuario_tecnico_id || null,
        orderData.tecnico_nombre_manual || null,
        orderData.estado || 'BORRADOR', 
        orderData.moneda || 'BOB', 
        orderData.tasa_cambio || 6.96, 
        orderData.notas_internas || null,
        numeroALetras(0, orderData.moneda || 'BOB')
      ]);

      const orden = orderRows[0];
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
            clienteId
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
          equipo.numero_serie ? equipo.numero_serie.toUpperCase().trim() : `SER-${Date.now()}-${i}`,
          equipo.banda || 'VHF',
          'RECIBIDO',
          equipo.falla_declarada_cliente || ''
        ]);
        const ordenEquipo = eqRows[0];
        
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
   * Implementación de guardado directo en Supabase Cloud
   */
  async createOrderSupabase(orderData, equiposData) {
    // A. Resolver cliente_id
    let clienteId = orderData.cliente_id;
    if (!clienteId || clienteId === 'null') {
      const razonSocial = orderData.razon_social || orderData.cliente_nombre || 'Consumidor Final';
      
      try {
        const { data: foundClient } = await supabase
          .from('clientes')
          .select('id')
          .ilike('razon_social', razonSocial)
          .limit(1)
          .maybeSingle();

        if (foundClient?.id) {
          clienteId = foundClient.id;
        } else {
          const { data: newClient, error: clientErr } = await supabase
            .from('clientes')
            .insert({
              razon_social: razonSocial,
              nit_ci: orderData.nit_ci || null,
              telefono: orderData.telefono || null,
              direccion: orderData.direccion || null
            })
            .select('id')
            .single();

          if (clientErr) {
            console.warn('[OrdersRepository] No se pudo crear cliente en Supabase:', clientErr.message);
            const { data: fallbackClient } = await supabase.from('clientes').select('id').limit(1).maybeSingle();
            clienteId = fallbackClient?.id || 'c0000000-0000-0000-0000-000000000001';
          } else {
            clienteId = newClient?.id;
          }
        }
      } catch (clientEx) {
        console.warn('[OrdersRepository] Excepción resolviendo cliente en Supabase:', clientEx.message);
        clienteId = 'c0000000-0000-0000-0000-000000000001';
      }
    }

    if (!clienteId || clienteId === 'null') {
      clienteId = 'c0000000-0000-0000-0000-000000000001';
    }

    // B. Resolver sucursal_id
    let sucursalId = orderData.sucursal_id;
    if (!sucursalId || typeof sucursalId !== 'string' || sucursalId.length < 30) {
      try {
        const { data: foundSuc } = await supabase.from('sucursales').select('id').limit(1).maybeSingle();
        sucursalId = foundSuc?.id || 'a0000000-0000-0000-0000-000000000001';
      } catch (sucEx) {
        sucursalId = 'a0000000-0000-0000-0000-000000000001';
      }
    }

    // C. Generar correlativo de orden si no viene
    let numeroOrden = orderData.numero_orden;
    if (!numeroOrden) {
      const { count } = await supabase.from('ordenes_servicio').select('*', { count: 'exact', head: true });
      const nextNum = (count || 0) + 1;
      numeroOrden = `OS-${String(nextNum).padStart(5, '0')}`;
    }

    // D. Insertar orden en Supabase
    const { data: orden, error: orderErr } = await supabase
      .from('ordenes_servicio')
      .insert({
        sucursal_id: sucursalId,
        cliente_id: clienteId,
        numero_orden: numeroOrden,
        recepcionista_nombre_manual: orderData.recepcionista_nombre_manual || 'Recepción Mostrador',
        usuario_tecnico_id: orderData.usuario_tecnico_id || null,
        tecnico_nombre_manual: orderData.tecnico_nombre_manual || null,
        estado: orderData.estado || 'RECIBIDO',
        moneda: orderData.moneda || 'BOB',
        tasa_cambio: orderData.tasa_cambio || 6.96,
        notas_internas: orderData.notas_internas || null,
        monto_subtotal_servicio: 0,
        monto_subtotal_accesorios: 0,
        sumatoria_total: 0,
        total_literal: numeroALetras(0, orderData.moneda || 'BOB')
      })
      .select()
      .single();

    if (orderErr) {
      throw new Error(`Error Supabase orden: ${orderErr.message}`);
    }

    // E. Insertar equipos y accesorios
    const equipos = [];
    for (let i = 0; i < equiposData.length; i++) {
      const eq = equiposData[i];
      const serie = eq.numero_serie ? eq.numero_serie.toUpperCase().trim() : `SER-${Date.now()}-${i}`;

      const { data: ordenEquipo, error: eqErr } = await supabase
        .from('orden_equipos')
        .insert({
          orden_id: orden.id,
          orden_indice: i + 1,
          marca: eq.marca || 'Motorola',
          modelo: eq.modelo || '',
          numero_serie: serie,
          banda: eq.banda || 'VHF',
          estado_individual: 'RECIBIDO',
          falla_declarada_cliente: eq.falla_declarada_cliente || '',
          costo_servicio: 0,
          reparacion_rechazada: false
        })
        .select()
        .single();

      if (eqErr) {
        console.error('[OrdersRepository] Error al insertar equipo:', eqErr);
        continue;
      }

      // Insertar accesorios si existen
      if (eq.accesorios && Array.isArray(eq.accesorios) && eq.accesorios.length > 0) {
        const accRows = eq.accesorios.map(acc => ({
          equipo_id: ordenEquipo.id,
          accesorio_nombre: acc.accesorio_nombre || 'Accesorio',
          presencia: acc.presencia || 'CON',
          antena_estado: acc.antena_estado || null,
          antena_modelo_sugerido: acc.antena_modelo_sugerido || null,
          bateria_modelo: acc.bateria_modelo || null,
          bateria_serie: acc.bateria_serie || null,
          bateria_porcentaje_carga: acc.bateria_porcentaje_carga !== undefined ? acc.bateria_porcentaje_carga : null,
          otros_descripcion: acc.otros_descripcion || null
        }));

        await supabase.from('equipo_accesorios_recepcion').insert(accRows);
      }

      equipos.push(ordenEquipo);
    }

    return { orden, equipos };
  },

  /**
   * Resuelve el UUID real de la orden en Supabase si se provee secuencia_num o numero_orden
   */
  async resolveOrderUuid(orderIdOrNumber) {
    if (!orderIdOrNumber) return null;
    const str = String(orderIdOrNumber).trim();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
    if (isUuid) return str;

    if (supabase) {
      // 1. Coincidencia directa por numero_orden (ej: "OS-00001")
      const { data: direct } = await supabase
        .from('ordenes_servicio')
        .select('id')
        .eq('numero_orden', str)
        .maybeSingle();
      if (direct?.id) return direct.id;

      // 2. Coincidencia por numero normalizado (ej: "1" -> "OS-00001")
      const numOnly = str.replace(/\D/g, '');
      if (numOnly) {
        const padded = 'OS-' + String(numOnly).padStart(5, '0');
        const { data: byPad } = await supabase
          .from('ordenes_servicio')
          .select('id')
          .eq('numero_orden', padded)
          .maybeSingle();
        if (byPad?.id) return byPad.id;

        const numInt = parseInt(numOnly, 10);
        const { data: bySeq } = await supabase
          .from('ordenes_servicio')
          .select('id')
          .eq('secuencia_num', numInt)
          .maybeSingle();
        if (bySeq?.id) return bySeq.id;
      }
    }
    return str;
  },

  /**
   * Guarda o actualiza el diagnóstico de un equipo específico en la orden
   * y recalcula automáticamente los subtotales 1 y 2 de la orden.
   */
  async saveEquipmentDiagnosisTransaction(ordenId, equipoId, diagnosisData) {
    if (supabase) {
      try {
        return await this.saveDiagnosisSupabase(ordenId, equipoId, diagnosisData);
      } catch (err) {
        console.warn('[OrdersRepository] Falló saveDiagnosis en Supabase, intentando PG:', err.message);
      }
    }

    return withTransaction(async (client) => {
      const isRechazado = Boolean(diagnosisData.reparacion_rechazada);
      const costoServicio = isRechazado ? 0 : (parseFloat(diagnosisData.costo_servicio) || 0);

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
      const { rows: orderRows } = await client.query(`SELECT moneda, estado FROM ordenes_servicio WHERE id = $1`, [ordenId]);
      const moneda = orderRows[0]?.moneda || 'BOB';
      const literal = numeroALetras(sumatoriaTotal, moneda);

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
   * Diagnóstico en Supabase Cloud
   */
  async saveDiagnosisSupabase(ordenId, equipoId, diagnosisData) {
    const resolvedOrderId = await this.resolveOrderUuid(ordenId);
    let resolvedEquipoId = equipoId;

    // Si el equipoId no es un UUID válido, resolverlo buscando en los equipos de esta orden
    const isEqUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(equipoId));
    if (!isEqUuid) {
      const idx = parseInt(String(equipoId).replace(/\D/g, ''), 10) || 1;
      const { data: matchedEq } = await supabase
        .from('orden_equipos')
        .select('id')
        .eq('orden_id', resolvedOrderId)
        .eq('orden_indice', idx)
        .maybeSingle();
      if (matchedEq?.id) resolvedEquipoId = matchedEq.id;
    }

    const isRechazado = Boolean(diagnosisData.reparacion_rechazada);
    const costoServicio = isRechazado ? 0 : (parseFloat(diagnosisData.costo_servicio) || 0);

    // 1. Actualizar orden_equipos
    const { data: updatedEquipo, error: eqErr } = await supabase
      .from('orden_equipos')
      .update({
        estado_individual: isRechazado ? 'RECHAZADO' : (diagnosisData.estado_individual || 'EN_DIAGNOSTICO'),
        reparacion_rechazada: isRechazado,
        motivo_rechazo: diagnosisData.motivo_rechazo || null,
        texto_diagnostico: diagnosisData.texto_diagnostico || '',
        notas_adicionales: diagnosisData.notas_adicionales || null,
        descripcion_servicio: diagnosisData.descripcion_servicio || '',
        costo_servicio: costoServicio,
        tecnico_nombre_manual: diagnosisData.tecnico_nombre_manual || null,
        actualizado_en: new Date().toISOString()
      })
      .eq('id', resolvedEquipoId)
      .select()
      .single();

    if (eqErr) {
      throw new Error(`Error actualizando equipo: ${eqErr.message}`);
    }

    // 2. Sincronizar fallas
    await supabase.from('equipo_fallas').delete().eq('equipo_id', resolvedEquipoId);
    if (Array.isArray(diagnosisData.fallas) && diagnosisData.fallas.length > 0) {
      const fallasRows = diagnosisData.fallas.map(f => ({
        equipo_id: resolvedEquipoId,
        codigo: f.codigo || (f.label ? f.label.toUpperCase().replace(/\s+/g, '_') : 'FALLA_CUSTOM'),
        label: f.label || 'Falla General',
        descripcion: f.descripcion || '',
        es_custom: Boolean(f.es_custom),
        reparado: Boolean(f.reparado)
      }));
      await supabase.from('equipo_fallas').insert(fallasRows);
    }

    // 3. Sincronizar repuestos
    await supabase.from('equipo_repuestos_cotizados').delete().eq('equipo_id', resolvedEquipoId);
    if (Array.isArray(diagnosisData.repuestos) && diagnosisData.repuestos.length > 0) {
      const repRows = diagnosisData.repuestos.map((rep, idx) => ({
        equipo_id: resolvedEquipoId,
        nombre: rep.nombre || 'Repuesto / Accesorio',
        estado_condicion: rep.estado_condicion || 'Operativa',
        se_reemplaza: Boolean(rep.se_reemplaza),
        porcentaje_carga: rep.porcentaje_carga !== undefined && rep.porcentaje_carga !== '' ? parseInt(rep.porcentaje_carga, 10) : null,
        falla_detalle: rep.falla_detalle || null,
        cantidad: parseInt(rep.cantidad, 10) || 1,
        precio: parseFloat(rep.precio) || 0,
        es_opcional: Boolean(rep.es_opcional),
        aprobado_cliente: rep.aprobado_cliente !== undefined ? Boolean(rep.aprobado_cliente) : true,
        es_manual: Boolean(rep.es_manual),
        orden_visual: idx + 1
      }));
      await supabase.from('equipo_repuestos_cotizados').insert(repRows);
    }

    // 4. Recalcular subtotales
    const { data: allEqs } = await supabase
      .from('orden_equipos')
      .select('id, costo_servicio, reparacion_rechazada')
      .eq('orden_id', resolvedOrderId);

    const subtotal1 = (allEqs || []).reduce((acc, curr) => {
      if (curr.reparacion_rechazada) return acc;
      return acc + (parseFloat(curr.costo_servicio) || 0);
    }, 0);

    const nonRejectedEqIds = (allEqs || []).filter(e => !e.reparacion_rechazada).map(e => e.id);
    let subtotal2 = 0;
    if (nonRejectedEqIds.length > 0) {
      const { data: allReps } = await supabase
        .from('equipo_repuestos_cotizados')
        .select('cantidad, precio, se_reemplaza')
        .in('equipo_id', nonRejectedEqIds);

      subtotal2 = (allReps || []).reduce((acc, curr) => {
        if (!curr.se_reemplaza) return acc;
        return acc + ((parseInt(curr.cantidad, 10) || 1) * (parseFloat(curr.precio) || 0));
      }, 0);
    }

    const sumatoriaTotal = Number((subtotal1 + subtotal2).toFixed(2));

    const { data: ordCurrent } = await supabase.from('ordenes_servicio').select('moneda, estado, fecha_diagnostico').eq('id', resolvedOrderId).single();
    const moneda = ordCurrent?.moneda || 'BOB';
    const literal = numeroALetras(sumatoriaTotal, moneda);

    const shouldTransitionToDiagnosticado = diagnosisData.estado_individual === 'DIAGNOSTICADO' || diagnosisData.finalizar;
    const nuevoEstado = shouldTransitionToDiagnosticado 
      ? 'DIAGNOSTICADO' 
      : (ordCurrent?.estado === 'RECIBIDO' || ordCurrent?.estado === 'BORRADOR' ? 'EN_DIAGNOSTICO' : ordCurrent?.estado);

    const { data: updatedOrden } = await supabase
      .from('ordenes_servicio')
      .update({
        monto_subtotal_servicio: subtotal1,
        monto_subtotal_accesorios: subtotal2,
        sumatoria_total: sumatoriaTotal,
        total_literal: literal,
        estado: nuevoEstado,
        fecha_diagnostico: shouldTransitionToDiagnosticado ? (ordCurrent?.fecha_diagnostico || new Date().toISOString()) : ordCurrent?.fecha_diagnostico,
        actualizado_en: new Date().toISOString()
      })
      .eq('id', resolvedOrderId)
      .select()
      .single();

    return {
      equipo: updatedEquipo,
      orden: updatedOrden,
      subtotales: {
        subtotal1_servicio: subtotal1,
        subtotal2_accesorios: subtotal2,
        sumatoria_total: sumatoriaTotal,
        total_literal: literal
      }
    };
  },

  /**
   * Obtiene la orden completa con todos sus equipos, accesorios, fallas y repuestos
   */
  async getOrderWithDetails(orderId) {
    if (supabase) {
      try {
        const resolvedOrderId = await this.resolveOrderUuid(orderId);
        const { data: orden, error } = await supabase
          .from('ordenes_servicio')
          .select('*, clientes (*)')
          .eq('id', resolvedOrderId)
          .maybeSingle();

        if (orden && !error) {
          const { data: equipos } = await supabase
            .from('orden_equipos')
            .select(`
              *,
              equipo_accesorios_recepcion (*),
              equipo_fallas (*),
              equipo_repuestos_cotizados (*),
              equipo_evidencias (*)
            `)
            .eq('orden_id', resolvedOrderId)
            .order('orden_indice', { ascending: true });

          orden.equipos = (equipos || []).map(eq => ({
            ...eq,
            accesorios: eq.equipo_accesorios_recepcion || [],
            fallas: eq.equipo_fallas || [],
            repuestos: eq.equipo_repuestos_cotizados || [],
            imagenes: (eq.equipo_evidencias || []).map(ev => ({
              url: ev.url_archivo,
              etapa: ev.etapa,
              name: ev.nombre_archivo
            }))
          }));

          orden.razon_social = orden.clientes?.razon_social;
          orden.nit_ci = orden.clientes?.nit_ci;
          orden.cliente_telefono = orden.clientes?.telefono;
          orden.cliente_email = orden.clientes?.email;
          orden.cliente_direccion = orden.clientes?.direccion;

          return orden;
        }
      } catch (err) {
        console.warn('[OrdersRepository] Supabase getOrder error, probando PG:', err.message);
      }
    }

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

      const { rows: equiposRows } = await query(`
        SELECT * FROM orden_equipos 
        WHERE orden_id = $1 
        ORDER BY orden_indice ASC, id ASC
      `, [orderId]);

      for (const eq of equiposRows) {
        const { rows: accRows } = await query(`SELECT * FROM equipo_accesorios_recepcion WHERE equipo_id = $1 ORDER BY id ASC`, [eq.id]);
        eq.accesorios = accRows;

        const { rows: fallasRows } = await query(`SELECT * FROM equipo_fallas WHERE equipo_id = $1 ORDER BY id ASC`, [eq.id]);
        eq.fallas = fallasRows;

        const { rows: repRows } = await query(`SELECT * FROM equipo_repuestos_cotizados WHERE equipo_id = $1 ORDER BY orden_visual ASC, id ASC`, [eq.id]);
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
    if (supabase) {
      try {
        let queryBuilder = supabase
          .from('ordenes_servicio')
          .select('*, clientes (razon_social, nit_ci), orden_equipos:orden_equipos!orden_equipos_orden_id_fkey (*)')
          .not('estado', 'in', '("ENTREGADO","ANULADO")')
          .order('creado_en', { ascending: false });

        if (filters.estados && Array.isArray(filters.estados) && filters.estados.length > 0) {
          queryBuilder = queryBuilder.in('estado', filters.estados);
        }

        const limit = parseInt(filters.limit, 10) || 50;
        queryBuilder = queryBuilder.limit(limit);

        const { data: rows, error } = await queryBuilder;

        if (rows && !error) {
          return rows.map(o => ({
            ...o,
            razon_social: o.clientes?.razon_social || 'Consumidor Final',
            nit_ci: o.clientes?.nit_ci || '',
            total_equipos: o.orden_equipos?.length || 0,
            equipos: o.orden_equipos || []
          }));
        }
      } catch (err) {
        console.warn('[OrdersRepository] Error consultando órdenes en Supabase:', err.message);
      }
    }

    try {
      let whereClause = "o.estado::text NOT IN ('ENTREGADO', 'ANULADO')";
      const params = [];

      if (filters.estados && Array.isArray(filters.estados) && filters.estados.length > 0) {
        params.push(filters.estados);
        whereClause += ` AND o.estado::text = ANY($${params.length}::text[])`;
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
  },

  /**
   * Actualiza datos generales de una orden (estado, condiciones, presupuesto, notas)
   */
  async updateOrderGeneral(orderId, updateData) {
    const estado = updateData.estado || updateData.status;
    const fieldsToUpdate = {};
    if (estado) fieldsToUpdate.estado = estado;
    if (updateData.moneda) fieldsToUpdate.moneda = updateData.moneda;
    if (updateData.tasa_cambio) fieldsToUpdate.tasa_cambio = updateData.tasa_cambio;
    if (updateData.sumatoria_total !== undefined) {
      fieldsToUpdate.sumatoria_total = updateData.sumatoria_total;
      fieldsToUpdate.total_literal = numeroALetras(updateData.sumatoria_total, updateData.moneda || 'BOB');
    }
    if (updateData.notas_internas !== undefined) fieldsToUpdate.notas_internas = updateData.notas_internas;
    if (updateData.condiciones) fieldsToUpdate.condiciones_comerciales_json = updateData.condiciones;
    if (updateData.condiciones_comerciales_json) fieldsToUpdate.condiciones_comerciales_json = updateData.condiciones_comerciales_json;
    if (updateData.usuario_tecnico_id !== undefined) fieldsToUpdate.usuario_tecnico_id = updateData.usuario_tecnico_id;
    if (updateData.tecnico_nombre_manual !== undefined) fieldsToUpdate.tecnico_nombre_manual = updateData.tecnico_nombre_manual;
    fieldsToUpdate.actualizado_en = new Date().toISOString();

    if (supabase) {
      try {
        const resolvedOrderId = await this.resolveOrderUuid(orderId);
        const { data, error } = await supabase
          .from('ordenes_servicio')
          .update(fieldsToUpdate)
          .eq('id', resolvedOrderId)
          .select()
          .single();

        if (!error && data) return data;
      } catch (err) {
        console.warn('[OrdersRepository] Supabase updateOrderGeneral err:', err.message);
      }
    }

    try {
      const { rows } = await query(`
        UPDATE ordenes_servicio
        SET estado = COALESCE($1, estado),
            moneda = COALESCE($2, moneda),
            sumatoria_total = COALESCE($3, sumatoria_total),
            total_literal = COALESCE($4, total_literal),
            notas_internas = COALESCE($5, notas_internas),
            usuario_tecnico_id = COALESCE($6, usuario_tecnico_id),
            tecnico_nombre_manual = COALESCE($7, tecnico_nombre_manual),
            actualizado_en = NOW()
        WHERE id = $8
        RETURNING *
      `, [
        estado || null,
        updateData.moneda || null,
        updateData.sumatoria_total !== undefined ? updateData.sumatoria_total : null,
        updateData.sumatoria_total !== undefined ? numeroALetras(updateData.sumatoria_total, updateData.moneda || 'BOB') : null,
        updateData.notas_internas || null,
        updateData.usuario_tecnico_id || null,
        updateData.tecnico_nombre_manual || null,
        orderId
      ]);
      return rows[0] || null;
    } catch (err) {
      return { id: orderId, ...fieldsToUpdate };
    }
  },

  /**
   * Actualiza datos de recepción (Fase 1: Ingreso): cliente, equipos y accesorios
   */
  async updateReception(orderId, receptionData) {
    if (supabase) {
      try {
        const resolvedOrderId = await this.resolveOrderUuid(orderId);
        if (!resolvedOrderId) throw new Error(`Orden #${orderId} no encontrada`);

        // 1. Obtener la orden actual para saber el cliente_id
        const { data: ordCurrent, error: ordFindErr } = await supabase
          .from('ordenes_servicio')
          .select('id, cliente_id, moneda')
          .eq('id', resolvedOrderId)
          .single();

        if (ordFindErr || !ordCurrent) {
          throw new Error(`Error localizando orden: ${ordFindErr?.message || 'No encontrada'}`);
        }

        // 2. Actualizar cliente si existe cliente_id o crear/asociar
        let clienteId = ordCurrent.cliente_id;
        const razonSocial = (receptionData.razon_social || receptionData.cliente || '').trim();
        const nitCi = receptionData.nit_ci || receptionData.nit || null;
        const telefono = receptionData.cliente_telefono || receptionData.telefono || null;
        const email = receptionData.cliente_email || receptionData.email || null;
        const direccion = receptionData.cliente_direccion || receptionData.direccion || null;
        const personaContacto = receptionData.persona_contacto || null;

        if (clienteId) {
          const clientUpdates = {
            actualizado_en: new Date().toISOString()
          };
          if (razonSocial) clientUpdates.razon_social = razonSocial;
          if (nitCi !== undefined) clientUpdates.nit_ci = nitCi;
          if (telefono !== undefined) clientUpdates.telefono = telefono;
          if (email !== undefined) clientUpdates.email = email;
          if (direccion !== undefined) clientUpdates.direccion = direccion;
          if (personaContacto !== undefined) clientUpdates.persona_contacto = personaContacto;

          await supabase.from('clientes').update(clientUpdates).eq('id', clienteId);
        } else if (razonSocial) {
          const { data: newClient } = await supabase
            .from('clientes')
            .insert({
              razon_social: razonSocial,
              nit_ci: nitCi,
              telefono: telefono,
              email: email,
              direccion: direccion,
              persona_contacto: personaContacto
            })
            .select('id')
            .single();
          if (newClient?.id) {
            clienteId = newClient.id;
          }
        }

        // 3. Actualizar ordenes_servicio
        const orderUpdates = {
          actualizado_en: new Date().toISOString()
        };
        if (clienteId) orderUpdates.cliente_id = clienteId;
        if (receptionData.moneda) orderUpdates.moneda = receptionData.moneda;
        if (receptionData.tasa_cambio) orderUpdates.tasa_cambio = receptionData.tasa_cambio;
        if (receptionData.recepcionista_nombre_manual !== undefined) {
          orderUpdates.recepcionista_nombre_manual = receptionData.recepcionista_nombre_manual;
        }
        if (receptionData.usuario_tecnico_id !== undefined) {
          orderUpdates.usuario_tecnico_id = receptionData.usuario_tecnico_id || null;
        }
        if (receptionData.tecnico_nombre_manual !== undefined) {
          orderUpdates.tecnico_nombre_manual = receptionData.tecnico_nombre_manual || null;
        }
        if (receptionData.notas_internas !== undefined) {
          orderUpdates.notas_internas = receptionData.notas_internas;
        }
        if (receptionData.numero_orden) {
          orderUpdates.numero_orden = receptionData.numero_orden;
        }

        await supabase
          .from('ordenes_servicio')
          .update(orderUpdates)
          .eq('id', resolvedOrderId);

        // 4. Actualizar equipos y sus accesorios preservando identificadores y flota completa
        if (Array.isArray(receptionData.equipos) && receptionData.equipos.length > 0) {
          const { data: existingEquipos } = await supabase
            .from('orden_equipos')
            .select('*')
            .eq('orden_id', resolvedOrderId)
            .order('orden_indice', { ascending: true });

          const existingById = new Map((existingEquipos || []).map(e => [String(e.id), e]));
          const existingByIndex = new Map((existingEquipos || []).map(e => [e.orden_indice, e]));
          const matchedDbIds = new Set();

          for (let i = 0; i < receptionData.equipos.length; i++) {
            const eq = receptionData.equipos[i];
            const serie = (eq.serie || eq.numero_serie || `SER-${Date.now()}-${i}`).toUpperCase().trim();
            const eqIdStr = String(eq.id || '');
            let savedEqId = null;

            // Prioridad 1: Match por ID exacto de DB
            // Prioridad 2: Match por índice de equipo en la orden (orden_indice: i + 1)
            // Prioridad 3: Match por posición secuencial
            const targetExisting = existingById.get(eqIdStr) 
              || existingByIndex.get(i + 1) 
              || (existingEquipos && existingEquipos[i]);

            if (targetExisting) {
              savedEqId = targetExisting.id;
              matchedDbIds.add(String(savedEqId));
              await supabase
                .from('orden_equipos')
                .update({
                  orden_indice: i + 1,
                  marca: eq.marca || 'Motorola',
                  modelo: eq.modelo || '',
                  numero_serie: serie,
                  banda: eq.banda || 'VHF',
                  falla_declarada_cliente: eq.falla_declarada_cliente || '',
                  actualizado_en: new Date().toISOString()
                })
                .eq('id', savedEqId);
            } else {
              const { data: newEq, error: newEqErr } = await supabase
                .from('orden_equipos')
                .insert({
                  orden_id: resolvedOrderId,
                  orden_indice: i + 1,
                  marca: eq.marca || 'Motorola',
                  modelo: eq.modelo || '',
                  numero_serie: serie,
                  banda: eq.banda || 'VHF',
                  estado_individual: eq.estado_individual || 'RECIBIDO',
                  falla_declarada_cliente: eq.falla_declarada_cliente || '',
                  costo_servicio: parseFloat(eq.costo_servicio) || 0,
                  reparacion_rechazada: Boolean(eq.reparacion_rechazada)
                })
                .select('id')
                .single();

              if (!newEqErr && newEq) {
                savedEqId = newEq.id;
                matchedDbIds.add(String(newEq.id));
              }
            }

            if (savedEqId) {
              await supabase.from('equipo_accesorios_recepcion').delete().eq('equipo_id', savedEqId);

              let accList = [];
              if (Array.isArray(eq.accesorios) && eq.accesorios.length > 0) {
                accList = eq.accesorios;
              } else if (eq.accesoriosRecepcion && typeof eq.accesoriosRecepcion === 'object') {
                accList = Object.entries(eq.accesoriosRecepcion).map(([nombre, presencia]) => ({
                  accesorio_nombre: nombre,
                  presencia: presencia || 'CON',
                  antena_estado: eq.antenaEstado || null,
                  antena_modelo_sugerido: eq.antenaModelo || null,
                  bateria_modelo: eq.bateriaModelo || null,
                  bateria_serie: eq.bateriaSerie || null,
                  bateria_porcentaje_carga: eq.bateriaCarga !== undefined && eq.bateriaCarga !== '' ? parseInt(eq.bateriaCarga, 10) : null,
                  otros_descripcion: eq.otrosDescripcion || null
                }));
              }

              if (accList.length > 0) {
                const accRows = accList.map(acc => ({
                  equipo_id: savedEqId,
                  accesorio_nombre: acc.accesorio_nombre || 'Accesorio',
                  presencia: acc.presencia || 'CON',
                  antena_estado: acc.antena_estado || null,
                  antena_modelo_sugerido: acc.antena_modelo_sugerido || null,
                  bateria_modelo: acc.bateria_modelo || null,
                  bateria_serie: acc.bateria_serie || null,
                  bateria_porcentaje_carga: acc.bateria_porcentaje_carga !== undefined && acc.bateria_porcentaje_carga !== null ? parseInt(acc.bateria_porcentaje_carga, 10) : null,
                  otros_descripcion: acc.otros_descripcion || null
                }));
                await supabase.from('equipo_accesorios_recepcion').insert(accRows);
              }
            }
          }

          // Eliminar únicamente radios que ya no existen en la lista enviada
          for (const existing of (existingEquipos || [])) {
            if (!matchedDbIds.has(String(existing.id))) {
              await supabase.from('orden_equipos').delete().eq('id', existing.id);
            }
          }
        }

        return await this.getOrderWithDetails(resolvedOrderId);
      } catch (err) {
        console.warn('[OrdersRepository] Supabase updateReception error, probando PG:', err.message);
      }
    }

    try {
      if (receptionData.razon_social) {
        await query(`
          UPDATE clientes 
          SET razon_social = COALESCE($1, razon_social),
              nit_ci = COALESCE($2, nit_ci),
              telefono = COALESCE($3, telefono),
              email = COALESCE($4, email),
              persona_contacto = COALESCE($5, persona_contacto),
              direccion = COALESCE($6, direccion),
              actualizado_en = NOW()
          WHERE id = (SELECT cliente_id FROM ordenes_servicio WHERE id = $7)
        `, [
          receptionData.razon_social || null,
          receptionData.nit_ci || null,
          receptionData.telefono || receptionData.cliente_telefono || null,
          receptionData.email || receptionData.cliente_email || null,
          receptionData.persona_contacto || null,
          receptionData.direccion || receptionData.cliente_direccion || null,
          orderId
        ]);
      }

      await query(`
        UPDATE ordenes_servicio
        SET moneda = COALESCE($1, moneda),
            recepcionista_nombre_manual = COALESCE($2, recepcionista_nombre_manual),
            usuario_tecnico_id = COALESCE($3, usuario_tecnico_id),
            tecnico_nombre_manual = COALESCE($4, tecnico_nombre_manual),
            notas_internas = COALESCE($5, notas_internas),
            actualizado_en = NOW()
        WHERE id = $6
      `, [
        receptionData.moneda || null,
        receptionData.recepcionista_nombre_manual || null,
        receptionData.usuario_tecnico_id || null,
        receptionData.tecnico_nombre_manual || null,
        receptionData.notas_internas || null,
        orderId
      ]);

      return await this.getOrderWithDetails(orderId);
    } catch (pgErr) {
      console.warn('[OrdersRepository] PG updateReception fallback:', pgErr.message);
      return { id: orderId, ...receptionData };
    }
  }
};

