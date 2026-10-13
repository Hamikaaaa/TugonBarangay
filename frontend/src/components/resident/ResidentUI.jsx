import { FileText } from "lucide-react";
import { useState } from "react";
import { primaryButtonClass } from "../../services/residentApi";

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

function RequestRow({ request }) {
  const [modalOpen, setModalOpen] = useState(false);
  const documentLabels = {
    "Barangay Certification": "Barangay Clearance",
    "Barangay Certificate": "Barangay Certificate",
    "Barangay Residency": "Certificate of Residency",
    "Barangay Indigency": "Certificate of Indigency",
    "Business Permit": "Business Clearance",
    "First-Time Jobseeker Certification": "First-Time Job Seeker Certification",
  };
  const title = request.title || request.document_type_label || documentLabels[request.document_type] || request.document_type;
  const date =
    request.date || new Date(request.created_at).toLocaleDateString();
  const status = request.status.replaceAll("_", " ");
  const formFields = request.details?.form_fields || {};
  const uploadedFiles = Object.values(request.details?.requirements || {});
  const hasDetails =
    Object.keys(formFields).length > 0 ||
    Boolean(request.details?.notes) ||
    uploadedFiles.length > 0 ||
    Boolean(request.staff_remarks);
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

  const detailsContent = hasDetails ? (
    <div className="space-y-4">
      <p className="text-sm font-semibold text-[#172B4D]">
        Fee: {request.details?.fee_mode === "assessed" && !request.details?.fee_assessed
          ? "To be assessed by barangay staff"
          : Number(request.fee || 0) === 0
            ? "No fee"
            : `₱${Number(request.fee || 0).toFixed(2)} payable upon release`}
      </p>
      {Object.keys(formFields).length > 0 && (
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {Object.entries(formFields).map(([key, value]) => (
            <div key={key} className="min-w-0">
              <dt className="text-[11px] font-semibold uppercase text-[#55708F]">
                {key.replaceAll("_", " ")}
              </dt>
              <dd className="mt-1 break-words text-sm font-medium text-[#172B4D]">
                {value || "Not provided"}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {request.details?.notes && (
        <div>
          <p className="text-[11px] font-semibold uppercase text-[#55708F]">
            Additional notes
          </p>
          <p className="mt-1 break-words text-sm text-[#172B4D]">
            {request.details.notes}
          </p>
        </div>
      )}

      {request.staff_remarks && (
        <div className="rounded-lg border border-[#F1D9A8] bg-[#FFF7E7] p-3">
          <p className="text-[11px] font-semibold uppercase text-[#805900]">
            Staff remarks
          </p>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm text-[#624700]">
            {request.staff_remarks}
          </p>
        </div>
      )}

      {uploadedFiles.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase text-[#55708F]">
            Uploaded documents
          </p>
          <ul className="mt-2 space-y-2">
            {uploadedFiles.map((file) => (
              <li
                key={file.path || file.original_name}
                className="flex min-w-0 items-center gap-2 text-sm text-[#172B4D]"
              >
                <FileText
                  className="h-4 w-4 shrink-0 text-[#2455D6]"
                  aria-hidden="true"
                />
                <span className="min-w-0 break-words">
                  {file.label}: {file.original_name}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  ) : (
    <p className="text-sm text-slate-500">
      No additional details were saved for this request.
    </p>
  );

  return (
    <>
      <div className="py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F3F6FB] text-[#2455D6]">
              <FileText
                className="h-5 w-5"
                strokeWidth={1.8}
                aria-hidden="true"
              />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">{title}</p>
              <p className="mt-1 text-xs text-slate-400">
                {request.id} · Submitted {date}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex min-h-9 items-center justify-center rounded-lg border border-[#D9E4FF] bg-[#EEF4FF] px-3 text-xs font-semibold text-[#2455D6] transition hover:bg-[#E4EEFF]"
            >
              View details
            </button>
            <span
              className={`w-fit rounded-full px-3 py-1.5 text-xs font-bold capitalize ${statusClasses[status] || "bg-[#EEF4FF] text-[#2455D6]"}`}
            >
              {status}
            </span>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#071B3D]/70 p-3 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) setModalOpen(false);
          }}
        >
          <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#2455D6]">
                  Request details
                </p>
                <h3 className="mt-1 text-lg font-bold text-[#172B4D]">{title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-xl text-slate-500 transition hover:bg-slate-50 hover:text-[#2455D6]"
                aria-label="Close request details"
              >
                ×
              </button>
            </div>

            <div className="max-h-[calc(90vh-88px)] overflow-y-auto p-5 sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-slate-400">Request ID</p>
                  <p className="mt-1 text-sm font-bold text-[#172B4D]">{request.id}</p>
                </div>
                <span
                  className={`w-fit rounded-full px-3 py-1.5 text-xs font-bold capitalize ${statusClasses[status] || "bg-[#EEF4FF] text-[#2455D6]"}`}
                >
                  {status}
                </span>
              </div>

              <div className="rounded-xl border border-[#E6ECF5] bg-[#F6F1FD]/40 p-4">
                {detailsContent}
              </div>
            </div>
          </div>
        </div>
      )}
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
