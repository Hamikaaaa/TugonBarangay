import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Archive,
  BadgeCheck,
  BriefcaseBusiness,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  Eye,
  FileCheck2,
  FileText,
  Filter,
  Search,
  Settings2,
  X,
  XCircle,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import DocumentPreviewModal from "./DocumentPreviewModal";
import FeeAssessment from "../../components/document/FeeAssessment";
import AdminPageHeader from "../../components/admin/AdminPageHeader";
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
  { label: "Cedula (Community Tax Certificate)", value: "Cedula" },
  { label: "Fencing Permit", value: "Fencing Permit" },
  { label: "Construction Permit", value: "Construction Permit" },
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
  Cedula: "Cedula (Community Tax Certificate)",
});

const DOCUMENT_TYPE_ICONS = {
  "Barangay Certification": FileCheck2,
  "Barangay Residency": BadgeCheck,
  "Business Permit": BriefcaseBusiness,
  "Certificate of Good Moral Character": BadgeCheck,
  "First-Time Jobseeker Certification": BriefcaseBusiness,
  Cedula: FileText,
  "Fencing Permit": FileText,
  "Construction Permit": FileText,
  "Barangay Certificate": FileCheck2,
  "Barangay Indigency": FileCheck2,
};

const STATUS_META = {
  pending: { label: "Pending", className: "bg-[#FFF7E7] text-[#805900] ring-[#F1D9A8]", icon: Clock3 },
  under_review: { label: "Under Review", className: "bg-[#EEF4FF] text-[#2455D6] ring-[#D9E6FF]", icon: Search },
  processing: { label: "Processing", className: "bg-[#EAF1FF] text-[#123F70] ring-[#D9E6FF]", icon: Settings2 },
  for_correction: { label: "For Correction", className: "bg-[#FFF0EE] text-[#C74444] ring-[#F2D4D0]", icon: CircleAlert },
  ready_for_release: { label: "Ready for Release", className: "bg-[#ECF9F1] text-[#21864A] ring-[#CDEBD8]", icon: FileCheck2 },
  completed: { label: "Completed", className: "bg-[#ECF9F1] text-[#21864A] ring-[#CDEBD8]", icon: CheckCircle2 },
  rejected: { label: "Rejected", className: "bg-[#FFF0EE] text-[#C74444] ring-[#F2D4D0]", icon: CircleAlert },
};

function hasApprovedPermitInspection(request) {
  const report = request?.details?.inspection_report;
  return report?.decision === "go_ahead" && Boolean(report.file_path);
}

