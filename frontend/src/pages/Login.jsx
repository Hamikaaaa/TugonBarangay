import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:8000/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Invalid email or password.");

        // Automatically remove error after 3 seconds
        setTimeout(() => {
          setError("");
        }, 3000);

        setIsLoading(false);
        return;
      }

      // Save authenticated user and token
      login(data.user, data.token);

      console.log("Logged-in user:", data.user);

      // Redirect according to role
      if (data.user.role === "resident") {
        navigate("/resident/dashboard");
      } else if (data.user.role === "staff") {
        navigate(
          data.user.designation === "Complaint Management Officer"
            ? "/staff/complaints"
            : "/staff/dashboard",
        );
      } else if (data.user.role === "admin") {
        navigate("/admin/dashboard");
      } else {
        navigate("/unauthorized");
      }
    } catch (error) {
      console.error(error);

      setError("Unable to connect to the server. Please try again.");

      // Automatically remove error after 3 seconds
      setTimeout(() => {
        setError("");
      }, 3000);

      setIsLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-white lg:flex">
      {/* =====================================================
          LEFT SIDE — TUGONBARANGAY BRANDING
      ====================================================== */}
      <section
        className="
        relative hidden min-h-screen overflow-hidden
        lg:flex lg:w-[58%]
        bg-[#123F70]
  "
      >
        {/* Background Image */}
        <div
          className="
          absolute inset-0
          bg-cover bg-center
        "
          style={{
            backgroundImage: "url('/images/consolacion-municipal-hall.jpg')",
            backgroundPosition: "10% 80%",
          }}
        />

        {/* Blue Overlay */}
        <div
          className="
            absolute inset-0
            bg-[#123F70]/60
          "
        />

        {/* Soft gradient to blend the image */}
        <div
          className="
            absolute inset-0
            bg-gradient-to-r
            from-[#123F70]/95
            via-[#123F70]/75
            to-[#123F70]/40
          "
        />

        {/* Tech Grid Pattern */}
        <div
          className="
          pointer-events-none
          absolute inset-0
          z-[1]
          opacity-[0.3]
        "
          style={{
            backgroundImage: `
            linear-gradient(
              rgba(255,255,255,0.10) 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(255,255,255,0.10) 1px,
              transparent 1px
            )
          `,
            backgroundSize: "70px 70px",
            maskImage:
              "linear-gradient(to bottom, black 0%, rgba(0,0,0,0.8) 55%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, black 0%, rgba(0,0,0,0.8) 55%, transparent 100%)",
          }}
        />

        {/* Tech Grid Accent */}
        <div
          className="
            pointer-events-none
            absolute
            right-[18%]
            top-[28%]
            z-[2]
            h-2
            w-2
            rounded-full
            bg-white/40
            shadow-[0_0_12px_rgba(255,255,255,0.5)]
          "
        />

        <div
          className="
          pointer-events-none
          absolute
          right-[28%]
          top-[52%]
          z-[2]
          h-1.5
          w-1.5
          rounded-full
          bg-[#FF6B6B]/60
          shadow-[0_0_12px_rgba(255,107,107,0.5)]
      "
        />

        {/* Municipality of Consolacion — 3D Seal */}
        <div
          className="
          absolute
          right-19
          top-[10%]
          z-[3]
          -translate-y-1/2
          rounded-full
          p-1
          bg-white/5
          shadow-[0_20px_45px_rgba(0,0,0,0.35)]
        "
        >
          <img
            src="/images/consolacion-logo.png"
            alt="Municipality of Consolacion"
            className="
            w-23
            object-contain
            opacity-90
            drop-shadow-[0_10px_8px_rgba(0,0,0,0.45)]
            drop-shadow-[0_0_18px_rgba(255,255,255,0.12)]
          "
          />
        </div>
        {/* Content */}
        <div className="relative z-10 flex min-h-screen w-full flex-col px-10 py-9 xl:px-14">
          {/* Logo */}
          <div className="flex items-center gap-1">
            {/* Logo placeholder */}
            <img
              src="/images/logo-white-version.png"
              alt="TugonBarangay Logo"
              className="h-17 w-17 object-contain"
            />

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                <span>Tugon</span>
                <span className="text-[#EF4444]">Barangay</span>
              </h1>

              <p className="mt-0.5 text-xs font-medium uppercase tracking-[0.18em] text-white/70">
                Barangay Citizen Portal
              </p>
            </div>
          </div>

          {/* Welcome Content */}
          <div className="mt-auto max-w-xl pb-10">
            <p className="mb-3 text-xl font-semibold text-blue-200">
              Welcome, Tugonizen!
            </p>

            <h2 className="font-bold leading-tight tracking-tight">
              <span className="block text-5xl text-white">
                Serving Barangays of
              </span>

              <span className="block text-5xl text-[#FF6B6B] whitespace-nowrap">
                Municipality of Consolacion
              </span>
            </h2>

            <p className="mt-5 max-w-lg text-lg leading-7 text-white/80">
              Sign in to request barangay documents, track your requests, manage
              your profile, and file complaints online.
            </p>

            {/* Security Footer */}
            <div className="mt-15 flex items-center gap-2 text-xs text-white/60">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"
                />
              </svg>

              <span>Secured by the BSIT 4B Group 4 Students</span>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
    RIGHT SIDE — LOGIN FORM
====================================================== */}
      <section
        className="
    flex min-h-screen w-full items-center justify-center
    bg-white px-6 py-10
    sm:px-10
    lg:w-[42%]
    lg:px-12
    xl:px-16
  "
      >
        <div className="w-full max-w-md">
          {/* TugonBarangay Logo */}
          <div className="mb-12 flex items-center gap-1">
            <img
              src="/images/logo-blue-version.png"
              alt="TugonBarangay Logo"
              className="h-16 w-16 object-contain"
            />

            <div>
              <h1 className="text-xl font-bold tracking-tight text-[#123F70]">
                <span>Tugon</span>
                <span className="text-[#EF4444]">Barangay</span>
              </h1>

              <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Barangay Citizen Portal
              </p>
            </div>
          </div>

          {/* Messages */}
          {message && (
            <div className="mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {message}
            </div>
          )}

          {error && (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Heading */}
          <div className="mb-8">
            <p className="mb-2 text-sm font-medium text-[#41658A]">
              Welcome back, Tugonizen!
            </p>

            <h2 className="text-3xl font-bold tracking-tight text-[#172B4D]">
              Sign in
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Access your TugonBarangay citizen account.
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="
                  mb-2 block text-xs font-semibold
                  uppercase tracking-wider
                  text-[#55708F]
                "
              >
                Email Address
              </label>

              <div className="relative">
                {/* Email Icon */}
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 8l9 6 9-6M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2Z"
                    />
                  </svg>
                </div>

                <input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email address"
                  required
                  className="
                    w-full rounded-xl
                    border border-slate-200
                    bg-slate-50
                    py-3.5 pl-12 pr-4
                    text-sm text-slate-700
                    outline-none
                    transition
                    placeholder:text-slate-400
                    focus:border-blue-500
                    focus:bg-white
                    focus:ring-4
                    focus:ring-blue-500/10
                  "
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="
                    text-xs font-semibold
                    uppercase tracking-wider
                    text-[#55708F]
                  "
                >
                  Password
                </label>

                <button
                  type="button"
                  className="
                    text-xs font-semibold
                    text-blue-600
                    hover:text-blue-700
                  "
                >
                  Forgot password?
                </button>
              </div>

              <div className="relative">
                {/* Lock Icon */}
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M7 10V7a5 5 0 0110 0v3M6 10h12a1 1 0 011 1v9a1 1 0 01-1 1H6a1 1 0 01-1-1v-9a1 1 0 011-1Z"
                    />
                  </svg>
                </div>

                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  required
                  className="
                    w-full rounded-xl
                    border border-slate-200
                    bg-slate-50
                    py-3.5 pl-12 pr-12
                    text-sm text-slate-700
                    outline-none
                    transition
                    placeholder:text-slate-400
                    focus:border-blue-500
                    focus:bg-white
                    focus:ring-4
                    focus:ring-blue-500/10
                  "
                />

                {/* Show / Hide Password */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="
                    absolute inset-y-0 right-0
                    flex items-center pr-4
                    text-slate-400
                    hover:text-slate-600
                  "
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="1.7"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 3l18 18M10.6 10.6a2 2 0 102.8 2.8M9.9 5.2A10.5 10.5 0 013 12s3.5 7 9 7a9.8 9.8 0 004.1-.9M14.1 5.2A10.5 10.5 0 0121 12s-1.1 2.2-3.2 4"
                      />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="1.7"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z"
                      />
                      <circle cx="12" cy="12" r="2.5" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="
              group flex w-full items-center
              justify-center gap-2
              rounded-xl
              bg-gradient-to-r
              from-[#2455D6]
              via-[#7138E8]
              to-[#E52B32]
              px-5 py-3.5
              text-sm font-bold text-white
              shadow-lg shadow-blue-500/15
              transition
              duration-200
              hover:-translate-y-0.5
              hover:shadow-xl
              hover:shadow-blue-500/20
              active:translate-y-0
              disabled:cursor-not-allowed
              disabled:opacity-70
            "
            >
              {isLoading ? (
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

                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 7V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2h7a2 2 0 002-2v-1M10 12h10m0 0l-3-3m3 3l-3 3"
                    />
                  </svg>

                  <span>Access Citizen Portal</span>
                </>
              )}
            </button>
          </form>

          {/* Register */}
          <p className="mt-7 text-center text-sm text-slate-500">
            Don't have a citizen account?{" "}
            <button
              type="button"
              onClick={() => navigate("/register")}
              className="font-semibold text-blue-600 hover:text-blue-700 hover:underline"
            >
              Register here
            </button>
          </p>

          {/* Footer */}
          <div className="mt-12 flex items-center justify-center gap-2 text-center text-[11px] text-slate-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"
              />
            </svg>

            <span>Secured by the BSIT 4B Group 4 Students</span>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Login;
