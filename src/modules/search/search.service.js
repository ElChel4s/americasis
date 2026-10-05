import { SearchRepository } from './search.repository';

export const SearchService = {
  /**
   * Ejecuta búsqueda avanzada y paginada de órdenes
   */
  async searchOrders(filters) {
    return await SearchRepository.searchOrders(filters);
  },

  /**
   * Obtiene la trazabilidad completa por número de serie
   */
  async getSerialTimeline(numeroSerie) {
    if (!numeroSerie || !numeroSerie.trim()) {
      throw new Error('Debe proporcionar un número de serie válido.');
    }
    return await SearchRepository.getSerialTimeline(numeroSerie);
  }
};
