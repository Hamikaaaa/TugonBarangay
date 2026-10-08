import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Download,
  FileText,
  MapPin,
  Paperclip,
  Upload,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  downloadResidentFile,
  inputClass,
  primaryButtonClass,
  residentApi,
} from "../../services/residentApi";
import FeedbackPrompt from "../../components/resident/FeedbackPrompt";
import { COMPLAINT_CATEGORIES } from "../../constants/complaintCategories";

const EMPTY_FORM = {
  category: "",
  custom_category: "",
  subject: "",
  incident_date: "",
  location: "",
  description: "",
  relevant_information: "",
};

function formatDate(value) {
  if (!value) return "Not provided";
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? "Not provided"
    : date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
}

function StatusBadge({ status }) {
  const normalized = (status || "pending").replaceAll("_", " ").toLowerCase();
  const resolved = ["resolved", "closed"].includes(normalized);
  const processing = ["under review", "in progress"].includes(normalized);
  const rejected = normalized === "rejected";
  const classes = resolved
    ? "bg-[#ECF9F1] text-[#21864A]"
    : rejected
      ? "bg-[#FFF0EE] text-[#C74444]"
      : processing
        ? "bg-[#EEF4FF] text-[#2455D6]"
        : "bg-[#FFF7E7] text-[#B87900]";

  return (
    <span
      className={`w-fit rounded-full px-3 py-1.5 text-xs font-bold capitalize ${classes}`}
    >
      {normalized}
    </span>
  );
}

function Detail({ label, value, wide = false }) {
  return (
    <div className={`min-w-0 ${wide ? "sm:col-span-2" : ""}`}>
      <dt className="text-[11px] font-semibold uppercase text-[#55708F]">
        {label}
      </dt>
      <dd className="mt-1 whitespace-pre-wrap break-words text-sm text-[#172B4D]">
        {value || "Not provided"}
      </dd>
    </div>
  );
}

