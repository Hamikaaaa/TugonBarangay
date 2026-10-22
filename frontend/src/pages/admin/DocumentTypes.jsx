import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import AdminPageHeader from "../../components/admin/AdminPageHeader";
import DocumentRequestTabs from "../../components/admin/DocumentRequestTabs";
import { useAuth } from "../../context/AuthContext";
import { primaryButtonClass } from "../../utils/buttonStyles";
import FIRST_TIME_JOBSEEKER_WORDING from "../../constants/firstTimeJobseekerWording";

const API_URL = "http://127.0.0.1:8000/api";
const fieldTypes = ["text", "textarea", "number", "date", "email", "tel", "select"];
const fieldTypeLabels = {
  text: "Short answer",
  textarea: "Long answer",
  number: "Number",
  date: "Date",
  email: "Email address",
  tel: "Phone number",
  select: "Choose from a list",
};

const BARANGAY_CERTIFICATE_WORDING = `This is to certify that {{first_name}} {{middle_name}} {{last_name}}, {{age}} years old, {{sex}}, {{civil_status}}, {{citizenship}} citizen, and a bona fide resident of Purok {{purok}}, Barangay Tayud, Consolacion, Cebu, is an indigent member of this barangay.\n\nThis certification is issued at the request of the above-named person for {{purpose}} and for whatever legal purpose it may serve.\n\nIssued and given this {{issued_day}} day of {{issued_month}}, {{issued_year}}, at Barangay Tayud, Consolacion, Cebu, Philippines.`;
const INDIGENCY_CERTIFICATE_WORDING = `To whom it may concern:\n\nThis is to certify that {{full_name}} is a resident of Purok {{purok}}, Barangay Tayud, Municipality of Consolacion and Province of Cebu.\n\nIt is further certified that the aforementioned person is without formal employment and without income.\n\nThis certification is issued upon the request of the above-mentioned person for {{purpose}} and for whatever legal purpose it may serve.\n\nIssued and given this {{issued_day}} day of {{issued_month}}, {{issued_year}}, at Barangay Tayud, Consolacion, Cebu, Philippines.`;
const RESIDENCY_CERTIFICATE_WORDING = `To whom it may concern:\n\nThis is to certify that based on Record of Barangay Inhabitants (RBI), {{full_name}} is a bonafide resident of Purok {{purok}}, Barangay Tayud, Municipality of Consolacion and Province of Cebu, for {{years_of_residency}} years.\n\nThis certification is issued upon the request of the abovementioned name.\n\n\tIssued this {{issued_day}} of {{issued_month}} {{issued_year}} at the Office of the Punong Barangay, Barangay Tayud, Municipality of Consolacion, Province of Cebu, Philippines.`;

