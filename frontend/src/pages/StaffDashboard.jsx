import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import DocumentPreviewModal from "../components/staff/DocumentPreviewModal";

const API_URL = "http://127.0.0.1:8000/api";

const STATUS_STYLES = {
  pending: "bg-amber-50 text-amber-700",
  processing: "bg-blue-50 text-blue-700",
  for_correction: "bg-orange-50 text-orange-700",
  ready_for_release: "bg-emerald-50 text-emerald-700",
  completed: "bg-emerald-50 text-emerald-700",
  rejected: "bg-red-50 text-red-700",
};

const STATUS_LABELS = {
  pending: "Pending",
  processing: "Processing",
  for_correction: "For Correction",
  ready_for_release: "Ready for Release",
  completed: "Completed",
  rejected: "Rejected",
};

const BUTTON_STYLES = {
  primary:
    "inline-flex items-center justify-center gap-2 rounded-xl bg-[#2455D6] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#1948B8] focus:outline-none focus:ring-2 focus:ring-[#2455D6]/30 disabled:cursor-not-allowed disabled:opacity-50",
  correction:
    "inline-flex items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-800 transition hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-200 disabled:cursor-not-allowed disabled:opacity-50",
  rejection:
    "inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 transition hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-200 disabled:cursor-not-allowed disabled:opacity-50",
};

const DOCUMENT_TYPES = [
  { label: "Dashboard", value: "" },
  { label: "Barangay Clearance", value: "Barangay Certification" },
  { label: "Certificate of Residency", value: "Barangay Residency" },
  { label: "Business Clearance", value: "Business Permit" },
  { label: "Certificate of Good Moral Character", value: "Certificate of Good Moral Character" },
  { label: "First-Time Jobseeker Certification", value: "First-Time Jobseeker Certification" },
];

