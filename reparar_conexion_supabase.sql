-- ============================================================================
-- SISTEMA AMÉRICA — SCRIPT DEFINITIVO DE REPARACIÓN Y PERMISOS SUPABASE
-- Ejecutar este script en el SQL Editor de Supabase (https://supabase.com)
-- ============================================================================
-- Este script:
-- 1. Desactiva Row Level Security (RLS) en todas las tablas para permitir
--    guardar y consultar órdenes, clientes, evidencias y diagnósticos sin errores 42501.
-- 2. Concede permisos completos a los roles anon y authenticated.
-- 3. Crea tablas de catálogos y auditoría si no existían.
-- 4. Registra la Sucursal Central, el Cliente Base (Consumidor Final) y los 3
--    usuarios oficiales del taller (admin, tecnico, recepcion - Clave: America2026!).
-- 5. Pobla los catálogos oficiales de 10 accesorios y 22 fallas de placa RF.
-- 6. Configura el Storage Bucket público 'evidencias-radios' para fotos de WhatsApp.
-- ============================================================================

-- A. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- B. CREACIÓN DE TABLAS DE CATÁLOGOS SI NO EXISTEN
CREATE TABLE IF NOT EXISTS catalogo_accesorios_recepcion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(80) UNIQUE NOT NULL,
    repuesto_sugerido_defecto VARCHAR(120),
    es_sistema BOOLEAN NOT NULL DEFAULT true,
    orden_visual INT NOT NULL DEFAULT 100,
    activo BOOLEAN NOT NULL DEFAULT true,
    creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS catalogo_fallas_placa (
    codigo VARCHAR(80) PRIMARY KEY,
    categoria VARCHAR(30) NOT NULL DEFAULT 'TX',
    label VARCHAR(120) NOT NULL,
    descripcion TEXT,
    es_sistema BOOLEAN NOT NULL DEFAULT false,
    activo BOOLEAN NOT NULL DEFAULT true,
    creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS auditoria_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orden_id UUID,
    equipo_id UUID,
    usuario_id UUID,
    usuario_nombre VARCHAR(120) NOT NULL DEFAULT 'Operador del Sistema',
    usuario_rol VARCHAR(40),
    accion VARCHAR(60) NOT NULL,
    estado_anterior VARCHAR(40),
    estado_nuevo VARCHAR(40),
    detalle_cambio TEXT,
    ip_origen VARCHAR(45),
    fecha_evento TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- C. DESACTIVAR RLS EN TODAS LAS TABLAS DEL SISTEMA (Elimina el error 42501 Unauthorized)
ALTER TABLE IF EXISTS sucursales DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS usuarios DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS clientes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS equipos_maestro DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ordenes_servicio DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS orden_equipos DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS equipo_accesorios_recepcion DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS equipo_fallas DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS equipo_repuestos_cotizados DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS equipo_evidencias DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS auditoria_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS catalogo_accesorios_recepcion DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS catalogo_fallas_placa DISABLE ROW LEVEL SECURITY;

-- D. POLÍTICAS ABIERTAS COMO DOBLE PROTECCIÓN EN CASO DE REACTIVACIÓN RLS
DO $$ 
DECLARE
    tbl text;
    tables text[] := ARRAY[
      'sucursales', 'usuarios', 'clientes', 'equipos_maestro', 
      'ordenes_servicio', 'orden_equipos', 'equipo_accesorios_recepcion', 
      'equipo_fallas', 'equipo_repuestos_cotizados', 'equipo_evidencias', 
      'auditoria_logs', 'catalogo_accesorios_recepcion', 'catalogo_fallas_placa'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Permitir_todo_anon_%s" ON %I;', tbl, tbl);
        EXECUTE format('CREATE POLICY "Permitir_todo_anon_%s" ON %I FOR ALL USING (true) WITH CHECK (true);', tbl, tbl);
    END LOOP;
END $$;

-- E. CONCEDER TODOS LOS PRIVILEGIOS AL SCHEMA PUBLIC PARA CLIENTES REST Y DOCKER
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- F. SUCURSAL BASE CENTRAL
INSERT INTO sucursales (id, nombre, ciudad, direccion, telefono, activo)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'Sucursal Central - La Paz',
    'La Paz',
    'Av. 16 de Julio, Edif. América',
    '+591 2 2441122',
    true
)
ON CONFLICT (id) DO UPDATE 
SET 
    nombre = EXCLUDED.nombre,
    ciudad = EXCLUDED.ciudad,
    direccion = EXCLUDED.direccion,
    telefono = EXCLUDED.telefono,
    activo = true;

-- G. CLIENTE BASE POR DEFECTO (Consumidor Final / Mostrador General)
INSERT INTO clientes (id, razon_social, nit_ci, telefono, direccion, ciudad)
VALUES (
    'c0000000-0000-0000-0000-000000000001',
    'Consumidor Final',
    '0',
    '+591 2 2441122',
    'Mostrador Central',
    'La Paz'
)
ON CONFLICT (id) DO UPDATE 
SET 
    razon_social = EXCLUDED.razon_social,
    telefono = EXCLUDED.telefono;

-- H. USUARIOS OFICIALES DEL SISTEMA (Contraseña: America2026!)
-- Hash bcrypt 10 rounds: $2b$10$0VYKfuMtSx.k6FGWQ.5mEu61FLzQCktOax6RQfXxdUcKfHeLB7h66
INSERT INTO usuarios (id, sucursal_id, nombre_completo, email, password_hash, rol, cargo_titulo, activo, token_version)
VALUES 
    (
        'b0000000-0000-0000-0000-000000000001',
        'a0000000-0000-0000-0000-000000000001',
        'Administrador General',
        'admin',
        '$2b$10$0VYKfuMtSx.k6FGWQ.5mEu61FLzQCktOax6RQfXxdUcKfHeLB7h66',
        'ADMINISTRADOR',
        'Gerencia de Operaciones',
        true,
        1
    ),
    (
        'b0000000-0000-0000-0000-000000000002',
        'a0000000-0000-0000-0000-000000000001',
        'Roberto Gómez (Técnico RF)',
        'tecnico',
        '$2b$10$0VYKfuMtSx.k6FGWQ.5mEu61FLzQCktOax6RQfXxdUcKfHeLB7h66',
        'TECNICO',
        'Técnico Especialista en Radiofrecuencia',
        true,
        1
    ),
    (
        'b0000000-0000-0000-0000-000000000003',
        'a0000000-0000-0000-0000-000000000001',
        'Ana Morales (Recepción)',
        'recepcion',
        '$2b$10$0VYKfuMtSx.k6FGWQ.5mEu61FLzQCktOax6RQfXxdUcKfHeLB7h66',
        'RECEPCION',
        'Atención y Mostrador Comercial',
        true,
        1
    )
ON CONFLICT (id) DO UPDATE 
SET 
    nombre_completo = EXCLUDED.nombre_completo,
    email = EXCLUDED.email,
    password_hash = EXCLUDED.password_hash,
    rol = EXCLUDED.rol,
    cargo_titulo = EXCLUDED.cargo_titulo,
    activo = true,
    token_version = 1;

-- I. CATÁLOGO OFICIAL DE ACCESORIOS DE RECEPCIÓN
INSERT INTO catalogo_accesorios_recepcion (nombre, repuesto_sugerido_defecto, es_sistema, orden_visual, activo)
VALUES 
    ('Antena', 'Antena Heliflex Original VHF/UHF', true, 1, true),
    ('Batería', 'Batería Li-ion PMNN4077 / NNTN4497', true, 2, true),
    ('Cargador completo', 'Cargador de Escritorio Rápido Completo', true, 3, true),
    ('Clip de cinturón', 'Clip de Cinturón Original Motorola', true, 4, true),
    ('Micrófono externo', 'Micrófono de Solapa Remoto PMMN4013', true, 5, true),
    ('Adaptador', 'Adaptador / Transformador 220V', true, 6, true),
    ('Base de cargador', 'Cuna de Carga Rápida', true, 7, true),
    ('Micrófono de radio', 'Micrófono de Mano Estándar', true, 8, true),
    ('Cable de alimentación', 'Cable de Poder DC con Fusible', true, 9, true),
    ('Fuente de poder', 'Fuente de Poder Regulada 13.8V', true, 10, true),
    ('Otros', 'Accesorio Especial Adicional', true, 99, true)
ON CONFLICT (nombre) DO UPDATE 
SET 
    repuesto_sugerido_defecto = EXCLUDED.repuesto_sugerido_defecto,
    es_sistema = EXCLUDED.es_sistema,
    orden_visual = EXCLUDED.orden_visual,
    activo = true;

-- J. CATÁLOGO DE 22 FALLAS TÉCNICAS DE PLACA RF
INSERT INTO catalogo_fallas_placa (codigo, categoria, label, descripcion, es_sistema, activo)
VALUES 
    -- Transmisión (TX)
    ('ETAPA_TX', 'TX', 'Etapa TX Inoperativa', 'Circuito transmisor sin emisión de portadora RF', true, true),
    ('MODULO_POTENCIA', 'TX', 'Módulo P.A. Degradado', 'Potencia baja (<1.5 Watts) o transistores finales dañados', true, true),
    ('FRECUENCIA_DESPLAZADA', 'TX', 'Frecuencia Desplazada', 'Oscilador descalibrado, error de frecuencia > 500 Hz', true, true),
    ('DISTORSION_TX', 'TX', 'Modulación TX Distorsionada', 'Audio recortado o sobremodulación por desviador defectuoso', true, true),
    ('PTT_SWITCH', 'TX', 'Pulsador PTT Roto', 'Microswitch lateral no conmuta a transmisión', true, true),

    -- Recepción (RX)
    ('ETAPA_RX', 'RX', 'Etapa RX Sorda / Débil', 'Sensibilidad degradada, no recibe señales lejanas', true, true),
    ('SQUELCH_ABIERTO', 'RX', 'Squelch Abierto Permanente', 'Ruido blanco constante sin silenciamiento', true, true),
    ('DIODO_RX', 'RX', 'Diodo PIN RX en Corto', 'Diodo de conmutación quemado por exceso de RF', true, true),
    ('FILTRO_FI', 'RX', 'Filtro FI Descalibrado', 'Filtro cerámico de 455 kHz cristalizado con pérdida', true, true),

    -- Audio y Microfonía
    ('CHIP_AUDIO', 'AUDIO', 'Amplificador Audio Mudo', 'Sin salida al altavoz, chip BTL o capacitor en corto', true, true),
    ('PARLANTE_ROTO', 'AUDIO', 'Cono de Parlante Roto', 'Membrana perforada o bobina abierta / raspando', true, true),
    ('MIC_INTERNO', 'AUDIO', 'Micrófono Electret Inoperativo', 'Cápsula de micrófono interno muda o con falso contacto', true, true),
    ('POTENCIOMETRO_VOL', 'AUDIO', 'Potenciómetro Volumen Falso', 'Pistas resistivas desgastadas o eje quebrado', true, true),
    ('SELECTOR_CANALES', 'AUDIO', 'Selector Canales Desgastado', 'Encoder rotativo salta canales o gira libre', true, true),

    -- Alimentación y Batería
    ('NO_ENCIENDE', 'ALIMENTACION', 'Equipo No Enciende', 'Consumo cero o cortocircuito directo en fuente DC', true, true),
    ('BORNES_BATERIA', 'ALIMENTACION', 'Terminales Batería Sulfatados', 'Contactos dorados deformados o con corrosión', true, true),
    ('SE_APAGA_PTT', 'ALIMENTACION', 'Se Apaga al Transmitir', 'Caída brusca de voltaje por alta resistencia interna', true, true),

    -- Lógica y Pantalla
    ('PANTALLA_LCD', 'LOGICA', 'Display LCD Roto', 'Segmentos faltantes o cristal líquido derramado', true, true),
    ('FIRMWARE_CODEPLUG', 'LOGICA', 'Corrupción de Codeplug', 'Error de memoria EEPROM o microcontrolador bloqueado', true, true),

    -- Chasis y Conectores
    ('ENTRADA_HUMEDAD', 'CHASIS', 'Ingreso Humedad / Sulfato', 'Placa con óxido de cobre y residuos minerales', true, true),
    ('CONECTOR_SMA', 'CHASIS', 'Conector Antena Quebrado', 'Pin central SMA o rosca arrancada de la placa', true, true),
    ('CARCASA_FRACTURADA', 'CHASIS', 'Carcasa Frontal Rajada', 'Sellos de protección IP54/IP67 comprometidos', true, true)
ON CONFLICT (codigo) DO UPDATE 
SET 
    categoria = EXCLUDED.categoria,
    label = EXCLUDED.label,
    descripcion = EXCLUDED.descripcion,
    es_sistema = EXCLUDED.es_sistema,
    activo = true;

-- K. BUCKET DE EVIDENCIAS FOTOGRÁFICAS EN STORAGE
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES (
            'evidencias-radios', 
            'evidencias-radios', 
            true, 
            10485760,
            ARRAY['image/webp', 'image/jpeg', 'image/png', 'image/jpg']
        )
        ON CONFLICT (id) DO UPDATE SET 
            public = true,
            file_size_limit = 10485760,
            allowed_mime_types = ARRAY['image/webp', 'image/jpeg', 'image/png', 'image/jpg'];

        DROP POLICY IF EXISTS "Publico_lectura_evidencias_radios" ON storage.objects;
        CREATE POLICY "Publico_lectura_evidencias_radios" ON storage.objects FOR SELECT USING (bucket_id = 'evidencias-radios');

        DROP POLICY IF EXISTS "Publico_subida_evidencias_radios" ON storage.objects;
        CREATE POLICY "Publico_subida_evidencias_radios" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'evidencias-radios');

        DROP POLICY IF EXISTS "Publico_modificacion_evidencias_radios" ON storage.objects;
        CREATE POLICY "Publico_modificacion_evidencias_radios" ON storage.objects FOR UPDATE USING (bucket_id = 'evidencias-radios');

        DROP POLICY IF EXISTS "Publico_eliminacion_evidencias_radios" ON storage.objects;
        CREATE POLICY "Publico_eliminacion_evidencias_radios" ON storage.objects FOR DELETE USING (bucket_id = 'evidencias-radios');
    END IF;
EXCEPTION WHEN OTHERS THEN null; END $$;

-- L. VERIFICACIÓN FINAL
SELECT 'sucursales' AS tabla, COUNT(*) AS total FROM sucursales
UNION ALL
SELECT 'usuarios', COUNT(*) FROM usuarios
UNION ALL
SELECT 'clientes', COUNT(*) FROM clientes
UNION ALL
SELECT 'catalogo_accesorios_recepcion', COUNT(*) FROM catalogo_accesorios_recepcion
UNION ALL
SELECT 'catalogo_fallas_placa', COUNT(*) FROM catalogo_fallas_placa
UNION ALL
SELECT 'ordenes_servicio', COUNT(*) FROM ordenes_servicio;
