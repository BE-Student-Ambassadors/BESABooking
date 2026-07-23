import { toursRepository } from "../repositories/tours.repository.js";

export const toursService = {
  async listTours() {
    return toursRepository.list();
  },

  async createTour(payload: unknown) {
    return toursRepository.create(payload);
  },

  async updateTour(tourId: string, payload: unknown) {
    return toursRepository.update(tourId, payload);
  },

  async togglePublishState(tourId: string) {
    return toursRepository.togglePublishState(tourId);
  },

  async deleteTour(tourId: string) {
    await toursRepository.delete(tourId);
  },
};
