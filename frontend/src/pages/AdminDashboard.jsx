import { useCallback, useEffect, useState } from "react";
import { Activity, ClipboardList, FileCheck2, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";
import AdminLayout from "../components/admin/AdminLayout";
import AdminPageHeader from "../components/admin/AdminPageHeader";
import { useAuth } from "../context/AuthContext";

const API_URL = "http://127.0.0.1:8000/api";

function AdminDashboard() {
  const { token } = useAuth();
  const [overview, setOverview] = useState(null);
  const [residentStats, setResidentStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");

    try {
      const headers = authHeaders(token);
      const [overviewResponse, residentsResponse, activityResponse] = await Promise.all([
        fetch(`${API_URL}/admin/document-requests/overview`, { headers }),
        fetch(`${API_URL}/admin/residents/registry-stats`, { headers }),
        fetch(`${API_URL}/admin/document-request-events?per_page=6`, { headers }),
      ]);
      const [overviewPayload, residentsPayload, activityPayload] = await Promise.all([
        overviewResponse.json(),
        residentsResponse.json(),
        activityResponse.json(),
      ]);

      if (!overviewResponse.ok) throw new Error(overviewPayload.message || "Unable to load document request statistics.");
      if (!residentsResponse.ok) throw new Error(residentsPayload.message || "Unable to load resident statistics.");
      if (!activityResponse.ok) throw new Error(activityPayload.message || "Unable to load recent activity.");
      if (!Array.isArray(activityPayload.data)) throw new Error("The server returned an invalid recent activity list.");

      setOverview(overviewPayload.data);
      setResidentStats(residentsPayload);
      setActivity(activityPayload.data);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDashboard();
  }, [loadDashboard]);

  const cards = [
    { label: "Document requests", value: overview?.total, note: "All submitted requests", icon: ClipboardList, tone: "blue" },
    { label: "Active requests", value: overview?.active, note: "Currently being processed", icon: Activity, tone: "amber" },
    { label: "Released documents", value: overview?.released, note: "Ready or collected", icon: FileCheck2, tone: "emerald" },
    { label: "Verified residents", value: residentStats?.verified_total, note: "Resident accounts verified", icon: UsersRound, tone: "violet" },
  ];

  return (
    <AdminLayout title="Dashboard">
      <section className="space-y-6 pt-6">
        <AdminPageHeader
          eyebrow="Admin overview"
          title="Dashboard"
          description="A read-only overview of resident registrations, document requests, and recent processing activity."
        />

        {error && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{error}</span>
            <button type="button" onClick={loadDashboard} className="font-bold underline">Try again</button>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map(({ label, value, note, icon: Icon, tone }) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-slate-500">{label}</p>
                  <p className={`mt-2 text-3xl font-bold ${toneClass(tone)}`}>
                    {loading || value === undefined || value === null ? "—" : Number(value).toLocaleString()}
                  </p>
                </div>
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconToneClass(tone)}`}>
                  <Icon size={19} aria-hidden="true" />
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-500">{note}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="font-bold text-[#172B4D]">Recent document activity</h2>
              <p className="mt-1 text-xs text-slate-500">Latest recorded request and staff actions.</p>
            </div>
            {loading ? (
              <p className="p-8 text-center text-sm text-slate-500">Loading recent activity...</p>
            ) : activity.length ? (
              <ol className="divide-y divide-slate-100">
                {activity.map((event) => (
                  <li key={event.id} className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {activityLabel(event.action)} · {event.document_request?.document_type_label || event.document_request?.document_type || `Request #${event.document_request_id}`}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {event.actor_name || "System"}{event.actor_role ? ` · ${event.actor_role}` : ""} · Request #{event.document_request_id}
                      </p>
                    </div>
                    <time className="shrink-0 text-xs text-slate-400" dateTime={event.created_at}>
                      {formatDateTime(event.created_at)}
                    </time>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="p-8 text-center text-sm text-slate-500">No document activity has been recorded yet.</p>
            )}
          </section>

          <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-bold text-[#172B4D]">Overview links</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">Open the dedicated pages to review records and manage system settings.</p>
            <div className="mt-4 grid gap-2">
              <OverviewLink to="/admin/residents/verification" label="Review resident verification" value={residentStats ? `${residentStats.pending_total} pending` : undefined} />
              <OverviewLink to="/admin/document-requests" label="Review document requests" value={overview ? `${overview.pending} pending` : undefined} />
              <OverviewLink to="/admin/complaints" label="Open complaints dashboard" />
            </div>
          </aside>
        </div>

        <section className="rounded-2xl border border-[#D9E6FF] bg-[#EEF4FF] px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-[#172B4D]">Requests needing attention</h2>
              <p className="mt-1 text-xs text-[#55708F]">
                {overview
                  ? `${overview.delayed} delayed · ${overview.pending} pending · ${overview.for_correction} awaiting resident correction`
                  : loading ? "Loading request statistics..." : "Request statistics are unavailable."}
              </p>
            </div>
            <Link to="/admin/document-requests" className="rounded-lg border border-[#D9E6FF] bg-white px-3 py-2 text-xs font-bold text-[#2455D6] hover:bg-[#F6F8FC]">
              View document request history
            </Link>
          </div>
        </section>
      </section>
    </AdminLayout>
  );
}

function OverviewLink({ to, label, value }) {
  return (
    <Link to={to} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-3 transition hover:border-[#D9E6FF] hover:bg-[#F6F8FC]">
      <span className="text-xs font-semibold text-slate-700">{label}</span>
      {value && <span className="shrink-0 text-[10px] font-bold text-[#2455D6]">{value}</span>}
    </Link>
  );
}

function authHeaders(token) {
  return {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
}

function toneClass(tone) {
  return {
    blue: "text-[#2455D6]",
    amber: "text-amber-600",
    emerald: "text-emerald-600",
    violet: "text-violet-600",
  }[tone];
}

function iconToneClass(tone) {
  return {
    blue: "bg-[#EEF4FF] text-[#2455D6]",
    amber: "bg-amber-50 text-amber-600",
    emerald: "bg-emerald-50 text-emerald-600",
    violet: "bg-violet-50 text-violet-600",
  }[tone];
}

function activityLabel(action = "") {
  return {
    request_submitted: "Request submitted",
    request_resubmitted: "Correction resubmitted",
    status_changed: "Status updated",
    preview_generated: "Document generated",
    document_edited: "Document updated",
    fee_assessed: "Fee assessed",
  }[action] || action.replaceAll("_", " ");
}

function formatDateTime(date) {
  if (!date) return "Date unavailable";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

export default AdminDashboard;
