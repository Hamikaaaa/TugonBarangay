import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  Eye,
  FileText,
  LoaderCircle,
  Plus,
  Search,
  ShieldAlert,
  X,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import AdminPageHeader from "../../components/admin/AdminPageHeader";
import StaffLayout from "./StaffLayout";
import useComplaintStaffNavigation from "../../hooks/useComplaintStaffNavigation";
import { primaryButtonClass } from "../../utils/buttonStyles";

const API_URL = "http://127.0.0.1:8000/api";

const STATUS_META = {
  open: { label: "Open", className: "bg-amber-50 text-amber-700", icon: Clock3 },
  resolved: { label: "Resolved", className: "bg-emerald-50 text-emerald-700", icon: CheckCircle2 },
  referred: { label: "Referred", className: "bg-blue-50 text-blue-700", icon: Archive },
};

const EMPTY_FORM = {
  resident_id: "",
  resident_name: "",
  complainant_name: "",
  incident_type: "",
  incident_date: "",
  incident_time: "",
  location: "",
  narrative: "",
  status: "open",
  remarks: "",
};

function formatDate(value) {
  if (!value) return "Not recorded";
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? "Not recorded"
    : date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
}

function formatTime(value) {
  if (!value) return "Not recorded";
  const [hours, minutes] = String(value).split(":");
  const parsedHours = Number(hours);
  const parsedMinutes = Number(minutes);
  if (Number.isNaN(parsedHours) || Number.isNaN(parsedMinutes)) {
    return "Not recorded";
  }
  const suffix = parsedHours >= 12 ? "PM" : "AM";
  const displayHours = parsedHours % 12 || 12;
  return `${displayHours}:${String(parsedMinutes).padStart(2, "0")} ${suffix}`;
}

function formatDateTime(value) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not recorded"
    : date.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
}

