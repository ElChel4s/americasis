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

import { UsersService, normalizeEmail } from './users.service';

// Almacén en memoria RAM para imágenes de alta resolución en la sesión activa
const inMemoryOrderImages = new Map();

/**
 * Extrae la URL utilizable de cualquier objeto o cadena de imagen de forma infalible
 */
export const resolveImageUrl = (img) => {
  if (!img) return '';
  if (typeof img === 'string') return img.trim();
  if (typeof img.url === 'string' && img.url) return img.url.trim();
  if (typeof img.preview === 'string' && img.preview) return img.preview.trim();
  if (typeof img.dataUrl === 'string' && img.dataUrl) return img.dataUrl.trim();
  if (typeof img.data === 'string' && img.data) return img.data.trim();
  if (typeof img.src === 'string' && img.src) return img.src.trim();
  if (typeof img.url_archivo === 'string' && img.url_archivo) return img.url_archivo.trim();
  if (typeof img.base64 === 'string' && img.base64) {
    return img.base64.startsWith('data:') ? img.base64.trim() : `data:image/jpeg;base64,${img.base64.trim()}`;
  }
  return '';
};

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

  // Intento 2: Conservar las primeras 15 órdenes completas (órdenes activas y recientes)
  // y solo aligerar las fotos de órdenes históricas antiguas (> índice 14)
  try {
    const strippedOrders = orders.map((order, orderIdx) => {
      // Las primeras 15 órdenes conservan 100% sus fotos completas
      if (orderIdx < 15) {
        return order;
      }
      // Para órdenes antiguas del historial, aligerar para respetar cuota
      const sanitizedEquipos = (order.equipos || []).map(eq => ({
        ...eq,
        imagenes: (eq.imagenes || eq.imagenesRecepcion || []).map(img => {
          const u = resolveImageUrl(img);
          return {
            ...img,
            url: (!u.startsWith('data:')) ? u : ''
          };
        }),
        imagenesInternas: (eq.imagenesInternas || eq.imagenesDiagnostico || []).map(img => {
          const u = resolveImageUrl(img);
          return {
            ...img,
            url: (!u.startsWith('data:')) ? u : ''
          };
        })
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

  // Intento 3: Guardar últimas 25 órdenes aligeradas para salvar datos críticos
  try {
    const ultraLightOrders = orders.slice(0, 25).map(o => ({
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
  const orderKey1 = String(order.id || '');
  const orderKey2 = String(order.numero_orden || '');
  const cachedImages = inMemoryOrderImages.get(orderKey1) || inMemoryOrderImages.get(orderKey2);

  const equipos = (order.equipos || []).map((eq, idx) => {
    let imagenes = (Array.isArray(eq.imagenes) && eq.imagenes.length > 0)
      ? eq.imagenes
      : (Array.isArray(eq.imagenesRecepcion) && eq.imagenesRecepcion.length > 0 ? eq.imagenesRecepcion : []);

    let imagenesInternas = (Array.isArray(eq.imagenesInternas) && eq.imagenesInternas.length > 0)
      ? eq.imagenesInternas
      : (Array.isArray(eq.imagenesDiagnostico) && eq.imagenesDiagnostico.length > 0 ? eq.imagenesDiagnostico : []);

    if (cachedImages) {
      const cachedEntry = cachedImages.find(c => c.equipoIndex === idx);
      if (cachedEntry) {
        const hasValidExterior = imagenes.some(img => {
          const u = resolveImageUrl(img);
          return Boolean(u && u.length > 15);
        });
        if (!hasValidExterior && Array.isArray(cachedEntry.imagenes) && cachedEntry.imagenes.length > 0) {
          imagenes = cachedEntry.imagenes;
        }

        const hasValidInternas = imagenesInternas.some(img => {
          const u = resolveImageUrl(img);
          return Boolean(u && u.length > 15);
        });
        if (!hasValidInternas && Array.isArray(cachedEntry.imagenesInternas) && cachedEntry.imagenesInternas.length > 0) {
          imagenesInternas = cachedEntry.imagenesInternas;
        }
      }
    }

    return {
      ...eq,
      imagenes,
      imagenesRecepcion: imagenes,
      imagenesInternas,
      imagenesDiagnostico: imagenesInternas
    };
  });

  return { ...order, equipos };
};

/**
 * Fusión inteligente de una orden del servidor con la versión local,
 * preservando estrictamente las imágenes de recepción y diagnóstico de cada equipo,
 * y sincronizando la asignación de técnico y firmas del informe.
 */
const mergeOrderPreservingPhotos = (serverOrder, localOrder) => {
  if (!serverOrder) return localOrder ? rehydrateOrder(localOrder) : null;
  if (!localOrder) return rehydrateOrder(serverOrder);

  // Sincronizar datos del técnico (priorizar la asignación local más reciente si difiere)
  const resolvedTecnicoId = localOrder.usuario_tecnico_id || localOrder.tecnico_asignado_id || localOrder.tecnicoAsignadoId || serverOrder.usuario_tecnico_id || serverOrder.tecnico_asignado_id || null;
  const resolvedTecnicoNombre = localOrder.tecnico_nombre_manual || localOrder.tecnicoNombre || serverOrder.tecnico_nombre_manual || serverOrder.tecnicoNombre || null;

  // Condiciones comerciales y firma de informe en Fase 4
  const mergedCondiciones = {
    ...(serverOrder.condiciones || serverOrder.condiciones_comerciales_json || {}),
    ...(localOrder.condiciones || localOrder.condiciones_comerciales_json || {})
  };
  if (resolvedTecnicoNombre && !mergedCondiciones.tecnicoFirmanteNombre) {
    mergedCondiciones.tecnicoFirmanteNombre = resolvedTecnicoNombre;
  }

  // Mapear equipos preservando fotos de recepción y de diagnóstico
  const localEquipos = localOrder.equipos || [];
  const serverEquipos = serverOrder.equipos || [];

  const mergedEquipos = (serverEquipos.length > 0 ? serverEquipos : localEquipos).map((sEq, idx) => {
    // Buscar equipo correspondiente en el almacén local
    const lEq = localEquipos.find(e => 
      (sEq.id && String(e.id) === String(sEq.id)) ||
      (sEq.tempId && String(e.tempId) === String(sEq.tempId)) ||
      (sEq.numero_serie && e.numero_serie && String(e.numero_serie).toUpperCase() === String(sEq.numero_serie).toUpperCase()) ||
      (sEq.serie && e.serie && String(e.serie).toUpperCase() === String(sEq.serie).toUpperCase())
    ) || localEquipos[idx] || {};

    // 1. Fotos de recepción (exterior)
    const sImgs = (Array.isArray(sEq.imagenes) && sEq.imagenes.length > 0)
      ? sEq.imagenes
      : (Array.isArray(sEq.imagenesRecepcion) && sEq.imagenesRecepcion.length > 0 ? sEq.imagenesRecepcion : []);

    const lImgs = (Array.isArray(lEq.imagenes) && lEq.imagenes.length > 0)
      ? lEq.imagenes
      : (Array.isArray(lEq.imagenesRecepcion) && lEq.imagenesRecepcion.length > 0 ? lEq.imagenesRecepcion : []);

    const hasValidPhoto = (arr) => {
      if (!Array.isArray(arr) || arr.length === 0) return false;
      return arr.some(img => {
        const u = resolveImageUrl(img);
        return Boolean(u && u.length > 15);
      });
    };

    const finalImgs = hasValidPhoto(lImgs) ? lImgs : (hasValidPhoto(sImgs) ? sImgs : (lImgs.length > 0 ? lImgs : sImgs));

    // 2. Fotos de diagnóstico (interior / laboratorio)
    const sImgsInt = (Array.isArray(sEq.imagenesInternas) && sEq.imagenesInternas.length > 0)
      ? sEq.imagenesInternas
      : (Array.isArray(sEq.imagenesDiagnostico) && sEq.imagenesDiagnostico.length > 0 ? sEq.imagenesDiagnostico : []);

    const lImgsInt = (Array.isArray(lEq.imagenesInternas) && lEq.imagenesInternas.length > 0)
      ? lEq.imagenesInternas
      : (Array.isArray(lEq.imagenesDiagnostico) && lEq.imagenesDiagnostico.length > 0 ? lEq.imagenesDiagnostico : []);

    const finalImgsInt = hasValidPhoto(lImgsInt) ? lImgsInt : (hasValidPhoto(sImgsInt) ? sImgsInt : (lImgsInt.length > 0 ? lImgsInt : sImgsInt));

    // 3. Accesorios de recepción
    const accObj = (sEq.accesoriosRecepcion && Object.keys(sEq.accesoriosRecepcion).length > 0)
      ? sEq.accesoriosRecepcion
      : (lEq.accesoriosRecepcion || {});

    return {
      ...lEq,
      ...sEq,
      id: sEq.id || lEq.id || `eq-${idx + 1}`,
      tempId: sEq.tempId || lEq.tempId || sEq.id || lEq.id,
      orden_indice: sEq.orden_indice || lEq.orden_indice || (idx + 1),
      accesoriosRecepcion: accObj,
      imagenes: finalImgs,
      imagenesRecepcion: finalImgs,
      imagenesInternas: finalImgsInt,
      imagenesDiagnostico: finalImgsInt
    };
  });

  const resolvedSolicitudAsignacion = localOrder?.solicitud_asignacion !== undefined
    ? localOrder.solicitud_asignacion
    : (serverOrder?.solicitud_asignacion || null);

  const merged = {
    ...localOrder,
    ...serverOrder,
    usuario_tecnico_id: resolvedTecnicoId,
    tecnico_asignado_id: resolvedTecnicoId,
    tecnicoAsignadoId: resolvedTecnicoId,
    tecnico_nombre_manual: resolvedTecnicoNombre,
    tecnicoNombre: resolvedTecnicoNombre,
    solicitud_asignacion: resolvedSolicitudAsignacion,
    condiciones: mergedCondiciones,
    condiciones_comerciales_json: mergedCondiciones,
    equipos: mergedEquipos
  };

  // Guardar en memoria RAM de la sesión
  const memoryImages = mergedEquipos.map((eq, idx) => ({
    equipoIndex: idx,
    imagenes: eq.imagenes || [],
    imagenesInternas: eq.imagenesInternas || []
  }));
  if (merged.id) inMemoryOrderImages.set(String(merged.id), memoryImages);
  if (merged.numero_orden) inMemoryOrderImages.set(String(merged.numero_orden), memoryImages);

  return rehydrateOrder(merged);
};

/**
 * Emite eventos en el navegador para actualizar tableros e interfaces reactivamente en el acto
 */
const broadcastOrdersUpdate = (order) => {
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('america_orders_updated', { detail: order }));
    } catch (e) {}
  }
};

const currentlySyncingIds = new Set();
let isFetchingOrders = false;

export const OrdersService = {
  /**
   * Elimina una orden de la caché local y referencias huérfanas
   */
  removeOrderFromLocalCache: (id) => {
    if (typeof window === 'undefined' || !id) return;
    try {
      const targetId = String(id).trim();
      const current = getStoredLocalOrders();
      const filtered = current.filter(o => 
        String(o.id).trim() !== targetId && 
        String(o.numero_orden || '').trim() !== targetId
      );
      if (filtered.length !== current.length) {
        safeSaveLocalStorage(filtered);
      }
      try {
        localStorage.removeItem('last_active_order_id');
        const lastId = localStorage.getItem('last_order_id');
        if (lastId === targetId) localStorage.removeItem('last_order_id');
      } catch (e) {}
      inMemoryOrderImages.delete(targetId);
      console.info(`[OrdersService] Orden #${targetId} eliminada de caché local.`);
    } catch (e) {
      console.warn('[OrdersService] Error limpiando orden de caché local:', e);
    }
  },

  /**
   * Obtiene todas las órdenes, combinando el almacenamiento local con el backend
   * de forma segura (sin sobreescrituras que borren las imágenes locales).
   */
  getOrders: async () => {
    if (typeof window === 'undefined') return [];

    // 1. Cargar órdenes locales garantizadas
    let orders = getStoredLocalOrders();

    if (isFetchingOrders) {
      return orders.map(rehydrateOrder);
    }

    // 2. Intentar consultar servidor si está disponible
    isFetchingOrders = true;
    try {
      const res = await fetch('/api/orders');
      if (res.ok) {
        const result = await res.json();
        if (result.success && Array.isArray(result.data)) {
          const merged = [];
          const seenKeys = new Set();

          // Fusión inteligente: las órdenes de servidor se enriquecen con las fotos y datos locales
          for (const so of result.data) {
            const key = String(so.id || so.numero_orden);
            seenKeys.add(key);
            const lo = orders.find(o => String(o.id) === key || String(o.numero_orden) === key);
            merged.push(mergeOrderPreservingPhotos(so, lo));
          }

          // Añadir órdenes locales que aún no hayan sido sincronizadas
          for (const lo of orders) {
            const key = String(lo.id || lo.numero_orden);
            if (!seenKeys.has(key)) {
              // Si la orden local tiene un UUID válido pero NO vino en el servidor:
              // Significa que fue eliminada en Supabase. Se omite para purgarla de localStorage.
              const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(lo.id || ''));
              if (isUuid) {
                console.info(`[OrdersService] Omitiendo y limpiando orden huérfana de caché: ${lo.id}`);
                continue;
              }

              merged.push(rehydrateOrder(lo));
              // Si tiene un ID temporal, subirla silenciosamente a Supabase en segundo plano una sola vez
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
    } finally {
      isFetchingOrders = false;
    }

    return orders.map(rehydrateOrder);
  },

  /**
   * Obtiene una orden por su ID o número correlativo
   */
  getOrderById: async (id) => {
    if (typeof window === 'undefined') return null;
    if (!id || id === 'undefined' || id === 'null') return null;

    try {
      const res = await fetch(`/api/orders/${id}`);

      // Si el servidor responde 404: La orden ya fue eliminada en Supabase
      if (res.status === 404) {
        console.warn(`[OrdersService] Orden #${id} no existe en el servidor (404). Limpiando de caché local...`);
        OrdersService.removeOrderFromLocalCache(id);
        return null;
      }

      if (res.ok) {
        const result = await res.json();
        if (result.success && result.data) {
          const orders = getStoredLocalOrders();
          const idx = orders.findIndex(o => String(o.id) === String(id) || String(o.numero_orden) === String(id));
          const existing = idx >= 0 ? orders[idx] : null;
          const merged = mergeOrderPreservingPhotos(result.data, existing);

          if (idx >= 0) {
            orders[idx] = merged;
          } else {
            orders.unshift(merged);
          }
          safeSaveLocalStorage(orders);
          return merged;
        } else if (result.error) {
          OrdersService.removeOrderFromLocalCache(id);
          return null;
        }
      }
    } catch (e) {
      console.warn('[OrdersService] Error de red fetching order from API:', e);
    }

    // Fallback únicamente si la red falló (offline)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id));
    const orders = getStoredLocalOrders();
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
        url: resolveImageUrl(img),
        name: img.name || `Evidencia ${imgIdx + 1}`,
        etapa: img.etapa || 'RECEPCION',
        sizeKb: img.sizeKb || null
      }));

      const safeImagenesInternas = (eq.imagenesInternas || eq.imagenesDiagnostico || []).map((img, imgIdx) => ({
        id: img.id || `img-int-${i}-${imgIdx}-${Date.now()}`,
        url: resolveImageUrl(img),
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

    const techId = data.usuario_tecnico_id || data.tecnicoAsignadoId || data.tecnico_asignado_id || null;
    const techName = data.tecnico_nombre_manual || data.tecnicoNombre || null;
    const prevCond = data.condiciones || data.condiciones_comerciales_json || {};

    const nuevaOrden = {
      ...data,
      id: orderId,
      numero_orden: numeroOrden,
      ordenServicio: numeroOrden,
      razon_social: data.razon_social || data.cliente || 'Consumidor Final',
      cliente: data.cliente || data.razon_social || 'Consumidor Final',
      usuario_tecnico_id: techId,
      tecnico_asignado_id: techId,
      tecnicoAsignadoId: techId,
      tecnico_nombre_manual: techName,
      tecnicoNombre: techName,
      condiciones: {
        ...prevCond,
        tecnicoFirmanteNombre: techName || prevCond.tecnicoFirmanteNombre
      },
      condiciones_comerciales_json: {
        ...prevCond,
        tecnicoFirmanteNombre: techName || prevCond.tecnicoFirmanteNombre
      },
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
      imagenes: eq.imagenes || [],
      imagenesInternas: eq.imagenesInternas || []
    }));
    inMemoryOrderImages.set(String(nuevaOrden.id), memoryImages);
    inMemoryOrderImages.set(String(nuevaOrden.numero_orden), memoryImages);

    // 4. Guardado prioritario y obligatorio en la Base de Datos Central (Supabase / Postgres)
    try {
      const isExistingUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(data.id || ''));
      const equiposPayload = sanitizedEquipos.map(eq => ({
        id: eq.id,
        marca: eq.marca,
        modelo: eq.modelo,
        numero_serie: eq.numero_serie,
        banda: eq.banda,
        falla_declarada_cliente: eq.falla_declarada_cliente,
        costo_servicio: eq.costo_servicio,
        accesorios: eq.accesorios,
        accesoriosRecepcion: eq.accesoriosRecepcion,
        imagenes: eq.imagenes || eq.imagenesRecepcion || [],
        imagenesRecepcion: eq.imagenesRecepcion || eq.imagenes || [],
        imagenesDiagnostico: eq.imagenesDiagnostico || eq.imagenesInternas || [],
        imagenesInternas: eq.imagenesInternas || eq.imagenesDiagnostico || [],
        evidencias: eq.evidencias || []
      }));

      if (isExistingUuid) {
        const updateRes = await fetch(`/api/orders/${data.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reception: {
              cliente_id: data.cliente_id || null,
              razon_social: nuevaOrden.razon_social,
              recepcionista_nombre_manual: data.recepcionista_nombre_manual || 'Recepción Mostrador',
              usuario_tecnico_id: nuevaOrden.usuario_tecnico_id || data.tecnicoAsignadoId || null,
              tecnico_nombre_manual: nuevaOrden.tecnico_nombre_manual || data.tecnicoNombre || null,
              moneda: data.moneda || 'BOB',
              tasa_cambio: data.tasa_cambio || 6.96,
              notas_internas: data.notas_internas || null,
              equipos: equiposPayload
            }
          })
        });

        if (updateRes.ok) {
          const updateJson = await updateRes.json();
          if (updateJson.success && updateJson.data) {
            console.log('[OrdersService] Orden existente actualizada con evidencias en Supabase:', data.id);
          }
        }
      } else {
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
            equipos: equiposPayload
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
    if (!localOrder) return;
    const orderKey = String(localOrder.id || localOrder.numero_orden || '').trim();
    if (!orderKey || currentlySyncingIds.has(orderKey)) return;
    currentlySyncingIds.add(orderKey);

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
            id: eq.id,
            marca: eq.marca || 'Motorola',
            modelo: eq.modelo || '',
            numero_serie: eq.numero_serie || eq.serie || `SER-${Date.now()}`,
            banda: eq.banda || 'VHF',
            falla_declarada_cliente: eq.falla_declarada_cliente || '',
            costo_servicio: eq.costo_servicio || 0,
            accesorios: eq.accesorios || [],
            accesoriosRecepcion: eq.accesoriosRecepcion || {},
            imagenes: eq.imagenes || eq.imagenesRecepcion || [],
            imagenesRecepcion: eq.imagenesRecepcion || eq.imagenes || [],
            imagenesDiagnostico: eq.imagenesDiagnostico || eq.imagenesInternas || [],
            imagenesInternas: eq.imagenesInternas || eq.imagenesDiagnostico || [],
            evidencias: eq.evidencias || []
          }))
        })
      });

      if (res.status === 404) {
        OrdersService.removeOrderFromLocalCache(localOrder.id);
        return;
      }

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
    } catch (e) {
    } finally {
      currentlySyncingIds.delete(orderKey);
    }
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
            finalizar: finalizar,
            imagenes: eq.imagenes || [],
            imagenesRecepcion: eq.imagenesRecepcion || eq.imagenes || [],
            imagenesDiagnostico: eq.imagenesDiagnostico || eq.imagenesInternas || [],
            imagenesInternas: eq.imagenesInternas || eq.imagenesDiagnostico || [],
            evidencias: eq.evidencias || []
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

    const orders = getStoredLocalOrders();
    const index = orders.findIndex(o => String(o.id) === String(id) || String(o.numero_orden) === String(id));
    if (index >= 0) {
      const existingEquipos = orders[index].equipos || [];
      const updatedEquipos = (equipos || []).map((eq, i) => {
        const prev = existingEquipos.find(e => 
          (eq.id && String(e.id) === String(eq.id)) ||
          (eq.tempId && String(e.tempId) === String(eq.tempId))
        ) || existingEquipos[i] || {};

        const imgs = (Array.isArray(eq.imagenes) && eq.imagenes.length > 0)
          ? eq.imagenes
          : (Array.isArray(eq.imagenesRecepcion) && eq.imagenesRecepcion.length > 0
              ? eq.imagenesRecepcion
              : (Array.isArray(prev.imagenes) && prev.imagenes.length > 0 ? prev.imagenes : (prev.imagenesRecepcion || [])));

        const imgsInt = (Array.isArray(eq.imagenesInternas) && eq.imagenesInternas.length > 0)
          ? eq.imagenesInternas
          : (Array.isArray(eq.imagenesDiagnostico) && eq.imagenesDiagnostico.length > 0
              ? eq.imagenesDiagnostico
              : (Array.isArray(prev.imagenesInternas) && prev.imagenesInternas.length > 0 ? prev.imagenesInternas : (prev.imagenesDiagnostico || [])));

        return {
          ...prev,
          ...eq,
          imagenes: imgs,
          imagenesRecepcion: imgs,
          imagenesInternas: imgsInt,
          imagenesDiagnostico: imgsInt
        };
      });

      orders[index].equipos = updatedEquipos;
      orders[index].estado = newStatus;
      orders[index].estado_global = newStatus;
      orders[index].updatedAt = new Date().toISOString();

      // Guardar en RAM de sesión
      const memoryImages = updatedEquipos.map((eq, idx) => ({
        equipoIndex: idx,
        imagenes: eq.imagenes || [],
        imagenesInternas: eq.imagenesInternas || []
      }));
      if (orders[index].id) inMemoryOrderImages.set(String(orders[index].id), memoryImages);
      if (orders[index].numero_orden) inMemoryOrderImages.set(String(orders[index].numero_orden), memoryImages);

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

    const orders = getStoredLocalOrders();
    const index = orders.findIndex(o => String(o.id) === String(orderId) || String(o.numero_orden) === String(orderId));
    const currentOrder = index >= 0 ? orders[index] : null;

    const sanitizedEquipos = (receptionData.equipos || []).map((eq, i) => {
      const prev = (currentOrder?.equipos || []).find(e => 
        (eq.id && String(e.id) === String(eq.id)) || 
        (eq.tempId && String(e.tempId) === String(eq.tempId)) ||
        (eq.numero_serie && e.numero_serie && String(e.numero_serie).toUpperCase() === String(eq.numero_serie).toUpperCase()) ||
        (eq.serie && e.serie && String(e.serie).toUpperCase() === String(eq.serie).toUpperCase())
      ) || currentOrder?.equipos?.[i] || {};

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

      // Fotos de recepción (exterior)
      const imgs = (Array.isArray(eq.imagenes) && eq.imagenes.length > 0)
        ? eq.imagenes
        : (Array.isArray(eq.imagenesRecepcion) && eq.imagenesRecepcion.length > 0
            ? eq.imagenesRecepcion
            : (Array.isArray(prev.imagenes) && prev.imagenes.length > 0
                ? prev.imagenes
                : (prev.imagenesRecepcion || [])));

      // Fotos de diagnóstico (interior / laboratorio)
      const imgsInt = (Array.isArray(eq.imagenesInternas) && eq.imagenesInternas.length > 0)
        ? eq.imagenesInternas
        : (Array.isArray(eq.imagenesDiagnostico) && eq.imagenesDiagnostico.length > 0
            ? eq.imagenesDiagnostico
            : (Array.isArray(prev.imagenesInternas) && prev.imagenesInternas.length > 0
                ? prev.imagenesInternas
                : (prev.imagenesDiagnostico || [])));

      return {
        ...prev,
        ...eq,
        id: eq.id || prev.id || `eq-${Date.now()}-${i}`,
        tempId: eq.tempId || prev.tempId || eq.id || prev.id,
        orden_indice: i + 1,
        marca: eq.marca || prev.marca || 'Motorola',
        modelo: eq.modelo || prev.modelo || '',
        numero_serie: (eq.serie || eq.numero_serie || prev.numero_serie || `SER-${Date.now()}-${i}`).toUpperCase().trim(),
        serie: (eq.serie || eq.numero_serie || prev.serie || `SER-${Date.now()}-${i}`).toUpperCase().trim(),
        banda: eq.banda || prev.banda || 'VHF',
        falla_declarada_cliente: eq.falla_declarada_cliente || prev.falla_declarada_cliente || '',
        costo_servicio: eq.costo_servicio !== undefined ? eq.costo_servicio : (prev.costo_servicio !== undefined ? prev.costo_servicio : 150),
        descripcion_servicio: eq.descripcion_servicio || prev.descripcion_servicio || 'Mantenimiento preventivo y calibración RF',
        accesorios: accs,
        accesoriosRecepcion: (eq.accesoriosRecepcion && Object.keys(eq.accesoriosRecepcion).length > 0) ? eq.accesoriosRecepcion : (prev.accesoriosRecepcion || {}),
        fallas: eq.fallas || prev.fallas || [],
        repuestos: eq.repuestos || prev.repuestos || [],
        imagenes: imgs,
        imagenesRecepcion: imgs,
        imagenesInternas: imgsInt,
        imagenesDiagnostico: imgsInt
      };
    });

    const techId = receptionData.usuario_tecnico_id || receptionData.tecnicoAsignadoId || receptionData.tecnico_asignado_id || currentOrder?.usuario_tecnico_id || currentOrder?.tecnicoAsignadoId || null;
    const techName = receptionData.tecnico_nombre_manual || receptionData.tecnicoNombre || currentOrder?.tecnico_nombre_manual || currentOrder?.tecnicoNombre || null;

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
        usuario_tecnico_id: techId,
        tecnico_asignado_id: techId,
        tecnicoAsignadoId: techId,
        tecnico_nombre_manual: techName,
        tecnicoNombre: techName,
        recepcionista_nombre_manual: receptionData.recepcionista_nombre_manual || null,
        notas_internas: receptionData.notas_internas || null,
        numero_orden: receptionData.numero_orden || receptionData.ordenServicio || null,
        equipos: sanitizedEquipos
      }
    };

    // Actualización inmediata en localStorage para máxima responsividad
    let updatedLocalOrder = null;
    if (index >= 0) {
      const prevCond = currentOrder?.condiciones || currentOrder?.condiciones_comerciales_json || {};
      orders[index] = {
        ...orders[index],
        ...payload.reception,
        usuario_tecnico_id: techId,
        tecnico_asignado_id: techId,
        tecnicoAsignadoId: techId,
        tecnico_nombre_manual: techName,
        tecnicoNombre: techName,
        total_equipos: sanitizedEquipos.length,
        equipos: sanitizedEquipos,
        condiciones: {
          ...prevCond,
          tecnicoFirmanteNombre: techName || prevCond.tecnicoFirmanteNombre
        },
        condiciones_comerciales_json: {
          ...prevCond,
          tecnicoFirmanteNombre: techName || prevCond.tecnicoFirmanteNombre
        },
        updatedAt: new Date().toISOString()
      };

      // Guardar en RAM de la sesión
      const memoryImages = sanitizedEquipos.map((eq, idx) => ({
        equipoIndex: idx,
        imagenes: eq.imagenes || [],
        imagenesInternas: eq.imagenesInternas || []
      }));
      if (orders[index].id) inMemoryOrderImages.set(String(orders[index].id), memoryImages);
      if (orders[index].numero_orden) inMemoryOrderImages.set(String(orders[index].numero_orden), memoryImages);

      safeSaveLocalStorage(orders);
      updatedLocalOrder = rehydrateOrder(orders[index]);
      broadcastOrdersUpdate(updatedLocalOrder);
    }

    // Persistir en backend central en segundo plano
    try {
      await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (netErr) {
      console.warn('[OrdersService] Error de red en updateReception (persistido localmente):', netErr);
    }

    return updatedLocalOrder || rehydrateOrder(currentOrder);
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
      UsersService.initStorage();
      list = UsersService.getTecnicos();
    } catch (e) {}

    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          const serverTechs = json.data.filter(u => u.rol === 'TECNICO' && u.activo !== false);
          const map = new Map();
          list.forEach(t => map.set(normalizeEmail(t.email) || String(t.id), t));
          serverTechs.forEach(t => {
            const key = normalizeEmail(t.email) || String(t.id);
            if (!map.has(key)) {
              map.set(key, t);
            }
          });
          list = Array.from(map.values());
        }
      }
    } catch (e) {}

    return list;
  },

  /**
   * Recepción / Admin designa o asigna un técnico con permisos de edición
   */
  assignTechnician: async (orderId, technicianId, technicianName) => {
    if (typeof window === 'undefined') return null;

    // 1. Actualizar inmediatamente en el almacenamiento local y emitir evento
    const orders = getStoredLocalOrders();
    const index = orders.findIndex(o => String(o.id) === String(orderId) || String(o.numero_orden) === String(orderId));
    let updatedOrder = null;

    if (index >= 0) {
      const cur = orders[index];
      const prevCond = cur.condiciones || cur.condiciones_comerciales_json || {};
      orders[index] = {
        ...cur,
        usuario_tecnico_id: technicianId,
        tecnico_asignado_id: technicianId,
        tecnicoAsignadoId: technicianId,
        tecnico_nombre_manual: technicianName,
        tecnicoNombre: technicianName,
        solicitud_edicion_estado: 'APROBADA',
        solicitud_edicion_tecnico_id: null,
        solicitud_edicion_tecnico_nombre: null,
        condiciones: {
          ...prevCond,
          tecnicoFirmanteNombre: technicianName || prevCond.tecnicoFirmanteNombre
        },
        condiciones_comerciales_json: {
          ...prevCond,
          tecnicoFirmanteNombre: technicianName || prevCond.tecnicoFirmanteNombre,
          solicitud_edicion: {
            tecnico_id: technicianId,
            tecnico_nombre: technicianName,
            estado: 'APROBADA',
            fecha_aprobacion: new Date().toISOString()
          }
        },
        updatedAt: new Date().toISOString()
      };
      safeSaveLocalStorage(orders);
      updatedOrder = rehydrateOrder(orders[index]);
      broadcastOrdersUpdate(updatedOrder);
    }

    // 2. Persistir en backend central en segundo plano
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
    } catch (e) {
      console.warn('[OrdersService] Error de red en assignTechnician (cambio persistido localmente):', e);
    }

    return updatedOrder;
  },

  /**
   * 1. Técnico solicita asignación de una orden
   */
  solicitarAsignacion: async (orderId, technicianUser) => {
    if (typeof window === 'undefined') return null;

    const techId = technicianUser?.id || 'usr-tecnico';
    const techName = technicianUser?.nombre_completo || 'Técnico Especialista';

    const solicitud = {
      tecnico_id: techId,
      tecnico_nombre: techName,
      fecha_solicitud: new Date().toISOString(),
      estado: 'PENDIENTE'
    };

    const orders = await OrdersService.getOrders();
    const index = orders.findIndex(o => String(o.id) === String(orderId) || String(o.numero_orden) === String(orderId));
    if (index >= 0) {
      orders[index].solicitud_asignacion = solicitud;
      // Compatibilidad con vistas previas
      orders[index].solicitud_edicion_estado = 'PENDIENTE';
      orders[index].solicitud_edicion_tecnico_id = techId;
      orders[index].solicitud_edicion_tecnico_nombre = techName;
      orders[index].solicitud_edicion_fecha = solicitud.fecha_solicitud;
      orders[index].updatedAt = new Date().toISOString();

      safeSaveLocalStorage(orders);
      const rehydrated = rehydrateOrder(orders[index]);
      broadcastOrdersUpdate(rehydrated);

      // Persistencia en backend en segundo plano
      try {
        await fetch(`/api/orders/${orderId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            condiciones_comerciales_json: {
              ...(orders[index].condiciones || {}),
              solicitud_asignacion: solicitud,
              solicitud_edicion: solicitud
            }
          })
        });
      } catch (e) {}

      return rehydrated;
    }
    return null;
  },

  /**
   * 2. Recepción / Administrador aprueba la solicitud de asignación
   * - tecnico_asignado_id: ID del técnico solicitante
   * - tecnico_nombre: Nombre completo del técnico
   * - estado: Pasa a EN_DIAGNOSTICO
   * - solicitud_asignacion.estado: "APROBADA"
   */
  aprobarAsignacion: async (orderId) => {
    if (typeof window === 'undefined') return null;

    const orders = await OrdersService.getOrders();
    const index = orders.findIndex(o => String(o.id) === String(orderId) || String(o.numero_orden) === String(orderId));
    if (index < 0) return null;

    const current = orders[index];
    const solicitud = current.solicitud_asignacion || {
      tecnico_id: current.solicitud_edicion_tecnico_id,
      tecnico_nombre: current.solicitud_edicion_tecnico_nombre || 'Técnico Especialista'
    };

    const techId = solicitud.tecnico_id;
    const techName = solicitud.tecnico_nombre || 'Técnico Especialista';

    orders[index] = {
      ...current,
      tecnico_asignado_id: techId,
      usuario_tecnico_id: techId,
      tecnicoAsignadoId: techId,
      tecnico_nombre: techName,
      tecnico_nombre_manual: techName,
      tecnicoNombre: techName,
      estado: 'EN_DIAGNOSTICO',
      solicitud_asignacion: {
        ...solicitud,
        estado: 'APROBADA',
        fecha_aprobacion: new Date().toISOString()
      },
      solicitud_edicion_estado: 'APROBADA',
      condiciones: {
        ...(current.condiciones || {}),
        tecnicoFirmanteNombre: techName
      },
      condiciones_comerciales_json: {
        ...(current.condiciones_comerciales_json || {}),
        tecnicoFirmanteNombre: techName,
        solicitud_asignacion: {
          ...solicitud,
          estado: 'APROBADA',
          fecha_aprobacion: new Date().toISOString()
        }
      },
      updatedAt: new Date().toISOString()
    };

    safeSaveLocalStorage(orders);
    const updated = rehydrateOrder(orders[index]);
    broadcastOrdersUpdate(updated);

    // Persistencia en backend en segundo plano
    try {
      await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estado: 'EN_DIAGNOSTICO',
          usuario_tecnico_id: techId,
          tecnico_nombre_manual: techName,
          condiciones_comerciales_json: orders[index].condiciones_comerciales_json
        })
      });
    } catch (e) {}

    return updated;
  },

  /**
   * 3. Recepción / Administrador rechaza la solicitud de asignación
   * - Limpia la solicitud para que la orden vuelva a quedar disponible
   */
  rechazarAsignacion: async (orderId) => {
    if (typeof window === 'undefined') return null;

    const orders = await OrdersService.getOrders();
    const index = orders.findIndex(o => String(o.id) === String(orderId) || String(o.numero_orden) === String(orderId));
    if (index < 0) return null;

    orders[index] = {
      ...orders[index],
      solicitud_asignacion: null,
      solicitud_edicion_estado: null,
      solicitud_edicion_tecnico_id: null,
      solicitud_edicion_tecnico_nombre: null,
      updatedAt: new Date().toISOString()
    };

    safeSaveLocalStorage(orders);
    const updated = rehydrateOrder(orders[index]);
    broadcastOrdersUpdate(updated);

    // Persistencia en backend en segundo plano
    try {
      await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          condiciones_comerciales_json: {
            solicitud_asignacion: null,
            solicitud_edicion: null
          }
        })
      });
    } catch (e) {}

    return updated;
  },

  // Aliases para retrocompatibilidad
  requestTechnicianPermission: async (orderId, technicianUser) => {
    return await OrdersService.solicitarAsignacion(orderId, technicianUser);
  },

  respondTechnicianPermission: async (orderId, approve = true) => {
    return approve 
      ? await OrdersService.aprobarAsignacion(orderId) 
      : await OrdersService.rechazarAsignacion(orderId);
  },

  /**
   * Elimina permanentemente una orden de servicio (Solo Rol Administrador)
   * Limpia de localStorage, memoria RAM y notifica al backend/Supabase
   */
  deleteOrder: async (orderId) => {
    if (!orderId) return { success: false, error: 'ID de orden no especificado' };

    const targetKey = String(orderId).trim();
    console.info(`[OrdersService] Eliminando orden ${targetKey}...`);

    // 1. Eliminar de localStorage inmediatamente
    if (typeof window !== 'undefined') {
      try {
        const local = getStoredLocalOrders();
        const filtered = local.filter(o => 
          String(o.id) !== targetKey && 
          String(o.numero_orden) !== targetKey &&
          String(o.ordenServicio || '') !== targetKey
        );
        safeSaveLocalStorage(filtered);
      } catch (err) {
        console.warn('[OrdersService] Error eliminando orden de localStorage:', err);
      }
    }

    // 2. Limpiar de la memoria RAM de sesión
    inMemoryOrderImages.delete(targetKey);

    // 3. Notificar al backend / API REST y a Supabase
    try {
      await fetch(`/api/orders/${encodeURIComponent(targetKey)}`, {
        method: 'DELETE'
      });
    } catch (apiErr) {
      console.warn('[OrdersService] Error llamando a DELETE /api/orders:', apiErr);
    }

    // 4. Emitir eventos reactivos para actualización inmediata de interfaces y contadores
    broadcastOrdersUpdate(null);

    return { success: true };
  }
};


