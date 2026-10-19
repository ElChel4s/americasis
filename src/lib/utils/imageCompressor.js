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
 * Helper estandarizado para generar un objeto de evidencia seguro para el estado de la orden.
 * Retorna un objeto 100% serializable en JSON (sin objetos File crudos) y con tamaño verificado < 150 KB.
 */
export const compressToSafeEvidence = async (fileOrSource, options = {}) => {
  const { etapa = 'RECEPCION', name = '' } = options;

  const dataUrl = await compressImage(fileOrSource, {
    maxWidth: 1000,
    maxHeight: 1000,
    quality: 0.7,
    maxSizeBytes: MAX_SAFE_BYTES,
    returnType: 'base64'
  });

  const sizeBytes = getDataUrlSizeBytes(dataUrl);
  const sizeKb = Math.round(sizeBytes / 1024);
  const defaultName = typeof fileOrSource?.name === 'string' 
    ? fileOrSource.name 
    : `foto-${Date.now()}.webp`;

  return {
    id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    url: dataUrl,
    name: name || defaultName,
    sizeKb,
    etapa
  };
};
