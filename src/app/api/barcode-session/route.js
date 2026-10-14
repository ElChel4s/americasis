import { NextResponse } from 'next/server';

// Almacenamiento en memoria volátil para sesiones activas de escaneo móvil
// Estructura: Map<sessionId, { code: string, format: string, timestamp: number }>
const barcodeSessions = new Map();

// Limpieza periódica de sesiones mayores a 30 minutos
setInterval(() => {
  const now = Date.now();
  for (const [id, data] of barcodeSessions.entries()) {
    if (now - data.timestamp > 30 * 60 * 1000) {
      barcodeSessions.delete(id);
    }
  }
}, 5 * 60 * 1000);

export async function POST(request) {
  try {
    const body = await request.json();
    const { sessionId, code, format = 'BARCODE' } = body;

    if (!sessionId || !code) {
      return NextResponse.json(
        { success: false, message: 'Se requiere sessionId y code' },
        { status: 400 }
      );
    }

    const cleanCode = String(code).trim().toUpperCase();

    barcodeSessions.set(sessionId, {
      code: cleanCode,
      format,
      timestamp: Date.now()
    });

    return NextResponse.json({
      success: true,
      message: 'Código de barras recibido correctamente',
      data: { sessionId, code: cleanCode }
    });
  } catch (error) {
    console.error('Error en POST /api/barcode-session:', error);
    return NextResponse.json(
      { success: false, message: 'Error procesando código de barras' },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const clear = searchParams.get('clear') === 'true';

    if (!sessionId) {
      return NextResponse.json(
        { success: false, message: 'Falta parámetro sessionId' },
        { status: 400 }
      );
    }

    const sessionData = barcodeSessions.get(sessionId);

    if (!sessionData || !sessionData.code) {
      return NextResponse.json({
        success: true,
        scanned: false,
        code: null
      });
    }

    const result = {
      success: true,
      scanned: true,
      code: sessionData.code,
      format: sessionData.format,
      timestamp: sessionData.timestamp
    };

    if (clear) {
      // Consumir el código para que no se vuelva a leer en el siguiente polling
      barcodeSessions.delete(sessionId);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error en GET /api/barcode-session:', error);
    return NextResponse.json(
      { success: false, message: 'Error consultando sesión de escáner' },
      { status: 500 }
    );
  }
}
