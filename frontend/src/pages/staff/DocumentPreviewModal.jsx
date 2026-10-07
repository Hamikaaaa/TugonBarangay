import { useEffect, useState } from "react";

const DOCUMENT_LABELS = {
  "Barangay Certification": "Barangay Clearance",
  "Barangay Certificate": "Barangay Certificate",
  "Barangay Residency": "Certificate of Residency",
  "Business Permit": "Business Clearance",
  "Barangay Indigency": "Certificate of Indigency",
  "Certificate of Good Moral Character": "Certificate of Good Moral Character",
  "First-Time Jobseeker Certification": "First-Time Job Seeker Certification",
};

const TEMPLATE_TYPES = {
  "Barangay Certification": "barangay",
  "Barangay Certificate": "barangay",
  "Barangay Clearance": "barangay",
  "Barangay Residency": "residency",
  "Certificate of Residency": "residency",
  "Business Permit": "generic",
  "Barangay Indigency": "generic",
  "Business Clearance": "business",
  "Certificate of Good Moral Character": "character",
  "First-Time Jobseeker Certification": "jobseeker",
  "First-Time Job Seeker Certification": "jobseeker",
};

function DocumentPreviewModal({ request, onClose, onSave }) {
  const [editing, setEditing] = useState(false);
  const [fields, setFields] = useState(request?.document_content || request?.details?.form_fields || {});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!request) return null;

  const documentType = request.document_type;
  const templateType = TEMPLATE_TYPES[documentType] || "generic";
  const label = request.document_type_label || DOCUMENT_LABELS[documentType] || documentType;
  const residentName = fields.full_name || request.resident?.name || "Resident Name";
  const formattedDate = new Date(request.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const saveChanges = async () => {
    if (!onSave || saving) return;
    setSaving(true);
    setError("");
    try {
      await onSave(fields);
      setEditing(false);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      id="document-preview-modal"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#071B3D]/70 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`${label} preview`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#2455D6]">Document preview</p>
            <h2 className="mt-1 text-lg font-bold text-[#172B4D]">{label}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setError("");
                setFields(request.document_content || request.details?.form_fields || {});
                setEditing((current) => !current);
              }}
              disabled={saving || request.status !== "processing"}
              className="inline-flex items-center justify-center rounded-xl border border-[#E6ECF5] px-4 py-2.5 text-sm font-bold text-[#55708F] transition hover:bg-[#F6F8FC] hover:text-[#172B4D] focus:outline-none focus:ring-2 focus:ring-[#2455D6]/20"
            >
              {editing ? "Cancel edit" : "Edit"}
            </button>
            {editing && (
              <button
                type="button"
                onClick={saveChanges}
                disabled={saving}
                className="inline-flex items-center justify-center rounded-xl bg-[#2455D6] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#1D46B5] focus:outline-none focus:ring-2 focus:ring-[#2455D6]/30 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save changes"}
              </button>
            )}
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center justify-center rounded-xl bg-[#2455D6] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#1D46B5] focus:outline-none focus:ring-2 focus:ring-[#2455D6]/30"
            >
              Print
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#E6ECF5] text-xl text-[#55708F] transition hover:bg-[#F6F8FC] hover:text-[#2455D6] focus:outline-none focus:ring-2 focus:ring-[#2455D6]/20"
              aria-label="Close preview"
            >
              ×
            </button>
          </div>
        </div>

        {editing && (
          <div className="border-b border-[#F1D9A8] bg-[#FFF7E7] px-5 py-4">
            <p className="text-sm font-bold text-[#805900]">Edit mode</p>
            <p className="mt-1 text-xs text-[#805900]">Save edits to this request before approving the document for release.</p>
          </div>
        )}
        {error && <p role="alert" className="border-b border-[#F2D4D0] bg-[#FFF0EE] px-5 py-3 text-xs font-semibold text-[#C74444]">{error}</p>}

        <div className="document-preview-scroll overflow-auto bg-slate-100 p-4 sm:p-8">
          <DocumentPaper
            request={request}
            templateType={templateType}
            label={label}
            residentName={residentName}
            formattedDate={formattedDate}
            fields={fields}
            editing={editing}
            onFieldChange={(fieldName, value) => setFields((current) => ({
              ...current,
              [fieldName]: value,
              ...(fieldName === "date_of_birth"
                ? { age: calculateAge(value) }
                : {}),
            }))}
          />
        </div>
      </div>
    </div>
  );
}