function StaffDashboard() {
  const { user, token, logout } = useAuth();
  const [requests, setRequests] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [activeDocumentType, setActiveDocumentType] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [previewRequest, setPreviewRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [staffRemarks, setStaffRemarks] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [documentContent, setDocumentContent] = useState("");

  const selected = useMemo(
    () => requests.find((request) => request.id === selectedId) || selectedRequest,
    [requests, selectedId, selectedRequest],
  );

  const loadRequests = async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/staff/document-requests`, {
        headers: authHeaders(token),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Unable to load requests.");
      setRequests(payload.data || []);
      if (!selectedId && (payload.data || []).length > 0) {
        setSelectedId(payload.data[0].id);
      }
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    fetch(`${API_URL}/staff/document-requests`, {
      headers: authHeaders(token),
    })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || "Unable to load requests.");
        if (!cancelled) {
          setRequests(payload.data || []);
          if (!selectedId && (payload.data || []).length > 0) {
            setSelectedId(payload.data[0].id);
          }
          setError("");
        }
      })
      .catch((requestError) => {
        if (!cancelled) setError(requestError.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedId, token]);

  useEffect(() => {
    if (!selectedId || !token) return;

    let cancelled = false;
    fetch(`${API_URL}/staff/document-requests/${selectedId}`, {
      headers: authHeaders(token),
    })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || "Unable to load request.");
        if (!cancelled) {
          setSelectedRequest(payload.data || payload);
          setStaffRemarks(payload.data?.staff_remarks || "");
          setRejectionReason(payload.data?.rejection_reason || "");
          setDocumentContent(
            JSON.stringify(payload.data?.document_content || {}, null, 2),
          );
        }
      })
      .catch((requestError) => {
        if (!cancelled) setError(requestError.message);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedId, token]);

  const updateStatus = async (status, extra = {}) => {
    if (!selectedId || !token || submitting) return;
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/staff/document-requests/${selectedId}/status`,
        {
          method: "PATCH",
          headers: {
            ...authHeaders(token),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status,
            staff_remarks: staffRemarks,
            rejection_reason: status === "rejected" ? rejectionReason : null,
            document_content: status === "ready_for_release" ? parseDocumentContent() : null,
            ...extra,
          }),
        },
      );
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Unable to update request.");

      setSelectedRequest(payload.data);
      setNotice(payload.message);
      setTimeout(() => setNotice(""), 4000);
      await loadRequests();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const generatePreview = async () => {
    if (!selectedId || !token || submitting) return;
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/staff/document-requests/${selectedId}/generate`,
        {
          method: "POST",
          headers: {
            ...authHeaders(token),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            document_content: parseDocumentContent(),
            staff_remarks: staffRemarks,
          }),
        },
      );
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Unable to generate preview.");
      setSelectedRequest(payload.data);
      setNotice("Document preview generated.");
      setTimeout(() => setNotice(""), 4000);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const parseDocumentContent = () => {
    try {
      return JSON.parse(documentContent) || {};
    } catch {
      throw new Error("Document content must be valid JSON.");
    }
  };

  const selectRequest = (request) => {
    setSelectedId(request.id);
    setSelectedRequest(null);
    setError("");
  };

  const selectDocumentType = (documentType) => {
    setActiveDocumentType(documentType);
    setSidebarOpen(false);
    const matchingRequest = requests.find(
      (request) => !documentType || request.document_type === documentType,
    );
    setSelectedId(matchingRequest?.id || null);
    setSelectedRequest(null);
  };

  const visibleRequests = activeDocumentType
    ? requests.filter((request) => request.document_type === activeDocumentType)
    : requests;

  return (
    <div className="min-h-screen bg-[#F5F7FB] text-[#172B4D]">
      <StaffSidebar
        activeDocumentType={activeDocumentType}
        onSelect={selectDocumentType}
        onLogout={logout}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
      />

      <main className="min-w-0 bg-[#F5F7FB] lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur sm:px-7 lg:px-9">
          <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-5">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-[#2455D6] shadow-sm lg:hidden"
                aria-label="Open navigation"
              >
                ☰
              </button>
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#123F70] text-xs font-bold text-white shadow-sm">
                  DR
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#2455D6]">
                    Staff workspace
                  </p>
                  <h1 className="truncate text-xl font-bold tracking-tight text-[#172B4D] sm:text-2xl">
                    Document Requests
                  </h1>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-bold">{user?.name || "Document Officer"}</p>
                <p className="text-[10px] capitalize text-slate-400">{user?.designation || "staff"}</p>
              </div>
              <button type="button" onClick={logout} className={BUTTON_STYLES.rejection}>
                Logout
              </button>
            </div>
          </div>
        </header>

        <div className="mx-auto w-full max-w-[1600px] px-5 py-7 sm:px-7 lg:px-9">
        <section className="mb-6 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#2455D6]">
              <span className="h-2 w-2 rounded-full bg-[#2455D6]" />
              Document workflow
            </div>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#172B4D]">Review and process resident requests</h2>
            <p className="mt-1 text-sm text-slate-500">All actions are recorded and restricted to the document request officer.</p>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-blue-100 bg-[#F5F8FF] px-4 py-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2455D6] text-sm font-bold text-white">
              {requests.length}
            </span>
            <div>
              <p className="text-xs font-bold text-[#172B4D]">Requests in queue</p>
              <p className="text-[10px] text-slate-500">Updated from the latest activity</p>
            </div>
          </div>
        </section>

        {notice && (
          <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            {notice}
          </div>
        )}
        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">Loading document requests...</div>
        ) : visibleRequests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <p className="text-lg font-bold text-slate-700">No document requests</p>
            <p className="mt-1 text-sm text-slate-500">
              {activeDocumentType ? `No ${activeDocumentType.toLowerCase()} requests yet.` : "New resident requests will appear here."}
            </p>
          </div>
        ) : (
          <div className="grid min-h-[680px] gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                <h3 className="text-sm font-bold text-[#172B4D]">Request queue</h3>
                <p className="mt-1 text-xs text-slate-500">Select a request to review its details.</p>
              </div>
              <div className="divide-y divide-slate-100">
                {visibleRequests.map((request) => (
                  <div
                    key={request.id}
                    className={`group w-full transition ${
                      selectedId === request.id ? "bg-[#EAF1FF]" : "hover:bg-slate-50"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => selectRequest(request)}
                      className="w-full px-5 py-4 text-left"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-[#172B4D]">{request.resident?.name || "Unknown resident"}</p>
                          <p className="mt-1 truncate text-xs text-slate-500">{request.document_type} · #{request.id}</p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${STATUS_STYLES[request.status] || "bg-slate-100 text-slate-600"}`}>
                          {STATUS_LABELS[request.status] || request.status}
                        </span>
                      </div>
                      <p className="mt-3 text-[11px] text-slate-400">Updated {new Date(request.updated_at).toLocaleDateString()}</p>
                    </button>
                    <div className="flex gap-2 border-t border-slate-100 px-5 py-2.5 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                      <button
                        type="button"
                        onClick={() => setPreviewRequest(request)}
                        className="flex-1 rounded-lg bg-[#EAF1FF] px-3 py-2 text-[11px] font-bold text-[#2455D6] transition hover:bg-[#D9E6FF]"
                      >
                        Preview
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewRequest(request)}
                        className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-bold text-slate-600 transition hover:bg-slate-50"
                      >
                        Print
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {selected ? (
                <>
                  <div className="border-b border-slate-200 px-5 py-5 sm:px-7">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${STATUS_STYLES[selected.status] || "bg-slate-100 text-slate-600"}`}>
                            {STATUS_LABELS[selected.status] || selected.status}
                          </span>
                          <span className="text-xs text-slate-400">Request #{selected.id}</span>
                        </div>
                        <h2 className="mt-3 text-xl font-bold text-[#172B4D]">{selected.document_type}</h2>
                        <p className="mt-1 text-sm text-slate-500">Submitted by {selected.resident?.name || "Unknown resident"}</p>
                      </div>
                      <div className="flex flex-wrap gap-2.5">
                        <button type="button" onClick={generatePreview} disabled={submitting} className={BUTTON_STYLES.primary}>
                          Generate preview
                        </button>
                        <button type="button" onClick={() => updateStatus("for_correction")} disabled={submitting || selected.status !== "pending"} className={BUTTON_STYLES.correction}>
                          Return for correction
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.75fr)]">
                    <div className="space-y-6">
                      <RequestDetails request={selected} />

                      <div className="rounded-2xl border border-slate-200 bg-white p-5">
                        <h3 className="text-sm font-bold text-[#172B4D]">Document preview</h3>
                        <p className="mt-1 text-xs text-slate-500">Review the generated document before release.</p>
                        <textarea
                          value={documentContent}
                          onChange={(event) => setDocumentContent(event.target.value)}
                          className="mt-4 min-h-64 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-xs leading-6 outline-none focus:border-[#2455D6] focus:ring-2 focus:ring-blue-100"
                          spellCheck={false}
                        />
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button type="button" onClick={generatePreview} disabled={submitting} className={BUTTON_STYLES.primary}>Review document</button>
                          <button type="button" onClick={() => updateStatus("ready_for_release")} disabled={submitting || selected.status !== "processing" && selected.status !== "ready_for_release"} className={BUTTON_STYLES.primary}>Mark ready for release</button>
                        </div>
                      </div>
                    </div>

                    <aside className="space-y-6">
                      <div className="rounded-2xl border border-slate-200 bg-white p-5">
                        <h3 className="text-sm font-bold text-[#172B4D]">Workflow decision</h3>
                        <p className="mt-1 text-xs leading-5 text-slate-500">Verify the requirements and choose the correct next step.</p>
                        <div className="mt-5 space-y-3">
                          <button type="button" onClick={() => updateStatus("processing")} disabled={submitting || selected.status !== "pending"} className={BUTTON_STYLES.primary}>
                            Approve and process
                          </button>
                          <button type="button" onClick={() => updateStatus("for_correction")} disabled={submitting || selected.status !== "pending"} className={BUTTON_STYLES.correction}>
                            Return for correction
                          </button>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white p-5">
                        <h3 className="text-sm font-bold text-[#172B4D]">Staff remarks</h3>
                        <textarea
                          value={staffRemarks}
                          onChange={(event) => setStaffRemarks(event.target.value)}
                          placeholder="Add review notes or correction instructions..."
                          className="mt-3 min-h-32 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:border-[#2455D6] focus:ring-2 focus:ring-blue-100"
                        />
                        <div className="mt-4 space-y-3">
                          {selected.status === "pending" && (
                            <button type="button" onClick={() => updateStatus("processing")} disabled={submitting} className={BUTTON_STYLES.primary + " w-full"}>Save and approve</button>
                          )}
                          {selected.status === "processing" && (
                            <button type="button" onClick={() => updateStatus("ready_for_release")} disabled={submitting} className={BUTTON_STYLES.primary + " w-full"}>Complete review and release</button>
                          )}
                        </div>
                      </div>

                      {selected.status === "pending" && (
                        <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
                          <h3 className="text-sm font-bold text-red-800">Reject request</h3>
                          <textarea value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} placeholder="Enter the reason for rejection..." className="mt-3 min-h-24 w-full resize-y rounded-xl border border-red-200 bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-red-100" />
                          <button type="button" onClick={() => updateStatus("rejected")} disabled={submitting || !rejectionReason.trim()} className={BUTTON_STYLES.rejection + " mt-3 w-full"}>Save rejection</button>
                        </div>
                      )}

                      {selected.status === "processing" && (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                          <h3 className="text-sm font-bold text-amber-800">Return for correction</h3>
                          <p className="mt-2 text-xs leading-5 text-amber-700">The resident will receive the staff remarks and resubmit the corrected requirements.</p>
                          <button type="button" onClick={() => updateStatus("for_correction")} disabled={submitting} className={BUTTON_STYLES.correction + " mt-4 w-full"}>Return request for correction</button>
                        </div>
                      )}

                      {selected.status === "rejected" && (
                        <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
                          <h3 className="text-sm font-bold text-red-800">Rejection reason</h3>
                          <p className="mt-3 text-sm leading-6 text-red-700">{selected.rejection_reason}</p>
                        </div>
                      )}

                      {selected.status === "ready_for_release" && (
                        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
                          <h3 className="text-sm font-bold text-blue-800">Release document</h3>
                          <p className="mt-2 text-xs leading-5 text-blue-700">The document has been reviewed and is ready for the resident to claim it.</p>
                          <button type="button" onClick={() => updateStatus("completed")} disabled={submitting} className={BUTTON_STYLES.primary + " mt-4 w-full"}>Mark completed</button>
                        </div>
                      )}
                    </aside>
                  </div>
                </>
              ) : (
                <div className="flex h-full min-h-[680px] items-center justify-center p-10 text-center text-slate-500">Select a request from the queue.</div>
              )}
            </section>
          </div>
        )}
        </div>
      </main>

      {previewRequest && (
        <DocumentPreviewModal request={previewRequest} onClose={() => setPreviewRequest(null)} />
      )}
    </div>
  );
}

function StaffSidebar({ activeDocumentType, onSelect, onLogout, open, onClose, user }) {
  return (
    <>
      {open && (
        <button
          type="button"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-[#071B3D]/60 lg:hidden"
          aria-label="Close navigation"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(19rem,88vw)] flex-col overflow-y-auto bg-[#123F70] px-5 py-6 text-white shadow-2xl transition-transform duration-300 lg:w-72 lg:translate-x-0 lg:shadow-none ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-2 pb-5">
          <img src="/images/logo-white-version.png" alt="TugonBarangay" className="h-12 w-12 object-contain" />
          <div>
            <h1 className="text-lg font-bold tracking-tight">
              Tugon<span className="text-[#FF6B6B]">Barangay</span>
            </h1>
            <p className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.15em] text-blue-100/70">
              Staff Portal
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-lg text-blue-100 hover:bg-white/10 lg:hidden"
            aria-label="Close navigation"
          >
            ×
          </button>
        </div>

        <div className="mt-7">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-200/60">
            Document types
          </p>
          <nav className="space-y-1">
            {DOCUMENT_TYPES.map((documentType) => {
              const active = activeDocumentType === documentType.value;
              return (
                <button
                  key={documentType.label}
                  type="button"
                  onClick={() => onSelect(documentType.value)}
                  className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition-all duration-200 ${
                    active
                      ? "bg-white text-[#123F70] shadow-lg"
                      : "text-blue-100 hover:bg-white/10"
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                      active ? "bg-[#EAF1FF] text-[#2455D6]" : "bg-white/10 text-blue-100"
                    }`}
                  >
                    {documentType.value ? "▣" : "⌂"}
                  </span>
                  <span className="truncate">{documentType.label}</span>
                  {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#EF4444]" />}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto pt-6">
          <div className="mb-4 rounded-xl bg-white/10 p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-bold text-[#2455D6]">
                {user?.name?.charAt(0)?.toUpperCase() || "D"}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-bold">{user?.name || "Document Officer"}</p>
                <p className="truncate text-[10px] text-blue-100/60">{user?.designation || "staff"}</p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-red-100 transition hover:bg-red-500/10"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-400/10">↪</span>
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}

function authHeaders(token) {
  return {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
}

function RequestDetails({ request }) {
  const details = request.details || {};
  const formFields = details.form_fields || {};
  const requirements = details.requirements || {};

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="text-sm font-bold text-[#172B4D]">Request details</h3>
      <dl className="mt-5 space-y-4">
        <DetailRow label="Resident" value={request.resident?.name || "Unknown resident"} />
        <DetailRow label="Document" value={request.document_type} />
        <DetailRow label="Submit date" value={new Date(request.created_at).toLocaleString()} />
        <DetailRow label="Fee" value={`₱${request.fee || 0}`} />
        <DetailRow label="Notes" value={details.notes || "No notes provided."} />
      </dl>
      <div className="mt-6 border-t border-slate-100 pt-5">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Form information</h4>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          {Object.entries(formFields).map(([key, value]) => (
            <DetailRow key={key} label={key.replaceAll("_", " ")} value={String(value)} />
          ))}
        </dl>
      </div>
      <div className="mt-6 border-t border-slate-100 pt-5">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Requirements</h4>
        <div className="mt-4 space-y-3">
          {Object.keys(requirements).length === 0 ? (
            <p className="text-sm text-slate-500">No uploaded requirements recorded.</p>
          ) : (
            Object.entries(requirements).map(([key, requirement]) => (
              <div key={key} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-semibold text-slate-700">{requirement.label || key.replaceAll("_", " ")}</p>
                <p className="mt-1 text-xs text-slate-500">{requirement.original_name || requirement.path || "Uploaded file"}</p>
              </div>
            ))
          )}
        </div>
      </div>
      {(request.staff_remarks || request.rejection_reason) && (
        <div className="mt-6 border-t border-slate-100 pt-5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Staff remarks</h4>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{request.staff_remarks || request.rejection_reason}</p>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="grid gap-1 border-b border-slate-100 pb-3 last:border-0">
      <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</dt>
      <dd className="break-words text-sm font-medium text-slate-700">{value || "—"}</dd>
    </div>
  );
}

export default StaffDashboard;