function ComplaintRow({ complaint, token }) {
  const [expanded, setExpanded] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const detailsId = `complaint-${complaint.id}-details`;

  const downloadEvidence = async () => {
    setDownloading(true);
    setDownloadError("");
    try {
      await downloadResidentFile(
        `/resident/complaints/${complaint.id}/evidence`,
        token,
        `CMP-${String(complaint.id).padStart(5, "0")}-evidence`,
      );
    } catch (error) {
      setDownloadError(error.message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <article className="py-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF0EE] text-[#C74444]">
            <CircleAlert
              className="h-5 w-5"
              strokeWidth={1.8}
              aria-hidden="true"
            />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-bold text-[#172B4D]">
              {complaint.subject}
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              CMP-{String(complaint.id).padStart(5, "0")}{" "}
              <span aria-hidden="true">·</span> Submitted{" "}
              {formatDate(complaint.created_at)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {complaint.priority === "urgent" && (
            <span className="rounded-full bg-[#FFF0EE] px-3 py-1.5 text-xs font-bold text-[#C74444]">
              Priority review
            </span>
          )}
          <StatusBadge status={complaint.status} />
        </div>
      </div>

      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={detailsId}
        onClick={() => setExpanded((current) => !current)}
        className="mt-3 inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-[#2455D6] transition hover:bg-[#2455D6]/5"
      >
        <ChevronDown
          className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
        {expanded ? "Hide details" : "View details"}
      </button>

      {expanded && (
        <div
          id={detailsId}
          className="mt-3 rounded-xl border border-[#E6ECF5] bg-[#F6F1FD]/40 p-4"
        >
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <Detail label="Category" value={complaint.category} />
            <Detail
              label="Priority"
              value={
                complaint.priority === "urgent"
                  ? "Urgent review flagged"
                  : "Normal review"
              }
            />
            <Detail
              label="Incident date"
              value={formatDate(complaint.incident_date)}
            />
            <Detail label="Location" value={complaint.location} />
            <Detail
              label="Submitted"
              value={formatDate(complaint.created_at)}
            />
            <Detail label="Description" value={complaint.description} wide />
            {complaint.relevant_information && (
              <Detail
                label="Additional information"
                value={complaint.relevant_information}
                wide
              />
            )}
            {complaint.staff_remarks && (
              <Detail
                label="Staff remarks"
                value={complaint.staff_remarks}
                wide
              />
            )}
            {complaint.resolution_details && (
              <Detail
                label={
                  complaint.status === "rejected"
                    ? "Reason provided"
                    : "Staff update"
                }
                value={complaint.resolution_details}
                wide
              />
            )}
          </dl>

          {complaint.evidence_path && (
            <div className="mt-4 border-t border-[#E6ECF5] pt-4">
              <button
                type="button"
                onClick={downloadEvidence}
                disabled={downloading}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-[#2455D6] transition hover:border-[#2455D6]/40 disabled:cursor-wait disabled:opacity-60"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                {downloading
                  ? "Preparing file..."
                  : "Download attached evidence"}
              </button>
              {downloadError && (
                <p
                  role="alert"
                  className="mt-2 text-xs font-medium text-red-700"
                >
                  {downloadError}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

function Complaints({ token, complaints = [], onRefresh, verified }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [complaintCategories, setComplaintCategories] = useState(COMPLAINT_CATEGORIES);
  const [evidence, setEvidence] = useState(null);
  const [message, setMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [history, setHistory] = useState(complaints);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyMeta, setHistoryMeta] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
  });
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");
  const [reloadHistory, setReloadHistory] = useState(0);
  const fileInput = useRef(null);

  useEffect(() => {
    let active = true;

    residentApi("/resident/complaint-categories", token)
      .then((result) => {
        if (active) setComplaintCategories(result.data || []);
      })
      .catch(() => {
        if (active) setComplaintCategories(COMPLAINT_CATEGORIES);
      });

    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    let active = true;

    residentApi(`/resident/complaints?page=${historyPage}`, token)
      .then((result) => {
        if (!active) return;
        setHistoryError("");
        setHistory(result.data || []);
        setHistoryMeta({
          current_page: result.current_page || 1,
          last_page: result.last_page || 1,
          total: result.total || 0,
        });
      })
      .catch((error) => {
        if (active) setHistoryError(error.message);
      })
      .finally(() => {
        if (active) setHistoryLoading(false);
      });

    return () => {
      active = false;
    };
  }, [historyPage, reloadHistory, token]);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const submitComplaint = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    const formData = new FormData();
    const category =
      form.category === "Other Barangay Concern"
        ? form.custom_category
        : form.category;
    Object.entries({ ...form, category }).forEach(([key, value]) => {
      if (key !== "custom_category" && value !== "") {
        formData.append(key, value.trim());
      }
    });
    if (evidence) formData.append("evidence", evidence);

    try {
      const result = await residentApi("/resident/complaints", token, {
        method: "POST",
        body: formData,
      });
      setMessage({
        type: "success",
        text:
          result.complaint.priority === "urgent"
            ? `Complaint submitted and flagged for priority staff review. Your reference number is CMP-${String(result.complaint.id).padStart(5, "0")}.`
            : `Complaint submitted. Your reference number is CMP-${String(result.complaint.id).padStart(5, "0")}.`,
      });
      setFeedbackOpen(true);
      setForm(EMPTY_FORM);
      setEvidence(null);
      if (fileInput.current) fileInput.current.value = "";
      setHistoryPage(1);
      setHistoryLoading(true);
      setReloadHistory((current) => current + 1);
      try {
        await onRefresh?.();
      } catch {
        // The complaint is already saved; history has its own refresh error state.
      }
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  const selectEvidence = (event) => {
    const file = event.target.files?.[0] || null;
    if (file && file.size > 5 * 1024 * 1024) {
      setEvidence(null);
      event.target.value = "";
      setMessage({
        type: "error",
        text: "Evidence files must be 5 MB or smaller.",
      });
      return;
    }
    setMessage(null);
    setEvidence(file);
  };

  const changeHistoryPage = (page) => {
    setHistoryLoading(true);
    setHistoryPage(page);
  };

  const retryHistory = () => {
    setHistoryLoading(true);
    setReloadHistory((current) => current + 1);
  };

  return (
    <div className="space-y-6 pb-8">
      <header className="relative overflow-hidden rounded-[28px] border border-white/70 bg-white/70 px-6 py-7 shadow-[0_8px_28px_rgba(18,63,112,0.05)] backdrop-blur-sm sm:px-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-[#2455D6]/5 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 right-32 h-48 w-48 rounded-full bg-[#E52B32]/5 blur-2xl" />
        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#C74444] text-white">
              <CircleAlert
                className="h-7 w-7"
                strokeWidth={1.8}
                aria-hidden="true"
              />
            </span>
            <div>
              <p className="text-sm font-medium text-[#41658A]">
                Resident services
              </p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#123F70] sm:text-4xl">
                Complaints
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                Report a community concern and follow its progress with barangay
                staff.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              document
                .getElementById("new-complaint")
                ?.scrollIntoView({ behavior: "smooth" })
            }
            className={primaryButtonClass}
          >
            <CircleAlert className="h-4 w-4" aria-hidden="true" />
            Start a complaint
          </button>
        </div>
      </header>

      <section className="rounded-[26px] border border-slate-200/80 bg-white/90 p-6 shadow-[0_8px_28px_rgba(18,63,112,0.06)] backdrop-blur-sm sm:p-8">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-[#172B4D]">
            Report a concern
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Include clear details so the right barangay personnel can review it.
          </p>
        </div>

        {!verified && (
          <div className="mt-5 flex gap-3 rounded-xl border border-[#F1D9A8] bg-[#FFF7E7] p-4 text-sm text-[#805900]">
            <AlertCircle
              className="mt-0.5 h-5 w-5 shrink-0"
              aria-hidden="true"
            />
            <p>
              Your account must be verified before you can submit a complaint.
              You can still view your complaint history below.
            </p>
          </div>
        )}

        <div className="mt-5 rounded-xl bg-[#F3F6FB] px-4 py-3 text-sm leading-6 text-[#41658A]">
          Reports describing an ongoing serious disturbance, escalating
          conflict, threats, or violence are flagged for priority staff review.
          This flag does not replace contacting emergency services when someone
          is in immediate danger.
        </div>

        <form id="new-complaint" className="mt-6" onSubmit={submitComplaint}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-bold text-slate-700">
                Category <span className="text-[#C74444">*</span>
              </span>
              <select
                required
                name="category"
                value={form.category}
                onChange={updateField}
                className={inputClass}
              >
                <option value="">Select a category</option>
                {complaintCategories.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </label>
            {form.category === "Other Barangay Concern" && (
              <label className="block">
                <span className="text-sm font-bold text-slate-700">
                  Describe the category <span className="text-[#C74444">*</span>
                </span>
                <input
                  required
                  maxLength={255}
                  name="custom_category"
                  value={form.custom_category}
                  onChange={updateField}
                  placeholder="What type of concern is this?"
                  className={inputClass}
                />
              </label>
            )}
            <label
              className={`block ${form.category === "Other Barangay Concern" ? "sm:col-span-2" : ""}`}
            >
              <span className="text-sm font-bold text-slate-700">
                Subject <span className="text-[#C74444">*</span>
              </span>
              <input
                required
                maxLength={255}
                name="subject"
                value={form.subject}
                onChange={updateField}
                placeholder="Summarize the concern"
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-slate-700">
                Date of incident{" "}
                <span className="font-normal text-slate-400">(optional)</span>
              </span>
              <input
                type="date"
                name="incident_date"
                max={new Date().toLocaleDateString("en-CA")}
                value={form.incident_date}
                onChange={updateField}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-slate-700">
                Location{" "}
                <span className="font-normal text-slate-400">(optional)</span>
              </span>
              <span className="relative block">
                <MapPin
                  className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  maxLength={255}
                  name="location"
                  value={form.location}
                  onChange={updateField}
                  placeholder="Street, purok, or landmark"
                  className={`${inputClass} pl-10`}
                />
              </span>
            </label>
          </div>

          <label className="mt-5 block">
            <span className="text-sm font-bold text-slate-700">
              What happened? <span className="text-[#C74444">*</span>
            </span>
            <textarea
              required
              minLength={10}
              maxLength={5000}
              rows={5}
              name="description"
              value={form.description}
              onChange={updateField}
              placeholder="Describe what happened, when it happened, and who or what was affected."
              className={inputClass}
            />
            <span className="mt-1 block text-right text-xs text-slate-400">
              {form.description.length}/5000
            </span>
          </label>

          <label className="mt-4 block">
            <span className="text-sm font-bold text-slate-700">
              Additional information{" "}
              <span className="font-normal text-slate-400">(optional)</span>
            </span>
            <textarea
              maxLength={5000}
              rows={3}
              name="relevant_information"
              value={form.relevant_information}
              onChange={updateField}
              placeholder="Add witnesses, previous reports, or other context."
              className={inputClass}
            />
          </label>

          <div className="mt-5">
            <p className="text-sm font-bold text-slate-700">
              Supporting evidence{" "}
              <span className="font-normal text-slate-400">(optional)</span>
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Attach one PDF or image (JPG or PNG), up to 5 MB.
            </p>
            <input
              ref={fileInput}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              onChange={selectEvidence}
              className="sr-only"
              id="complaint-evidence"
            />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label
                htmlFor="complaint-evidence"
                className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-[#2455D6] shadow-sm transition hover:border-[#2455D6]/40 hover:bg-[#2455D6]/5"
              >
                <Upload className="h-4 w-4" aria-hidden="true" /> Choose file
              </label>
              {evidence ? (
                <span className="inline-flex min-w-0 items-center gap-2 text-sm text-slate-600">
                  <Paperclip
                    className="h-4 w-4 shrink-0 text-[#2455D6]"
                    aria-hidden="true"
                  />
                  <span className="max-w-[240px] truncate">
                    {evidence.name}
                  </span>
                  <span className="text-xs text-slate-400">
                    ({(evidence.size / 1024 / 1024).toFixed(1)} MB)
                  </span>
                </span>
              ) : (
                <span className="text-sm text-slate-400">No file selected</span>
              )}
            </div>
          </div>

          <div className="mt-6 flex gap-3 rounded-xl bg-[#F3F6FB] p-4 text-sm leading-6 text-[#41658A]">
            <CheckCircle2
              className="mt-0.5 h-5 w-5 shrink-0 text-[#2455D6]"
              aria-hidden="true"
            />
            <p>
              Your complaint is visible to authorized barangay personnel.
              Investigation notes are not shared publicly.
            </p>
          </div>

          {message && (
            <p
              role={message.type === "error" ? "alert" : "status"}
              className={`mt-4 rounded-xl px-4 py-3 text-sm font-semibold ${message.type === "error" ? "bg-red-50 text-red-800" : "bg-[#ECF9F1] text-[#21864A]"}`}
            >
              {message.text}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || !verified}
            className={`${primaryButtonClass} mt-5`}
          >
            {submitting ? "Submitting complaint..." : "Submit complaint"}
          </button>
        </form>
      </section>

      <section className="overflow-hidden rounded-[26px] border border-slate-200/80 bg-white/90 shadow-[0_8px_28px_rgba(18,63,112,0.06)] backdrop-blur-sm">
        <div className="border-b border-slate-100 px-6 py-5 sm:px-8">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-[#172B4D]">
                Complaint history
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                {historyMeta.total}{" "}
                {historyMeta.total === 1 ? "complaint" : "complaints"} submitted
              </p>
            </div>
            <p className="text-xs text-slate-400">
              Select a complaint to view its details and staff updates
            </p>
          </div>
        </div>

        {historyLoading ? (
          <div
            className="space-y-4 px-6 py-7 sm:px-8"
            aria-label="Loading complaint history"
          >
            <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
          </div>
        ) : historyError ? (
          <div className="px-6 py-12 text-center">
            <p role="alert" className="text-sm text-red-700">
              {historyError}
            </p>
            <button
              type="button"
              onClick={retryHistory}
              className="mt-4 rounded-lg px-3 py-2 text-sm font-semibold text-[#2455D6] hover:bg-[#2455D6]/5"
            >
              Try again
            </button>
          </div>
        ) : history.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFF0EE] text-[#C74444]">
              <FileText
                className="h-6 w-6"
                strokeWidth={1.8}
                aria-hidden="true"
              />
            </div>
            <h3 className="mt-4 text-sm font-bold text-[#172B4D]">
              No complaints yet
            </h3>
            <p className="mx-auto mt-1 max-w-xs text-sm text-slate-500">
              Complaints you submit will appear here with their current status.
            </p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-slate-100 px-6 sm:px-8">
              {history.map((complaint) => (
                <ComplaintRow
                  key={complaint.id}
                  complaint={complaint}
                  token={token}
                />
              ))}
            </div>
            {historyMeta.last_page > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 sm:px-8">
                <p className="text-xs text-slate-500">
                  Page {historyMeta.current_page} of {historyMeta.last_page}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    aria-label="Previous page"
                    disabled={historyPage <= 1}
                    onClick={() =>
                      changeHistoryPage(Math.max(1, historyPage - 1))
                    }
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-[#2455D6] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next page"
                    disabled={historyPage >= historyMeta.last_page}
                    onClick={() =>
                      changeHistoryPage(
                        Math.min(historyMeta.last_page, historyPage + 1),
                      )
                    }
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-[#2455D6] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
      {feedbackOpen && (
        <FeedbackPrompt
          token={token}
          serviceType="complaint"
          onClose={() => setFeedbackOpen(false)}
        />
      )}
    </div>
  );
}

export default Complaints;
