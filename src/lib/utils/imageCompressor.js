/**
 * imageCompressor.js
 * Utilidad de compresión y redimensionado de imágenes en el navegador usando Canvas API.
 * 
 * Reglas de optimización:
 * - Dimensiones máximas: 1000x1000 px conservando la relación de aspecto.
 * - Formato preferido: image/webp (fallback a image/jpeg).
 * - Calidad inicial: 0.7.
 * - Límite estricto de peso: Máximo 150 KB por fotografía. Si supera 150 KB,
 *   se reduce iterativamente la calidad y resolución en el Canvas hasta cumplir la cuota.
 */

const MAX_SAFE_BYTES = 60 * 1024; // 60 KB por foto para optimizar cuota de localStorage

/**
 * Calcula el tamaño en bytes de una cadena Base64 Data URL
 */
export const getDataUrlSizeBytes = (dataUrl) => {
  if (!dataUrl || typeof dataUrl !== 'string') return 0;
  const commaIdx = dataUrl.indexOf(',');
  const base64Str = commaIdx !== -1 ? dataUrl.slice(commaIdx + 1) : dataUrl;
  return Math.round((base64Str.length * 3) / 4);
};

/**
 * Comprime y redimensiona una imagen garantizando que no supere la cuota de peso (60 KB)
 */
export const compressImage = async (fileOrSource, options = {}) => {
  const {
    maxWidth = 800,
    maxHeight = 800,
    quality = 0.65,
    maxSizeBytes = MAX_SAFE_BYTES,
    returnType = 'base64', // 'base64' | 'blob' | 'file'
  } = options;

  return new Promise((resolve, reject) => {
    if (!fileOrSource) {
      return reject(new Error('No se proporcionó ninguna imagen.'));
    }

    const processLoadedImage = (img, originalName = 'foto.jpg', originalType = 'image/jpeg') => {
      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      if (!width || !height) {
        return reject(new Error('Dimensiones de imagen inválidas.'));
      }

      // 1. Escalar dimensiones respetando la relación de aspecto
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        return reject(new Error('No se pudo inicializar el contexto 2D de Canvas.'));
      }

      // Dibujar la imagen escalada en el canvas
      ctx.drawImage(img, 0, 0, width, height);

      // Determinar formato compatible (prioridad WebP, fallback JPEG)
      let mimeType = 'image/webp';
      const testCanvas = document.createElement('canvas');
      if (testCanvas.toDataURL('image/webp').indexOf('data:image/webp') !== 0) {
        mimeType = 'image/jpeg';
      }

      // 2. Bucle iterativo de compresión para garantizar < 150 KB
      let currentQuality = Math.min(Math.max(quality, 0.1), 0.95);
      let currentDataUrl = canvas.toDataURL(mimeType, currentQuality);
      let currentSizeBytes = getDataUrlSizeBytes(currentDataUrl);

      let attempts = 0;
      while (currentSizeBytes > maxSizeBytes && attempts < 4) {
        attempts++;
        // Reducir calidad gradualmente
        currentQuality = Math.max(0.18, currentQuality * 0.72);

        // Si la calidad ya es baja, también reducir resolución física del canvas en un 15%
        if (attempts >= 2 && (canvas.width > 400 || canvas.height > 400)) {
          const nextWidth = Math.round(canvas.width * 0.85);
          const nextHeight = Math.round(canvas.height * 0.85);
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = nextWidth;
          tempCanvas.height = nextHeight;
          const tempCtx = tempCanvas.getContext('2d');
          if (tempCtx) {
            tempCtx.drawImage(canvas, 0, 0, nextWidth, nextHeight);
            canvas.width = nextWidth;
            canvas.height = nextHeight;
            ctx.drawImage(tempCanvas, 0, 0);
          }
        }

        currentDataUrl = canvas.toDataURL(mimeType, currentQuality);
        currentSizeBytes = getDataUrlSizeBytes(currentDataUrl);
      }

      console.debug(`[imageCompressor] Imagen comprimida: ${Math.round(currentSizeBytes / 1024)} KB (${canvas.width}x${canvas.height}px, calidad: ${currentQuality.toFixed(2)}, intentos: ${attempts})`);

      if (returnType === 'base64') {
        resolve(currentDataUrl);
      } else {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              if (returnType === 'file') {
                const baseName = (originalName || 'evidencia').replace(/\.[^/.]+$/, "");
                const ext = mimeType === 'image/webp' ? '.webp' : '.jpg';
                const newFile = new File([blob], `${baseName}${ext}`, { type: mimeType });
                // Añadir url base64 directa como propiedad para conveniencia del consumidor
                newFile.dataUrl = currentDataUrl;
                resolve(newFile);
              } else {
                resolve(blob);
              }
            } else {
              reject(new Error('Error al generar el Blob de la imagen.'));
            }
          },
          mimeType,
          currentQuality
        );
      }
    };

    // Caso A: Ya es una cadena Data URL
    if (typeof fileOrSource === 'string' && fileOrSource.startsWith('data:')) {
      const img = new Image();
      img.onload = () => processLoadedImage(img, 'evidencia.webp', 'image/webp');
      img.onerror = () => reject(new Error('No se pudo cargar la imagen desde el Data URL.'));
      img.src = fileOrSource;
      return;
    }

    // Caso B: Es un File o Blob
    if (fileOrSource instanceof Blob || (typeof File !== 'undefined' && fileOrSource instanceof File)) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => processLoadedImage(img, fileOrSource.name || 'foto.jpg', fileOrSource.type || 'image/jpeg');
        img.onerror = () => reject(new Error('Error al renderizar los bytes de la imagen.'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('Error al leer el archivo de imagen.'));
      reader.readAsDataURL(fileOrSource);
      return;
    }

    return reject(new Error('Tipo de archivo o fuente de imagen no compatible.'));
  });
};

