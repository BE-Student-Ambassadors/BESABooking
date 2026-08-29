export const availabilityService = {
  async getAvailability(query: unknown) {
    const input = (query ?? {}) as Record<string, unknown>;

    return {
      tourId: typeof input.tourId === "string" ? input.tourId : "",
      date: typeof input.date === "string" ? input.date : undefined,
      available: false,
      reason: "Availability is not configured yet.",
      times: [],
    };
  },

  async assertBookingAllowed(_payload: unknown, _tour: unknown) {
    return;
  },

  async assertRescheduleAllowed(_existing: unknown, _payload: unknown, _tour: unknown) {
    return;
  },
};
