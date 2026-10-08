import {
  ChevronLeft,
  ChevronRight,
  MessageSquareText,
  Search,
  Star,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import AdminPageHeader from "../../components/admin/AdminPageHeader";
import { useAuth } from "../../context/AuthContext";
import { primaryButtonClass } from "../../utils/buttonStyles";

const API_URL = "http://127.0.0.1:8000/api";
const SERVICE_TYPES = [
  ["", "All services"],
  ["general", "General service"],
  ["document_request", "Document request"],
  ["complaint", "Complaint"],
  ["bantaybot", "BantayBot"],
];

function Feedback() {
  const { token } = useAuth();
  const [feedback, setFeedback] = useState([]);
  const [stats, setStats] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [rating, setRating] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadFeedback = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");

    const query = new URLSearchParams({
      page: String(page),
      per_page: "12",
    });
    if (search) query.set("search", search);
    if (serviceType) query.set("service_type", serviceType);
    if (rating) query.set("rating", rating);

    try {
      const response = await fetch(`${API_URL}/admin/feedback?${query}`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || "Unable to load resident feedback.");
      }
      setFeedback(payload.data || []);
      setStats(payload.stats || null);
      setLastPage(payload.last_page || 1);
      setTotal(payload.total || 0);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [page, rating, search, serviceType, token]);

  useEffect(() => {
    // Fetch feedback whenever the filters or current page change.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadFeedback();
  }, [loadFeedback]);

  const applySearch = (event) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const changeFilter = (update) => {
    setPage(1);
    update();
  };

  return (
    <AdminLayout title="Feedback">
      <section className="space-y-6 pt-6">
        <AdminPageHeader
          eyebrow="Resident voice"
          title="Feedback overview"
          description="Review resident ratings and comments about barangay services."
        />

        {error && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={loadFeedback}
              className="font-bold underline"
            >
              Try again
            </button>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total responses"
            value={stats?.total ?? "—"}
            icon={MessageSquareText}
          />
          <StatCard
            label="Average rating"
            value={stats ? `${Number(stats.average_rating).toFixed(1)} / 5` : "—"}
            icon={Star}
            tone="coral"
          />
          <StatCard
            label="5-star ratings"
            value={stats?.five_star ?? "—"}
            icon={ThumbsUp}
          />
          <StatCard
            label="Ratings 1–2"
            value={stats?.low_rating ?? "—"}
            icon={ThumbsDown}
            tone="coral"
          />
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4 sm:p-5">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h3 className="font-bold text-[#172B4D]">Resident responses</h3>
                <p className="mt-1 text-xs text-slate-500">
                  {total} {total === 1 ? "response" : "responses"} · newest first
                </p>
              </div>
              <form
                onSubmit={applySearch}
                className="flex flex-col gap-2 sm:flex-row"
              >
                <label className="relative min-w-0 flex-1 xl:w-64">
                  <span className="sr-only">
                    Search feedback, resident name, or email
                  </span>
                  <Search
                    className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                  <input
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Search feedback or resident"
                    className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-[#2455D6] focus:ring-2 focus:ring-[#2455D6]/10"
                  />
                </label>
                <label>
                  <span className="sr-only">Filter by service</span>
                  <select
                    value={serviceType}
                    onChange={(event) =>
                      changeFilter(() => setServiceType(event.target.value))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#2455D6] sm:w-48"
                  >
                    {SERVICE_TYPES.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="sr-only">Filter by rating</span>
                  <select
                    value={rating}
                    onChange={(event) =>
                      changeFilter(() => setRating(event.target.value))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#2455D6] sm:w-36"
                  >
                    <option value="">All ratings</option>
                    {[5, 4, 3, 2, 1].map((value) => (
                      <option key={value} value={value}>
                        {value} {value === 1 ? "star" : "stars"}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="submit"
                  className={primaryButtonClass}
                >
                  Search
                </button>
              </form>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3 p-5" role="status" aria-label="Loading feedback">
              <span className="sr-only">Loading resident feedback</span>
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-24 animate-pulse rounded-xl bg-slate-100"
                />
              ))}
            </div>
          ) : feedback.length ? (
            <div className="divide-y divide-slate-100">
              {feedback.map((item) => (
                <article key={item.id} className="p-4 sm:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[#172B4D]">
                        {item.resident?.name || "Resident account"}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {item.resident?.email || "Email unavailable"}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <ServiceBadge serviceType={item.service_type} />
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#EEF4FF] px-2.5 py-1 text-xs font-bold text-[#2455D6]">
                        <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                        {item.rating} / 5
                      </span>
                    </div>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
                    {item.comment?.trim() || (
                      <span className="italic text-slate-400">
                        No written comment provided.
                      </span>
                    )}
                  </p>
                  <time
                    dateTime={item.created_at}
                    className="mt-3 block text-xs text-slate-400"
                  >
                    Submitted {formatDateTime(item.created_at)}
                  </time>
                </article>
              ))}
            </div>
          ) : (
            <div className="px-5 py-14 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF4FF] text-[#2455D6]">
                <MessageSquareText className="h-5 w-5" aria-hidden="true" />
              </span>
              <h4 className="mt-4 text-sm font-bold text-[#172B4D]">
                {total ? "No matching feedback" : "No feedback received yet"}
              </h4>
              <p className="mt-1 text-sm text-slate-500">
                {total
                  ? "Try changing your search or filters."
                  : "Resident feedback will appear here when submitted."}
              </p>
            </div>
          )}

          {!loading && total > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 sm:px-5">
              <p className="text-xs text-slate-500">
                Page {page} of {lastPage}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Previous page"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-[#2455D6] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label="Next page"
                  disabled={page >= lastPage}
                  onClick={() =>
                    setPage((current) => Math.min(lastPage, current + 1))
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-[#2455D6] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}
        </section>
      </section>
    </AdminLayout>
  );
}

function StatCard({ label, value, icon: Icon, tone = "blue" }) {
  const tones = {
    blue: "bg-[#EEF4FF] text-[#2455D6]",
    coral: "bg-[#FFF0F0] text-[#E45757]",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-slate-500">{label}</p>
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tones[tone]}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-2 text-3xl font-bold text-[#172B4D]">{value}</p>
    </div>
  );
}

function ServiceBadge({ serviceType }) {
  const labels = {
    general: "General service",
    document_request: "Document request",
    complaint: "Complaint",
    bantaybot: "BantayBot",
  };

  return (
    <span className="rounded-full bg-[#EEF4FF] px-2.5 py-1 text-xs font-semibold text-[#2455D6]">
      {labels[serviceType] || serviceType.replaceAll("_", " ")}
    </span>
  );
}

function formatDateTime(value) {
  if (!value) return "Date unavailable";
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(new Date(value));
}

export default Feedback;
