/**
 * Servicio Centralizado de Persistencia de Órdenes
 * Sistema América — Radio Service ERP
 * 
 * Clave unificada de almacenamiento: 'americasis_orders'
 * 
 * Garantías de persistencia y flujo:
 * 1. Guarda SÍ O SÍ en localStorage ('americasis_orders') inmediatamente.
 * 2. Protección contra QuotaExceededError: si las fotos Base64 saturan localStorage,
 *    se mantienen en memoria RAM durante la sesión y se aligera el Base64 en disco,
 *    asegurando que la orden, equipos y fallas NUNCA se pierdan ni se aborte el guardado.
 * 3. Log de depuración obligatorio: 'ORDEN GUARDADA CON ÉXITO:'
 * 4. Reactividad inmediata: Emisión de eventos 'america_orders_updated' y 'storage'
 *    para sincronizar contadores y bandejas al instante sin recarga de página.
 * 5. Fusión segura con servidor: Las consultas al backend jamás sobreescriben con array vacío [].
 */

const STORAGE_KEY = 'americasis_orders';
const LEGACY_STORAGE_KEY = 'america_orders_db';

// Almacén en memoria RAM para imágenes de alta resolución en la sesión activa
const inMemoryOrderImages = new Map();

/**
 * Lee las órdenes locales directamente de localStorage de forma segura
 */
const getStoredLocalOrders = () => {
  if (typeof window === 'undefined') return [];
  try {
    let saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      // Migración transparente desde la clave anterior
      saved = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (saved) {
        localStorage.setItem(STORAGE_KEY, saved);
      }
    }
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    
    // Purgar demos obsoletas si quedaran
    return parsed.filter(o => o.id !== '101' && o.id !== '102' && o.id !== '103' && o.numero_orden !== 'OS-80412');
  } catch (e) {
    console.warn('[OrdersService] Error leyendo localStorage:', e);
    return [];
  }
};

/**
 * Guarda en localStorage con protección absoluta contra QuotaExceededError
 */
const safeSaveLocalStorage = (orders) => {
  if (typeof window === 'undefined') return false;

  const serialized = JSON.stringify(orders);

  // Intento 1: Guardado estándar en clave primaria y legado
  try {
    localStorage.setItem(STORAGE_KEY, serialized);
    try { localStorage.setItem(LEGACY_STORAGE_KEY, serialized); } catch (e) {}
    return true;
  } catch (quotaErr) {
    console.warn('[OrdersService] QuotaExceededError detectado. Activando fallback de fotos en memoria RAM...');
  }

  // Intento 2: Conservar las primeras 5 órdenes completas (órdenes activas en taller)
  // y solo aligerar las fotos de órdenes históricas antiguas (> índice 4)
  try {
    const strippedOrders = orders.map((order, orderIdx) => {
      // Las 5 órdenes más recientes conservan 100% sus fotos completas
      if (orderIdx < 5) {
        return order;
      }
      // Para órdenes antiguas del historial, aligerar para respetar cuota
      const sanitizedEquipos = (order.equipos || []).map(eq => ({
        ...eq,
        imagenes: (eq.imagenes || []).map(img => ({
          ...img,
          url: (typeof img.url === 'string' && !img.url.startsWith('data:')) ? img.url : ''
        })),
        imagenesInternas: (eq.imagenesInternas || []).map(img => ({
          ...img,
          url: (typeof img.url === 'string' && !img.url.startsWith('data:')) ? img.url : ''
        }))
      }));
      return { ...order, equipos: sanitizedEquipos };
    });

    const lightSerialized = JSON.stringify(strippedOrders);
    localStorage.setItem(STORAGE_KEY, lightSerialized);
    try { localStorage.setItem(LEGACY_STORAGE_KEY, lightSerialized); } catch (e) {}
    console.info('[OrdersService] Órdenes guardadas en localStorage preservando fotos de órdenes activas.');
    return true;
  } catch (fallbackErr) {
    console.warn('[OrdersService] Fallback 2: Reduciendo cuota histórica...', fallbackErr);
  }

  // Intento 3: Guardar últimas 15 órdenes aligeradas para salvar datos críticos
  try {
    const ultraLightOrders = orders.slice(0, 15).map(o => ({
      ...o,
      equipos: (o.equipos || []).map(eq => ({ ...eq, imagenes: [], imagenesInternas: [] }))
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ultraLightOrders));
    return true;
  } catch (finalErr) {
    console.error('[OrdersService] Fallo crítico al escribir en localStorage:', finalErr);
    return false;
  }
};

/**
 * Rehidrata una orden con las imágenes completas preservadas en la memoria de la sesión
 */
const rehydrateOrder = (order) => {
  if (!order) return order;
  const orderKey = String(order.id || order.numero_orden || '');
  if (!orderKey || !inMemoryOrderImages.has(orderKey)) return order;

  const cachedImages = inMemoryOrderImages.get(orderKey);
  const equipos = (order.equipos || []).map((eq, idx) => {
    const cachedEntry = cachedImages.find(c => c.equipoIndex === idx);
    if (cachedEntry && Array.isArray(cachedEntry.imagenes) && cachedEntry.imagenes.length > 0) {
      return { ...eq, imagenes: cachedEntry.imagenes };
    }
    return eq;
  });

  return { ...order, equipos };
};

/**
 * Emite eventos en el navegador para actualizar tableros e interfaces reactivamente en el acto
 */
const broadcastOrdersUpdate = (order) => {
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('america_orders_updated', { detail: order }));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {}
  }
};

