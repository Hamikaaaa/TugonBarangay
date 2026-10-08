import { ArrowLeft, CirclePlus } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import { useAuth } from "../../context/AuthContext";

const API_URL = "http://127.0.0.1:8000/api";

function AddComplaintCategory() {
  const { token } = useAuth();
  const navigate = useNavigate();
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
      navigate("/admin/complaints");
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout title="Add Complaint Category">
      <div className="mx-auto w-full max-w-[760px] py-7">
        <Link to="/admin/complaints" className="inline-flex items-center gap-2 text-sm font-semibold text-[#2455D6] hover:text-[#1948B8]">
          <ArrowLeft size={16} />
          Back to categories
        </Link>

        <section className="mt-6 border-y border-slate-200 py-6">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#2455D6]">Complaints</p>
          <h2 className="mt-2 text-2xl font-bold text-[#132A4A]">Add category</h2>
          <p className="mt-1 text-sm text-slate-500">New categories are enabled for resident complaint submissions.</p>
        </section>

        {error && <p role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}

        <form onSubmit={submit} className="mt-6 space-y-5">
          <label className="block text-sm font-semibold text-slate-700">
            Category name
            <input required maxLength={255} value={name} onChange={(event) => setName(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#2455D6]" />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Description
            <textarea maxLength={1000} rows={4} value={description} onChange={(event) => setDescription(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 bg-white p-3 text-sm outline-none focus:border-[#2455D6]" />
          </label>
          <div className="flex justify-end border-t border-slate-200 pt-5">
            <button type="submit" disabled={saving} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#2455D6] px-4 text-sm font-bold text-white hover:bg-[#1948B8] disabled:opacity-50">
              <CirclePlus size={16} />
              {saving ? "Adding..." : "Add category"}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}

function authHeaders(token) {
  return { Accept: "application/json", Authorization: `Bearer ${token}` };
}

function firstValidationError(payload) {
  return payload.errors ? Object.values(payload.errors).flat()[0] : null;
}

export default AddComplaintCategory;