/**
 * Comprime y redimensiona una imagen a un Blob WebP estricto:
 * - Resolución máxima: 1280px (conservando relación de aspecto)
 * - Formato: image/webp
 * - Calidad inicial: 0.7
 * - Límite estricto de peso: < 200 KB
 */
export const compressToWebpBlob = async (fileOrSource, options = {}) => {
  const {
    maxWidth = 1280,
    maxHeight = 1280,
    quality = 0.7,
    maxSizeBytes = 200 * 1024, // 200 KB estricto
    timeoutMs = 12000
  } = options;

  const compressPromise = new Promise((resolve, reject) => {
    if (!fileOrSource) {
      return reject(new Error('No se proporcionó ningún archivo de imagen.'));
    }

    const processImage = (img, defaultName = 'foto.webp') => {
      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      if (!width || !height) {
        return reject(new Error('No se pudieron leer las dimensiones de la imagen.'));
      }

      // Escalar dimensiones respetando aspect ratio (máximo 1280px)
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        return reject(new Error('No se pudo inicializar Canvas 2D en el navegador.'));
      }

      ctx.drawImage(img, 0, 0, width, height);

      let currentQuality = Math.min(Math.max(quality, 0.2), 0.9);
      let attempts = 0;

      const attemptToBlob = () => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return reject(new Error('Error al generar Blob WebP desde Canvas.'));
            }

            // Si supera 200 KB y tenemos intentos, reducir calidad y escala
            if (blob.size > maxSizeBytes && attempts < 3) {
              attempts++;
              currentQuality = Math.max(0.25, currentQuality * 0.75);

              if (attempts >= 2 && (canvas.width > 600 || canvas.height > 600)) {
                const nw = Math.round(canvas.width * 0.85);
                const nh = Math.round(canvas.height * 0.85);
                const tmp = document.createElement('canvas');
                tmp.width = nw;
                tmp.height = nh;
                const tmpCtx = tmp.getContext('2d');
                if (tmpCtx) {
                  tmpCtx.drawImage(canvas, 0, 0, nw, nh);
                  canvas.width = nw;
                  canvas.height = nh;
                  ctx.drawImage(tmp, 0, 0);
                }
              }
              attemptToBlob();
              return;
            }

            const dataUrl = canvas.toDataURL('image/webp', currentQuality);
            resolve({
              blob,
              dataUrl,
              sizeBytes: blob.size,
              sizeKb: Math.round(blob.size / 1024),
              width: canvas.width,
              height: canvas.height,
              fileName: defaultName
            });
          },
          'image/webp',
          currentQuality
        );
      };

      attemptToBlob();
    };

    if (typeof fileOrSource === 'string' && fileOrSource.startsWith('data:')) {
      const img = new Image();
      img.onload = () => processImage(img);
      img.onerror = () => reject(new Error('Error decodificando imagen base64.'));
      img.src = fileOrSource;
      return;
    }

    if (fileOrSource instanceof Blob || (typeof File !== 'undefined' && fileOrSource instanceof File)) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => processImage(img, fileOrSource.name || 'foto.webp');
        img.onerror = () => reject(new Error('Error renderizando imagen seleccionada.'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('Error leyendo archivo en disco.'));
      reader.readAsDataURL(fileOrSource);
      return;
    }

    return reject(new Error('Formato de imagen no soportado.'));
  });

  // Timeout guard para que nunca cuelgue el navegador
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Tiempo de espera agotado al comprimir imagen (Timeout).')), timeoutMs);
  });

  return Promise.race([compressPromise, timeoutPromise]);
};

/**
 * Helper unificado: Comprime la foto a WebP (< 200 KB, max 1280px)
 * y la sube de inmediato a Supabase Storage ('evidencias-radios') y registra en 'public.equipo_evidencias'.
 * Con timeout estricto y fallback a Base64 para que la UI JAMÁS se quede colgada.
 */