function renderDocumentTemplate(template, fields, request, residentName, label, formattedDate) {
  const values = {
    ...fields,
    resident_name: residentName,
    document_title: label,
    document_number: String(request.id).padStart(6, "0"),
    date_issued: formattedDate,
  };

  return template.replace(/\{\{([a-z][a-z0-9_]*)\}\}/gi, (placeholder, key) => {
    const value = values[key];
    return value === undefined || value === null ? placeholder : String(value);
  });
}

function DocumentPaper({ request, templateType, label, residentName, formattedDate, fields, editing, onFieldChange }) {
  const paper = (
    <article className="document-paper mx-auto flex min-h-[11in] w-full max-w-[8.5in] flex-col bg-white p-[0.55in] text-[#172B4D] shadow-sm">
      <header className="border-b border-[#123F70] pb-4">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <img src="/images/logo-blue-version.png" alt="TugonBarangay" className="h-14 w-14 object-contain" />
            <div>
              <p className="text-[8px] font-bold uppercase tracking-[0.24em] text-[#2455D6]">Tugon Barangay</p>
              <h1 className="mt-1 text-[19px] font-bold leading-tight text-[#123F70]">{label}</h1>
              <p className="mt-1 text-[8px] font-semibold uppercase tracking-[0.18em] text-slate-400">Official document</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Document No.</p>
            <p className="mt-1 text-[11px] font-bold">{String(request.id).padStart(6, "0")}</p>
          </div>
        </div>
      </header>

      <div className="flex-1 py-5">
        {request.type?.template ? (
          <p className="whitespace-pre-wrap text-[11px] leading-6 text-slate-700">
            {renderDocumentTemplate(request.type.template, fields, request, residentName, label, formattedDate)}
          </p>
        ) : (
          <>
            {templateType === "barangay" && <BarangayTemplate request={request} residentName={residentName} fields={fields} editing={editing} onFieldChange={onFieldChange} />}
            {templateType === "residency" && <ResidencyTemplate request={request} residentName={residentName} fields={fields} editing={editing} onFieldChange={onFieldChange} />}
            {templateType === "business" && <BusinessTemplate request={request} residentName={residentName} fields={fields} editing={editing} onFieldChange={onFieldChange} />}
            {templateType === "character" && <CharacterTemplate request={request} residentName={residentName} fields={fields} editing={editing} onFieldChange={onFieldChange} />}
            {templateType === "jobseeker" && <JobseekerTemplate request={request} residentName={residentName} fields={fields} editing={editing} onFieldChange={onFieldChange} />}
            {templateType === "generic" && <GenericTemplate label={label} residentName={residentName} fields={fields} editing={editing} onFieldChange={onFieldChange} />}
          </>
        )}
      </div>

      <footer className="grid grid-cols-[1fr_auto] gap-8 border-t border-slate-200 pt-4">
        <div>
          <div className="mb-1 flex items-end gap-2">
            <div className="h-px w-20 bg-slate-300" />
            <span className="text-[8px] font-semibold text-slate-400">Authorized signature</span>
          </div>
          <p className="mt-1 text-[9px] font-semibold">Authorized Barangay Officer</p>
        </div>
        <div className="text-right">
          <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Date issued</p>
          <p className="mt-1 text-[9px] font-semibold">{formattedDate}</p>
        </div>
      </footer>
    </article>
  );

  return paper;
}

function TemplateHeading({ title, subtitle }) {
  return (
    <div className="mb-6 text-center">
      <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#2455D6]">Official Barangay Document</p>
      <h2 className="mt-2 text-[25px] font-bold tracking-tight text-[#123F70]">{title}</h2>
      <p className="mt-2 text-[10px] uppercase tracking-wider text-slate-400">{subtitle}</p>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="mb-5 border border-slate-200 rounded-sm p-4">
      <h3 className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#2455D6]">{title}</h3>
      {children}
    </section>
  );
}

