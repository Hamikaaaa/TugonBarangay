import { useEffect } from "react";
import { notifyRegistrationVerified } from "../utils/registrationVerification";

function RegistrationVerified() {
  useEffect(() => {
    notifyRegistrationVerified();
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F4F7FB] px-6">
      <p className="rounded-2xl bg-white px-8 py-6 text-center text-lg font-semibold text-[#142A46] shadow-sm">
        Verification successful. you may close this tab and return to the login
        page
      </p>
    </main>
  );
}

export default RegistrationVerified;
