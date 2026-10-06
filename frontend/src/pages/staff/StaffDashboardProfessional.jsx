import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import {
  Archive,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Clock3,
  Download,
  Eye,
  FileCheck2,
  FileText,
  Filter,
  LayoutDashboard,
  MoreHorizontal,
  Printer,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import DocumentPreviewModal from "./DocumentPreviewModal";
import StaffLayout from "./StaffLayout";

const API_URL = "http://127.0.0.1:8000/api";
const DOCUMENT_TYPES = [
  { label: "Dashboard", value: "" },
  { label: "Barangay Clearance", value: "Barangay Certification" },
  { label: "Certificate of Residency", value: "Barangay Residency" },
  { label: "Business Clearance", value: "Business Permit" },
  { label: "Certificate of Good Moral Character", value: "Certificate of Good Moral Character" },
  { label: "First-Time Jobseeker Certification", value: "First-Time Jobseeker Certification" },
];

const STATUS_META = {
  pending: { label: "Pending", className: "bg-amber-50 text-amber-700 ring-amber-200", icon: Clock3 },
  processing: { label: "Processing", className: "bg-blue-50 text-blue-700 ring-blue-200", icon: Settings2 },
  for_correction: { label: "For Correction", className: "bg-orange-50 text-orange-700 ring-orange-200", icon: CircleAlert },
  ready_for_release: { label: "Ready for Release", className: "bg-emerald-50 text-emerald-700 ring-emerald-200", icon: FileCheck2 },
  completed: { label: "Completed", className: "bg-emerald-50 text-emerald-700 ring-emerald-200", icon: CheckCircle2 },
  rejected: { label: "Rejected", className: "bg-red-50 text-red-700 ring-red-200", icon: CircleAlert },
};

const WORKFLOW = ["pending", "processing", "ready_for_release", "completed"];

function StaffDashboardProfessional({ documentType = "" }) {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [activeDocumentType, setActiveDocumentType] = useState(documentType);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDirection, setSortDirection] = useState("desc");
  const [previewRequest, setPreviewRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [staffRemarks, setStaffRemarks] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [downloadingRequirement, setDownloadingRequirement] = useState("");

  const loadRequests = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");

    try {
      const statuses = ["pending", "processing", "for_correction", "ready_for_release", "completed", "rejected"];
      const results = await Promise.all(statuses.map(async (status) => {
        const response = await fetch(`${API_URL}/staff/document-requests?status=${status}&per_page=100`, {
          headers: authHeaders(token),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || `Unable to load ${status} requests.`);
        return (payload.data || []).map((request) => ({ ...request, status }));
      }));
      setRequests(results.flat());
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    // The loader performs asynchronous API requests and updates the queue after they resolve.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRequests();
  }, [loadRequests]);

  const counts = useMemo(() => ({
    pending: requests.filter((request) => request.status === "pending").length,
    processing: requests.filter((request) => request.status === "processing").length,
    for_correction: requests.filter((request) => request.status === "for_correction").length,
    ready_for_release: requests.filter((request) => request.status === "ready_for_release").length,
    completed: requests.filter((request) => request.status === "completed").length,
    rejected: requests.filter((request) => request.status === "rejected").length,
  }), [requests]);

  const filteredRequests = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return requests
      .filter((request) => !activeDocumentType || request.document_type === activeDocumentType)
      .filter((request) => statusFilter === "all" || request.status === statusFilter)
      .filter((request) => !normalizedSearch || [
        request.id,
        request.resident?.name,
        request.document_type,
        request.status,
      ].some((value) => String(value || "").toLowerCase().includes(normalizedSearch)))
      .sort((first, second) => {
        const firstValue = first[sortBy] || "";
        const secondValue = second[sortBy] || "";
        const comparison = String(firstValue).localeCompare(String(secondValue), undefined, { numeric: true });
        return sortDirection === "asc" ? comparison : -comparison;
      });
  }, [activeDocumentType, requests, search, sortBy, sortDirection, statusFilter]);

  const selectDocumentType = (nextDocumentType) => {
    setActiveDocumentType(nextDocumentType);
    setSelectedRequest(null);
    navigate(nextDocumentType ? `/staff/document-types/${encodeURIComponent(nextDocumentType)}` : "/staff/dashboard");
  };

  const selectRequest = (request) => {
    setSelectedRequest(request);
    setStaffRemarks(request.staff_remarks || "");
    setRejectionReason(request.rejection_reason || "");
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

  const downloadRequirement = async (request, requirementKey, fileName) => {
    if (!token || downloadingRequirement) return;
    const downloadKey = `${request.id}-${requirementKey}`;
    setDownloadingRequirement(downloadKey);
    setError("");
    try {
      const response = await fetch(
        `${API_URL}/staff/document-requests/${request.id}/requirements/${encodeURIComponent(requirementKey)}`,
        { headers: authHeaders(token) },
      );
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.message || "Unable to download requirement.");
      }
      const objectUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = fileName || `request-${request.id}-${requirementKey}`;
      link.click();
      URL.revokeObjectURL(objectUrl);
    } catch (downloadError) {
      setError(downloadError.message);
    } finally {
      setDownloadingRequirement("");
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
      await loadRequests();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const currentIndex = selectedRequest ? WORKFLOW.indexOf(selectedRequest.status) : -1;

  const navigationItems = DOCUMENT_TYPES.map((item) => ({
    ...item,
    path: item.value ? `/staff/document-types/${encodeURIComponent(item.value)}` : "/staff/dashboard",
  }));

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
        <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-7 lg:px-9 lg:py-8">
          {!documentType && (
            <>
              <section className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#2455D6]">
                    <LayoutDashboard size={15} /> Dashboard overview
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight text-[#132A4A] sm:text-3xl">Welcome, {user?.name?.split(" ")[0] || "Officer"}</h2>
                  <p className="mt-2 text-sm text-slate-500">Review, process, and prepare resident documents from one central workspace.</p>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EAF1FF] text-[#2455D6]"><ShieldCheck size={18} /></span>
                  <div>
                    <p className="text-xs font-bold text-slate-800">System status</p>
                    <p className="text-[11px] text-emerald-600">All services operational</p>
                  </div>
                </div>
              </section>

              <section className="mb-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Overall request summary">
                <SummaryCard label="Total Requests" value={requests.length} icon={Archive} color="blue" note="All document types" />
                <SummaryCard label="Pending Requests" value={counts.pending} icon={Clock3} color="amber" note="Awaiting review" />
                <SummaryCard label="Processing" value={counts.processing} icon={Settings2} color="blue" note="Under review" />
                <SummaryCard label="For Correction" value={counts.for_correction} icon={CircleAlert} color="red" note="Awaiting resident updates" />
                <SummaryCard label="Ready for Release" value={counts.ready_for_release} icon={FileCheck2} color="emerald" note="Awaiting completion" />
                <SummaryCard label="Completed" value={counts.completed} icon={CheckCircle2} color="green" note="Released documents" />
                <SummaryCard label="Rejected" value={counts.rejected} icon={CircleAlert} color="red" note="Closed requests" />
              </section>
            </>
          )}

          {notice && <Notice type="success" message={notice} onClose={() => setNotice("")} />}
          {error && <Notice type="error" message={error} onClose={() => setError("")} />}

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-200 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <FileText size={17} className="text-[#2455D6]" />
                  <h2 className="text-base font-bold text-[#132A4A]">{documentType ? `${DOCUMENT_TYPES.find((item) => item.value === documentType)?.label || documentType} Requests` : "Central Request Queue"}</h2>
                </div>
                <p className="mt-1 text-xs text-slate-500">{documentType ? `Manage only ${DOCUMENT_TYPES.find((item) => item.value === documentType)?.label || documentType} requests.` : "Search, filter, sort, review, preview, and print requests."}</p>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                {filteredRequests.length} of {requests.length} requests
              </div>
            </div>

            <div className="grid gap-3 border-b border-slate-200 bg-slate-50/70 p-4 lg:grid-cols-[1fr_auto_auto_auto]">
              <label className="relative block">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search request ID, resident, or document..."
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#2455D6] focus:ring-2 focus:ring-blue-100"
                />
              </label>
              <label className="relative">
                <Filter size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-10 appearance-none rounded-xl border border-slate-200 bg-white pl-9 pr-9 text-xs font-semibold text-slate-600 outline-none focus:border-[#2455D6] focus:ring-2 focus:ring-blue-100">
                  <option value="all">All statuses</option>
                  {Object.entries(STATUS_META).map(([value, status]) => <option key={value} value={value}>{status.label}</option>)}
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </label>
              <label className="relative">
                <SlidersHorizontal size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="h-10 appearance-none rounded-xl border border-slate-200 bg-white pl-9 pr-9 text-xs font-semibold text-slate-600 outline-none focus:border-[#2455D6] focus:ring-2 focus:ring-blue-100">
                  <option value="created_at">Request date</option>
                  <option value="id">Request ID</option>
                  <option value="document_type">Document type</option>
                  <option value="resident.name">Resident name</option>
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </label>
              <button type="button" onClick={() => setSortDirection((current) => current === "asc" ? "desc" : "asc")} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50">
                {sortDirection === "asc" ? "Oldest first" : "Newest first"}
                <ChevronDown size={14} className={sortDirection === "asc" ? "rotate-180" : ""} />
              </button>
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
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                      <th className="px-5 py-3.5">Request ID</th>
                      <th className="px-5 py-3.5">Resident Name</th>
                      <th className="px-5 py-3.5">Document Type</th>
                      <th className="px-5 py-3.5">Date Requested</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5">Assigned Staff</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRequests.map((request) => {
                      const status = STATUS_META[request.status] || STATUS_META.pending;
                      const StatusIcon = status.icon;
                      const isSelected = selectedRequest?.id === request.id;
                      return (
                        <tr key={request.id} className={`group transition hover:bg-blue-50/30 ${isSelected ? "bg-blue-50/40" : ""}`}>
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
                          <td className="px-5 py-4 text-xs font-semibold text-slate-600">{request.document_type}</td>
                          <td className="px-5 py-4 text-xs text-slate-500">{formatDate(request.created_at)}</td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ring-inset ${status.className}`}>
                              <StatusIcon size={12} /> {status.label}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
                              <UserRound size={13} className="text-slate-400" /> Unassigned
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-end gap-1.5">
                              <button type="button" onClick={() => selectRequest(request)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-[10px] font-bold text-slate-600 transition hover:border-[#2455D6] hover:text-[#2455D6]" aria-label={`View details for request ${request.id}`}>
                                <Eye size={13} /> View
                              </button>
                              <button type="button" onClick={() => openPreview(request)} disabled={submitting || (request.status !== "processing" && !request.document_content)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#EAF1FF] text-[#2455D6] transition hover:bg-[#D9E6FF] disabled:cursor-not-allowed disabled:opacity-40" aria-label={`Preview request ${request.id}`}>
                                <FileText size={13} />
                              </button>
                              <button type="button" onClick={() => openPreview(request)} disabled={submitting || (request.status !== "processing" && !request.document_content)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40" aria-label={`Print request ${request.id}`}>
                                <Printer size={13} />
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
          </section>

          {selectedRequest ? (
            <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF1FF] text-[#2455D6]"><FileText size={18} /></span>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Request details</p>
                    <h2 className="text-lg font-bold text-[#132A4A]">#{selectedRequest.id} · {selectedRequest.document_type}</h2>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => openPreview(selectedRequest)} disabled={submitting || (selectedRequest.status !== "processing" && !selectedRequest.document_content)} className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#2455D6] px-3 text-xs font-bold text-white transition hover:bg-[#1948B8] disabled:cursor-not-allowed disabled:opacity-40"><Eye size={14} /> Preview document</button>
                  <button type="button" onClick={() => openPreview(selectedRequest)} disabled={submitting || (selectedRequest.status !== "processing" && !selectedRequest.document_content)} className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"><Printer size={14} /> Print</button>
                </div>
              </div>

              <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_340px]">
                <div className="border-b border-slate-200 p-5 sm:p-6 xl:border-b-0 xl:border-r">
                  <RequestDetails request={selectedRequest} />
                  <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
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
                              onClick={() => downloadRequirement(selectedRequest, key, requirement.original_name)}
                              disabled={downloadingRequirement === `${selectedRequest.id}-${key}`}
                              className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-bold text-[#2455D6] hover:underline disabled:opacity-50"
                            >
                              <Download size={12} />
                              {downloadingRequirement === `${selectedRequest.id}-${key}` ? "Downloading..." : "View uploaded requirement"}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <aside className="bg-slate-50/70 p-5 sm:p-6">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-800">Processing workflow</p>
                      <p className="mt-1 text-[11px] text-slate-500">Current status: {STATUS_META[selectedRequest.status]?.label || selectedRequest.status}</p>
                    </div>
                    <MoreHorizontal size={18} className="text-slate-400" />
                  </div>

                  <ol className="space-y-3">
                    {WORKFLOW.map((status, index) => {
                      const complete = currentIndex > index || selectedRequest.status === status;
                      const active = selectedRequest.status === status;
                      return (
                        <li key={status} className="flex items-start gap-3">
                          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${complete ? "border-emerald-500 bg-emerald-500 text-white" : active ? "border-[#2455D6] bg-[#EAF1FF] text-[#2455D6]" : "border-slate-200 bg-white text-slate-400"}`}>{complete ? <CheckCircle2 size={14} /> : index + 1}</span>
                          <div className="pt-0.5">
                            <p className={`text-xs font-bold ${active ? "text-[#2455D6]" : complete ? "text-emerald-700" : "text-slate-500"}`}>{STATUS_META[status].label}</p>
                            <p className="mt-0.5 text-[10px] text-slate-400">{active ? "Current stage" : complete ? "Completed" : "Pending"}</p>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                  {selectedRequest.status === "for_correction" && (
                    <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50 p-3 text-xs leading-5 text-orange-800">
                      Waiting for the resident to resubmit the requested requirements. The request returns to Pending for verification.
                    </div>
                  )}

                  <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
                    <label htmlFor="staff-remarks" className="text-xs font-bold text-slate-800">Staff remarks</label>
                    <textarea
                      id="staff-remarks"
                      value={staffRemarks}
                      onChange={(event) => setStaffRemarks(event.target.value)}
                      placeholder="Add internal review notes or correction instructions..."
                      className="mt-2 min-h-24 w-full resize-y rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-700 outline-none focus:border-[#2455D6] focus:ring-2 focus:ring-blue-100"
                    />
                    <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                      {selectedRequest.status === "pending" && (
                        <button type="button" onClick={() => updateStatus("processing")} disabled={submitting} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#2455D6] text-xs font-bold text-white transition hover:bg-[#1948B8] disabled:opacity-50"><Settings2 size={14} /> Requirements valid — approve and process</button>
                      )}
                      {selectedRequest.status === "processing" && (
                        <>
                          <button type="button" onClick={() => openPreview(selectedRequest)} disabled={submitting} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#2455D6] text-xs font-bold text-white transition hover:bg-[#1948B8] disabled:opacity-50"><Eye size={14} /> Generate / review document</button>
                          <button type="button" onClick={() => updateStatus("ready_for_release")} disabled={submitting || !selectedRequest.document_content} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"><FileCheck2 size={14} /> Document checked, signed and sealed — ready for release</button>
                        </>
                      )}
                      {selectedRequest.status === "ready_for_release" && (
                        <button type="button" onClick={() => updateStatus("completed")} disabled={submitting} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-emerald-600 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"><CheckCircle2 size={14} /> Resident claimed — complete request</button>
                      )}
                      {["pending", "processing"].includes(selectedRequest.status) && (
                        <>
                          <button type="button" onClick={() => updateStatus("for_correction")} disabled={submitting || !staffRemarks.trim()} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50 text-xs font-bold text-amber-800 transition hover:bg-amber-100 disabled:opacity-50"><CircleAlert size={14} /> Return for correction</button>
                          <button type="button" onClick={() => updateStatus("rejected")} disabled={submitting || !staffRemarks.trim() || !rejectionReason.trim()} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-50"><CircleAlert size={14} /> Reject — issue cannot be corrected</button>
                        </>
                      )}
                    </div>
                    {["pending", "processing"].includes(selectedRequest.status) && (
                      <textarea value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} placeholder="Rejection reason (required only if the issue cannot be corrected)..." className="mt-2 min-h-16 w-full resize-y rounded-lg border border-red-200 bg-white p-3 text-xs outline-none focus:ring-2 focus:ring-red-100" />
                    )}
                    {["pending", "processing"].includes(selectedRequest.status) && <p className="mt-2 text-[10px] leading-4 text-slate-500">Add staff remarks before returning a request for correction or rejecting it. Rejection also requires a reason.</p>}
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
        </main>

      {previewRequest && <DocumentPreviewModal key={previewRequest.id} request={previewRequest} onClose={() => setPreviewRequest(null)} onSave={saveDocumentContent} />}
    </StaffLayout>
  );
}

