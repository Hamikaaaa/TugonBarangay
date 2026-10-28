import { useCallback, useEffect, useState } from "react";
import { Download, FileText, Save, Trash2, Upload } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { DEFAULT_SUMMONS_SETTINGS } from "../../constants/summonsSettings";
import { primaryButtonClass } from "../../utils/buttonStyles";

const API_URL = "http://127.0.0.1:8000/api";

const SETTINGS_FIELDS = [
  { name: "barangay_name", label: "Barangay name" },
  { name: "municipality", label: "Municipality" },
  { name: "province", label: "Province" },
  { name: "office_heading", label: "Office heading" },
  { name: "notice_title", label: "Notice title" },
  { name: "notice_subtitle", label: "Notice subtitle" },
  { name: "signatory_title", label: "Signatory title" },
  { name: "default_venue", label: "Default meeting venue" },
  { name: "opening_text", label: "Opening text", multiline: true },
  { name: "closing_text", label: "Closing text", multiline: true },
];

function SummonsSettings() {
  const { token } = useAuth();
  const [settings, setSettings] = useState(DEFAULT_SUMMONS_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [templateFile, setTemplateFile] = useState(null);
  const [removeTemplate, setRemoveTemplate] = useState(false);
  const [templateUrl, setTemplateUrl] = useState("");
  const [templateError, setTemplateError] = useState("");

  useEffect(() => {
    if (!token || !settings.uploaded_template_name || !/\.jpe?g$/i.test(settings.uploaded_template_name)) {
      setTemplateUrl("");
      return undefined;
    }
    let active = true;
    let objectUrl = "";
    fetch(`${API_URL}/admin/complaints/summons-settings/template`, { headers: authHeaders(token) })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load the paper design preview.");
        return response.blob();
      })
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setTemplateUrl(objectUrl);
      })
      .catch(() => setTemplateUrl(""));
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [token, settings.uploaded_template_name]);

  useEffect(() => () => {
    if (templateFile?.previewUrl) URL.revokeObjectURL(templateFile.previewUrl);
  }, [templateFile]);

  const loadSettings = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/admin/complaints/summons-settings`, {
        headers: authHeaders(token),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Unable to load notice settings.");
      setSettings({ ...DEFAULT_SUMMONS_SETTINGS, ...payload.data });
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSettings();
  }, [loadSettings]);

  const updateField = (event) => {
    setSettings((current) => ({ ...current, [event.target.name]: event.target.value }));
    setNotice("");
  };

  const saveSettings = async (event) => {
    event.preventDefault();
    if (!token || saving) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`${API_URL}/admin/complaints/summons-settings`, {
        method: "PUT",
        headers: { ...authHeaders(token), "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Unable to save notice settings.");
      let saved = payload.data;
      if (templateFile || removeTemplate) {
        const formData = new FormData();
        if (templateFile) formData.append("template_file", templateFile.file);
        if (removeTemplate) formData.append("remove_template", "1");
        const uploadResponse = await fetch(`${API_URL}/admin/complaints/summons-settings/template`, {
          method: "POST", headers: authHeaders(token), body: formData,
        });
        const uploadPayload = await uploadResponse.json();
        if (!uploadResponse.ok) throw new Error(uploadPayload.message || "Settings saved, but the template upload failed.");
        saved = uploadPayload.data;
      }
      setSettings({ ...DEFAULT_SUMMONS_SETTINGS, ...saved });
      setTemplateFile(null);
      setRemoveTemplate(false);
      setNotice("Summons settings and template saved.");
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
      <>
        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
        {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{notice}</p>}

        <form onSubmit={saveSettings} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-6 p-5 sm:p-7 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
            <div>
              <h2 className="text-base font-bold text-[#172B4D]">Document content</h2>
              <p className="mt-1 text-sm text-slate-500">These settings are shared with the Summons page in the complaint staff portal.</p>
              {loading ? <div className="mt-6 h-40 animate-pulse rounded-xl bg-slate-100" /> : (
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {SETTINGS_FIELDS.map((field) => (
                    <label key={field.name} className={`block text-xs font-bold text-slate-600 ${field.multiline ? "sm:col-span-2" : ""}`}>
                      {field.label}
                      {field.multiline ? (
                        <textarea name={field.name} value={settings[field.name] || ""} onChange={updateField} rows={field.name === "opening_text" ? 4 : 3} required className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-700 outline-none focus:border-[#2455D6] focus:ring-2 focus:ring-[#2455D6]/10" />
                      ) : (
                        <input name={field.name} value={settings[field.name] || ""} onChange={updateField} required className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-normal text-slate-700 outline-none focus:border-[#2455D6] focus:ring-2 focus:ring-[#2455D6]/10" />
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <aside className="h-fit rounded-2xl border border-[#DCE6F3] bg-[#F7F9FC] p-5">
              <h3 className="text-sm font-bold text-[#172B4D]">Preview</h3>
              <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Republic of the Philippines</p>
                <p className="mt-1 text-xs font-bold uppercase text-[#172B4D]">{settings.province}</p>
                <p className="text-xs font-bold uppercase text-[#172B4D]">{settings.municipality}</p>
                <p className="mt-2 text-sm font-extrabold uppercase text-[#123F70]">Barangay {settings.barangay_name}</p>
                <p className="mt-1 text-[9px] font-semibold text-slate-500">{settings.office_heading}</p>
                <p className="mt-5 text-xs font-bold uppercase tracking-wide text-[#172B4D]">{settings.notice_title}</p>
                <p className="mt-1 text-xs text-slate-500">{settings.notice_subtitle}</p>
              </div>
              <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 text-xs leading-5 text-slate-600">
                <p>{settings.opening_text}</p>
                <p className="mt-3">{settings.closing_text}</p>
                <p className="mt-4 border-t border-slate-100 pt-3 text-center font-semibold text-[#172B4D]">{settings.signatory_title}</p>
              </div>
              <p className="mt-4 text-xs leading-5 text-slate-500">Use <code className="rounded bg-white px-1 py-0.5 text-[#2455D6]">{"{{barangay_name}}"}</code> in the opening text to insert the configured barangay name.</p>
            </aside>

            <section className="rounded-2xl border border-[#DCE6F3] bg-[#F7F9FC] p-5 xl:col-span-2">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-blue-50 p-2.5 text-[#2455D6]"><FileText size={18} /></div>
                <div><h3 className="text-sm font-bold text-[#172B4D]">Notice paper template</h3><p className="mt-1 text-xs leading-5 text-slate-500">Upload a JPEG to use as the notice paper design, or attach a PDF/Word file for staff to download. Maximum size: 10 MB.</p></div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  <Upload size={15} /> Choose template
                  <input type="file" accept=".jpg,.jpeg,.pdf,.doc,.docx" className="sr-only" onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    if (file.size > 10 * 1024 * 1024) { setTemplateError("Template must be 10 MB or smaller."); return; }
                    setTemplateError("");
                    setTemplateFile({ file, previewUrl: /\.jpe?g$/i.test(file.name) ? URL.createObjectURL(file) : "" });
                    setRemoveTemplate(false);
                  }} />
                </label>
                {(templateFile || settings.uploaded_template_name) && <span className="text-sm font-medium text-slate-600">{templateFile?.file.name || settings.uploaded_template_name}</span>}
                {!templateFile && settings.uploaded_template_name && <button type="button" onClick={async () => {
                  try {
                    const response = await fetch(`${API_URL}/admin/complaints/summons-settings/template`, { headers: authHeaders(token) });
                    if (!response.ok) throw new Error("Unable to download the template.");
                    const blob = await response.blob();
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a"); link.href = url; link.download = settings.uploaded_template_name; link.click(); URL.revokeObjectURL(url);
                  } catch (downloadError) { setTemplateError(downloadError.message); }
                }} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#2455D6]"><Download size={15} /> Download current</button>}
                {(settings.uploaded_template_name || templateFile) && <label className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-red-600"><input type="checkbox" checked={removeTemplate} onChange={(event) => { setRemoveTemplate(event.target.checked); if (event.target.checked) setTemplateFile(null); }} /><Trash2 size={14} /> Remove template</label>}
              </div>
              {templateError && <p role="alert" className="mt-2 text-xs font-semibold text-red-600">{templateError}</p>}
              {(templateFile?.previewUrl || templateUrl) && !removeTemplate && <img src={templateFile?.previewUrl || templateUrl} alt="Summons paper template preview" className="mt-4 max-h-72 max-w-full rounded-lg border border-slate-200 bg-white object-contain" />}
            </section>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:px-7">
            <p className="text-xs text-slate-500">Changes apply to future notices prepared by complaint staff.</p>
            <button type="submit" disabled={loading || saving} className={`${primaryButtonClass} inline-flex items-center gap-2 px-5 disabled:cursor-wait disabled:opacity-50`}>
              <Save size={15} aria-hidden="true" /> {saving ? "Saving..." : "Save settings"}
            </button>
          </div>
        </form>
      </>
  );
}

function authHeaders(token) {
  return { Accept: "application/json", Authorization: `Bearer ${token}` };
}

export default SummonsSettings;