function makeFieldKey(label, fallback = "answer") {
  const key = String(label || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return key.length >= 2 ? key.slice(0, 64) : fallback;
}

const blankType = () => ({
  label: "",
  description: "",
  fee_mode: "fixed",
  fee: "0",
  one_time: false,
  active: true,
  template_enabled: true,
  paper_size: "letter",
  document_layout: { content_top: 64, content_left: 19, content_right: 19, content_bottom: 19, font_size_pt: 12, text_color: "#1f2937", accent_color: "#123f70" },
  template: "",
  applicant_fields: [],
  fields: [],
  requirements: [],
  templateFile: null,
  remove_template: false,
});

const RECOMMENDED_LAYOUT = { content_top: 64, content_left: 19, content_right: 19, content_bottom: 19, font_size_pt: 12, text_color: "#1f2937", accent_color: "#123f70" };
const clampLayout = (layout = {}) => ({
  ...RECOMMENDED_LAYOUT,
  ...layout,
  content_top: Math.min(76, Math.max(51, Number(layout.content_top ?? RECOMMENDED_LAYOUT.content_top))),
  content_left: Math.min(38, Math.max(13, Number(layout.content_left ?? RECOMMENDED_LAYOUT.content_left))),
  content_right: Math.min(38, Math.max(13, Number(layout.content_right ?? RECOMMENDED_LAYOUT.content_right))),
  content_bottom: Math.min(38, Math.max(13, Number(layout.content_bottom ?? RECOMMENDED_LAYOUT.content_bottom))),
  font_size_pt: Math.min(14, Math.max(10, Number(layout.font_size_pt ?? RECOMMENDED_LAYOUT.font_size_pt))),
});

function DocumentTypes() {
  const { token } = useAuth();
  const [types, setTypes] = useState([]);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [deletingTypeId, setDeletingTypeId] = useState(null);
  const [downloadingTemplateId, setDownloadingTemplateId] = useState(null);

  const loadTypes = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/admin/document-types`, {
        headers: authHeaders(token),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Unable to load document types.");
      setTypes(payload.data || []);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      // Fetching the catalog synchronizes this page with the admin API.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadTypes();
    }
  }, [loadTypes, token]);

  const saveType = async (event) => {
    event.preventDefault();
    if (!draft || saving) return;
    setSaving(true);
    setError("");
    setNotice("");
    const payload = {
      ...draft,
      description: draft.description || "",
      // Keep the decimal string intact through JSON; the API stores fee as DECIMAL(10,2).
      fee: String(draft.fee || "0"),
      applicant_fields: draft.applicant_fields.map(normalizeField),
      fields: draft.fields.map(normalizeField),
      requirements: draft.requirements.map((requirement) => ({
        ...requirement,
        enabled: requirement.enabled !== false,
        requiredWhen: normalizeCondition(requirement.requiredWhen),
        showWhen: normalizeCondition(requirement.showWhen),
      })),
    };
    delete payload.templateFile;
    delete payload.remove_template;
    delete payload.templatePreviewUrl;
    try {
      const response = await fetch(
        draft.id
          ? `${API_URL}/admin/document-types/${draft.id}`
          : `${API_URL}/admin/document-types`,
        {
          method: draft.id ? "PUT" : "POST",
          headers: { ...authHeaders(token), "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to save document type.");
      if (draft.templateFile || draft.remove_template) {
        const templateData = new FormData();
        if (draft.templateFile) templateData.append("template_file", draft.templateFile);
        if (draft.remove_template) templateData.append("remove_template", "1");
        const templateResponse = await fetch(`${API_URL}/admin/document-types/${result.data.id}/template`, {
          method: "POST",
          headers: authHeaders(token),
          body: templateData,
        });
        const templateResult = await templateResponse.json();
        if (!templateResponse.ok) {
          setDraft({ ...draft, id: result.data.id });
          throw new Error(templateResult.message || "The document type was saved, but its uploaded template could not be updated.");
        }
      }
      setNotice(result.message || "Document type saved.");
      if (draft.templatePreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(draft.templatePreviewUrl);
      setDraft(null);
      await loadTypes();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteType = async (type) => {
    if (deletingTypeId) return;
    if (!window.confirm(`Delete "${type.label}"? Types with request history cannot be deleted.`)) return;

    setDeletingTypeId(type.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`${API_URL}/admin/document-types/${type.id}`, {
        method: "DELETE",
        headers: authHeaders(token),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to delete document type.");
      setNotice(result.message);
      await loadTypes();
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setDeletingTypeId(null);
    }
  };

  const downloadTemplate = async (type) => {
    if (downloadingTemplateId !== null) return;
    setDownloadingTemplateId(type.id);
    setError("");
    try {
      const response = await fetch(`${API_URL}/admin/document-types/${type.id}/template`, {
        headers: authHeaders(token),
      });
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.message || "Unable to download the uploaded template.");
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = type.uploaded_template_name || "document-template";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (downloadError) {
      setError(downloadError.message);
    } finally {
      setDownloadingTemplateId(null);
    }
  };

  const changeField = (section, index, updates) => {
    setDraft((current) => ({
      ...current,
      [section]: current[section].map((field, fieldIndex) =>
        fieldIndex === index ? { ...field, ...updates } : field,
      ),
    }));
  };

  const addField = (section) => {
    setDraft((current) => ({
      ...current,
      [section]: [
        ...current[section],
        {
          key: `${section === "applicant_fields" ? "applicant" : "detail"}_field_${current[section].length + 1}`,
          label: "",
          type: "text",
          required: true,
          enabled: true,
          section: section === "applicant_fields" ? "applicant" : "details",
          options: [],
        },
      ],
    }));
  };

  const openEditType = async (type) => {
    if (draft?.templatePreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(draft.templatePreviewUrl);
    setDraft({
      ...type,
      fee: String(type.fee),
      template: type.template || (type.value === "Barangay Certificate"
        ? BARANGAY_CERTIFICATE_WORDING
        : type.value === "Barangay Indigency"
          ? INDIGENCY_CERTIFICATE_WORDING
        : type.value === "Barangay Residency"
          ? RESIDENCY_CERTIFICATE_WORDING
        : type.value === "First-Time Jobseeker Certification"
          ? FIRST_TIME_JOBSEEKER_WORDING
          : ""),
      document_layout: clampLayout(type.document_layout),
      templateFile: null,
      templatePreviewUrl: "",
      remove_template: false,
      applicant_fields: (type.applicant_fields || []).map((field) => ({ enabled: true, ...field })),
      fields: (type.fields || []).map((field) => ({ enabled: true, ...field })),
      requirements: (type.requirements || []).map((requirement) => ({ enabled: true, ...requirement })),
    });
    if (!type.uploaded_template_name || !/\.jpe?g$/i.test(type.uploaded_template_name)) return;
    try {
      const response = await fetch(`${API_URL}/admin/document-types/${type.id}/template`, {
        headers: authHeaders(token),
      });
      if (!response.ok) return;
      const previewUrl = URL.createObjectURL(await response.blob());
      setDraft((current) => current?.id === type.id ? { ...current, templatePreviewUrl: previewUrl } : current);
    } catch {
      // The current image remains available through the download button if preview fails.
    }
  };

  const chooseTemplate = (file) => {
    setDraft((current) => {
      if (current.templatePreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(current.templatePreviewUrl);
      return {
        ...current,
        templateFile: file || null,
        templatePreviewUrl: file?.type.startsWith("image/") ? URL.createObjectURL(file) : "",
        remove_template: false,
      };
    });
  };

  const closeEditor = () => {
    if (draft?.templatePreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(draft.templatePreviewUrl);
    setDraft(null);
  };

  const removeEntry = (section, index) => {
    setDraft((current) => ({
      ...current,
      [section]: current[section].filter((_, entryIndex) => entryIndex !== index),
    }));
  };

  const reorderEntry = (section, fromIndex, toIndex) => {
    setDraft((current) => {
      const items = [...current[section]];
      if (fromIndex < 0 || fromIndex >= items.length || toIndex < 0 || toIndex >= items.length || fromIndex === toIndex) return current;
      const [moved] = items.splice(fromIndex, 1);
      items.splice(toIndex, 0, moved);
      return { ...current, [section]: items };
    });
  };

  return (
    <AdminLayout title="Document Types">
      <section className="space-y-6 pt-6">
        <AdminPageHeader
          eyebrow="Resident service configuration"
          title="Document types"
          description="Add and update the documents residents can request, the details they must provide, and the design used for each document."
        >
          <button
            type="button"
            onClick={() => setDraft(blankType())}
            className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-[#2455D6] shadow-lg transition hover:-translate-y-0.5 hover:bg-[#EEF4FF] hover:shadow-xl active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Add document type
          </button>
        </AdminPageHeader>

        <DocumentRequestTabs />

        {error && <p role="alert" className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        {notice && <p role="status" className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p>}

        {draft && (
          <form onSubmit={saveType} className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between">
              <div><h3 className="text-lg font-bold text-[#172B4D]">{draft.id ? "Edit document" : "Add a document"}</h3><p className="mt-1 text-sm text-slate-500">Set what residents see and what they need to submit.</p></div>
              <button type="button" onClick={closeEditor} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800">Close</button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="sm:col-span-2">
                <span className="text-sm font-semibold text-slate-700">Document name</span>
                <input required maxLength={150} value={draft.label} onChange={(event) => setDraft({ ...draft, label: event.target.value })} className={controlClass} placeholder="For example, Barangay Clearance" />
              </label>
              <label>
                <span className="text-sm font-semibold text-slate-700">Fee</span>
                <select value={draft.fee_mode} onChange={(event) => setDraft({ ...draft, fee_mode: event.target.value })} className={controlClass}>
                  <option value="fixed">Set amount</option>
                  <option value="assessed">Set by staff</option>
                </select>
              </label>
              <label>
                <span className="text-xs font-bold text-slate-600">Fixed fee (₱)</span>
                <input type="number" min="0" step="0.01" disabled={draft.fee_mode === "assessed"} value={draft.fee} onChange={(event) => setDraft({ ...draft, fee: event.target.value })} className={controlClass} />
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input type="checkbox" checked={draft.active} onChange={(event) => setDraft({ ...draft, active: event.target.checked })} />
                Available to residents
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input type="checkbox" checked={draft.value === "First-Time Jobseeker Certification" || draft.one_time} disabled={draft.value === "First-Time Jobseeker Certification"} onChange={(event) => setDraft({ ...draft, one_time: event.target.checked })} />
                {draft.value === "First-Time Jobseeker Certification" ? "One-time certificate (required)" : "Allow one request per resident"}
              </label>
            </div>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Description for residents</span>
              <textarea rows={3} maxLength={1000} value={draft.description || ""} onChange={(event) => setDraft({ ...draft, description: event.target.value })} className={controlClass} placeholder="Explain what this document is for and any important information." />
            </label>

            <SchemaEditor title="Information residents provide" description="Add the questions residents should answer on the request form. Drag a question or use the arrow buttons to change its order." section="applicant_fields" fields={draft.applicant_fields} changeField={changeField} addField={addField} removeEntry={removeEntry} reorderEntry={reorderEntry} />
            <SchemaEditor title="Other request details" description="Add document-specific questions, such as the purpose of the request. Drag a question or use the arrow buttons to change its order." section="fields" fields={draft.fields} changeField={changeField} addField={addField} removeEntry={removeEntry} reorderEntry={reorderEntry} />

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Printed page size</span>
              <select value={draft.paper_size || "letter"} onChange={(event) => setDraft({ ...draft, paper_size: event.target.value })} className={controlClass}>
                <option value="letter">Letter (8.5 × 11 in)</option>
                <option value="a4">A4 (210 × 297 mm)</option>
                <option value="legal">Legal (8.5 × 14 in)</option>
              </select>
              <span className="mt-1 block text-xs text-slate-500">Staff print previews use this paper size.</span>
            </label>

            <section className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <h4 className="text-sm font-bold text-[#172B4D]">Printed text layout</h4>
                <p className="mt-1 text-xs text-slate-500">Set the text position on the page. The recommended layout is a good starting point.</p>
              </div>
              <label className="text-xs font-semibold text-slate-600">Space from the top edge (inches)
                <input type="number" min="2" max="3" step="0.1" value={((draft.document_layout?.content_top ?? 64) / 25.4).toFixed(1)} onChange={(event) => setDraft({ ...draft, document_layout: { ...draft.document_layout, content_top: Math.round(Number(event.target.value) * 25.4) } })} className={controlClass} />
                <span className="mt-1 block font-normal text-slate-500">Starts below the letterhead. Choose 2 to 3 inches.</span>
              </label>
              <label className="text-xs font-semibold text-slate-600">Space from both side edges (inches)
                <input type="number" min="0.5" max="1.5" step="0.1" value={(((draft.document_layout?.content_left ?? 19) + (draft.document_layout?.content_right ?? 19)) / 2 / 25.4).toFixed(1)} onChange={(event) => setDraft({ ...draft, document_layout: { ...draft.document_layout, content_left: Math.round(Number(event.target.value) * 25.4), content_right: Math.round(Number(event.target.value) * 25.4) } })} className={controlClass} />
                <span className="mt-1 block font-normal text-slate-500">Keeps the wording centered between the left and right edges.</span>
              </label>
              <label className="text-xs font-semibold text-slate-600">Space from the bottom edge (inches)
                <input type="number" min="0.5" max="1.5" step="0.1" value={((draft.document_layout?.content_bottom ?? 19) / 25.4).toFixed(1)} onChange={(event) => setDraft({ ...draft, document_layout: { ...draft.document_layout, content_bottom: Math.round(Number(event.target.value) * 25.4) } })} className={controlClass} />
                <span className="mt-1 block font-normal text-slate-500">Leaves room at the bottom of the page.</span>
              </label>
              <label className="text-xs font-semibold text-slate-600">Body text size
                <select value={draft.document_layout?.font_size_pt ?? 12} onChange={(event) => setDraft({ ...draft, document_layout: { ...draft.document_layout, font_size_pt: Number(event.target.value) } })} className={controlClass}>
                  {[10, 11, 12, 13, 14].map((size) => <option key={size} value={size}>{size} pt</option>)}
                </select>
                <span className="mt-1 block font-normal text-slate-500">12 pt is a clear standard size for printed wording.</span>
              </label>
              <label className="text-xs font-semibold text-slate-600">Body text color
                <input type="color" value={draft.document_layout?.text_color || "#1f2937"} onChange={(event) => setDraft({ ...draft, document_layout: { ...draft.document_layout, text_color: event.target.value } })} className="mt-1 block h-10 w-full rounded-lg border border-slate-200 bg-white p-1" />
              </label>
              <label className="text-xs font-semibold text-slate-600">Heading/accent color
                <input type="color" value={draft.document_layout?.accent_color || "#123f70"} onChange={(event) => setDraft({ ...draft, document_layout: { ...draft.document_layout, accent_color: event.target.value } })} className="mt-1 block h-10 w-full rounded-lg border border-slate-200 bg-white p-1" />
              </label>
              <div className="sm:col-span-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-slate-600">Page preview</p>
                  <button type="button" onClick={() => setDraft({ ...draft, document_layout: { ...RECOMMENDED_LAYOUT } })} className="text-xs font-bold text-[#2455D6] hover:underline">Reset to recommended layout</button>
                </div>
                <div className="relative mx-auto mt-2 aspect-[8.5/11] max-h-56 overflow-hidden border border-slate-300 bg-white shadow-sm" aria-label="Preview showing where printed wording will sit">
                  <div className="absolute border-t border-dashed border-slate-300" style={{ top: `${Math.min(76, Math.max(51, draft.document_layout?.content_top ?? 64)) / 279.4 * 100}%`, left: "4%", right: "4%" }} />
                  <div className="absolute" style={{ top: `${Math.min(76, Math.max(51, draft.document_layout?.content_top ?? 64)) / 279.4 * 100}%`, left: `${Math.min(38, Math.max(13, draft.document_layout?.content_left ?? 19)) / 215.9 * 100}%`, right: `${Math.min(38, Math.max(13, draft.document_layout?.content_right ?? 19)) / 215.9 * 100}%`, color: draft.document_layout?.text_color || "#1f2937" }}>
                    <p className="border-b pb-1 text-center text-[9px] font-bold" style={{ color: draft.document_layout?.accent_color || "#123f70", borderColor: draft.document_layout?.accent_color || "#123f70" }}>{draft.label || "Document title"}</p>
                    <p className="mt-2 leading-relaxed" style={{ fontSize: `${draft.document_layout?.font_size_pt ?? 12}pt` }}>Document wording starts here. It will be printed within the page margins.</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="block border-t border-slate-100 pt-4">
              <span className="text-sm font-bold text-[#172B4D]">Document wording</span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">Write the document as you want it to read. Use the buttons below to add request details automatically. The First-Time Jobseeker wording includes a page break between its two pages.</span>
              <WordingEditor value={draft.template || ""} fields={[...draft.applicant_fields, ...draft.fields]} onChange={(template) => setDraft({ ...draft, template })} />
              <label className="mt-3 flex items-center gap-2 text-sm font-medium text-slate-600">
                <input type="checkbox" checked={draft.template_enabled !== false} onChange={(event) => setDraft({ ...draft, template_enabled: event.target.checked })} />
                Use my wording on the generated document
              </label>
            </section>

            <div className="border-t border-slate-100 pt-4">
              <h4 className="text-sm font-bold text-[#172B4D]">Paper design</h4>
              <p className="mt-1 text-xs text-slate-500">Upload a JPEG image of the document paper design (up to 10 MB). Older PDF or Word files can still be downloaded.</p>
              {draft.uploaded_template_name && !draft.remove_template && (
                <p className="mt-3 text-xs font-semibold text-slate-600">Current file: {draft.uploaded_template_name}</p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <input
                  type="file"
                  accept=".jpg,.jpeg,image/jpeg,.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(event) => chooseTemplate(event.target.files?.[0])}
                  className="block max-w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-[#2455D6]/10 file:px-3 file:py-2 file:text-xs file:font-bold file:text-[#2455D6]"
                />
                {draft.uploaded_template_name && (
                  <label className="flex items-center gap-2 text-xs font-semibold text-red-600">
                    <input
                      type="checkbox"
                      checked={draft.remove_template}
                      onChange={(event) => setDraft({
                        ...draft,
                        remove_template: event.target.checked,
                        templateFile: event.target.checked ? null : draft.templateFile,
                      })}
                    />
                    Remove current design
                  </label>
                )}
              </div>
              {draft.templatePreviewUrl && !draft.remove_template && (
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="mb-2 text-xs font-semibold text-slate-600">Design preview</p>
                  <img src={draft.templatePreviewUrl} alt="Uploaded document paper design" className="max-h-96 max-w-full rounded-lg border border-slate-200 bg-white object-contain shadow-sm" />
                </div>
              )}
              {!draft.id && (draft.templateFile || draft.remove_template) && (
                <p className="mt-2 text-xs text-amber-700">The file will upload after this document type is saved.</p>
              )}
            </div>

            <div className="border-t border-slate-100 pt-4">
              <div className="mb-3 flex items-center justify-between">
                <div><h4 className="text-sm font-bold text-[#172B4D]">Documents residents must attach</h4><p className="mt-1 text-xs text-slate-500">For example, a valid ID or a certificate from the purok.</p></div>
                <button type="button" onClick={() => setDraft((current) => ({ ...current, requirements: [...current.requirements, { key: `upload_${current.requirements.length + 1}`, label: "", required: true, enabled: true }] }))} className="text-sm font-bold text-[#2455D6]">Add attachment</button>
              </div>
              <div className="space-y-2">
                {draft.requirements.map((requirement, index) => (
                  <div key={`${requirement.key}-${index}`} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto]">
                    <input required aria-label="Attachment name" placeholder="For example, Government-issued ID" value={requirement.label} onChange={(event) => setDraft((current) => ({ ...current, requirements: current.requirements.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value, key: makeFieldKey(event.target.value, `upload_${index + 1}`) } : item) }))} className={controlClass} />
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-600"><input type="checkbox" checked={requirement.required} onChange={(event) => setDraft((current) => ({ ...current, requirements: current.requirements.map((item, itemIndex) => itemIndex === index ? { ...item, required: event.target.checked } : item) }))} />Required</label>
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-600"><input type="checkbox" checked={requirement.enabled !== false} onChange={(event) => setDraft((current) => ({ ...current, requirements: current.requirements.map((item, itemIndex) => itemIndex === index ? { ...item, enabled: event.target.checked } : item) }))} />Show to residents</label>
                    <button type="button" onClick={() => removeEntry("requirements", index)} className="text-xs font-bold text-red-600">Remove</button>
                  </div>
                ))}
                {draft.requirements.length === 0 && <p className="text-xs text-slate-400">No upload requirements configured.</p>}
              </div>
            </div>
            <button disabled={saving} className={primaryButtonClass}>{saving ? "Saving..." : "Save document"}</button>
          </form>
        )}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {loading ? <p className="p-6 text-sm text-slate-500">Loading document types...</p> : (
            <div className="divide-y divide-slate-100">
              {types.map((type) => (
                <div key={type.id} className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5">
                  <div>
                    <p className="font-bold text-[#172B4D]">{type.label}</p>
                    {type.description && <p className="mt-1 max-w-2xl text-sm text-slate-500">{type.description}</p>}
                    <p className="mt-1 text-xs text-slate-500">
                      {type.fee_mode === "assessed" ? "Fee assessed by staff" : `₱${Number(type.fee).toFixed(2)}`}
                      {" · "}{type.applicant_fields.length + type.fields.length} form fields
                      {" · "}{type.requirements.length} upload requirements
                      {type.uploaded_template_name ? ` · ${type.uploaded_template_name}` : ""}
                      {type.one_time ? " · One-time" : ""}
                      {type.active ? "" : " · Disabled"}
                      {type.template_enabled === false ? " · Templates disabled" : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {type.uploaded_template_name && (
                      <button
                        type="button"
                        onClick={() => downloadTemplate(type)}
                        disabled={downloadingTemplateId !== null}
                        className="rounded-lg border border-[#D9E6FF] px-3 py-2 text-xs font-bold text-[#2455D6] hover:bg-[#EEF4FF] disabled:opacity-50"
                      >
                        {downloadingTemplateId === type.id ? "Downloading..." : "Download template"}
                      </button>
                    )}
                    <button type="button" onClick={() => openEditType(type)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:border-[#2455D6] hover:text-[#2455D6]">Edit document</button>
                    <button type="button" onClick={() => deleteType(type)} disabled={deletingTypeId === type.id} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50">
                      {deletingTypeId === type.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </AdminLayout>
  );
}

function WordingEditor({ value, fields = [], onChange }) {
  const inputRef = useRef(null);
  const selectionRef = useRef(null);
  const standardTokenLabels = [
    ["full_name", "Resident's name"], ["resident_name", "Resident's name"],
    ["first_name", "First name"], ["middle_name", "Middle name"], ["last_name", "Last name"],
    ["age", "Age"], ["sex", "Sex"], ["civil_status", "Civil status"],
    ["citizenship", "Citizenship"], ["address", "Address"], ["purok", "Purok"],
    ["purpose", "Purpose"], ["date_issued", "Issue date"],
    ["issued_day", "Day"], ["issued_month", "Month"], ["issued_year", "Year"],
    ["years_of_residency", "Years of residency"], ["pronoun", "Pronoun"],
    ["pronoun_verb", "Pronoun verb"], ["pronoun_possessive", "Pronoun possessive"],
    ["punong_barangay_name", "Punong Barangay name"],
    ["page_break", "Page break"],
  ];
  const knownTokenKeys = new Set(standardTokenLabels.map(([key]) => key));
  const tokenLabels = [
    ...standardTokenLabels,
    ...fields
      .filter((field) => field.key && !knownTokenKeys.has(field.key))
      .map((field) => [field.key, field.label || field.key.replaceAll("_", " ")]),
  ];
  const toEditorText = (source) => tokenLabels.reduce((text, [key, label]) => text.replaceAll(`{{${key}}}`, `[${label}]`), source).replaceAll("**", "");
  const toTemplateText = (text) => tokenLabels.reduce((source, [key, label]) => source.replaceAll(`[${label}]`, `{{${key}}}`), text);
  const editorValue = toEditorText(value);
  const insertValue = (token) => {
    const input = inputRef.current;
    const label = token.match(/^\{\{(.+)\}\}$/)?.[1];
    const friendlyLabel = tokenLabels.find(([key]) => key === label)?.[1] || label;
    const insertion = `[${friendlyLabel}]`;
    const start = input?.selectionStart ?? editorValue.length;
    const end = input?.selectionEnd ?? editorValue.length;
    const updated = `${editorValue.slice(0, start)}${insertion}${editorValue.slice(end)}`;
    selectionRef.current = start + insertion.length;
    onChange(toTemplateText(updated));
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(selectionRef.current, selectionRef.current);
    });
  };
  const standardInsertOptions = [
    ["Resident's name", "{{full_name}}"],
    ["Age", "{{age}}"],
    ["Sex", "{{sex}}"],
    ["Civil status", "{{civil_status}}"],
    ["Citizenship", "{{citizenship}}"],
    ["Address", "{{address}}"],
    ["Purpose", "{{purpose}}"],
    ["Issue date", "{{date_issued}}"],
    ["Day", "{{issued_day}}"],
    ["Month", "{{issued_month}}"],
    ["Year", "{{issued_year}}"],
    ["Years of residency", "{{years_of_residency}}"],
    ["Pronoun", "{{pronoun}}"],
    ["Pronoun verb", "{{pronoun_verb}}"],
    ["Pronoun possessive", "{{pronoun_possessive}}"],
    ["Punong Barangay name", "{{punong_barangay_name}}"],
    ["Page break", "{{page_break}}"],
  ];
  const standardInsertKeys = new Set(standardInsertOptions.map(([, token]) => token.slice(2, -2)));
  const insertOptions = [
    ...standardInsertOptions,
    ...fields
      .filter((field) => field.key && !standardInsertKeys.has(field.key))
      .map((field) => [field.label || field.key.replaceAll("_", " "), `{{${field.key}}}`]),
  ];

  return (
    <div className="mt-2">
      <div className="mb-2 rounded-xl border border-blue-100 bg-blue-50/70 p-3">
        <p className="text-xs font-semibold text-[#244873]">Add details automatically</p>
        <p className="mt-1 text-xs text-slate-600">Click where the detail should go in your wording, then choose a button.</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {insertOptions.map(([label, token]) => (
            <button key={token} type="button" onClick={() => insertValue(token)} className="rounded-full border border-blue-200 bg-white px-2.5 py-1 text-xs font-semibold text-[#2455D6] hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-300">
              + {label}
            </button>
          ))}
        </div>
      </div>
      <textarea
        ref={inputRef}
        rows={8}
        maxLength={20000}
        value={editorValue}
        onChange={(event) => onChange(toTemplateText(event.target.value))}
        className={controlClass}
        placeholder="Example: This is to certify that [insert resident's name], a resident of [insert address], requested this document for [insert purpose]."
      />
    </div>
  );
}

function SchemaEditor({ title, description, section, fields, changeField, addField, removeEntry, reorderEntry }) {
  return (
    <div className="border-t border-slate-100 pt-4">
      <div className="mb-3 flex items-center justify-between">
        <div><h4 className="text-sm font-bold text-[#172B4D]">{title}</h4><p className="mt-1 text-xs text-slate-500">{description}</p></div>
        <button type="button" onClick={() => addField(section)} className="whitespace-nowrap text-sm font-bold text-[#2455D6]">Add question</button>
      </div>
      <div className="space-y-3">
        {fields.map((field, index) => (
          <div
            key={`${field.key}-${index}`}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const fromIndex = Number(event.dataTransfer.getData("text/plain"));
              reorderEntry(section, fromIndex, index);
            }}
            className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2"
          >
            <div className="flex items-center gap-1 sm:col-span-2">
              <button
                type="button"
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData("text/plain", String(index));
                  event.dataTransfer.effectAllowed = "move";
                }}
                aria-label={`Drag to reorder ${field.label || "question"}`}
                title="Drag to reorder"
                className="cursor-grab touch-none rounded p-1.5 text-slate-500 hover:bg-slate-200 active:cursor-grabbing"
              ><GripVertical className="h-4 w-4" aria-hidden="true" /></button>
              <span className="mr-auto text-xs font-semibold text-slate-500">Question {index + 1}</span>
              <button type="button" onClick={() => reorderEntry(section, index, index - 1)} disabled={index === 0} aria-label={`Move ${field.label || "question"} up`} className="rounded p-1.5 text-slate-500 hover:bg-slate-200 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
              <button type="button" onClick={() => reorderEntry(section, index, index + 1)} disabled={index === fields.length - 1} aria-label={`Move ${field.label || "question"} down`} className="rounded p-1.5 text-slate-500 hover:bg-slate-200 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
            </div>
            <input required aria-label="Question" placeholder="Question residents will answer" value={field.label} onChange={(event) => changeField(section, index, { label: event.target.value })} className={controlClass} />
            <select aria-label="Answer format" value={field.type} onChange={(event) => changeField(section, index, { type: event.target.value })} className={controlClass}>
              {fieldTypes.map((type) => <option key={type} value={type}>{fieldTypeLabels[type]}</option>)}
            </select>
            {field.type === "number" && (
              <div className="grid grid-cols-3 gap-2 sm:col-span-2 lg:col-span-4">
                <input type="number" aria-label="Minimum value" placeholder="Minimum" value={field.min ?? ""} onChange={(event) => changeField(section, index, { min: event.target.value === "" ? undefined : Number(event.target.value) })} className={controlClass} />
                <input type="number" aria-label="Maximum value" placeholder="Maximum" value={field.max ?? ""} onChange={(event) => changeField(section, index, { max: event.target.value === "" ? undefined : Number(event.target.value) })} className={controlClass} />
                <input type="number" aria-label="Step value" min="0.01" step="any" placeholder="Step" value={field.step ?? ""} onChange={(event) => changeField(section, index, { step: event.target.value === "" ? undefined : Number(event.target.value) })} className={controlClass} />
              </div>
            )}
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600"><input type="checkbox" checked={field.required} onChange={(event) => changeField(section, index, { required: event.target.checked })} />Required</label>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600"><input type="checkbox" checked={field.enabled !== false} onChange={(event) => changeField(section, index, { enabled: event.target.checked })} />Show this question</label>
              </div>
              <button type="button" onClick={() => removeEntry(section, index)} className="text-xs font-bold text-red-600">Remove</button>
            </div>
            {field.type === "select" && (
              <input
                aria-label="Dropdown options"
                placeholder="Choices separated by commas (for example: Single, Married, Widowed)"
                value={(field.options || []).join(", ")}
                onChange={(event) => changeField(section, index, { options: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })}
                className={`${controlClass} sm:col-span-2 lg:col-span-4`}
              />
            )}
          </div>
        ))}
        {fields.length === 0 && <p className="text-xs text-slate-400">No fields in this section.</p>}
      </div>
    </div>
  );
}

function normalizeField(field) {
  return {
    ...field,
    options: field.type === "select" ? field.options || [] : undefined,
    requiredWhen: normalizeCondition(field.requiredWhen),
    showWhen: normalizeCondition(field.showWhen),
  };
}

function normalizeCondition(condition) {
  if (!condition?.key || condition.value === undefined || condition.value === "") return undefined;
  if (Array.isArray(condition.value) && condition.value.length === 0) return undefined;
  return condition;
}

function authHeaders(token) {
  return { Accept: "application/json", Authorization: `Bearer ${token}` };
}

const controlClass = "mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#2455D6] focus:ring-2 focus:ring-[#2455D6]/10 disabled:bg-slate-100";

export default DocumentTypes;
