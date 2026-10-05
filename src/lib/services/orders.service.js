/**
 * Servicio Centralizado de Persistencia de Órdenes
 * Sistema América — Radio Service ERP
 * 
 * Conexión prioritaria con API backend (PostgreSQL / Supabase)
 * con fallback y sincronización en almacenamiento local del cliente.
 */

const STORAGE_KEY = 'america_orders_db';

const INITIAL_DEMO_ORDERS = [];

export const OrdersService = {
  /**
   * Obtiene todas las órdenes, consultando la base de datos a través de la API
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
            localStorage.setItem(STORAGE_KEY, JSON.stringify(result.data));
            return result.data;
          }
        }
      } catch (apiErr) {
        // En caso de estar offline, continuar al almacenamiento local
      }

      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return [];

      const parsed = JSON.parse(saved);
      // Purgar inmediatamente órdenes de demostración antiguas de la memoria local
      if (Array.isArray(parsed) && parsed.some(o => o.id === '101' || o.id === '102' || o.id === '103' || o.numero_orden === 'OS-80412')) {
        localStorage.removeItem(STORAGE_KEY);
        return [];
      }
      return Array.isArray(parsed) ? parsed : [];
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
          return result.data;
        }
      }
    } catch (e) {}

    const orders = await OrdersService.getOrders();
    return orders.find(o => String(o.id) === String(id) || String(o.numero_orden) === String(id)) || null;
  },

  /**
   * Guarda o actualiza una orden de servicio
   */
  saveOrder: async (data) => {
    if (typeof window === 'undefined') return null;
    const now = new Date().toISOString();

    // Intentar persistir en PostgreSQL / Supabase
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order: {
            sucursal_id: data.sucursal_id || 'a0000000-0000-0000-0000-000000000001',
            cliente_id: data.cliente_id || null,
            recepcionista_nombre_manual: data.recepcionista_nombre_manual || 'Recepción Mostrador',
            estado: data.estado || 'RECIBIDO',
            moneda: data.moneda || 'BOB',
            tasa_cambio: data.tasa_cambio || 6.96,
            notas_internas: data.notas_internas || null,
          },
          equipos: (data.equipos || []).map(eq => ({
            marca: eq.marca || 'Motorola',
            modelo: eq.modelo || '',
            numero_serie: eq.serie || eq.numero_serie || '',
            banda: eq.banda || 'VHF',
            falla_declarada_cliente: eq.falla_declarada_cliente || '',
            costo_servicio: eq.costo_servicio || 0,
            accesorios: eq.accesorios || []
          }))
        })
      });
      if (res.ok) {
        const result = await res.json();
        if (result.success && result.data?.orden) {
          await OrdersService.getOrders();
          return result.data.orden;
        }
      }
    } catch (e) {}

    const orders = await OrdersService.getOrders();
    let orderToSave = { ...data, updatedAt: now };

    // Si es nueva orden en fallback
    if (!orderToSave.id) {
      orderToSave.id = Date.now().toString();
      orderToSave.numero_orden = orderToSave.numero_orden || `OS-${Math.floor(Math.random() * 90000) + 10000}`;
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
        orders[index] = orderToSave;
      }
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
    return orderToSave;
  },

  updateOrderStatus: async (id, status) => {
    if (typeof window === 'undefined') return null;
    const orders = await OrdersService.getOrders();
    const index = orders.findIndex(o => String(o.id) === String(id));
    if (index >= 0) {
      orders[index].estado = status;
      orders[index].estado_global = status;
      orders[index].updatedAt = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
      return orders[index];
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
      return orders[index];
    }
    return null;
  },

  /**
   * Guarda el presupuesto económico y transiciona a COTIZADO
   */
  saveBudget: async (id, { moneda, equipos, condiciones, sumatoria_total }) => {
    if (typeof window === 'undefined') return null;
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
      return orders[index];
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
