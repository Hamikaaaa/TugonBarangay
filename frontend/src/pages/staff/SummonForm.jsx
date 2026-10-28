import { useEffect, useMemo, useState } from "react";
import { Download, FileText, Printer, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import useComplaintStaffNavigation from "../../hooks/useComplaintStaffNavigation";
import AdminPageHeader from "../../components/admin/AdminPageHeader";
import StaffLayout from "./StaffLayout";
import { DEFAULT_SUMMONS_SETTINGS } from "../../constants/summonsSettings";

const API_URL = "http://127.0.0.1:8000/api";

const INITIAL_FORM = {
  complainant: "",
  respondent: "",
  referenceNo: "",
  natureOfDispute: "",
  respondentAddress: "",
  hearingDate: new Date().toISOString().slice(0, 10),
  hearingTime: "",
  venue: DEFAULT_SUMMONS_SETTINGS.default_venue,
  issuedBy: "",
};

function formatDisplayDate(value) {
  if (!value) return "[date]";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Manila",
  });
}

function formatDisplayTime(value) {
  if (!value) return "[time]";
  const [hours, minutes] = String(value).split(":");
  const parsedHours = Number(hours);
  if (!Number.isInteger(parsedHours) || parsedHours < 0 || parsedHours > 23 || !/^\d{2}$/.test(minutes || "")) return value;
  const suffix = parsedHours >= 12 ? "PM" : "AM";
  return `${parsedHours % 12 || 12}:${minutes} ${suffix}`;
}

function renderNoticeText(template, settings) {
  return String(template || "").replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_match, key) => (
    settings[key] ?? ""
  ));
}

