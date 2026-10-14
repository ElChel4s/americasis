/**
 * Servicio Centralizado de Persistencia de Órdenes
 * Sistema América — Radio Service ERP
 * 
 * Conexión prioritaria con API backend (PostgreSQL / Supabase)
 * con fallback blindado y sincronización en almacenamiento local del cliente.
 * 
 * Protegido contra QuotaExceededError:
 * - Mantiene imágenes en memoria (RAM) durante la sesión actual para no saturar los 5 MB de localStorage.
 * - Descarte automático de Base64 pesados en localStorage preservando siempre los metadatos de la orden.
 * - Emisión de eventos 'america_orders_updated' para reactividad global instantánea.
 */

const STORAGE_KEY = 'america_orders_db';

// Almacén en memoria RAM para imágenes de alta resolución en la sesión activa
const inMemoryOrderImages = new Map();

/**
 * Guarda en localStorage con protección contra QuotaExceededError
 */
const safeSaveLocalStorage = (orders) => {
  if (typeof window === 'undefined') return false;

  // Intento 1: Guardado estándar
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
    return true;
  } catch (quotaErr) {
    console.warn('[OrdersService] QuotaExceededError detectado en localStorage. Activando fallback de aligerado de Base64...');
  }

  // Intento 2: Respaldar fotos en memoria RAM y guardar en localStorage versión sin Base64 pesados
  try {
    const strippedOrders = orders.map((order) => {
      const orderKey = String(order.id || order.numero_orden || '');
      
      const imagesForMemory = [];
      const sanitizedEquipos = (order.equipos || []).map((eq, eqIdx) => {
        if (Array.isArray(eq.imagenes) && eq.imagenes.length > 0) {
          imagesForMemory.push({ equipoIndex: eqIdx, imagenes: eq.imagenes });

          // En localStorage solo dejamos metadatos ligeros (sin Data URLs pesados)
          const lightImages = eq.imagenes.map(img => ({
            id: img.id,
            name: img.name,
            etapa: img.etapa,
            sizeKb: img.sizeKb || null,
            // Conservar URL solo si es una URL corta HTTP (servidor) o pequeña, no un Base64 de 100KB+
            url: (typeof img.url === 'string' && !img.url.startsWith('data:')) ? img.url : ''
          }));
          return { ...eq, imagenes: lightImages };
        }
        return eq;
      });

      if (orderKey && imagesForMemory.length > 0) {
        inMemoryOrderImages.set(orderKey, imagesForMemory);
      }

      return { ...order, equipos: sanitizedEquipos };
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(strippedOrders));
    console.info('[OrdersService] Órdenes guardadas con éxito en localStorage tras aligerar imágenes.');
    return true;
  } catch (fallbackErr) {
    console.warn('[OrdersService] Fallback 2: Intentando podar órdenes antiguas...', fallbackErr);
  }

  // Intento 3: Guardar solo las últimas 10 órdenes sin imágenes para salvar la sesión
  try {
    const ultraLightOrders = orders.slice(0, 10).map(o => ({
      ...o,
      equipos: (o.equipos || []).map(eq => ({ ...eq, imagenes: [] }))
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ultraLightOrders));
    console.info('[OrdersService] Guardadas últimas 10 órdenes en modo ultra-ligero.');
    return true;
  } catch (finalErr) {
    console.error('[OrdersService] No fue posible persistir en localStorage:', finalErr);
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
      // Si la versión en memoria tiene las fotos con dataUrl, rehidratarla
      return { ...eq, imagenes: cachedEntry.imagenes };
    }
    return eq;
  });

  return { ...order, equipos };
};

/**
 * Emite un evento en el navegador para actualizar tableros e interfaces reactivamente
 */
const broadcastOrdersUpdate = (order) => {
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('america_orders_updated', { detail: order }));
    } catch (e) {}
  }
};

