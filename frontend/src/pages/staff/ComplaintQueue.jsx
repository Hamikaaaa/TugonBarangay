import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  Archive,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  Eye,
  FileText,
  ArrowLeft,
  LoaderCircle,
  Save,
  Search,
  ShieldAlert,
  X,
  XCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import AdminPageHeader from "../../components/admin/AdminPageHeader";
import { useAuth } from "../../context/AuthContext";
import { COMPLAINT_CATEGORIES } from "../../constants/complaintCategories";
import { primaryButtonClass } from "../../utils/buttonStyles";

const API_URL = "http://127.0.0.1:8000/api";
const STATUS_LABELS = {
  pending: "Pending",
  in_progress: "In progress",
  resolved: "Resolved",
  rejected: "Rejected",
  closed: "Closed",
};
const PROGRESS_STAGES = ["pending", "in_progress", "resolved", "closed"];
const STATUS_COLORS = {
  pending: "#D89A35",
  in_progress: "#3976C5",
  resolved: "#258A72",
  rejected: "#C44F5B",
  closed: "#7A8290",
};
const TRANSITIONS = {
  pending: ["in_progress", "resolved", "rejected"],
  in_progress: ["resolved", "rejected"],
  resolved: ["closed"],
  rejected: [],
  closed: [],
};
const TRANSITION_ICONS = {
  in_progress: LoaderCircle,
  resolved: CheckCircle2,
  rejected: XCircle,
  closed: Archive,
};

