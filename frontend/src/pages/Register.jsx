import { useState } from "react";
import { useNavigate } from "react-router-dom";

const formSteps = [
  {
    title: "Personal Information",
    description: "Tell us about yourself so we can verify your identity.",
    label: "Personal Info",
    icon: "user",
  },
  {
    title: "Address & Contact",
    description: "Provide your address and contact information.",
    label: "Address & Contact",
    icon: "pin",
  },
  {
    title: "Secure Your Account",
    description: "Create your password and complete your registration.",
    label: "Account Setup",
    icon: "lock",
  },
];

function Register() {
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [showConsent, setShowConsent] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [consentType, setConsentType] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [passwordValidationAttempted, setPasswordValidationAttempted] =
    useState(false);

  const [formData, setFormData] = useState({
    first_name: "",
    middle_name: "",
    last_name: "",
    suffix: "",
    date_of_birth: "",
    sex: "",
    purok: "",
    address: "",
    mobile_number: "",
    email: "",
    password: "",
    password_confirmation: "",
  });

  const update = (event) => {
    const { name, value } = event.target;

    let newValue = value;

    // Mobile number: numbers only, maximum 11 digits
    if (name === "mobile_number") {
      newValue = value.replace(/\D/g, "").slice(0, 11);
    }

    setFormData((current) => ({
      ...current,
      [name]: newValue,
    }));

    setFieldErrors((current) => ({
      ...current,
      [name]: "",
    }));

    setError("");
  };

  const validateStep = ({ includePassword = false } = {}) => {
    const errors = {};

    // STEP 1
    if (step === 0) {
      if (!formData.first_name.trim()) {
        errors.first_name = "First name is required.";
      }

      if (!formData.last_name.trim()) {
        errors.last_name = "Last name is required.";
      }

      if (!formData.date_of_birth) {
        errors.date_of_birth = "Date of birth is required.";
      }

      if (!formData.sex) {
        errors.sex = "Please select your sex.";
      }
    }

    // STEP 2
    if (step === 1) {
      if (!formData.purok) {
        errors.purok = "Purok is required.";
      }

      if (!/^09\d{9}$/.test(formData.mobile_number)) {
        errors.mobile_number =
          "Mobile number must contain exactly 11 digits and start with 09.";
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        errors.email = "Enter a valid email address.";
      }
    }

    // STEP 3
    if (step === 2 && includePassword) {
      if (!formData.password) {
        errors.password = "Password is required.";
      } else if (
        formData.password.length < 8 ||
        !/[A-Z]/.test(formData.password) ||
        !/[a-z]/.test(formData.password) ||
        !/\d/.test(formData.password) ||
        !/[^A-Za-z0-9]/.test(formData.password)
      ) {
        errors.password =
          "Use 8+ characters with uppercase, lowercase, number, and symbol.";
      }

      if (!formData.password_confirmation) {
        errors.password_confirmation = "Please confirm your password.";
      } else if (
        formData.password &&
        formData.password_confirmation !== formData.password
      ) {
        errors.password_confirmation = "Passwords do not match.";
      }
    }

    setFieldErrors(errors);

    return Object.keys(errors).length === 0;
  };

  const nextStep = () => {
    setError("");
    setFieldErrors({});

    if (step === 1) {
      setPasswordValidationAttempted(false);
      setFieldErrors((current) => ({
        ...current,
        password: "",
        password_confirmation: "",
      }));
    }

    if (!validateStep()) return;

    if (step === 1) {
      setFieldErrors({});
    }

    setStep((current) => Math.min(current + 1, formSteps.length - 1));
  };

  const previousStep = () => {
    setError("");
    setFieldErrors({});
    setPasswordValidationAttempted(false);
    setFieldErrors((current) => ({
      ...current,
      password: "",
      password_confirmation: "",
    }));

    setStep((current) => Math.max(current - 1, 0));
  };

  const acceptConsent = () => {
    if (consentType === "privacy") {
      setConsentAccepted(true);
    }

    if (consentType === "terms") {
      setTermsAccepted(true);
    }

    setShowConsent(false);
    setConsentType(null);
    setError("");
  };

  const submit = async (event) => {
    event.preventDefault();

    // Never validate or submit unless the user is on the final step.
    // This prevents an early submit (e.g. pressing Enter, or the
    // Continue click being treated as a submit) from triggering
    // password validation on the first open of step 3.
    if (step !== formSteps.length - 1) return;

    setError("");

    // Password errors are allowed to appear only after
    // the user clicks "Create Account"
    setPasswordValidationAttempted(true);

    if (!validateStep({ includePassword: true })) return;

    if (!consentAccepted || !termsAccepted) {
      setError(
        "Please agree to both the Data Privacy Consent and Terms & Conditions.",
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:8000/api/register", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        const registryMismatch = Boolean(data.errors?.registry);
        const responseError = registryMismatch
          ? "You are not registered in our barangay. Please contact the barangay office or email barangay@tugonbarangay.gov.ph for assistance."
          : data.errors
            ? Object.values(data.errors)[0][0]
            : data.message || "Registration failed.";

        setError(responseError);

        if (registryMismatch) {
          window.setTimeout(() => {
            setStep(0);
            setFieldErrors({});
            setPasswordValidationAttempted(false);
            setError("");
          }, 10000);
        }

        return;
      }

      setMessage(data.message);

      setTimeout(() => {
        navigate("/login");
      }, 1400);
    } catch {
      setError("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  const currentStep = formSteps[step];
  const showPasswordErrors = step === 2 && passwordValidationAttempted;

  return (
    <div className="min-h-screen w-full bg-[#F4F7FB] lg:flex">
      {/* =====================================================
          LEFT PANEL
      ====================================================== */}
      {/* LEFT BRANDING PANEL */}
      <aside className="relative hidden min-h-screen overflow-hidden bg-[#071B3D] lg:flex lg:w-[38%] xl:w-[40%]">
        {/* Background Image */}
        <div
          className="
            absolute inset-0
            bg-cover bg-center
          "
          style={{
            backgroundImage: "url('/images/Registration_2.jpg')",
            backgroundPosition: "60% 20%",
          }}
        />

        {/* Navy Overlay */}
        <div
          className="
            absolute inset-0
            bg-[#071B3D]/65
          "
        />

        {/* Blue / Navy / Red Gradient */}
        <div
          className="
            absolute inset-0
            bg-gradient-to-br
            from-[#123F70]/90
            via-[#142F8A]/75
            to-[#7A2335]/45
          "
        />

        {/* Bottom Fade */}
        <div
          className="
            absolute inset-x-0 bottom-0
            h-[35%]
            bg-gradient-to-t
            from-[#061432]/90
            via-[#061432]/35
            to-transparent
          "
        />

        {/* Blue Light */}
        <div
          className="
            pointer-events-none
            absolute -left-32 top-1/3
            h-72 w-72
            rounded-full
            bg-[#2455D6]/20
            blur-[100px]
          "
        />

        {/* Red Light */}
        <div
          className="
            pointer-events-none
            absolute -right-32 top-1/4
            h-72 w-72
            rounded-full
            bg-[#D7272A]/10
            blur-[100px]
          "
        />

        {/* Tech Grid */}
        <div
          className="
            pointer-events-none
            absolute inset-0
            opacity-[0.2]
          "
          style={{
            backgroundImage: `
              linear-gradient(
                rgba(255,255,255,0.15) 1px,
                transparent 1px
              ),
              linear-gradient(
                90deg,
                rgba(255,255,255,0.15) 1px,
                transparent 1px
              )
            `,
            backgroundSize: "70px 70px",
            maskImage:
              "linear-gradient(to bottom, black 0%, black 60%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, black 0%, black 60%, transparent 100%)",
          }}
        />
        {/* Content */}
        <div className="relative z-10 flex min-h-screen w-full flex-col px-10 py-7">
          {/* Logos */}
          <div className="flex justify-center items-center gap-5">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10 p-4">
              <img
                src="/images/logo-white-version.png"
                alt="TugonBarangay"
                className="max-h-full max-w-full object-contain"
              />
            </div>

            <div className="h-12 w-px bg-white/20" />

            <img
              src="/images/consolacion-logo.png"
              alt="Municipality of Consolacion"
              className="h-20 w-20 rounded-full object-contain"
            />
          </div>

          {/* Branding */}
          <div className="mt-9 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-blue-200">
              Barangay Citizen Portal
            </p>

            <h1 className="mt-3 text-4xl font-black tracking-tight">
              <span className="text-white">Tugon</span>
              <span className="text-[#F04A51]">Barangay</span>
            </h1>

            <p className="mt-1 text-xs font-bold uppercase tracking-[0.27em] text-white/80">
              Citizen Services
            </p>

            <div className="mx-auto mt-5 h-px w-20 bg-gradient-to-r from-[#2455D6] to-[#F04A51]" />

            <p className="mx-auto mt-6 max-w-sm text-sm leading-6 text-blue-100">
              Create your official citizen account to access TugonBarangay
              services online.
            </p>
          </div>

          {/* Registration Progress */}
          <div className="mt-9 space-y-2">
            {formSteps.map((item, index) => {
              const active = index === step;
              const complete = index < step;

              return (
                <div
                  key={item.label}
                  className={`flex items-center gap-4 rounded-xl px-4 py-3 transition-all ${
                    active ? "border border-white/10 bg-white/15 shadow-lg" : ""
                  }`}
                >
                  {/* Number / check */}
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      complete
                        ? "bg-[#2455D6] text-white"
                        : active
                          ? "bg-white text-[#2455D6]"
                          : "bg-white/10 text-white/40"
                    }`}
                  >
                    {complete ? "✓" : index + 1}
                  </div>

                  {/* Label */}
                  <span
                    className={`text-sm font-semibold ${
                      active
                        ? "text-white"
                        : complete
                          ? "text-blue-100"
                          : "text-white/40"
                    }`}
                  >
                    {item.label}
                  </span>

                  {/* Active indicator */}
                  {active && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#F04A51]" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="mt-auto border-t border-white/15 pt-5 text-center text-[10px] text-blue-200/70">
            © 2026 TugonBarangay · All rights reserved
          </div>
        </div>
      </aside>

      {/* =====================================================
          RIGHT CONTENT
      ====================================================== */}
      <main className="flex min-h-screen w-full items-start justify-center overflow-y-auto px-5 py-8 sm:px-10 lg:w-[62%] lg:px-14 lg:py-12 xl:px-20">
        <div className="w-full max-w-[780px]">
          {/* Header */}
          <div className="mb-8">
            <div className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#41658A]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#F04A51]" />
              Step {step + 1} of {formSteps.length}
            </div>

            <div className="flex items-start justify-between gap-5">
              <div>
                <h2 className="text-[30px] font-bold tracking-tight text-[#142A46] sm:text-[36px]">
                  {currentStep.title}
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  {currentStep.description}
                </p>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Success */}
          {message && (
            <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {message}
            </div>
          )}

          {/* =================================================
              FORM CARD
          ================================================== */}
          <form onSubmit={submit} noValidate className="p-0">
            {/* STEP 1 */}
            {step === 0 && (
              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="First name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={update}
                  error={fieldErrors.first_name}
                  required
                  placeholder="e.g. James"
                />

                <Field
                  label="Middle name"
                  name="middle_name"
                  value={formData.middle_name}
                  onChange={update}
                  placeholder="e.g. Mantos"
                />

                <Field
                  label="Last name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={update}
                  error={fieldErrors.last_name}
                  required
                  placeholder="e.g. Songalia"
                />

                <Field
                  label="Suffix"
                  name="suffix"
                  value={formData.suffix}
                  onChange={update}
                  placeholder="Jr., Sr., III..."
                />

                <Field
                  label="Date of birth"
                  name="date_of_birth"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={update}
                  error={fieldErrors.date_of_birth}
                  required
                />

                <Field
                  label="Sex"
                  name="sex"
                  type="select"
                  value={formData.sex}
                  onChange={update}
                  error={fieldErrors.sex}
                  required
                />
              </div>
            )}

            {/* STEP 2 */}
            {step === 1 && (
              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="Purok"
                  name="purok"
                  type="select"
                  value={formData.purok}
                  onChange={update}
                  error={fieldErrors.purok}
                  required
                />

                <Field
                  label="House no. / street"
                  name="address"
                  value={formData.address}
                  onChange={update}
                  placeholder="e.g. 123 Main Street"
                />

                <Field
                  label="Mobile number"
                  name="mobile_number"
                  type="tel"
                  inputMode="numeric"
                  maxLength={11}
                  placeholder="09XXXXXXXXX"
                  value={formData.mobile_number}
                  onChange={update}
                  error={fieldErrors.mobile_number}
                  required
                />

                <Field
                  label="Email address"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={update}
                  error={fieldErrors.email}
                  placeholder="you@example.com"
                  required
                />
              </div>
            )}

            {/* STEP 3 */}
            {step === 2 && (
              <div className="space-y-5">
                <Field
                  label="Password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={update}
                  error={showPasswordErrors ? fieldErrors.password : ""}
                  placeholder="Create a strong password"
                  required
                />

                <Field
                  label="Confirm password"
                  name="password_confirmation"
                  type="password"
                  value={formData.password_confirmation}
                  onChange={update}
                  error={
                    showPasswordErrors ? fieldErrors.password_confirmation : ""
                  }
                  placeholder="Re-enter your password"
                  required
                />

                <p className="-mt-2 text-xs leading-5 text-slate-500">
                  Use at least 8 characters with an uppercase letter, lowercase
                  letter, number, and special character.
                </p>

                {/* Consent Section */}
                <div className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 bg-slate-50 px-5 py-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#41658A]">
                      Required agreements
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Review each document and confirm your consent before
                      creating an account.
                    </p>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {/* Data Privacy Consent */}
                    <div className="flex items-center justify-between gap-4 px-5 py-4">
                      <label className="flex min-w-0 cursor-pointer items-start gap-3">
                        <input
                          type="checkbox"
                          checked={consentAccepted}
                          onChange={(e) => setConsentAccepted(e.target.checked)}
                          className="mt-1 h-4 w-4 accent-[#2455D6]"
                        />

                        <span className="text-sm leading-5 text-slate-700">
                          I have read and agree to the{" "}
                          <span className="font-semibold text-[#172B4D]">
                            Data Privacy Consent
                          </span>
                        </span>
                      </label>

                      <button
                        type="button"
                        onClick={() => {
                          setConsentType("privacy");
                          setShowConsent(true);
                        }}
                        className="shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-[#2455D6] transition hover:border-[#2455D6] hover:bg-blue-50"
                      >
                        View details
                      </button>
                    </div>

                    {/* Terms & Conditions */}
                    <div className="flex items-center justify-between gap-4 px-5 py-4">
                      <label className="flex min-w-0 cursor-pointer items-start gap-3">
                        <input
                          type="checkbox"
                          checked={termsAccepted}
                          onChange={(e) => setTermsAccepted(e.target.checked)}
                          className="mt-1 h-4 w-4 accent-[#2455D6]"
                        />

                        <span className="text-sm leading-5 text-slate-700">
                          I have read and agree to the{" "}
                          <span className="font-semibold text-[#172B4D]">
                            Terms & Conditions
                          </span>
                        </span>
                      </label>

                      <button
                        type="button"
                        onClick={() => {
                          setConsentType("terms");
                          setShowConsent(true);
                        }}
                        className="shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-[#2455D6] transition hover:border-[#2455D6] hover:bg-blue-50"
                      >
                        View details
                      </button>
                    </div>
                  </div>
                </div>

                {/* Status */}
                {consentAccepted && termsAccepted && (
                  <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs text-white">
                      ✓
                    </span>

                    <span>All required agreements have been accepted.</span>
                  </div>
                )}
              </div>
            )}

            {/* FORM ACTIONS */}
            <div className="mt-8 flex items-center gap-3 border-t border-slate-200 pt-6">
              {/* Back Button */}
              {step > 0 ? (
                <button
                  type="button"
                  onClick={previousStep}
                  disabled={loading}
                  className="flex h-14 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="text-lg">←</span>
                  Back
                </button>
              ) : (
                <div className="w-0" />
              )}

              {/* Continue / Submit Button
                  Each button has a unique key so React mounts a brand-new
                  element instead of reusing the same DOM button and just
                  flipping its type from "button" to "submit". */}
              {step < formSteps.length - 1 ? (
                <button
                  key="continue-button"
                  type="button"
                  onClick={nextStep}
                  className="flex h-14 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2455D6] via-[#4A3FD1] to-[#E52F3F] text-sm font-bold text-white shadow-md transition hover:brightness-105"
                >
                  Continue
                  <span className="text-lg">→</span>
                </button>
              ) : (
                <button
                  key="submit-button"
                  type="submit"
                  disabled={loading}
                  className="flex h-14 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2455D6] via-[#4A3FD1] to-[#E52F3F] text-sm font-bold text-white shadow-md transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Creating account..." : "Create Account"}
                  {!loading && <span className="text-lg">→</span>}
                </button>
              )}
            </div>
          </form>

          {/* Login footer */}
          <div className="mt-7 border-t border-slate-200 pt-6 text-center">
            <p className="text-sm text-slate-500">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="font-bold text-[#2455D6] hover:underline"
              >
                Login
              </button>
            </p>

            <div className="mt-5 flex items-center justify-center gap-2 text-xs text-slate-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-4 w-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3z"
                />
              </svg>

              <span>Secured by the BSIT 4B Group 4 Students</span>
            </div>
          </div>

          {/* Mobile footer */}
          <div className="mt-6 text-center text-xs text-slate-400 lg:hidden">
            © 2026 TugonBarangay · All rights reserved
          </div>
        </div>
      </main>

      {showConsent && (
        <ConsentModal
          type={consentType}
          accepted={consentType === "privacy" ? consentAccepted : termsAccepted}
          onAccept={acceptConsent}
          onClose={() => {
            setShowConsent(false);
            setConsentType(null);
          }}
        />
      )}
    </div>
  );
}

/* ============================================================
   FIELD COMPONENT
============================================================ */

function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  error,
  required,
  ...props
}) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      {label}

      {required && <span className="text-red-500"> *</span>}

      {type === "select" ? (
        <select
          name={name}
          value={value}
          onChange={onChange}
          className={`mt-2 h-14 w-full rounded-2xl border bg-[#FBFCFE] px-4 font-normal outline-none transition focus:border-[#2455D6] focus:bg-white focus:ring-4 focus:ring-[#2455D6]/10 ${
            error ? "border-red-300" : "border-slate-200"
          }`}
          {...props}
        >
          <option value="">Select {label.toLowerCase()}</option>

          {name === "sex" ? (
            <>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </>
          ) : (
            <>
              {[1, 2, 3, 4, 5].map((item) => (
                <option key={item} value={`Purok ${item}`}>
                  Purok {item}
                </option>
              ))}
            </>
          )}
        </select>
      ) : (
        <input
          name={name}
          value={value}
          onChange={onChange}
          type={type}
          className={`mt-2 h-14 w-full rounded-2xl border bg-[#FBFCFE] px-4 font-normal outline-none transition focus:border-[#2455D6] focus:bg-white focus:ring-4 focus:ring-[#2455D6]/10 ${
            error ? "border-red-300" : "border-slate-200"
          }`}
          {...props}
        />
      )}

      {error && (
        <span className="mt-1 block text-xs font-normal text-red-600">
          {error}
        </span>
      )}
    </label>
  );
}

/* ============================================================
   CONSENT MODAL
============================================================ */

function ConsentModal({ type, accepted, onAccept, onClose }) {
  const isPrivacy = type === "privacy";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#071B3D]/65 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* HEADER */}
        <div className="flex items-start justify-between border-b border-slate-100 p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#2455D6]">
              Review
            </p>

            <h2 className="mt-1 text-2xl font-bold text-[#172B4D]">
              {isPrivacy ? "Data Privacy Consent" : "Terms & Conditions"}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Please review the details before accepting.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* CONTENT */}
        <div className="overflow-y-auto p-6 text-sm leading-6 text-slate-600">
          {isPrivacy ? (
            <>
              <h3 className="font-bold text-[#172B4D]">Data Privacy Consent</h3>

              <p className="mt-3">
                I consent to the collection, storage, and processing of the
                personal information I provide through TugonBarangay.
              </p>

              <p className="mt-4">
                The information collected will be used for resident verification
                and legitimate barangay services. Authorized barangay personnel
                may review the information provided for verification and service
                processing purposes.
              </p>

              <p className="mt-4">
                I understand that my personal information will be handled in
                accordance with applicable data privacy policies and
                regulations.
              </p>
            </>
          ) : (
            <>
              <h3 className="font-bold text-[#172B4D]">Terms & Conditions</h3>

              <p className="mt-3">
                I confirm that the information I provide during registration is
                accurate and belongs to me.
              </p>

              <p className="mt-4">
                I agree to use TugonBarangay only for legitimate
                barangay-related transactions and services.
              </p>

              <p className="mt-4">
                I understand that my account may require verification before I
                can request documents or access certain resident services.
              </p>

              <p className="mt-4">
                I agree not to provide false information or use the system for
                unauthorized or unlawful purposes.
              </p>
            </>
          )}

          {/* CHECKBOX */}
          <label className="mt-7 flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:bg-slate-100">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(event) => {
                if (event.target.checked) {
                  onAccept();
                }
              }}
              className="mt-1 h-4 w-4 accent-[#2455D6]"
            />

            <span className="text-sm text-slate-700">
              I have read and agree to the{" "}
              <span className="font-semibold text-[#172B4D]">
                {isPrivacy ? "Data Privacy Consent" : "Terms & Conditions"}
              </span>
              .
            </span>
          </label>
        </div>

        {/* FOOTER */}
        <div className="flex justify-end gap-3 border-t border-slate-100 p-6">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onAccept}
            disabled={!accepted}
            className="rounded-xl bg-[#2455D6] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#1d47b5] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Accept and return
          </button>
        </div>
      </div>
    </div>
  );
}

export default Register;
