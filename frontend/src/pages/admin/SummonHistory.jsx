import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Eye, FileText, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { DEFAULT_SUMMONS_SETTINGS } from "../../constants/summonsSettings";

const API_URL = "http://127.0.0.1:8000/api";

function authHeaders(token) {
  return { Accept: "application/json", Authorization: `Bearer ${token}` };
}

function formatDate(value) {
  if (!value) return "—";
  const parsed = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleDateString("en-PH", {
    year: "numeric", month: "short", day: "numeric", timeZone: "Asia/Manila",
  });
}

function formatTime(value) {
  if (!value) return "—";
  const [hour, minute] = String(value).split(":");
  const parsedHour = Number(hour);
  if (!Number.isInteger(parsedHour) || parsedHour < 0 || parsedHour > 23) return value;
  return `${parsedHour % 12 || 12}:${minute || "00"} ${parsedHour >= 12 ? "PM" : "AM"}`;
}

function renderText(text, settings) {
  return String(text || "").replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_match, key) => settings[key] ?? "");
}

export default function SummonHistory() {
  const { token } = useAuth();
  const [entries, setEntries] = useState([]);
  const [page, setPage] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [templateUrl, setTemplateUrl] = useState("");
  const [templateRatio, setTemplateRatio] = useState("1 / 1");
  const [templateLoading, setTemplateLoading] = useState(false);
  const [currentTemplateName, setCurrentTemplateName] = useState("");

  const loadEntries = useCallback(async (pageNumber = 1) => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/admin/complaints/summon-history?page=${pageNumber}`, { headers: authHeaders(token) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Unable to load summon history.");
      setEntries(payload.data || []);
      setPage({ current_page: payload.current_page || 1, last_page: payload.last_page || 1, total: payload.total || 0 });
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadEntries(); }, [loadEntries]);
  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/admin/complaints/summons-settings`, { headers: authHeaders(token) })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || "Unable to load current summon template details.");
        setCurrentTemplateName(payload.data?.uploaded_template_name || "");
      })
      .catch(() => setCurrentTemplateName(""));
  }, [token]);
  useEffect(() => () => { if (templateUrl) URL.revokeObjectURL(templateUrl); }, [templateUrl]);

  const viewNotice = async (entry) => {
    setSelected(entry);
    setTemplateUrl("");
    setError("");
    let templateEndpoint = `${API_URL}/admin/complaints/summon-history/${entry.id}/template`;
    let templateName = entry.template_name || "Saved summons template";
    if (!entry.template_path) {
      try {
        if (!currentTemplateName) {
          const settingsResponse = await fetch(`${API_URL}/admin/complaints/summons-settings`, { headers: authHeaders(token) });
          const settingsPayload = await settingsResponse.json();
          if (!settingsResponse.ok) throw new Error(settingsPayload.message || "Unable to load the current summon template.");
          setCurrentTemplateName(settingsPayload.data?.uploaded_template_name || "");
          templateName = settingsPayload.data?.uploaded_template_name || "Uploaded summons template";
        } else {
          templateName = currentTemplateName;
        }
        templateEndpoint = `${API_URL}/admin/complaints/summons-settings/template`;
        setSelected({ ...entry, template_name: templateName, template_path: "current", template_is_current_fallback: true });
      } catch (fallbackError) {
        setError(fallbackError.message);
        return;
      }
    }
    setTemplateLoading(true);
    try {
      const response = await fetch(templateEndpoint, { headers: authHeaders(token) });
      if (!response.ok) throw new Error("Unable to load the template saved with this notice.");
      const blob = await response.blob();
      const contentType = response.headers.get("content-type") || blob.type;
      if (/\.jpe?g$/i.test(templateName) || contentType.startsWith("image/")) {
        const objectUrl = URL.createObjectURL(blob);
        const image = new Image();
        image.onload = () => setTemplateRatio(`${image.naturalWidth} / ${image.naturalHeight}`);
        image.src = objectUrl;
        setTemplateUrl(objectUrl);
      } else if (/\.pdf$/i.test(templateName) || contentType.includes("application/pdf")) {
        setTemplateUrl(URL.createObjectURL(blob));
      }
    } catch (templateError) {
      setError(templateError.message);
    } finally {
      setTemplateLoading(false);
    }
  };

  const settings = selected ? { ...DEFAULT_SUMMONS_SETTINGS, ...(selected.document_settings || {}) } : DEFAULT_SUMMONS_SETTINGS;

  return (
    <>
      {error && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div><h2 className="text-sm font-bold text-[#172B4D]">Saved notices</h2><p className="mt-1 text-xs text-slate-500">{page.total} {page.total === 1 ? "entry" : "entries"}</p></div>
          <FileText size={19} className="text-[#2455D6]" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Reference</th><th className="px-5 py-3">Complainant</th><th className="px-5 py-3">Attended</th><th className="px-5 py-3">Respondent</th><th className="px-5 py-3">Attended</th><th className="px-5 py-3">Hearing</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan="8" className="p-10 text-center text-sm text-slate-500">Loading summon history…</td></tr> : entries.length === 0 ? <tr><td colSpan="8" className="p-12 text-center text-sm text-slate-500">No saved summons yet.</td></tr> : entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-50/70">
                  <td className="whitespace-nowrap px-5 py-4 font-bold text-[#2455D6]">SUM-{String(entry.id).padStart(5, "0")}</td>
                  <td className="px-5 py-4 font-semibold text-[#172B4D]">{entry.complainant}</td>
                  <td className="px-5 py-4"><AttendanceValue value={entry.complainant_attended} /></td>
                  <td className="px-5 py-4 font-semibold text-[#172B4D]">{entry.respondent}</td>
                  <td className="px-5 py-4"><AttendanceValue value={entry.respondent_attended} /></td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-600">{formatDate(entry.hearing_date)}<span className="ml-2 text-xs text-slate-400">{formatTime(entry.hearing_time)}</span></td>
                  <td className="px-5 py-4 capitalize text-slate-600">{entry.status || "scheduled"}</td>
                  <td className="px-5 py-4"><button type="button" onClick={() => viewNotice(entry)} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:border-[#2455D6] hover:bg-blue-50"><Eye size={14} /> View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3"><p className="text-xs text-slate-500">Page {page.current_page} of {page.last_page}</p><div className="flex gap-2">
          <button type="button" disabled={page.current_page <= 1 || loading} onClick={() => loadEntries(page.current_page - 1)} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 disabled:opacity-40"><ChevronLeft size={14} /> Previous</button>
          <button type="button" disabled={page.current_page >= page.last_page || loading} onClick={() => loadEntries(page.current_page + 1)} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 disabled:opacity-40">Next <ChevronRight size={14} /></button>
        </div></div>
      </section>

      {selected && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="summon-history-title" className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
          <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 id="summon-history-title" className="text-base font-bold text-[#172B4D]">Summon SUM-{String(selected.id).padStart(5, "0")}</h2><p className="mt-1 text-xs text-slate-500">{selected.template_is_current_fallback ? "Saved notice with the current uploaded template" : "Saved notice and its original template"}</p></div><button type="button" onClick={() => setSelected(null)} aria-label="Close summon preview" className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"><X size={17} /></button></header>
          <div className="overflow-y-auto bg-slate-100 p-4 sm:p-6">
            {templateLoading ? <div className="mx-auto h-96 max-w-3xl animate-pulse rounded-xl bg-white" /> : templateUrl && /\.pdf$/i.test(selected.template_name || "") ? (
              <iframe src={templateUrl} title="Saved summons PDF template" className="mx-auto h-[72vh] w-full max-w-4xl rounded-xl border border-slate-200 bg-white" />
            ) : templateUrl ? (
              <article style={{ aspectRatio: templateRatio }} className="relative mx-auto w-full max-w-3xl overflow-hidden bg-white shadow-lg">
                <img src={templateUrl} alt="Saved summons paper template" className="absolute inset-0 h-full w-full object-fill" />
                <div className="absolute inset-x-[7%] top-[19%] bottom-[17%] z-10 flex flex-col text-[11px] leading-4 text-slate-800">
                  <div className="py-1 text-center"><p className="text-[9px] font-bold uppercase tracking-[0.18em] text-blue-700">Katarungang Pambarangay</p><h3 className="mt-1 text-base font-extrabold uppercase">{settings.notice_title}</h3><p>{settings.notice_subtitle}</p></div>
                  <div className="grid grid-cols-2 gap-2 rounded-lg bg-white/90 p-2.5 shadow-sm"><NoticeField label="Complainant" value={selected.complainant} /><NoticeField label="Respondent" value={selected.respondent} /><NoticeField label="Blotter reference" value={selected.reference_no || "Not provided"} /><NoticeField label="Nature of dispute" value={selected.nature_of_dispute || "Not provided"} /></div>
                  <p className="my-2">{renderText(settings.opening_text, settings)}</p>
                  <div className="grid grid-cols-2 gap-2 rounded-lg border border-blue-100 bg-white/90 p-2.5"><NoticeField label="Date" value={formatDate(selected.hearing_date)} /><NoticeField label="Time" value={formatTime(selected.hearing_time)} /><div className="col-span-2"><NoticeField label="Venue" value={selected.venue} /></div>{selected.respondent_address && <div className="col-span-2"><NoticeField label="Respondent address" value={selected.respondent_address} /></div>}</div>
                  <p className="my-2">{renderText(settings.closing_text, settings)}</p>
                  <div className="mt-auto pt-2 text-right"><div className="ml-auto w-56 border-b border-slate-600" /><p className="mt-1 font-bold uppercase">{selected.issued_by || "Authorized signatory"}</p><p className="text-[10px]">{settings.signatory_title}</p></div>
                </div>
              </article>
            ) : (
              <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="border-b border-blue-900 pb-4 text-center"><p className="text-xs uppercase text-slate-500">Republic of the Philippines</p><p className="mt-1 text-sm font-bold uppercase">Province of {settings.province}</p><p className="text-sm font-bold uppercase">Municipality of {settings.municipality}</p><h3 className="mt-1 font-extrabold uppercase">Barangay {settings.barangay_name}</h3><p className="text-xs">{settings.office_heading}</p></div>
                <div className="py-6 text-center"><p className="text-xs font-bold uppercase text-blue-700">Katarungang Pambarangay</p><h3 className="mt-1 text-lg font-extrabold uppercase">{settings.notice_title}</h3><p className="text-sm text-slate-500">{settings.notice_subtitle}</p></div>
                <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-4 text-sm"><NoticeField label="Complainant" value={selected.complainant} /><NoticeField label="Respondent" value={selected.respondent} /><NoticeField label="Reference" value={selected.reference_no || "Not provided"} /><NoticeField label="Dispute" value={selected.nature_of_dispute || "Not provided"} /></div>
                <p className="my-4 text-sm leading-6">{renderText(settings.opening_text, settings)}</p><div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 p-4 text-sm"><NoticeField label="Date" value={formatDate(selected.hearing_date)} /><NoticeField label="Time" value={formatTime(selected.hearing_time)} /><div className="col-span-2"><NoticeField label="Venue" value={selected.venue} /></div></div>
                <p className="my-4 text-sm leading-6">{renderText(settings.closing_text, settings)}</p><div className="mt-10 text-right"><p className="font-bold uppercase">{selected.issued_by || "Authorized signatory"}</p><p className="text-xs">{settings.signatory_title}</p></div>
              </div>
            )}
          </div>
          <footer className="border-t border-slate-100 px-5 py-4"><p className="text-xs text-slate-500">{selected.template_is_current_fallback ? "Showing the current uploaded template with this saved notice." : selected.template_path ? "Showing the template saved with this notice." : "No template file is available for this notice."}</p></footer>
        </section>
      </div>}
    </>
  );
}

function NoticeField({ label, value }) {
  return <div><p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-0.5 font-semibold text-[#172B4D]">{value}</p></div>;
}

function AttendanceValue({ value }) {
  const label = value === true ? "Yes" : value === false ? "No" : "Not marked";
  const tone = value === true ? "bg-emerald-50 text-emerald-700" : value === false ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-500";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${tone}`}>{label}</span>;
}
