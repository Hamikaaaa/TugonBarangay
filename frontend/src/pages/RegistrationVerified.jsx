import { useEffect } from "react";
import { notifyRegistrationVerified } from "../utils/registrationVerification";

function RegistrationVerified() {
  useEffect(() => {
    notifyRegistrationVerified();
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950/60 px-5 py-8">
      <p
        role="status"
        className="rounded-2xl bg-white px-8 py-6 text-center text-lg font-semibold text-[#142A46] shadow-sm"
      >
        Email verified, you may now go back to the login page and and close this
        tab
      </p>
    </main>
  );
}

export default RegistrationVerified;
