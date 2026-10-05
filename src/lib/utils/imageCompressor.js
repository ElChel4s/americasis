/**
 * imageCompressor.js
 * Utilidad para comprimir y convertir imágenes a WebP en el navegador usando Canvas API.
 */

export const compressImage = async (file, options = {}) => {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.78,
    returnType = 'base64', // 'base64' o 'blob' o 'file'
  } = options;

  return new Promise((resolve, reject) => {
    if (!file || !file.type.match(/image.*/)) {
      return reject(new Error('El archivo no es una imagen.'));
    }

    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Mantener la relación de aspecto
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

        // Dibujar la imagen escalada en el canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Soporte de formato WebP, fallback a JPEG
        let mimeType = 'image/webp';
        
        // Comprobar soporte de WebP, aunque la mayoría de los navegadores modernos lo soportan
        const testCanvas = document.createElement('canvas');
        if (testCanvas.toDataURL('image/webp').indexOf('data:image/webp') !== 0) {
          mimeType = 'image/jpeg';
        }

        if (returnType === 'base64') {
          const dataUrl = canvas.toDataURL(mimeType, quality);
          resolve(dataUrl);
        } else {
          canvas.toBlob(
            (blob) => {
              if (blob) {
                if (returnType === 'file') {
                  // Crear un objeto File
                  const fileName = file.name.replace(/\.[^/.]+$/, "") + (mimeType === 'image/webp' ? '.webp' : '.jpg');
                  const newFile = new File([blob], fileName, { type: mimeType });
                  resolve(newFile);
                } else {
                  // Retornar Blob
                  resolve(blob);
                }
              } else {
                reject(new Error('Error al generar el Blob de la imagen.'));
              }
            },
            mimeType,
            quality
          );
        }
      };
      
      img.onerror = () => reject(new Error('Error al cargar la imagen.'));
      img.src = readerEvent.target.result;
    };
    
    reader.onerror = () => reject(new Error('Error al leer el archivo.'));
    reader.readAsDataURL(file);
  });
};