function SummonForm() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const navigationItems = useComplaintStaffNavigation();
  const [settings, setSettings] = useState(DEFAULT_SUMMONS_SETTINGS);
  const [form, setForm] = useState(() => ({ ...INITIAL_FORM, issuedBy: user?.name || "" }));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [paperTemplateUrl, setPaperTemplateUrl] = useState("");
  const [paperTemplateRatio, setPaperTemplateRatio] = useState("1 / 1");
  const [templateLoading, setTemplateLoading] = useState(false);

  useEffect(() => {
    if (!token) return undefined;
    let active = true;
    fetch(`${API_URL}/staff/blotter/summon-settings`, {
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || "Unable to load notice settings.");
        return payload.data;
      })
      .then((data) => {
        if (!active || !data) return;
        setSettings({ ...DEFAULT_SUMMONS_SETTINGS, ...data });
        if (data.uploaded_template_name) {
          setTemplateLoading(true);
          fetch(`${API_URL}/staff/blotter/summon-template`, {
            headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
          }).then(async (response) => {
            if (!response.ok) throw new Error("Unable to load the uploaded notice template.");
            return response.blob();
          }).then((blob) => {
            if (!active) return;
            if (/\.jpe?g$/i.test(data.uploaded_template_name)) {
              const objectUrl = URL.createObjectURL(blob);
              const image = new Image();
              image.onload = () => {
                if (active) {
                  setPaperTemplateRatio(`${image.naturalWidth} / ${image.naturalHeight}`);
                  setPaperTemplateUrl(objectUrl);
                  setTemplateLoading(false);
                } else {
                  URL.revokeObjectURL(objectUrl);
                }
              };
              image.onerror = () => {
                URL.revokeObjectURL(objectUrl);
                if (active) {
                  setError("Unable to read the uploaded notice template.");
                  setTemplateLoading(false);
                }
              };
              image.src = objectUrl;
            } else {
              setTemplateLoading(false);
            }
          }).catch((templateError) => {
            if (active) {
              setError(templateError.message);
              setTemplateLoading(false);
            }
          });
        }
        setForm((current) => ({
          ...current,
          venue: current.venue === INITIAL_FORM.venue ? (data.default_venue || current.venue) : current.venue,
        }));
      })
      .catch((loadError) => {
        if (active) setError(loadError.message);
      });
    return () => { active = false; };
  }, [token]);

  useEffect(() => () => { if (paperTemplateUrl) URL.revokeObjectURL(paperTemplateUrl); }, [paperTemplateUrl]);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setError("");
  };

  const canPrint = useMemo(
    () => Boolean(form.complainant.trim() && form.respondent.trim() && form.hearingDate && form.hearingTime),
    [form.complainant, form.respondent, form.hearingDate, form.hearingTime],
  );

  const handleSave = async () => {
    if (!token || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/staff/blotter/summon`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          barangay_name: settings.barangay_name,
          municipality: settings.municipality,
          province: settings.province,
          ...Object.fromEntries(Object.entries(form).map(([key, value]) => [
            key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`),
            value,
          ])),
          document_settings: settings,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Unable to save the summons notice.");
      navigate("/staff/blotter/summons");
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <StaffLayout
      title="Barangay Summons"
      navigationItems={navigationItems}
      activePath="/staff/blotter/summon"
      onNavigate={navigate}
    >
      <style>{`@media print { @page { margin: 0.25in; } body * { visibility: hidden !important; } #barangay-summons, #barangay-summons * { visibility: visible !important; } #barangay-summons { position: absolute; inset: 0; width: 100%; margin: 0; border: 0; border-radius: 0; box-shadow: none; print-color-adjust: exact; -webkit-print-color-adjust: exact; break-inside: avoid; } #barangay-summons .summons-template-image { display: block !important; } .no-print { display: none !important; } }`}</style>
      <div className="mx-auto w-full max-w-[1600px] space-y-6 px-5 pb-10 pt-6 sm:px-7 lg:px-9">
        <AdminPageHeader
          eyebrow="Katarungang Pambarangay"
          title="Notice to Appear"
          description="Prepare a barangay mediation notice for the parties involved in a reported dispute."
        >
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => navigate("/staff/blotter")} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/20">
              <X size={15} aria-hidden="true" /> Cancel
            </button>
            <button type="button" onClick={() => window.print()} disabled={!canPrint || templateLoading} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-[#2455D6] shadow-sm transition hover:bg-[#EEF4FF] disabled:cursor-not-allowed disabled:opacity-50">
              <Printer size={15} aria-hidden="true" /> Print notice
            </button>
            {settings.uploaded_template_name && !/\.jpe?g$/i.test(settings.uploaded_template_name) && <button type="button" onClick={async () => {
              try {
                const response = await fetch(`${API_URL}/staff/blotter/summon-template`, { headers: { Authorization: `Bearer ${token}` } });
                if (!response.ok) throw new Error("Unable to download the uploaded template.");
                const url = URL.createObjectURL(await response.blob());
                const link = document.createElement("a"); link.href = url; link.download = settings.uploaded_template_name; link.click(); URL.revokeObjectURL(url);
              } catch (downloadError) { setError(downloadError.message); }
            }} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-[#2455D6] shadow-sm"><Download size={15} /> Download template</button>}
            <button type="button" onClick={handleSave} disabled={submitting} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#E52B32] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#C9232B] disabled:cursor-wait disabled:opacity-60">
              <FileText size={15} aria-hidden="true" /> {submitting ? "Saving..." : "Save notice"}
            </button>
          </div>
        </AdminPageHeader>

        {error && (
          <div role="alert" className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            <span>{error}</span>
            <button type="button" onClick={() => setError("")} aria-label="Dismiss error"><X size={14} /></button>
          </div>
        )}

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.2fr)]">
          <section className="no-print overflow-hidden rounded-2xl border border-[#E6ECF5] bg-white shadow-[0_8px_28px_rgba(18,63,112,0.05)]">
            <div className="border-b border-[#E6ECF5] px-5 py-4">
              <h2 className="text-sm font-bold text-[#172B4D]">Meeting details</h2>
              <p className="mt-1 text-xs text-slate-500">Complete the parties and mediation schedule.</p>
            </div>
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <SummonField label="Complainant" name="complainant" value={form.complainant} onChange={updateField} required placeholder="Full name of complainant" />
              <SummonField label="Respondent" name="respondent" value={form.respondent} onChange={updateField} required placeholder="Full name of respondent" />
              <SummonField label="Blotter reference" name="referenceNo" value={form.referenceNo} onChange={updateField} placeholder="Optional reference number" />
              <SummonField label="Nature of dispute" name="natureOfDispute" value={form.natureOfDispute} onChange={updateField} placeholder="Brief description" />
              <SummonField label="Respondent address" name="respondentAddress" value={form.respondentAddress} onChange={updateField} placeholder="Purok, street, or sitio" />
              <SummonField label="Meeting date" name="hearingDate" type="date" value={form.hearingDate} onChange={updateField} required />
              <SummonField label="Meeting time" name="hearingTime" type="time" value={form.hearingTime} onChange={updateField} required />
              <SummonField label="Meeting venue" name="venue" value={form.venue} onChange={updateField} required />
              <div className="sm:col-span-2"><SummonField label="Punong Barangay / Lupon Chairperson" name="issuedBy" value={form.issuedBy} onChange={updateField} placeholder="Name of authorized signatory" /></div>
            </div>
            <p className="border-t border-[#E6ECF5] bg-slate-50 px-5 py-3 text-xs text-slate-500">Confirm the meeting schedule and authorized signatory before printing. This notice is not a court summons.</p>
          </section>

          <article id="barangay-summons" style={paperTemplateUrl ? { aspectRatio: paperTemplateRatio } : undefined} className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${paperTemplateUrl ? "relative mx-auto w-full max-w-[900px] overflow-hidden" : "p-6 sm:p-10"}`}>
            {paperTemplateUrl && <img src={paperTemplateUrl} alt="" aria-hidden="true" className="summons-template-image pointer-events-none absolute inset-0 z-0 h-full w-full object-fill" />}
            <div className={paperTemplateUrl ? "absolute inset-x-[6%] top-[19%] bottom-[17%] z-10 flex flex-col" : ""}>
            {!paperTemplateUrl && <header className="border-b-2 border-[#123F70] pb-5 text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-600">Republic of the Philippines</p>
                <p className="mt-1 text-sm font-bold uppercase tracking-wide text-[#172B4D]">Province of {settings.province}</p>
                <p className="text-sm font-bold uppercase tracking-wide text-[#172B4D]">Municipality of {settings.municipality}</p>
                <h2 className="mt-2 text-lg font-extrabold uppercase tracking-wide text-[#123F70]">Barangay {settings.barangay_name}</h2>
                <p className="text-xs font-semibold text-slate-600">{settings.office_heading}</p>
            </header>}

            <div className={paperTemplateUrl ? "py-1 text-center" : "py-7 text-center"}>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#2455D6]">Katarungang Pambarangay</p>
              <h1 className={`mt-1 font-extrabold uppercase tracking-wide text-[#172B4D] ${paperTemplateUrl ? "text-lg" : "text-xl"}`}>{settings.notice_title}</h1>
              <p className="mt-1 text-xs text-slate-500">{settings.notice_subtitle}</p>
            </div>

            <div className={`grid gap-2 rounded-xl bg-white/90 shadow-sm sm:grid-cols-2 ${paperTemplateUrl ? "mb-2 p-2.5 text-xs" : "mb-6 p-4 text-sm"}`}>
              <DocumentDetail label="Complainant" value={form.complainant || "[Complainant name]"} />
              <DocumentDetail label="Respondent" value={form.respondent || "[Respondent name]"} />
              <DocumentDetail label="Blotter reference" value={form.referenceNo || "Not provided"} />
              <DocumentDetail label="Nature of dispute" value={form.natureOfDispute || "Not provided"} />
            </div>

            <p className={`text-slate-700 ${paperTemplateUrl ? "text-xs leading-5" : "text-sm leading-7"}`}>
              {renderNoticeText(settings.opening_text, settings)}
            </p>

            <div className={`grid gap-2 rounded-xl border border-[#DCE6F3] bg-white/90 sm:grid-cols-2 ${paperTemplateUrl ? "my-2 p-2.5 text-xs" : "my-6 p-4 text-sm"}`}>
              <DocumentDetail label="Date" value={formatDisplayDate(form.hearingDate)} />
              <DocumentDetail label="Time" value={formatDisplayTime(form.hearingTime)} />
              <div className="sm:col-span-2"><DocumentDetail label="Venue" value={form.venue || "[Barangay hall / venue]"} /></div>
              {form.respondentAddress && <div className="sm:col-span-2"><DocumentDetail label="Respondent address" value={form.respondentAddress} /></div>}
            </div>

            <p className={`text-slate-700 ${paperTemplateUrl ? "text-xs leading-5" : "text-sm leading-7"}`}>{renderNoticeText(settings.closing_text, settings)}</p>

            <div className={`flex justify-end ${paperTemplateUrl ? "mt-auto pt-3" : "mt-12"}`}>
              <div className="min-w-56 text-center">
                <div className="mb-2 border-b border-slate-700" />
                <p className={`font-bold uppercase text-[#172B4D] ${paperTemplateUrl ? "text-xs" : "text-sm"}`}>{form.issuedBy || "[Authorized signatory]"}</p>
                <p className="mt-1 text-[10px] text-slate-600">{settings.signatory_title}</p>
                {!paperTemplateUrl && <p className="mt-1 text-xs text-slate-500">Barangay {settings.barangay_name}</p>}
              </div>
            </div>
            </div>
          </article>
        </div>
      </div>
    </StaffLayout>
  );
}

function SummonField({ label, name, value, onChange, required = false, type = "text", placeholder }) {
  return (
    <label className="block text-xs font-semibold text-[#42526B]">
      {label}{required && <span className="ml-1 text-red-500">*</span>}
      <input name={name} type={type} value={value} onChange={onChange} required={required} placeholder={placeholder} className="mt-1.5 min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal text-slate-700 outline-none transition focus:border-[#2455D6] focus:ring-2 focus:ring-blue-100" />
    </label>
  );
}

function DocumentDetail({ label, value }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 font-semibold text-[#172B4D]">{value}</p>
    </div>
  );
}

export default SummonForm;
