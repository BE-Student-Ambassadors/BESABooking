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

  // Asks the Firebase Function to change a BESA's weekly hours on Google Calendar (the source
  // of their office hours) from `date` on. Body, times in HH:mm:
  //   { action: "change", date, from: { start, end }, to: { start, end } }  (action may be omitted)
  //   { action: "remove", date, from }   weekly slot stops on that weekday
  //   { action: "add", date, to }        new weekly slot on that weekday
  //   { action: "removeAll", date }      all of the BESA's weekly hours stop
  async requestPermanentChange(besaId: string, payload: unknown) {
    const body = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
    const readSlot = (value: unknown) => {
      const slot = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
      const valid = (time: unknown): time is string => typeof time === "string" && /^\d{2}:\d{2}$/.test(time);
      return valid(slot.start) && valid(slot.end) && slot.start < slot.end ? { start: slot.start, end: slot.end } : null;
    };
    const action = body.action === "remove" || body.action === "add" || body.action === "removeAll" ? body.action : "change";
    const date = typeof body.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : "";
    const from = readSlot(body.from);
    const to = readSlot(body.to);
    const needsFrom = action === "change" || action === "remove";
    const needsTo = action === "change" || action === "add";
    if (!date || (needsFrom && !from) || (needsTo && !to)) {
      throw new AppError(
        "Send date (YYYY-MM-DD) plus from (change/remove) and to (change/add) slots with start before end (HH:mm).",
        400,
      );
    }

    const besa = (await besasRepository.list()).find((entry) => entry.id === besaId) as Record<string, unknown> | undefined;
    if (!besa) {
      throw new AppError("BESA not found.", 404);
    }
    if (typeof besa.email !== "string" || !besa.email.trim()) {
      throw new AppError("This BESA has no email, so their Google Calendar events can't be found.", 400);
    }

    return besasRepository.createPermanentChangeRequest({
      besaId,
      email: besa.email.trim().toLowerCase(),
      name: typeof besa.name === "string" ? besa.name : "",
      date,
      action,
      ...(needsFrom && from ? { from } : {}),
      ...(needsTo && to ? { to } : {}),
      status: "pending",
      createdAt: new Date().toISOString(),
    });
  },

  async getPermanentChangeRequest(requestId: string) {
    return besasRepository.getPermanentChangeRequest(requestId);
  },

  async deleteBesa(besaId: string) {
    await besasRepository.delete(besaId);
  },
};
