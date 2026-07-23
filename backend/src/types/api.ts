export type ApiMessage = {
  message: string;
};

export type AuthenticatedRequestContext = {
  userId: string;
  role: "admin" | "besa";
};