function SummaryCard({ label, value, icon: Icon, color, note }) {
  const colors = {
    amber: "bg-amber-50 text-amber-600 ring-amber-100",
    blue: "bg-blue-50 text-blue-600 ring-blue-100",
    emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100",
    green: "bg-green-50 text-green-600 ring-green-100",
    red: "bg-red-50 text-red-600 ring-red-100",
  };
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{label}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-[#132A4A]">{value}</p>
          <p className="mt-1 text-[11px] text-slate-400">{note}</p>
        </div>
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-inset ${colors[color]}`}><Icon size={18} /></span>
      </div>
    </article>
  );
}

function Notice({ type, message, onClose }) {
  const styles = type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700";
  return (
    <div className={`mb-5 flex items-start justify-between gap-4 rounded-xl border px-4 py-3 text-sm font-semibold ${styles}`}>
      <span>{message}</span>
      <button type="button" onClick={onClose} className="text-current opacity-70 hover:opacity-100" aria-label="Dismiss notification"><X size={15} /></button>
    </div>
  );
}
export function StaffDocumentTypePage() {
  const { documentType } = useParams();
  const decodedDocumentType = decodeURIComponent(documentType || "");
  const supportedDocumentType = DOCUMENT_TYPES.find((item) => item.value === decodedDocumentType)?.value || "";

  if (!supportedDocumentType) return <Navigate to="/staff/dashboard" replace />;
  return <StaffDashboardProfessional documentType={supportedDocumentType} />;
}

function RequestDetails({ request }) {
  const details = request.details || {};
  const formFields = details.form_fields || {};
  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        <DetailCard label="Resident" value={request.resident?.name || "Unknown resident"} />
        <DetailCard label="Contact" value={request.resident?.email || request.resident?.contact_number || "Not provided"} />
        <DetailCard label="Document" value={request.document_type} />
        <DetailCard label="Request date" value={formatDate(request.created_at)} />
        <DetailCard label="Purpose" value={details.purpose || details.notes || "Not provided"} />
        <DetailCard label="Fee" value={`₱${Number(request.fee || 0).toFixed(2)}`} />
      </div>
      <div className="mt-5 border-t border-slate-100 pt-5">
        <p className="text-xs font-bold text-slate-800">Resident information</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {Object.entries(formFields).map(([key, value]) => <DetailCard key={key} label={key.replaceAll("_", " ")} value={String(value)} />)}
        </div>
      </div>
      <div className="mt-5 border-t border-slate-100 pt-5">
        <p className="text-xs font-bold text-slate-800">Internal remarks</p>
        <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-500">{request.staff_remarks || request.rejection_reason || "No remarks recorded."}</p>
      </div>
    </div>
  );
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
