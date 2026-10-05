import { NextResponse } from 'next/server';
import { DocxGenerator } from '@/modules/reports/docx-generator';
import { OrdersService } from '@/modules/orders/orders.service';

export async function POST(request) {
  try {
    const body = await request.json();
    let orden = body.orden;
    let equipos = body.equipos;

    if (body.orden_id && (!orden || !equipos)) {
      const fullOrder = await OrdersService.getOrderById(body.orden_id);
      orden = fullOrder;
      equipos = fullOrder.equipos || [];
    }

    if (!orden) {
      orden = {
        numero_orden: body.numero_orden || 'PROV',
        razon_social: body.cliente || 'CLIENTE GENERAL',
        creado_en: new Date(),
        moneda: body.moneda || 'BOB',
        sumatoria_total: body.sumatoria_total || 0,
      };
    }

    if (!equipos) {
      equipos = [];
    }

    const buffer = await DocxGenerator.generateOrderReport(orden, equipos);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="informe_tecnico_OS_${orden.numero_orden || 'draft'}.docx"`,
      },
    });
  } catch (error) {
    console.error('Error generando DOCX:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const ordenId = searchParams.get('ordenId') || searchParams.get('id');

    if (!ordenId) {
      return NextResponse.json({ success: false, message: 'Parámetro ordenId requerido' }, { status: 400 });
    }

    const fullOrder = await OrdersService.getOrderById(ordenId);
    if (!fullOrder) {
      return NextResponse.json({ success: false, message: 'Orden no encontrada' }, { status: 404 });
    }

    const buffer = await DocxGenerator.generateOrderReport(fullOrder, fullOrder.equipos || []);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="informe_tecnico_${fullOrder.numero_orden || 'OS'}.docx"`,
      },
    });
  } catch (error) {
    console.error('Error generando DOCX en GET:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
