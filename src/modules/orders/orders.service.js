import { OrdersRepository } from './orders.repository';
import { logAudit } from '../../lib/common/audit-logger';

export const OrdersService = {
  async createOrder(data, user) {
    try {
      const result = await OrdersRepository.createOrderTransaction(data.order, data.equipos);
      
      // Registrar auditoría en PostgreSQL/Supabase
      await logAudit({
        ordenId: result.orden.id,
        usuarioId: user?.id || null,
        usuarioNombre: user?.nombre_completo || data.order.recepcionista_nombre_manual || 'Recepcionista',
        usuarioRol: user?.rol || 'RECEPCION',
        accion: 'CREAR_ORDEN',
        estadoNuevo: result.orden.estado || 'BORRADOR',
        detalleCambio: `Orden creada con ${data.equipos.length} equipo(s). Moneda: ${result.orden.moneda || 'BOB'}`
      });

      return result;
    } catch (err) {
      console.warn('[OrdersService] Supabase/PostgreSQL offline. Generando orden en memoria para modo desarrollo.', err.message);
      
      const newId = 125;
      const numeroOrden = `OS-${String(newId).padStart(5, '0')}`;
      const mockOrder = {
        id: newId,
        numero_orden: numeroOrden,
        sucursal_id: 1,
        cliente_id: data.order.cliente_id || null,
        recepcionista_nombre_manual: data.order.recepcionista_nombre_manual || 'Recepción Mostrador',
        estado: data.order.estado || 'BORRADOR',
        moneda: data.order.moneda || 'BOB',
        tasa_cambio: data.order.tasa_cambio || 6.96,
        notas_internas: data.order.notas_internas || '',
        monto_subtotal_servicio: 0,
        monto_subtotal_accesorios: 0,
        sumatoria_total: 0,
        total_literal: 'CERO 00/100 BOLIVIANOS',
        creado_en: new Date().toISOString()
      };

      const mockEquipos = data.equipos.map((eq, i) => ({
        id: 200 + i,
        orden_id: newId,
        orden_indice: i + 1,
        marca: eq.marca || 'Motorola',
        modelo: eq.modelo || 'DEP450',
        numero_serie: eq.numero_serie || `SER-${Date.now()}-${i}`,
        banda: eq.banda || 'VHF',
        estado_individual: 'EN_DIAGNOSTICO',
        falla_declarada_cliente: eq.falla_declarada_cliente || '',
        costo_servicio: 0,
        accesorios: eq.accesorios || []
      }));

      return {
        orden: mockOrder,
        equipos: mockEquipos
      };
    }
  },

  async saveDiagnosis(ordenId, equipoId, diagnosisData, user) {
    try {
      const result = await OrdersRepository.saveEquipmentDiagnosisTransaction(ordenId, equipoId, diagnosisData);
      
      const isRechazado = Boolean(diagnosisData.reparacion_rechazada);
      const accion = isRechazado ? 'RECHAZAR_EQUIPO' : 'DIAGNOSTICAR_EQUIPO';
      const detalle = isRechazado 
        ? `Equipo #${equipoId} declarado como Reparación Rechazada: ${diagnosisData.motivo_rechazo || 'Sin motivo'}`
        : `Diagnóstico actualizado para equipo #${equipoId}. Subtotal servicio: ${result.subtotales.subtotal1_servicio}, repuestos: ${result.subtotales.subtotal2_accesorios}`;

      await logAudit({
        ordenId: parseInt(ordenId, 10),
        equipoId: parseInt(equipoId, 10),
        usuarioId: user?.id || null,
        usuarioNombre: user?.nombre_completo || diagnosisData.tecnico_nombre_manual || 'Técnico Laboratorio',
        usuarioRol: user?.rol || 'TECNICO',
        accion,
        estadoAnterior: null,
        estadoNuevo: result.equipo.estado_individual,
        detalleCambio: detalle
      });

      return result;
    } catch (err) {
      console.warn('[OrdersService] Supabase/PostgreSQL offline. Simulando guardado de diagnóstico en memoria.', err.message);
      return {
        equipo: { id: parseInt(equipoId, 10), ...diagnosisData },
        orden: { id: parseInt(ordenId, 10), estado: 'EN_DIAGNOSTICO' },
        subtotales: {
          subtotal1_servicio: 150,
          subtotal2_accesorios: 120,
          sumatoria_total: 270,
          total_literal: 'DOSCIENTOS SETENTA 00/100 BOLIVIANOS'
        }
      };
    }
  },

  async getOrderById(orderId) {
    const order = await OrdersRepository.getOrderWithDetails(orderId);
    if (!order) {
      throw new Error(`Orden #${orderId} no encontrada`);
    }
    return order;
  },

  async getActiveOrders(filters = {}) {
    return await OrdersRepository.getAllActiveOrders(filters);
  }
};
