import { useMemo, useState } from "react";
import { Building, Mail, Phone, Printer, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import StaffLayout from "./StaffLayout";

const API_URL = "http://127.0.0.1:8000/api";

function authHeaders(token) {
  return {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
}

const DEFAULT_FORM = {
  courtCity: "Pasig",
  courtRegion: "NATIONAL CAPITAL JUDICIAL REGION",
  courtName: "REGIONAL TRIAL COURT",
  branch: "",
  courtEmail: "",
  courtHotline: "",
  plaintiff: "",
  civilCaseNo: "",
  causeOfAction: "Sum of Money With Damages and Attorney's Fees",
  defendants: "",
  summonedTo: "",
  summonedAddress: "Barangay Tinabalan, Palompon, Leyte",
  summonDate: new Date().toISOString().slice(0, 10),
  clerkName: "",
  clerkTitle: "Clerk of Court V",
};

function formatDisplayDate(value) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function SummonForm() {
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    ...DEFAULT_FORM,
    clerkName: user?.name || "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [printing, setPrinting] = useState(false);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setError("");
  };

  const handlePrint = () => {
    setPrinting(true);
    window.print();
    setPrinting(false);
  };

  const toSnakeCase = (object) => {
    const result = {};
    for (const [key, value] of Object.entries(object)) {
      result[key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)] = value;
    }
    return result;
  };

  const handleSave = async () => {
    if (!token) return;
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/staff/blotter/summon`, {
        method: "POST",
        headers: {
          ...authHeaders(token),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(toSnakeCase(form)),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || "Unable to save summons.");
      }
      navigate("/staff/blotter");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const canPrint = useMemo(() => {
    return Boolean(form.plaintiff && form.defendants && form.summonedTo);
  }, [form.plaintiff, form.defendants, form.summonedTo]);

  return (
    <StaffLayout
      title="Summons"
      navigationItems={[]}
      activePath="/staff/blotter/summon"
      onNavigate={navigate}
    >
      <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#2455D6]">
            Legal process
          </p>
          <h1 className="mt-0.5 text-xl font-bold tracking-tight text-[#172B4D] sm:text-2xl">
            Summons
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Prepare a court summons to be served to the defendant.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Dismiss error"
              className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-red-100"
            >
              <X size={12} />
            </button>
          </div>
        )}

        {/* Summons document template */}
        <div
          className={`relative bg-white p-10 sm:p-14 shadow-sm border border-slate-200 rounded-2xl ${
            printing ? "hidden" : ""
          }`}
        >
          <div className="flex justify-between items-end mb-8">
            <div>
              <button
                type="button"
                onClick={handleSave}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-xl border border-transparent bg-[#2455D6] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2455D6]/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Saving..." : "Save summons"}
              </button>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => navigate("/staff/blotter")}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                <X size={14} aria-hidden="true" />
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePrint}
                disabled={!canPrint || printing}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  canPrint
                    ? "border-transparent bg-gradient-to-r from-[#2455D6] via-[#7138E8] to-[#E52B32] text-white shadow-lg hover:-translate-y-0.5"
                    : "border-slate-200 text-slate-400"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <Printer size={14} aria-hidden="true" />
                Print summons
              </button>
            </div>
          </div>

          {/* Court letterhead */}
          <div className="text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-700">
              Republic of the Philippines
            </p>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-700">
              National Capital Judicial Region
            </p>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-700">
              Regional Trial Court
            </p>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-700">
              City of {form.courtCity}, Metro Manila
            </p>
            <div className="mt-3 flex flex-col sm:flex-row sm:justify-center gap-4 text-[10px] font-medium text-slate-600">
              <span className="flex items-center gap-1">
                <Building size={12} /> Branch {form.branch || "xxx"}
              </span>
              <span className="flex items-center gap-1">
                <Mail size={12} /> {form.courtEmail || "xxxxxxx"}
              </span>
              <span className="flex items-center gap-1">
                <Phone size={12} /> {form.courtHotline || "0917xxxxxxx"}
              </span>
            </div>
          </div>

          {/* Case caption */}
          <div className="flex items-baseline justify-between gap-4 mb-6 border-b border-slate-200 pb-4">
            <div className="flex flex-col gap-1">
              <p className="text-xs font-bold text-slate-700">{form.plaintiff || "xxxxx"}</p>
              <p className="text-[10px] italic text-slate-500">Plaintiff,</p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <p className="text-[10px] text-slate-500">-versus-</p>
            </div>
            <div className="text-right min-w-0">
              <p className="text-xs font-bold text-slate-700 truncate">
                Civil Case No. {form.civilCaseNo || "030"}
              </p>
              <p className="mt-1 text-[10px] text-slate-600 leading-tight">
                For: {form.causeOfAction || "Sum of Money With Damages and Attorney's Fees"}
              </p>
            </div>
          </div>

          <div className="flex items-baseline justify-between gap-4 mb-8 border-b border-slate-200 pb-4">
            <div className="flex items-end gap-2">
              <p className="text-xs font-bold text-slate-700">{form.defendants || "xxxxx"},</p>
              <p className="text-[10px] italic text-slate-500">Defendants.</p>
            </div>
            <div className="h-4 border-t border-black w-full mx-2 flex items-center">
              <span className="-translate-y-1/2 bg-white px-1 text-[10px] text-slate-400">
                x............................x
              </span>
            </div>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-700">
              Summons
            </h2>
          </div>

          <div className="mb-8">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">
              TO:
            </p>
            <p className="text-xs text-slate-700 mt-1">
              {form.summonedTo || "xxxxxx"}<br />
              {form.summonedAddress || "Barangay Tinabalan, Palompon, Leyte"}
            </p>
          </div>

          <div className="mb-8">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">
              Greetings:
            </p>
            <p className="mt-2 text-xs text-slate-700 leading-relaxed whitespace-pre-line">
              Pursuant to Section 1, Rule 11 of the Rules of Court, as amended,
              you are hereby directed to respond to the case filed against you within
              thirty (30) calendar days after service of herein Summons together
              with a copy of the Complaint and its Annexes.

              In the preparation, service, and filing of the Answer, please be guided
              by the following:

              1. The Answer must be signed by the party or counsel representing
              him/her;
              2. The Answer must be served to the plaintiff and filed with the Court
              personally or by registered mail with the corresponding electronic
              mail address of the Court within thirty (30) calendar days after
              service of herein Summons;
              3. Failure to file your Answer within the period stated may lead to your
              default and allow the presentation of the plaintiff's evidence ex parte;
              4. You are reminded of the provision in the IBP-OCA Memorandum Policy
              Guidelines dated 12 March 2020 to observe restraint in filing a Motion
              to Dismiss and instead allege the grounds thereof as Affirmative
              Defenses in your Answer.
            </p>
          </div>

          <div className="mb-8">
            <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
              The plaintiff's representatives, {form.plaintiff || "xxxxx"}, are duly
              deputized by the Court to serve this Summons upon your presentation of
              competent evidence of identity.
            </p>
          </div>

          {/* Date and signature */}
          <div className="mt-12 flex justify-between">
            <div className="text-right">
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">
                City of {form.courtCity || "xxxxxx"}, Metro Manila,
              </p>
              <p className="text-xs font-bold text-slate-700">
                {formatDisplayDate(form.summonDate) || "2 January 2025"}
              </p>
            </div>
            <div className="text-center">
              <div className="h-1 w-24 border-b border-black mx-auto mb-2" />
              <p className="text-[10px] font-bold text-slate-700 uppercase tracking-wide">
                {form.clerkName || "xxxxxxxxxxxx"}
              </p>
              <p className="text-[10px] text-slate-500">{form.clerkTitle}</p>
            </div>
          </div>
        </div>

        {/* Editable form fields (shown when not printing) */}
        {!printing && (
          <section className="mt-10 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Case details
              </h3>
            </div>
            <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="col-span-2">
                <label className="block text-[10px] font-bold text-slate-700 mb-1">
                  Plaintiff <span className="text-red-500">*</span>
                </label>
                <input
                  name="plaintiff"
                  value={form.plaintiff}
                  onChange={updateField}
                  placeholder="e.g. Juan Dela Cruz"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#2455D6] focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-bold text-slate-700 mb-1">
                  Defendants <span className="text-red-500">*</span>
                </label>
                <input
                  name="defendants"
                  value={form.defendants}
                  onChange={updateField}
                  placeholder="e.g. Maria Santos"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#2455D6] focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-700 mb-1">
                  Civil Case No.
                </label>
                <input
                  name="civilCaseNo"
                  value={form.civilCaseNo}
                  onChange={updateField}
                  placeholder="030"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#2455D6] focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-bold text-slate-700 mb-1">
                  Cause of Action
                </label>
                <input
                  name="causeOfAction"
                  value={form.causeOfAction}
                  onChange={updateField}
                  placeholder="Sum of Money With Damages and Attorney's Fees"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#2455D6] focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-700 mb-1">
                  Branch
                </label>
                <input
                  name="branch"
                  value={form.branch}
                  onChange={updateField}
                  placeholder="xxx"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#2455D6] focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-700 mb-1">
                  Court Email
                </label>
                <input
                  name="courtEmail"
                  value={form.courtEmail}
                  onChange={updateField}
                  type="email"
                  placeholder="court@example.com"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#2455D6] focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-700 mb-1">
                  Hotline
                </label>
                <input
                  name="courtHotline"
                  value={form.courtHotline}
                  onChange={updateField}
                  placeholder="0917xxxxxxx"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#2455D6] focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-bold text-slate-700 mb-1">
                  Summon To <span className="text-red-500">*</span>
                </label>
                <input
                  name="summonedTo"
                  value={form.summonedTo}
                  onChange={updateField}
                  placeholder="Name of person being summoned"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#2455D6] focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-bold text-slate-700 mb-1">
                  Address / Barangay
                </label>
                <input
                  name="summonedAddress"
                  value={form.summonedAddress}
                  onChange={updateField}
                  placeholder="Barangay Tinabalan, Palompon, Leyte"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#2455D6] focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-700 mb-1">
                  Date
                </label>
                <input
                  name="summonDate"
                  type="date"
                  value={form.summonDate}
                  onChange={updateField}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#2455D6] focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-bold text-slate-700 mb-1">
                  Clerk of Court
                </label>
                <input
                  name="clerkName"
                  value={form.clerkName}
                  onChange={updateField}
                  placeholder="Clerk of Court V"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#2455D6] focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div className="border-t border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[10px] text-slate-500">
                Fields marked <span className="text-red-500 font-bold">*</span> are
                required before printing. The court header and legal greetings text are
                pre-defined.
              </p>
            </div>
          </section>
        )}
      </div>
    </StaffLayout>
  );
}

export default SummonForm;
