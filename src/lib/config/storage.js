import { env } from './env';
import { supabase } from './supabase-client';
import fs from 'fs';
import path from 'path';

/**
 * Adaptador de Almacenamiento agnóstico para evidencias fotográficas.
 * Compatible con Supabase Storage (bucket 'evidencias-radios') y Disco Local (/public/uploads/evidencias)
 * @param {Buffer} fileBuffer - Buffer del archivo
 * @param {string} originalName - Nombre original del archivo
 * @param {string} mimeType - Tipo MIME (image/jpeg, image/png, image/webp, etc.)
 * @returns {Promise<{ url: string, driver: string, fileName: string, sizeBytes: number, mimeType: string }>}
 */
export const uploadFile = async (fileBuffer, originalName = 'foto.webp', mimeType = 'image/webp') => {
  const sanitizedName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}-${sanitizedName}`;
  const sizeBytes = fileBuffer.length;
  const effectiveMime = (mimeType && mimeType.startsWith('image/')) ? mimeType : 'image/jpeg';

  // 1. PRIORIDAD: Supabase Storage Cloud si está disponible
  if (supabase) {
    try {
      const storagePath = `evidencias/${uniqueName}`;
      const { data, error } = await supabase.storage
        .from('evidencias-radios')
        .upload(storagePath, fileBuffer, {
          contentType: effectiveMime,
          upsert: true
        });

      if (!error && data) {
        const { data: { publicUrl } } = supabase.storage
          .from('evidencias-radios')
          .getPublicUrl(data.path);

        return {
          url: publicUrl,
          driver: 'SUPABASE',
          fileName: uniqueName,
          sizeBytes,
          mimeType: effectiveMime
        };
      }

      if (error) {
        console.warn('⚠️ Advertencia subiendo a Supabase Storage, probando almacenamiento alternativo:', error.message);
      }
    } catch (sbErr) {
      console.warn('⚠️ Excepción conectando a Supabase Storage:', sbErr.message);
    }
  }

  // 2. Fallback a Disco Local (/public/uploads/evidencias)
  try {
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'evidencias');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const destinationPath = path.join(uploadsDir, uniqueName);
    fs.writeFileSync(destinationPath, fileBuffer);

    const publicUrl = `/uploads/evidencias/${uniqueName}`;

    return {
      url: publicUrl,
      driver: 'LOCAL',
      fileName: uniqueName,
      sizeBytes,
      mimeType: effectiveMime
    };
  } catch (fsErr) {
    console.warn('⚠️ No se pudo escribir en disco local (/public/uploads):', fsErr.message);

    // 3. Fallback Infalible: Data URI en Base64 para que NUNCA falle la subida de foto por permisos de carpeta
    const base64Data = fileBuffer.toString('base64');
    const dataUrl = `data:${effectiveMime};base64,${base64Data}`;

    return {
      url: dataUrl,
      driver: 'INLINE',
      fileName: uniqueName,
      sizeBytes,
      mimeType: effectiveMime
    };
  }
};

/**
 * Elimina físicamente los archivos de evidencias (Supabase Storage o disco local).
 * Las evidencias INLINE (data:...) no tienen archivo físico y se ignoran.
 * @param {Array<{url_archivo?: string, nombre_archivo?: string, storage_driver?: string}>} items
 */
export const deleteStoredFiles = async (items = []) => {
  const supabasePaths = [];
  const marker = '/evidencias-radios/';

  for (const item of items) {
    const url = item?.url_archivo || item?.url || '';
    if (!url || typeof url !== 'string' || url.startsWith('data:')) continue;

    const markerPos = url.indexOf(marker);
    if (markerPos >= 0) {
      const objectPath = decodeURIComponent(url.substring(markerPos + marker.length).split('?')[0]);
      if (objectPath) supabasePaths.push(objectPath);
      continue;
    }

    if (url.startsWith('/uploads/evidencias/')) {
      try {
        // basename evita path traversal
        const filePath = path.join(process.cwd(), 'public', 'uploads', 'evidencias', path.basename(url));
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch (fsErr) {
        console.warn('⚠️ No se pudo eliminar evidencia local:', fsErr.message);
      }
    }
  }

  if (supabase && supabasePaths.length > 0) {
    try {
      const { error } = await supabase.storage.from('evidencias-radios').remove(supabasePaths);
      if (error) console.warn('⚠️ Error eliminando archivos de Supabase Storage:', error.message);
    } catch (sbErr) {
      console.warn('⚠️ Excepción eliminando archivos de Supabase Storage:', sbErr.message);
    }
  }
};

