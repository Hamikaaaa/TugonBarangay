import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import { useAuth } from "../../context/AuthContext";

const API_URL = "http://127.0.0.1:8000/api";

const STATUS_OPTIONS = [
  { value: "all", label: "All requests" },
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "for_correction", label: "For correction" },
  { value: "ready_for_release", label: "Ready for release" },
  { value: "completed", label: "Completed" },
  { value: "rejected", label: "Rejected" },
];

const STATUS_STYLES = {
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  processing: "border-blue-200 bg-blue-50 text-blue-700",
  for_correction: "border-orange-200 bg-orange-50 text-orange-700",
  ready_for_release: "border-emerald-200 bg-emerald-50 text-emerald-700",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  rejected: "border-red-200 bg-red-50 text-red-700",
};

const STATUS_LABELS = {
  pending: "Pending",
  processing: "Processing",
  for_correction: "For correction",
  ready_for_release: "Ready for release",
  completed: "Completed",
  rejected: "Rejected",
};

function DocumentRequests() {
  const { token } = useAuth();
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [remarks, setRemarks] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    if (!token) return;

    const controller = new AbortController();
    const query = new URLSearchParams({ page: "1" });
    if (statusFilter !== "all") query.set("status", statusFilter);

    const loadRequests = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`${API_URL}/admin/document-requests?${query}`, {
          signal: controller.signal,
          headers: authHeaders(token),
        });
        const payload = await response.json();

        if (!response.ok) throw new Error(payload.message || "Unable to load requests.");

        const data = payload.data || [];
        setRequests(data);

        if (!selectedRequest && data.length > 0) {
          setSelectedRequest(data[0]);
          setRemarks(data[0].staff_remarks || "");
          setRejectionReason("");
        }
      } catch (requestError) {
        if (requestError.name !== "AbortError") setError(requestError.message);
      } finally {
        setLoading(false);
      }
    };

    loadRequests();
    return () => controller.abort();
  }, [token, statusFilter, selectedRequest]);

  const filteredRequests = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return requests;

    return requests.filter((request) =>
      [request.id, request.document_type, request.resident?.name, request.resident?.email]
        .filter(Boolean)
        .some((value) => value.toString().toLowerCase().includes(query)),
    );
  }, [requests, search]);

  const openRequest = (request) => {
    setSelectedRequest(request);
    setRemarks(request.staff_remarks || "");
    setRejectionReason("");
  };

  const updateStatus = async (status) => {
    if (!selectedRequest || !token) return;

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const body = {
        status,
        staff_remarks: remarks.trim() || null,
        rejection_reason: status === "rejected" ? rejectionReason.trim() : null,
      };

      const response = await fetch(`${API_URL}/admin/document-requests/${selectedRequest.id}/status`, {
        method: "PATCH",
        headers: {
          ...authHeaders(token),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Unable to update request.");

      setSelectedRequest(payload.data);
      setRequests((current) => current.map((request) => (request.id === payload.data.id ? payload.data : request)));
      setNotice(`Request ${payload.data.id} updated successfully.`);
      setTimeout(() => setNotice(""), 4000);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const statusCount = (status) => requests.filter((request) => request.status === status).length;

  const formatDate = (date) => {
    if (!date) return "Not available";
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(date));
  };

  return (
    <AdminLayout title="Document Requests">
      <section className="pt-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#2455D6]">
              <span className="h-2 w-2 rounded-full bg-[#2455D6]" />
              Administrative workflow
            </div>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#172B4D] sm:text-3xl">
              Document requests
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Review resident submissions and manage each request through the document lifecycle.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-500 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            System connected
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Pending" value={statusCount("pending")} icon="◷" tone="amber" />
          <MetricCard label="In process" value={statusCount("processing")} icon="↻" tone="blue" />
          <MetricCard label="Awaiting correction" value={statusCount("for_correction")} icon="!" tone="orange" />
          <MetricCard label="Ready to release" value={statusCount("ready_for_release")} icon="✓" tone="green" />
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_25px_rgba(18,49,82,0.05)]">
          <div className="border-b border-slate-200 p-4 sm:p-5">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="relative w-full xl:max-w-sm">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">⌕</span>
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search request, resident, or document..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#2455D6] focus:bg-white focus:ring-4 focus:ring-[#2455D6]/10"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setStatusFilter(option.value)}
                    className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
                      statusFilter === option.value
                        ? "bg-[#2455D6] text-white shadow-sm"
                        : "border border-slate-200 bg-white text-slate-500 hover:border-blue-200 hover:text-[#2455D6]"
                    }`}
                  >
                    {option.label}
                    {option.value !== "all" && (
                      <span className="ml-1.5 opacity-70">{statusCount(option.value)}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error && (
            <div className="mx-4 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:mx-5">
              {error}
            </div>
          )}

          {notice && (
            <div className="mx-4 mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 sm:mx-5">
              {notice}
            </div>
          )}

          <div className="grid gap-5 p-4 xl:grid-cols-[360px_minmax(0,1fr)] xl:p-5">
            <aside className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
              <div className="mb-3 flex items-center justify-between px-2 pb-2">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Request queue</h3>
                  <p className="mt-1 text-xs text-slate-400">Select a request to review its details.</p>
                </div>
              </div>

              <div className="space-y-3">
                {loading ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">
                    Loading document requests...
                  </div>
                ) : filteredRequests.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center">
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-lg text-slate-400">▣</div>
                    <p className="mt-3 text-sm font-bold text-slate-700">No requests found</p>
                    <p className="mt-1 text-xs text-slate-400">Try another status or search term.</p>
                  </div>
                ) : (
                  filteredRequests.map((request) => {
                    const isSelected = selectedRequest?.id === request.id;
                    return (
                      <button
                        key={request.id}
                        type="button"
                        onClick={() => openRequest(request)}
                        className={`w-full rounded-xl border p-3 text-left transition ${
                          isSelected
                            ? "border-[#2455D6] bg-[#EAF1FF] shadow-sm"
                            : "border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/30"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-bold ${STATUS_STYLES[request.status] || STATUS_STYLES.pending}`}>
                            {STATUS_LABELS[request.status] || request.status}
                          </span>
                          <span className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Req #{request.id}</span>
                        </div>
                        <div className="mt-3">
                          <p className="text-sm font-bold text-[#172B4D]">{request.document_type}</p>
                          <p className="mt-1 text-xs text-slate-500">{request.resident?.name || "Unknown resident"}</p>
                        </div>
                        <p className="mt-2 text-[11px] text-slate-400">Updated {formatDate(request.updated_at || request.created_at)}</p>
                      </button>
                    );
                  })
                )}
              </div>
            </aside>

            <main className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              {selectedRequest ? (
                <>
                  <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold ${STATUS_STYLES[selectedRequest.status] || STATUS_STYLES.pending}`}>
                        {STATUS_LABELS[selectedRequest.status] || selectedRequest.status}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Request #{selectedRequest.id}</span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => updateStatus("for_correction")}
                        disabled={saving}
                        className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Return for correction
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                    <div className="space-y-5">
                      <div>
                        <h3 className="text-3xl font-bold text-[#172B4D]">{selectedRequest.document_type}</h3>
                        <p className="mt-2 text-sm text-slate-500">Submitted by {selectedRequest.resident?.name || "Unknown resident"}</p>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                        <h4 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Request details</h4>
                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                          <DetailCard label="Resident" value={selectedRequest.resident?.name || "Unknown resident"} />
                          <DetailCard label="Contact" value={selectedRequest.resident?.email || "No email provided"} />
                          <DetailCard label="Submit date" value={formatDate(selectedRequest.created_at)} />
                          <DetailCard label="Fee" value={`₱${Number(selectedRequest.fee || 0).toFixed(2)}`} />
                          <DetailCard label="Purpose" value={selectedRequest.details?.purpose || "No purpose provided"} />
                          <DetailCard label="Notes" value={selectedRequest.details?.notes || "No notes provided"} />
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 p-4 sm:p-5">
                        <h4 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Form information</h4>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          {Object.entries(selectedRequest.details?.form_fields || {}).map(([key, value]) => (
                            <div key={key} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{key.replace(/_/g, " ")}</p>
                              <p className="mt-1 text-sm text-slate-700">{typeof value === "object" ? JSON.stringify(value) : String(value)}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <h4 className="text-sm font-bold text-[#172B4D]">Workflow decision</h4>
                        <p className="mt-1 text-xs text-slate-400">Verify the requirements and choose the correct next step.</p>
                        <div className="mt-4 space-y-2">
                          <button
                            type="button"
                            onClick={() => updateStatus("processing")}
                            disabled={saving}
                            className="w-full rounded-xl bg-[#2455D6] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#1948B8] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Approve and process
                          </button>
                          <button
                            type="button"
                            onClick={() => updateStatus("for_correction")}
                            disabled={saving}
                            className="w-full rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Return for correction
                          </button>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 p-4">
                        <h4 className="text-sm font-bold text-[#172B4D]">Staff remarks</h4>
                        <textarea
                          value={remarks}
                          onChange={(event) => setRemarks(event.target.value)}
                          rows="5"
                          placeholder="Add review notes or correction instructions..."
                          className="mt-3 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#2455D6] focus:bg-white focus:ring-4 focus:ring-[#2455D6]/10"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => updateStatus(selectedRequest.status === "pending" ? "processing" : "completed")}
                        disabled={saving}
                        className="w-full rounded-xl bg-[#2455D6] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#1948B8] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {saving ? "Saving..." : "Save and approve"}
                      </button>

                      {selectedRequest.status === "pending" && (
                        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                          <label htmlFor="rejection-reason" className="text-xs font-bold text-red-800">Rejection reason</label>
                          <textarea
                            id="rejection-reason"
                            value={rejectionReason}
                            onChange={(event) => setRejectionReason(event.target.value)}
                            rows="3"
                            placeholder="Provide a clear reason for rejecting this request..."
                            className="mt-2 w-full resize-y rounded-xl border border-red-200 bg-white px-4 py-3 text-sm outline-none transition focus:ring-4 focus:ring-red-100"
                          />
                        </div>
                      )}

                      {selectedRequest.status === "rejected" && (
                        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                          <p className="text-xs font-bold uppercase tracking-[0.12em] text-red-700">Rejection reason</p>
                          <p className="mt-2 text-sm leading-6 text-red-800">{selectedRequest.rejection_reason || "No reason provided."}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex h-full min-h-[420px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
                  Select a request to review its details.
                </div>
              )}
            </main>
          </div>
        </div>
      </section>
    </AdminLayout>
  );
}

function MetricCard({ label, value, icon, tone }) {
  const tones = {
    amber: "bg-amber-50 text-amber-600",
    blue: "bg-blue-50 text-blue-600",
    orange: "bg-orange-50 text-orange-600",
    green: "bg-emerald-50 text-emerald-600",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_6px_18px_rgba(18,49,82,0.04)] transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-[#172B4D]">{value}</p>
        </div>
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold ${tones[tone]}`}>{icon}</span>
      </div>
    </div>
  );
}

function DetailCard({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-1.5 text-sm font-semibold text-slate-700">{value}</p>
    </div>
  );
}

function authHeaders(token) {
  return {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export default DocumentRequests;
