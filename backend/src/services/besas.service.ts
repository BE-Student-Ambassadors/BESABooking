import { besasRepository } from "../repositories/besas.repository.js";

export const besasService = {
  async listBesas() {
    return besasRepository.list();
  },

  async createBesa(payload: unknown) {
    return besasRepository.create(payload);
  },

  async updateBesa(besaId: string, payload: unknown) {
    return besasRepository.update(besaId, payload);
  },

  async updateOfficeHours(besaId: string, payload: unknown) {
    return besasRepository.updateOfficeHours(besaId, payload);
  },

  async deleteBesa(besaId: string) {
    await besasRepository.delete(besaId);
  },
};
