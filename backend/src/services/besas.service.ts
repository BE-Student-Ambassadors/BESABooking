import { besasRepository } from "../repositories/besas.repository.js";
import { AppError } from "../utils/errors.js";
import { normalizeTempAdjustments, normalizeTempUnavailability } from "../utils/besaTempSchedule.js";

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

  // Replaces tempAdjustments and/or tempUnavailability with cleaned-up copies of what was sent.
  async updateTempSchedule(besaId: string, payload: unknown) {
    const body = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
    const updates: { tempAdjustments?: TempAdjustment[]; tempUnavailability?: TempUnavailability[] } = {};
    if (Array.isArray(body.tempAdjustments)) {
      updates.tempAdjustments = normalizeTempAdjustments(body.tempAdjustments);
    }
    if (Array.isArray(body.tempUnavailability)) {
      updates.tempUnavailability = normalizeTempUnavailability(body.tempUnavailability);
    }
    if (Object.keys(updates).length === 0) {
      throw new AppError("Send tempAdjustments and/or tempUnavailability as arrays.", 400);
    }
    return besasRepository.updateTempSchedule(besaId, updates);
  },

  async deleteBesa(besaId: string) {
    await besasRepository.delete(besaId);
  },
};
