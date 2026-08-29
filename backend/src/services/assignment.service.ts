import { besasRepository } from "../repositories/besas.repository.js";

export const assignmentService = {
  async assignBesas(_payload: unknown, _tour: unknown) {
    const besas = await besasRepository.listActive();

    return {
      message: "TODO: move BESA auto-assignment logic from the frontend into this service.",
      candidates: besas.length,
    };
  },
};