function DetailLine({ label, value, fieldName, editing, onFieldChange }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 border-b border-slate-100 py-2 last:border-0">
      <dt className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</dt>
      <dd className="text-[10px] font-semibold text-slate-700">
        {editing ? (
          <input
            type={fieldName === "date_of_birth" ? "date" : "text"}
            value={value || ""}
            onChange={(event) => onFieldChange(fieldName, event.target.value)}
            className="w-full rounded border border-[#F1D9A8] bg-white px-2 py-1.5 text-[10px] font-semibold text-slate-700 outline-none focus:border-[#805900] focus:ring-2 focus:ring-[#805900]/15"
          />
        ) : (
          value || "—"
        )}
      </dd>
    </div>
  );
}

function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return "";
  const birthDate = new Date(`${dateOfBirth.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(birthDate.getTime())) return "";
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  if (
    today.getMonth() < birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() &&
      today.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }
  return age >= 0 ? String(age) : "";
}

function BarangayTemplate({ residentName, fields, editing, onFieldChange }) {
  return (
    <>
      <TemplateHeading title="Barangay Clearance" subtitle="Certificate of official barangay verification" />
      <div className="mb-5 rounded-sm bg-[#F5F8FF] p-4 text-center">
        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">This certificate is issued to</p>
        <p className="mt-1 text-[18px] font-bold text-[#123F70]">{residentName}</p>
      </div>
      <Section title="Purpose of the request">
        {editing ? (
          <textarea
            value={fields.purpose || ""}
            onChange={(event) => onFieldChange("purpose", event.target.value)}
            className="min-h-16 w-full rounded border border-[#F1D9A8] bg-white p-2 text-[10px] leading-4 text-slate-700 outline-none focus:border-[#805900] focus:ring-2 focus:ring-[#805900]/15"
          />
        ) : (
          <p className="text-[11px] leading-5 text-slate-600">{fields.purpose || fields.additional_details || "The resident has requested official barangay verification for the stated purpose."}</p>
        )}
      </Section>
      <Section title="Resident information">
        <DetailLine label="Address" value={fields.address} fieldName="address" editing={editing} onFieldChange={onFieldChange} />
        <DetailLine label="Purok" value={fields.purok} fieldName="purok" editing={editing} onFieldChange={onFieldChange} />
        <DetailLine label="Age" value={fields.age} fieldName="age" editing={false} onFieldChange={onFieldChange} />
        <DetailLine label="Date of birth" value={fields.date_of_birth} fieldName="date_of_birth" editing={editing} onFieldChange={onFieldChange} />
        <DetailLine label="Sex" value={fields.sex} fieldName="sex" editing={editing} onFieldChange={onFieldChange} />
        <DetailLine label="Civil status" value={fields.civil_status} fieldName="civil_status" editing={editing} onFieldChange={onFieldChange} />
        <DetailLine label="Citizenship" value={fields.citizenship} fieldName="citizenship" editing={editing} onFieldChange={onFieldChange} />
      </Section>
      <p className="mt-1 text-[9px] leading-4 text-slate-500">The certificate is valid for the purpose stated above and is subject to barangay policy. It is not a substitute for any other official document.</p>
    </>
  );
}

function ResidencyTemplate({ residentName, fields, editing, onFieldChange }) {
  return (
    <>
      <TemplateHeading title="Certificate of Residency" subtitle="Official confirmation of barangay residence" />
      <div className="mb-5 rounded-sm bg-[#F5F8FF] p-4 text-center">
        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">This certificate is issued to</p>
        {editing ? (
          <input
            value={residentName}
            onChange={(event) => onFieldChange("full_name", event.target.value)}
            className="mt-2 w-full rounded border border-[#F1D9A8] bg-white px-3 py-2 text-center text-[18px] font-bold text-[#123F70] outline-none focus:border-[#805900] focus:ring-2 focus:ring-[#805900]/15"
          />
        ) : (
          <p className="mt-1 text-[18px] font-bold text-[#123F70]">{residentName}</p>
        )}
      </div>
      <Section title="Residency details">
        <DetailLine label="Address" value={fields.address} fieldName="address" editing={editing} onFieldChange={onFieldChange} />
        <DetailLine label="Purok" value={fields.purok} fieldName="purok" editing={editing} onFieldChange={onFieldChange} />
        <DetailLine label="Age" value={fields.age} fieldName="age" editing={false} onFieldChange={onFieldChange} />
        <DetailLine label="Date of birth" value={fields.date_of_birth} fieldName="date_of_birth" editing={editing} onFieldChange={onFieldChange} />
        <DetailLine label="Sex" value={fields.sex} fieldName="sex" editing={editing} onFieldChange={onFieldChange} />
        <DetailLine label="Civil status" value={fields.civil_status} fieldName="civil_status" editing={editing} onFieldChange={onFieldChange} />
        <DetailLine label="Length of residency (years)" value={fields.years_of_residency} fieldName="years_of_residency" editing={editing} onFieldChange={onFieldChange} />
        <DetailLine label="Additional months of residency" value={fields.months_of_residency} fieldName="months_of_residency" editing={editing} onFieldChange={onFieldChange} />
        <DetailLine label="Purpose" value={fields.purpose} fieldName="purpose" editing={editing} onFieldChange={onFieldChange} />
      </Section>
      <p className="text-[9px] leading-4 text-slate-500">This certificate confirms the resident’s stated period of residence within the barangay and is issued based on the information provided.</p>
    </>
  );
}

function BusinessTemplate({ residentName, fields, editing, onFieldChange }) {
  return (
    <>
      <TemplateHeading title="Business Clearance" subtitle="Official business permit verification" />
      <div className="mb-5 rounded-sm bg-[#F5F8FF] p-4 text-center">
        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">This clearance is issued to</p>
        {editing ? (
          <input
            value={residentName}
            onChange={(event) => onFieldChange("full_name", event.target.value)}
            className="mt-2 w-full rounded border border-[#F1D9A8] bg-white px-3 py-2 text-center text-[18px] font-bold text-[#123F70] outline-none focus:border-[#805900] focus:ring-2 focus:ring-[#805900]/15"
          />
        ) : (
          <p className="mt-1 text-[18px] font-bold text-[#123F70]">{residentName}</p>
        )}
      </div>
      <Section title="Business information">
        <DetailLine label="Business name" value={fields.business_name} fieldName="business_name" editing={editing} onFieldChange={onFieldChange} />
        <DetailLine label="Business type" value={fields.business_type} fieldName="business_type" editing={editing} onFieldChange={onFieldChange} />
        <DetailLine label="Nature of business" value={fields.nature_of_business} fieldName="nature_of_business" editing={editing} onFieldChange={onFieldChange} />
        <DetailLine label="Ownership" value={fields.business_ownership} fieldName="business_ownership" editing={editing} onFieldChange={onFieldChange} />
        <DetailLine label="Location" value={`${fields.business_street_number || ""} ${fields.business_purok || ""}`.trim()} fieldName="business_purok" editing={editing} onFieldChange={onFieldChange} />
        <DetailLine label="Investment" value={fields.estimated_investment} fieldName="estimated_investment" editing={editing} onFieldChange={onFieldChange} />
        <DetailLine label="Employees" value={fields.number_of_employees} fieldName="number_of_employees" editing={editing} onFieldChange={onFieldChange} />
        <DetailLine label="Business start date" value={fields.business_start_date} fieldName="business_start_date" editing={editing} onFieldChange={onFieldChange} />
        <DetailLine label="Contact" value={fields.business_contact_number || fields.business_email_address} fieldName="business_contact_number" editing={editing} onFieldChange={onFieldChange} />
      </Section>
    </>
  );
}

function CharacterTemplate({ residentName, fields, editing, onFieldChange }) {
  return (
    <>
      <TemplateHeading title="Certificate of Good Moral Character" subtitle="Official verification of personal conduct" />
      <div className="mb-5 rounded-sm bg-[#F5F8FF] p-4 text-center">
        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">This certificate is issued to</p>
        {editing ? (
          <input
            value={residentName}
            onChange={(event) => onFieldChange("full_name", event.target.value)}
            className="mt-2 w-full rounded border border-[#F1D9A8] bg-white px-3 py-2 text-center text-[18px] font-bold text-[#123F70] outline-none focus:border-[#805900] focus:ring-2 focus:ring-[#805900]/15"
          />
        ) : (
          <p className="mt-1 text-[18px] font-bold text-[#123F70]">{residentName}</p>
        )}
      </div>
      <Section title="Personal information">
        <DetailLine label="Address" value={fields.address} fieldName="address" editing={editing} onFieldChange={onFieldChange} />
        <DetailLine label="Date of birth" value={fields.date_of_birth} fieldName="date_of_birth" editing={editing} onFieldChange={onFieldChange} />
        <DetailLine label="Age" value={fields.age} fieldName="age" editing={false} onFieldChange={onFieldChange} />
        <DetailLine label="Sex" value={fields.sex} fieldName="sex" editing={editing} onFieldChange={onFieldChange} />
        <DetailLine label="Citizenship" value={fields.citizenship} fieldName="citizenship" editing={editing} onFieldChange={onFieldChange} />
        <DetailLine label="Civil status" value={fields.civil_status} fieldName="civil_status" editing={editing} onFieldChange={onFieldChange} />
        <DetailLine label="Purok" value={fields.purok} fieldName="purok" editing={editing} onFieldChange={onFieldChange} />
      </Section>
      <Section title="Purpose of request">
        <DetailLine label="Purpose" value={fields.purpose} fieldName="purpose" editing={editing} onFieldChange={onFieldChange} />
      </Section>
      <Section title="Declaration">
        <p className="text-[11px] leading-5 text-slate-600">It is hereby certified that the person named above is of good moral character and has demonstrated responsible, lawful, and respectful conduct within the community.</p>
      </Section>
      <p className="text-[9px] leading-4 text-slate-500">The information contained in this certificate is based on the verified request and available barangay records.</p>
    </>
  );
}

function JobseekerTemplate({ residentName, fields, editing, onFieldChange }) {
  return (
    <>
      <TemplateHeading title="First-Time Jobseeker Certification" subtitle="Official certification of employment readiness" />
      <div className="mb-5 rounded-sm bg-[#F5F8FF] p-4 text-center">
        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">This certificate is issued to</p>
        {editing ? (
          <input
            value={residentName}
            onChange={(event) => onFieldChange("full_name", event.target.value)}
            className="mt-2 w-full rounded border border-[#F1D9A8] bg-white px-3 py-2 text-center text-[18px] font-bold text-[#123F70] outline-none focus:border-[#805900] focus:ring-2 focus:ring-[#805900]/15"
          />
        ) : (
          <p className="mt-1 text-[18px] font-bold text-[#123F70]">{residentName}</p>
        )}
      </div>
      <Section title="Personal information">
        <DetailLine label="Address" value={fields.address} fieldName="address" editing={editing} onFieldChange={onFieldChange} />
        <DetailLine label="Date of birth" value={fields.date_of_birth} fieldName="date_of_birth" editing={editing} onFieldChange={onFieldChange} />
        <DetailLine label="Age" value={fields.age} fieldName="age" editing={false} onFieldChange={onFieldChange} />
        <DetailLine label="Sex" value={fields.sex} fieldName="sex" editing={editing} onFieldChange={onFieldChange} />
        <DetailLine label="Citizenship" value={fields.citizenship} fieldName="citizenship" editing={editing} onFieldChange={onFieldChange} />
        <DetailLine label="Civil status" value={fields.civil_status} fieldName="civil_status" editing={editing} onFieldChange={onFieldChange} />
        <DetailLine label="Purok" value={fields.purok} fieldName="purok" editing={editing} onFieldChange={onFieldChange} />
      </Section>
      <Section title="Employment information">
        <DetailLine label="Purpose" value={fields.purpose} fieldName="purpose" editing={editing} onFieldChange={onFieldChange} />
      </Section>
      <p className="text-[9px] leading-4 text-slate-500">This certification confirms that the resident is a first-time job seeker and has completed the required barangay verification process.</p>
    </>
  );
}

function GenericTemplate({ label, residentName, fields, editing, onFieldChange }) {
  return (
    <>
      <TemplateHeading title={label} subtitle="Official barangay document" />
      <div className="mb-5 rounded-sm bg-[#F5F8FF] p-4 text-center">
        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">This document is issued to</p>
        <p className="mt-1 text-[18px] font-bold text-[#123F70]">{residentName}</p>
      </div>
      <Section title="Request information">
        {Object.entries(fields).map(([key, value]) => (
          <DetailLine
            key={key}
            label={key.replaceAll("_", " ")}
            value={value}
            fieldName={key}
            editing={editing}
            onFieldChange={onFieldChange}
          />
        ))}
      </Section>
      <p className="mt-4 text-[9px] leading-4 text-slate-500">
        This document is prepared from the information and supporting requirements reviewed by barangay staff.
      </p>
    </>
  );
}

export default DocumentPreviewModal;