function requiresPermitInspection(request) {
  return ["Construction Permit", "Fencing Permit"].includes(request?.document_type);
}

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
  const { token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
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

  const loadRequests = useCallback(async (page = requestPage, silent = false) => {
    if (!token) return;
    if (!silent) { setLoading(true); setError(""); }

    try {
      const query = new URLSearchParams({
        status: statusFilter,
        per_page: "100",
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
      const nextRequests = payload.data || [];
      setRequests((current) => JSON.stringify(current) === JSON.stringify(nextRequests) ? current : nextRequests);
      setRequestPage(payload.current_page || page);
      setRequestLastPage(payload.last_page || 1);
      setRequestTotal(payload.total || 0);
    } catch (requestError) {
      if (!silent) {
        setRequests([]);
        setRequestTotal(0);
        setError(requestError.message);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [activeDocumentType, dateFrom, dateTo, debouncedSearch, requestPage, statusFilter, token]);

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

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible" || submitting || previewRequest) return;
      loadDashboardSummary();
      loadRequests(requestPage, true);
    }, 10000);
    return () => window.clearInterval(timer);
  }, [loadDashboardSummary, loadRequests, previewRequest, requestPage, submitting]);

  const counts = useMemo(() => {
    const scopedCounts = activeDocumentType
      ? dashboardSummary?.summary_by_type?.find(
          (type) => type.value === activeDocumentType,
        )
      : dashboardSummary?.counts;

    return {
      pending: scopedCounts?.pending ?? 0,
      under_review: scopedCounts?.under_review ?? 0,
      processing: scopedCounts?.processing ?? 0,
      for_correction: scopedCounts?.for_correction ?? 0,
      ready_for_release: scopedCounts?.ready_for_release ?? 0,
      completed: scopedCounts?.completed ?? 0,
      rejected: scopedCounts?.rejected ?? 0,
    };
  }, [activeDocumentType, dashboardSummary]);

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
    const targetDocumentType = request.document_type || request.document_type_label;
    const matchesActiveType = documentType && targetDocumentType === documentType;

    if (!matchesActiveType) {
      navigate(`/staff/document-types/${encodeURIComponent(targetDocumentType)}`, {
        state: { selectedRequestId: request.id },
      });
      return;
    }

    selectRequest(request);
    window.requestAnimationFrame(() => {
      document.getElementById("staff-request-details")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  useEffect(() => {
    const selectedRequestId = location.state?.selectedRequestId;
    if (!selectedRequestId || !Array.isArray(requests)) return;

    const nextSelectedRequest = requests.find((request) => request.id === Number(selectedRequestId));
    if (nextSelectedRequest) {
      selectRequest(nextSelectedRequest);
      window.requestAnimationFrame(() => {
        document.getElementById("staff-request-details")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, [location.state?.selectedRequestId, requests]);

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
    if (requiresPermitInspection(request) && !hasApprovedPermitInspection(request)) {
      setError(`Upload the completed inspection report and confirm the councilor's go-ahead before generating the ${request.document_type}.`);
      return;
    }
    if (request.status !== "processing") {
      setSelectedRequest(request);
      setStaffRemarks(request.staff_remarks || "");
      setRejectionReason(request.rejection_reason || "");
      setPreviewRequest(request);
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
      icon: DOCUMENT_TYPE_ICONS[item.value] || FileText,
      path: `/staff/document-types/${encodeURIComponent(item.value)}`,
    })),
  ];

  if (documentType && !documentTypesLoading && !activeType) {
    return <Navigate to="/staff/dashboard" replace />;
  }

  return (
    <StaffLayout
      title={documentType ? `${activeDocumentLabel} Requests` : "Document Requests"}
      navigationItems={navigationItems}
      notificationCounts={Object.fromEntries(
        navigationItems.map((item) => [
          item.path,
          item.value
            ? (dashboardSummary?.summary_by_type?.find((type) => type.value === item.value)?.pending || 0)
            : 0,
        ]),
      )}
      activePath={documentType ? `/staff/document-types/${encodeURIComponent(documentType)}` : "/staff/dashboard"}
      onNavigate={(path) => {
        const item = navigationItems.find((navigationItem) => navigationItem.path === path);
        if (item) {
          selectDocumentType(item.value);
          return;
        }
        navigate(path);
      }}
    >
        <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-7 lg:px-9 lg:py-8">
          <div className="mb-7">
            <AdminPageHeader
              eyebrow="Document request management"
              title={documentType ? `${activeDocumentLabel} requests` : "Document request dashboard"}
              description={
                documentType
                  ? `Review resident applications and process ${activeDocumentLabel} requests.`
                  : "Review, process, and prepare resident documents from one central workspace."
              }
            />
          </div>

          <section className="mb-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label={`${activeDocumentLabel || "All document"} request workload`}>
            <SummaryCard label="Pending Requests" value={counts.pending} icon={Clock3} color="amber" note="Awaiting initial review" onClick={() => quickFilter("pending")} />
            <SummaryCard label="Under Review" value={counts.under_review} icon={Search} color="blue" note="Requirements being checked" onClick={() => quickFilter("under_review")} />
            <SummaryCard label="Processing" value={counts.processing} icon={Settings2} color="blue" note="Document being prepared" onClick={() => quickFilter("processing")} />
            <SummaryCard label="For Correction" value={counts.for_correction} icon={CircleAlert} color="red" note="Waiting for resident update" onClick={() => quickFilter("for_correction")} />
            <SummaryCard label="Ready for Release" value={counts.ready_for_release} icon={FileCheck2} color="emerald" note="Awaiting resident pickup" onClick={() => quickFilter("ready_for_release")} />
          </section>

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
                              <button type="button" onClick={() => viewRequest(request)} className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-[#D9E6FF] bg-white px-3 py-2 text-xs font-bold text-[#2455D6] transition hover:border-[#2455D6] hover:bg-[#EEF4FF] focus:outline-none focus:ring-2 focus:ring-[#2455D6]/20" aria-label={`View details for request ${request.id}`}>
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
                  <button type="button" disabled={requestPage <= 1} onClick={() => loadRequests(requestPage - 1)} aria-label="Previous request page" className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#D9E6FF] bg-white text-[#2455D6] transition hover:bg-[#EEF4FF] focus:outline-none focus:ring-2 focus:ring-[#2455D6]/20 disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft size={16} /></button>
                  <button type="button" disabled={requestPage >= requestLastPage} onClick={() => loadRequests(requestPage + 1)} aria-label="Next request page" className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#D9E6FF] bg-white text-[#2455D6] transition hover:bg-[#EEF4FF] focus:outline-none focus:ring-2 focus:ring-[#2455D6]/20 disabled:cursor-not-allowed disabled:opacity-40"><ChevronRight size={16} /></button>
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
                  <button type="button" onClick={() => openPreview(selectedRequest)} disabled={submitting || (requiresPermitInspection(selectedRequest) && !hasApprovedPermitInspection(selectedRequest))} className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#2455D6] px-3 text-xs font-bold text-white shadow-sm transition hover:bg-[#1D46B5] focus:outline-none focus:ring-2 focus:ring-[#2455D6]/30 disabled:cursor-not-allowed disabled:opacity-40"><Eye size={14} /> {requiresPermitInspection(selectedRequest) && !hasApprovedPermitInspection(selectedRequest) ? "Inspection report and go-ahead required" : selectedRequest.document_content ? "Preview document" : selectedRequest.status === "processing" ? "Generate and preview" : "Preview template"}</button>
                </div>
              </div>

              <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_340px]">
                <div className="border-b border-slate-200 p-5 sm:p-6 xl:border-b-0 xl:border-r">
                  <RequestDetails request={selectedRequest} token={token} onFeeUpdated={handleFeeUpdated} />
                  {requiresPermitInspection(selectedRequest) && (
                    <PermitInspectionPanel
                      key={selectedRequest.id}
                      request={selectedRequest}
                      token={token}
                      onSaved={(updatedRequest) => {
                        setSelectedRequest(updatedRequest);
                        setRequests((current) => current.map((request) => request.id === updatedRequest.id ? { ...request, ...updatedRequest } : request));
                      }}
                    />
                  )}
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
                      {selectedRequest.status === "processing" && requiresPermitInspection(selectedRequest)
                        ? hasApprovedPermitInspection(selectedRequest)
                          ? `The councilor has given the inspection go-ahead. You can now prepare the ${selectedRequest.document_type}.`
                          : `Complete and save the inspection report. The ${selectedRequest.document_type} stays locked until the councilor gives the go-ahead.`
                        : WORKFLOW_GUIDANCE[selectedRequest.status] || "Review the request and follow the available action below."}
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
                        {selectedRequest.status === "under_review" && (selectedRequest.document_type === "Barangay Certification" && selectedRequest.identity_review?.has_blocking_case
                          ? "An unresolved complaint or open or referred case blocks approval of this Barangay Clearance."
                          : selectedRequest.document_type === "Barangay Certification" && selectedRequest.identity_review?.has_involved_person_match
                            ? "A close name match was found in complaint records. Start processing to review the record-check outcome before printing or release."
                          : "Select Approve and process after verifying the resident's details.")}
                        {selectedRequest.status === "processing" && (selectedRequest.document_type === "Barangay Certification" && selectedRequest.identity_review?.has_blocking_case
                          ? "An unresolved complaint or open or referred case blocks clearance printing and release."
                          : selectedRequest.document_type === "Barangay Certification" && selectedRequest.identity_review?.has_involved_person_match && !selectedRequest.document_content?.derogatory_reviewed
                            ? "A close name match was found in complaint records. Select an outcome in the document preview and save it to complete the required review."
                          : selectedRequest.document_type === "Barangay Certification" && selectedRequest.document_content?.derogatory_status !== "no_derogatory_record"
                            ? "Confirm NO DEROGATORY RECORDS in the document preview before marking this clearance ready."
                            : "Generate and review the document before marking it ready for release.")}
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
                        <button type="button" onClick={() => updateStatus("processing")} disabled={submitting || (selectedRequest.document_type === "Barangay Certification" && selectedRequest.identity_review?.has_blocking_case)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#2455D6] px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#1D46B5] focus:outline-none focus:ring-2 focus:ring-[#2455D6]/30 disabled:opacity-50"><Settings2 size={14} /> {submitting ? "Updating request..." : "Approve requirements and start processing"}</button>
                      )}
                      {selectedRequest.status === "processing" && (
                        <>
                          <button type="button" onClick={() => openPreview(selectedRequest)} disabled={submitting || (requiresPermitInspection(selectedRequest) && !hasApprovedPermitInspection(selectedRequest))} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#2455D6] px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#1D46B5] focus:outline-none focus:ring-2 focus:ring-[#2455D6]/30 disabled:opacity-50"><Eye size={14} /> {requiresPermitInspection(selectedRequest) && !hasApprovedPermitInspection(selectedRequest) ? "Inspection report and go-ahead required" : "Generate and review document"}</button>
                          <button type="button" onClick={() => updateStatus("ready_for_release")} disabled={submitting || !selectedRequest.document_content || (selectedRequest.document_type === "Barangay Certification" && (selectedRequest.identity_review?.has_blocking_case || selectedRequest.document_content?.derogatory_status !== "no_derogatory_record" || (selectedRequest.identity_review?.has_involved_person_match && !selectedRequest.document_content?.derogatory_reviewed)))} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#CDEBD8] bg-[#ECF9F1] px-3 py-2 text-xs font-bold text-[#21864A] transition hover:bg-[#DDF3E5] disabled:opacity-50"><FileCheck2 size={14} /> Mark ready for release</button>
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
                          <button type="button" onClick={() => updateStatus("rejected")} disabled={submitting || !staffRemarks.trim() || !rejectionReason.trim()} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#F2D4D0] bg-[#FFF0EE] px-3 py-2 text-xs font-bold text-[#C74444] transition hover:bg-[#FFE5E2] focus:outline-none focus:ring-2 focus:ring-[#C74444]/20 disabled:cursor-not-allowed disabled:opacity-50"><XCircle size={14} /> Reject request</button>
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

function PermitInspectionPanel({ request, token, onSaved }) {
  const existing = request.details?.inspection_report || {};
  const [inspectionFile, setInspectionFile] = useState(null);
  const [councilorGoAhead, setCouncilorGoAhead] = useState(existing.decision === "go_ahead");
  const [assessedFee, setAssessedFee] = useState(String(existing.assessed_fee ?? (request.details?.fee_assessed ? request.fee : "")));
  const [staffNote, setStaffNote] = useState(existing.staff_note || "");
  const [saving, setSaving] = useState(false);
  const [viewing, setViewing] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [error, setError] = useState("");
  const editable = request.status === "processing";
  const saved = Boolean(existing.file_path);

  useEffect(() => {
    setAssessedFee(String(existing.assessed_fee ?? (request.details?.fee_assessed ? request.fee : "")));
  }, [existing.assessed_fee, request.details?.fee_assessed, request.fee]);

  const saveReport = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const body = new FormData();
      body.append("_method", "PATCH");
      body.append("councilor_go_ahead", councilorGoAhead ? "1" : "0");
      body.append("staff_note", staffNote.trim());
      body.append("assessed_fee", assessedFee);
      if (inspectionFile) body.append("inspection_report", inspectionFile);
      const response = await fetch(`${API_URL}/staff/document-requests/${request.id}/permit-inspection`, {
        method: "POST",
        headers: authHeaders(token),
        body,
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Unable to save the inspection report.");
      setInspectionFile(null);
      setAssessedFee(String(payload.data.fee ?? assessedFee));
      onSaved(payload.data);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  const openUploadedReport = async () => {
    setViewing(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/staff/document-requests/${request.id}/permit-inspection`, {
        headers: authHeaders(token),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message || "Unable to open the uploaded inspection report.");
      }
      const url = URL.createObjectURL(await response.blob());
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (viewError) {
      setError(viewError.message);
    } finally {
      setViewing(false);
    }
  };

  return (
    <section className="mt-6 rounded-xl border border-[#D9E6FF] bg-white p-4" aria-labelledby="permit-inspection-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="permit-inspection-title" className="text-sm font-bold text-[#172B4D]">{request.document_type === "Fencing Permit" ? "Fencing inspection report" : "Construction inspection report"}</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">Print the blank report for the councilor. After the inspection, upload the completed scan and confirm whether the Go ahead box was ticked.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => printPermitInspection(request)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-[#2455D6] hover:bg-blue-50">Print blank inspection report</button>
          {saved && <button type="button" onClick={openUploadedReport} disabled={viewing} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-[#2455D6] hover:bg-blue-50 disabled:opacity-50">{viewing ? "Opening report…" : "View uploaded report"}</button>}
        </div>
      </div>
      {editable ? (
        <form onSubmit={saveReport} className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <label className="block text-xs font-semibold text-slate-800">Completed inspection report
              <span className="mt-1 block text-[11px] font-normal leading-5 text-slate-500">Choose a scan or take a photo. PDF, JPG, or PNG up to 5 MB.</span>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={(event) => {
                const file = event.target.files?.[0] || null;
                if (file && file.size > 5 * 1024 * 1024) {
                  setError("The inspection report must be 5 MB or smaller.");
                  setInspectionFile(null);
                  event.target.value = "";
                  return;
                }
                setError("");
                setInspectionFile(file);
              }} className="mt-3 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs file:mr-3 file:rounded-md file:border-0 file:bg-blue-100 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-[#2455D6]" />
            </label>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => { setError(""); setCameraOpen(true); }} className="inline-flex items-center gap-2 rounded-lg border border-[#2455D6]/25 bg-white px-3 py-2 text-xs font-bold text-[#2455D6] hover:bg-blue-50"><Camera size={14} /> Scan with camera</button>
              <span className="min-w-0 break-all text-[11px] text-slate-600">{inspectionFile?.name || (existing.original_name ? `Saved report: ${existing.original_name}. Select a replacement if needed.` : "No report selected yet.")}</span>
            </div>
            <label className="mt-4 block text-xs font-semibold text-slate-800">Fee assessed by inspector (PHP)
              <input type="number" min="0" max="1000000000" step="0.01" required value={assessedFee} onChange={(event) => setAssessedFee(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold outline-none focus:border-[#2455D6] focus:ring-2 focus:ring-blue-100" placeholder="Enter the amount written on the report" />
            </label>
            {cameraOpen && <InspectionCamera filePrefix={request.document_type === "Fencing Permit" ? "fencing" : "construction"} onCapture={(file) => { setInspectionFile(file); setError(""); }} onClose={() => setCameraOpen(false)} />}
          </div>
          <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 text-sm leading-6 transition-colors ${councilorGoAhead ? "border-emerald-200 bg-emerald-50/70 text-emerald-950" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
            <input type="checkbox" checked={councilorGoAhead} onChange={(event) => setCouncilorGoAhead(event.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-[#2455D6]" />
            <span className="min-w-0">
              <span className="flex flex-wrap items-center gap-2 font-semibold text-slate-900">Councilor decision <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${councilorGoAhead ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>{councilorGoAhead ? "Go ahead confirmed" : "Awaiting confirmation"}</span></span>
              <span className="mt-2 block text-xs leading-5 text-slate-600">Confirm after reviewing the completed inspection report. A checked Go ahead authorizes staff to prepare this permit.</span>
            </span>
          </label>
          <label className="block text-xs font-semibold text-slate-700 lg:col-span-2">Staff note <span className="font-normal text-slate-500">(optional)</span>
            <textarea rows={3} maxLength={2000} value={staffNote} onChange={(event) => setStaffNote(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none transition focus:border-[#2455D6] focus:ring-2 focus:ring-blue-100" placeholder="Internal note about the uploaded inspection report" />
          </label>
          {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 lg:col-span-2">{error}</p>}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 lg:col-span-2">
            <p className="max-w-xl text-xs leading-5 text-slate-500">The report, inspector-assessed fee, staff account, decision, and save time are recorded in the request history.</p>
            <button type="submit" disabled={saving || (!inspectionFile && !existing.file_path)} className="rounded-lg bg-[#2455D6] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#1D46B5] disabled:cursor-not-allowed disabled:opacity-50">{saving ? "Saving inspection report..." : saved ? "Save report, fee, and decision" : "Upload report and save fee and decision"}</button>
          </div>        </form>
      ) : (
        <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-700">
          {saved ? <p><span className="font-semibold">Inspection report:</span> {existing.original_name} · <span className="font-semibold">Inspector-assessed fee:</span> PHP {Number(existing.assessed_fee ?? request.fee ?? 0).toFixed(2)} · <span className="font-semibold">Decision:</span> {existing.decision === "go_ahead" ? "Councilor marked Go ahead" : "Go ahead not recorded"}</p> : <p>The request must be in Processing before staff can upload the completed inspection report.</p>}
        </div>
      )}
    </section>
  );
}

function InspectionCamera({ onCapture, onClose, filePrefix = "permit" }) {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [cameraError, setCameraError] = useState("");
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let activeStream = null;
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera access is unavailable here. Use HTTPS or localhost, or choose a file instead.");
      return undefined;
    }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false })
      .then((cameraStream) => {
        if (cancelled) {
          cameraStream.getTracks().forEach((track) => track.stop());
          return;
        }
        activeStream = cameraStream;
        setStream(cameraStream);
      })
      .catch((error) => {
        setCameraError(error.name === "NotAllowedError"
          ? "Camera permission was denied. Allow access in your browser settings or choose a file."
          : "Unable to open the camera. Check the camera connection or choose a file instead.");
      });
    return () => {
      cancelled = true;
      activeStream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (videoRef.current && stream) videoRef.current.srcObject = stream;
  }, [stream]);

  const capture = () => {
    const video = videoRef.current;
    if (!video?.videoWidth || !video.videoHeight) {
      setCameraError("The camera is not ready yet. Please wait and try again.");
      return;
    }
    setCapturing(true);
    const scale = Math.min(1, 1800 / Math.max(video.videoWidth, video.videoHeight));
    const canvas = window.document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const context = canvas.getContext("2d");
    if (!context) {
      setCapturing(false);
      setCameraError("Unable to capture the camera image. Please choose a file instead.");
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      setCapturing(false);
      if (!blob) {
        setCameraError("Unable to capture the camera image. Please try again.");
        return;
      }
      if (blob.size > 5 * 1024 * 1024) {
        setCameraError("This scan is larger than 5 MB. Move closer to the report and try again.");
        return;
      }
      onCapture(new File([blob], `${filePrefix}-inspection-${Date.now()}.jpg`, { type: "image/jpeg" }));
      onClose();
    }, "image/jpeg", 0.82);
  };

  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <video ref={videoRef} autoPlay muted playsInline aria-label="Inspection report camera preview" className="max-h-[480px] w-full rounded-lg bg-slate-900 object-contain" />
      {cameraError && <p role="alert" className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{cameraError}</p>}
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600">Close camera</button>
        <button type="button" onClick={capture} disabled={!stream || capturing} className="inline-flex items-center gap-2 rounded-lg bg-[#2455D6] px-3 py-2 text-xs font-bold text-white disabled:opacity-50"><Camera size={14} /> {capturing ? "Capturing…" : "Capture scan"}</button>
      </div>
      <p className="mt-2 text-[11px] text-slate-500">Frame the whole report in good light. The captured image is attached as a JPG.</p>
    </div>
  );
}

function printPermitInspection(request) {
  const escapeHtml = (value) => String(value || "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;",
  })[character]);
  const formFields = request.details?.form_fields || {};
  const permitName = request.document_type === "Fencing Permit" ? "Fencing Permit" : "Construction Permit";
  const fenceDetails = request.document_type === "Fencing Permit"
    ? `<p><strong>Fence material:</strong> ${escapeHtml(formFields.fence_material)}</p><p><strong>Fence height:</strong> ${escapeHtml(formFields.fence_height)} m</p><p><strong>Fence length:</strong> ${escapeHtml(formFields.fence_length)} m</p>`
    : "";
  const printWindow = window.open("", "_blank", "width=850,height=1000");
  if (!printWindow) return;
  printWindow.document.write(`<!doctype html><html><head><title>${permitName} Inspection Report - Request ${request.id}</title><style>
    @page{size:letter portrait;margin:1in}body{font-family:Arial,sans-serif;color:#111;font-size:12pt}h1{text-align:center;font-size:16pt;margin:0 0 24pt;text-transform:uppercase}p{margin:0 0 16pt}.line{display:inline-block;min-width:250pt;border-bottom:1px solid #111;padding:0 4pt 3pt}.remarks{height:120pt;border-bottom:1px solid #111;white-space:pre-wrap;margin-top:12pt;padding:0 4pt 4pt;line-height:2.4}.decision{margin-top:24pt;padding:12pt;border:1px solid #555}.choice{display:inline-block;margin:12pt 20pt 0 0}.choice i{display:inline-block;width:12pt;height:12pt;border:1px solid #111;vertical-align:-2pt;margin-right:5pt}footer{margin-top:28pt;font-size:9pt;color:#555}@media print{button{display:none}}
  </style></head><body><h1>Inspection Report</h1><p><strong>${permitName} Request:</strong> #${escapeHtml(request.id)}</p><p><strong>Project Owner:</strong> ${escapeHtml(formFields.project_owner_name || formFields.full_name)}</p><p><strong>Project Location:</strong> ${escapeHtml(formFields.project_address)}</p>${fenceDetails}<p><strong>Inspection Conducted By:</strong> <span class="line">&nbsp;</span></p><p><strong>Date of Inspection:</strong> <span class="line">&nbsp;</span></p><p><strong>Fee assessed by inspector (PHP):</strong> <span class="line">&nbsp;</span></p><p><strong>Remarks:</strong></p><div class="remarks"></div><div class="decision"><strong>Councilor decision:</strong><br><span class="choice"><i></i> Go ahead - authorize permit preparation</span><span class="choice"><i></i> Needs correction</span></div><footer>${permitName} Request #${escapeHtml(request.id)}</footer><script>window.onload=()=>window.print()</script></body></html>`);
  printWindow.document.close();
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
  const isClearance = request.document_type === "Barangay Certification";
  const clearanceAddress = formFields.purok
    ? `${String(formFields.purok).trim()}, Barangay Tayud, Consolacion, Cebu`
    : formFields.address;
  const displayedFormFields = isClearance
    ? { ...formFields, address: clearanceAddress }
    : formFields;
  const configuredFields = [
    ...(request.type?.applicant_fields || []),
    ...(request.type?.fields || []),
  ];
  const formFieldGroups = Object.entries(displayedFormFields)
    .filter(([key]) => !["purpose", "full_name"].includes(key) && !(isClearance && key === "purok"))
    .reduce((groups, [key, value]) => {
      const config = configuredFields.find((field) => field.key === key);
      const group = config?.group || "";
      (groups[group] ||= []).push([key, value, config?.label]);
      return groups;
    }, {});
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
          ["Construction Permit", "Fencing Permit"].includes(request.document_type) ? (
            <div className="rounded-xl border border-[#D9E6FF] bg-[#EEF4FF]/70 p-3">
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">Inspector-assessed fee</p>
              <p className="mt-1.5 text-xs font-semibold text-slate-700">{details.fee_assessed ? `PHP ${Number(request.fee || 0).toFixed(2)} payable upon release` : "Recorded with the inspection report"}</p>
            </div>
          ) : (
            <FeeAssessment request={request} token={token} role="staff" onUpdated={onFeeUpdated} />
          )
        ) : (
          <DetailCard
            label={request.document_type === "Barangay Residency" ? "Fee (payable upon release)" : "Fee"}
            value={`₱${Number(request.fee || 0).toFixed(2)}`}
          />
        )}
      </div>
      </section>
      <IdentityComparison review={request.identity_review} />
      <section aria-labelledby="applicant-information-heading" className="mt-6 border-t border-slate-100 pt-5">
        <div className="mb-3">
          <h3 id="applicant-information-heading" className="text-sm font-bold text-[#172B4D]">Applicant-provided information</h3>
          <p className="mt-1 text-xs text-slate-500">Additional details entered by the resident for this document request.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {Object.entries(formFieldGroups).map(([group, entries]) => <Fragment key={group || "ungrouped"}>
            {group && <h4 className="sm:col-span-2 border-b border-slate-100 pb-2 text-xs font-bold uppercase tracking-wide text-[#55708F]">{group}</h4>}
            {entries.map(([key, value, label]) => <DetailCard key={key} label={label || formatFieldLabel(key)} value={formatFieldValue(value)} />)}
          </Fragment>)}
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

function IdentityComparison({ review }) {
  const isClear = review?.ok === true;
  const hasReview = Boolean(review);
  const applicantName = review?.fields?.find((field) => field.key === "full_name")?.submitted || "Clearance applicant";

  return (
    <section aria-labelledby="identity-comparison-heading" className={`mt-6 rounded-xl border p-4 ${isClear ? "border-emerald-200 bg-emerald-50/60" : "border-amber-200 bg-amber-50/70"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="identity-comparison-heading" className="text-sm font-bold text-[#172B4D]">Identity verification</h3>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            {review?.has_involved_person_match && !review?.involved_person_reviewed
              ? "A close name match was found in the involved-person names listed on complaint records. REQUIRED REVIEW before clearance printing or release."
              : review?.has_involved_person_match
                ? "A close name match was found in complaint records and the staff record check has been completed."
              : isClear
              ? "Resident profile and submitted identity information match the barangay registry."
              : review?.message || "Identity information does not match. Review the differences below before taking action."}
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${isClear ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
          {review?.has_involved_person_match && !review?.involved_person_reviewed ? "Required review" : review?.has_involved_person_match ? "Reviewed" : isClear ? "Match confirmed" : hasReview ? "Review required" : "Checking required"}
        </span>
      </div>
      {review?.involved_person_matches?.length > 0 && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-white p-3">
          <h4 className="text-xs font-bold text-amber-900">Similar names in complaint records</h4>
          <ul className="mt-2 space-y-2">
            {review.involved_person_matches.map((match) => (
              <li key={`${match.complaint_id}-${match.matched_name}`} className="rounded-md bg-amber-50/70 px-3 py-2 text-xs text-slate-700">
                <p><span className="font-semibold">Clearance applicant:</span> {applicantName} <span aria-hidden="true">→</span> <span className="font-semibold">Name listed:</span> {match.matched_name} <span className="font-bold text-amber-800">({match.match_type}{match.match_type === "Close match" ? `, ${match.similarity}% similar` : ""})</span></p>
                <p className="mt-1"><span className="font-semibold">Complaint #{match.complaint_id}:</span> {match.subject || "No subject"} · <span className="capitalize">{String(match.status || "unknown").replaceAll("_", " ")}</span>{match.incident_date ? ` · Incident date ${match.incident_date}` : ""}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
      {review?.fields?.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full min-w-[620px] text-left text-xs">
            <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2.5">Field</th>
                <th className="px-3 py-2.5">Resident profile</th>
                <th className="px-3 py-2.5">Barangay registry</th>
                <th className="px-3 py-2.5">Submitted request</th>
                <th className="px-3 py-2.5">Check</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {review.fields.map((field) => (
                <tr key={field.key} className={field.ok ? "" : "bg-red-50/70"}>
                  <th className="px-3 py-2.5 font-semibold text-slate-700">{field.key === "address" ? "House/Lot No." : field.label}</th>
                  <td className="px-3 py-2.5 text-slate-600">{formatFieldValue(field.profile)}</td>
                  <td className="px-3 py-2.5 text-slate-600">{formatFieldValue(field.registry)}</td>
                  <td className="px-3 py-2.5 text-slate-600">{formatSubmittedIdentityValue(field, review.fields)}</td>
                  <td className={`px-3 py-2.5 font-bold ${field.ok ? "text-emerald-700" : "text-red-700"}`}>{field.ok ? "Match" : "Mismatch"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function formatSubmittedIdentityValue(field, fields = []) {
  if (field.key !== "address") return formatFieldValue(field.submitted);

  const address = String(field.submitted || "").trim();
  if (!address) return "Not provided";

  const submittedPurok = String(fields.find((item) => item.key === "purok")?.submitted || "").trim();
  if (submittedPurok) {
    const parts = address.split(",").map((part) => part.trim());
    const purokIndex = parts.findIndex((part) => part.toLowerCase() === submittedPurok.toLowerCase());
    if (purokIndex >= 0) return parts.slice(0, purokIndex).join(", ") || "Not provided";
  }

  const beforePurok = address.match(/^(.+?)(?:,\s*|\s+)Purok\b/i)?.[1]?.trim();
  if (beforePurok) return beforePurok;
  if (/^Purok\b/i.test(address)) return "Not provided";

  if (/\bBarangay\s+Tayud\b.*\bConsolacion\b.*\bCebu\b/i.test(address)) {
    return "Not provided";
  }

  return formatFieldValue(address);
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

