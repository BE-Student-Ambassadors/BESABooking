import { db } from "../config/firebaseAdmin.js";
import { AppError } from "../utils/errors.js";

function normalizeTourRecord(tourId: string, data: Record<string, unknown>) {
  return {
    id: tourId,
    tourId,
    ...data,
  };
}

export const toursRepository = {
  async list() {
    const snapshot = await db.collection("Tours").get();
    return snapshot.docs.map((doc) => normalizeTourRecord(doc.id, (doc.data() ?? {}) as Record<string, unknown>));
  },

  async getById(tourId: string) {
    const snapshot = await db.collection("Tours").doc(tourId).get();
    if (!snapshot.exists) {
      throw new AppError("Tour not found.", 404);
    }

    return normalizeTourRecord(snapshot.id, (snapshot.data() ?? {}) as Record<string, unknown>) as Record<string, unknown>;
  },

  async getByIdFromPayload(payload: unknown) {
    const tourId = (payload as { tourId?: string })?.tourId;
    if (!tourId) {
      throw new Error("Missing tourId in booking payload.");
    }

    return this.getById(tourId);
  },

  async create(payload: unknown) {
    const record = payload as Record<string, unknown>;
    const created = await db.collection("Tours").add(record);
    const snapshot = await created.get();
    return normalizeTourRecord(snapshot.id, (snapshot.data() ?? {}) as Record<string, unknown>);
  },

  async update(tourId: string, payload: unknown) {
    const tourRef = db.collection("Tours").doc(tourId);
    const snapshot = await tourRef.get();
    if (!snapshot.exists) {
      throw new AppError("Tour not found.", 404);
    }

    await tourRef.update(payload as Record<string, unknown>);
    const updated = await tourRef.get();
    return normalizeTourRecord(updated.id, (updated.data() ?? {}) as Record<string, unknown>);
  },

  async togglePublishState(tourId: string) {
    const tourRef = db.collection("Tours").doc(tourId);
    const snapshot = await tourRef.get();
    if (!snapshot.exists) {
      throw new AppError("Tour not found.", 404);
    }

    const current = snapshot.data() as { published?: unknown } | undefined;
    const nextPublished = !Boolean(current?.published);
    await tourRef.update({ published: nextPublished });
    const updated = await tourRef.get();
    return normalizeTourRecord(updated.id, (updated.data() ?? {}) as Record<string, unknown>);
  },

  async delete(tourId: string) {
    await db.collection("Tours").doc(tourId).delete();
  },
};
