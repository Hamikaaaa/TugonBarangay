import {
  Activity,
  CalendarDays,
  CheckCircle2,
  Download,
  FileText,
  MessageSquare,
  Star,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import AdminPageHeader from "../../components/admin/AdminPageHeader";
import { useAuth } from "../../context/AuthContext";

const API_URL = "http://127.0.0.1:8000/api";
const SERVICE_SERIES = [
  { key: "document_requests", label: "Document requests", color: "#2455D6" },
  { key: "complaints", label: "Complaints", color: "#7138E8" },
  { key: "chatbot_escalations", label: "Bot escalations", color: "#E52B32" },
];

function Reports() {
  const { token } = useAuth();
  const [months, setMonths] = useState("12");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReport = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `${API_URL}/admin/reports?months=${months}`,
        {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || "Unable to load cross-service reports.");
      }
      setReport(payload);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [months, token]);

  useEffect(() => {
    // Refresh the cross-service summary when the selected period changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadReport();
  }, [loadReport]);

  const totals = useMemo(() => {
    if (!report) return null;
    return report.monthly.reduce(
      (summary, month) => {
        for (const series of SERVICE_SERIES) {
          summary[series.key] += Number(month[series.key] || 0);
        }
        summary.new_residents += Number(month.new_residents || 0);
        summary.feedback += Number(month.feedback || 0);
        return summary;
      },
      {
        ...Object.fromEntries(SERVICE_SERIES.map(({ key }) => [key, 0])),
        new_residents: 0,
        feedback: 0,
      },
    );
  }, [report]);

  const exportCsv = () => {
    if (!report) return;
    const header = [
      "Month",
      ...SERVICE_SERIES.map((series) => series.label),
      "New residents",
      "Feedback responses",
      "Average feedback rating",
    ];
    const rows = [header, ...report.monthly.map((item) => [
      item.label,
      ...SERVICE_SERIES.map((series) => item[series.key]),
      item.new_residents,
      item.feedback,
      item.feedback_average_rating ?? "",
    ])];
    rows.push([
      "Selected period total",
      ...SERVICE_SERIES.map(({ key }) => totals[key]),
      totals.new_residents,
      totals.feedback,
      report.summary.feedback.average_rating,
    ]);
    rows.push([]);
    rows.push(["Outcome summary", "Total", "Completed / resolved", "Open / pending", "Rejected"]);
    rows.push([
      "Document requests",
      report.summary.document_requests.total,
      report.summary.document_requests.completed,
      "",
      report.summary.document_requests.rejected,
    ]);
    rows.push([
      "Complaints",
      report.summary.complaints.total,
      report.summary.complaints.resolved,
      report.summary.complaints.open,
      "",
    ]);
    rows.push([
      "BantayBot escalations",
      report.summary.chatbot_escalations.total,
      report.summary.chatbot_escalations.replied,
      report.summary.chatbot_escalations.pending,
      "",
    ]);
    rows.push([]);
    rows.push(["Additional measure", "Value"]);
    rows.push(["Average feedback rating", report.summary.feedback.average_rating]);
    rows.push(["Complaint category", "Count"]);
    report.complaint_categories.forEach(({ category, count }) =>
      rows.push([category, count]),
    );

    const csv = rows
      .map((row) => row.map(csvCell).join(","))
      .join("\r\n");
    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `barangay-cross-service-report-${report.period.start}-to-${report.period.end}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout title="Reports and Analytics">
      <section className="space-y-6 pt-6">
        <AdminPageHeader
          eyebrow="Barangay-wide insights"
          title="Reports and analytics"
          description="Compare service activity and community growth over time. This report combines monthly trends across the portal instead of repeating individual service work queues."
          footer={
            report && (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="whitespace-nowrap">Reporting period:</span>
                <span className="tabular-nums">
                  {formatDate(report.period.start)} –{" "}
                  {formatDate(report.period.end)}
                </span>
                {loading && (
                  <span
                    className="ml-auto inline-flex items-center gap-1.5 text-white/80"
                    role="status"
                  >
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                    Updating report
                  </span>
                )}
              </div>
            )
          }
        >
          <label className="flex min-h-12 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 text-sm text-white backdrop-blur-sm">
            <CalendarDays className="h-4 w-4 text-white/80" aria-hidden="true" />
            <span className="sr-only">Reporting period</span>
            <select
              value={months}
              onChange={(event) => setMonths(event.target.value)}
              className="bg-transparent font-semibold text-white outline-none [&>option]:text-[#172B4D]"
            >
              <option value="6">Last 6 months</option>
              <option value="12">Last 12 months</option>
              <option value="24">Last 24 months</option>
            </select>
          </label>
          <button
            type="button"
            onClick={exportCsv}
            disabled={!report || loading}
            className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-[#2455D6] shadow-lg transition hover:-translate-y-0.5 hover:bg-[#EEF4FF] hover:shadow-xl active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Export CSV
          </button>
        </AdminPageHeader>

        {error && (
          <div
            role="alert"
            className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={loadReport}
              className="font-bold underline"
            >
              Try again
            </button>
          </div>
        )}

        {loading && !report ? (
          <div
            className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
            role="status"
            aria-label="Loading reports"
          >
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-white shadow-sm"
              />
            ))}
          </div>
        ) : report && totals ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                title="Service interactions"
                value={totals.document_requests + totals.complaints + totals.chatbot_escalations}
                detail="Requests, complaints, and bot escalations"
                icon={Activity}
                tone="blue"
              />
              <SummaryCard
                title="New residents"
                value={totals.new_residents}
                detail={`Registered in the last ${report.period.months} months`}
                icon={Users}
                tone="navy"
              />
              <SummaryCard
                title="Resolved / replied"
                value={
                  report.summary.document_requests.completed +
                  report.summary.complaints.resolved +
                  report.summary.chatbot_escalations.replied
                }
                detail="Across document, complaint, and bot services"
                icon={CheckCircle2}
                tone="coral"
              />
              <SummaryCard
                title="Average feedback"
                value={`${Number(report.summary.feedback.average_rating).toFixed(1)} / 5`}
                detail={`${report.summary.feedback.total} resident ratings`}
                icon={Star}
                tone="purple"
              />
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="font-bold text-[#172B4D]">
                    Monthly service activity
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Submissions and resident activity by month
                  </p>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  {SERVICE_SERIES.map((series) => (
                    <span
                      key={series.key}
                      className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600"
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-sm"
                        style={{ backgroundColor: series.color }}
                      />
                      {series.label}
                    </span>
                  ))}
                </div>
              </div>
              {report.monthly.length ? (
                <MonthlyActivityChart monthly={report.monthly} />
              ) : (
                <EmptyState message="No monthly activity found for this period." />
              )}
            </section>

            <div className="grid gap-5 xl:grid-cols-2">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div>
                  <h3 className="font-bold text-[#172B4D]">
                    Resident registrations
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    New accounts created each month
                  </p>
                </div>
                <MonthlyMetricChart
                  monthly={report.monthly}
                  metricKey="new_residents"
                  color="#123F70"
                />
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-[#172B4D]">
                      Average feedback rating
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Monthly resident rating, on a 1–5 scale
                    </p>
                  </div>
                  <span className="rounded-xl bg-[#FFF0F0] px-3 py-1.5 text-sm font-bold text-[#E45757]">
                    {Number(report.summary.feedback.average_rating).toFixed(1)}
                    <span className="ml-1 text-xs font-semibold">/ 5</span>
                  </span>
                </div>
                <MonthlyMetricChart
                  monthly={report.monthly}
                  metricKey="feedback_average_rating"
                  color="#E45757"
                  maxValue={5}
                  suffix="/5"
                  precision={1}
                  emptyValue={null}
                />
                <p className="mt-1 text-right text-[10px] text-slate-400">
                  {report.summary.feedback.total} responses in this period
                </p>
              </section>
            </div>

            <div className="grid gap-5 xl:grid-cols-2">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#2455D6]" aria-hidden="true" />
                  <h3 className="font-bold text-[#172B4D]">Service outcomes</h3>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Outcomes for records created within the selected period
                </p>
                <div className="mt-4 space-y-3">
                  <OutcomeRow
                    label="Document requests"
                    total={report.summary.document_requests.total}
                    complete={report.summary.document_requests.completed}
                    pending={null}
                    rejected={report.summary.document_requests.rejected}
                  />
                  <OutcomeRow
                    label="Complaints"
                    total={report.summary.complaints.total}
                    complete={report.summary.complaints.resolved}
                    pending={report.summary.complaints.open}
                    rejected={null}
                  />
                  <OutcomeRow
                    label="BantayBot escalations"
                    total={report.summary.chatbot_escalations.total}
                    complete={report.summary.chatbot_escalations.replied}
                    pending={report.summary.chatbot_escalations.pending}
                    rejected={null}
                  />
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-[#7138E8]" aria-hidden="true" />
                  <h3 className="font-bold text-[#172B4D]">
                    Complaint categories
                  </h3>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Most common complaint topics in the selected period
                </p>
                {report.complaint_categories.length ? (
                  <CategoryBreakdown categories={report.complaint_categories} />
                ) : (
                  <EmptyState message="No complaints were submitted in this period." />
                )}
              </section>
            </div>
          </>
        ) : (
          !loading && (
            <EmptyState message="Report data is not available right now." />
          )
        )}
      </section>
    </AdminLayout>
  );
}

function MonthlyMetricChart({
  monthly,
  metricKey,
  color,
  maxValue = null,
  suffix = "",
  precision = 0,
  emptyValue = 0,
}) {
  const values = monthly.map((month) => month[metricKey]);
  const observedMax = Math.max(
    1,
    ...values.map((value) => Number(value ?? 0)),
  );
  const scaleMax = maxValue || observedMax;
  const hasData = values.some((value) => value !== null && value !== undefined);

  if (!hasData) {
    return <EmptyState message="No data available for this metric in the selected period." />;
  }

  return (
    <div className="mt-6">
      <div
        className="overflow-x-auto pb-3"
        role="region"
        aria-label="Monthly metric chart; scroll horizontally to see all months"
        tabIndex={0}
      >
        <div
          className="grid min-w-[420px] gap-2"
          style={{
            gridTemplateColumns: `repeat(${monthly.length}, minmax(28px, 1fr))`,
          }}
        >
          {monthly.map((month) => {
            const value = month[metricKey] ?? emptyValue;
            const numericValue = Number(value || 0);
            return (
              <div
                key={month.month}
                className="flex min-w-0 flex-col items-center"
                role="img"
                aria-label={`${month.label}: ${value === null ? "no rating" : `${numericValue.toFixed(precision)}${suffix ? ` ${suffix}` : ""}`}`}
                title={`${month.label}: ${value === null ? "No rating" : `${numericValue.toFixed(precision)}${suffix ? ` ${suffix}` : ""}`}`}
              >
                <span className="mb-2 text-[10px] font-bold text-[#172B4D]">
                  {value === null ? "—" : numericValue.toFixed(precision)}
                </span>
                <div
                  className="flex h-36 w-full max-w-8 items-end overflow-hidden rounded-t-md bg-[#F7F9FC]"
                  style={{
                    backgroundImage:
                      "linear-gradient(to top, transparent calc(100% - 1px), #E8EDF4 calc(100% - 1px))",
                    backgroundSize: "100% 25%",
                  }}
                >
                  {value !== null && numericValue > 0 && (
                    <span
                      className="w-full rounded-t-md"
                      style={{
                        height: `${Math.max(3, (numericValue / scaleMax) * 100)}%`,
                        backgroundColor: color,
                      }}
                    />
                  )}
                </div>
                <span className="mt-2 whitespace-nowrap text-[9px] font-medium leading-3 text-slate-500">
                  {month.label.replace(/ (\d{2})\d{2}$/, " '$1")}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <p className="mt-1 text-right text-[10px] text-slate-400 sm:hidden">
        Swipe to view all months
      </p>
    </div>
  );
}

function MonthlyActivityChart({ monthly }) {
  const maxTotal = Math.max(
    1,
    ...monthly.map((month) =>
      SERVICE_SERIES.reduce((sum, { key }) => sum + Number(month[key] || 0), 0),
    ),
  );

  return (
    <div className="mt-6">
      <div
        className="overflow-x-auto pb-3"
        role="region"
        aria-label="Monthly service activity chart; scroll horizontally to see all months"
        tabIndex={0}
      >
        <div
          className="grid min-w-[680px] gap-2"
          style={{
            gridTemplateColumns: `repeat(${monthly.length}, minmax(38px, 1fr))`,
          }}
        >
          {monthly.map((month) => {
            const total = SERVICE_SERIES.reduce(
              (sum, { key }) => sum + Number(month[key] || 0),
              0,
            );
            return (
              <div
                key={month.month}
                className="flex min-w-0 flex-col items-center"
                role="img"
                aria-label={`${month.label}: ${total} total activities`}
                title={`${month.label}: ${total} activities`}
              >
                <span className="mb-2 text-[10px] font-bold text-[#172B4D]">
                  {total}
                </span>
                <div
                  className="flex h-40 w-full max-w-10 items-end overflow-hidden rounded-t-md bg-[#F7F9FC]"
                  style={{
                    backgroundImage:
                      "linear-gradient(to top, transparent calc(100% - 1px), #E8EDF4 calc(100% - 1px))",
                    backgroundSize: "100% 25%",
                  }}
                >
                  <div
                    className="flex w-full flex-col-reverse overflow-hidden rounded-t-md"
                    style={{ height: `${total ? Math.max(3, (total / maxTotal) * 100) : 0}%` }}
                  >
                    {SERVICE_SERIES.map((series) => {
                      const count = Number(month[series.key] || 0);
                      if (!count || !total) return null;
                      return (
                        <span
                          key={series.key}
                          style={{
                            height: `${(count / total) * 100}%`,
                            backgroundColor: series.color,
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
                <span className="mt-2 whitespace-nowrap text-[9px] font-medium leading-3 text-slate-500">
                  {month.label.replace(/ (\d{2})\d{2}$/, " '$1")}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <p className="mt-1 text-right text-[10px] text-slate-400 sm:hidden">
        Swipe to view all months
      </p>
    </div>
  );
}

function SummaryCard({ title, value, detail, icon: Icon, tone }) {
  const tones = {
    blue: "bg-[#EEF4FF] text-[#2455D6]",
    navy: "bg-[#EAF1F8] text-[#123F70]",
    coral: "bg-[#FFF0F0] text-[#E45757]",
    purple: "bg-[#F3EEFF] text-[#7138E8]",
  };

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-[#172B4D]">{value}</p>
        </div>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p>
    </article>
  );
}

function OutcomeRow({ label, total, complete, pending, rejected }) {
  return (
    <div className="rounded-xl bg-[#F7F9FC] p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-[#172B4D]">{label}</span>
        <span className="text-xs font-bold text-slate-500">{total} total</span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700">
          {complete} completed
        </span>
        {pending !== null && (
          <span className="inline-flex items-center rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700">
            {pending} pending/open
          </span>
        )}
        {rejected !== null && (
          <span className="inline-flex items-center rounded-lg bg-[#FFF0F0] px-2.5 py-1.5 text-xs font-semibold text-[#E45757]">
            {rejected} rejected
          </span>
        )}
      </div>
    </div>
  );
}

function CategoryBreakdown({ categories }) {
  const maxCount = Math.max(1, ...categories.map((item) => item.count));
  return (
    <ul className="mt-4 space-y-3">
      {categories.map((item) => (
        <li key={item.category}>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="truncate font-semibold text-slate-700">
              {item.category}
            </span>
            <span className="shrink-0 text-xs font-bold text-slate-500">
              {item.count}
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#2455D6] via-[#7138E8] to-[#E52B32]"
              style={{ width: `${(item.count / maxCount) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function EmptyState({ message }) {
  return (
    <p className="mt-5 rounded-xl bg-[#F7F9FC] px-4 py-8 text-center text-sm text-slate-500">
      {message}
    </p>
  );
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function formatDate(value) {
  if (!value) return "Date unavailable";
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeZone: "Asia/Manila",
  }).format(new Date(`${value}T00:00:00`));
}

export default Reports;
