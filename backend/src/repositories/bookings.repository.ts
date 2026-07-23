import { db } from "../config/firebaseAdmin.js";

export const bookingsRepository = {
  async findByReference(query: unknown) {
    return {
      message: "TODO: implement booking lookup by id or last name.",
      query,
    };
  },

  async getById(bookingId: string) {
    const snapshot = await db.collection("Bookings").doc(bookingId).get();
    return {
      id: snapshot.id,
      ...snapshot.data(),
    } as Record<string, unknown>;
  },

  async create(payload: unknown) {
    return {
      message: "TODO: persist booking and side effects here.",
      payload,
    };
  },

  async reschedule(bookingId: string, payload: unknown, besas: unknown) {
    return {
      message: "TODO: update booking schedule and related assignment here.",
      bookingId,
      payload,
      besas,
    };
  },

  async cancel(bookingId: string) {
    await db.collection("Bookings").doc(bookingId).delete();
  },
};
