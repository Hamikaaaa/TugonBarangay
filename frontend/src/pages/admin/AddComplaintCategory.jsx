import { Check, LoaderCircle, X } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../../context/AuthContext";

const API_URL = "http://127.0.0.1:8000/api";

function AddComplaintCategory({ onClose, onCreated }) {
  const { token } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    if (!token || saving) return;
    setSaving(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/admin/complaint-categories`, {
        method: "POST",
        headers: { ...authHeaders(token), "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          enabled: true,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(firstValidationError(payload) || payload.message || "Unable to add the complaint category.");
      }
      await onCreated();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-[#071B3D]/55 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-category-title"
        className="w-full max-w-lg space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="add-category-title" className="text-lg font-bold text-[#172B4D]">
              Add complaint category
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Create a category residents can select when submitting a complaint.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close add category"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <label className="block text-sm font-semibold text-slate-700">
          Category name
          <input
            required
            maxLength={255}
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#2455D6] focus:ring-2 focus:ring-[#2455D6]/10"
          />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Description
          <textarea
            maxLength={1000}
            rows={4}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none transition focus:border-[#2455D6] focus:ring-2 focus:ring-[#2455D6]/10"
          />
        </label>
        {error && (
          <p role="alert" className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#2455D6] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#1948B8] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? <LoaderCircle size={15} className="animate-spin" aria-hidden="true" /> : <Check size={15} aria-hidden="true" />}
            {saving ? "Adding..." : "Add category"}
          </button>
        </div>
      </form>
    </div>
  );
}

function authHeaders(token) {
  return { Accept: "application/json", Authorization: `Bearer ${token}` };
}

function firstValidationError(payload) {
  return payload.errors ? Object.values(payload.errors).flat()[0] : null;
}

export default AddComplaintCategory;