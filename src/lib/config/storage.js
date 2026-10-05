import { env } from './env';
import { supabase } from './supabase-client';
import fs from 'fs';
import path from 'path';

/**
 * Adaptador de Almacenamiento agnóstico para evidencias fotográficas.
 * Compatible con Supabase Storage (bucket 'evidencias-radios') y Disco Local (/public/uploads/evidencias)
 * @param {Buffer} fileBuffer - Buffer del archivo
 * @param {string} originalName - Nombre original del archivo
 * @param {string} mimeType - Tipo MIME (image/jpeg, image/png, etc.)
 * @returns {Promise<{ url: string, driver: string, fileName: string, sizeBytes: number, mimeType: string }>}
 */
export const uploadFile = async (fileBuffer, originalName = 'foto.jpg', mimeType = 'image/jpeg') => {
  const sanitizedName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}-${sanitizedName}`;
  const sizeBytes = fileBuffer.length;

  if (env.STORAGE_DRIVER === 'SUPABASE') {
    if (!supabase) {
      console.warn('⚠️ Supabase no configurado pero STORAGE_DRIVER=SUPABASE. Revisa SUPABASE_URL / SUPABASE_ANON_KEY.');
      throw new Error('Supabase Storage no está configurado correctamente en .env');
    }

    const storagePath = `evidencias/${uniqueName}`;
    const { data, error } = await supabase.storage
      .from('evidencias-radios')
      .upload(storagePath, fileBuffer, {
        contentType: mimeType,
        upsert: false
      });

    if (error) {
      console.error('Error al subir a Supabase Storage:', error);
      throw error;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('evidencias-radios')
      .getPublicUrl(data.path);

    return {
      url: publicUrl,
      driver: 'SUPABASE',
      fileName: uniqueName,
      sizeBytes,
      mimeType
    };
  } else {
    // Almacenamiento en Disco Local (/public/uploads/evidencias)
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'evidencias');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const destinationPath = path.join(uploadsDir, uniqueName);
    fs.writeFileSync(destinationPath, fileBuffer);

    // URL accesible públicamente a través del servidor web Next.js
    const publicUrl = `/uploads/evidencias/${uniqueName}`;

    return {
      url: publicUrl,
      driver: 'LOCAL',
      fileName: uniqueName,
      sizeBytes,
      mimeType
    };
  }
};