function authHeaders(token) {
  return {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
}

function BlotterManagement() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const navigationItems = useComplaintStaffNavigation();

  const residentFilter = new URLSearchParams(location.search).get("resident") || "";
  const [entries, setEntries] = useState([]);
  const [statusCounts, setStatusCounts] = useState({ all: 0, open: 0, resolved: 0, referred: 0 });
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [statusEditId, setStatusEditId] = useState(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const loadEntries = useCallback(async () => {
    if (!token) return;

    try {
      const query = new URLSearchParams({ page: String(page) });
      if (debouncedSearch.trim()) query.set("search", debouncedSearch.trim());
      if (statusFilter !== "all") query.set("status", statusFilter);
      if (residentFilter) query.set("resident", residentFilter);

      const response = await fetch(`${API_URL}/staff/blotter/entries?${query}`, {
        headers: authHeaders(token),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || "Unable to load blotter entries.");
      }

      setEntries(payload.data || []);
      setStatusCounts(payload.status_counts || { all: 0, open: 0, resolved: 0, referred: 0 });
      setPagination({
        current_page: payload.current_page || 1,
        last_page: payload.last_page || 1,
        total: payload.total || 0,
      });
      setError("");
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, residentFilter, statusFilter, token]);

  const saveStatus = async (entryId, newStatus) => {
    if (!token) return;
    setStatusEditId(entryId);
    try {
      const response = await fetch(`${API_URL}/staff/blotter/entries/${entryId}`, {
        method: "PATCH",
        headers: {
          ...authHeaders(token),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || "Unable to update status.");
      }
      setStatusEditId(null);
      loadEntries();
    } catch (err) {
      setError(err.message);
      setStatusEditId(null);
    }
  };

  useEffect(() => {
    // Load the blotter entries for the current page and filters.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadEntries();
  }, [loadEntries]);

  const selectedResidentName = useMemo(() => {
    if (!residentFilter) return "";
    return (
      entries.find((entry) => String(entry.resident_id) === String(residentFilter))
        ?.resident_name || residentFilter
    );
  }, [entries, residentFilter]);

  const summaryCards = useMemo(
    () => [
      { label: "Total entries", value: statusCounts.all || 0, icon: FileText, tone: "text-[#2455D6] bg-[#EAF1FF]" },
      { label: "Open", value: statusCounts.open || 0, icon: Clock3, tone: "text-amber-700 bg-amber-50" },
      { label: "Resolved", value: statusCounts.resolved || 0, icon: CheckCircle2, tone: "text-emerald-700 bg-emerald-50" },
      { label: "Referred", value: statusCounts.referred || 0, icon: Archive, tone: "text-blue-700 bg-blue-50" },
    ],
    [statusCounts],
  );

  return (
    <StaffLayout
      title="Barangay Blotter"
      navigationItems={navigationItems}
      activePath="/staff/blotter"
      onNavigate={navigate}
    >
      <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-7 lg:px-9 lg:py-8">
        <AdminPageHeader
          eyebrow="Community records"
          title="Barangay blotter"
          description="Record and track incidents reported by residents of the barangay."
        />

        <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Blotter summary">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.tone}`}>
                  <Icon size={18} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xl font-bold text-[#172B4D]">{card.value}</p>
                  <p className="text-xs font-semibold text-slate-500">{card.label}</p>
                </div>
              </div>
            );
          })}
        </section>

        {error && (
          <div
            role="alert"
            className="mt-5 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
          >
            <span>{error}</span>
            <button type="button" onClick={() => setError("")} aria-label="Dismiss error">
              <X size={15} />
            </button>
          </div>
        )}

        <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-base font-bold text-[#172B4D]">Blotter entries</h2>
              <p className="mt-1 text-xs text-slate-500">
                {pagination.total} {pagination.total === 1 ? "entry" : "entries"} recorded
              </p>
              {selectedResidentName && (
                <span className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#EAF1FF] px-3 py-1 text-[11px] font-bold text-[#2455D6]">
                  Resident: {selectedResidentName}
                  <button
                    type="button"
                    onClick={() => navigate("/staff/blotter")}
                    aria-label="Clear resident filter"
                    className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-[#2455D6]/10"
                  >
                    <X size={11} />
                  </button>
                </span>
              )}
            </div>
            <button type="button" onClick={() => setFormOpen(true)} className={primaryButtonClass}>
              <Plus size={15} aria-hidden="true" />
              New blotter entry
            </button>
          </div>

          <div className="grid gap-3 border-b border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-2">
            <label className="relative block">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search reference, resident, or incident..."
                aria-label="Search blotter entries"
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs font-medium text-slate-700 outline-none focus:border-[#2455D6] focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <select
              value={statusFilter}
              onChange={(event) => {
                setLoading(true);
                setStatusFilter(event.target.value);
                setPage(1);
              }}
              aria-label="Filter by blotter status"
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 outline-none focus:border-[#2455D6]"
            >
              <option value="all">All statuses</option>
              <option value="open">Open</option>
              <option value="resolved">Resolved</option>
              <option value="referred">Referred</option>
            </select>
          </div>

          {loading ? (
            <p className="p-12 text-center text-sm text-slate-500">Loading blotter entries...</p>
          ) : entries.length === 0 ? (
            <div className="p-14 text-center">
              <ShieldAlert className="mx-auto text-slate-400" size={24} />
              <p className="mt-4 text-sm font-bold text-slate-700">No blotter entries found</p>
              <p className="mt-1 text-xs text-slate-500">
                Record a new entry or adjust the current filters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                    <th className="px-5 py-3.5">Reference</th>
                    <th className="px-5 py-3.5">Resident</th>
                    <th className="px-5 py-3.5">Incident</th>
                    <th className="px-5 py-3.5">Date</th>
                    <th className="px-5 py-3.5">Time</th>
                    <th className="px-5 py-3.5">Location</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {entries.map((entry) => {
                    const meta = STATUS_META[entry.status] || STATUS_META.open;
                    return (
                      <tr key={entry.id} className="transition hover:bg-blue-50/30">
                        <td className="px-5 py-4 text-xs font-bold text-[#2455D6]">
                          {entry.reference_code}
                        </td>
                        <td className="px-5 py-4 text-xs font-semibold text-slate-700">
                          {entry.resident_name}
                        </td>
                        <td className="px-5 py-4 text-xs text-slate-600">{entry.incident_type}</td>
                        <td className="px-5 py-4 text-xs text-slate-600">
                          {formatDate(entry.incident_date)}
                        </td>
                        <td className="px-5 py-4 text-xs text-slate-600">
                          {formatTime(entry.incident_time)}
                        </td>
                        <td className="px-5 py-4 text-xs text-slate-600">
                          {entry.location || "Not recorded"}
                        </td>
                        <td className="px-5 py-4">
                          {statusEditId === entry.id ? (
                            <select
                              value={entry.status}
                              onChange={(event) => saveStatus(entry.id, event.target.value)}
                              className="rounded-xl border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold outline-none focus:border-[#2455D6]"
                            >
                              <option value="open">Open</option>
                              <option value="resolved">Resolved</option>
                              <option value="referred">Referred</option>
                            </select>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setStatusEditId(entry.id)}
                              aria-label={`Change status of ${entry.reference_code}`}
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold transition ${meta.className} hover:opacity-90 hover:underline`}
                            >
                              {meta.label}
                            </button>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedEntry(entry)}
                            aria-label={`View details of ${entry.reference_code}`}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-bold text-[#2455D6] transition hover:border-[#2455D6] hover:bg-[#EEF4FF]"
                          >
                            <Eye size={13} aria-hidden="true" />
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {pagination.last_page > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3 text-xs text-slate-500 sm:px-6">
              <span>
                Page {pagination.current_page} of {pagination.last_page}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  aria-label="Previous page"
                  onClick={() => {
                    setLoading(true);
                    setPage((current) => Math.max(1, current - 1));
                  }}
                  disabled={page <= 1}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:border-[#2455D6] hover:text-[#2455D6] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={16} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label="Next page"
                  onClick={() => {
                    setLoading(true);
                    setPage((current) => Math.min(pagination.last_page, current + 1));
                  }}
                  disabled={page >= pagination.last_page}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:border-[#2455D6] hover:text-[#2455D6] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {formOpen && (
        <BlotterEntryForm
          token={token}
          recordedBy={user?.name}
          onClose={() => setFormOpen(false)}
          onSaved={() => {
            setFormOpen(false);
            setPage(1);
            loadEntries();
          }}
        />
      )}

      {selectedEntry && (
        <BlotterEntryDetails
          entry={selectedEntry}
          token={token}
          onError={setError}
          onClose={() => setSelectedEntry(null)}
        />
      )}
    </StaffLayout>
  );
}

function BlotterEntryDetails({ entry, onClose, token, onError }) {
  const meta = STATUS_META[entry.status] || STATUS_META.open;
  const [newRemark, setNewRemark] = useState("");
  const [saving, setSaving] = useState(false);
  const [entryStatus, setEntryStatus] = useState(entry.status);
  const [editingStatus, setEditingStatus] = useState(false);

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const updateEntryStatus = async (newStatus) => {
    if (!token) return;
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/staff/blotter/entries/${entry.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders(token),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || "Unable to update status.");
      }
      setEntryStatus(newStatus);
    } catch (err) {
      onError?.(err.message);
    } finally {
      setSaving(false);
    }
  };

  const addRemark = async () => {
    const remark = newRemark.trim();
    if (!remark || !token) return;
    setSaving(true);
    onError?.("");
    try {
      const response = await fetch(`${API_URL}/staff/blotter/entries/${entry.id}`, {
        method: "PATCH",
        headers: {
          ...authHeaders(token),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ remark }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || "Unable to add remark.");
      }
      setNewRemark("");
      setEntryStatus((payload.data?.status ?? entry.status));
    } catch (err) {
      onError?.(err.message);
    } finally {
      setSaving(false);
    }
  };

  const details = [
    { label: "Complainant (filed by)", value: entry.complainant_name },
    { label: "Person being blottered", value: entry.resident_name },
    { label: "Incident type", value: entry.incident_type },
    { label: "Incident date", value: formatDate(entry.incident_date) },
    { label: "Incident time", value: formatTime(entry.incident_time) },
    { label: "Location", value: entry.location },
    { label: "Purok", value: entry.resident?.purok },
    { label: "Recorded by", value: entry.recorder?.name },
    { label: "Recorded on", value: formatDateTime(entry.created_at) },
  ];

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[#071B3D]/60 p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label={`Details for blotter entry ${entry.reference_code}`}
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-[#172B4D]">{entry.reference_code}</h2>
              {editingStatus ? (
                <select
                  value={entryStatus}
                  onChange={(event) => setEntryStatus(event.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold outline-none focus:border-[#2455D6]"
                >
                  <option value="open">Open</option>
                  <option value="resolved">Resolved</option>
                  <option value="referred">Referred</option>
                </select>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingStatus(true)}
                  aria-label="Change entry status"
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold transition ${meta.className} hover:opacity-90`}
                >
                  {meta.label}
                </button>
              )}
              {editingStatus && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      updateEntryStatus(entryStatus);
                      setEditingStatus(false);
                    }}
                    className="text-[10px] font-semibold text-[#2455D6] hover:text-[#2455D6]/80"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEntryStatus(entry.status);
                      setEditingStatus(false);
                    }}
                    className="ml-2 text-[10px] font-semibold text-slate-500 hover:text-slate-700"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              {entry.incident_type} · {formatDate(entry.incident_date)}
              {entry.incident_time ? ` at ${formatTime(entry.incident_time)}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close entry details"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5">
          <dl className="grid gap-4 sm:grid-cols-2">
            {details.map((detail) => (
              <div key={detail.label} className="min-w-0">
                <dt className="text-[11px] font-semibold uppercase text-[#55708F]">{detail.label}</dt>
                <dd className="mt-1 break-words text-sm text-[#172B4D]">
                  {detail.value || "Not recorded"}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-5 border-t border-slate-100 pt-4">
            <h3 className="text-[11px] font-semibold uppercase text-[#55708F]">Narrative</h3>
            <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-[#172B4D]">
              {entry.narrative || "Not recorded"}
            </p>
          </div>

          <div className="mt-4 border-t border-slate-100 pt-4">
            <h3 className="text-[11px] font-semibold uppercase text-[#55708F]">Remarks</h3>
            <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-600">
              {entry.remarks || "No remarks recorded."}
            </p>
            <div className="mt-3">
              <label className="block text-[11px] font-semibold uppercase text-[#55708F]">
                Add remark
              </label>
              <textarea
                value={newRemark}
                onChange={(event) => setNewRemark(event.target.value)}
                placeholder="Type an additional remark to append to this entry..."
                rows={2}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2 text-sm text-slate-700 outline-none focus:border-[#2455D6] focus:ring-2 focus:ring-blue-100"
              />
              <button
                type="button"
                onClick={addRemark}
                disabled={saving || newRemark.trim() === ""}
                className="mt-2 inline-flex min-h-9 items-center justify-center rounded-xl border border-transparent bg-[#2455D6] px-3 text-xs font-semibold text-white transition hover:bg-[#2455D6]/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Adding..." : "Add remark"}
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function BlotterEntryForm({ token, recordedBy, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [incidentTypes, setIncidentTypes] = useState([]);
  const [registeredResidents, setRegisteredResidents] = useState([]);
  const [residentSearch, setResidentSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return undefined;

    const controller = new AbortController();
    fetch(`${API_URL}/staff/blotter/incident-types`, {
      headers: authHeaders(token),
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error("Unable to load incident types.");
        setIncidentTypes(payload.data || []);
      })
      .catch(() => {
        if (!controller.signal.aborted) setIncidentTypes([]);
      });

    return () => controller.abort();
  }, [token]);

  useEffect(() => {
    if (!token) return undefined;

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fetch(
        `${API_URL}/staff/blotter/registered-residents${residentSearch.trim() ? `?search=${encodeURIComponent(residentSearch.trim())}` : ""}`,
        { headers: authHeaders(token), signal: controller.signal },
      )
        .then(async (response) => {
          const payload = await response.json();
          if (!response.ok) throw new Error("Unable to load residents.");
          setRegisteredResidents(payload.data || []);
        })
        .catch(() => {
          if (!controller.signal.aborted) setRegisteredResidents([]);
        });
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [residentSearch, token]);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const selectResident = (resident) => {
    setForm((current) => ({
      ...current,
      resident_id: String(resident.id),
      resident_name: resident.name,
    }));
    setResidentSearch("");
  };

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/staff/blotter/entries`, {
        method: "POST",
        headers: {
          ...authHeaders(token),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          resident_id: form.resident_id || null,
          incident_time: form.incident_time || null,
          location: form.location || null,
          remarks: form.remarks || null,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        const validationMessage = payload.errors
          ? Object.values(payload.errors).flat()[0]
          : null;
        throw new Error(validationMessage || payload.message || "Unable to save the entry.");
      }

      setForm(EMPTY_FORM);
      onSaved();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#071B3D]/60 p-4 sm:p-8">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-[#172B4D]">New blotter entry</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Recorded by {recordedBy || "staff"} on {formatDate(new Date().toISOString())}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close blotter entry form"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <div>
            <label className="block text-xs font-bold text-slate-700">Search registered resident</label>
            <div className="relative mt-1.5">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={residentSearch}
                onChange={(event) => setResidentSearch(event.target.value)}
                placeholder="Search by name, email, or purok..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-[#2455D6] focus:ring-2 focus:ring-blue-100"
              />
            </div>
            {registeredResidents.length > 0 && (
              <ul className="mt-2 max-h-32 overflow-y-auto rounded-xl border border-slate-200">
                {registeredResidents.map((resident) => (
                  <li key={resident.id}>
                    <button
                      type="button"
                      onClick={() => selectResident(resident)}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      <span className="truncate">{resident.name}</span>
                      <span className="shrink-0 text-[10px] font-medium text-slate-400">
                        {resident.purok || resident.email}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <label className="block">
            <span className="text-xs font-bold text-slate-700">
              Complainant name (person who filed the blotter)
            </span>
            <input
              maxLength={255}
              name="complainant_name"
              value={form.complainant_name}
              onChange={updateField}
              placeholder="Full name of the person who filed this blotter"
              className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#2455D6] focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold text-slate-700">
              Person being blottered (respondent) <span className="text-red-500">*</span>
            </span>
            <input
              required
              maxLength={255}
              name="resident_name"
              value={form.resident_name}
              onChange={updateField}
              placeholder="Full name of the person being blottered"
              className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#2455D6] focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-bold text-slate-700">
                Incident type <span className="text-red-500">*</span>
              </span>
              <select
                required
                name="incident_type"
                value={form.incident_type}
                onChange={updateField}
                className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#2455D6] focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Select an incident type</option>
                {incidentTypes.map((incidentType) => (
                  <option key={incidentType}>{incidentType}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-bold text-slate-700">
                Status <span className="text-red-500">*</span>
              </span>
              <select
                name="status"
                value={form.status}
                onChange={updateField}
                className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#2455D6] focus:ring-2 focus:ring-blue-100"
              >
                <option value="open">Open</option>
                <option value="resolved">Resolved</option>
                <option value="referred">Referred</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-bold text-slate-700">
                Incident date <span className="text-red-500">*</span>
              </span>
              <input
                required
                type="date"
                name="incident_date"
                max={new Date().toLocaleDateString("en-CA")}
                value={form.incident_date}
                onChange={updateField}
                className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#2455D6] focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-slate-700">Incident time</span>
              <input
                type="time"
                name="incident_time"
                value={form.incident_time}
                onChange={updateField}
                className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#2455D6] focus:ring-2 focus:ring-blue-100"
              />
              <span className="mt-1 block text-[11px] text-slate-400">
                Time of day when the incident happened.
              </span>
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-bold text-slate-700">Location</span>
            <input
              maxLength={255}
              name="location"
              value={form.location}
              onChange={updateField}
              placeholder="Street, purok, or landmark"
              className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#2455D6] focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold text-slate-700">
              Narrative <span className="text-red-500">*</span>
            </span>
            <textarea
              required
              minLength={10}
              maxLength={5000}
              rows={4}
              name="narrative"
              value={form.narrative}
              onChange={updateField}
              placeholder="Describe what happened, who was involved, and the action taken."
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 outline-none focus:border-[#2455D6] focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold text-slate-700">Remarks</span>
            <textarea
              maxLength={2000}
              rows={2}
              name="remarks"
              value={form.remarks}
              onChange={updateField}
              placeholder="Optional notes, resolutions, or referrals"
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 outline-none focus:border-[#2455D6] focus:ring-2 focus:ring-blue-100"
            />
          </label>

          {error && (
            <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </p>
          )}
          </div>

          <div className="flex shrink-0 flex-col gap-2 border-t border-slate-100 px-6 py-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`${primaryButtonClass} disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {submitting ? (
                <>
                  <LoaderCircle size={15} className="animate-spin" aria-hidden="true" />
                  Saving entry...
                </>
              ) : (
                <>
                  <CircleAlert size={15} aria-hidden="true" />
                  Save blotter entry
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default BlotterManagement;
