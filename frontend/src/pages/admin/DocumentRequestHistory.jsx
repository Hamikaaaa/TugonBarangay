import { useCallback, useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import { useAuth } from "../../context/AuthContext";

const API_URL = "http://127.0.0.1:8000/api";
const STATUSES = [
  ["all", "All requests"],
  ["delayed", "Delayed"],
  ["pending", "Pending"],
  ["processing", "Processing"],
  ["for_correction", "For correction"],
  ["ready_for_release", "Ready for release"],
  ["completed", "Released"],
  ["rejected", "Rejected"],
];

function DocumentRequestHistory() {
  const { token } = useAuth();
  const [overview, setOverview] = useState(null);
  const [requests, setRequests] = useState([]);
  const [auditEvents, setAuditEvents] = useState([]);
  const [auditPagination, setAuditPagination] = useState({ current_page: 1, last_page: 1 });
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1 });
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [activeTab, setActiveTab] = useState("requests");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOverview = useCallback(async () => {
    const response = await fetch(`${API_URL}/admin/document-requests/overview`, {
      headers: authHeaders(token),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || "Unable to load document request statistics.");
    setOverview(payload.data);
  }, [token]);

  const loadRequests = useCallback(async (page = 1) => {
    const query = new URLSearchParams({ status, search, page: String(page), per_page: "15" });
    const response = await fetch(`${API_URL}/admin/document-requests?${query}`, {
      headers: authHeaders(token),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || "Unable to load document request history.");
    setRequests(payload.data || []);
    setPagination({
      current_page: payload.current_page || 1,
      last_page: payload.last_page || 1,
    });
  }, [search, status, token]);

  const loadAuditEvents = useCallback(async (page = 1) => {
    const response = await fetch(`${API_URL}/admin/document-request-events?per_page=15&page=${page}`, {
      headers: authHeaders(token),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || "Unable to load audit logs.");
    setAuditEvents(payload.data || []);
    setAuditPagination({
      current_page: payload.current_page || 1,
      last_page: payload.last_page || 1,
    });
  }, [token]);

  const refreshDashboard = useCallback(async (page = 1) => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      await Promise.all([loadOverview(), loadRequests(page), loadAuditEvents()]);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [loadAuditEvents, loadOverview, loadRequests, token]);

  useEffect(() => {
    // Load current dashboard data when search and status filters change.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshDashboard(1);
  }, [refreshDashboard]);

  const openRequest = async (requestId) => {
    setError("");
    try {
      const response = await fetch(`${API_URL}/admin/document-requests/${requestId}`, {
        headers: authHeaders(token),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Unable to load request details.");
      setSelectedRequest(payload.data);
    } catch (loadError) {
      setError(loadError.message);
    }
  };

  const cards = overview ? [
    ["Total requests", overview.total, "slate"],
    ["Pending", overview.pending, "amber"],
    ["Processing", overview.processing, "blue"],
    ["For correction", overview.for_correction, "amber"],
    ["Ready for release", overview.ready_for_release, "emerald"],
    ["Delayed · over 3 days", overview.delayed, "red"],
    ["Rejected", overview.rejected, "rose"],
    ["Released", overview.released, "emerald"],
    ["Active workload", overview.active, "blue"],
  ] : [];

  return (
    <AdminLayout title="Document Request Oversight">
      <section className="pt-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#2455D6]">
            Read-only oversight
          </p>
          <h2 className="mt-2 text-3xl font-bold text-[#172B4D]">Document request oversight</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">
            Monitor request volume, delays, staff workload, outcomes, processing history, and audit activity.
            Requests pending or processing for more than three days are marked delayed.
          </p>
        </div>

        {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {cards.map(([label, value, tone]) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold text-slate-500">{label}</p>
              <p className={`mt-2 text-3xl font-bold ${toneClass(tone)}`}>{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-[#172B4D]">Staff workload</h3>
              <p className="mt-1 text-xs text-slate-500">Active requests assigned when the officer first moves them into processing.</p>
            </div>
          </div>
          {overview?.staff_workload?.length ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {overview.staff_workload.map((staff) => (
                <div key={staff.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                  <span className="text-sm font-semibold text-slate-700">{staff.name}</span>
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">
                    {staff.active_requests} active
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">No document request officers found.</p>
          )}
        </div>

        <div className="mt-6">
          <div className="flex gap-2 border-b border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab("requests")}
              className={tabClass(activeTab === "requests")}
            >
              Request history
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("audit")}
              className={tabClass(activeTab === "audit")}
            >
              Audit logs
            </button>
          </div>

          {activeTab === "requests" ? (
            <div className="overflow-hidden rounded-b-2xl border border-t-0 border-slate-200 bg-white">
              <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row">
                <label className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search resident, email, request ID, or document"
                    className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#2455D6]"
                  />
                </label>
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700"
                >
                  {STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
              {loading ? <p className="p-8 text-center text-sm text-slate-500">Loading request history...</p> : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-212.5 text-left text-sm">
                      <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Request</th>
                          <th className="px-4 py-3">Resident</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Handler</th>
                          <th className="px-4 py-3">Last status update</th>
                          <th className="px-4 py-3">Submitted</th>
                          <th className="px-4 py-3">Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {requests.map((request) => (
                          <tr key={request.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3">
                              <span className="font-bold text-[#172B4D]">#{request.id}</span>
                              <span className="mt-1 block text-xs text-slate-500">{request.document_type_label || request.document_type}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-semibold text-slate-700">{request.resident?.name || "Resident"}</span>
                              <span className="mt-1 block text-xs text-slate-500">{request.resident?.email}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClass(request.status)}`}>
                                {labelStatus(request.status)}
                              </span>
                              {request.is_delayed && <span className="ml-2 text-xs font-bold text-red-600">Delayed</span>}
                            </td>
                            <td className="px-4 py-3 text-slate-600">{request.assigned_staff?.name || "Not assigned yet"}</td>
                            <td className="px-4 py-3 text-slate-600">{formatDate(request.status_changed_at || request.updated_at)}</td>
                            <td className="px-4 py-3 text-slate-600">{formatDate(request.created_at)}</td>
                            <td className="px-4 py-3">
                              <button type="button" onClick={() => openRequest(request.id)} className="font-bold text-[#2455D6] hover:underline">
                                View history
                              </button>
                            </td>
                          </tr>
                        ))}
                        {!requests.length && <tr><td colSpan="7" className="px-4 py-10 text-center text-slate-500">No matching document requests.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
                    <span>Page {pagination.current_page} of {pagination.last_page}</span>
                    <div className="flex gap-2">
                      <button type="button" disabled={pagination.current_page <= 1 || loading} onClick={() => refreshDashboard(pagination.current_page - 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold disabled:opacity-40">Previous</button>
                      <button type="button" disabled={pagination.current_page >= pagination.last_page || loading} onClick={() => refreshDashboard(pagination.current_page + 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold disabled:opacity-40">Next</button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-b-2xl border border-t-0 border-slate-200 bg-white">
              <table className="w-full min-w-195 text-left text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">When</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Actor</th>
                    <th className="px-4 py-3">Request</th>
                    <th className="px-4 py-3">Change / details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditEvents.map((event) => (
                    <tr key={event.id}>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDateTime(event.created_at)}</td>
                      <td className="px-4 py-3 font-semibold text-slate-700">{labelAction(event.action)}</td>
                      <td className="px-4 py-3">{event.actor_name} <span className="text-xs text-slate-400">({event.actor_role})</span></td>
                      <td className="px-4 py-3">
                        <button type="button" onClick={() => openRequest(event.document_request_id)} className="font-bold text-[#2455D6] hover:underline">
                          #{event.document_request_id} · {event.document_request?.document_type_label || event.document_request?.document_type}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{eventDescription(event)}</td>
                    </tr>
                  ))}
                  {!auditEvents.length && <tr><td colSpan="5" className="px-4 py-10 text-center text-slate-500">No audit events recorded yet.</td></tr>}
                </tbody>
              </table>
              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
                <span>Page {auditPagination.current_page} of {auditPagination.last_page}</span>
                <div className="flex gap-2">
                  <button type="button" disabled={auditPagination.current_page <= 1 || loading} onClick={() => loadAuditEvents(auditPagination.current_page - 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold disabled:opacity-40">Previous</button>
                  <button type="button" disabled={auditPagination.current_page >= auditPagination.last_page || loading} onClick={() => loadAuditEvents(auditPagination.current_page + 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold disabled:opacity-40">Next</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {selectedRequest && (
        <RequestHistoryModal request={selectedRequest} onClose={() => setSelectedRequest(null)} />
      )}
    </AdminLayout>
  );
}

function RequestHistoryModal({ request, onClose }) {
  const fields = request.details?.form_fields || {};
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label={`Request ${request.id} history`} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 p-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#2455D6]">Read-only request history</p>
            <h3 className="mt-1 text-xl font-bold text-[#172B4D]">#{request.id} · {request.document_type_label || request.document_type}</h3>
            <p className="mt-1 text-sm text-slate-500">{request.resident?.name} · {request.status}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close request history"><X size={20} /></button>
        </div>
        <div className="overflow-y-auto p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <Info label="Assigned handler" value={request.assigned_staff?.name || "Not assigned yet"} />
            <Info label="Fee" value={`₱${Number(request.fee || 0).toFixed(2)}`} />
            <Info label="Submitted" value={formatDateTime(request.created_at)} />
            <Info label="Status last changed" value={formatDateTime(request.status_changed_at || request.updated_at)} />
            {request.rejection_reason && <Info label="Rejection reason" value={request.rejection_reason} />}
            {request.staff_remarks && <Info label="Staff remarks" value={request.staff_remarks} />}
          </div>

          <h4 className="mt-7 font-bold text-[#172B4D]">Submitted information</h4>
          {Object.keys(fields).length ? (
            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
              {Object.entries(fields).map(([key, value]) => (
                <Info key={key} label={key.replaceAll("_", " ")} value={value} />
              ))}
            </dl>
          ) : <p className="mt-2 text-sm text-slate-500">No form details recorded.</p>}

          <h4 className="mt-7 font-bold text-[#172B4D]">Processing history</h4>
          <ol className="mt-3 space-y-3 border-l-2 border-blue-100 pl-4">
            {(request.events || []).map((event) => (
              <li key={event.id} className="relative rounded-xl bg-slate-50 p-3">
                <span className="absolute left-[-1.35rem] top-4 h-2.5 w-2.5 rounded-full bg-[#2455D6]" />
                <p className="text-sm font-bold text-slate-800">{labelAction(event.action)}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {event.actor_name} ({event.actor_role}) · {formatDateTime(event.created_at)}
                </p>
                <p className="mt-1 text-xs text-slate-600">{eventDescription(event)}</p>
              </li>
            ))}
            {!request.events?.length && <li className="text-sm text-slate-500">No processing events recorded.</li>}
          </ol>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="min-w-0 rounded-xl bg-slate-50 p-3">
      <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 wrap-break-word text-sm font-medium text-slate-800">{String(value || "Not provided")}</dd>
    </div>
  );
}

function authHeaders(token) {
  return { Accept: "application/json", Authorization: `Bearer ${token}` };
}

function statusClass(status) {
  return {
    pending: "bg-amber-50 text-amber-700",
    processing: "bg-blue-50 text-blue-700",
    for_correction: "bg-orange-50 text-orange-700",
    ready_for_release: "bg-emerald-50 text-emerald-700",
    completed: "bg-emerald-50 text-emerald-700",
    rejected: "bg-red-50 text-red-700",
  }[status] || "bg-slate-100 text-slate-700";
}

function toneClass(tone) {
  return {
    slate: "text-slate-800",
    amber: "text-amber-600",
    red: "text-red-600",
    rose: "text-rose-600",
    emerald: "text-emerald-600",
    blue: "text-blue-600",
  }[tone] || "text-slate-800";
}

function tabClass(active) {
  return `border-b-2 px-4 py-3 text-sm font-bold ${active ? "border-[#2455D6] text-[#2455D6]" : "border-transparent text-slate-500 hover:text-slate-800"}`;
}

function labelStatus(status = "") {
  return status.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function labelAction(action = "") {
  return {
    request_submitted: "Request submitted",
    request_resubmitted: "Correction resubmitted",
    status_changed: "Status changed",
    preview_generated: "Document preview generated",
    document_edited: "Document edited",
    fee_assessed: "Fee assessed",
  }[action] || labelStatus(action);
}

function eventDescription(event) {
  const details = [];
  if (event.from_status || event.to_status) {
    details.push(`${labelStatus(event.from_status || "new")} → ${labelStatus(event.to_status || "")}`);
  }
  if (event.metadata?.fee !== undefined) {
    details.push(`₱${Number(event.metadata.fee).toFixed(2)} (previously ₱${Number(event.metadata.previous_fee || 0).toFixed(2)})`);
  }
  if (event.metadata?.rejection_reason) details.push(`Reason: ${event.metadata.rejection_reason}`);
  if (event.metadata?.staff_remarks) details.push(`Remarks: ${event.metadata.staff_remarks}`);
  return details.join(" · ") || "Request activity recorded";
}

function formatDate(date) {
  if (!date) return "Not available";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(date));
}

function formatDateTime(date) {
  if (!date) return "Not available";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

export default DocumentRequestHistory;