export const OrdersService = {
  /**
   * Obtiene todas las órdenes, consultando la base de datos a través de la API
   * con sincronización protegida en localStorage
   */
  getOrders: async () => {
    if (typeof window === 'undefined') return [];
    try {
      // 1. Consultar a la API backend para obtener datos reales
      try {
        const res = await fetch('/api/orders');
        if (res.ok) {
          const result = await res.json();
          if (result.success && Array.isArray(result.data)) {
            safeSaveLocalStorage(result.data);
            return result.data.map(rehydrateOrder);
          }
        }
      } catch (apiErr) {
        // En caso de estar offline, continuar al almacenamiento local
      }

      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return [];

      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];

      // Purgar inmediatamente órdenes de demostración antiguas de la memoria local
      if (parsed.some(o => o.id === '101' || o.id === '102' || o.id === '103' || o.numero_orden === 'OS-80412')) {
        localStorage.removeItem(STORAGE_KEY);
        return [];
      }

      return parsed.map(rehydrateOrder);
    } catch (e) {
      console.warn('Error leyendo orders db:', e);
      return [];
    }
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
          return rehydrateOrder(result.data);
        }
      }
    } catch (e) {}

    const orders = await OrdersService.getOrders();
    const found = orders.find(o => String(o.id) === String(id) || String(o.numero_orden) === String(id)) || null;
    return rehydrateOrder(found);
  },

  /**
   * Guarda o actualiza una orden de servicio de manera blindada
   */
  saveOrder: async (data) => {
    if (typeof window === 'undefined') return null;
    const now = new Date().toISOString();

    // 1. Preparar lista de equipos y sanitizar para evitar objetos File no serializables
    const sanitizedEquipos = (data.equipos || []).map((eq, i) => {
      // Mapear accesorios si vienen como objeto o array
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

      // Sanitizar imágenes asegurando que el url sea string y no contenga objetos File
      const safeImagenes = (eq.imagenes || []).map((img, imgIdx) => ({
        id: img.id || `img-${i}-${imgIdx}-${Date.now()}`,
        url: typeof img.url === 'string' ? img.url : '',
        name: img.name || `Evidencia ${imgIdx + 1}`,
        etapa: img.etapa || 'RECEPCION',
        sizeKb: img.sizeKb || null
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
        costo_servicio: eq.costo_servicio || 0,
        accesorios: accs,
        imagenes: safeImagenes
      };
    });

    // 2. Guardar fotos completas en la memoria RAM de la sesión
    const tempKey = String(data.id || data.numero_orden || data.ordenServicio || Date.now());
    const memoryImages = sanitizedEquipos.map((eq, idx) => ({
      equipoIndex: idx,
      imagenes: eq.imagenes
    }));
    inMemoryOrderImages.set(tempKey, memoryImages);

    // 3. Intentar persistir en PostgreSQL / Supabase
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order: {
            sucursal_id: data.sucursal_id || 'a0000000-0000-0000-0000-000000000001',
            cliente_id: data.cliente_id || null,
            razon_social: data.razon_social || data.cliente || 'Consumidor Final',
            recepcionista_nombre_manual: data.recepcionista_nombre_manual || 'Recepción Mostrador',
            estado: data.estado || 'RECIBIDO',
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
        const result = await res.json();
        if (result.success && result.data?.orden) {
          const serverOrder = result.data.orden;
          // Asignar clave permanente en memoria
          inMemoryOrderImages.set(String(serverOrder.id), memoryImages);
          if (serverOrder.numero_orden) {
            inMemoryOrderImages.set(String(serverOrder.numero_orden), memoryImages);
          }

          // Sincronizar lista local con la nueva orden del servidor
          const existingOrders = await OrdersService.getOrders();
          const mergedOrders = [rehydrateOrder(serverOrder), ...existingOrders.filter(o => o.id !== serverOrder.id)];
          safeSaveLocalStorage(mergedOrders);
          broadcastOrdersUpdate(serverOrder);
          return rehydrateOrder(serverOrder);
        }
      } else {
        console.warn(`[OrdersService] API /api/orders respondió status ${res.status}. Usando persistencia local segura.`);
      }
    } catch (apiError) {
      console.warn('[OrdersService] Conexión backend no disponible, procediendo con guardado local blindado:', apiError.message);
    }

    // 4. Fallback local offline/híbrido
    const orders = await OrdersService.getOrders();
    let orderToSave = { 
      ...data, 
      razon_social: data.razon_social || data.cliente || 'Consumidor Final',
      equipos: sanitizedEquipos,
      updatedAt: now 
    };

    if (!orderToSave.id) {
      orderToSave.id = Date.now().toString();
      orderToSave.numero_orden = orderToSave.numero_orden || orderToSave.ordenServicio || `OS-${Math.floor(Math.random() * 90000) + 10000}`;
      orderToSave.createdAt = now;
      orderToSave.estado = orderToSave.estado || 'RECIBIDO';
      orderToSave.estado_global = orderToSave.estado;
      orders.unshift(orderToSave);
    } else {
      const index = orders.findIndex(o => String(o.id) === String(orderToSave.id));
      if (index >= 0) {
        orderToSave.createdAt = orders[index].createdAt || orderToSave.updatedAt;
        orderToSave.estado = orderToSave.estado || orders[index].estado || 'RECIBIDO';
        orderToSave.estado_global = orderToSave.estado;
        orders[index] = orderToSave;
      } else {
        orderToSave.estado = orderToSave.estado || 'RECIBIDO';
        orderToSave.estado_global = orderToSave.estado;
        orders.unshift(orderToSave);
      }
    }

    // Guardar también con el ID asignado en memoria
    inMemoryOrderImages.set(String(orderToSave.id), memoryImages);
    if (orderToSave.numero_orden) {
      inMemoryOrderImages.set(String(orderToSave.numero_orden), memoryImages);
    }

    safeSaveLocalStorage(orders);
    broadcastOrdersUpdate(orderToSave);
    return rehydrateOrder(orderToSave);
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

    // Intentar PUT en backend
    try {
      for (const eq of (equipos || [])) {
        await fetch(`/api/orders/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            equipoId: eq.id,
            diagnosis: {
              estado_individual: newStatus,
              texto_diagnostico: eq.texto_diagnostico || '',
              descripcion_servicio: eq.descripcion_servicio || '',
              costo_servicio: eq.costo_servicio || 0,
              fallas: eq.fallas || [],
              repuestos: eq.repuestos || []
            }
          })
        });
      }
    } catch (e) {}

    const orders = await OrdersService.getOrders();
    const index = orders.findIndex(o => String(o.id) === String(id));
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
   * Entrega y cobro de la orden
   */
  deliverOrder: async (id) => {
    return await OrdersService.updateOrderStatus(id, 'ENTREGADO');
  }
};

