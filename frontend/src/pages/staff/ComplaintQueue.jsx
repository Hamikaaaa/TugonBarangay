import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Clock3, FileText, Search, ShieldAlert, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const API_URL = "http://127.0.0.1:8000/api";
const STATUS_LABELS = {
  pending: "Pending",
  in_progress: "In progress",
  resolved: "Resolved",
  rejected: "Rejected",
  closed: "Closed",
};
const TRANSITIONS = {
  pending: ["in_progress", "resolved", "rejected"],
  in_progress: ["resolved", "rejected"],
  resolved: ["closed"],
  rejected: [],
  closed: [],
};

function ComplaintQueue({ isAdmin = false }) {
  const { token } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [counts, setCounts] = useState({});
  const [selected, setSelected] = useState(null);
  const [staffRemarks, setStaffRemarks] = useState("");
  const [resolutionDetails, setResolutionDetails] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const endpoint = isAdmin ? "/admin/complaints" : "/staff/complaints";
  const loadComplaints = useCallback(async () => {
    if (!token) return;
    try {
      const query = new URLSearchParams({ page: String(page), per_page: "25" });
      if (search.trim()) query.set("search", search.trim());
      if (statusFilter !== "all") query.set("status", statusFilter);
      const response = await fetch(`${API_URL}${endpoint}?${query}`, { headers: authHeaders(token) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Unable to load complaints.");
      setError("");
      setComplaints(payload.data || []);
      setCounts(payload.counts || {});
      setPagination({
        current_page: payload.current_page || 1,
        last_page: payload.last_page || 1,
        total: payload.total || 0,
      });
      setSelected((current) => {
        if (!current) return null;
        const refreshed = (payload.data || []).find((complaint) => complaint.id === current.id);
        return refreshed || null;
      });
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [endpoint, page, search, statusFilter, token]);

  useEffect(() => {
    // Load the selected server page and update the queue when its filters change.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadComplaints();
  }, [loadComplaints]);

  const selectComplaint = (complaint) => {
    setSelected(complaint);
    setStaffRemarks(complaint.staff_remarks || "");
    setResolutionDetails(complaint.resolution_details || "");
  };

  const updateComplaint = async (status) => {
    if (!selected || !token || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}${endpoint}/${selected.id}/status`, {
        method: "PATCH",
        headers: { ...authHeaders(token), "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          staff_remarks: staffRemarks,
          resolution_details: resolutionDetails,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Unable to update complaint.");
      setSelected(payload.data);
      setNotice(payload.message || "Complaint updated.");
      await loadComplaints();
    } catch (updateError) {
      setError(updateError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const totalComplaints = Object.values(counts).reduce((sum, count) => sum + Number(count), 0);
  const openComplaints = Object.entries(counts)
    .filter(([status]) => !["resolved", "rejected", "closed"].includes(status))
    .reduce((sum, [, count]) => sum + Number(count), 0);
  const visibleStatus = useMemo(() => {
    const stats = [
      { label: "All complaints", value: totalComplaints, icon: FileText, color: "blue" },
      { label: "Needs review", value: counts.pending || 0, icon: Clock3, color: "amber" },
      { label: "In progress", value: counts.in_progress || 0, icon: ShieldAlert, color: "blue" },
      { label: "Open cases", value: openComplaints, icon: AlertCircle, color: "red" },
      { label: "Resolved", value: counts.resolved || 0, icon: CheckCircle2, color: "green" },
    ];
    return stats;
  }, [counts, openComplaints, totalComplaints]);

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-7 lg:px-9 lg:py-8">
      <section className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#2455D6]">
            <AlertCircle size={15} /> Complaint oversight
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-[#132A4A] sm:text-3xl">Complaint queue</h2>
          <p className="mt-2 text-sm text-slate-500">Review resident complaints, document actions, and track resolutions.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-bold text-slate-800">{isAdmin ? "Administrator oversight" : "Assigned workspace"}</p>
          <p className="mt-1 text-[11px] text-emerald-600">Complaint management</p>
        </div>
      </section>

      <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Complaint summary">
        {visibleStatus.map(({ label, value, icon: Icon, color }) => (
          <article key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{label}</p>
                <p className="mt-2 text-2xl font-bold text-[#132A4A]">{value}</p>
              </div>
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${colorClasses[color]}`}><Icon size={17} /></span>
            </div>
          </article>
        ))}
      </section>

      {notice && (
        <div className="mb-5 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice("")} aria-label="Dismiss notification"><X size={15} /></button>
        </div>
      )}
      {error && (
        <div role="alert" className="mb-5 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          <span>{error}</span>
          <button type="button" onClick={() => setError("")} aria-label="Dismiss error"><X size={15} /></button>
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-base font-bold text-[#132A4A]">Resident complaints</h3>
            <p className="mt-1 text-xs text-slate-500">Search, filter, review evidence, and update case status.</p>
          </div>
          <span className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">{pagination.total} complaints</span>
        </div>
        <div className="grid gap-3 border-b border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-[1fr_auto]">
          <label className="relative block">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(event) => { setLoading(true); setSearch(event.target.value); setPage(1); }} placeholder="Search case, resident, or category..." className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs font-medium text-slate-700 outline-none focus:border-[#2455D6] focus:ring-2 focus:ring-blue-100" />
          </label>
          <select value={statusFilter} onChange={(event) => { setLoading(true); setStatusFilter(event.target.value); setPage(1); }} aria-label="Filter by complaint status" className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 outline-none focus:border-[#2455D6]">
            <option value="all">All statuses</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <p className="p-12 text-center text-sm text-slate-500">Loading complaints...</p>
          ) : complaints.length === 0 ? (
            <div className="p-14 text-center">
              <FileText className="mx-auto text-slate-400" size={24} />
              <p className="mt-4 text-sm font-bold text-slate-700">No complaints found</p>
              <p className="mt-1 text-xs text-slate-500">Try changing your search or status filter.</p>
            </div>
          ) : (
            <table className="w-full min-w-[820px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                  <th className="px-5 py-3.5">Case</th><th className="px-5 py-3.5">Resident</th><th className="px-5 py-3.5">Category</th><th className="px-5 py-3.5">Priority</th><th className="px-5 py-3.5">Status</th><th className="px-5 py-3.5 text-right">Review</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {complaints.map((complaint) => (
                  <tr key={complaint.id} className={`transition hover:bg-blue-50/30 ${selected?.id === complaint.id ? "bg-blue-50/40" : ""}`}>
                    <td className="px-5 py-4">
                      <p className="text-xs font-bold text-[#2455D6]">CMP-{String(complaint.id).padStart(5, "0")}</p>
                      <p className="mt-1 max-w-56 truncate text-xs font-semibold text-slate-700">{complaint.subject}</p>
                    </td>
                    <td className="px-5 py-4 text-xs font-semibold text-slate-700">{complaint.user?.name || "Unknown resident"}</td>
                    <td className="px-5 py-4 text-xs text-slate-600">{complaint.category}</td>
                    <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${complaint.priority === "urgent" ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-600"}`}>{complaint.priority === "urgent" ? "Urgent" : "Normal"}</span></td>
                    <td className="px-5 py-4"><StatusBadge status={complaint.status} /></td>
                    <td className="px-5 py-4 text-right"><button type="button" onClick={() => selectComplaint(complaint)} className="rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-bold text-slate-600 hover:border-[#2455D6] hover:text-[#2455D6]">Review</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-500 sm:px-6">
          <span>Page {pagination.current_page} of {pagination.last_page}</span>
          <div className="flex gap-2">
            <button type="button" onClick={() => { setLoading(true); setPage((current) => Math.max(1, current - 1)); }} disabled={page <= 1 || loading} aria-label="Previous page" className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 disabled:opacity-40"><ChevronLeft size={16} /></button>
            <button type="button" onClick={() => { setLoading(true); setPage((current) => Math.min(pagination.last_page, current + 1)); }} disabled={page >= pagination.last_page || loading} aria-label="Next page" className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 disabled:opacity-40"><ChevronRight size={16} /></button>
          </div>
        </div>
      </section>

      {selected && (
        <section className="mt-5 grid gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-[1fr_360px]">
          <div>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#2455D6]">CMP-{String(selected.id).padStart(5, "0")}</p>
                <h3 className="mt-1 text-lg font-bold text-[#132A4A]">{selected.subject}</h3>
                <p className="mt-1 text-xs text-slate-500">{selected.user?.name || "Unknown resident"} · {formatDate(selected.created_at)}</p>
              </div>
              <StatusBadge status={selected.status} />
            </div>
            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              <Detail label="Category" value={selected.category} />
              <Detail label="Priority" value={selected.priority === "urgent" ? "Urgent review" : "Normal"} />
              <Detail label="Incident date" value={formatDate(selected.incident_date)} />
              <Detail label="Location" value={selected.location} />
              <Detail label="Description" value={selected.description} wide />
              <Detail label="Additional information" value={selected.relevant_information} wide />
              {selected.evidence_path && <EvidenceDownload complaint={selected} token={token} isAdmin={isAdmin} />}
            </dl>
          </div>
          <div className="border-t border-slate-100 pt-5 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
            <h4 className="text-sm font-bold text-[#132A4A]">Case update</h4>
            <label className="mt-4 block text-xs font-semibold text-slate-600">
              Internal staff remarks
              <textarea value={staffRemarks} onChange={(event) => setStaffRemarks(event.target.value)} maxLength={2000} rows={3} className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-xs outline-none focus:border-[#2455D6] focus:ring-2 focus:ring-blue-100" placeholder="Add internal notes for the case..." />
            </label>
            <label className="mt-3 block text-xs font-semibold text-slate-600">
              Resolution / outcome details
              <textarea value={resolutionDetails} onChange={(event) => setResolutionDetails(event.target.value)} maxLength={5000} rows={3} className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-xs outline-none focus:border-[#2455D6] focus:ring-2 focus:ring-blue-100" placeholder="Required when resolving or rejecting..." />
            </label>
            <div className="mt-4 flex flex-wrap gap-2">
              {(TRANSITIONS[selected.status] || []).map((status) => (
                <button key={status} type="button" disabled={submitting || (["resolved", "rejected"].includes(status) && !resolutionDetails.trim())} onClick={() => updateComplaint(status)} className={`rounded-xl px-3 py-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${status === "rejected" ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100" : "bg-[#2455D6] text-white hover:bg-[#1948B8]"}`}>
                  {submitting ? "Saving..." : STATUS_LABELS[status]}
                </button>
              ))}
            </div>
            {selected.staff_remarks && <p className="mt-4 border-t border-slate-100 pt-3 text-xs leading-5 text-slate-500"><strong className="text-slate-700">Previous remarks:</strong> {selected.staff_remarks}</p>}
            {selected.resolution_details && <p className="mt-2 text-xs leading-5 text-slate-500"><strong className="text-slate-700">Recorded outcome:</strong> {selected.resolution_details}</p>}
          </div>
        </section>
      )}
    </div>
  );
}

function EvidenceDownload({ complaint, token, isAdmin }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const download = async () => {
    setBusy(true);
    setError("");
    try {
      const prefix = isAdmin ? "/admin" : "/staff";
      const response = await fetch(`${API_URL}${prefix}/complaints/${complaint.id}/evidence`, { headers: authHeaders(token) });
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.message || "Unable to download complaint evidence.");
      }
      const objectUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `CMP-${String(complaint.id).padStart(5, "0")}-evidence`;
      link.click();
      URL.revokeObjectURL(objectUrl);
    } catch (downloadError) {
      setError(downloadError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sm:col-span-2">
      <button type="button" onClick={download} disabled={busy} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-[#2455D6] hover:border-[#2455D6] disabled:opacity-50">
        <FileText size={14} /> {busy ? "Downloading..." : "Download evidence"}
      </button>
      {error && <p role="alert" className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function Detail({ label, value, wide = false }) {
  return <div className={wide ? "sm:col-span-2" : ""}><dt className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">{label}</dt><dd className="mt-1.5 whitespace-pre-wrap break-words text-xs leading-5 text-slate-700">{value || "—"}</dd></div>;
}

function StatusBadge({ status }) {
  const color = status === "resolved" || status === "closed"
    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
    : status === "rejected"
      ? "bg-red-50 text-red-700 ring-red-200"
      : status === "in_progress"
        ? "bg-blue-50 text-blue-700 ring-blue-200"
        : "bg-amber-50 text-amber-700 ring-amber-200";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ring-inset ${color}`}>{STATUS_LABELS[status] || (status || "Pending").replaceAll("_", " ")}</span>;
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function authHeaders(token) {
  return { Accept: "application/json", Authorization: `Bearer ${token}` };
}

const colorClasses = {
  amber: "bg-amber-50 text-amber-600",
  blue: "bg-blue-50 text-blue-600",
  green: "bg-emerald-50 text-emerald-600",
  red: "bg-red-50 text-red-600",
};

export default ComplaintQueue;
