import { db } from "../config/firebaseAdmin.js";
import { AppError } from "../utils/errors.js";

function normalizeBesaEntry(besa: unknown) {
  if (typeof besa === "string") {
    return besa;
  }

  if (besa && typeof besa === "object") {
    const named = besa as { name?: unknown; email?: unknown };
    if (typeof named.name === "string" && named.name.trim() !== "") {
      return named.name;
    }
    if (typeof named.email === "string" && named.email.trim() !== "") {
      return named.email;
    }
  }

  return String(besa ?? "");
}

function normalizeBookingRecord(bookingId: string, data: Record<string, unknown>) {
  const besas = Array.isArray(data.besas)
    ? data.besas
    : data.besa !== undefined
      ? [data.besa]
      : [];

  return {
    ...data,
    bookingId,
    besas: besas.map(normalizeBesaEntry).filter(Boolean),
  };
}

export const bookingsRepository = {
  async list() {
    const snapshot = await db.collection("Bookings").get();
    return snapshot.docs.map((document) =>
      normalizeBookingRecord(document.id, (document.data() ?? {}) as Record<string, unknown>),
    );
  },

  async findByReference(query: unknown) {
    return {
      message: "TODO: implement booking lookup by id or last name.",
      query,
    };
  },

  async getById(bookingId: string) {
    const snapshot = await db.collection("Bookings").doc(bookingId).get();
    if (!snapshot.exists) {
      throw new AppError("Booking not found.", 404);
    }

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

  async updateAdmin(bookingId: string, payload: Record<string, unknown>) {
    const bookingRef = db.collection("Bookings").doc(bookingId);
    const snapshot = await bookingRef.get();

    if (!snapshot.exists) {
      throw new AppError("Booking not found.", 404);
    }

    await bookingRef.update(payload);
    const updated = await bookingRef.get();

    return normalizeBookingRecord(bookingId, (updated.data() ?? {}) as Record<string, unknown>);
  },

  async cancel(bookingId: string) {
    const bookingRef = db.collection("Bookings").doc(bookingId);
    const snapshot = await bookingRef.get();

    if (!snapshot.exists) {
      throw new AppError("Booking not found.", 404);
    }

    await bookingRef.delete();
  },
};
