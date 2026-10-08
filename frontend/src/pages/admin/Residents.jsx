import {
  ArrowRight,
  BadgeCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Search,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import AdminPageHeader from "../../components/admin/AdminPageHeader";
import { useAuth } from "../../context/AuthContext";
import { primaryButtonClass } from "../../utils/buttonStyles";

const API_URL = "http://127.0.0.1:8000/api";

function Residents() {
  const { token } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isDashboard = location.pathname.endsWith("/dashboard");
  const isVerification = location.pathname.endsWith("/verification");
  const [registry, setRegistry] = useState([]);
  const [pendingResidents, setPendingResidents] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [rejectingResident, setRejectingResident] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadDashboardStats = useCallback(async () => {
    if (!token || !isDashboard) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/admin/residents/registry-stats`, {
        headers: authHeaders(token),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || "Unable to load residents and registry statistics.");
      }
      setDashboardStats(payload);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [isDashboard, token]);

  const loadRegistry = useCallback(async () => {
    if (!token || isVerification || isDashboard) return;
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({
        page: String(page),
        per_page: "25",
      });
      if (search) query.set("search", search);
      const response = await fetch(
        `${API_URL}/admin/barangay-registry?${query}`,
        { headers: authHeaders(token) },
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || "Unable to load the barangay masterlist.");
      }
      setRegistry(payload.data || []);
      setLastPage(payload.last_page || 1);
      setTotal(payload.total || 0);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [isDashboard, isVerification, page, search, token]);

  const loadPendingResidents = useCallback(async () => {
    if (!token || isDashboard || !isVerification) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/admin/pending-residents`, {
        headers: authHeaders(token),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || "Unable to load account verifications.");
      }
      setPendingResidents(payload);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [isDashboard, isVerification, token]);

  useEffect(() => {
    // Keep each resident workspace view synchronized with its source records.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isDashboard) loadDashboardStats();
    else if (isVerification) loadPendingResidents();
    else loadRegistry();
  }, [isDashboard, isVerification, loadDashboardStats, loadPendingResidents, loadRegistry]);

  const applySearch = (event) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const updateVerification = async (resident, action, reason = "") => {
    if (savingId) return;
    setSavingId(resident.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(
        `${API_URL}/admin/residents/${resident.id}/${action}`,
        {
          method: "PATCH",
          headers: {
            ...authHeaders(token),
            "Content-Type": "application/json",
          },
          body: action === "reject" ? JSON.stringify({ reason }) : undefined,
        },
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || "Unable to update account verification.");
      }
      setNotice(
        action === "verify"
          ? `${resident.name} has been approved.`
          : `${resident.name}'s registration was rejected.`,
      );
      setRejectingResident(null);
      setRejectionReason("");
      await loadPendingResidents();
    } catch (updateError) {
      setError(updateError.message);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <AdminLayout
      title={
        isDashboard
          ? "Residents & Registry Dashboard"
          : isVerification
            ? "Account Verification"
            : "Barangay Masterlist"
      }
    >
      <div className="space-y-6 pt-6">
        <AdminPageHeader
          eyebrow={`Residents & Registry · ${isDashboard ? "Overview" : isVerification ? "Account review" : "Official records"}`}
          title={
            isDashboard
              ? "Residents & Registry dashboard"
              : isVerification
                ? "Account verification"
                : "Barangay masterlist"
          }
          description={
            isDashboard
              ? "View the official registry and resident account verification workload at a glance."
              : isVerification
                ? "Review resident registrations against barangay registry records and approve eligible accounts."
                : "Browse the official resident records used to validate resident account registrations."
          }
        >
          <div className="flex min-h-12 items-center gap-3 rounded-xl border border-white/20 bg-white/10 px-4 py-2">
            <span className="text-2xl font-bold leading-none text-white">
              {loading
                ? "…"
                : isDashboard
                  ? (dashboardStats?.pending_total ?? 0)
                  : isVerification
                    ? pendingResidents.length
                    : total.toLocaleString()}
            </span>
            <span className="text-xs font-semibold leading-4 text-white/75">
              {isDashboard || isVerification ? "awaiting review" : "registry records"}
            </span>
          </div>
        </AdminPageHeader>

        <nav
          aria-label="Residents and registry sections"
          className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm"
        >
          <button
            type="button"
            onClick={() => navigate("/admin/residents/dashboard")}
            aria-current={isDashboard ? "page" : undefined}
            className={tabClass(isDashboard)}
          >
            <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
            Dashboard
          </button>
          <button
            type="button"
            onClick={() => {
              setPage(1);
              navigate("/admin/residents");
            }}
            aria-current={!isDashboard && !isVerification ? "page" : undefined}
            className={tabClass(!isDashboard && !isVerification)}
          >
            <Users className="h-4 w-4" aria-hidden="true" />
            Barangay Masterlist
          </button>
          <button
            type="button"
            onClick={() => navigate("/admin/residents/verification")}
            aria-current={isVerification ? "page" : undefined}
            className={tabClass(isVerification)}
          >
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Account Verification
            {isVerification && pendingResidents.length > 0 && (
              <span className="rounded-full bg-[#FFF0F0] px-2 py-0.5 text-[10px] font-bold text-[#E45757]">
                {pendingResidents.length}
              </span>
            )}
          </button>
        </nav>

        {error && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={
                isDashboard
                  ? loadDashboardStats
                  : isVerification
                    ? loadPendingResidents
                    : loadRegistry
              }
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

        {isDashboard ? (
          <ResidentsRegistryDashboard
            stats={dashboardStats}
            loading={loading}
            onOpenMasterlist={() => navigate("/admin/residents")}
            onOpenVerification={() => navigate("/admin/residents/verification")}
          />
        ) : isVerification ? (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 sm:p-5">
              <div>
                <h3 className="font-bold text-[#172B4D]">Pending registrations</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Compare the registry check and supporting details before deciding.
                </p>
              </div>
              <span className="rounded-full bg-[#FFF0F0] px-3 py-1.5 text-xs font-bold text-[#E45757]">
                {pendingResidents.length} awaiting review
              </span>
            </div>
            {loading ? (
              <LoadingRows />
            ) : pendingResidents.length ? (
              <div className="divide-y divide-slate-100">
                {pendingResidents.map((resident) => (
                  <VerificationCard
                    key={resident.id}
                    resident={resident}
                    saving={savingId === resident.id}
                    onApprove={() => updateVerification(resident, "verify")}
                    onReject={() => {
                      setRejectingResident(resident);
                      setRejectionReason("");
                    }}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No accounts awaiting verification"
                detail="New resident registrations will appear here for review."
              />
            )}
          </section>
        ) : (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div>
                <h3 className="font-bold text-[#172B4D]">Official resident records</h3>
                <p className="mt-1 text-xs text-slate-500">
                  {total.toLocaleString()} {total === 1 ? "record" : "records"} in barangay_registry
                </p>
              </div>
              <form onSubmit={applySearch} className="flex gap-2">
                <label className="relative min-w-0 flex-1 sm:w-80">
                  <span className="sr-only">
                    Search masterlist by name, address, purok, or mobile
                  </span>
                  <Search
                    className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                  <input
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Search resident records"
                    className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-[#2455D6] focus:ring-2 focus:ring-[#2455D6]/10"
                  />
                </label>
                <button type="submit" className={`${primaryButtonClass} px-4`}>
                  Search
                </button>
              </form>
            </div>
            {loading ? (
              <LoadingRows />
            ) : registry.length ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[850px] text-left">
                    <thead className="bg-[#F7F9FC] text-[10px] uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-5 py-3 font-bold">Resident name</th>
                        <th className="px-5 py-3 font-bold">Birth date / sex</th>
                        <th className="px-5 py-3 font-bold">Purok</th>
                        <th className="px-5 py-3 font-bold">Address</th>
                        <th className="px-5 py-3 font-bold">Mobile</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {registry.map((record) => (
                        <tr key={record.id} className="transition hover:bg-[#F8FAFF]">
                          <td className="px-5 py-4 text-sm font-semibold text-[#172B4D]">
                            {fullName(record)}
                          </td>
                          <td className="px-5 py-4 text-xs text-slate-600">
                            <span className="block">{formatDate(record.date_of_birth)}</span>
                            <span className="mt-1 block text-slate-400">{record.sex || "Not provided"}</span>
                          </td>
                          <td className="px-5 py-4 text-sm text-slate-600">
                            {record.purok || "—"}
                          </td>
                          <td className="max-w-xs px-5 py-4 text-sm text-slate-600">
                            <span className="line-clamp-2">{record.address || "—"}</span>
                          </td>
                          <td className="px-5 py-4 text-sm text-slate-600">
                            {record.mobile_number || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  page={page}
                  lastPage={lastPage}
                  onChange={setPage}
                />
              </>
            ) : (
              <EmptyState
                title={search ? "No matching registry records" : "Masterlist is empty"}
                detail={
                  search
                    ? "Try another name, purok, address, or mobile number."
                    : "No records were found in the barangay registry."
                }
              />
            )}
          </section>
        )}
      </div>

      {rejectingResident && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-[#071B3D]/50 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !savingId) {
              setRejectingResident(null);
            }
          }}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="resident-reject-title"
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 id="resident-reject-title" className="text-lg font-bold text-[#172B4D]">
                  Reject resident registration?
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Provide a reason for {rejectingResident.name}. The resident will be notified.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRejectingResident(null)}
                disabled={Boolean(savingId)}
                aria-label="Close rejection dialog"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <label className="mt-5 block text-sm font-semibold text-slate-700">
              Rejection reason
              <textarea
                value={rejectionReason}
                onChange={(event) => setRejectionReason(event.target.value)}
                maxLength={1000}
                rows={4}
                className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-[#2455D6] focus:ring-2 focus:ring-[#2455D6]/10"
                placeholder="Explain what information needs correction..."
              />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectingResident(null)}
                disabled={Boolean(savingId)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  updateVerification(
                    rejectingResident,
                    "reject",
                    rejectionReason.trim(),
                  )
                }
                disabled={!rejectionReason.trim() || Boolean(savingId)}
                className="rounded-xl bg-[#E52B32] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#C9232A] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingId ? "Rejecting..." : "Reject registration"}
              </button>
            </div>
          </section>
        </div>
      )}
    </AdminLayout>
  );
}

function VerificationCard({ resident, saving, onApprove, onReject }) {
  const matched = resident.registry_match;
  const matchFields = ["First name", "Last name", "Date of birth", "Sex", "Purok"];

  return (
    <article className="p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="font-bold text-[#172B4D]">{resident.name}</h4>
          <p className="mt-1 text-xs text-slate-500">
            Registered {formatDate(resident.created_at)}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-[11px] font-bold ${
            matched
              ? "bg-emerald-50 text-emerald-700"
              : "bg-[#FFF0F0] text-[#E45757]"
          }`}
        >
          {matched ? "Registry match found" : "No exact registry match"}
        </span>
      </div>

      <section
        aria-label="Registry matching check"
        className={`mt-4 rounded-xl border p-4 ${
          matched
            ? "border-emerald-100 bg-emerald-50/60"
            : "border-amber-200 bg-amber-50"
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h5 className="text-sm font-bold text-[#172B4D]">
              {matched ? "Registry check passed" : "Manual review required"}
            </h5>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-600">
              {matched
                ? "The system found an exact match on the fields below. Review the other details and make the final approval decision."
                : "No exact registry match was found. This does not automatically reject the registration; review the submitted details and follow the barangay verification procedure before deciding."}
            </p>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
              matched
                ? "bg-emerald-100 text-emerald-800"
                : "bg-amber-100 text-amber-800"
            }`}
          >
            {matched ? "5 fields matched" : "No exact match"}
          </span>
        </div>
        {matched && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {matchFields.map((label) => (
              <li
                key={label}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-100 bg-white px-2.5 py-1.5 text-xs font-semibold text-emerald-800"
              >
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                {label}
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <DetailsCard title="Submitted account details" resident={resident} />
        <DetailsCard
          title="Barangay registry record"
          resident={matched}
          missing={!matched}
        />
      </div>
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={onReject}
          disabled={saving}
          className="rounded-xl border border-[#E45757]/30 bg-white px-4 py-2.5 text-sm font-bold text-[#E45757] transition hover:bg-[#FFF0F0] disabled:opacity-50"
        >
          Reject
        </button>
        <button
          type="button"
          onClick={onApprove}
          disabled={saving}
          className={primaryButtonClass}
        >
          <Check className="h-4 w-4" aria-hidden="true" />
          {saving ? "Approving..." : "Approve account"}
        </button>
      </div>
    </article>
  );
}

function ResidentsRegistryDashboard({
  stats,
  loading,
  onOpenMasterlist,
  onOpenVerification,
}) {
  const cards = [
    {
      label: "Official registry records",
      value: stats?.registry_total,
      detail: "Records available in the barangay masterlist",
      icon: Users,
      accent: "blue",
    },
    {
      label: "Pending verification",
      value: stats?.pending_total,
      detail: "Resident accounts awaiting an admin decision",
      icon: ShieldCheck,
      accent: "amber",
      action: onOpenVerification,
    },
    {
      label: "Verified accounts",
      value: stats?.verified_total,
      detail: "Resident accounts approved",
      icon: BadgeCheck,
      accent: "green",
    },
    {
      label: "Rejected registrations",
      value: stats?.rejected_total,
      detail: "Registrations declined with a recorded reason",
      icon: X,
      accent: "red",
    },
  ];
  const pendingTotal = stats?.pending_total ?? 0;
  const matchedTotal = stats?.pending_matched ?? 0;
  const matchedPercent = pendingTotal
    ? Math.round((matchedTotal / pendingTotal) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <section
        aria-label="Residents and registry statistics"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {cards.map((card) => (
          <RegistryStatCard
            key={card.label}
            {...card}
            value={loading ? "…" : (card.value ?? 0).toLocaleString()}
          />
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-[#172B4D]">
                Verification match overview
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Exact registry comparison for accounts awaiting review
              </p>
            </div>
            <span className="rounded-full bg-[#EEF4FF] px-3 py-1.5 text-xs font-bold text-[#2455D6]">
              {loading ? "…" : `${matchedPercent}% matched`}
            </span>
          </div>

          <div className="mt-6">
            <div
              className="h-3 overflow-hidden rounded-full bg-amber-100"
              role="img"
              aria-label={`${matchedTotal} of ${pendingTotal} pending registrations have an exact registry match`}
            >
              <div
                className="h-full rounded-full bg-emerald-500 transition-[width]"
                style={{ width: `${matchedPercent}%` }}
              />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
                <p className="text-xs font-semibold text-emerald-800">
                  Exact registry match
                </p>
                <p className="mt-1 text-2xl font-bold text-emerald-900">
                  {loading ? "…" : matchedTotal.toLocaleString()}
                </p>
                <p className="mt-1 text-xs leading-5 text-emerald-800/80">
                  Matches first name, last name, birth date, sex, and purok.
                </p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-xs font-semibold text-amber-800">
                  Manual review required
                </p>
                <p className="mt-1 text-2xl font-bold text-amber-900">
                  {loading
                    ? "…"
                    : (stats?.pending_unmatched ?? 0).toLocaleString()}
                </p>
                <p className="mt-1 text-xs leading-5 text-amber-800/80">
                  No exact match does not automatically reject an application.
                </p>
              </div>
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#2455D6]">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </div>
          <h3 className="mt-4 text-lg font-bold text-[#172B4D]">
            Resident review workflow
          </h3>
          <ol className="mt-3 space-y-3 text-sm leading-5 text-slate-600">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#EEF4FF] text-xs font-bold text-[#2455D6]">
                1
              </span>
              Review submitted resident details beside any matching registry record.
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#EEF4FF] text-xs font-bold text-[#2455D6]">
                2
              </span>
              Confirm the information using the barangay’s verification procedure.
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#EEF4FF] text-xs font-bold text-[#2455D6]">
                3
              </span>
              Approve eligible accounts or reject with a reason for the resident.
            </li>
          </ol>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onOpenVerification}
              className={`${primaryButtonClass} min-h-11 px-4 py-2.5`}
            >
              Review accounts
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onOpenMasterlist}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-[#2455D6] transition hover:bg-[#EEF4FF]"
            >
              Open masterlist
            </button>
          </div>
        </article>
      </section>
    </div>
  );
}

function RegistryStatCard({ label, value, detail, icon: Icon, accent, action }) {
  const accentStyles = {
    amber: "bg-amber-50 text-amber-700",
    blue: "bg-[#EEF4FF] text-[#2455D6]",
    green: "bg-emerald-50 text-emerald-700",
    red: "bg-red-50 text-red-700",
  };
  const content = (
    <>
      <span className="flex items-start justify-between gap-3">
        <span>
          <span className="block text-sm font-semibold text-slate-500">
            {label}
          </span>
          <span className="mt-2 block text-3xl font-bold tracking-tight text-[#172B4D]">
            {value}
          </span>
        </span>
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${accentStyles[accent]}`}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </span>
      <span className="mt-3 flex items-center justify-between text-xs text-slate-400">
        {detail}
        {action && (
          <ArrowRight className="h-4 w-4 shrink-0 text-[#2455D6]" aria-hidden="true" />
        )}
      </span>
    </>
  );

  return action ? (
    <button
      type="button"
      onClick={action}
      className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      {content}
    </button>
  ) : (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      {content}
    </div>
  );
}

function DetailsCard({ title, resident, missing = false }) {
  const rows = [
    ["Name", resident ? fullName(resident) : null],
    ["Date of birth", resident ? formatDate(resident.date_of_birth) : null],
    ["Sex", resident?.sex],
    ["Purok", resident?.purok],
    ["Address", resident?.address],
    ["Mobile", resident?.mobile_number],
  ];
  return (
    <section className="rounded-xl border border-slate-100 bg-[#F7F9FC] p-4">
      <h5 className="text-xs font-bold uppercase tracking-wide text-[#55708F]">
        {title}
      </h5>
      {missing ? (
        <p className="mt-3 text-sm leading-5 text-[#E45757]">
          The submitted name, birth date, sex, and purok did not find an exact match.
        </p>
      ) : (
        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
          {rows.map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-[10px] font-semibold text-slate-400">{label}</dt>
              <dd className="mt-0.5 break-words text-xs font-medium text-slate-700">
                {value || "—"}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

function Pagination({ page, lastPage, onChange }) {
  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 sm:px-5">
      <p className="text-xs text-slate-500">
        Page {page} of {lastPage}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => onChange((current) => Math.max(1, current - 1))}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-[#2455D6] hover:bg-slate-50 disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="Next page"
          disabled={page >= lastPage}
          onClick={() => onChange((current) => Math.min(lastPage, current + 1))}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-[#2455D6] hover:bg-slate-50 disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="space-y-3 p-5" role="status" aria-label="Loading resident records">
      {[1, 2, 3].map((item) => (
        <div key={item} className="h-16 animate-pulse rounded-xl bg-slate-100" />
      ))}
    </div>
  );
}

function EmptyState({ title, detail }) {
  return (
    <div className="px-5 py-14 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF4FF] text-[#2455D6]">
        <Users className="h-5 w-5" aria-hidden="true" />
      </span>
      <h3 className="mt-4 text-sm font-bold text-[#172B4D]">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{detail}</p>
    </div>
  );
}

function authHeaders(token) {
  return { Accept: "application/json", Authorization: `Bearer ${token}` };
}

function tabClass(active) {
  return `inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition ${
    active
      ? "border-[#D9E6FF] bg-[#EEF4FF] text-[#2455D6]"
      : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800"
  }`;
}

function fullName(person) {
  return [
    person.first_name,
    person.middle_name,
    person.last_name,
    person.suffix,
  ]
    .filter(Boolean)
    .join(" ");
}

function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeZone: "Asia/Manila",
  }).format(new Date(`${value.slice(0, 10)}T00:00:00`));
}

export default Residents;
