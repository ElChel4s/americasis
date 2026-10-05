-- ============================================================================
-- SISTEMA AMÉRICA — SCRIPT DEFINITIVO DE LIMPIEZA TOTAL Y SEMILLAS
-- Vaciado garantizado de datos operativos en orden de dependencias.
-- Conserva y actualiza: Sucursal, Catálogos y Usuarios Oficiales.
-- ============================================================================

-- 1. VACIADO DE TABLAS HIJAS Y OPERATIVAS (EN ORDEN ESTRICTO DE DEPENDENCIAS)
DELETE FROM auditoria_logs;
DELETE FROM equipo_evidencias;
DELETE FROM equipo_repuestos_cotizados;
DELETE FROM equipo_fallas;
DELETE FROM equipo_accesorios_recepcion;
DELETE FROM orden_equipos;
DELETE FROM ordenes_servicio;
DELETE FROM equipos_maestro;
DELETE FROM clientes;
DELETE FROM usuarios;

-- 2. REINICIAR CONTADOR CORRELATIVO DE ÓRDENES (Para que la siguiente sea OS-00001)
ALTER SEQUENCE IF EXISTS ordenes_servicio_secuencia_num_seq RESTART WITH 1;

-- 3. SUCURSAL BASE CENTRAL
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
    activo = EXCLUDED.activo;

-- 4. USUARIOS OFICIALES DEL SISTEMA (LOGIN CON USUARIOS CORTOS)
-- Contraseña para los 3 usuarios: America2026!
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
    activo = EXCLUDED.activo,
    token_version = 1;

-- 5. CATÁLOGO OFICIAL DE ACCESORIOS (10 Estándar + Especial)
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
    activo = EXCLUDED.activo;

-- 6. CATÁLOGO DE 22 FALLAS TÉCNICAS DE PLACA RF (Por Categorías)
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
    activo = EXCLUDED.activo;

-- 7. REPORTE FINAL DE VERIFICACIÓN (Muestra los conteos exactos al ejecutar)
SELECT 'ordenes_servicio' AS tabla, COUNT(*) AS cantidad FROM ordenes_servicio
UNION ALL
SELECT 'orden_equipos', COUNT(*) FROM orden_equipos
UNION ALL
SELECT 'clientes', COUNT(*) FROM clientes
UNION ALL
SELECT 'usuarios', COUNT(*) FROM usuarios
UNION ALL
SELECT 'catalogo_accesorios_recepcion', COUNT(*) FROM catalogo_accesorios_recepcion
UNION ALL
SELECT 'catalogo_fallas_placa', COUNT(*) FROM catalogo_fallas_placa;
