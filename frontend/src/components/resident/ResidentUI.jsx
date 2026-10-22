import { ExternalLink, FileText } from "lucide-react";

import { useState } from "react";
import { createPortal } from "react-dom";

import {
  downloadResidentFile,
  primaryButtonClass,
} from "../../services/residentApi";

function StatCard({ label, value, hint, color }) {
  const colors = {
    blue: "bg-[#EEF4FF] text-[#2455D6]",

    amber: "bg-[#FFF7E7] text-[#B87900]",

    green: "bg-[#ECF9F1] text-[#21864A]",

    coral: "bg-[#FFF0EE] text-[#C74444]",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-extrabold ${colors[color]}`}
      >
        {value}
      </div>

      <p className="mt-4 text-sm font-bold text-slate-700">{label}</p>

      <p className="mt-1 text-xs text-slate-400">{hint}</p>
    </div>
  );
}

function humanizeFieldLabel(value) {
  return String(value)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatFieldValue(value) {
  if (value === null || value === undefined || value === "") {
    return "Not provided";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (Array.isArray(value)) {
    return value.length
      ? value.map(formatFieldValue).join(", ")
      : "Not provided";
  }

  if (typeof value === "object") {
    return Object.entries(value)
      .map(
        ([key, nestedValue]) =>
          `${humanizeFieldLabel(key)}: ${formatFieldValue(nestedValue)}`,
      )
      .join(" · ");
  }

  return String(value);
}

function RequestRow({ request, token }) {
  const [modalOpen, setModalOpen] = useState(false);

  const documentLabels = {
    "Barangay Certification": "Barangay Clearance",
    "Barangay Certificate": "Barangay Certificate",
    "Barangay Residency": "Certificate of Residency",
    "Barangay Indigency": "Certificate of Indigency",
    "Business Permit": "Business Clearance",
    "First-Time Jobseeker Certification": "First-Time Job Seeker Certification",
    Cedula: "Cedula (Community Tax Certificate)",
    "Fencing Permit": "Fencing Permit",
    "Construction Permit": "Construction Permit",
  };

  const title =
    request.title ||
    request.document_type_label ||
    documentLabels[request.document_type] ||
    request.document_type ||
    "Document Request";

  const createdDate = request.created_at
    ? new Date(request.created_at).toLocaleString()
    : request.date || "Not available";

  const rawStatus = String(request.status || "pending").replaceAll("_", " ");
  const normalizedStatus = rawStatus.toLowerCase();
  const details =
    request.details && typeof request.details === "object"
      ? request.details
      : {};
  const formFields =
    details.form_fields && typeof details.form_fields === "object"
      ? details.form_fields
      : {};
  const requirements =
    details.requirements && typeof details.requirements === "object"
      ? details.requirements
      : {};
  const uploadedFiles = Object.values(requirements).filter(Boolean);

  const [fileError, setFileError] = useState("");
  const [openingFile, setOpeningFile] = useState("");
  const viewUploadedFile = async (requirementKey, file, index) => {
    const fileKey = `${request.id}-${requirementKey}`;
    setOpeningFile(fileKey);
    setFileError("");
    try {
      const blob = await downloadResidentFile(
        `/resident/requests/${request.id}/requirements/${encodeURIComponent(requirementKey)}`,
        token,
        file.original_name || file.name || `requirement-${index + 1}`,
        { open: true },
      );
      return blob;
    } catch (error) {
      setFileError(error.message);
    } finally {
      setOpeningFile("");
    }
  };

  const statusClasses = {
    pending: "bg-[#FFF7E7] text-[#B87900]",
    "under review": "bg-violet-50 text-violet-700",
    "for correction": "bg-[#FFF0EE] text-[#C74444]",
    processing: "bg-[#EEF4FF] text-[#2455D6]",
    "ready for release": "bg-[#ECF9F1] text-[#21864A]",
    complete: "bg-[#ECF9F1] text-[#21864A]",
    completed: "bg-[#ECF9F1] text-[#21864A]",
    rejected: "bg-[#FFF0EE] text-[#C74444]",
  };

  const feeLabel =
    details.fee_mode === "assessed" && !details.fee_assessed
      ? "To be assessed by barangay staff"
      : Number(request.fee || 0) === 0
        ? "No fee"
        : `₱${Number(request.fee || 0).toFixed(2)} payable upon release`;

  const statusBadge = (
    <span
      className={`inline-flex w-fit shrink-0 items-center justify-center rounded-full px-3 py-1.5 text-xs font-bold capitalize ${
        statusClasses[normalizedStatus] || "bg-[#EEF4FF] text-[#2455D6]"
      }`}
    >
      {rawStatus}
    </span>
  );

  return (
    <>
      <div className="border-b border-slate-100 py-4 last:border-b-0">
        <div className="grid min-w-0 gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F3F6FB] text-[#2455D6]">
              <FileText
                className="h-5 w-5"
                strokeWidth={1.8}
                aria-hidden="true"
              />
            </div>
            <div className="min-w-0">
              <p className="break-words text-sm font-bold text-slate-800">
                {title}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Request ID: {request.id ?? "Not available"} · Submitted{" "}
                {request.date ||
                  (request.created_at
                    ? new Date(request.created_at).toLocaleDateString()
                    : "date unavailable")}
              </p>
            </div>
          </div>

          <div className="flex min-w-0 flex-wrap items-center justify-start gap-2 sm:justify-end">
            {statusBadge}
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex min-h-9 items-center justify-center rounded-lg border border-[#D9E4FF] bg-[#EEF4FF] px-4 text-xs font-semibold text-[#2455D6] transition hover:bg-[#E4EEFF] focus:outline-none focus:ring-2 focus:ring-[#2455D6]/30"
            >
              View Details
            </button>
          </div>
        </div>
      </div>

      {modalOpen &&
        createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:p-6"
          onClick={(event) => {
            if (event.target === event.currentTarget) setModalOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={`request-details-title-${request.id ?? "item"}`}
            className="flex max-h-[92dvh] min-h-0 w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/70 bg-white shadow-2xl"
          >
            <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 shadow-sm sm:px-8 lg:px-12">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#2455D6]">
                  TugonBarangay · Request History
                </p>
                <h2
                  id={`request-details-title-${request.id ?? "item"}`}
                  className="mt-1 break-words text-lg font-bold text-[#172B4D] sm:text-xl"
                >
                  {title}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Request ID: {request.id ?? "Not available"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-2xl leading-none text-slate-500 transition hover:bg-slate-50 hover:text-[#2455D6] focus:outline-none focus:ring-2 focus:ring-[#2455D6]/30"
                aria-label="Close request details"
              >
                ×
              </button>
            </header>

            <div className="min-h-0 flex-1 space-y-7 overflow-y-auto bg-[#F7F9FC] p-5 sm:p-8 lg:px-12 lg:py-10">
              <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500">
                    Current status
                  </p>
                  <div className="mt-2">{statusBadge}</div>
                </div>
                <div className="sm:text-right">
                  <p className="text-xs font-medium text-slate-500">
                    Date submitted
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#172B4D]">
                    {createdDate}
                  </p>
                </div>
              </div>

              <section>
                <h3 className="mb-3 text-sm font-bold text-[#172B4D]">
                  Information You Submitted
                </h3>
                {Object.keys(formFields).length > 0 ? (
                  <dl className="grid gap-x-6 gap-y-4 rounded-xl border border-slate-200 p-4 sm:grid-cols-2">
                    {Object.entries(formFields).map(([key, value]) => (
                      <div key={key} className="min-w-0">
                        <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#55708F]">
                          {humanizeFieldLabel(key)}
                        </dt>
                        <dd className="mt-1 whitespace-pre-wrap break-words text-sm font-medium text-[#172B4D]">
                          {formatFieldValue(value)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                    No submitted form information was saved for this request.
                  </p>
                )}
              </section>

              <section>
                <h3 className="mb-3 text-sm font-bold text-[#172B4D]">
                  Request Fee
                </h3>
                <div className="rounded-xl border border-slate-200 bg-[#F6F8FC] p-4">
                  <p className="text-sm font-semibold text-[#172B4D]">
                    {feeLabel}
                  </p>
                </div>
              </section>

              {details.notes && (
                <section>
                  <h3 className="mb-2 text-sm font-bold text-[#172B4D]">
                    Additional Notes
                  </h3>
                  <p className="whitespace-pre-wrap break-words rounded-xl border border-slate-200 p-4 text-sm text-slate-700">
                    {details.notes}
                  </p>
                </section>
              )}

              <section>
                <h3 className="mb-3 text-sm font-bold text-[#172B4D]">
                  Uploaded Requirements
                </h3>
                {uploadedFiles.length > 0 ? (
                  <ul className="space-y-2 rounded-xl border border-slate-200 p-4">
                    {Object.entries(requirements)
                      .filter(([, file]) => Boolean(file))
                      .map(([requirementKey, file], index) => {
                      const fileObject =
                        typeof file === "object" && file !== null
                          ? file
                          : { original_name: String(file) };
                      return (
                        <li
                          key={
                            fileObject.path || fileObject.original_name || index
                          }
                          className="flex min-w-0 items-center gap-3 rounded-lg bg-slate-50 p-3"
                        >
                          <FileText
                            className="mt-0.5 h-5 w-5 shrink-0 text-[#2455D6]"
                            aria-hidden="true"
                          />
                          <div className="min-w-0">
                            <p className="break-words text-sm font-semibold text-[#172B4D]">
                              {fileObject.label ||
                                fileObject.name ||
                                `Requirement ${index + 1}`}
                            </p>
                            <p className="mt-1 break-words text-xs text-slate-500">
                              {fileObject.original_name ||
                                fileObject.name ||
                                fileObject.path ||
                                "File uploaded"}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              viewUploadedFile(requirementKey, fileObject, index)
                            }
                            disabled={
                              !token ||
                              openingFile === `${request.id}-${requirementKey}`
                            }
                            className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#2455D6] hover:bg-[#EEF4FF] disabled:opacity-50"
                          >
                            <ExternalLink
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                            {openingFile === `${request.id}-${requirementKey}`
                              ? "Opening..."
                              : "View"}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                    No uploaded requirements are recorded for this request.
                  </p>
                )}
                {fileError && (
                  <p role="alert" className="mt-2 text-sm text-red-600">
                    {fileError}
                  </p>
                )}
              </section>

              {request.staff_remarks && (
                <section>
                  <h3 className="mb-2 text-sm font-bold text-[#172B4D]">
                    Staff Remarks
                  </h3>
                  <p className="whitespace-pre-wrap break-words rounded-xl border border-[#F1D9A8] bg-[#FFF7E7] p-4 text-sm text-[#624700]">
                    {request.staff_remarks}
                  </p>
                </section>
              )}
            </div>

          </section>
        </div>
        , document.body)}
    </>
  );
}

function Field({
  name,

  value,

  onChange,

  label,

  placeholder,

  area = false,

  type = "text",

  inputClass,
}) {
  const Tag = area ? "textarea" : "input";

  return (
    <label className="mt-5 block">
      <span className="text-sm font-bold text-slate-700">{label}</span>

      <Tag
        name={name}
        value={value}
        onChange={onChange}
        type={area ? undefined : type}
        placeholder={placeholder}
        rows={area ? 5 : undefined}
        className={inputClass}
      />
    </label>
  );
}

function ServicePage({
  eyebrow,

  title,

  description,

  action,

  onAction,

  children,
}) {
  return (
    <section>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#2455D6]">
        {eyebrow}
      </p>

      <div className="mt-2 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>

          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
            {description}
          </p>
        </div>

        <button type="button" onClick={onAction} className={primaryButtonClass}>
          {action} <span className="ml-2">→</span>
        </button>
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {children}
      </div>
    </section>
  );
}

export { Field, RequestRow, ServicePage, StatCard };
