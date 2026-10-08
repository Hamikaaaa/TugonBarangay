import {
  Check,
  LockKeyhole,
  Mail,
  Plus,
  ShieldCheck,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import AdminPageHeader from "../../components/admin/AdminPageHeader";
import { useAuth } from "../../context/AuthContext";
import { primaryButtonClass } from "../../utils/buttonStyles";

const API_URL = "http://127.0.0.1:8000/api";
const DESIGNATIONS = [
  "Document Request Officer",
  "Complaint Management Officer",
];

const blankStaff = () => ({
  name: "",
  email: "",
  designation: DESIGNATIONS[0],
  password: "",
  password_confirmation: "",
});

function StaffAccounts() {
  const { token } = useAuth();
  const [staff, setStaff] = useState([]);
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadStaff = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/admin/staff-accounts`, {
        headers: authHeaders(token),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || "Unable to load staff accounts.");
      }
      setStaff(payload);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    // Load the staff directory when the admin account becomes available.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadStaff();
  }, [loadStaff]);

  const createStaff = async (event) => {
    event.preventDefault();
    if (!draft || saving) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`${API_URL}/admin/staff-accounts`, {
        method: "POST",
        headers: {
          ...authHeaders(token),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(draft),
      });
      const payload = await response.json();
      if (!response.ok) {
        const validationError = payload.errors
          ? Object.values(payload.errors).flat()[0]
          : null;
        throw new Error(
          validationError || payload.message || "Unable to create staff account.",
        );
      }
      setNotice(payload.message);
      setDraft(null);
      await loadStaff();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleStaff = async (account) => {
    if (updatingId) return;
    setUpdatingId(account.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(
        `${API_URL}/admin/staff-accounts/${account.id}/status`,
        {
          method: "PATCH",
          headers: {
            ...authHeaders(token),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ is_active: !account.is_active }),
        },
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || "Unable to update staff account.");
      }
      setStaff((current) =>
        current.map((item) =>
          item.id === account.id ? { ...item, ...payload.staff } : item,
        ),
      );
      setNotice(payload.message);
    } catch (updateError) {
      setError(updateError.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const activeCount = staff.filter((account) => account.is_active).length;
  const documentOfficerCount = staff.filter(
    (account) =>
      account.designation === "Document Request Officer" && account.is_active,
  ).length;
  const complaintOfficerCount = staff.filter(
    (account) =>
      account.designation === "Complaint Management Officer" && account.is_active,
  ).length;

  return (
    <AdminLayout title="Staff Accounts">
      <div className="space-y-6 pt-6">
        <AdminPageHeader
          eyebrow="Staff administration · Access management"
          title="Staff accounts"
          description="Create and manage Document Request Officers and Complaint Management Officers. Disabled accounts cannot sign in or continue using active sessions."
        >
          <button
            type="button"
            onClick={() => {
              setError("");
              setNotice("");
              setDraft(blankStaff());
            }}
            className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-[#2455D6] shadow-lg transition hover:-translate-y-0.5 hover:bg-[#EEF4FF] hover:shadow-xl active:translate-y-0"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add staff account
          </button>
        </AdminPageHeader>

        <section
          aria-label="Staff account summary"
          className="grid gap-4 sm:grid-cols-3"
        >
          <SummaryCard label="Total accounts" value={staff.length} icon={Users} />
          <SummaryCard
            label="Enabled accounts"
            value={activeCount}
            icon={ShieldCheck}
            tone="green"
          />
          <SummaryCard
            label="Disabled accounts"
            value={staff.length - activeCount}
            icon={LockKeyhole}
            tone="amber"
          />
        </section>

        <nav
          aria-label="Staff account roles"
          className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm"
        >
          <span className="inline-flex min-h-11 items-center rounded-xl border border-[#D9E6FF] bg-[#EEF4FF] px-4 py-2.5 text-sm font-bold text-[#2455D6]">
            <UserRound className="mr-2 h-4 w-4" aria-hidden="true" />
            Document Request Officers · {documentOfficerCount} active
          </span>
          <span className="inline-flex min-h-11 items-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600">
            <ShieldCheck className="mr-2 h-4 w-4" aria-hidden="true" />
            Complaint Management Officers · {complaintOfficerCount} active
          </span>
        </nav>

        {error && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={loadStaff}
              className="font-bold underline"
            >
              Try again
            </button>
          </div>
        )}
        {notice && (
          <p
            role="status"
            className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"
          >
            {notice}
          </p>
        )}

        {draft && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-[#071B3D]/50 p-4 backdrop-blur-sm"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !saving) {
                setDraft(null);
              }
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="staff-editor-title"
              className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6"
            >
              <form onSubmit={createStaff} className="space-y-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2
                      id="staff-editor-title"
                      className="text-lg font-bold text-[#172B4D]"
                    >
                      Create staff account
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      The account will be enabled immediately.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDraft(null)}
                    disabled={saving}
                    aria-label="Close create staff form"
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
              <label className="text-xs font-bold text-slate-600">
                Staff name
                <input
                  required
                  maxLength={255}
                  autoComplete="name"
                  value={draft.name}
                  onChange={(event) =>
                    setDraft({ ...draft, name: event.target.value })
                  }
                  className={fieldClass}
                />
              </label>
              <label className="text-xs font-bold text-slate-600">
                Email address
                <input
                  required
                  type="email"
                  maxLength={255}
                  autoComplete="email"
                  value={draft.email}
                  onChange={(event) =>
                    setDraft({ ...draft, email: event.target.value })
                  }
                  className={fieldClass}
                />
              </label>
              <label className="text-xs font-bold text-slate-600 md:col-span-2">
                Staff role
                <select
                  value={draft.designation}
                  onChange={(event) =>
                    setDraft({ ...draft, designation: event.target.value })
                  }
                  className={fieldClass}
                >
                  {DESIGNATIONS.map((designation) => (
                    <option key={designation} value={designation}>
                      {designation}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-bold text-slate-600">
                Temporary password
                <input
                  required
                  type="password"
                  minLength={8}
                  autoComplete="new-password"
                  value={draft.password}
                  onChange={(event) =>
                    setDraft({ ...draft, password: event.target.value })
                  }
                  className={fieldClass}
                />
                <span className="mt-1 block font-normal text-slate-400">
                  Use at least 8 characters with upper- and lowercase letters,
                  a number, and a symbol.
                </span>
              </label>
              <label className="text-xs font-bold text-slate-600">
                Confirm password
                <input
                  required
                  type="password"
                  minLength={8}
                  autoComplete="new-password"
                  value={draft.password_confirmation}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      password_confirmation: event.target.value,
                    })
                  }
                  className={fieldClass}
                />
              </label>
                </div>
                <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => setDraft(null)}
                    disabled={saving}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className={`${primaryButtonClass} min-h-11 px-4 py-2.5`}
                  >
                    <Check className="h-4 w-4" aria-hidden="true" />
                    {saving ? "Creating..." : "Create account"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-lg font-bold text-[#172B4D]">All staff accounts</h2>
            <p className="mt-1 text-sm text-slate-500">
              Manage login access for both staff designations.
            </p>
          </div>
          {loading ? (
            <div className="space-y-3 p-5" role="status" aria-label="Loading staff accounts">
              {[1, 2, 3].map((item) => (
                <div key={item} className="h-16 animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
          ) : staff.length ? (
            <div className="divide-y divide-slate-100">
              {staff.map((account) => (
                <article
                  key={account.id}
                  className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#2455D6]">
                      <UserRound className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-bold text-[#172B4D]">
                        {account.name}
                      </h3>
                      <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-slate-500">
                        <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        {account.email}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-slate-600">
                        {account.designation}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <span
                      className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                        account.is_active
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {account.is_active ? "Enabled" : "Disabled"}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleStaff(account)}
                      disabled={updatingId === account.id}
                      className={`min-w-24 rounded-xl border px-3 py-2 text-xs font-bold transition disabled:cursor-wait disabled:opacity-50 ${
                        account.is_active
                          ? "border-red-100 text-red-700 hover:bg-red-50"
                          : "border-emerald-100 text-emerald-700 hover:bg-emerald-50"
                      }`}
                    >
                      {updatingId === account.id
                        ? "Saving..."
                        : account.is_active
                          ? "Disable"
                          : "Enable"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="px-5 py-12 text-center">
              <Users className="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" />
              <p className="mt-3 text-sm font-semibold text-[#172B4D]">
                No staff accounts yet
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Add an account for a document request or complaint management officer.
              </p>
            </div>
          )}
        </section>
      </div>
    </AdminLayout>
  );
}

function SummaryCard({ label, value, icon: Icon, tone = "blue" }) {
  const colors =
    tone === "green"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "amber"
        ? "bg-amber-50 text-amber-700"
        : "bg-[#EEF4FF] text-[#2455D6]";
  return (
    <article className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <p className="text-sm font-semibold text-slate-500">{label}</p>
        <p className="mt-2 text-3xl font-bold tracking-tight text-[#172B4D]">
          {value}
        </p>
      </div>
      <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${colors}`}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
    </article>
  );
}

const fieldClass =
  "mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#2455D6] focus:bg-white focus:ring-4 focus:ring-[#2455D6]/10";

function authHeaders(token) {
  return {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export default StaffAccounts;
