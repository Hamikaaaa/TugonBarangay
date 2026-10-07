import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import {
  Archive,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Clock3,
  Eye,
  FileCheck2,
  FileText,
  Filter,
  LayoutDashboard,
  Search,
  Settings2,
  X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import DocumentPreviewModal from "./DocumentPreviewModal";
import FeeAssessment from "../../components/document/FeeAssessment";
import StaffLayout from "./StaffLayout";

const API_URL = "http://127.0.0.1:8000/api";
const DOCUMENT_TYPES_CACHE_KEY = "staff-document-types";
const DOCUMENT_TYPES = [
  { label: "Dashboard", value: "" },
  { label: "Barangay Clearance", value: "Barangay Certification" },
  { label: "Certificate of Residency", value: "Barangay Residency" },
  { label: "Business Clearance", value: "Business Permit" },
  { label: "Certificate of Good Moral Character", value: "Certificate of Good Moral Character" },
  { label: "First-Time Jobseeker Certification", value: "First-Time Jobseeker Certification" },
];
const DEFAULT_DOCUMENT_TYPES = DOCUMENT_TYPES.filter((document) => document.value);

function readCachedDocumentTypes() {
  try {
    const cached = sessionStorage.getItem(DOCUMENT_TYPES_CACHE_KEY);
    if (!cached) return null;

    const parsed = JSON.parse(cached);
    if (
      Array.isArray(parsed) &&
      parsed.every((item) => typeof item.label === "string" && typeof item.value === "string")
    ) {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

const DOCUMENT_LABELS = Object.fromEntries(
  DOCUMENT_TYPES.filter((document) => document.value).map(({ label, value }) => [value, label]),
);
Object.assign(DOCUMENT_LABELS, {
  "Barangay Certificate": "Barangay Certificate",
  "Barangay Indigency": "Certificate of Indigency",
  "First-Time Jobseeker Certification": "First-Time Job Seeker Certification",
});

const STATUS_META = {
  pending: { label: "Pending", className: "bg-[#FFF7E7] text-[#805900] ring-[#F1D9A8]", icon: Clock3 },
  under_review: { label: "Under Review", className: "bg-[#EEF4FF] text-[#2455D6] ring-[#D9E6FF]", icon: Search },
  processing: { label: "Processing", className: "bg-[#EAF1FF] text-[#123F70] ring-[#D9E6FF]", icon: Settings2 },
  for_correction: { label: "For Correction", className: "bg-[#FFF0EE] text-[#C74444] ring-[#F2D4D0]", icon: CircleAlert },
  ready_for_release: { label: "Ready for Release", className: "bg-[#ECF9F1] text-[#21864A] ring-[#CDEBD8]", icon: FileCheck2 },
  completed: { label: "Completed", className: "bg-[#ECF9F1] text-[#21864A] ring-[#CDEBD8]", icon: CheckCircle2 },
  rejected: { label: "Rejected", className: "bg-[#FFF0EE] text-[#C74444] ring-[#F2D4D0]", icon: CircleAlert },
};

const WORKFLOW = [
  { status: "pending", description: "Request received" },
  { status: "under_review", description: "Check resident details and uploads" },
  { status: "processing", description: "Prepare the requested document" },
  { status: "ready_for_release", description: "Document is ready to be claimed" },
  { status: "completed", description: "Resident has claimed the document" },
];

const WORKFLOW_GUIDANCE = {
  pending: "Start by checking the resident's information and uploaded requirements.",
  under_review: "Confirm the details and requirements. If everything is valid, move the request to Processing.",
  processing: "Generate and review the document. Once it is complete, mark it Ready for Release.",
  for_correction: "This request is paused while the resident submits the requested corrections.",
  ready_for_release: "The document is ready. Mark it Completed after the resident claims it.",
  completed: "The resident has claimed this document. No further action is available.",
  rejected: "This request was rejected and is closed. No further action is available.",
};

function StaffDashboardProfessional({ documentType = "" }) {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [documentTypes, setDocumentTypes] = useState(
    () => readCachedDocumentTypes() || DEFAULT_DOCUMENT_TYPES,
  );
  const [documentTypesLoading, setDocumentTypesLoading] = useState(
    () => readCachedDocumentTypes() === null,
  );
  const [requests, setRequests] = useState([]);
  const [dashboardSummary, setDashboardSummary] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const activeDocumentType = documentType;
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [requestPage, setRequestPage] = useState(1);
  const [requestLastPage, setRequestLastPage] = useState(1);
  const [requestTotal, setRequestTotal] = useState(0);
  const [previewRequest, setPreviewRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [staffRemarks, setStaffRemarks] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [viewingRequirement, setViewingRequirement] = useState("");
  const [requirementPreview, setRequirementPreview] = useState(null);

  useEffect(() => {
    return () => {
      if (requirementPreview?.url) URL.revokeObjectURL(requirementPreview.url);
    };
  }, [requirementPreview?.url]);

  useEffect(() => {
    if (!token) return undefined;
    let cancelled = false;
    const loadDocumentTypes = async () => {
      try {
        const response = await fetch(`${API_URL}/staff/document-types`, {
          headers: authHeaders(token),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || "Unable to load configured document types.");
        if (!cancelled) {
          const types = payload.data || [];
          setDocumentTypes(types);
          try {
            sessionStorage.setItem(DOCUMENT_TYPES_CACHE_KEY, JSON.stringify(types));
          } catch {
            // The menu can still use the fetched list if session storage is unavailable.
          }
        }
      } catch (requestError) {
        if (!cancelled) setError(requestError.message);
      } finally {
        if (!cancelled) setDocumentTypesLoading(false);
      }
    };
    loadDocumentTypes();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const loadRequests = useCallback(async (page = 1) => {
    if (!token) return;
    setLoading(true);
    setError("");

    try {
      const query = new URLSearchParams({
        status: statusFilter,
        per_page: "15",
        page: String(page),
        sort_by: "created_at",
      });
      if (debouncedSearch.trim()) query.set("search", debouncedSearch.trim());
      if (activeDocumentType) query.set("document_type", activeDocumentType);
      if (dateFrom) query.set("from", dateFrom);
      if (dateTo) query.set("to", dateTo);

      const response = await fetch(`${API_URL}/staff/document-requests?${query}`, {
        headers: authHeaders(token),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Unable to load document requests.");
      setRequests(payload.data || []);
      setRequestPage(payload.current_page || page);
      setRequestLastPage(payload.last_page || 1);
      setRequestTotal(payload.total || 0);
    } catch (requestError) {
      setRequests([]);
      setRequestTotal(0);
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [activeDocumentType, dateFrom, dateTo, debouncedSearch, statusFilter, token]);

  const loadDashboardSummary = useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/staff/document-request-dashboard`, {
        headers: authHeaders(token),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Unable to load document request summary.");
      setDashboardSummary(payload.data);
    } catch (requestError) {
      setError(requestError.message);
    }
  }, [token]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedSearch(search), 250);
    return () => window.clearTimeout(timeoutId);
  }, [search]);

  useEffect(() => {
    // Filters are sent to the server so staff can search beyond the visible page.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    // Dashboard aggregates and prioritized lists are loaded independently from the queue.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDashboardSummary();
  }, [loadDashboardSummary]);

  const counts = useMemo(() => ({
    pending: dashboardSummary?.counts?.pending ?? 0,
    under_review: dashboardSummary?.counts?.under_review ?? 0,
    processing: dashboardSummary?.counts?.processing ?? 0,
    for_correction: dashboardSummary?.counts?.for_correction ?? 0,
    ready_for_release: dashboardSummary?.counts?.ready_for_release ?? 0,
    completed: dashboardSummary?.counts?.completed ?? 0,
    rejected: dashboardSummary?.counts?.rejected ?? 0,
  }), [dashboardSummary]);

  const filteredRequests = useMemo(
    () => requests.filter((request) => !activeDocumentType || request.document_type === activeDocumentType),
    [activeDocumentType, requests],
  );

  const selectDocumentType = (nextDocumentType) => {
    setSelectedRequest(null);
    navigate(nextDocumentType ? `/staff/document-types/${encodeURIComponent(nextDocumentType)}` : "/staff/dashboard");
  };

  const selectRequest = (request) => {
    setSelectedRequest(request);
    setStaffRemarks(request.staff_remarks || "");
    setRejectionReason(request.rejection_reason || "");
  };

  const viewRequest = (request) => {
    selectRequest(request);
    window.requestAnimationFrame(() => {
      document.getElementById("staff-request-details")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const quickFilter = (nextStatus) => {
    setStatusFilter(nextStatus);
    setDateFrom("");
    setDateTo("");
    setSearch("");
    setRequestPage(1);
    window.requestAnimationFrame(() => {
      document.getElementById("staff-request-queue")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const handleFeeUpdated = (updatedRequest) => {
    setSelectedRequest(updatedRequest);
    setRequests((current) =>
      current.map((request) => request.id === updatedRequest.id ? { ...request, ...updatedRequest } : request),
    );
  };

  const openPreview = async (request) => {
    if (!request || !token) return;
    if (request.status !== "processing") {
      if (request.document_content) {
        setSelectedRequest(request);
        setStaffRemarks(request.staff_remarks || "");
        setRejectionReason(request.rejection_reason || "");
        setPreviewRequest(request);
      }
      return;
    }

    setSubmitting(true);
    setError("");
    setStaffRemarks(request.staff_remarks || "");
    setRejectionReason(request.rejection_reason || "");
    try {
      const response = await fetch(`${API_URL}/staff/document-requests/${request.id}/generate`, {
        method: "POST",
        headers: { ...authHeaders(token), "Content-Type": "application/json" },
        body: JSON.stringify({
          document_content: request.document_content || request.details?.form_fields || {},
          staff_remarks: request.staff_remarks || "",
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Unable to generate document preview.");
      setSelectedRequest(payload.data);
      setStaffRemarks(payload.data.staff_remarks || "");
      setPreviewRequest(payload.data);
    } catch (previewError) {
      setError(previewError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const saveDocumentContent = async (documentContent) => {
    if (!previewRequest || !token) throw new Error("Select a document request first.");
    const response = await fetch(`${API_URL}/staff/document-requests/${previewRequest.id}/generate`, {
      method: "POST",
      headers: { ...authHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify({ document_content: documentContent, staff_remarks: staffRemarks }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || "Unable to save document edits.");
    setSelectedRequest(payload.data);
    setPreviewRequest(payload.data);
    setRequests((current) => current.map((request) => request.id === payload.data.id ? { ...request, ...payload.data } : request));
    setNotice("Document edits saved. Review the preview again before release.");
  };

  const viewRequirement = async (request, requirementKey, fileName) => {
    if (!token || viewingRequirement) return;
    const viewKey = `${request.id}-${requirementKey}`;
    setViewingRequirement(viewKey);
    setError("");
    try {
      const response = await fetch(
        `${API_URL}/staff/document-requests/${request.id}/requirements/${encodeURIComponent(requirementKey)}`,
        { headers: authHeaders(token) },
      );
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.message || "Unable to view requirement.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setRequirementPreview({
        url,
        name: fileName || `Request ${request.id} requirement`,
        type: blob.type,
      });
    } catch (viewError) {
      setError(viewError.message);
    } finally {
      setViewingRequirement("");
    }
  };

  const updateStatus = async (status) => {
    if (!selectedRequest || !token || submitting) return;
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/staff/document-requests/${selectedRequest.id}/status`, {
        method: "PATCH",
        headers: { ...authHeaders(token), "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          staff_remarks: staffRemarks,
          rejection_reason: status === "rejected" ? rejectionReason : null,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Unable to update request.");

      setSelectedRequest(payload.data);
      setStaffRemarks(payload.data.staff_remarks || "");
      setRejectionReason(payload.data.rejection_reason || "");
      setNotice(payload.message);
      setTimeout(() => setNotice(""), 4000);
      await Promise.all([loadRequests(1), loadDashboardSummary()]);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const currentIndex = selectedRequest
    ? WORKFLOW.findIndex((step) => step.status === selectedRequest.status)
    : -1;
  const offeredDocumentTypes = documentTypes.map(({ label, value }) => ({ label, value }));
  const activeType = offeredDocumentTypes.find((item) => item.value === documentType);
  const activeDocumentLabel = activeType?.label || DOCUMENT_LABELS[documentType] || documentType;

  const navigationItems = [
    { label: "Dashboard", value: "", path: "/staff/dashboard" },
    ...offeredDocumentTypes.map((item) => ({
      ...item,
      path: `/staff/document-types/${encodeURIComponent(item.value)}`,
    })),
  ];

  if (documentType && !documentTypesLoading && !activeType) {
    return <Navigate to="/staff/dashboard" replace />;
  }

  return (
    <StaffLayout
      title="Document Processing"
      navigationItems={navigationItems}
      activePath={documentType ? `/staff/document-types/${encodeURIComponent(documentType)}` : "/staff/dashboard"}
      onNavigate={(path) => {
        const item = navigationItems.find((navigationItem) => navigationItem.path === path);
        if (item) selectDocumentType(item.value);
      }}
    >
        <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-7 lg:px-9 lg:py-8">
          {!documentType && (
            <>
              <section className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#2455D6]">
                    <LayoutDashboard size={15} /> Dashboard overview
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight text-[#172B4D] sm:text-3xl">Welcome, {user?.name?.split(" ")[0] || "Officer"}</h2>
                  <p className="mt-2 text-sm text-slate-500">Review, process, and prepare resident documents from one central workspace.</p>
                </div>
              </section>

              <section className="mb-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Daily request workload">
                <SummaryCard label="Pending Requests" value={counts.pending} icon={Clock3} color="amber" note="Awaiting initial review" onClick={() => quickFilter("pending")} />
                <SummaryCard label="Under Review" value={counts.under_review} icon={Search} color="blue" note="Requirements being checked" onClick={() => quickFilter("under_review")} />
                <SummaryCard label="Processing" value={counts.processing} icon={Settings2} color="blue" note="Document being prepared" onClick={() => quickFilter("processing")} />
                <SummaryCard label="For Correction" value={counts.for_correction} icon={CircleAlert} color="red" note="Waiting for resident update" onClick={() => quickFilter("for_correction")} />
                <SummaryCard label="Ready for Release" value={counts.ready_for_release} icon={FileCheck2} color="emerald" note="Awaiting resident pickup" onClick={() => quickFilter("ready_for_release")} />
              </section>

              <section className="mb-7 grid gap-5 xl:grid-cols-2">
                <div className="overflow-hidden rounded-2xl border border-[#E6ECF5] bg-white shadow-[0_8px_28px_rgba(18,63,112,0.05)]">
                  <div className="border-b border-[#E6ECF5] px-5 py-4">
                    <h2 className="font-bold text-[#172B4D]">Requests needing attention</h2>
                    <p className="mt-1 text-xs text-slate-500">Requests that need staff action, prioritized by status.</p>
                  </div>
                  <CompactRequestTable requests={dashboardSummary?.attention || []} onView={viewRequest} emptyMessage="No requests need immediate staff action." />
                </div>

                <div className="overflow-hidden rounded-2xl border border-[#E6ECF5] bg-white shadow-[0_8px_28px_rgba(18,63,112,0.05)]">
                  <div className="border-b border-[#E6ECF5] px-5 py-4">
                    <h2 className="font-bold text-[#172B4D]">Other recent requests</h2>
                    <p className="mt-1 text-xs text-slate-500">Latest activity not already listed for attention.</p>
                  </div>
                  <CompactRequestTable requests={dashboardSummary?.recent || []} onView={viewRequest} emptyMessage="No recent requests." />
                </div>
              </section>

              <section className="mb-7 overflow-hidden rounded-2xl border border-[#E6ECF5] bg-white shadow-[0_8px_28px_rgba(18,63,112,0.05)]">
                <div className="border-b border-[#E6ECF5] px-5 py-4">
                  <h2 className="font-bold text-[#172B4D]">Document request summary</h2>
                  <p className="mt-1 text-xs text-slate-500">Request counts by configured document type and status.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1000px] text-left text-xs">
                    <thead className="bg-[#F6F8FC] font-bold uppercase tracking-wide text-[#55708F]">
                      <tr>
                        <th className="px-4 py-3">Document type</th>
                        <th className="px-3 py-3">Pending</th>
                        <th className="px-3 py-3">Under review</th>
                        <th className="px-3 py-3">Processing</th>
                        <th className="px-3 py-3">For correction</th>
                        <th className="px-3 py-3">Ready</th>
                        <th className="px-3 py-3">Released</th>
                        <th className="px-3 py-3">Rejected</th>
                        <th className="px-3 py-3">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(dashboardSummary?.summary_by_type || []).map((type) => (
                        <tr key={type.value} className="hover:bg-[#2455D6]/[0.03]">
                          <td className="px-4 py-3 font-semibold text-slate-700">{type.label}</td>
                          {["pending", "under_review", "processing", "for_correction", "ready_for_release", "completed", "rejected", "total"].map((key) => (
                            <td key={key} className="px-3 py-3 text-slate-600">{type[key]}</td>
                          ))}
                        </tr>
                      ))}
                      {!dashboardSummary?.summary_by_type?.length && (
                        <tr><td colSpan="9" className="px-4 py-8 text-center text-slate-500">No document types or requests to summarize.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}

          {notice && <Notice type="success" message={notice} onClose={() => setNotice("")} />}
          {error && <Notice type="error" message={error} onClose={() => setError("")} />}

          <section className="overflow-hidden rounded-2xl border border-[#E6ECF5] bg-white shadow-[0_8px_28px_rgba(18,63,112,0.05)]">
            <div className="flex flex-col gap-4 border-b border-[#E6ECF5] px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <FileText size={17} className="text-[#2455D6]" />
                  <h2 className="text-base font-bold text-[#172B4D]">{documentType ? `${activeDocumentLabel} Requests` : "Central Request Queue"}</h2>
                </div>
                <p className="mt-1 text-xs text-slate-500">{documentType ? `Manage only ${activeDocumentLabel} requests.` : "Search, filter, sort, and process resident requests."}</p>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-[#F6F8FC] px-3 py-2 text-xs font-semibold text-[#55708F]">
                <span className="h-2 w-2 rounded-full bg-[#21864A]" />
                {filteredRequests.length} on this page · {requestTotal} results
              </div>
            </div>

            <div id="staff-request-queue" className="grid gap-3 border-b border-[#E6ECF5] bg-[#F6F8FC] p-4 lg:grid-cols-4">
              <label className="relative block">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => { setSearch(event.target.value); setRequestPage(1); }}
                  placeholder="Search request ID or resident name..."
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#2455D6] focus:ring-2 focus:ring-[#2455D6]/15"
                />
              </label>
              <label className="relative">
                <Filter size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setRequestPage(1); }} className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-9 pr-9 text-xs font-semibold text-slate-600 outline-none focus:border-[#2455D6] focus:ring-2 focus:ring-[#2455D6]/15">
                  <option value="all">All statuses</option>
                  {Object.entries(STATUS_META).map(([value, status]) => <option key={value} value={value}>{status.label}</option>)}
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3">
                <span className="shrink-0 text-[10px] font-bold text-slate-500">From</span>
                <input type="date" value={dateFrom} max={dateTo || undefined} onChange={(event) => { setDateFrom(event.target.value); setRequestPage(1); }} className="min-w-0 flex-1 py-2 text-xs text-slate-600 outline-none" />
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3">
                <span className="shrink-0 text-[10px] font-bold text-slate-500">To</span>
                <input type="date" value={dateTo} min={dateFrom || undefined} onChange={(event) => { setDateTo(event.target.value); setRequestPage(1); }} className="min-w-0 flex-1 py-2 text-xs text-slate-600 outline-none" />
              </label>
              {(dateFrom || dateTo || search) && (
                <button type="button" onClick={() => { setDateFrom(""); setDateTo(""); setSearch(""); setRequestPage(1); }} className="rounded-lg px-3 py-2 text-xs font-bold text-[#2455D6] transition hover:bg-[#2455D6]/5 hover:underline focus:outline-none focus:ring-2 focus:ring-[#2455D6]/20">Clear filters</button>
              )}
            </div>

            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-12 text-center text-sm text-slate-500">Loading document requests...</div>
              ) : filteredRequests.length === 0 ? (
                <div className="p-14 text-center">
                  <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><FileText size={22} /></span>
                  <p className="mt-4 text-sm font-bold text-slate-700">No requests found</p>
                  <p className="mt-1 text-xs text-slate-500">Try changing your search, status filter, or document type.</p>
                </div>
              ) : (
                <table className="w-full min-w-[980px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[#E6ECF5] bg-[#F6F8FC] text-[10px] font-bold uppercase tracking-[0.12em] text-[#55708F]">
                      <th className="px-5 py-3.5">Request ID</th>
                      <th className="px-5 py-3.5">Resident Name</th>
                      <th className="px-5 py-3.5">Document Type</th>
                      <th className="px-5 py-3.5">Date Requested</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRequests.map((request) => {
                      const status = STATUS_META[request.status] || STATUS_META.pending;
                      const StatusIcon = status.icon;
                      const isSelected = selectedRequest?.id === request.id;
                      return (
                        <tr key={request.id} className={`group transition hover:bg-[#2455D6]/[0.03] ${isSelected ? "bg-[#2455D6]/[0.05]" : ""}`}>
                          <td className="px-5 py-4 text-xs font-bold text-[#2455D6]">#{request.id}</td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-600">{(request.resident?.name || "R").charAt(0)}</span>
                              <div>
                                <p className="text-xs font-bold text-slate-800">{request.resident?.name || "Unknown resident"}</p>
                                <p className="mt-0.5 text-[10px] text-slate-400">{request.resident?.email || "No email"}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-xs font-semibold text-slate-600">{request.document_type_label || DOCUMENT_LABELS[request.document_type] || request.document_type}</td>
                          <td className="px-5 py-4 text-xs text-slate-500">{formatDate(request.created_at)}</td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ring-inset ${status.className}`}>
                              <StatusIcon size={12} /> {status.label}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-end gap-1.5">
                              <button type="button" onClick={() => viewRequest(request)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#D9E6FF] bg-white px-2.5 text-[10px] font-bold text-[#2455D6] transition hover:border-[#2455D6] hover:bg-[#EEF4FF] focus:outline-none focus:ring-2 focus:ring-[#2455D6]/20" aria-label={`View details for request ${request.id}`}>
                                <Eye size={13} /> View
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            {!loading && (
              <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
                <span>Page {requestPage} of {requestLastPage}</span>
                <div className="flex gap-2">
                  <button type="button" disabled={requestPage <= 1} onClick={() => loadRequests(requestPage - 1)} className="rounded-lg border border-[#D9E6FF] bg-white px-3 py-1.5 font-semibold text-[#2455D6] transition hover:bg-[#EEF4FF] focus:outline-none focus:ring-2 focus:ring-[#2455D6]/20 disabled:cursor-not-allowed disabled:opacity-40">Previous</button>
                  <button type="button" disabled={requestPage >= requestLastPage} onClick={() => loadRequests(requestPage + 1)} className="rounded-lg border border-[#D9E6FF] bg-white px-3 py-1.5 font-semibold text-[#2455D6] transition hover:bg-[#EEF4FF] focus:outline-none focus:ring-2 focus:ring-[#2455D6]/20 disabled:cursor-not-allowed disabled:opacity-40">Next</button>
                </div>
              </div>
            )}
          </section>

          {selectedRequest ? (
            <section id="staff-request-details" className="mt-5 scroll-mt-24 overflow-hidden rounded-2xl border border-[#E6ECF5] bg-white shadow-[0_8px_28px_rgba(18,63,112,0.05)]">
              <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#2455D6]"><FileText size={18} /></span>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Request details</p>
                    <h2 className="text-lg font-bold text-[#172B4D]">#{selectedRequest.id} · {selectedRequest.document_type_label || DOCUMENT_LABELS[selectedRequest.document_type] || selectedRequest.document_type}</h2>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => openPreview(selectedRequest)} disabled={submitting || (selectedRequest.status !== "processing" && !selectedRequest.document_content)} className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#2455D6] px-3 text-xs font-bold text-white shadow-sm transition hover:bg-[#1D46B5] focus:outline-none focus:ring-2 focus:ring-[#2455D6]/30 disabled:cursor-not-allowed disabled:opacity-40"><Eye size={14} /> Preview document</button>
                </div>
              </div>

              <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_340px]">
                <div className="border-b border-slate-200 p-5 sm:p-6 xl:border-b-0 xl:border-r">
                  <RequestDetails request={selectedRequest} token={token} onFeeUpdated={handleFeeUpdated} />
                  <div className="mt-6 rounded-xl border border-[#E6ECF5] bg-[#F6F8FC] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold text-slate-800">Document requirements</p>
                        <p className="mt-1 text-[11px] text-slate-500">Uploaded supporting documents for this request.</p>
                      </div>
                      <Archive size={17} className="text-slate-400" />
                    </div>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {Object.entries(selectedRequest.details?.requirements || {}).map(([key, requirement]) => (
                        <div key={key} className="rounded-lg border border-slate-200 bg-white p-3">
                          <p className="text-xs font-bold text-slate-700">{requirement.label || key.replaceAll("_", " ")}</p>
                          <p className="mt-1 truncate text-[10px] text-slate-500">{requirement.original_name || "Not uploaded"}</p>
                          {requirement.path && (
                            <button
                              type="button"
                              onClick={() => viewRequirement(selectedRequest, key, requirement.original_name)}
                              disabled={viewingRequirement === `${selectedRequest.id}-${key}`}
                              className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-bold text-[#2455D6] hover:underline disabled:opacity-50"
                            >
                              <Eye size={12} />
                              {viewingRequirement === `${selectedRequest.id}-${key}` ? "Opening..." : "View uploaded requirement"}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <aside className="bg-[#F6F8FC] p-5 sm:p-6">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-800">Request progress</p>
                      <p className="mt-1 text-[11px] text-slate-500">The steps below show progress; they are not clickable.</p>
                    </div>
                  </div>

                  <div className={`mb-4 rounded-xl border p-3 ${
                    selectedRequest.status === "rejected"
                      ? "border-[#F2D4D0] bg-[#FFF0EE]"
                      : selectedRequest.status === "for_correction"
                        ? "border-[#F1D9A8] bg-[#FFF7E7]"
                        : "border-[#D9E6FF] bg-[#EEF4FF]"
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ring-inset ${STATUS_META[selectedRequest.status]?.className || "bg-slate-100 text-slate-600 ring-slate-200"}`}>
                        {STATUS_META[selectedRequest.status]?.label || selectedRequest.status}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wide text-[#55708F]">Current status</span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-slate-700">
                      {WORKFLOW_GUIDANCE[selectedRequest.status] || "Review the request and follow the available action below."}
                    </p>
                  </div>

                  {!["for_correction", "rejected"].includes(selectedRequest.status) && (
                    <ol className="space-y-3" aria-label="Request progress steps">
                      {WORKFLOW.map(({ status, description }, index) => {
                        const complete = currentIndex > index;
                        const active = selectedRequest.status === status;
                        return (
                          <li key={status} className="flex items-start gap-3">
                            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${complete ? "border-[#21864A] bg-[#21864A] text-white" : active ? "border-[#2455D6] bg-white text-[#2455D6] ring-2 ring-[#2455D6]/15" : "border-slate-200 bg-white text-slate-400"}`}>{complete ? <CheckCircle2 size={14} /> : index + 1}</span>
                            <div className="pt-0.5">
                              <p className={`text-xs font-bold ${active ? "text-[#2455D6]" : complete ? "text-[#21864A]" : "text-slate-500"}`}>{STATUS_META[status].label}</p>
                              <p className="mt-0.5 text-[10px] leading-4 text-slate-400">{description}{active ? " · Current step" : complete ? " · Done" : ""}</p>
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  )}

                  <div className="mt-6 rounded-xl border border-[#E6ECF5] bg-white p-4">
                    <div className="mb-3">
                      <h3 className="text-xs font-bold text-slate-800">Available action</h3>
                      <p className="mt-1 text-[11px] leading-4 text-slate-500">
                        {selectedRequest.status === "pending" && "Select Start requirements review to begin processing."}
                        {selectedRequest.status === "under_review" && "Select Approve and process after verifying the resident's details."}
                        {selectedRequest.status === "processing" && "Generate and review the document before marking it ready for release."}
                        {selectedRequest.status === "ready_for_release" && "Select Complete request only after the resident claims the document."}
                        {["for_correction", "completed", "rejected"].includes(selectedRequest.status) && "There is no staff status action available at this stage."}
                      </p>
                    </div>
                    {["pending", "under_review", "processing", "ready_for_release"].includes(selectedRequest.status) && (
                      <>
                    {["pending", "under_review", "processing"].includes(selectedRequest.status) && (
                      <>
                        <label htmlFor="staff-remarks" className="text-xs font-bold text-slate-800">Staff remarks</label>
                        <textarea
                          id="staff-remarks"
                          value={staffRemarks}
                          onChange={(event) => setStaffRemarks(event.target.value)}
                          placeholder="Add internal review notes or correction instructions..."
                          className="mt-2 min-h-24 w-full resize-y rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-700 outline-none focus:border-[#2455D6] focus:ring-2 focus:ring-[#2455D6]/15"
                        />
                      </>
                    )}
                    <div className="mt-3 grid gap-2">
                      {selectedRequest.status === "pending" && (
                        <button type="button" onClick={() => updateStatus("under_review")} disabled={submitting} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#2455D6] px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#1D46B5] focus:outline-none focus:ring-2 focus:ring-[#2455D6]/30 disabled:opacity-50"><Search size={14} /> {submitting ? "Updating request..." : "Start requirements review"}</button>
                      )}
                      {selectedRequest.status === "under_review" && (
                        <button type="button" onClick={() => updateStatus("processing")} disabled={submitting} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#2455D6] px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#1D46B5] focus:outline-none focus:ring-2 focus:ring-[#2455D6]/30 disabled:opacity-50"><Settings2 size={14} /> {submitting ? "Updating request..." : "Approve requirements and start processing"}</button>
                      )}
                      {selectedRequest.status === "processing" && (
                        <>
                          <button type="button" onClick={() => openPreview(selectedRequest)} disabled={submitting} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#2455D6] px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#1D46B5] focus:outline-none focus:ring-2 focus:ring-[#2455D6]/30 disabled:opacity-50"><Eye size={14} /> Generate and review document</button>
                          <button type="button" onClick={() => updateStatus("ready_for_release")} disabled={submitting || !selectedRequest.document_content} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#CDEBD8] bg-[#ECF9F1] px-3 py-2 text-xs font-bold text-[#21864A] transition hover:bg-[#DDF3E5] disabled:opacity-50"><FileCheck2 size={14} /> Mark ready for release</button>
                          {!selectedRequest.document_content && (
                            <p className="text-[10px] leading-4 text-slate-500">Generate and review the document first. Then this action will be enabled.</p>
                          )}
                        </>
                      )}
                      {selectedRequest.status === "ready_for_release" && (
                        <button type="button" onClick={() => updateStatus("completed")} disabled={submitting} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#21864A] px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#176A39] focus:outline-none focus:ring-2 focus:ring-[#21864A]/30 disabled:opacity-50"><CheckCircle2 size={14} /> {submitting ? "Updating request..." : "Resident claimed document — complete request"}</button>
                      )}
                      {["pending", "under_review", "processing"].includes(selectedRequest.status) && (
                        <>
                          <button type="button" onClick={() => updateStatus("for_correction")} disabled={submitting || !staffRemarks.trim()} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#F1D9A8] bg-[#FFF7E7] px-3 py-2 text-xs font-bold text-[#805900] transition hover:bg-[#FFF0D1] disabled:opacity-50"><CircleAlert size={14} /> Return to resident for correction</button>
                          <button type="button" onClick={() => updateStatus("rejected")} disabled={submitting || !staffRemarks.trim() || !rejectionReason.trim()} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#F2D4D0] bg-[#FFF0EE] px-3 py-2 text-xs font-bold text-[#C74444] transition hover:bg-[#FFE5E2] disabled:opacity-50"><CircleAlert size={14} /> Reject request</button>
                        </>
                      )}
                    </div>
                    {["pending", "under_review", "processing"].includes(selectedRequest.status) && (
                      <>
                        <textarea value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} placeholder="Rejection reason (required only if the issue cannot be corrected)..." className="mt-2 min-h-16 w-full resize-y rounded-lg border border-[#F2D4D0] bg-white p-3 text-xs outline-none focus:border-[#C74444] focus:ring-2 focus:ring-[#C74444]/15" />
                        <p className="mt-2 text-[10px] leading-4 text-slate-500">Staff remarks are required for correction or rejection. Rejection also requires a rejection reason.</p>
                      </>
                    )}
                      </>
                    )}
                  </div>
                </aside>
              </div>
            </section>
          ) : (
            <section className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-400"><FileText size={20} /></span>
              <p className="mt-3 text-sm font-bold text-slate-700">Select a request to review</p>
              <p className="mt-1 text-xs text-slate-500">Choose a row from the queue to see the complete request details and workflow controls.</p>
            </section>
          )}
        </div>

      {previewRequest && <DocumentPreviewModal key={previewRequest.id} request={previewRequest} onClose={() => setPreviewRequest(null)} onSave={saveDocumentContent} />}
      {requirementPreview && (
        <RequirementPreviewModal
          preview={requirementPreview}
          onClose={() => setRequirementPreview(null)}
        />
      )}
    </StaffLayout>
  );
}

function SummaryCard({ label, value, icon: Icon, color, note, onClick }) {
  const colors = {
    amber: "bg-[#FFF7E7] text-[#805900] ring-[#F1D9A8]",
    blue: "bg-[#EEF4FF] text-[#2455D6] ring-[#D9E6FF]",
    emerald: "bg-[#ECF9F1] text-[#21864A] ring-[#CDEBD8]",
    green: "bg-[#ECF9F1] text-[#21864A] ring-[#CDEBD8]",
    red: "bg-[#FFF0EE] text-[#C74444] ring-[#F2D4D0]",
  };
  return (
    <button type="button" onClick={onClick} className="group rounded-2xl border border-[#E6ECF5] bg-white p-5 text-left shadow-[0_8px_28px_rgba(18,63,112,0.05)] transition hover:-translate-y-0.5 hover:border-[#2455D6]/30 hover:shadow-[0_10px_30px_rgba(18,63,112,0.09)] focus:outline-none focus:ring-2 focus:ring-[#2455D6]/30">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{label}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-[#172B4D]">{value}</p>
          <p className="mt-1 text-[11px] text-[#55708F]">{note} · View queue</p>
        </div>
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-inset ${colors[color]}`}><Icon size={18} /></span>
      </div>
    </button>
  );
}

function CompactRequestTable({ requests, onView, emptyMessage }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[740px] text-left text-xs">
        <thead className="bg-[#F6F8FC] text-[10px] font-bold uppercase tracking-wide text-[#55708F]">
          <tr>
            <th className="px-4 py-3">Request ID</th>
            <th className="px-4 py-3">Resident</th>
            <th className="px-4 py-3">Document type</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {requests.map((request) => (
            <tr key={request.id} className="hover:bg-[#2455D6]/[0.03]">
              <td className="px-4 py-3 font-bold text-slate-700">#{request.id}</td>
              <td className="px-4 py-3 font-medium text-slate-700">{request.resident?.name || "Resident"}</td>
              <td className="px-4 py-3 text-slate-600">{request.document_type_label || request.document_type}</td>
              <td className="px-4 py-3">
                <span className={`rounded-full px-2 py-1 font-bold ${STATUS_META[request.status]?.className || "bg-slate-100 text-slate-600"}`}>
                  {STATUS_META[request.status]?.label || request.status}
                </span>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                {formatDate(request.status_changed_at || request.updated_at || request.created_at)}
              </td>
              <td className="px-4 py-3">
                <button type="button" onClick={() => onView(request)} className="rounded-lg border border-[#D9E6FF] bg-white px-3 py-1.5 font-bold text-[#2455D6] transition hover:border-[#2455D6] hover:bg-[#EEF4FF] focus:outline-none focus:ring-2 focus:ring-[#2455D6]/20">
                  View
                </button>
              </td>
            </tr>
          ))}
          {!requests.length && <tr><td colSpan="6" className="px-4 py-8 text-center text-slate-500">{emptyMessage}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function Notice({ type, message, onClose }) {
  const styles = type === "success" ? "border-[#CDEBD8] bg-[#ECF9F1] text-[#21864A]" : "border-[#F2D4D0] bg-[#FFF0EE] text-[#C74444]";
  return (
    <div className={`mb-5 flex items-start justify-between gap-4 rounded-xl border px-4 py-3 text-sm font-semibold ${styles}`}>
      <span>{message}</span>
      <button type="button" onClick={onClose} className="text-current opacity-70 hover:opacity-100" aria-label="Dismiss notification"><X size={15} /></button>
    </div>
  );
}

function RequirementPreviewModal({ preview, onClose }) {
  const isImage = preview.type.startsWith("image/");

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-[#071B3D]/70 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`Uploaded requirement: ${preview.name}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EEF4FF] text-[#2455D6]">
              <FileText size={17} />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#55708F]">Uploaded requirement</p>
              <h2 className="truncate text-sm font-bold text-[#172B4D]">{preview.name}</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
            aria-label="Close requirement viewer"
          >
            <X size={17} />
          </button>
        </header>
        <div className="min-h-[55vh] flex-1 overflow-auto bg-slate-100 p-3 sm:p-5">
          {isImage ? (
            <img
              src={preview.url}
              alt={preview.name}
              className="mx-auto max-h-[75vh] max-w-full rounded-lg object-contain shadow-sm"
            />
          ) : preview.type === "application/pdf" || preview.name.toLowerCase().endsWith(".pdf") ? (
            <iframe
              src={preview.url}
              title={preview.name}
              className="h-[75vh] w-full rounded-lg border border-slate-200 bg-white"
            />
          ) : (
            <div className="flex min-h-[55vh] items-center justify-center rounded-xl border border-slate-200 bg-white p-6 text-center">
              <div>
                <FileText size={30} className="mx-auto text-[#2455D6]" />
                <p className="mt-3 text-sm font-bold text-[#172B4D]">Preview unavailable</p>
                <p className="mt-1 max-w-md text-xs leading-5 text-slate-500">
                  This file format cannot be displayed in the browser. Ask the resident to upload an image or PDF.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export function StaffDocumentTypePage() {
  const { documentType } = useParams();
  const decodedDocumentType = decodeDocumentType(documentType);
  if (decodedDocumentType === null) return <Navigate to="/staff/dashboard" replace />;
  return <StaffDashboardProfessional documentType={decodedDocumentType} />;
}

function decodeDocumentType(documentType) {
  try {
    return decodeURIComponent(documentType || "");
  } catch {
    return null;
  }
}

function RequestDetails({ request, token, onFeeUpdated }) {
  const details = request.details || {};
  const formFields = details.form_fields || {};
  const contactNumber = request.resident?.contact_number || request.resident?.phone;
  return (
    <div>
      <section aria-labelledby="request-summary-heading">
        <div className="mb-3">
          <h3 id="request-summary-heading" className="text-sm font-bold text-[#172B4D]">Request summary</h3>
          <p className="mt-1 text-xs text-slate-500">Who submitted this request and what they are requesting.</p>
        </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <DetailCard label="Resident" value={request.resident?.name || "Unknown resident"} />
        <DetailCard label="Email" value={request.resident?.email || "Not provided"} />
        <DetailCard label="Contact number" value={contactNumber || "Not provided"} />
        <DetailCard label="Request date" value={formatDate(request.created_at)} />
        <DetailCard label="Purpose" value={details.form_fields?.purpose || details.purpose || details.notes || "Not provided"} />
        {details.fee_mode === "assessed" ? (
          <FeeAssessment request={request} token={token} role="staff" onUpdated={onFeeUpdated} />
        ) : (
          <DetailCard
            label={request.document_type === "Barangay Residency" ? "Fee (payable upon release)" : "Fee"}
            value={`₱${Number(request.fee || 0).toFixed(2)}`}
          />
        )}
      </div>
      </section>
      <section aria-labelledby="applicant-information-heading" className="mt-6 border-t border-slate-100 pt-5">
        <div className="mb-3">
          <h3 id="applicant-information-heading" className="text-sm font-bold text-[#172B4D]">Applicant-provided information</h3>
          <p className="mt-1 text-xs text-slate-500">Additional details entered by the resident for this document request.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {Object.entries(formFields)
            .filter(([key]) => !["purpose", "full_name"].includes(key))
            .map(([key, value]) => <DetailCard key={key} label={formatFieldLabel(key)} value={formatFieldValue(value)} />)}
          {!Object.keys(formFields).some((key) => !["purpose", "full_name"].includes(key)) && (
            <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-xs text-slate-500 sm:col-span-2">
              No additional applicant information was submitted.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function formatFieldLabel(value) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatFieldValue(value) {
  if (value === null || value === undefined || value === "") return "Not provided";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function DetailCard({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-1.5 break-words text-xs font-semibold leading-5 text-slate-700">{value || "—"}</p>
    </div>
  );
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function authHeaders(token) {
  return { Accept: "application/json", Authorization: `Bearer ${token}` };
}

export default StaffDashboardProfessional;