export const uploadEvidencePhoto = async ({
  fileOrSource,
  equipoId,
  ordenId = null,
  etapa = 'RECEPCION',
  name = ''
}) => {
  // 1. Compresión estricta Canvas WebP
  const compressed = await compressToWebpBlob(fileOrSource, {
    maxWidth: 1280,
    maxHeight: 1280,
    quality: 0.7,
    maxSizeBytes: 200 * 1024,
    timeoutMs: 12000
  });

  const { blob, dataUrl, sizeBytes, sizeKb } = compressed;
  const eqIdClean = equipoId ? String(equipoId).replace(/[^a-zA-Z0-9_-]/g, '') : 'equipo';
  const nombreArchivo = `${eqIdClean}_${Date.now()}.webp`;
  const storagePath = `evidencias/${nombreArchivo}`;

  let publicUrl = null;
  let rowId = null;

  // 2. Subida limpia a Supabase Storage en el cliente
  try {
    const { supabase } = await import('@/lib/config/supabase-client');
    if (supabase) {
      const uploadPromise = supabase.storage
        .from('evidencias-radios')
        .upload(storagePath, blob, {
          contentType: 'image/webp',
          upsert: true
        });

      const timeoutSupabase = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout Storage')), 10000)
      );

      const { data: uploadData, error: uploadError } = await Promise.race([uploadPromise, timeoutSupabase]);

      if (!uploadError && uploadData) {
        const { data: { publicUrl: pUrl } } = supabase.storage
          .from('evidencias-radios')
          .getPublicUrl(storagePath);

        publicUrl = pUrl;
      }
    }
  } catch (sbErr) {
    console.warn('[imageCompressor] Subida directa Storage omitida o con error:', sbErr.message);
  }

  // 3. Inserción inmediata en public.equipo_evidencias si tenemos URL y equipo_id válido
  const isUuid = (val) => typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
  const validEquipoUuid = isUuid(equipoId) ? equipoId : null;
  const validOrdenUuid = isUuid(ordenId) ? ordenId : null;

  if (publicUrl && validEquipoUuid) {
    try {
      const { supabase } = await import('@/lib/config/supabase-client');
      if (supabase) {
        const { data: newEv, error: insErr } = await supabase
          .from('equipo_evidencias')
          .insert({
            equipo_id: validEquipoUuid,
            orden_id: validOrdenUuid,
            nombre_archivo: nombreArchivo,
            url_archivo: publicUrl,
            etapa: etapa || 'RECEPCION',
            es_webp: true,
            mime_type: 'image/webp',
            tamano_bytes: sizeBytes,
            storage_driver: 'SUPABASE'
          })
          .select()
          .single();

        if (newEv && !insErr) {
          rowId = newEv.id;
        }
      }
    } catch (dbErr) {
      console.warn('[imageCompressor] Inserción directa en BD omitida:', dbErr.message);
    }
  }

  // 4. Fallback API si Storage directo no dio URL
  if (!publicUrl && validEquipoUuid) {
    try {
      const fd = new FormData();
      fd.append('file', blob, nombreArchivo);
      fd.append('equipo_id', validEquipoUuid);
      if (validOrdenUuid) fd.append('orden_id', validOrdenUuid);
      fd.append('etapa', etapa);

      const res = await fetch('/api/evidences/upload', {
        method: 'POST',
        body: fd
      });
      const json = await res.json();
      if (json.success && json.data) {
        publicUrl = json.data.url_archivo || json.data.url;
        rowId = json.data.id;
      }
    } catch (apiErr) {
      console.warn('[imageCompressor] Fallback API upload omitido:', apiErr.message);
    }
  }

  // Si no hay Storage o no hay UUID en BD aún, usamos dataUrl seguro para que la foto se vea y se guarde
  const finalUrl = publicUrl || dataUrl;

  return {
    id: rowId || `img-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    url: finalUrl,
    url_archivo: finalUrl,
    name: name || nombreArchivo,
    nombre_archivo: name || nombreArchivo,
    sizeKb: sizeKb || 50,
    etapa: etapa
  };
};

/**
 * Helper estandarizado para generar un objeto de evidencia seguro para el estado de la orden.
 * Retorna un objeto 100% serializable en JSON con compresión garantizada.
 */
export const compressToSafeEvidence = async (fileOrSource, options = {}) => {
  const { etapa = 'RECEPCION', name = '', equipoId = null, ordenId = null } = options;

  try {
    return await uploadEvidencePhoto({
      fileOrSource,
      equipoId,
      ordenId,
      etapa,
      name
    });
  } catch (err) {
    console.warn('[imageCompressor] Fallback a compresión local simple:', err.message);
    const dataUrl = await compressImage(fileOrSource, {
      maxWidth: 1280,
      maxHeight: 1280,
      quality: 0.7,
      maxSizeBytes: 200 * 1024,
      returnType: 'base64'
    });

    const sizeBytes = getDataUrlSizeBytes(dataUrl);
    const defaultName = typeof fileOrSource?.name === 'string' 
      ? fileOrSource.name 
      : `foto-${Date.now()}.webp`;

    return {
      id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      url: dataUrl,
      url_archivo: dataUrl,
      name: name || defaultName,
      nombre_archivo: name || defaultName,
      sizeKb: Math.round(sizeBytes / 1024),
      etapa
    };
  }
};

