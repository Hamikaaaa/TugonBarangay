import { useCallback, useEffect, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, Clock3, FileCheck2, FileText, Users } from "lucide-react";
import { Link } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import AdminPageHeader from "../../components/admin/AdminPageHeader";
import DocumentRequestTabs from "../../components/admin/DocumentRequestTabs";
import { useAuth } from "../../context/AuthContext";

const API_URL = "http://127.0.0.1:8000/api";

function AdminDocumentRequestsDashboard() {
  const { token } = useAuth();
  const [overview, setOverview] = useState(null);
  const [monthly, setMonthly] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const headers = authHeaders(token);
      const [overviewResponse, reportResponse, eventsResponse] = await Promise.all([
        fetch(`${API_URL}/admin/document-requests/overview`, { headers }),
        fetch(`${API_URL}/admin/reports?months=6`, { headers }),
        fetch(`${API_URL}/admin/document-request-events?per_page=8`, { headers }),
      ]);
      const [overviewPayload, reportPayload, eventsPayload] = await Promise.all([
        overviewResponse.json(),
        reportResponse.json(),
        eventsResponse.json(),
      ]);
      if (!overviewResponse.ok) throw new Error(overviewPayload.message || "Unable to load document request totals.");
      if (!reportResponse.ok) throw new Error(reportPayload.message || "Unable to load document request trends.");
      if (!eventsResponse.ok) throw new Error(eventsPayload.message || "Unable to load recent request activity.");
      setOverview(overviewPayload.data);
      setMonthly(reportPayload.monthly || []);
      setEvents(eventsPayload.data || []);
    } catch (loadError) {
      setError(loadError.message || "Unable to load the document request dashboard.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    // Refresh all document request dashboard panels together.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDashboard();
  }, [loadDashboard]);

  const cards = [
    { label: "All requests", value: overview?.total, detail: "Every document type", icon: FileText, tone: "blue" },
    { label: "Pending review", value: overview?.pending, detail: "Waiting for initial review", icon: Clock3, tone: "amber" },
    { label: "In progress", value: (overview?.under_review || 0) + (overview?.processing || 0), detail: "Review and preparation", icon: Activity, tone: "violet" },
    { label: "For correction", value: overview?.for_correction, detail: "Waiting for resident update", icon: AlertTriangle, tone: "red" },
    { label: "Ready for release", value: overview?.ready_for_release, detail: "Awaiting resident pickup", icon: FileCheck2, tone: "green" },
    { label: "Released", value: overview?.released, detail: "Marked as collected", icon: CheckCircle2, tone: "green" },
    { label: "Rejected", value: overview?.rejected, detail: "Closed requests", icon: AlertTriangle, tone: "red" },
    { label: "Delayed", value: overview?.delayed, detail: "No update in over 3 days", icon: Clock3, tone: "red" },
    { label: "Active workload", value: overview?.active, detail: "Not yet closed", icon: Users, tone: "blue" },
  ];

  return (
    <AdminLayout title="Document Request Dashboard">
      <section className="space-y-6 pt-6">
        <AdminPageHeader
          eyebrow="Document request oversight"
          title="Document request dashboard"
          description="Track request volume, processing status, staff workload, and activity across every document type."
        />
        <DocumentRequestTabs />

        {error && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{error}</span>
            <button type="button" onClick={loadDashboard} className="font-bold underline">Try again</button>
          </div>
        )}

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Document request totals">
          {cards.map(({ label, value, detail, icon: Icon, tone }) => (
            <article key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-slate-500">{label}</p>
                  <p className={`mt-2 text-3xl font-bold tabular-nums ${toneClass(tone)}`}>
                    {loading || value === undefined ? "—" : Number(value).toLocaleString()}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{detail}</p>
                </div>
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconToneClass(tone)}`}>
                  <Icon size={19} aria-hidden="true" />
                </span>
              </div>
            </article>
          ))}
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.8fr)]">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-bold text-[#172B4D]">Monthly request trend</h2>
                <p className="mt-1 text-xs text-slate-500">New document requests submitted in the last six months.</p>
              </div>
              <Link to="/admin/document-requests" className="text-xs font-bold text-[#2455D6] hover:underline">Open request history</Link>
            </div>
            <RequestTrendChart monthly={monthly} loading={loading} />
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-bold text-[#172B4D]">Staff workload</h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">Requests currently assigned to each document request officer.</p>
              </div>
              <Users size={18} className="text-[#2455D6]" aria-hidden="true" />
            </div>
            {overview?.staff_workload?.length ? (
              <ul className="mt-4 space-y-2">
                {overview.staff_workload.map((staff) => (
                  <li key={staff.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
                    <span className="truncate text-sm font-semibold text-slate-700">{staff.name}</span>
                    <span className="shrink-0 rounded-full bg-[#EEF4FF] px-2.5 py-1 text-xs font-bold text-[#2455D6]">{staff.active_requests} active</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">{loading ? "Loading staff workload..." : "No document request officers found."}</p>
            )}
          </article>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="font-bold text-[#172B4D]">Latest request activity</h2>
              <p className="mt-1 text-xs text-slate-500">Recent submissions and staff processing changes.</p>
            </div>
            <Link to="/admin/document-requests" className="text-xs font-bold text-[#2455D6] hover:underline">View full history</Link>
          </div>
          {loading && !events.length ? (
            <p className="p-6 text-center text-sm text-slate-500">Loading recent activity...</p>
          ) : events.length ? (
            <ol className="divide-y divide-slate-100">
              {events.map((event) => (
                <li key={event.id} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {activityLabel(event.action)} · {event.document_request?.document_type_label || event.document_request?.document_type || `Request #${event.document_request_id}`}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{event.actor_name || "System"} · Request #{event.document_request_id}</p>
                  </div>
                  <time className="shrink-0 text-xs text-slate-400" dateTime={event.created_at}>{formatDateTime(event.created_at)}</time>
                </li>
              ))}
            </ol>
          ) : (
            <p className="p-6 text-center text-sm text-slate-500">No request activity recorded yet.</p>
          )}
        </section>
      </section>
    </AdminLayout>
  );
}

