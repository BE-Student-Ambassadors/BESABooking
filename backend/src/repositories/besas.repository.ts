import { db } from "../config/firebaseAdmin.js";

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
    return {
      message: "TODO: create a BESA document here.",
      payload,
    };
  },

  async update(besaId: string, payload: unknown) {
    return {
      message: "TODO: update a BESA document here.",
      besaId,
      payload,
    };
  },

  async updateOfficeHours(besaId: string, payload: unknown) {
    return {
      message: "TODO: update BESA office hours here.",
      besaId,
      payload,
    };
  },
};
