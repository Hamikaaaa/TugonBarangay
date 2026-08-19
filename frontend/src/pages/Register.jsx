import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

function Register() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);

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

    profile_photo: null,
  });

  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [photoPreview, setPhotoPreview] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const videoRef = useRef(null);
  const cameraStreamRef = useRef(null);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [activeTab, setActiveTab] = useState("privacy");
  const [privacyRead, setPrivacyRead] = useState(false);
  const [termsRead, setTermsRead] = useState(false);

  const steps = [
    { label: "Privacy", icon: "shield" },
    { label: "Personal Info", icon: "user" },
    { label: "Your Photo", icon: "camera" },
    { label: "Address", icon: "pin" },
    { label: "Account Setup", icon: "lock" },
  ];

  /* =========================================================
     FORM HANDLERS
  ========================================================== */

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
    setFieldErrors((previous) => ({
      ...previous,
      [name]: "",
    }));
  };

  const handlePhotoFile = (file, inputElement) => {
    setError("");
    setFieldErrors((previous) => ({
      ...previous,
      profile_photo: "",
    }));

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];

    if (!allowedTypes.includes(file.type)) {
      setError("Please select a JPG, JPEG, or PNG image.");
      if (inputElement) inputElement.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Profile photo must not be larger than 5 MB.");
      if (inputElement) inputElement.value = "";
      return;
    }

    setFormData((previous) => ({
      ...previous,
      profile_photo: file,
    }));

    const previewUrl = URL.createObjectURL(file);
    setPhotoPreview(previewUrl);
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];

    if (file) handlePhotoFile(file, e.target);
  };

  const closeCamera = () => {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    setCameraOpen(false);
  };

  const openCamera = async () => {
    setError("");

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera access is not available in this browser.");
      return;
    }

    try {
      cameraStreamRef.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      setCameraOpen(true);
    } catch {
      setError(
        "Camera access was blocked. Please allow camera permission or upload a photo instead.",
      );
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;

    if (!video?.videoWidth || !video.videoHeight) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;

        handlePhotoFile(
          new File([blob], "profile-photo.jpg", { type: "image/jpeg" }),
        );
        closeCamera();
      },
      "image/jpeg",
      0.9,
    );
  };

  useEffect(() => {
    if (!cameraOpen || !videoRef.current || !cameraStreamRef.current) return;

    videoRef.current.srcObject = cameraStreamRef.current;
  }, [cameraOpen]);

  useEffect(() => closeCamera, []);

  /* =========================================================
     STEP NAVIGATION
  ========================================================== */

  const nextStep = () => {
    setError("");
    setFieldErrors({});

    if (step === 1) {
      if (!privacyAccepted || !termsAccepted) {
        setError(
          "Please read and accept both the Data Privacy Notice and Terms & Conditions.",
        );
        return;
      }
    }

    if (step === 2) {
      const errors = {};

      if (!formData.first_name) errors.first_name = "First name is required.";
      if (!formData.last_name) errors.last_name = "Last name is required.";
      if (!formData.date_of_birth)
        errors.date_of_birth = "Date of birth is required.";
      if (!formData.sex) errors.sex = "Please select your sex.";

      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        return;
      }
    }

    if (step === 3) {
      if (!formData.profile_photo) {
        setFieldErrors({ profile_photo: "Profile photo is required." });
        setError("Please upload your profile photo.");
        return;
      }
    }

    if (step === 4) {
      const errors = {};

      if (!formData.purok) errors.purok = "Purok is required.";
      if (!formData.mobile_number)
        errors.mobile_number = "Mobile number is required.";
      if (!formData.email) errors.email = "Email address is required.";

      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        return;
      }
    }

    if (step < steps.length) {
      setStep((previous) => previous + 1);
    }
  };

  const previousStep = () => {
    setError("");
    setFieldErrors({});

    if (step > 1) {
      setStep((previous) => previous - 1);
    }
  };

  /* =========================================================
     SUBMIT
  ========================================================== */

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setFieldErrors({});
    setMessage("");

    if (!privacyAccepted || !termsAccepted) {
      setError(
        "You must accept the Data Privacy Notice and Terms & Conditions.",
      );
      setStep(1);
      return;
    }

    if (!formData.profile_photo) {
      setFieldErrors({ profile_photo: "Profile photo is required." });
      setError("Please upload your profile photo.");
      setStep(3);
      return;
    }

    if (formData.password.length < 8) {
      setFieldErrors({ password: "Password must be at least 8 characters." });
      setError("Password must be at least 8 characters.");
      return;
    }

    if (formData.password !== formData.password_confirmation) {
      setFieldErrors({
        password_confirmation: "Passwords do not match.",
      });
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const form = new FormData();

      form.append("first_name", formData.first_name);
      form.append("middle_name", formData.middle_name);
      form.append("last_name", formData.last_name);
      form.append("suffix", formData.suffix);

      form.append("date_of_birth", formData.date_of_birth);
      form.append("sex", formData.sex);

      form.append("purok", formData.purok);
      form.append("address", formData.address);

      form.append("mobile_number", formData.mobile_number);
      form.append("email", formData.email);

      form.append("password", formData.password);
      form.append("password_confirmation", formData.password_confirmation);

      form.append("profile_photo", formData.profile_photo);

      const response = await fetch("http://127.0.0.1:8000/api/register", {
        method: "POST",
        headers: {
          Accept: "application/json",
        },
        body: form,
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Registration error:", data);

        if (data.errors) {
          const firstError = Object.values(data.errors)[0]?.[0];

          setError(firstError || "Registration failed.");
        } else {
          setError(data.message || "Registration failed.");
        }

        return;
      }

      console.log("Registration response:", data);

      setMessage("Registration successful!");

      setTimeout(() => {
        navigate("/login");
      }, 1000);
    } catch (error) {
      console.error("Registration request failed:", error);

      setError("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#F5F7FB]">
      {/* =========================================================
          LEFT PANEL — TUGONBARANGAY BRANDING
      ========================================================== */}

      <section
        className="
          relative hidden
          h-screen min-h-0
          shrink-0 overflow-hidden
          lg:flex lg:w-[43%]
          xl:w-[40%]
          bg-[#081B3A]
        "
      >
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

        {/* LEFT CONTENT */}

        <div
          className="
            relative z-10
            flex h-full w-full
            min-h-0 flex-col
            items-center
            overflow-hidden
            px-8 py-6
            xl:px-12
          "
        >
          {/* Logos */}

          <div className="flex shrink-0 items-center justify-center gap-5">
            <div
              className="
                flex h-[75px] w-[75px]
                items-center justify-center
                rounded-2xl
                bg-white/[0.06]
                p-2
                ring-1 ring-white/10
                shadow-[0_15px_35px_rgba(0,0,0,0.35)]
                backdrop-blur-sm
              "
            >
              <img
                src="/images/logo-white-version.png"
                alt="TugonBarangay"
                className="
                  h-full w-full
                  object-contain
                  drop-shadow-[0_8px_8px_rgba(0,0,0,0.45)]
                "
              />
            </div>

            <div className="h-12 w-px bg-white/15" />

            <div
              className="
                flex h-[82px] w-[82px]
                items-center justify-center
                rounded-full
                bg-white/[0.06]
                p-1.5
                ring-1 ring-white/10
                shadow-[0_15px_35px_rgba(0,0,0,0.35)]
                backdrop-blur-sm
              "
            >
              <img
                src="/images/consolacion-logo.png"
                alt="Barangay"
                className="
                  h-[68px] w-[68px]
                  object-contain
                  drop-shadow-[0_8px_8px_rgba(0,0,0,0.45)]
                "
              />
            </div>
          </div>

          {/* Branding */}

          <div className="mt-8 shrink-0 text-center">
            <p
              className="
                text-[9px]
                font-bold uppercase
                tracking-[0.32em]
                text-[#78AFFF]
              "
            >
              BARANGAY CITIZEN PORTAL
            </p>

            <h1
              className="
                mt-1
                text-3xl
                font-extrabold
                tracking-tight
                text-white
                xl:text-[40px]
              "
            >
              Tugon<span className="text-[#E85A5D]">Barangay</span>
            </h1>

            <p
              className="
                mt-0.5
                text-[10px]
                font-bold uppercase
                tracking-[0.3em]
                text-white/65
              "
            >
              CITIZEN SERVICES
            </p>

            <div className="relative mx-auto mt-4 flex w-[90px] items-center justify-center">
              <div
                className="
                  absolute inset-x-0 h-3
                  rounded-full
                  bg-gradient-to-r
                  from-[#2455D6]
                  via-[#E85A5D]
                  to-[#2455D6]
                  opacity-40 blur-md
                "
              />

              <div
                className="
                  relative h-[2px] w-full
                  rounded-full
                  bg-gradient-to-r
                  from-[#2455D6]
                  via-[#E85A5D]
                  to-[#2455D6]
                "
              />
            </div>
          </div>

          {/* Description */}

          <div className="mt-5 max-w-sm shrink-0 text-center">
            <p className="text-[13px] leading-6 text-white/70">
              Create your official citizen account to access
              <br />
              TugonBarangay services online.
            </p>
          </div>

          {/* Progress */}

          <div className="mt-7 w-full max-w-md">
            <div className="space-y-1.5">
              {steps.map((s, index) => {
                const stepNumber = index + 1;
                const completed = stepNumber < step;
                const active = stepNumber === step;

                return (
                  <div
                    key={s.label}
                    className={`
                      flex h-[50px]
                      items-center gap-3
                      rounded-xl px-4
                      transition-all duration-300
                      ${
                        active
                          ? `
                            bg-white/[0.13]
                            ring-1 ring-white/15
                            shadow-[0_8px_25px_rgba(0,0,0,0.18)]
                            backdrop-blur-md
                          `
                          : "bg-transparent"
                      }
                    `}
                  >
                    <div
                      className={`
                        flex h-8 w-8 shrink-0
                        items-center justify-center
                        rounded-full
                        text-[11px] font-bold
                        ${
                          completed
                            ? "bg-[#2455D6] text-white"
                            : active
                              ? "bg-white text-[#142F8A] shadow-md"
                              : "bg-white/[0.08] text-white/30"
                        }
                      `}
                    >
                      {completed ? (
                        <Icon name="check" className="h-3.5 w-3.5" />
                      ) : (
                        stepNumber
                      )}
                    </div>

                    <Icon
                      name={s.icon}
                      className={`
                        h-4 w-4 shrink-0
                        ${
                          active
                            ? "text-[#78AFFF]"
                            : completed
                              ? "text-white/50"
                              : "text-white/25"
                        }
                      `}
                    />

                    <p
                      className={`
                        flex-1 text-[13px] font-semibold
                        ${
                          active
                            ? "text-white"
                            : completed
                              ? "text-white/55"
                              : "text-white/30"
                        }
                      `}
                    >
                      {s.label}
                    </p>

                    {active && (
                      <span
                        className={`
                          h-1.5 w-1.5
                          rounded-full
                          bg-[#E85A5D]
                          shadow-[0_0_10px_rgba(232,90,93,0.8)]
                        `}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}

          <div className="mt-auto w-full shrink-0 border-t border-white/10 pt-4 text-center">
            <p className="text-[10px] text-white/35">
              © 2026 TugonBarangay · All rights reserved
            </p>
          </div>
        </div>
      </section>

      {/* =========================================================
          RIGHT PANEL
      ========================================================== */}

      <section
        className="
          flex h-screen w-full
          overflow-y-auto
          bg-[#F8FAFD]
          px-5 py-6
          sm:px-8 sm:py-8
          lg:w-[57%] lg:px-12 lg:py-8
          xl:w-[60%] xl:px-20 xl:py-10
        "
      >
        <div className="mx-auto w-full max-w-2xl">
          {/* Mobile Logo */}

          <div className="mb-7 flex items-center gap-2 lg:hidden">
            <div
              className="
                flex h-12 w-12
                items-center justify-center
                rounded-xl bg-white
                shadow-sm ring-1 ring-slate-200
              "
            >
              <img
                src="/images/logo-blue-version.png"
                alt="TugonBarangay Logo"
                className="h-10 w-10 object-contain"
              />
            </div>

            <div>
              <h1 className="text-xl font-bold tracking-tight text-[#123F70]">
                Tugon
                <span className="text-[#EF4444]">Barangay</span>
              </h1>

              <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Barangay Citizen Portal
              </p>
            </div>
          </div>

          {/* Mobile Progress */}

          <div className="mb-8 lg:hidden">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Step {step} of {steps.length}
              </span>

              <span className="text-[10px] font-semibold text-[#2455D6]">
                {steps[step - 1].label}
              </span>
            </div>

            <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
              <div
                className="
                  h-full rounded-full
                  bg-gradient-to-r
                  from-[#2455D6] to-[#EF4444]
                  transition-all duration-500
                "
                style={{
                  width: `${(step / steps.length) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* Header */}

          <div className="mb-8">
            <div className="mb-3 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#EF4444]" />

              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#41658A]">
                Step {step} of {steps.length}
              </p>
            </div>

            <h2 className="text-3xl font-bold tracking-tight text-[#142A46] sm:text-[34px]">
              {step === 1 && "Privacy & Terms of Use"}
              {step === 2 && "Personal Information"}
              {step === 3 && "Your Photo"}
              {step === 4 && "Address & Contact"}
              {step === 5 && "Secure Your Account"}
            </h2>

            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
              {step === 1 &&
                "Please read and accept the following before creating your citizen account."}

              {step === 2 &&
                "Tell us about yourself so we can verify your identity."}

              {step === 3 &&
                "Upload a clear profile photo for your citizen account."}

              {step === 4 &&
                "Provide your current barangay address and contact information."}

              {step === 5 &&
                "Create a password and review your information before submitting."}
            </p>
          </div>

          {/* Messages */}

          {error && (
            <div
              className="
                mb-6 flex items-start gap-3
                rounded-2xl border border-red-200
                bg-red-50 px-4 py-3.5
                shadow-sm
              "
            >
              <div
                className="
                  mt-0.5 flex h-5 w-5 shrink-0
                  items-center justify-center
                  rounded-full bg-red-100
                  text-xs font-bold text-red-600
                "
              >
                !
              </div>

              <p className="text-sm leading-5 text-red-700">{error}</p>
            </div>
          )}

          {message && (
            <div
              className="
                mb-6 flex items-start gap-3
                rounded-2xl border border-green-200
                bg-green-50 px-4 py-3.5
                shadow-sm
              "
            >
              <div
                className="
                  mt-0.5 flex h-5 w-5 shrink-0
                  items-center justify-center
                  rounded-full bg-green-100
                  text-xs font-bold text-green-600
                "
              >
                ✓
              </div>

              <p className="text-sm text-green-700">{message}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* =================================================
              STEP 1 — PRIVACY & TERMS
          ================================================== */}

            {step === 1 && (
              <div>
                {/* Tabs */}

                <div
                  className="
                  flex overflow-hidden
                  rounded-2xl
                  border border-slate-200
                  bg-[#F8FAFD]
                  p-1
                "
                >
                  <button
                    type="button"
                    onClick={() => setActiveTab("privacy")}
                    className={`
                    flex flex-1
                    items-center justify-center
                    gap-2 rounded-xl
                    px-3 py-2.5
                    text-xs font-bold
                    transition-all
                    ${
                      activeTab === "privacy"
                        ? "bg-white text-[#2455D6] shadow-sm ring-1 ring-slate-200"
                        : "text-slate-400 hover:text-slate-600"
                    }
                  `}
                  >
                    <Icon name="shield" className="h-3.5 w-3.5" />

                    <span>Data Privacy Notice</span>

                    {privacyAccepted && (
                      <Icon
                        name="check-circle"
                        className={`
                        h-3.5 w-3.5
                        ${
                          activeTab === "privacy"
                            ? "text-[#2455D6]"
                            : "text-slate-300"
                        }
                      `}
                      />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("terms")}
                    className={`
                    flex flex-1
                    items-center justify-center
                    gap-2 rounded-xl
                    px-3 py-2.5
                    text-xs font-bold
                    transition-all
                    ${
                      activeTab === "terms"
                        ? "bg-white text-[#EF4444] shadow-sm ring-1 ring-slate-200"
                        : "text-slate-400 hover:text-slate-600"
                    }
                  `}
                  >
                    <Icon name="file-text" className="h-3.5 w-3.5" />

                    <span>Terms & Conditions</span>

                    {termsAccepted && (
                      <Icon
                        name="check-circle"
                        className={`
                        h-3.5 w-3.5
                        ${
                          activeTab === "terms"
                            ? "text-[#EF4444]"
                            : "text-slate-300"
                        }
                      `}
                      />
                    )}
                  </button>
                </div>

                {/* Content Card */}

                <div
                  className="
                  mt-4 overflow-hidden
                  rounded-2xl
                  border border-slate-200
                  bg-white
                  shadow-[0_10px_30px_rgba(15,40,70,0.05)]
                "
                >
                  {/* Card Header */}

                  <div
                    className="
                    flex items-center justify-between
                    border-b border-slate-100
                    px-5 py-3
                  "
                  >
                    <p
                      className={`
                      text-[10px] font-bold
                      uppercase tracking-[0.16em]
                      ${
                        activeTab === "privacy"
                          ? "text-[#2455D6]"
                          : "text-[#EF4444]"
                      }
                    `}
                    >
                      {activeTab === "privacy"
                        ? "Data Privacy Notice"
                        : "Terms & Conditions"}
                    </p>

                    {(activeTab === "privacy" ? privacyRead : termsRead) && (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
                        <Icon name="check-circle" className="h-3 w-3" />
                        Read
                      </span>
                    )}
                  </div>

                  {/* Scrollable Document */}

                  <div
                    onScroll={(e) => {
                      const el = e.target;

                      const reachedEnd =
                        el.scrollTop + el.clientHeight >= el.scrollHeight - 16;

                      if (!reachedEnd) return;

                      if (activeTab === "privacy") {
                        setPrivacyRead(true);
                      } else {
                        setTermsRead(true);
                      }
                    }}
                    className="
                    max-h-64
                    overflow-y-auto
                    px-5 py-5
                    text-[12px]
                    leading-5
                    text-slate-600
                  "
                  >
                    {/* =================================================
                      DATA PRIVACY NOTICE
                  ================================================== */}

                    {activeTab === "privacy" ? (
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm font-bold text-[#172B4D]">
                            Data Privacy Notice and Consent
                          </p>

                          <p className="mt-0.5 text-[10px] text-slate-400">
                            TugonBarangay Citizen Portal
                          </p>
                        </div>

                        <p>
                          TugonBarangay is committed to protecting the privacy
                          and security of the personal information of residents
                          and users of the barangay service system. This Data
                          Privacy Notice explains how your personal information
                          is collected, used, stored, protected, and processed
                          when you create and use your TugonBarangay citizen
                          account.
                        </p>

                        <div>
                          <p className="text-[12px] font-bold text-[#172B4D]">
                            1. Information We Collect
                          </p>

                          <p className="mt-1">
                            When you register for an account, TugonBarangay may
                            collect the following information:
                          </p>

                          <ul className="mt-1.5 list-disc space-y-0.5 pl-4">
                            <li>First name, middle name, and last name</li>
                            <li>Suffix, when applicable</li>
                            <li>Date of birth</li>
                            <li>Sex</li>
                            <li>Purok and residential address</li>
                            <li>Mobile number</li>
                            <li>Email address</li>
                            <li>Profile photograph</li>
                            <li>Account login credentials</li>
                          </ul>
                        </div>

                        <div>
                          <p className="text-[12px] font-bold text-[#172B4D]">
                            2. Purpose of Processing
                          </p>

                          <p className="mt-1">
                            Your personal information is collected and processed
                            for legitimate barangay-related purposes, including:
                          </p>

                          <ul className="mt-1.5 list-disc space-y-0.5 pl-4">
                            <li>Creating and managing your citizen account;</li>
                            <li>
                              Verifying your identity and residency when
                              necessary;
                            </li>
                            <li>
                              Processing online barangay service requests;
                            </li>
                            <li>Managing document and service requests;</li>
                            <li>
                              Managing complaints, concerns, and inquiries;
                            </li>
                            <li>
                              Sending service-related notifications and updates;
                            </li>
                            <li>
                              Maintaining accurate records of barangay
                              transactions;
                            </li>
                            <li>
                              Improving the delivery and accessibility of
                              barangay services.
                            </li>
                          </ul>
                        </div>

                        <div>
                          <p className="text-[12px] font-bold text-[#172B4D]">
                            3. Lawful and Responsible Processing
                          </p>

                          <p className="mt-1">
                            Personal information shall only be collected, used,
                            and processed for legitimate and authorized
                            purposes. TugonBarangay shall implement reasonable
                            organizational, physical, and technical measures to
                            protect personal information against unauthorized
                            access, disclosure, alteration, loss, or misuse.
                          </p>
                        </div>

                        <div>
                          <p className="text-[12px] font-bold text-[#172B4D]">
                            4. Sharing and Disclosure of Information
                          </p>

                          <p className="mt-1">
                            Your personal information will not be publicly
                            displayed or disclosed without a valid and lawful
                            purpose. Information may only be accessed by
                            authorized barangay personnel, system
                            administrators, or authorized service providers when
                            necessary to perform legitimate barangay functions
                            and services.
                          </p>

                          <p className="mt-1">
                            Information may also be disclosed when required or
                            permitted by applicable laws, regulations, legal
                            processes, or lawful government requirements.
                          </p>
                        </div>

                        <div>
                          <p className="text-[12px] font-bold text-[#172B4D]">
                            5. Data Retention
                          </p>

                          <p className="mt-1">
                            Personal information shall only be retained for as
                            long as necessary to fulfill the purposes for which
                            it was collected, comply with applicable legal or
                            administrative requirements, and maintain
                            appropriate barangay records.
                          </p>
                        </div>

                        <div>
                          <p className="text-[12px] font-bold text-[#172B4D]">
                            6. Data Security
                          </p>

                          <p className="mt-1">
                            Appropriate safeguards shall be implemented to
                            protect your information. These may include access
                            controls, authentication mechanisms, secure storage,
                            system monitoring, and other reasonable security
                            measures appropriate to the nature of the
                            information being processed.
                          </p>
                        </div>

                        <div>
                          <p className="text-[12px] font-bold text-[#172B4D]">
                            7. Your Data Privacy Rights
                          </p>

                          <p className="mt-1">
                            Subject to applicable laws and regulations, you may
                            have rights concerning your personal information,
                            including the right to:
                          </p>

                          <ul className="mt-1.5 list-disc space-y-0.5 pl-4">
                            <li>
                              Be informed about the processing of your personal
                              information;
                            </li>
                            <li>Access personal information held about you;</li>
                            <li>
                              Request correction of inaccurate or incomplete
                              information;
                            </li>
                            <li>
                              Object to certain processing where legally
                              applicable;
                            </li>
                            <li>
                              Request other applicable rights under the Data
                              Privacy Act of 2012 and related regulations.
                            </li>
                          </ul>
                        </div>

                        <div>
                          <p className="text-[12px] font-bold text-[#172B4D]">
                            8. Accuracy of Information
                          </p>

                          <p className="mt-1">
                            You are responsible for providing accurate,
                            complete, and updated information during
                            registration and when using TugonBarangay. Providing
                            false or misleading information may affect the
                            processing of your requests and may result in
                            appropriate administrative action.
                          </p>
                        </div>

                        <div>
                          <p className="text-[12px] font-bold text-[#172B4D]">
                            9. Consent
                          </p>

                          <p className="mt-1">
                            By checking the consent box below, you confirm that
                            you have read and understood this Data Privacy
                            Notice and consent to the collection, use, storage,
                            and processing of your personal information for
                            legitimate barangay service purposes, subject to
                            applicable privacy laws and regulations.
                          </p>
                        </div>

                        <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
                          <p className="text-[10px] leading-4 text-blue-700">
                            <strong>Important:</strong> Please do not submit
                            information that does not belong to you or that you
                            are not authorized to provide.
                          </p>
                        </div>

                        <p className="pt-1 text-[10px] text-slate-400">
                          Last updated: 2026
                        </p>
                      </div>
                    ) : (
                      /* =================================================
                        TERMS & CONDITIONS
                    ================================================== */

                      <div className="space-y-4">
                        <div>
                          <p className="text-sm font-bold text-[#172B4D]">
                            TUGONBARANGAY TERMS & CONDITIONS
                          </p>

                          <p className="mt-0.5 text-[10px] text-slate-400">
                            Citizen Portal
                          </p>
                        </div>

                        <p>
                          These Terms & Conditions govern your access to and use
                          of the TugonBarangay citizen portal. By creating an
                          account or using the system, you acknowledge that you
                          have read, understood, and agreed to these terms.
                        </p>

                        <div>
                          <p className="text-[12px] font-bold text-[#172B4D]">
                            1. Account Registration
                          </p>

                          <p className="mt-1">
                            You must provide accurate and complete information
                            when creating your account. You are responsible for
                            ensuring that the information associated with your
                            account remains accurate and updated.
                          </p>
                        </div>

                        <div>
                          <p className="text-[12px] font-bold text-[#172B4D]">
                            2. Eligibility and Proper Use
                          </p>

                          <p className="mt-1">
                            The system is intended to support legitimate
                            barangay services, inquiries, requests, complaints,
                            announcements, and other authorized citizen-related
                            transactions.
                          </p>

                          <p className="mt-1">
                            You agree not to use the system for fraudulent,
                            unlawful, abusive, misleading, or unauthorized
                            activities.
                          </p>
                        </div>

                        <div>
                          <p className="text-[12px] font-bold text-[#172B4D]">
                            3. Account Security
                          </p>

                          <p className="mt-1">
                            You are responsible for keeping your password and
                            account credentials confidential. You should not
                            share your password with another person or allow
                            unauthorized individuals to access your account.
                          </p>

                          <p className="mt-1">
                            If you believe that your account has been accessed
                            without authorization, you should promptly notify
                            the appropriate barangay administrator or system
                            support personnel.
                          </p>
                        </div>

                        <div>
                          <p className="text-[12px] font-bold text-[#172B4D]">
                            4. Barangay Service Requests
                          </p>

                          <p className="mt-1">
                            TugonBarangay may allow users to submit requests for
                            barangay documents and services online. Submission
                            of a request does not automatically mean that the
                            request has been approved.
                          </p>

                          <p className="mt-1">
                            Requests may be subject to verification, review,
                            applicable requirements, processing procedures, and
                            approval by authorized barangay personnel.
                          </p>
                        </div>

                        <div>
                          <p className="text-[12px] font-bold text-[#172B4D]">
                            5. Complaints and Reports
                          </p>

                          <p className="mt-1">
                            Complaints, concerns, and reports submitted through
                            the system must contain truthful and relevant
                            information.
                          </p>

                          <p className="mt-1">
                            False, malicious, abusive, or intentionally
                            misleading reports may be subject to review and
                            appropriate action under applicable rules and
                            regulations.
                          </p>
                        </div>

                        <div>
                          <p className="text-[12px] font-bold text-[#172B4D]">
                            6. Uploaded Information and Documents
                          </p>

                          <p className="mt-1">
                            You are responsible for ensuring that documents,
                            photographs, and other information you upload are
                            lawful, accurate, relevant, and appropriate for the
                            service being requested.
                          </p>

                          <p className="mt-1">
                            You must not upload content that infringes the
                            rights of another person or that is unlawful or
                            unrelated to the intended barangay service.
                          </p>
                        </div>

                        <div>
                          <p className="text-[12px] font-bold text-[#172B4D]">
                            7. System Availability
                          </p>

                          <p className="mt-1">
                            TugonBarangay is intended to provide convenient
                            access to barangay services. However, system
                            availability may be affected by maintenance,
                            technical issues, internet connectivity,
                            infrastructure limitations, or other circumstances
                            beyond the system's control.
                          </p>
                        </div>

                        <div>
                          <p className="text-[12px] font-bold text-[#172B4D]">
                            8. Verification and Processing
                          </p>

                          <p className="mt-1">
                            Certain transactions may require additional
                            verification or supporting documents. Barangay
                            personnel may contact you using the contact
                            information associated with your account when
                            clarification or additional information is required.
                          </p>
                        </div>

                        <div>
                          <p className="text-[12px] font-bold text-[#172B4D]">
                            9. Prohibited Activities
                          </p>

                          <p className="mt-1">Users must not:</p>

                          <ul className="mt-1.5 list-disc space-y-0.5 pl-4">
                            <li>
                              Access another person's account without
                              authorization;
                            </li>
                            <li>Provide false or misleading information;</li>
                            <li>
                              Attempt to bypass or interfere with system
                              security;
                            </li>
                            <li>
                              Use the system for unauthorized commercial or
                              fraudulent activities;
                            </li>
                            <li>Intentionally disrupt system operations;</li>
                            <li>
                              Abuse any feature or service provided by the
                              system.
                            </li>
                          </ul>
                        </div>

                        <div>
                          <p className="text-[12px] font-bold text-[#172B4D]">
                            10. Account Suspension or Restriction
                          </p>

                          <p className="mt-1">
                            Access to an account may be temporarily restricted,
                            suspended, or otherwise reviewed when there is
                            reasonable indication of unauthorized use, misuse of
                            the system, fraudulent activity, violation of these
                            Terms & Conditions, or other legitimate security or
                            administrative concerns.
                          </p>
                        </div>

                        <div>
                          <p className="text-[12px] font-bold text-[#172B4D]">
                            11. Privacy
                          </p>

                          <p className="mt-1">
                            Your use of TugonBarangay is also subject to the
                            Data Privacy Notice presented during registration.
                            By using the system, you acknowledge that your
                            personal information may be processed for legitimate
                            barangay service purposes in accordance with
                            applicable privacy laws and regulations.
                          </p>
                        </div>

                        <div>
                          <p className="text-[12px] font-bold text-[#172B4D]">
                            12. Changes to These Terms
                          </p>

                          <p className="mt-1">
                            These Terms & Conditions may be updated when
                            necessary to reflect changes in the system,
                            services, policies, or applicable requirements.
                            Users may be notified of significant changes through
                            appropriate system or barangay communication
                            channels.
                          </p>
                        </div>

                        <div>
                          <p className="text-[12px] font-bold text-[#172B4D]">
                            13. Acceptance
                          </p>

                          <p className="mt-1">
                            By checking the acceptance box, you confirm that you
                            have read and understood these Terms & Conditions
                            and agree to comply with them when using
                            TugonBarangay.
                          </p>
                        </div>

                        <div className="rounded-lg border border-red-100 bg-red-50 p-3">
                          <p className="text-[10px] leading-4 text-red-700">
                            <strong>Reminder:</strong> TugonBarangay should only
                            be used for legitimate and authorized
                            barangay-related transactions and services.
                          </p>
                        </div>

                        <p className="pt-1 text-[10px] text-slate-400">
                          Last updated: 2026
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Consent */}

                <div className="mt-4">
                  {activeTab === "privacy" ? (
                    <ConsentCard
                      checked={privacyAccepted}
                      onChange={(value) => setPrivacyAccepted(value)}
                      icon="shield"
                    >
                      I have read and understood the{" "}
                      <span className="font-bold text-[#172B4D]">
                        Data Privacy Notice
                      </span>
                      . I consent to the collection and processing of my
                      personal data.
                    </ConsentCard>
                  ) : (
                    <ConsentCard
                      checked={termsAccepted}
                      onChange={(value) => setTermsAccepted(value)}
                      icon="check"
                    >
                      I have read and understood the{" "}
                      <span className="font-bold text-[#EF4444]">
                        Terms & Conditions
                      </span>{" "}
                      and agree to be bound by these terms.
                    </ConsentCard>
                  )}
                </div>

                {/* Status */}

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab("privacy")}
                    className={`
                    flex items-center
                    justify-center gap-1.5
                    rounded-xl border
                    px-3 py-2
                    text-[11px] font-semibold
                    transition-all
                    ${
                      privacyAccepted
                        ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                        : "border-slate-200 bg-white text-slate-400"
                    }
                  `}
                  >
                    <Icon name="check-circle" className="h-3 w-3" />
                    Privacy Notice
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("terms")}
                    className={`
                    flex items-center
                    justify-center gap-1.5
                    rounded-xl border
                    px-3 py-2
                    text-[11px] font-semibold
                    transition-all
                    ${
                      termsAccepted
                        ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                        : "border-slate-200 bg-white text-slate-400"
                    }
                  `}
                  >
                    <Icon name="check-circle" className="h-3 w-3" />
                    Terms & Conditions
                  </button>
                </div>

                {/* Proceed */}

                <button
                  type="button"
                  onClick={() => {
                    if (privacyAccepted && termsAccepted) {
                      nextStep();
                    }
                  }}
                  disabled={!privacyAccepted || !termsAccepted}
                  className={`
                  mt-5 flex w-full
                  items-center justify-center
                  gap-2 rounded-2xl
                  px-6 py-3.5
                  text-sm font-bold
                  text-white
                  transition-all
                  ${
                    privacyAccepted && termsAccepted
                      ? "bg-gradient-to-r from-[#2455D6] to-[#EF4444] shadow-lg hover:shadow-xl"
                      : "cursor-not-allowed bg-slate-300 opacity-60"
                  }
                `}
                >
                  I Agree — Proceed to Registration
                  <Icon name="chevron-right" className="h-4 w-4" />
                </button>

                {(!privacyAccepted || !termsAccepted) && (
                  <p className="mt-2 text-center text-[10px] text-slate-400">
                    Please read and accept both documents to continue.
                  </p>
                )}
              </div>
            )}

            {/* =================================================
                STEP 2 — PERSONAL INFORMATION
            ================================================== */}

            {step === 2 && (
              <div>
                <div
                  className="
                    grid grid-cols-1
                    gap-5 sm:grid-cols-2
                  "
                >
                  <InputField
                    label="First Name"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    placeholder="e.g. James"
                    icon="user"
                    error={fieldErrors.first_name}
                    required
                  />

                  <InputField
                    label="Middle Name"
                    name="middle_name"
                    value={formData.middle_name}
                    onChange={handleChange}
                    placeholder="e.g. Mantos"
                    icon="user"
                  />

                  <InputField
                    label="Last Name"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    placeholder="e.g. Songalia"
                    icon="user"
                    error={fieldErrors.last_name}
                    required
                  />

                  <InputField
                    label="Suffix"
                    name="suffix"
                    value={formData.suffix}
                    onChange={handleChange}
                    placeholder="Jr., Sr., III..."
                    icon="user"
                  />

                  <InputField
                    label="Date of Birth"
                    name="date_of_birth"
                    type="date"
                    value={formData.date_of_birth}
                    onChange={handleChange}
                    icon="calendar"
                    error={fieldErrors.date_of_birth}
                    required
                  />

                  <SelectField
                    label="Sex"
                    name="sex"
                    value={formData.sex}
                    onChange={handleChange}
                    error={fieldErrors.sex}
                    required
                    options={[
                      {
                        value: "Male",
                        label: "Male",
                      },
                      {
                        value: "Female",
                        label: "Female",
                      },
                    ]}
                  />
                </div>

                <StepButtons onBack={previousStep} onNext={nextStep} />
              </div>
            )}

            {/* =================================================
                STEP 3 — PHOTO
            ================================================== */}

            {step === 3 && (
              <div>
                <div
                  className="
                    flex flex-col items-center
                  "
                >
                  <div className="flex w-full flex-col items-center">
                    <div className="relative">
                      <div
                        className={`
                          flex h-48 w-48
                          items-center justify-center
                          overflow-hidden rounded-full
                          border-[6px] border-white
                          bg-[#F1F5F9]
                          shadow-[0_15px_45px_rgba(15,40,70,0.15)]
                          ${fieldErrors.profile_photo ? "ring-2 ring-red-400" : "ring-1 ring-slate-200"}
                        `}
                      >
                        {photoPreview ? (
                          <img
                            src={photoPreview}
                            alt="Profile preview"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="text-center">
                            <div
                              className="
                                mx-auto flex h-16 w-16
                                items-center justify-center
                                rounded-full bg-white
                                text-slate-300 shadow-sm
                              "
                            >
                              <Icon name="user" className="h-8 w-8" />
                            </div>

                            <p className="mt-3 text-xs font-medium text-slate-400">
                              Profile photo
                            </p>
                          </div>
                        )}
                      </div>

                      {photoPreview && (
                        <div
                          className="
                            absolute bottom-2 right-2
                            flex h-9 w-9
                            items-center justify-center
                            rounded-full
                            border-4 border-white
                            bg-green-500
                            text-white
                            shadow-lg
                          "
                        >
                          <Icon name="check" className="h-4 w-4" />
                        </div>
                      )}
                    </div>

                    <div className="mt-7 flex flex-wrap justify-center gap-3">
                      <label
                        className="
                        inline-flex
                        cursor-pointer
                        items-center justify-center
                        gap-2 rounded-xl
                        bg-gradient-to-r
                        from-[#2455D6]
                        via-[#4C45D8]
                        to-[#E52B32]
                        px-7 py-3.5
                        text-sm font-bold text-white
                        shadow-lg
                        transition duration-200
                        hover:-translate-y-0.5
                        hover:shadow-xl
                      "
                      >
                        <Icon name="camera" className="h-4 w-4" />

                        <span>
                          {photoPreview ? "Change Photo" : "Upload Photo"}
                        </span>

                        <input
                          type="file"
                          name="profile_photo"
                          accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                          onChange={handlePhotoChange}
                          className="hidden"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={openCamera}
                        className="
                          inline-flex
                          items-center justify-center
                          gap-2 rounded-xl
                          border border-[#2455D6]
                          bg-white
                          px-6 py-3.5
                          text-sm font-bold text-[#2455D6]
                          shadow-sm
                          transition duration-200
                          hover:-translate-y-0.5
                          hover:bg-[#F2F6FF]
                          hover:shadow-md
                        "
                      >
                        <Icon name="camera" className="h-4 w-4" />
                        <span>Take Photo</span>
                      </button>
                    </div>

                    {cameraOpen && (
                      <div className="mt-5 w-full max-w-md rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="aspect-video w-full rounded-xl bg-black object-cover"
                        />

                        <div className="mt-3 flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={closeCamera}
                            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                          >
                            Cancel
                          </button>

                          <button
                            type="button"
                            onClick={capturePhoto}
                            className="rounded-xl bg-[#2455D6] px-4 py-2 text-xs font-bold text-white hover:bg-[#1D4ED8]"
                          >
                            Capture Photo
                          </button>
                        </div>
                      </div>
                    )}

                    {fieldErrors.profile_photo && (
                      <FieldError
                        message={fieldErrors.profile_photo}
                        className="mt-2"
                      />
                    )}

                    <p className="mt-4 text-center text-xs leading-5 text-slate-400">
                      JPG, JPEG, or PNG
                      <br />
                      Maximum file size: 5 MB
                    </p>

                    {formData.profile_photo && (
                      <div
                        className="
                          mt-5 flex max-w-sm
                          items-center gap-3
                          rounded-xl
                          border border-slate-200
                          bg-slate-50
                          px-4 py-3
                        "
                      >
                        <div
                          className="
                            flex h-9 w-9 shrink-0
                            items-center justify-center
                            rounded-lg bg-white
                            text-[#2455D6]
                            shadow-sm
                          "
                        >
                          <Icon name="camera" className="h-4 w-4" />
                        </div>

                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            Selected photo
                          </p>

                          <p className="mt-0.5 truncate text-sm font-semibold text-slate-700">
                            {formData.profile_photo.name}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <StepButtons onBack={previousStep} onNext={nextStep} />
              </div>
            )}

            {/* =================================================
                STEP 4 — ADDRESS & CONTACT
            ================================================== */}

            {step === 4 && (
              <div>
                {/* Address */}

                <div>
                  <SectionHeading
                    icon="pin"
                    title="Home Address"
                    description="Where you currently reside."
                  />

                  <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <SelectField
                      label="Purok"
                      name="purok"
                      value={formData.purok}
                      onChange={handleChange}
                      error={fieldErrors.purok}
                      required
                      options={[
                        {
                          value: "Purok 1",
                          label: "Purok 1",
                        },
                        {
                          value: "Purok 2",
                          label: "Purok 2",
                        },
                        {
                          value: "Purok 3",
                          label: "Purok 3",
                        },
                        {
                          value: "Purok 4",
                          label: "Purok 4",
                        },
                        {
                          value: "Purok 5",
                          label: "Purok 5",
                        },
                      ]}
                    />

                    <InputField
                      label="House No. / Street"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      placeholder="Optional"
                      icon="pin"
                    />
                  </div>
                </div>

                {/* Contact */}

                <div className="mt-8">
                  <SectionHeading
                    icon="phone"
                    title="Contact Information"
                    description="How we can reach you."
                  />

                  <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <InputField
                      label="Mobile Number"
                      name="mobile_number"
                      type="tel"
                      value={formData.mobile_number}
                      onChange={handleChange}
                      placeholder="09XXXXXXXXX"
                      icon="phone"
                      error={fieldErrors.mobile_number}
                      required
                    />

                    <InputField
                      label="Email Address"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="Enter your email"
                      icon="mail"
                      error={fieldErrors.email}
                      required
                    />
                  </div>
                </div>

                <StepButtons onBack={previousStep} onNext={nextStep} />
              </div>
            )}

            {/* =================================================
                STEP 5 — ACCOUNT
            ================================================== */}

            {step === 5 && (
              <div>
                {/* Profile */}

                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt="Profile"
                      className="h-14 w-14 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white text-slate-400 ring-1 ring-slate-200">
                      <Icon name="user" className="h-6 w-6" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-[#172B4D]">
                      Your profile photo
                    </p>
                    <p className="mt-0.5 text-[10px] leading-4 text-slate-400">
                      This will be used for your citizen profile and account.
                    </p>
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="mt-0.5 text-[10px] font-semibold text-[#2455D6] hover:underline"
                    >
                      Change photo
                    </button>
                  </div>
                </div>

                {/* Password */}

                <div className="mt-7">
                  <div className="space-y-5">
                    <PasswordField
                      label="Password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="At least 8 characters"
                      show={showPassword}
                      toggle={() => setShowPassword(!showPassword)}
                      error={fieldErrors.password}
                      required
                    />

                    <PasswordField
                      label="Confirm Password"
                      name="password_confirmation"
                      value={formData.password_confirmation}
                      onChange={handleChange}
                      placeholder="Re-enter your password"
                      show={showConfirmPassword}
                      toggle={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      error={fieldErrors.password_confirmation}
                      required
                    />
                  </div>
                </div>

                {/* Summary */}

                <div className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                  <div
                    className="
                      border-b border-slate-200
                      px-4 py-4
                    "
                  >
                    <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-[#41658A]">
                      Registration Summary
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 gap-3 px-4 py-4 sm:grid-cols-2">
                    <SummaryItem
                      label="Date of Birth"
                      value={formData.date_of_birth}
                    />

                    <SummaryItem label="Sex" value={formData.sex} />

                    <SummaryItem label="Purok" value={formData.purok} />

                    <SummaryItem
                      label="Mobile"
                      value={formData.mobile_number}
                    />

                    <SummaryItem
                      label="House No. / Street"
                      value={formData.address || "Not provided"}
                    />

                    <SummaryItem
                      label="Photo"
                      value={
                        formData.profile_photo ? "Uploaded" : "Not uploaded"
                      }
                    />
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs leading-5 text-emerald-700">
                  <div className="flex items-start gap-2">
                    <Icon
                      name="check-circle"
                      className="mt-0.5 h-4 w-4 shrink-0"
                    />
                    <p>
                      You have already accepted the{" "}
                      <strong>Data Privacy Notice</strong> and{" "}
                      <strong>Terms & Conditions</strong>.
                      <br />
                      By submitting this form, your consent remains in effect.
                    </p>
                  </div>
                </div>

                {/* Submit */}

                <div className="mt-6 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={previousStep}
                    disabled={loading}
                    className="
                      h-11 rounded-xl
                      border border-slate-200
                      bg-white px-5
                      text-sm font-semibold
                      text-slate-700
                      shadow-sm
                      transition
                      hover:bg-slate-50
                      disabled:opacity-50
                    "
                  >
                    Back
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    className="
                      group flex h-12 flex-1
                      items-center
                      justify-center gap-2
                      rounded-xl
                      bg-gradient-to-r
                      from-[#2455D6]
                      via-[#4C45D8]
                      to-[#E52B32]
                      px-7
                      text-sm font-bold
                      text-white
                      shadow-lg
                      transition duration-200
                      hover:-translate-y-0.5
                      hover:shadow-xl
                      active:translate-y-0
                      disabled:cursor-not-allowed
                      disabled:opacity-70
                      sm:flex-1
                    "
                  >
                    {loading ? (
                      <>
                        <svg
                          className="h-5 w-5 animate-spin"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />

                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                          />
                        </svg>

                        <span>Creating Account...</span>
                      </>
                    ) : (
                      <>
                        <span>Create My Account</span>

                        <Icon
                          name="check-circle"
                          className="
                            h-4 w-4
                            transition-transform
                            group-hover:translate-x-0.5
                          "
                        />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>

          {/* Login */}

          <div className="mt-8 border-t border-slate-200 pt-6 text-center">
            <p className="text-sm text-slate-500">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="
                  font-bold text-[#2455D6]
                  transition
                  hover:text-[#1D4ED8]
                  hover:underline
                "
              >
                Login
              </button>
            </p>
          </div>

          {/* Footer */}

          <div
            className="
              mt-6 flex
              items-center justify-center
              gap-2 text-center
              text-[10px]
              text-slate-400
              pb-5
            "
          >
            <Icon name="shield" className="h-3.5 w-3.5" />

            <span>Secured by the BSIT 4B Group 4 Students</span>
          </div>
        </div>
      </section>
    </div>
  );
}

/* =============================================================
   ICON LIBRARY
============================================================= */

function Icon({ name, className = "h-5 w-5" }) {
  const icons = {
    user: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0ZM12 14c-4.4 0-8 2.24-8 5v1h16v-1c0-2.76-3.6-5-8-5Z"
      />
    ),

    calendar: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 7V3m8 4V3M4 11h16M5 5h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2Z"
      />
    ),

    camera: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 8a2 2 0 012-2h1.5l1-1.5h7l1 1.5H18a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V8Zm8 3a3 3 0 100 6 3 3 0 000-6Z"
      />
    ),

    pin: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 22s7-6.6 7-12a7 7 0 10-14 0c0 5.4 7 12 7 12Zm0-9a3 3 0 100-6 3 3 0 000 6Z"
      />
    ),

    phone: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 5c0-.6.4-1 1-1h3.2c.5 0 .9.3 1 .8l.7 3a1 1 0 01-.3 1L8 10.5c1 2.2 2.8 4 5 5l1.7-1.6a1 1 0 011-.3l3 .7c.5.1.8.5.8 1V19c0 .6-.4 1-1 1h-1C9.7 20 4 14.3 4 7V5Z"
      />
    ),

    mail: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 8l9 6 9-6M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2Z"
      />
    ),

    lock: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7 10V7a5 5 0 0110 0v3M6 10h12a1 1 0 011 1v9a1 1 0 01-1 1H6a1 1 0 01-1-1v-9a1 1 0 011-1Z"
      />
    ),

    shield: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"
      />
    ),

    check: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    ),

    "check-circle": (
      <>
        <circle cx="12" cy="12" r="9" />

        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m8 12 2.5 2.5L16 9"
        />
      </>
    ),

    "file-text": (
      <>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6Z"
        />

        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14 2v6h6M8 13h8M8 17h6"
        />
      </>
    ),

    "chevron-right": (
      <path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7" />
    ),

    arrow: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 12h14M13 6l6 6-6 6"
      />
    ),

    eye: (
      <>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z"
        />

        <circle cx="12" cy="12" r="2.5" />
      </>
    ),

    eyeOff: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 3l18 18M10.6 10.6a2 2 0 102.8 2.8M9.9 5.2A10.5 10.5 0 013 12s3.5 7 9 7a9.8 9.8 0 004.1-.9M14.1 5.2A10.5 10.5 0 0121 12s-1.1 2.2-3.2 4"
      />
    ),
  };

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      {icons[name]}
    </svg>
  );
}

/* =============================================================
   INPUT FIELD
============================================================= */

function FieldError({ message, className = "mt-1.5" }) {
  return (
    <p
      className={`flex items-center gap-1 text-xs font-medium text-red-600 ${className}`}
    >
      <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border border-red-600 text-[9px] font-bold leading-none">
        !
      </span>
      <span>{message}</span>
    </p>
  );
}

function InputField({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = "text",
  icon,
  error,
  required = false,
}) {
  return (
    <div>
      <label
        className="
          mb-2 block
          text-[10px] font-bold
          uppercase tracking-[0.15em]
          text-[#55708F]
        "
      >
        {label}

        {required && <span className="ml-1 text-[#EF4444]">*</span>}
      </label>

      <div className="relative">
        {icon && (
          <div
            className="
              pointer-events-none
              absolute inset-y-0 left-0
              flex items-center pl-4
              text-slate-400
            "
          >
            <Icon name={icon} className="h-[18px] w-[18px]" />
          </div>
        )}

        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          className={`
            h-[52px] w-full
            rounded-xl
            border border-slate-200
            bg-white
            ${icon ? "pl-11" : "pl-4"}
            pr-4
            text-sm text-slate-700
            shadow-sm
            outline-none
            transition-all duration-200
            placeholder:text-slate-400
            ${
              error
                ? "!border-red-400 focus:!border-red-500 focus:ring-red-500/10"
                : "hover:border-slate-300 focus:border-[#2455D6] focus:ring-4 focus:ring-[#2455D6]/10"
            }
          `}
        />
      </div>

      {error && <FieldError message={error} />}
    </div>
  );
}

/* =============================================================
   SELECT FIELD
============================================================= */

function SelectField({
  label,
  name,
  value,
  onChange,
  options,
  error,
  required = false,
}) {
  return (
    <div>
      <label
        className="
          mb-2 block
          text-[10px] font-bold
          uppercase tracking-[0.15em]
          text-[#55708F]
        "
      >
        {label}

        {required && <span className="ml-1 text-[#EF4444]">*</span>}
      </label>

      <select
        name={name}
        value={value}
        onChange={onChange}
        aria-invalid={Boolean(error)}
        className={`
          h-[52px] w-full
          rounded-xl
          border border-slate-200
          bg-white px-4
          text-sm text-slate-700
          shadow-sm
          outline-none
          transition-all duration-200
          ${
            error
              ? "!border-red-400 focus:!border-red-500 focus:ring-red-500/10"
              : "hover:border-slate-300 focus:border-[#2455D6] focus:ring-4 focus:ring-[#2455D6]/10"
          }
        `}
      >
        <option value="">Select {label}</option>

        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {error && <FieldError message={error} />}
    </div>
  );
}

/* =============================================================
   PASSWORD FIELD
============================================================= */

function PasswordField({
  label,
  name,
  value,
  onChange,
  placeholder,
  show,
  toggle,
  error,
  required = false,
}) {
  return (
    <div>
      <label
        className="
          mb-2 block
          text-[10px] font-bold
          uppercase tracking-[0.15em]
          text-[#55708F]
        "
      >
        {label}

        {required && <span className="ml-1 text-[#EF4444]">*</span>}
      </label>

      <div className="relative">
        <div
          className="
            pointer-events-none
            absolute inset-y-0 left-0
            flex items-center pl-4
            text-slate-400
          "
        >
          <Icon name="lock" className="h-[18px] w-[18px]" />
        </div>

        <input
          type={show ? "text" : "password"}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          className={`
            h-[52px] w-full
            rounded-xl
            border border-slate-200
            bg-white
            py-3.5 pl-11 pr-12
            text-sm text-slate-700
            shadow-sm
            outline-none
            transition-all duration-200
            placeholder:text-slate-400
            ${
              error
                ? "!border-red-400 focus:!border-red-500 focus:ring-red-500/10"
                : "hover:border-slate-300 focus:border-[#2455D6] focus:ring-4 focus:ring-[#2455D6]/10"
            }
          `}
        />

        <button
          type="button"
          onClick={toggle}
          className="
            absolute inset-y-0 right-0
            flex items-center pr-4
            text-slate-400
            transition
            hover:text-[#2455D6]
          "
          aria-label={show ? "Hide password" : "Show password"}
        >
          <Icon name={show ? "eyeOff" : "eye"} className="h-[18px] w-[18px]" />
        </button>
      </div>

      {error && <FieldError message={error} />}
    </div>
  );
}

/* =============================================================
   CONSENT CARD
============================================================= */

function ConsentCard({ checked, onChange, icon, children, disabled = false }) {
  return (
    <label
      className={`
        group flex items-start gap-3
        rounded-2xl
        border px-4 py-4
        transition-all duration-200
        ${
          disabled
            ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-70"
            : "cursor-pointer"
        }
        ${
          checked
            ? "border-[#2455D6]/25 bg-[#F2F6FF] shadow-sm"
            : "border-slate-200 bg-white"
        }
        ${
          !disabled && !checked
            ? "hover:border-slate-300 hover:bg-slate-50"
            : ""
        }
      `}
    >
      <div className="relative mt-0.5">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />

        <div
          className={`
            flex h-5 w-5
            items-center justify-center
            rounded-md border
            transition-all duration-200
            ${
              checked
                ? "border-[#2455D6] bg-[#2455D6] text-white"
                : disabled
                  ? "border-slate-200 bg-slate-100 text-transparent"
                  : "border-slate-300 bg-white text-transparent"
            }
          `}
        >
          <Icon name="check" className="h-3.5 w-3.5" />
        </div>
      </div>

      <div
        className={`
          mt-0.5 flex h-8 w-8 shrink-0
          items-center justify-center
          rounded-lg
          ${
            checked
              ? "bg-[#DCE8FF] text-[#2455D6]"
              : "bg-slate-100 text-slate-400"
          }
        `}
      >
        <Icon name={icon} className="h-4 w-4" />
      </div>

      <span className="text-sm leading-6 text-slate-600">{children}</span>
    </label>
  );
}

/* =============================================================
   SECTION HEADING
============================================================= */

function SectionHeading({ icon, title, description }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="
          flex h-10 w-10 shrink-0
          items-center justify-center
          rounded-xl
          bg-[#EAF1FF]
          text-[#2455D6]
        "
      >
        <Icon name={icon} className="h-5 w-5" />
      </div>

      <div>
        <h3 className="font-bold text-[#172B4D]">{title}</h3>

        <p className="mt-0.5 text-xs text-slate-400">{description}</p>
      </div>
    </div>
  );
}

/* =============================================================
   SUMMARY ITEM
============================================================= */

function SummaryItem({ label, value }) {
  return (
    <div>
      <p
        className="
          mb-1
          text-[10px] font-bold
          uppercase tracking-wider
          text-slate-400
        "
      >
        {label}
      </p>

      <p className="break-words text-sm font-semibold text-slate-700">
        {value || "Not provided"}
      </p>
    </div>
  );
}

/* =============================================================
   STEP BUTTONS
============================================================= */

function StepButtons({ onBack, onNext, showBack = true }) {
  return (
    <div className="mt-8 flex items-center justify-end gap-3">
      {showBack && (
        <button
          type="button"
          onClick={onBack}
          className="
            group flex h-12
            shrink-0
            items-center justify-center
            gap-2
            rounded-xl
            border border-slate-200
            bg-white
            px-5
            text-sm font-semibold
            text-slate-700
            shadow-sm
            transition-all duration-200
            hover:border-slate-300
            hover:bg-slate-50
          "
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="
              h-4 w-4
              transition-transform
              group-hover:-translate-x-0.5
            "
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 12H5m7 7-7-7 7-7"
            />
          </svg>

          <span>Back</span>
        </button>
      )}

      <button
        type="button"
        onClick={onNext}
        className="
          group flex h-12
          min-w-0
          flex-1
          items-center justify-center
          gap-2
          rounded-xl
          bg-gradient-to-r
          from-[#2455D6]
          via-[#4C45D8]
          to-[#E52B32]
          px-7
          text-sm font-bold
          text-white
          shadow-lg
          shadow-blue-500/15
          transition-all duration-200
          hover:-translate-y-0.5
          hover:shadow-xl
          active:translate-y-0
        "
      >
        <span>Continue</span>

        <Icon
          name="arrow"
          className="
            h-4 w-4
            transition-transform
            group-hover:translate-x-0.5
          "
        />
      </button>
    </div>
  );
}

export default Register;
