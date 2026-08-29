export const availabilityService = {
  async getAvailability(query: unknown) {
    return {
      message: "TODO: centralize slot generation and conflict filtering here.",
      query,
    };
  },

  async assertBookingAllowed(_payload: unknown, _tour: unknown) {
    return;
  },

  async assertRescheduleAllowed(_existing: unknown, _payload: unknown, _tour: unknown) {
    return;
  },
};