function ComplaintQueue({ isAdmin = false, initialStatus = "all", isDashboard = false, complaintId = null, analyticsOnly = false, listOnly = false, hideAdminHeader = false }) {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [counts, setCounts] = useState({});
  const [priorityCounts, setPriorityCounts] = useState({});
  const [categoryCounts, setCategoryCounts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [staffRemarks, setStaffRemarks] = useState("");
  const [resolutionDetails, setResolutionDetails] = useState("");
  const [classificationPriority, setClassificationPriority] = useState("normal");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [availableCategories, setAvailableCategories] = useState(COMPLAINT_CATEGORIES);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingClassification, setSavingClassification] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const endpoint = isAdmin ? "/admin/complaints" : "/staff/complaints";
  const statusLocked = Object.hasOwn(STATUS_LABELS, initialStatus);
  const filterGridColumns = isAdmin
    ? "xl:grid-cols-[minmax(0,1fr)_minmax(145px,170px)_minmax(145px,190px)_minmax(145px,170px)]"
    : statusLocked
      ? "xl:grid-cols-[minmax(0,1fr)_minmax(145px,190px)]"
      : "xl:grid-cols-[minmax(0,1fr)_minmax(145px,170px)_minmax(145px,190px)]";

  useEffect(() => {
    if (!token) return undefined;

    const controller = new AbortController();
    const categoriesEndpoint = isAdmin ? "/admin/complaint-categories" : "/staff/complaint-categories";
    fetch(`${API_URL}${categoriesEndpoint}`, {
      headers: authHeaders(token),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load complaint categories.");
        return response.json();
      })
      .then((payload) => {
        const categories = (payload.data || [])
          .map((category) => typeof category === "string" ? category : category.name)
          .filter(Boolean);
        setAvailableCategories(categories.length ? categories : COMPLAINT_CATEGORIES);
      })
      .catch(() => {
        if (!controller.signal.aborted) setAvailableCategories(COMPLAINT_CATEGORIES);
      });

    return () => controller.abort();
  }, [isAdmin, token]);

  const loadComplaints = useCallback(async () => {
    if (!token) return;
    try {
      const query = new URLSearchParams({ page: String(page), per_page: "25" });
      if (search.trim()) query.set("search", search.trim());
      if (statusFilter !== "all") query.set("status", statusFilter);
      if (priorityFilter !== "all") query.set("priority", priorityFilter);
      if (categoryFilter) query.set("category", categoryFilter);
      const url = complaintId
        ? `${API_URL}${endpoint}/${complaintId}`
        : `${API_URL}${endpoint}?${query}`;
      const response = await fetch(url, { headers: authHeaders(token) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Unable to load complaints.");
      setError("");
      if (complaintId) {
        const complaint = payload.data;
        setComplaints([complaint]);
        setSelected(complaint);
        setStaffRemarks(complaint.staff_remarks || "");
        setResolutionDetails(complaint.resolution_details || "");
        setClassificationPriority(complaint.priority || "normal");
        return;
      }
      setComplaints(payload.data || []);
      setCounts(payload.counts || {});
      setPriorityCounts(payload.priority_counts || {});
      setCategoryCounts(payload.category_counts || []);
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
  }, [categoryFilter, complaintId, endpoint, page, priorityFilter, search, statusFilter, token]);

  useEffect(() => {
    // Load the selected server page and update the queue when its filters change.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadComplaints();
  }, [loadComplaints]);

  useEffect(() => {
    if (!isAdmin || !selected) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setSelected(null);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [isAdmin, selected]);

  const selectComplaint = (complaint) => {
    if (isAdmin && selected?.id === complaint.id) {
      setSelected(null);
      setStaffRemarks("");
      setResolutionDetails("");
      return;
    }

    setSelected(complaint);
    setStaffRemarks(complaint.staff_remarks || "");
    setResolutionDetails(complaint.resolution_details || "");
    setClassificationPriority(complaint.priority || "normal");
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

  const saveClassification = async () => {
    if (!selected || !token || isAdmin || savingClassification) return;
    setSavingClassification(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/staff/complaints/${selected.id}/classification`, {
        method: "PATCH",
        headers: { ...authHeaders(token), "Content-Type": "application/json" },
        body: JSON.stringify({ priority: classificationPriority }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Unable to update complaint priority.");
      setSelected(payload.data);
      setNotice(payload.message || "Complaint priority updated.");
      await loadComplaints();
    } catch (classificationError) {
      setError(classificationError.message);
    } finally {
      setSavingClassification(false);
    }
  };

  const totalComplaints = Object.values(counts).reduce((sum, count) => sum + Number(count), 0);
  const visibleStatus = useMemo(() => {
    const stats = [
      { label: "Total complaints", value: totalComplaints, icon: FileText, color: "blue" },
      { label: "Needs review", value: counts.pending || 0, icon: Clock3, color: "amber" },
      { label: "In progress", value: counts.in_progress || 0, icon: ShieldAlert, color: "blue" },
      { label: "Urgent priority", value: priorityCounts.urgent || 0, icon: AlertCircle, color: "red" },
      { label: "Resolved", value: counts.resolved || 0, icon: CheckCircle2, color: "green" },
    ];
    return stats;
  }, [counts, priorityCounts, totalComplaints]);

  const maxCategoryCount = Math.max(1, ...categoryCounts.map(({ count }) => Number(count)));
  const priorityTotal = Object.values(priorityCounts).reduce((sum, count) => sum + Number(count), 0);
  const categoryBarColors = ["bg-[#258A72]", "bg-[#D87C43]", "bg-[#3976C5]", "bg-[#C44F5B]", "bg-[#8A8F3A]"];
  let statusPieProgress = 0;
  const statusPieStops = Object.entries(STATUS_LABELS).flatMap(([status]) => {
    const count = Number(counts[status] || 0);
    if (!count || !totalComplaints) return [];
    const start = statusPieProgress;
    statusPieProgress += (count / totalComplaints) * 100;
    return [`${STATUS_COLORS[status]} ${start}% ${statusPieProgress}%`];
  });

  const staffPageTitle = complaintId
    ? "Complaint details"
    : isDashboard
      ? "Complaint dashboard"
      : statusLocked
        ? `${STATUS_LABELS[initialStatus]} complaints`
        : "Complaint queue";

  return (
    <div className={isAdmin ? "w-full space-y-6" : "mx-auto w-full max-w-[1600px] space-y-6 px-5 pb-10 pt-6 sm:px-7 lg:px-9"}>
      {isAdmin && !listOnly && !hideAdminHeader ? (
        <AdminPageHeader
          eyebrow="Complaint oversight"
          title={categoryFilter ? `${categoryFilter} overview` : "Complaint queue"}
          description="Review resident complaints, document actions, and track resolutions."
        />
      ) : !isAdmin && !hideAdminHeader ? (
        <AdminPageHeader
          eyebrow="Complaint management"
          title={staffPageTitle}
          description={
            complaintId
              ? "Review the resident’s report and keep them informed as the case progresses."
              : isDashboard
                ? "Review complaint workload, monitor case status, and follow up on resident reports."
                : "Search and review resident complaints, supporting evidence, and case updates."
          }
        >
          {complaintId && (
            <button
              type="button"
              onClick={() => navigate("/staff/complaints")}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-[#2455D6] shadow-lg transition hover:-translate-y-0.5 hover:bg-[#EEF4FF] hover:shadow-xl"
            >
              <ArrowLeft size={16} />
              Back to complaints
            </button>
          )}
        </AdminPageHeader>
      ) : null}

      {!listOnly && (
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
      )}

      {isAdmin && !listOnly && <section className="mb-7 grid gap-5 xl:grid-cols-[1.35fr_1fr]" aria-label="Complaint analytics">
        <article className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-[#132A4A]">Complaints by category</h3>
              <p className="mt-1 text-xs text-slate-500">Category distribution for the current view</p>
            </div>
            <span className="text-xs font-semibold text-slate-500">{totalComplaints} total</span>
          </div>
          {categoryCounts.length === 0 ? (
            <p className="py-7 text-center text-xs text-slate-500">No category data for this selection.</p>
          ) : (
            <div className="space-y-4">
              {categoryCounts.map(({ category, count }, index) => (
                <div key={category}>
                  <div className="mb-1.5 flex justify-between gap-3 text-xs">
                    <span className="truncate font-semibold text-slate-700">{category}</span>
                    <span className="shrink-0 font-bold text-slate-600">{count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${categoryBarColors[index % categoryBarColors.length]}`}
                      style={{ width: `${(Number(count) / maxCategoryCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-5">
            <h3 className="text-sm font-bold text-[#132A4A]">Priority and status summary</h3>
            <p className="mt-1 text-xs text-slate-500">Assessment and workflow state</p>
          </div>
          <div className="mb-6 grid items-center gap-5 sm:grid-cols-[150px_1fr]">
            <div
              role="img"
              aria-label={`Complaint status pie chart: ${Object.entries(STATUS_LABELS).map(([status, label]) => `${label} ${counts[status] || 0}`).join(", ")}`}
              className="relative mx-auto aspect-square w-36 rounded-full"
              style={{ background: statusPieStops.length ? `conic-gradient(from -90deg, ${statusPieStops.join(", ")})` : "#E2E8F0" }}
            >
              <div className="absolute inset-[28%] flex flex-col items-center justify-center rounded-full bg-white text-center">
                <span className="text-lg font-bold text-[#132A4A]">{totalComplaints}</span>
                <span className="text-[9px] font-semibold text-slate-500">complaints</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-[11px]">
              {Object.entries(STATUS_LABELS).map(([status, label]) => (
                <div key={status} className="flex min-w-0 items-center gap-1.5">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: STATUS_COLORS[status] }} />
                  <span className="truncate text-slate-600">{label}</span>
                  <span className="ml-auto font-bold text-slate-700">{counts[status] || 0}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mb-6 flex h-3 overflow-hidden rounded-full bg-slate-100" aria-label={`${priorityCounts.urgent || 0} urgent and ${priorityCounts.normal || 0} normal priority complaints`}>
            <div className="bg-[#C74444] transition-all" style={{ width: `${priorityTotal ? (Number(priorityCounts.urgent || 0) / priorityTotal) * 100 : 0}%` }} />
            <div className="bg-[#D89A35] transition-all" style={{ width: `${priorityTotal ? (Number(priorityCounts.normal || 0) / priorityTotal) * 100 : 0}%` }} />
          </div>
          <div className="mb-6 grid grid-cols-2 gap-3 text-xs">
            <div className="border-l-2 border-[#C74444] pl-3">
              <p className="font-bold text-[#132A4A]">{priorityCounts.urgent || 0} urgent</p>
              <p className="mt-1 text-slate-500">Priority review</p>
            </div>
            <div className="border-l-2 border-[#D89A35] pl-3">
              <p className="font-bold text-[#132A4A]">{priorityCounts.normal || 0} normal</p>
              <p className="mt-1 text-slate-500">Standard review</p>
            </div>
          </div>
          <div className="space-y-3 border-t border-slate-100 pt-4">
            {Object.entries(STATUS_LABELS).map(([status, label]) => {
              const count = Number(counts[status] || 0);
              const share = totalComplaints ? (count / totalComplaints) * 100 : 0;
              return (
                <div key={status} className="grid grid-cols-[90px_1fr_28px] items-center gap-3 text-xs">
                  <span className="text-slate-600">{label}</span>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-[#3976C5]" style={{ width: `${share}%` }} />
                  </div>
                  <span className="text-right font-bold text-slate-700">{count}</span>
                </div>
              );
            })}
          </div>
        </article>
      </section>}

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

      <div>
      {!complaintId && !analyticsOnly && <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-base font-bold text-[#132A4A]">Resident complaints</h3>
            <p className="mt-1 text-xs text-slate-500">{statusLocked ? `Showing ${STATUS_LABELS[statusFilter]} complaints only. ` : ""}{categoryFilter ? `Showing ${categoryFilter} complaints. ` : ""}Search, filter, review evidence, and update case status.</p>
          </div>
          <span className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">{pagination.total} complaints</span>
        </div>
        <div className={`grid gap-3 border-b border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-2 ${filterGridColumns}`}>
          <label className="relative block">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(event) => { setLoading(true); setSearch(event.target.value); setPage(1); }} placeholder="Search case, resident, or category..." className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs font-medium text-slate-700 outline-none focus:border-[#2455D6] focus:ring-2 focus:ring-blue-100" />
          </label>
          {!statusLocked && (
            <select value={statusFilter} onChange={(event) => { setLoading(true); setStatusFilter(event.target.value); setPage(1); }} aria-label="Filter by complaint status" className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 outline-none focus:border-[#2455D6]">
              <option value="all">All statuses</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          )}
          <CategoryFilterDropdown
            value={categoryFilter}
            categories={availableCategories}
            onChange={(value) => { setLoading(true); setCategoryFilter(value); setPage(1); }}
          />
          {isAdmin && (
            <select value={priorityFilter} onChange={(event) => { setLoading(true); setPriorityFilter(event.target.value); setPage(1); }} aria-label="Filter by complaint priority" className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 outline-none focus:border-[#2455D6]">
              <option value="all">All priorities</option>
              <option value="normal">Normal priority</option>
              <option value="urgent">Urgent priority</option>
            </select>
          )}
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
                    <td className="px-5 py-4 text-right">
                      {isAdmin ? (
                        <button
                          type="button"
                          onClick={() => selectComplaint(complaint)}
                          aria-expanded={selected?.id === complaint.id}
                          className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-[#2455D6] hover:bg-[#EEF4FF] hover:text-[#2455D6] focus:outline-none focus:ring-2 focus:ring-[#2455D6]/20"
                        >
                          {selected?.id === complaint.id ? (
                            <X size={14} aria-hidden="true" />
                          ) : (
                            <Eye size={14} aria-hidden="true" />
                          )}
                          {selected?.id === complaint.id ? "Close" : "Review"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (isDashboard) {
                              navigate(`/staff/complaints?status=${encodeURIComponent(complaint.status)}`);
                            } else {
                              navigate(`/staff/complaints/${complaint.id}`, {
                                state: { status: complaint.status },
                              });
                            }
                          }}
                          className="rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-bold text-slate-600 hover:border-[#2455D6] hover:text-[#2455D6]"
                        >
                          <Eye size={14} className="mr-1.5 inline-block" aria-hidden="true" />
                          Review
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-500 sm:px-6">
          <span>Page {pagination.current_page} of {pagination.last_page}</span>
          <div className="flex gap-2">
            <button type="button" onClick={() => { setLoading(true); setPage((current) => Math.max(1, current - 1)); }} disabled={page <= 1 || loading} aria-label="Previous page" className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:border-[#2455D6] hover:text-[#2455D6] focus:outline-none focus:ring-2 focus:ring-[#2455D6]/20 disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft size={16} aria-hidden="true" /></button>
            <button type="button" onClick={() => { setLoading(true); setPage((current) => Math.min(pagination.last_page, current + 1)); }} disabled={page >= pagination.last_page || loading} aria-label="Next page" className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:border-[#2455D6] hover:text-[#2455D6] focus:outline-none focus:ring-2 focus:ring-[#2455D6]/20 disabled:cursor-not-allowed disabled:opacity-40"><ChevronRight size={16} aria-hidden="true" /></button>
          </div>
        </div>
      </section>}

      {complaintId && loading && <p className="p-12 text-center text-sm text-slate-500">Loading complaint details...</p>}

      {!analyticsOnly && selected && (isAdmin || complaintId) && (
        <div
          className={isAdmin ? "fixed inset-0 z-[100] flex items-center justify-center bg-[#071B3D]/55 p-3 backdrop-blur-sm sm:p-6" : ""}
          role={isAdmin ? "dialog" : undefined}
          aria-modal={isAdmin ? "true" : undefined}
          aria-labelledby={isAdmin ? "admin-complaint-review-title" : undefined}
          onMouseDown={isAdmin ? (event) => {
            if (event.target === event.currentTarget) setSelected(null);
          } : undefined}
        >
        <section className={`grid w-full gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-xl lg:grid-cols-[1fr_360px] ${isAdmin ? "max-h-[90vh] max-w-6xl overflow-y-auto sm:p-6" : "mt-5 shadow-sm"}`}>
          {isAdmin && (
            <div className="col-span-full flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#2455D6]">
                  CMP-{String(selected.id).padStart(5, "0")}
                </p>
                <h2 id="admin-complaint-review-title" className="mt-1 text-lg font-bold text-[#132A4A]">
                  Complaint review
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Close complaint review"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-[#2455D6] hover:bg-[#EEF4FF] hover:text-[#2455D6] focus:outline-none focus:ring-2 focus:ring-[#2455D6]/20"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          )}
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
              <Detail label="Incident location" value={selected.location} />
              <Detail label="Person(s) involved" value={selected.involved_persons} />
              <Detail label="Description" value={selected.description} wide />
              <Detail label="Additional information" value={selected.relevant_information} wide />
              {selected.evidence_path && <EvidenceDownload complaint={selected} token={token} isAdmin={isAdmin} />}
            </dl>
          </div>
          <div className="border-t border-slate-100 pt-5 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
            {isAdmin ? (
              <section aria-label="Complaint progress">
                <h4 className="text-sm font-bold text-[#132A4A]">Complaint progress</h4>
                {selected.status === "rejected" ? (
                  <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">Rejected</p>
                ) : (
                  <ol className="mt-4 space-y-3">
                    {PROGRESS_STAGES.map((status, index) => {
                      const currentIndex = PROGRESS_STAGES.indexOf(selected.status);
                      const complete = currentIndex >= index;
                      const current = selected.status === status;
                      return (
                        <li key={status} className="flex items-center gap-3 text-sm">
                          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${complete ? "bg-[#258A72]" : "bg-slate-200"}`} />
                          <span className={complete ? "font-semibold text-[#172B4D]" : "text-slate-400"}>{STATUS_LABELS[status]}</span>
                          {current && <span className="ml-auto text-[10px] font-bold uppercase text-[#2455D6]">Current</span>}
                        </li>
                      );
                    })}
                  </ol>
                )}
                <div className="mt-5 space-y-3 border-t border-slate-100 pt-4">
                  {selected.staff_remarks && (
                    <p className="text-xs leading-5 text-slate-600"><strong className="text-slate-700">Staff update:</strong> {selected.staff_remarks}</p>
                  )}
                  {selected.resolution_details && (
                    <p className="text-xs leading-5 text-slate-600"><strong className="text-slate-700">Resolution:</strong> {selected.resolution_details}</p>
                  )}
                  {!selected.staff_remarks && !selected.resolution_details && (
                    <p className="text-xs text-slate-500">No staff progress notes recorded yet.</p>
                  )}
                </div>
              </section>
            ) : (
              <section className="mb-6 border-b border-slate-100 pb-5">
                <h4 className="text-sm font-bold text-[#132A4A]">Priority assessment</h4>
                <label className="mt-3 block text-xs font-semibold text-slate-600">
                  Assessed priority
                  <select value={classificationPriority} onChange={(event) => setClassificationPriority(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none focus:border-[#2455D6]">
                    <option value="normal">Normal</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </label>
                <button type="button" onClick={saveClassification} disabled={savingClassification} className="mt-3 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#2455D6] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#1948B8] focus:outline-none focus:ring-2 focus:ring-[#2455D6]/30 disabled:cursor-not-allowed disabled:opacity-50">
                  {savingClassification ? <LoaderCircle size={14} className="animate-spin" aria-hidden="true" /> : <Save size={14} aria-hidden="true" />}
                  {savingClassification ? "Saving assessment..." : "Save assessment"}
                </button>
              </section>
            )}
            {!isAdmin && <>
            <h4 className="text-sm font-bold text-[#132A4A]">Case update</h4>
            <p className="mt-2 rounded-lg bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-800">
              Staff remarks and case resolution details entered here are shared
              with the resident in their complaint and notifications.
            </p>
            <label className="mt-4 block text-xs font-semibold text-slate-600">
              Staff remarks (shared with resident)
              <textarea value={staffRemarks} onChange={(event) => setStaffRemarks(event.target.value)} maxLength={2000} rows={3} className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-xs outline-none focus:border-[#2455D6] focus:ring-2 focus:ring-blue-100" placeholder="Write an update for the resident..." />
            </label>
            <label className="mt-3 block text-xs font-semibold text-slate-600">
              Resolution / outcome details
              <textarea value={resolutionDetails} onChange={(event) => setResolutionDetails(event.target.value)} maxLength={5000} rows={3} className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-xs outline-none focus:border-[#2455D6] focus:ring-2 focus:ring-blue-100" placeholder="Required when resolving or rejecting..." />
            </label>
            <div className="mt-4 flex flex-wrap gap-2">
              {(TRANSITIONS[selected.status] || []).map((status) => {
                const Icon = TRANSITION_ICONS[status];
                return (
                  <button
                    key={status}
                    type="button"
                    disabled={submitting || (["resolved", "rejected"].includes(status) && !resolutionDetails.trim())}
                    onClick={() => updateComplaint(status)}
                    className={status === "rejected"
                      ? "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-700 transition hover:border-red-300 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                      : isAdmin
                        ? primaryButtonClass
                        : "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#2455D6] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#1948B8] focus:outline-none focus:ring-2 focus:ring-[#2455D6]/30 disabled:cursor-not-allowed disabled:opacity-50"}
                  >
                    {submitting ? (
                      <LoaderCircle size={14} className="animate-spin" aria-hidden="true" />
                    ) : (
                      <Icon size={14} aria-hidden="true" />
                    )}
                    {submitting ? "Saving..." : STATUS_LABELS[status]}
                  </button>
                );
              })}
            </div>
            {selected.staff_remarks && <p className="mt-4 border-t border-slate-100 pt-3 text-xs leading-5 text-slate-500"><strong className="text-slate-700">Previous remarks:</strong> {selected.staff_remarks}</p>}
            {selected.resolution_details && <p className="mt-2 text-xs leading-5 text-slate-500"><strong className="text-slate-700">Recorded outcome:</strong> {selected.resolution_details}</p>}
            </>}
          </div>
        </section>
        </div>
      )}
      </div>
    </div>
  );
}

function CategoryFilterDropdown({ value, categories, onChange }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return undefined;

    const closeOnOutsideClick = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [open]);

  const options = ["", ...categories];
  const selectedLabel = value || "All categories";

  return (
    <div ref={rootRef} className="relative w-full" onKeyDown={(event) => {
      if (event.key === "Escape") setOpen(false);
    }}>
      <button
        type="button"
        aria-label="Filter by complaint category"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((current) => !current)}
        className="flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 text-left text-xs font-semibold text-slate-600 outline-none hover:border-[#2455D6]/50 focus:border-[#2455D6]"
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown size={14} className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div
          id={menuId}
          role="listbox"
          aria-label="Complaint categories"
          className="absolute left-0 top-full z-40 mt-1 max-h-[216px] w-full overflow-y-auto overscroll-contain rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          {options.map((category) => {
            const selected = value === category;
            const label = category || "All categories";
            return (
              <button
                key={category || "all"}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(category);
                  setOpen(false);
                }}
                className={`block min-h-9 w-full px-3 py-2 text-left text-xs ${selected ? "bg-blue-50 font-bold text-[#2455D6]" : "text-slate-700 hover:bg-slate-50"}`}
              >
                {label}
              </button>
            );
          })}
        </div>
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
      <button type="button" onClick={download} disabled={busy} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-[#2455D6] transition hover:border-[#2455D6] hover:bg-[#EEF4FF] focus:outline-none focus:ring-2 focus:ring-[#2455D6]/20 disabled:cursor-not-allowed disabled:opacity-50">
        {busy ? <LoaderCircle size={14} className="animate-spin" aria-hidden="true" /> : <Download size={14} aria-hidden="true" />}
        {busy ? "Downloading..." : "Download evidence"}
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