function RequestTrendChart({ monthly, loading }) {
  if (loading && !monthly.length) return <p className="py-16 text-center text-sm text-slate-500">Loading request trend...</p>;
  if (!monthly.length || monthly.every((item) => Number(item.document_requests || 0) === 0)) {
    return <p className="py-16 text-center text-sm text-slate-500">No document request trend is available yet.</p>;
  }

  const width = 720;
  const height = 250;
  const left = 40;
  const right = 16;
  const top = 20;
  const bottom = 42;
  const max = Math.max(1, ...monthly.map((item) => Number(item.document_requests || 0)));
  const points = monthly.map((item, index) => {
    const x = left + (index * (width - left - right)) / Math.max(1, monthly.length - 1);
    const y = top + ((max - Number(item.document_requests || 0)) * (height - top - bottom)) / max;
    return { x, y, item };
  });
  const line = points.map(({ x, y }) => `${x},${y}`).join(" ");

  return (
    <div className="mt-4 overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto min-w-[560px] w-full" role="img" aria-label="Line chart of monthly document requests">
        {[0, 1, 2, 3].map((step) => {
          const y = top + (step * (height - top - bottom)) / 3;
          const value = Math.round(max - (step * max) / 3);
          return <g key={step}><line x1={left} x2={width - right} y1={y} y2={y} stroke="#E8EDF5" strokeDasharray="4 5" /><text x={left - 9} y={y + 4} textAnchor="end" fill="#94A3B8" fontSize="10">{value}</text></g>;
        })}
        <polyline points={line} fill="none" stroke="#2455D6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {points.map(({ x, y, item }) => <g key={item.month}><circle cx={x} cy={y} r="4" fill="white" stroke="#2455D6" strokeWidth="2.5"><title>{`${item.label}: ${item.document_requests} requests`}</title></circle></g>)}
        {points.map(({ x, item }, index) => index % 2 === 0 || index === points.length - 1 ? <text key={item.month} x={x} y={height - 12} textAnchor="middle" fill="#64748B" fontSize="10">{item.label}</text> : null)}
      </svg>
    </div>
  );
}

function authHeaders(token) {
  return { Accept: "application/json", Authorization: `Bearer ${token}` };
}

function toneClass(tone) {
  return { blue: "text-[#2455D6]", amber: "text-amber-600", violet: "text-violet-600", red: "text-red-600", green: "text-emerald-600" }[tone];
}

function iconToneClass(tone) {
  return { blue: "bg-[#EEF4FF] text-[#2455D6]", amber: "bg-amber-50 text-amber-600", violet: "bg-violet-50 text-violet-600", red: "bg-red-50 text-red-600", green: "bg-emerald-50 text-emerald-600" }[tone];
}

function activityLabel(action = "") {
  return { request_submitted: "Request submitted", request_resubmitted: "Correction resubmitted", status_changed: "Status updated", preview_generated: "Document generated", document_edited: "Document updated", fee_assessed: "Fee assessed" }[action] || action.replaceAll("_", " ");
}

function formatDateTime(date) {
  if (!date) return "Date unavailable";
  return new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila" }).format(new Date(date));
}

export default AdminDocumentRequestsDashboard;
