import { CatalogsRepository } from './catalogs.repository';

export const CatalogsService = {
  async getFaults(options) {
    return await CatalogsRepository.getFaults(options);
  },

  async createFault(data) {
    if (!data.label || !data.label.trim()) {
      throw new Error('El nombre de la falla es requerido');
    }
    return await CatalogsRepository.createFault(data);
  },

  async updateFault(codigo, data) {
    if (!codigo) {
      throw new Error('El código de la falla es requerido');
    }
    return await CatalogsRepository.updateFault(codigo, data);
  },

  async getAccessories(options) {
    return await CatalogsRepository.getAccessories(options);
  },

  async createAccessory(data) {
    if (!data.nombre || !data.nombre.trim()) {
      throw new Error('El nombre del accesorio es requerido');
    }
    return await CatalogsRepository.createAccessory(data);
  },

  async updateAccessory(id, data) {
    if (!id) {
      throw new Error('El identificador del accesorio es requerido');
    }
    return await CatalogsRepository.updateAccessory(id, data);
  }
};
