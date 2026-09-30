import { Bot, Check, CircleAlert, FileText, UserRound } from "lucide-react";
import { RequestRow } from "../../components/resident/ResidentUI";

/* Same brand gradient as the Login button */
const BRAND_GRADIENT =
  "bg-gradient-to-r from-[#2455D6] via-[#7138E8] to-[#E52B32]";

function Overview({ firstName, verified, dashboard, onNavigate, user }) {
  const stats = dashboard?.stats || {};
  const requests = dashboard?.requests || [];

  const pending = stats.pending_requests || 0;
  const processing = stats.processing_requests || 0;
  const completed = stats.completed_requests || 0;
  const complaints = stats.open_complaints || 0;

  const totalRequests = pending + processing + completed;

  const completionRate = totalRequests
    ? Math.round((completed / totalRequests) * 100)
    : 0;

  /* =========================
     COMPLETION RING
  ========================= */
  const R = 52;
  const C = 2 * Math.PI * R;
  const progressOffset = C - (C * completionRate) / 100;

  /* =========================
     ACCOUNT CHECKLIST
  ========================= */
  const checklist = [
    {
      label: "Registration submitted",
      done: true,
    },
    {
      label: "Identity reviewed by staff",
      done: verified,
    },
    {
      label: "Full service access",
      done: verified,
    },
  ];

  const doneCount = checklist.filter((item) => item.done).length;

  /* =========================
     SERVICES
  ========================= */
  const services = [
    {
      label: "Request a document",
      hint: "Certificates and clearances",
      to: "documents",
      icon: FileText,
      tint: "bg-[#2455D6]/10 text-[#2455D6]",
    },
    {
      label: "Submit a complaint",
      hint: "Report and track community concerns",
      to: "complaints",
      icon: CircleAlert,
      tint: "bg-[#E52B32]/10 text-[#E52B32]",
    },
    {
      label: "Ask BantayBot",
      hint: "Requirements, fees and processing times",
      to: "bantaybot",
      icon: Bot,
      tint: "bg-[#123F70]/10 text-[#123F70]",
    },
  ];

  /* =========================
     REUSABLE STYLES
  ========================= */
  const card =
    "rounded-[26px] border border-slate-200/80 bg-white/90 shadow-[0_8px_28px_rgba(18,63,112,0.06)] backdrop-blur-sm";

  const statItems = [
    {
      number: pending,
      label: "Pending",
    },
    {
      number: processing,
      label: "Processing",
    },
    {
      number: completed,
      label: "Completed",
    },
    {
      number: complaints,
      label: "Open complaints",
    },
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* =====================================================
          HEADER
      ===================================================== */}
      <header className="relative overflow-hidden rounded-[28px] border border-white/70 bg-white/70 px-6 py-7 shadow-[0_8px_28px_rgba(18,63,112,0.05)] backdrop-blur-sm sm:px-8">
        {/* Decorative background */}
        <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-[#2455D6]/5 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 right-32 h-48 w-48 rounded-full bg-[#E52B32]/5 blur-2xl" />

        <div className="relative flex flex-col gap-7 xl:flex-row xl:items-center xl:justify-between">
          {/* Welcome */}
          <div>
            <p className="text-sm font-medium text-[#41658A]">
              Welcome back, Tugonizen!
            </p>

            <div className="mt-1 flex items-center gap-3">
              <h1 className="text-4xl font-bold tracking-tight text-[#123F70] sm:text-5xl">
                {firstName}
              </h1>

              {verified && (
                <span className="mt-2 inline-flex h-7 items-center gap-1 rounded-full bg-[#2455D6]/10 px-3 text-xs font-semibold text-[#2455D6]">
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  Verified
                </span>
              )}
            </div>
          </div>

          {/* Key Numbers */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-4 sm:gap-x-10">
            {statItems.map((stat) => (
              <div
                key={stat.label}
                className="min-w-[80px] border-l border-slate-200 pl-4 first:border-l-0 first:pl-0"
              >
                <p className="text-3xl font-light leading-none tracking-tight text-[#172B4D] sm:text-4xl">
                  {stat.number}
                </p>

                <p className="mt-2 text-[11px] font-semibold text-[#55708F]">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* =====================================================
          ROW 1
      ===================================================== */}
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {/* =================================================
            PROFILE CARD
        ================================================= */}
        <div className="group relative flex min-h-[310px] flex-col justify-between overflow-hidden rounded-[28px] bg-gradient-to-br from-[#123F70] via-[#2455D6] to-[#7138E8] p-6 text-white shadow-[0_14px_34px_rgba(36,85,214,0.20)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(36,85,214,0.25)]">
          {/* Decorative circles */}
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full border-[30px] border-white/10 transition duration-500 group-hover:scale-110" />

          <div className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full border-[26px] border-[#E52B32]/25" />

          <div className="pointer-events-none absolute right-8 top-8 h-2 w-2 rounded-full bg-white/40" />

          {/* Avatar */}
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-white/20 bg-white/15 text-2xl font-bold shadow-lg backdrop-blur-sm">
            <UserRound
              className="h-7 w-7"
              strokeWidth={1.7}
              aria-hidden="true"
            />
          </div>

          {/* Profile details */}
          <div className="relative">
            <p className="text-2xl font-bold tracking-tight">
              Resident profile
            </p>

            <p className="mt-1 text-sm text-white/70">
              {user?.purok
                ? `${user.purok}, Consolacion`
                : "Consolacion resident"}
            </p>

            <div className="mt-6 rounded-2xl border border-white/15 bg-white/10 px-4 py-4 backdrop-blur-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
                Barangay office hours
              </p>

              <p className="mt-1.5 text-sm font-bold">
                Mon to Fri, 8:00 AM – 5:00 PM
              </p>
            </div>
          </div>
        </div>

        {/* =================================================
            COMPLETION RATE
        ================================================= */}
        <div
          className={`${card} flex min-h-[310px] flex-col p-6 transition duration-300 hover:-translate-y-1 hover:shadow-[0_14px_34px_rgba(18,63,112,0.10)]`}
        >
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-[#172B4D]">
                Completion rate
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                Based on your document requests
              </p>
            </div>

            <div className="rounded-xl bg-[#2455D6]/10 px-3 py-1.5 text-xs font-bold text-[#2455D6]">
              {completed} completed
            </div>
          </div>

          {/* Ring */}
          <div className="relative mx-auto mt-5 h-48 w-48">
            <svg
              viewBox="0 0 120 120"
              className="h-full w-full -rotate-90 overflow-visible"
            >
              <defs>
                <linearGradient id="ringGradient" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#2455D6" />
                  <stop offset="55%" stopColor="#7138E8" />
                  <stop offset="100%" stopColor="#E52B32" />
                </linearGradient>
              </defs>

              <circle
                cx="60"
                cy="60"
                r={R}
                fill="none"
                stroke="#E6ECF5"
                strokeWidth="8"
              />

              <circle
                cx="60"
                cy="60"
                r={R}
                fill="none"
                stroke="url(#ringGradient)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={C}
                strokeDashoffset={progressOffset}
                className="transition-all duration-700 ease-out"
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-light tracking-tight text-[#172B4D]">
                {completionRate}%
              </span>

              <span className="mt-1 text-xs font-medium text-slate-400">
                of {totalRequests} requests
              </span>
            </div>
          </div>
        </div>

        {/* =================================================
            ACCOUNT SETUP
        ================================================= */}
        <div className="relative min-h-[310px] overflow-hidden rounded-[28px] bg-[#123F70] p-6 text-white shadow-[0_14px_34px_rgba(18,63,112,0.25)] transition duration-300 hover:-translate-y-1">
          {/* Decorative element */}
          <div className="pointer-events-none absolute -bottom-20 -right-20 h-52 w-52 rounded-full border-[28px] border-white/5" />

          <div className="relative flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold tracking-tight">
                Account setup
              </h2>

              <p className="mt-1 text-xs text-white/60">
                Keep your account ready
              </p>
            </div>

            <span className="text-3xl font-light">
              {doneCount}/{checklist.length}
            </span>
          </div>

          {/* Progress */}
          <div className="relative mt-5 h-2 overflow-hidden rounded-full bg-white/15">
            <div
              className={`h-full rounded-full ${BRAND_GRADIENT} transition-all duration-500`}
              style={{
                width: `${(doneCount / checklist.length) * 100}%`,
              }}
            />
          </div>

          {/* Checklist */}
          <ul className="relative mt-6 space-y-3">
            {checklist.map((item) => (
              <li
                key={item.label}
                className="flex items-center justify-between gap-3 rounded-2xl border border-white/5 bg-white/10 px-4 py-3 transition hover:bg-white/15"
              >
                <span className="text-sm font-medium">{item.label}</span>

                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    item.done
                      ? "bg-[#2455D6] shadow-sm"
                      : "border border-white/30 bg-white/5"
                  }`}
                >
                  {item.done && (
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                </span>
              </li>
            ))}
          </ul>

          {!verified && (
            <p className="relative mt-4 text-xs leading-5 text-blue-100/80">
              Staff are reviewing your registration. Some services stay
              restricted until you are verified.
            </p>
          )}
        </div>
      </section>

      {/* =====================================================
          ROW 2
      ===================================================== */}
      <section className="grid gap-5 xl:grid-cols-[1.55fr_0.9fr]">
        {/* =================================================
            RECENT REQUESTS
        ================================================= */}
        <div
          className={`${card} overflow-hidden transition duration-300 hover:shadow-[0_12px_34px_rgba(18,63,112,0.09)]`}
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-[#172B4D]">
                Recent document requests
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                Track the latest requests you submitted
              </p>
            </div>

            <button
              type="button"
              onClick={() => onNavigate("documents")}
              className="group rounded-xl px-3 py-2 text-sm font-semibold text-[#2455D6] transition hover:bg-[#2455D6]/5"
            >
              View all
              <span className="ml-1 inline-block transition group-hover:translate-x-1">
                →
              </span>
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {requests.length === 0 ? (
              <div className="px-6 py-14 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2455D6]/10 text-[#2455D6]">
                  <FileText
                    className="h-6 w-6"
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                </div>

                <h3 className="mt-4 text-sm font-bold text-[#172B4D]">
                  No document requests yet
                </h3>

                <p className="mx-auto mt-1 max-w-xs text-sm text-slate-500">
                  Requests you submit will appear here.
                </p>

                <button
                  type="button"
                  onClick={() => onNavigate("documents")}
                  className={`mt-5 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg ${BRAND_GRADIENT}`}
                >
                  Request a document
                </button>
              </div>
            ) : (
              requests.map((request) => (
                <div
                  key={request.id}
                  className="transition hover:bg-slate-50/70"
                >
                  <RequestRow request={request} />
                </div>
              ))
            )}
          </div>
        </div>

        {/* =================================================
            BARANGAY SERVICES
        ================================================= */}
        <div
          className={`${card} p-6 transition duration-300 hover:shadow-[0_12px_34px_rgba(18,63,112,0.09)]`}
        >
          <div>
            <h2 className="text-lg font-bold tracking-tight text-[#172B4D]">
              Barangay services
            </h2>

            <p className="mt-1 text-xs text-slate-400">
              Quick access to resident services
            </p>
          </div>

          <div className="mt-5 space-y-3">
            {services.map((service, index) => {
              const isPrimary = index === 0;

              return (
                <button
                  key={service.to}
                  type="button"
                  onClick={() => onNavigate(service.to)}
                  className={
                    isPrimary
                      ? `group flex w-full items-center gap-4 rounded-2xl px-4 py-4 text-left text-white shadow-lg shadow-blue-500/10 transition duration-200 hover:-translate-y-0.5 hover:shadow-xl ${BRAND_GRADIENT}`
                      : "group flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4 text-left transition duration-200 hover:-translate-y-0.5 hover:border-[#2455D6]/30 hover:bg-white hover:shadow-md"
                  }
                >
                  {/* Icon */}
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition ${
                      isPrimary ? "bg-white/20 shadow-sm" : service.tint
                    }`}
                  >
                    <service.icon
                      className="h-5 w-5"
                      strokeWidth={1.8}
                      aria-hidden="true"
                    />
                  </span>

                  {/* Text */}
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block text-sm font-bold ${
                        isPrimary ? "text-white" : "text-[#172B4D]"
                      }`}
                    >
                      {service.label}
                    </span>

                    <span
                      className={`mt-1 block text-xs leading-5 ${
                        isPrimary ? "text-white/80" : "text-slate-500"
                      }`}
                    >
                      {service.hint}
                    </span>
                  </span>

                  {/* Arrow */}
                  <span
                    className={`shrink-0 text-lg transition duration-200 group-hover:translate-x-1 ${
                      isPrimary
                        ? "text-white"
                        : "text-slate-300 group-hover:text-[#2455D6]"
                    }`}
                  >
                    →
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

export default Overview;
