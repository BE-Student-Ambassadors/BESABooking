import { db } from "../config/firebaseAdmin.js";

export const toursRepository = {
  async list() {
    const snapshot = await db.collection("Tours").get();
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  },

  async getById(tourId: string) {
    const snapshot = await db.collection("Tours").doc(tourId).get();
    return {
      id: snapshot.id,
      ...snapshot.data(),
    } as Record<string, unknown>;
  },

  async getByIdFromPayload(payload: unknown) {
    const tourId = (payload as { tourId?: string })?.tourId;
    if (!tourId) {
      throw new Error("Missing tourId in booking payload.");
    }

    return this.getById(tourId);
  },

  async create(payload: unknown) {
    return {
      message: "TODO: create a tour document here.",
      payload,
    };
  },

  async update(tourId: string, payload: unknown) {
    return {
      message: "TODO: update a tour document here.",
      tourId,
      payload,
    };
  },

  async togglePublishState(tourId: string) {
    return {
      message: "TODO: toggle published state here.",
      tourId,
    };
  },

  async delete(tourId: string) {
    await db.collection("Tours").doc(tourId).delete();
  },
};
