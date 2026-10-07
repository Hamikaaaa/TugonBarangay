import { useCallback, useEffect, useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import { useAuth } from "../../context/AuthContext";

const API_URL = "http://127.0.0.1:8000/api";
const fieldTypes = ["text", "textarea", "number", "date", "email", "tel", "select"];

const blankType = () => ({
  label: "",
  fee_mode: "fixed",
  fee: "0",
  one_time: false,
  active: true,
  template: "",
  applicant_fields: [],
  fields: [],
  requirements: [],
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
      fee: Number(draft.fee || 0),
      applicant_fields: draft.applicant_fields.map(normalizeField),
      fields: draft.fields.map(normalizeField),
      requirements: draft.requirements,
    };
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
      setNotice(result.message);
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
          key: `new_field_${current[section].length + 1}`,
          label: "",
          type: "text",
          required: true,
          section: section === "applicant_fields" ? "applicant" : "details",
          options: [],
        },
      ],
    }));
  };

  const removeEntry = (section, index) => {
    setDraft((current) => ({
      ...current,
      [section]: current[section].filter((_, entryIndex) => entryIndex !== index),
    }));
  };

  return (
    <AdminLayout title="Document Types">
      <section className="pt-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#2455D6]">
              Resident service configuration
            </p>
            <h2 className="mt-2 text-3xl font-bold text-[#172B4D]">Document types</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Configure document types, resident information fields, fees, required uploads, and certificate templates.
              Staff handle request review, decisions, and release workflow.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDraft(blankType())}
            className="rounded-xl bg-[#2455D6] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#1948B8]"
          >
            Add document type
          </button>
        </div>

        {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        {notice && <p role="status" className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p>}

        {draft && (
          <form onSubmit={saveType} className="mt-6 space-y-5 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#172B4D]">{draft.id ? "Edit document type" : "New document type"}</h3>
              <button type="button" onClick={() => setDraft(null)} className="text-sm font-semibold text-slate-500 hover:text-slate-800">Cancel</button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="sm:col-span-2">
                <span className="text-xs font-bold text-slate-600">Resident-facing name</span>
                <input required maxLength={150} value={draft.label} onChange={(event) => setDraft({ ...draft, label: event.target.value })} className={controlClass} />
              </label>
              <label>
                <span className="text-xs font-bold text-slate-600">Fee setting</span>
                <select value={draft.fee_mode} onChange={(event) => setDraft({ ...draft, fee_mode: event.target.value })} className={controlClass}>
                  <option value="fixed">Fixed fee</option>
                  <option value="assessed">Staff assesses fee</option>
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
                <input type="checkbox" checked={draft.one_time} onChange={(event) => setDraft({ ...draft, one_time: event.target.checked })} />
                Limit to one active/issued request per resident
              </label>
            </div>

            <SchemaEditor title="Applicant information" section="applicant_fields" fields={draft.applicant_fields} changeField={changeField} addField={addField} removeEntry={removeEntry} />
            <SchemaEditor title="Additional request fields" section="fields" fields={draft.fields} changeField={changeField} addField={addField} removeEntry={removeEntry} />

            <label className="block border-t border-slate-100 pt-4">
              <span className="text-sm font-bold text-[#172B4D]">Document template</span>
              <span className="mt-1 block text-xs text-slate-500">
                Write the certificate body. Use placeholders such as {"{{full_name}}"}, {"{{address}}"}, {"{{purpose}}"}, {"{{document_number}}"}, and {"{{date_issued}}"}.
                Leave blank to use the built-in template.
              </span>
              <textarea
                rows={9}
                maxLength={20000}
                value={draft.template || ""}
                onChange={(event) => setDraft({ ...draft, template: event.target.value })}
                className={`${controlClass} font-mono`}
                placeholder={"This is to certify that {{full_name}}, residing at {{address}}, is requesting this document for {{purpose}}."}
              />
            </label>

            <div className="border-t border-slate-100 pt-4">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-sm font-bold text-[#172B4D]">Required uploads</h4>
                <button type="button" onClick={() => setDraft((current) => ({ ...current, requirements: [...current.requirements, { key: `upload_${current.requirements.length + 1}`, label: "", required: true }] }))} className="text-xs font-bold text-[#2455D6]">Add upload</button>
              </div>
              <div className="space-y-2">
                {draft.requirements.map((requirement, index) => (
                  <div key={`${requirement.key}-${index}`} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto]">
                    <input required aria-label="Upload key" value={requirement.key} onChange={(event) => setDraft((current) => ({ ...current, requirements: current.requirements.map((item, itemIndex) => itemIndex === index ? { ...item, key: event.target.value } : item) }))} className={controlClass} />
                    <input required aria-label="Upload name" placeholder="e.g. Government-issued ID" value={requirement.label} onChange={(event) => setDraft((current) => ({ ...current, requirements: current.requirements.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item) }))} className={controlClass} />
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-600"><input type="checkbox" checked={requirement.required} onChange={(event) => setDraft((current) => ({ ...current, requirements: current.requirements.map((item, itemIndex) => itemIndex === index ? { ...item, required: event.target.checked } : item) }))} />Required</label>
                    <button type="button" onClick={() => removeEntry("requirements", index)} className="text-xs font-bold text-red-600">Remove</button>
                  </div>
                ))}
                {draft.requirements.length === 0 && <p className="text-xs text-slate-400">No upload requirements configured.</p>}
              </div>
            </div>
            <button disabled={saving} className="rounded-xl bg-[#2455D6] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? "Saving..." : "Save document type"}</button>
          </form>
        )}

        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {loading ? <p className="p-6 text-sm text-slate-500">Loading document types...</p> : (
            <div className="divide-y divide-slate-100">
              {types.map((type) => (
                <div key={type.id} className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5">
                  <div>
                    <p className="font-bold text-[#172B4D]">{type.label}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {type.fee_mode === "assessed" ? "Fee assessed by staff" : `₱${Number(type.fee).toFixed(2)}`}
                      {" · "}{type.applicant_fields.length + type.fields.length} form fields
                      {" · "}{type.requirements.length} upload requirements
                      {type.one_time ? " · One-time" : ""}
                      {type.active ? "" : " · Disabled"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setDraft({ ...type, fee: String(type.fee) })} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:border-[#2455D6] hover:text-[#2455D6]">Edit settings</button>
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

function SchemaEditor({ title, section, fields, changeField, addField, removeEntry }) {
  return (
    <div className="border-t border-slate-100 pt-4">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-bold text-[#172B4D]">{title}</h4>
        <button type="button" onClick={() => addField(section)} className="text-xs font-bold text-[#2455D6]">Add field</button>
      </div>
      <div className="space-y-3">
        {fields.map((field, index) => (
          <div key={`${field.key}-${index}`} className="grid gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-2 lg:grid-cols-4">
            <input required aria-label="Field key" value={field.key} onChange={(event) => changeField(section, index, { key: event.target.value })} className={controlClass} />
            <input required aria-label="Field label" placeholder="Field label" value={field.label} onChange={(event) => changeField(section, index, { label: event.target.value })} className={controlClass} />
            <select value={field.type} onChange={(event) => changeField(section, index, { type: event.target.value })} className={controlClass}>
              {fieldTypes.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600"><input type="checkbox" checked={field.required} onChange={(event) => changeField(section, index, { required: event.target.checked })} />Required</label>
              <button type="button" onClick={() => removeEntry(section, index)} className="text-xs font-bold text-red-600">Remove</button>
            </div>
            {field.type === "select" && (
              <input
                aria-label="Dropdown options"
                placeholder="Dropdown options, separated by commas"
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
  return { ...field, options: field.type === "select" ? field.options || [] : undefined };
}

function authHeaders(token) {
  return { Accept: "application/json", Authorization: `Bearer ${token}` };
}

const controlClass = "mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#2455D6] focus:ring-2 focus:ring-[#2455D6]/10 disabled:bg-slate-100";

export default DocumentTypes;
