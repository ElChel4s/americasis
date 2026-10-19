import defaultRepuestos from '@/lib/data/repuestos_default.json';

const STORAGE_KEY = 'americasis_repuestos_catalog';

/**
 * Obtiene el catálogo completo de repuestos, combinando los precargados
 * con los agregados o importados localmente por el taller.
 */
export function getRepuestosCatalog() {
  if (typeof window === 'undefined') {
    return defaultRepuestos;
  }

  try {
    const local = localStorage.getItem(STORAGE_KEY);
    if (local) {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Combinar evitando IDs duplicados
        const idMap = new Map();
        defaultRepuestos.forEach(r => idMap.set(r.id, r));
        parsed.forEach(r => idMap.set(r.id, r));
        return Array.from(idMap.values());
      }
    }
  } catch (err) {
    console.warn('[RepuestosCatalog] Error leyendo catálogo local:', err);
  }

  return defaultRepuestos;
}

/**
 * Guarda el catálogo actualizado en localStorage
 */
export function saveRepuestosCatalog(catalog) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(catalog));
    window.dispatchEvent(new CustomEvent('americasis_catalog_updated', { detail: catalog }));
  } catch (err) {
    console.error('[RepuestosCatalog] Error guardando catálogo en localStorage:', err);
  }
}

/**
 * Busca repuestos filtrando por nombre o por modelo compatible
 * @param {string} query Texto de búsqueda
 * @param {string} [categoria] Categoría opcional para filtrar
 */
export function searchRepuestos(query = '', categoria = 'TODAS') {
  const catalog = getRepuestosCatalog();
  const q = (query || '').toLowerCase().trim();

  return catalog.filter(item => {
    if (categoria && categoria !== 'TODAS' && item.categoria !== categoria) {
      return false;
    }

    if (!q) return true;

    const matchNombre = (item.nombre || '').toLowerCase().includes(q);
    const matchModelo = (item.modelo_compatible || '').toLowerCase().includes(q);
    const matchCat = (item.categoria || '').toLowerCase().includes(q);
    const matchId = (item.id || '').toLowerCase().includes(q);

    return matchNombre || matchModelo || matchCat || matchId;
  });
}

/**
 * Retorna el precio base de un repuesto según la moneda activa
 * @param {Object} repuesto
 * @param {'BOB'|'USD'} moneda
 * @returns {number}
 */
export function getPrecioRepuesto(repuesto, moneda = 'BOB') {
  if (!repuesto) return 0;
  if (moneda === 'USD') {
    return parseFloat(repuesto.precio_usd) || 0;
  }
  return parseFloat(repuesto.precio_bs) || 0;
}

/**
 * Utilidad preparada para importación masiva desde Excel o JSON.
 * Valida y normaliza cada fila para asegurar integridad de campos:
 * id, nombre, modelo_compatible, precio_usd, precio_bs, categoria.
 * 
 * @param {Array<Object>} incomingRows Lista de objetos leídos de Excel/JSON
 * @returns {{ success: boolean, added: number, updated: number, errors: Array<string> }}
 */
export function importRepuestosFromData(incomingRows = []) {
  if (!Array.isArray(incomingRows) || incomingRows.length === 0) {
    return { success: false, added: 0, updated: 0, errors: ['No se enviaron datos para importar.'] };
  }

  const current = getRepuestosCatalog();
  const currentMap = new Map(current.map(r => [r.id, r]));
  let added = 0;
  let updated = 0;
  const errors = [];

  incomingRows.forEach((row, idx) => {
    const nombre = (row.nombre || row.descripcion || row.Nombre || row.DESCRIPCION || '').trim();
    if (!nombre) {
      errors.push(`Fila ${idx + 1}: Nombre de repuesto obligatorio omitido.`);
      return;
    }

    const id = (row.id || row.codigo || row.ID || row.CODIGO || `REP-IMP-${Date.now()}-${idx}`).trim();
    const modelo_compatible = (row.modelo_compatible || row.compatible || row.modelos || 'Universal').trim();
    const categoria = (row.categoria || row.CATEGORIA || 'Repuestos').trim();
    const precio_usd = parseFloat(row.precio_usd || row.usd || row.PRECIO_USD || 0);
    const precio_bs = parseFloat(row.precio_bs || row.bs || row.PRECIO_BS || (precio_usd * 6.96));

    const itemNorm = {
      id,
      nombre,
      modelo_compatible,
      precio_usd,
      precio_bs: Math.round(precio_bs * 100) / 100,
      categoria
    };

    if (currentMap.has(id)) {
      updated++;
    } else {
      added++;
    }

    currentMap.set(id, itemNorm);
  });

  const finalCatalog = Array.from(currentMap.values());
  saveRepuestosCatalog(finalCatalog);

  return {
    success: true,
    added,
    updated,
    total: finalCatalog.length,
    errors
  };
}

/**
 * Exporta el catálogo actual en formato JSON descargable
 */
export function exportRepuestosToJSON() {
  const catalog = getRepuestosCatalog();
  const jsonStr = JSON.stringify(catalog, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `catalogo_repuestos_americasis_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
