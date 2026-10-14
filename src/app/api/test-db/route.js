import { NextResponse } from 'next/server';
import { supabase } from '@/lib/config/supabase-client';
import { pool } from '@/lib/config/database';

export const dynamic = 'force-dynamic';

export async function GET() {
  const diagnostic = {
    timestamp: new Date().toISOString(),
    supabase: {
      configured: Boolean(supabase),
      url: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'No configurada',
      results: {}
    },
    postgresPool: {
      url: (process.env.DATABASE_URL || '').replace(/:[^:@]+@/, ':****@'),
      connected: false,
      error: null
    }
  };

  // 1. Probar Supabase Client
  if (supabase) {
    try {
      // Probar lectura de usuarios
      const { data: users, count: userCount, error: userErr } = await supabase
        .from('usuarios')
        .select('id, email, rol', { count: 'exact' })
        .limit(5);

      diagnostic.supabase.results.usuarios = {
        success: !userErr,
        count: userCount,
        sample: users || [],
        error: userErr ? userErr.message : null
      };

      // Probar lectura de órdenes
      const { data: orders, count: orderCount, error: orderErr } = await supabase
        .from('ordenes_servicio')
        .select('id, numero_orden, estado, creado_en', { count: 'exact' })
        .limit(5);

      diagnostic.supabase.results.ordenes_servicio = {
        success: !orderErr,
        count: orderCount,
        sample: orders || [],
        error: orderErr ? orderErr.message : null
      };

      // Probar lectura de sucursales
      const { data: sucursales, error: sucErr } = await supabase
        .from('sucursales')
        .select('id, nombre')
        .limit(2);

      diagnostic.supabase.results.sucursales = {
        success: !sucErr,
        sample: sucursales || [],
        error: sucErr ? sucErr.message : null
      };

      // Obtener o crear un cliente de prueba
      let testClientId = null;
      const { data: existingClients } = await supabase.from('clientes').select('id, razon_social').limit(1);
      if (existingClients && existingClients.length > 0) {
        testClientId = existingClients[0].id;
      } else {
        const { data: createdClient } = await supabase.from('clientes').insert({
          razon_social: 'Cliente Prueba Supabase S.R.L.',
          telefono: '77712345',
          nit_ci: '10203040'
        }).select('id').single();
        testClientId = createdClient?.id;
      }

      // Probar inserción completa vía OrdersRepository (Orden + Equipos + Accesorios)
      const sucId = sucursales?.[0]?.id || 'a0000000-0000-0000-0000-000000000001';
      const { OrdersRepository } = await import('@/modules/orders/orders.repository');
      const testOrderPayload = {
        sucursal_id: sucId,
        cliente_id: testClientId,
        razon_social: 'Cliente Verificación Supabase',
        recepcionista_nombre_manual: 'Test Script',
        estado: 'RECIBIDO',
        moneda: 'BOB',
        tasa_cambio: 6.96
      };
      const testEquiposPayload = [
        {
          marca: 'Motorola',
          modelo: 'DEP450',
          numero_serie: `TEST-${Date.now()}`,
          banda: 'VHF',
          falla_declarada_cliente: 'Prueba de inserción en base de datos Supabase',
          costo_servicio: 0,
          accesorios: [
            { accesorio_nombre: 'Antena', presencia: 'CON' },
            { accesorio_nombre: 'Batería', presencia: 'CON' }
          ]
        }
      ];

      const fullInsertResult = await OrdersRepository.createOrderTransaction(testOrderPayload, testEquiposPayload);

      diagnostic.supabase.results.pruebaOrdenCompleta = {
        success: Boolean(fullInsertResult?.orden?.id),
        ordenId: fullInsertResult?.orden?.id,
        numeroOrden: fullInsertResult?.orden?.numero_orden,
        equiposInsertados: fullInsertResult?.equipos?.length || 0,
        estado: fullInsertResult?.orden?.estado
      };

      // Verificar lectura inmediata desde Supabase
      if (fullInsertResult?.orden?.id) {
        const { data: readOrder } = await supabase
          .from('ordenes_servicio')
          .select('id, numero_orden, estado, total_literal')
          .eq('id', fullInsertResult.orden.id)
          .single();

        const { data: readEquipos } = await supabase
          .from('orden_equipos')
          .select('id, orden_id, numero_serie, marca, modelo, falla_declarada_cliente')
          .eq('orden_id', fullInsertResult.orden.id);

        diagnostic.supabase.results.verificacionLecturaSupabase = {
          ordenConfirmada: Boolean(readOrder),
          orden: readOrder,
          equiposConfirmados: readEquipos?.length || 0,
          equipos: readEquipos || []
        };

        diagnostic.supabase.results.nota = "¡Orden y Equipos registrados y verificados con éxito en Supabase Cloud!";
      }

    } catch (e) {
      diagnostic.supabase.results.exception = e.message;
    }
  }

  // 2. Probar PostgreSQL Pool si es accesible
  try {
    const client = await pool.connect();
    const res = await client.query('SELECT NOW() as hora_bd, current_database() as bd');
    diagnostic.postgresPool.connected = true;
    diagnostic.postgresPool.dbName = res.rows[0]?.bd;
    diagnostic.postgresPool.serverTime = res.rows[0]?.hora_bd;
    client.release();
  } catch (pgErr) {
    diagnostic.postgresPool.connected = false;
    diagnostic.postgresPool.error = pgErr.message;
  }

  return NextResponse.json(diagnostic);
}
