import { env } from "../config/env.js";
import { AppError } from "../utils/errors.js";

type FirebaseAuthResponse = {
  idToken?: string;
  error?: {
    message?: string;
  };
};

async function firebaseAuthRequest(endpoint: string, payload: Record<string, unknown>) {
  if (!env.FIREBASE_WEB_API_KEY) {
    throw new AppError("Missing FIREBASE_WEB_API_KEY for settings operations.", 500);
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/${endpoint}?key=${env.FIREBASE_WEB_API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  const data = (await response.json()) as FirebaseAuthResponse;
  if (!response.ok) {
    throw new AppError(data.error?.message || "Settings operation failed.", 400);
  }

  return data;
}

export const settingsService = {
  async updatePassword(payload: unknown) {
    const source = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
    const email = typeof source.email === "string" ? source.email.trim() : "";
    const currentPassword = typeof source.currentPassword === "string" ? source.currentPassword : "";
    const newPassword = typeof source.newPassword === "string" ? source.newPassword : "";

    if (!email || !currentPassword || !newPassword) {
      throw new AppError("Email, current password, and new password are required.", 400);
    }

    const signIn = await firebaseAuthRequest("accounts:signInWithPassword", {
      email,
      password: currentPassword,
      returnSecureToken: true,
    });

    if (!signIn.idToken) {
      throw new AppError("Unable to verify current password.", 400);
    }

    await firebaseAuthRequest("accounts:update", {
      idToken: signIn.idToken,
      password: newPassword,
      returnSecureToken: false,
    });

    return { message: "Password updated successfully." };
  },
};
