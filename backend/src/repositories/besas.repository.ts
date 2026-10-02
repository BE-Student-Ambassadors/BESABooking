import { db } from "../config/firebaseAdmin.js";
import { AppError } from "../utils/errors.js";

export const besasRepository = {
  async list() {
    const snapshot = await db.collection("Besas").get();
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  },

  async listActive() {
    const snapshot = await db.collection("Besas").where("status", "==", "active").get();
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  },

  async create(payload: unknown) {
    const record = payload as Record<string, unknown>;
    const created = await db.collection("Besas").add(record);
    const snapshot = await created.get();
    return {
      id: snapshot.id,
      ...snapshot.data(),
    };
  },

  async update(besaId: string, payload: unknown) {
    const besaRef = db.collection("Besas").doc(besaId);
    const snapshot = await besaRef.get();
    if (!snapshot.exists) {
      throw new AppError("BESA not found.", 404);
    }

    await besaRef.update(payload as Record<string, unknown>);
    const updated = await besaRef.get();
    return {
      id: updated.id,
      ...updated.data(),
    };
  },

  async updateOfficeHours(besaId: string, payload: unknown) {
    const besaRef = db.collection("Besas").doc(besaId);
    const snapshot = await besaRef.get();
    if (!snapshot.exists) {
      throw new AppError("BESA not found.", 404);
    }

    await besaRef.update(payload as Record<string, unknown>);
    const updated = await besaRef.get();
    return {
      id: updated.id,
      ...updated.data(),
    };
  },

  async updateTempSchedule(
    besaId: string,
    updates: { tempAdjustments?: TempAdjustment[]; tempUnavailability?: TempUnavailability[] },
  ) {
    const besaRef = db.collection("Besas").doc(besaId);
    const snapshot = await besaRef.get();
    if (!snapshot.exists) {
      throw new AppError("BESA not found.", 404);
    }

    await besaRef.update(updates);
    const updated = await besaRef.get();
    return {
      id: updated.id,
      ...updated.data(),
    };
  },

  async createPermanentChangeRequest(request: Record<string, unknown>) {
    const ref = await db.collection("OfficeHoursChangeRequests").add(request);
    return { id: ref.id };
  },

  async getPermanentChangeRequest(requestId: string) {
    const snapshot = await db.collection("OfficeHoursChangeRequests").doc(requestId).get();
    if (!snapshot.exists) {
      throw new AppError("Request not found.", 404);
    }
    const data = snapshot.data() || {};
    return {
      id: snapshot.id,
      status: typeof data.status === "string" ? data.status : "pending",
      ...(typeof data.error === "string" ? { error: data.error } : {}),
    };
  },

  async delete(besaId: string) {
    const besaRef = db.collection("Besas").doc(besaId);
    const snapshot = await besaRef.get();
    if (!snapshot.exists) {
      throw new AppError("BESA not found.", 404);
    }

    await besaRef.delete();
  },
};
