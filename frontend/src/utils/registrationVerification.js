export const REGISTRATION_VERIFIED_STORAGE_KEY =
  "tugonbarangay:registration-verified";

export function notifyRegistrationVerified() {
  window.localStorage.setItem(
    REGISTRATION_VERIFIED_STORAGE_KEY,
    JSON.stringify({ verifiedAt: Date.now() }),
  );
}