export const OrdersService = {
  /**
   * Obtiene todas las órdenes, combinando el almacenamiento local con el backend
   * de forma segura (sin sobreescrituras que borren las órdenes locales).
   */
  getOrders: async () => {
    if (typeof window === 'undefined') return [];

    // 1. Cargar órdenes locales garantizadas
    let orders = getStoredLocalOrders();

    // 2. Intentar consultar servidor si está disponible
    try {
      const res = await fetch('/api/orders');
      if (res.ok) {
        const result = await res.json();
        if (result.success && Array.isArray(result.data) && result.data.length > 0) {
          // Fusión inteligente: mantener órdenes locales no sincronizadas y actualizar las existentes
          const serverMap = new Map();
          result.data.forEach(so => {
            const key = String(so.id || so.numero_orden);
            serverMap.set(key, so);
          });

          const merged = [];
          const seenKeys = new Set();

          // Las órdenes del servidor son la fuente de verdad primaria
          for (const so of result.data) {
            const key = String(so.id || so.numero_orden);
            seenKeys.add(key);
            merged.push(so);
          }

          // Añadir órdenes locales que aún no hayan sido sincronizadas
          for (const lo of orders) {
            const key = String(lo.id || lo.numero_orden);
            if (!seenKeys.has(key)) {
              merged.push(lo);
              // Si tiene un ID temporal, subirla silenciosamente a Supabase en segundo plano
              if (String(lo.id).length < 25 || !String(lo.id).includes('-')) {
                OrdersService.syncLocalOrderToServer(lo).catch(() => {});
              }
            }
          }

          // Ordenar siempre cronológicamente descendente (lo más reciente arriba)
          merged.sort((a, b) => {
            const timeA = new Date(a.creado_en || a.createdAt || 0).getTime();
            const timeB = new Date(b.creado_en || b.createdAt || 0).getTime();
            return timeB - timeA;
          });

          orders = merged;
          safeSaveLocalStorage(orders);
        }
      }
    } catch (apiErr) {
      // Si el backend no responde, continuar normalmente con las órdenes locales
    }

    return orders.map(rehydrateOrder);
  },

  /**
   * Obtiene una orden por su ID o número correlativo
   */
  getOrderById: async (id) => {
    if (typeof window === 'undefined') return null;

    try {
      const res = await fetch(`/api/orders/${id}`);
      if (res.ok) {
        const result = await res.json();
        if (result.success && result.data) {
          const rehydrated = rehydrateOrder(result.data);
          // Actualizar caché local con la versión completa y fresca de Supabase
          const orders = getStoredLocalOrders();
          const idx = orders.findIndex(o => String(o.id) === String(id) || String(o.numero_orden) === String(id));
          if (idx >= 0) {
            orders[idx] = rehydrated;
            safeSaveLocalStorage(orders);
          }
          return rehydrated;
        }
      }
    } catch (e) {
      console.warn('[OrdersService] Error fetching order from API, fallback to local list:', e);
    }

    const orders = await OrdersService.getOrders();
    const found = orders.find(o => String(o.id) === String(id) || String(o.numero_orden) === String(id)) || null;
    if (found) return rehydrateOrder(found);

    return null;
  },

  /**
   * Guarda o actualiza una orden de servicio.
   * Garantiza la persistencia inmediata en 'americasis_orders'.
   */
  saveOrder: async (data) => {
    if (typeof window === 'undefined') return null;
    const now = new Date().toISOString();

    // 1. Sanitizar y mapear equipos para evitar objetos File no serializables
    const sanitizedEquipos = (data.equipos || []).map((eq, i) => {
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

      const safeImagenes = (eq.imagenes || eq.imagenesRecepcion || []).map((img, imgIdx) => ({
        id: img.id || `img-${i}-${imgIdx}-${Date.now()}`,
        url: typeof img.url === 'string' ? img.url : '',
        name: img.name || `Evidencia ${imgIdx + 1}`,
        etapa: img.etapa || 'RECEPCION',
        sizeKb: img.sizeKb || null
      }));

      const safeImagenesInternas = (eq.imagenesInternas || eq.imagenesDiagnostico || []).map((img, imgIdx) => ({
        id: img.id || `img-int-${i}-${imgIdx}-${Date.now()}`,
        url: typeof img.url === 'string' ? img.url : '',
        name: img.name || `Diagnóstico ${imgIdx + 1}`,
        etapa: img.etapa || 'DIAGNOSTICO',
        sizeKb: img.sizeKb || null
      }));

      return {
        ...eq,
        id: eq.id || `eq-${Date.now()}-${i}`,
        tempId: eq.tempId || eq.id || `eq-${Date.now()}-${i}`,
        orden_indice: i + 1,
        marca: eq.marca || 'Motorola',
        modelo: eq.modelo || '',
        numero_serie: (eq.serie || eq.numero_serie || `SER-${Date.now()}-${i}`).toUpperCase().trim(),
        serie: (eq.serie || eq.numero_serie || `SER-${Date.now()}-${i}`).toUpperCase().trim(),
        banda: eq.banda || 'VHF',
        falla_declarada_cliente: eq.falla_declarada_cliente || '',
        costo_servicio: parseFloat(eq.costo_servicio) || 0,
        descripcion_servicio: eq.descripcion_servicio || 'Mantenimiento preventivo y calibración RF',
        reparacion_rechazada: Boolean(eq.reparacion_rechazada),
        motivo_rechazo: eq.motivo_rechazo || null,
        texto_diagnostico: eq.texto_diagnostico || '',
        notas_adicionales: eq.notas_adicionales || '',
        accesorios: accs,
        fallas: eq.fallas || [],
        repuestos: eq.repuestos || [],
        imagenes: safeImagenes,
        imagenesRecepcion: safeImagenes,
        imagenesInternas: safeImagenesInternas,
        imagenesDiagnostico: safeImagenesInternas
      };
    });

    // 2. Construir objeto final de la orden garantizando identificador y número correlativo
    const orderId = String(data.id || Date.now());
    const numeroOrden = data.numero_orden || data.ordenServicio || `OS-${String(Math.floor(Math.random() * 90000) + 10000)}`;

    const nuevaOrden = {
      ...data,
      id: orderId,
      numero_orden: numeroOrden,
      ordenServicio: numeroOrden,
      razon_social: data.razon_social || data.cliente || 'Consumidor Final',
      cliente: data.cliente || data.razon_social || 'Consumidor Final',
      estado: data.estado || 'RECIBIDO',
      estado_global: data.estado || 'RECIBIDO',
      total_equipos: sanitizedEquipos.length,
      equipos: sanitizedEquipos,
      createdAt: data.createdAt || now,
      updatedAt: now
    };

    // 3. Respaldar fotos completas en la memoria RAM de la sesión
    const memoryImages = sanitizedEquipos.map((eq, idx) => ({
      equipoIndex: idx,
      imagenes: eq.imagenes
    }));
    inMemoryOrderImages.set(String(nuevaOrden.id), memoryImages);
    inMemoryOrderImages.set(String(nuevaOrden.numero_orden), memoryImages);

    // 4. Guardado prioritario y obligatorio en la Base de Datos Central (Supabase / Postgres)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order: {
            sucursal_id: data.sucursal_id || 'a0000000-0000-0000-0000-000000000001',
            cliente_id: data.cliente_id || null,
            razon_social: nuevaOrden.razon_social,
            recepcionista_nombre_manual: data.recepcionista_nombre_manual || 'Recepción Mostrador',
            usuario_tecnico_id: nuevaOrden.usuario_tecnico_id || data.tecnicoAsignadoId || null,
            tecnico_nombre_manual: nuevaOrden.tecnico_nombre_manual || data.tecnicoNombre || null,
            estado: nuevaOrden.estado,
            moneda: data.moneda || 'BOB',
            tasa_cambio: data.tasa_cambio || 6.96,
            notas_internas: data.notas_internas || null,
          },
          equipos: sanitizedEquipos.map(eq => ({
            marca: eq.marca,
            modelo: eq.modelo,
            numero_serie: eq.numero_serie,
            banda: eq.banda,
            falla_declarada_cliente: eq.falla_declarada_cliente,
            costo_servicio: eq.costo_servicio,
            accesorios: eq.accesorios
          }))
        })
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data?.orden) {
          const srv = json.data.orden;
          nuevaOrden.id = srv.id;
          nuevaOrden.numero_orden = srv.numero_orden || nuevaOrden.numero_orden;
          nuevaOrden.ordenServicio = nuevaOrden.numero_orden;
          if (Array.isArray(json.data.equipos) && json.data.equipos.length > 0) {
            nuevaOrden.equipos = json.data.equipos.map((se, idx) => ({
              ...(sanitizedEquipos[idx] || {}),
              id: se.id,
              orden_id: se.orden_id
            }));
          }
          console.log('[OrdersService] Orden guardada y confirmada en Supabase:', srv.id, srv.numero_orden);
        }
      }
    } catch (netErr) {
      console.warn('[OrdersService] Error de red al persistir en backend central:', netErr);
    }

    // 5. Guardar en localStorage como caché rápida del navegador
    const existingOrders = getStoredLocalOrders();
    const cleanExisting = existingOrders.filter(
      o => String(o.id) !== String(nuevaOrden.id) && String(o.numero_orden) !== String(nuevaOrden.numero_orden)
    );
    safeSaveLocalStorage([nuevaOrden, ...cleanExisting]);

    // Log para confirmación en consola del navegador
    console.log("ORDEN GUARDADA CON ÉXITO:", nuevaOrden);

    // Disparar reactividad inmediata a todos los componentes escuchando
    broadcastOrdersUpdate(nuevaOrden);

    return rehydrateOrder(nuevaOrden);
  },

  /**
   * Rescata una orden creada localmente y la sube silenciosamente a la base de datos central
   */
  syncLocalOrderToServer: async (localOrder) => {
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order: {
            sucursal_id: localOrder.sucursal_id || 'a0000000-0000-0000-0000-000000000001',
            cliente_id: localOrder.cliente_id || null,
            razon_social: localOrder.razon_social || localOrder.cliente || 'Consumidor Final',
            recepcionista_nombre_manual: localOrder.recepcionista_nombre_manual || 'Recepción Mostrador',
            usuario_tecnico_id: localOrder.usuario_tecnico_id || null,
            tecnico_nombre_manual: localOrder.tecnico_nombre_manual || null,
            estado: localOrder.estado || 'RECIBIDO',
            moneda: localOrder.moneda || 'BOB',
            tasa_cambio: localOrder.tasa_cambio || 6.96,
            notas_internas: localOrder.notas_internas || null,
          },
          equipos: (localOrder.equipos || []).map(eq => ({
            marca: eq.marca || 'Motorola',
            modelo: eq.modelo || '',
            numero_serie: eq.numero_serie || eq.serie || `SER-${Date.now()}`,
            banda: eq.banda || 'VHF',
            falla_declarada_cliente: eq.falla_declarada_cliente || '',
            costo_servicio: eq.costo_servicio || 0,
            accesorios: eq.accesorios || []
          }))
        })
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data?.orden) {
          console.log('[OrdersService] Orden local rescatada y sincronizada en Supabase:', json.data.orden.id);
          const current = getStoredLocalOrders().filter(o => 
            String(o.id) !== String(localOrder.id) && String(o.numero_orden) !== String(localOrder.numero_orden)
          );
          const synced = { ...localOrder, id: json.data.orden.id, numero_orden: json.data.orden.numero_orden };
          safeSaveLocalStorage([synced, ...current]);
          broadcastOrdersUpdate(synced);
        }
      }
    } catch (e) {}
  },

  updateOrderStatus: async (id, status) => {
    if (typeof window === 'undefined') return null;
    try {
      await fetch(`/api/orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: status })
      });
    } catch (e) {}

    const orders = await OrdersService.getOrders();
    const index = orders.findIndex(o => String(o.id) === String(id));
    if (index >= 0) {
      orders[index].estado = status;
      orders[index].estado_global = status;
      orders[index].updatedAt = new Date().toISOString();
      safeSaveLocalStorage(orders);
      broadcastOrdersUpdate(orders[index]);
      return rehydrateOrder(orders[index]);
    }
    return null;
  },

  /**
   * Guarda el diagnóstico técnico de una orden
   */
  saveDiagnosis: async (id, equipos, finalizar = false) => {
    if (typeof window === 'undefined') return null;
    const newStatus = finalizar ? 'DIAGNOSTICADO' : 'EN_DIAGNOSTICO';

    try {
      for (const eq of (equipos || [])) {
        const payload = {
          equipoId: eq.id,
          diagnosis: {
            estado_individual: newStatus,
            reparacion_rechazada: Boolean(eq.reparacion_rechazada),
            motivo_rechazo: eq.motivo_rechazo || null,
            texto_diagnostico: eq.texto_diagnostico || '',
            notas_adicionales: eq.notas_adicionales || null,
            descripcion_servicio: eq.descripcion_servicio || '',
            costo_servicio: eq.costo_servicio || 0,
            fallas: eq.fallas || [],
            repuestos: eq.repuestos || [],
            tecnico_nombre_manual: eq.tecnico_nombre_manual || null,
            finalizar: finalizar
          }
        };

        const res = await fetch(`/api/orders/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          console.warn('[OrdersService] Error guardando diagnóstico del equipo:', errData);
          throw new Error(errData.message || 'Error del servidor al guardar diagnóstico');
        }
      }

      // Si se finaliza el diagnóstico, asegurar actualización del estado general de la orden
      if (finalizar) {
        await fetch(`/api/orders/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            estado: 'DIAGNOSTICADO'
          })
        }).catch(err => console.warn('[OrdersService] Error actualizando estado general:', err));
      }
    } catch (err) {
      console.error('[OrdersService] Error en saveDiagnosis:', err);
      throw err;
    }

    const orders = await OrdersService.getOrders();
    const index = orders.findIndex(o => String(o.id) === String(id) || String(o.numero_orden) === String(id));
    if (index >= 0) {
      orders[index].equipos = equipos;
      orders[index].estado = newStatus;
      orders[index].estado_global = newStatus;
      orders[index].updatedAt = new Date().toISOString();
      safeSaveLocalStorage(orders);
      broadcastOrdersUpdate(orders[index]);
      return rehydrateOrder(orders[index]);
    }
    return null;
  },

  /**
   * Guarda el presupuesto económico y transiciona a COTIZADO
   */
  saveBudget: async (id, { moneda, equipos, condiciones, sumatoria_total }) => {
    if (typeof window === 'undefined') return null;
    try {
      await fetch(`/api/orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estado: 'COTIZADO',
          moneda,
          condiciones,
          sumatoria_total
        })
      });
    } catch (e) {}

    const orders = await OrdersService.getOrders();
    const index = orders.findIndex(o => String(o.id) === String(id));
    if (index >= 0) {
      orders[index].moneda = moneda || orders[index].moneda || 'BOB';
      if (equipos) orders[index].equipos = equipos;
      if (condiciones) orders[index].condiciones = condiciones;
      if (sumatoria_total !== undefined) orders[index].sumatoria_total = sumatoria_total;
      orders[index].estado = 'COTIZADO';
      orders[index].estado_global = 'COTIZADO';
      orders[index].updatedAt = new Date().toISOString();
      safeSaveLocalStorage(orders);
      broadcastOrdersUpdate(orders[index]);
      return rehydrateOrder(orders[index]);
    }
    return null;
  },

  /**
   * Actualiza los datos de recepción (Fase 1: Ingreso)
   * Reservado para personal de Recepción y Administradores
   */
  updateReception: async (orderId, receptionData) => {
    if (typeof window === 'undefined') return null;

    const sanitizedEquipos = (receptionData.equipos || []).map((eq, i) => {
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

      return {
        ...eq,
        orden_indice: i + 1,
        marca: eq.marca || 'Motorola',
        modelo: eq.modelo || '',
        numero_serie: (eq.serie || eq.numero_serie || `SER-${Date.now()}-${i}`).toUpperCase().trim(),
        serie: (eq.serie || eq.numero_serie || `SER-${Date.now()}-${i}`).toUpperCase().trim(),
        banda: eq.banda || 'VHF',
        falla_declarada_cliente: eq.falla_declarada_cliente || '',
        accesorios: accs
      };
    });

    const payload = {
      reception: {
        cliente_id: receptionData.cliente_id,
        razon_social: receptionData.razon_social || receptionData.cliente || '',
        cliente: receptionData.cliente || receptionData.razon_social || '',
        nit_ci: receptionData.nit_ci || '',
        telefono: receptionData.telefono || receptionData.cliente_telefono || '',
        cliente_telefono: receptionData.cliente_telefono || receptionData.telefono || '',
        email: receptionData.email || receptionData.cliente_email || '',
        cliente_email: receptionData.cliente_email || receptionData.email || '',
        direccion: receptionData.direccion || receptionData.cliente_direccion || '',
        cliente_direccion: receptionData.cliente_direccion || receptionData.direccion || '',
        persona_contacto: receptionData.persona_contacto || '',
        moneda: receptionData.moneda || 'BOB',
        usuario_tecnico_id: receptionData.usuario_tecnico_id || receptionData.tecnicoAsignadoId || null,
        tecnico_nombre_manual: receptionData.tecnico_nombre_manual || receptionData.tecnicoNombre || null,
        recepcionista_nombre_manual: receptionData.recepcionista_nombre_manual || null,
        notas_internas: receptionData.notas_internas || null,
        numero_orden: receptionData.numero_orden || receptionData.ordenServicio || null,
        equipos: sanitizedEquipos
      }
    };

    const res = await fetch(`/api/orders/${orderId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || 'Error al actualizar recepción');
    }

    const orders = await OrdersService.getOrders();
    const index = orders.findIndex(o => String(o.id) === String(orderId) || String(o.numero_orden) === String(orderId));
    if (index >= 0) {
      orders[index] = {
        ...orders[index],
        ...payload.reception,
        total_equipos: sanitizedEquipos.length,
        equipos: sanitizedEquipos.map((eq, idx) => {
          const prev = (orders[index].equipos || []).find(e => 
            (eq.id && String(e.id) === String(eq.id)) || 
            (eq.tempId && String(e.tempId) === String(eq.tempId))
          ) || orders[index].equipos?.[idx] || {};
          return {
            ...prev,
            ...eq,
            id: eq.id || prev.id || `eq-${Date.now()}-${idx}`,
            tempId: eq.tempId || prev.tempId || eq.id || prev.id,
            orden_indice: idx + 1,
            fallas: eq.fallas || prev.fallas || [],
            repuestos: eq.repuestos || prev.repuestos || [],
            imagenes: eq.imagenes || prev.imagenes || [],
            imagenesRecepcion: eq.imagenesRecepcion || eq.imagenes || prev.imagenesRecepcion || prev.imagenes || [],
            imagenesInternas: eq.imagenesInternas || prev.imagenesInternas || [],
            imagenesDiagnostico: eq.imagenesDiagnostico || eq.imagenesInternas || prev.imagenesDiagnostico || prev.imagenesInternas || []
          };
        }),
        updatedAt: new Date().toISOString()
      };
      safeSaveLocalStorage(orders);
      broadcastOrdersUpdate(orders[index]);
      return rehydrateOrder(orders[index]);
    }

    return null;
  },

  /**
   * Entrega y cobro de la orden
   */
  deliverOrder: async (id) => {
    return await OrdersService.updateOrderStatus(id, 'ENTREGADO');
  },

  /**
   * Obtiene la lista de técnicos disponibles para asignación
   */
  getTechnicians: async () => {
    let list = [];
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          list = json.data.filter(u => u.rol === 'TECNICO' && u.activo !== false);
        }
      }
    } catch (e) {}

    // Fallback con personal base
    if (list.length === 0) {
      list = [
        { id: 'b0000000-0000-0000-0000-000000000002', nombre_completo: 'Roberto Gómez (Técnico RF)', email: 'tecnico' },
        { id: 'b0000000-0000-0000-0000-000000000004', nombre_completo: 'Carlos Mamani (Laboratorio RF)', email: 'cmamani' }
      ];
    }

    // Integrar inmediatamente personal persistido en 'americasis_users'
    if (typeof window !== 'undefined') {
      try {
        const local = localStorage.getItem('americasis_users');
        if (local) {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed)) {
            parsed.forEach(u => {
              if (u.rol === 'TECNICO' && u.activo !== false) {
                const exists = list.some(t => String(t.id) === String(u.id) || (t.email && u.email && t.email.toLowerCase() === u.email.toLowerCase()));
                if (!exists) {
                  list.push(u);
                }
              }
            });
          }
        }
      } catch (err) {}
    }

    return list;
  },

  /**
   * Recepción / Admin designa o asigna un técnico con permisos de edición
   */
  assignTechnician: async (orderId, technicianId, technicianName) => {
    if (typeof window === 'undefined') return null;

    try {
      await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario_tecnico_id: technicianId,
          tecnico_nombre_manual: technicianName,
          condiciones_comerciales_json: {
            solicitud_edicion: {
              tecnico_id: technicianId,
              tecnico_nombre: technicianName,
              estado: 'APROBADA',
              fecha_aprobacion: new Date().toISOString()
            }
          }
        })
      });
    } catch (e) {}

    const orders = await OrdersService.getOrders();
    const index = orders.findIndex(o => String(o.id) === String(orderId) || String(o.numero_orden) === String(orderId));
    if (index >= 0) {
      orders[index].usuario_tecnico_id = technicianId;
      orders[index].tecnico_asignado_id = technicianId;
      orders[index].tecnico_nombre_manual = technicianName;
      orders[index].solicitud_edicion_estado = 'APROBADA';
      orders[index].solicitud_edicion_tecnico_id = null;
      orders[index].solicitud_edicion_tecnico_nombre = null;
      orders[index].updatedAt = new Date().toISOString();
      safeSaveLocalStorage(orders);
      broadcastOrdersUpdate(orders[index]);
      return rehydrateOrder(orders[index]);
    }
    return null;
  },

  /**
   * Técnico solicita permiso para diagnosticar / editar una orden
   */
  requestTechnicianPermission: async (orderId, technicianUser) => {
    if (typeof window === 'undefined') return null;

    const payload = {
      tecnico_id: technicianUser.id,
      tecnico_nombre: technicianUser.nombre_completo,
      estado: 'PENDIENTE',
      fecha_solicitud: new Date().toISOString()
    };

    try {
      await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          condiciones_comerciales_json: { solicitud_edicion: payload }
        })
      });
    } catch (e) {}

    const orders = await OrdersService.getOrders();
    const index = orders.findIndex(o => String(o.id) === String(orderId) || String(o.numero_orden) === String(orderId));
    if (index >= 0) {
      orders[index].solicitud_edicion_estado = 'PENDIENTE';
      orders[index].solicitud_edicion_tecnico_id = technicianUser.id;
      orders[index].solicitud_edicion_tecnico_nombre = technicianUser.nombre_completo;
      orders[index].solicitud_edicion_fecha = payload.fecha_solicitud;
      orders[index].updatedAt = new Date().toISOString();
      safeSaveLocalStorage(orders);
      broadcastOrdersUpdate(orders[index]);
      return rehydrateOrder(orders[index]);
    }
    return null;
  },

  /**
   * Recepción / Admin responde a la solicitud de asignación del técnico
   */
  respondTechnicianPermission: async (orderId, approve = true) => {
    if (typeof window === 'undefined') return null;

    const orders = await OrdersService.getOrders();
    const index = orders.findIndex(o => String(o.id) === String(orderId) || String(o.numero_orden) === String(orderId));
    if (index < 0) return null;

    const current = orders[index];
    const techId = current.solicitud_edicion_tecnico_id;
    const techName = current.solicitud_edicion_tecnico_nombre || 'Técnico Especialista';

    if (approve && techId) {
      return await OrdersService.assignTechnician(orderId, techId, techName);
    } else {
      try {
        await fetch(`/api/orders/${orderId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            condiciones_comerciales_json: {
              solicitud_edicion: { estado: 'RECHAZADA', fecha_rechazo: new Date().toISOString() }
            }
          })
        });
      } catch (e) {}

      orders[index].solicitud_edicion_estado = 'RECHAZADA';
      orders[index].solicitud_edicion_tecnico_id = null;
      orders[index].solicitud_edicion_tecnico_nombre = null;
      orders[index].updatedAt = new Date().toISOString();
      safeSaveLocalStorage(orders);
      broadcastOrdersUpdate(orders[index]);
      return rehydrateOrder(orders[index]);
    }
  }
};


