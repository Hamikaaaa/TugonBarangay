import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import FIRST_TIME_JOBSEEKER_WORDING from "../../constants/firstTimeJobseekerWording";

const RESIDENCY_CERTIFICATE_WORDING = `To whom it may concern:\n\nThis is to certify that based on Record of Barangay Inhabitants (RBI), {{full_name}} is a bonafide resident of Purok {{purok}}, Barangay Tayud, Municipality of Consolacion and Province of Cebu, for {{years_of_residency}} years.\n\nThis certification is issued upon the request of the abovementioned name.\n\n\tIssued this {{issued_day}} of {{issued_month}} {{issued_year}} at the Office of the Punong Barangay, Barangay Tayud, Municipality of Consolacion, Province of Cebu, Philippines.`;

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
  "Barangay Certificate": "barangay_certificate",
  "Barangay Clearance": "barangay",
  "Barangay Residency": "residency",
  "Certificate of Residency": "residency",
  "Business Permit": "generic",
  "Barangay Indigency": "indigency",
  "Business Clearance": "business",
  "Certificate of Good Moral Character": "character",
  "First-Time Jobseeker Certification": "jobseeker",
  "First-Time Job Seeker Certification": "jobseeker",
};

function DocumentPreviewModal({ request, onClose, onSave, readOnly = false }) {
  const { token, user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [fields, setFields] = useState(() => ({
    ...(request?.details?.form_fields || {}),
    ...(request?.document_content || {}),
  }));
  const [paperDesign, setPaperDesign] = useState("");
  const [paperDesignLoading, setPaperDesignLoading] = useState(() => Boolean(
    request?.type?.id && /\.jpe?g$/i.test(request?.type?.uploaded_template_name || ""),
  ));
  const [saving, setSaving] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    const templateName = request?.type?.uploaded_template_name || "";
    if (!request?.type?.id || !token || !/\.jpe?g$/i.test(templateName)) {
      return undefined;
    }

    const controller = new AbortController();
    let previewUrl = "";
    const area = user?.role === "admin" ? "admin" : "staff";
    fetch(`http://127.0.0.1:8000/api/${area}/document-types/${request.type.id}/template`, {
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error("Unable to load the paper design.");
        return response.blob();
      })
      .then((image) => {
        if (controller.signal.aborted) return;
        previewUrl = URL.createObjectURL(image);
        setPaperDesign(previewUrl);
        setPaperDesignLoading(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setPaperDesign("");
          setPaperDesignLoading(false);
        }
      });

    return () => {
      controller.abort();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [request?.id, request?.type?.id, request?.type?.uploaded_template_name, token, user?.role]);

  if (!request) return null;

  const documentType = request.document_type;
  const documentTemplate = request.type?.template || (documentType === "Barangay Residency" ? RESIDENCY_CERTIFICATE_WORDING : "");
  const templateType = TEMPLATE_TYPES[documentType] || "generic";
  const label = request.document_type_label || DOCUMENT_LABELS[documentType] || documentType;
  const paperSize = ["a4", "legal"].includes(request.type?.paper_size) ? request.type.paper_size : "letter";
  const residentName = [fields.first_name, fields.middle_name, fields.last_name]
    .filter(Boolean)
    .join(" ") || fields.full_name || request.resident?.name || "Resident Name";
  const requestedIssueDate = request.released_at || request.document_generated_at || request.created_at;
  const parsedIssueDate = requestedIssueDate ? new Date(requestedIssueDate) : new Date();
  const issueDate = Number.isNaN(parsedIssueDate.getTime()) ? new Date() : parsedIssueDate;
  const issueDateParts = new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).formatToParts(issueDate).reduce((parts, item) => ({ ...parts, [item.type]: item.value }), {});
  const formattedDate = `${issueDateParts.month} ${issueDateParts.day}, ${issueDateParts.year}`;
  const ordinalDay = `${issueDateParts.day}${ordinalSuffix(Number(issueDateParts.day))}`;
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
  const printDocument = async () => {
    if (printing) return;
    setPrinting(true);
    try {
      await document.fonts?.ready;
      const images = [...document.querySelectorAll("#document-preview-modal .document-paper img")];
      await Promise.all(images.map((image) => image.complete
        ? Promise.resolve()
        : new Promise((resolve) => {
          image.addEventListener("load", resolve, { once: true });
          image.addEventListener("error", resolve, { once: true });
        })));
      requestAnimationFrame(() => requestAnimationFrame(() => {
        window.print();
        setPrinting(false);
      }));
    } catch {
      setPrinting(false);
      window.print();
    }
  };

  return (
    <div
      id="document-preview-modal"
      style={{
        "--paper-width": paperSize === "a4" ? "8.27in" : "8.5in",
        "--paper-height": paperSize === "a4" ? "11.69in" : paperSize === "legal" ? "14in" : "11in",
        "--document-paper-size": paperSize === "a4" ? "A4" : paperSize === "legal" ? "legal" : "letter",
      }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#071B3D]/70 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`${label} preview`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <style>{`@media print { @page { size: ${paperSize}; margin: 0; } }`}</style>
      <div className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#2455D6]">Document preview</p>
            <h2 className="mt-1 text-lg font-bold text-[#172B4D]">{label}</h2>
          </div>
          <div className="flex items-center gap-2">
            {!readOnly && (
              <button
                type="button"
                onClick={() => {
                  setError("");
                  const initialFields = {
                    ...(request.details?.form_fields || {}),
                    ...(request.document_content || {}),
                  };
                  if (documentTemplate && !initialFields.document_body) {
                    initialFields.document_body = renderDocumentTemplate(documentTemplate, initialFields, request, residentName, label, formattedDate);
                  }
                  setFields(initialFields);
                  setEditing((current) => !current);
                }}
                disabled={saving || !onSave || !["processing", "ready_for_release"].includes(request.status)}
                className="inline-flex items-center justify-center rounded-xl border border-[#E6ECF5] px-4 py-2.5 text-sm font-bold text-[#55708F] transition hover:bg-[#F6F8FC] hover:text-[#172B4D] focus:outline-none focus:ring-2 focus:ring-[#2455D6]/20"
              >
                {editing ? "Cancel edit" : "Edit"}
              </button>
            )}
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
              onClick={printDocument}
              disabled={paperDesignLoading || printing}
              className="inline-flex items-center justify-center rounded-xl bg-[#2455D6] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#1D46B5] focus:outline-none focus:ring-2 focus:ring-[#2455D6]/30 disabled:cursor-wait disabled:opacity-60"
            >
              {paperDesignLoading ? "Loading design..." : printing ? "Preparing..." : "Print"}
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
          {paperDesignLoading ? (
            <div className="document-paper mx-auto flex items-center justify-center border border-slate-200 bg-white text-sm font-semibold text-slate-500 shadow-sm" style={{ width: paperSize === "a4" ? "8.27in" : "8.5in", height: paperSize === "a4" ? "11.69in" : paperSize === "legal" ? "14in" : "11in" }} role="status">
              Preparing the final document layout…
            </div>
          ) : (
            <DocumentPaper
              request={request}
              documentTemplate={documentTemplate}
              templateType={templateType}
              label={label}
              residentName={residentName}
              formattedDate={formattedDate}
              fields={fields}
              issuedDay={ordinalDay}
              issuedMonth={issueDateParts.month}
              issuedYear={issueDateParts.year}
              paperDesign={paperDesign}
              paperSize={paperSize}
              editing={editing}
              onFieldChange={(fieldName, value) => setFields((current) => ({
                ...current,
                [fieldName]: value,
              }))}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function renderDocumentTemplate(template, fields, request, residentName, label, formattedDate) {
  const rawIssuedDate = request.released_at || request.document_generated_at || request.created_at;
  const parsedIssuedDate = rawIssuedDate ? new Date(rawIssuedDate) : new Date();
  const issuedDate = Number.isNaN(parsedIssuedDate.getTime()) ? new Date() : parsedIssuedDate;
  const issuedDayValue = new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", day: "numeric" }).format(issuedDate);
  const values = {
    ...fields,
    resident_name: residentName,
    full_name: fields.full_name || [fields.first_name, fields.middle_name, fields.last_name].filter(Boolean).join(" ") || residentName,
    address: documentRequestAddress(fields, request),
    purok: documentRequestPurok(fields, request),
    document_title: label,
    document_number: String(request.id).padStart(6, "0"),
    date_issued: formattedDate,
    issued_day: `${issuedDayValue}${ordinalSuffix(Number(issuedDayValue))}`,
    day: issuedDayValue,
    issued_month: new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", month: "long" }).format(issuedDate),
    issued_year: new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", year: "numeric" }).format(issuedDate),
    page_break: "",
  };

  return template.replace(/\{\{([a-z][a-z0-9_]*)\}\}/gi, (placeholder, key) => {
    const value = values[key];
    return value === undefined || value === null ? placeholder : String(value);
  });
}

function documentRequestAddress(fields, request) {
  if (request.document_type === "Barangay Indigency") {
    return documentRequestPurok(fields, request);
  }

  return fields.address || request.resident?.address || "";
}

function documentRequestPurok(fields, request) {
  return fields.purok || request.resident?.purok || "";
}

function FormattedTemplateText({ text }) {
  const renderPlainText = (value, keyPrefix) => {
    return value.split("\n").flatMap((line, lineIndex) => {
      return lineIndex ? [<br key={`${keyPrefix}-br-${lineIndex}`} />, line] : [line];
    });
  };

  return String(text).split(/\n\s*\n/).map((paragraph, index) => (
    <p key={index} className="mb-4 last:mb-0">
      {paragraph.split(/(\*\*[^*]+\*\*)/g).map((part, partIndex) => (
        part.startsWith("**") && part.endsWith("**")
          ? <strong key={partIndex} style={{ fontWeight: 700 }}>{part.slice(2, -2)}</strong>
          : <span key={partIndex}>{renderPlainText(part, `paragraph-${index}-${partIndex}`)}</span>
      ))}
    </p>
  ));
}

function ordinalSuffix(day) {
  if (day % 100 >= 11 && day % 100 <= 13) return "th";
  return { 1: "st", 2: "nd", 3: "rd" }[day % 10] || "th";
}

function calculateAgeFromBirthDate(dateOfBirth) {
  if (!dateOfBirth) return "";
  const birthDate = new Date(`${String(dateOfBirth).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(birthDate.getTime())) return "";
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  if (today.getMonth() < birthDate.getMonth() || (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())) age -= 1;
  return age >= 0 ? age : "";
}

function CertificateValue({ value, field, editing, onFieldChange, className = "", bold = false }) {
  if (editing && field !== "age") {
    return (
      <input
        aria-label={field.replaceAll("_", " ")}
        value={value || ""}
        onChange={(event) => onFieldChange(field, event.target.value)}
        style={bold ? { fontWeight: 700 } : undefined}
        className={`inline-block min-w-14 border-b border-dashed border-slate-400 bg-white/80 px-1 text-center font-semibold outline-none focus:border-[#2455D6] ${className}`}
      />
    );
  }
  const hasValue = value !== undefined && value !== null && value !== "";
  return <span style={bold ? { fontWeight: 700 } : undefined} className={`font-semibold ${className}`}>{hasValue ? value : "________________"}</span>;
}

function BarangayCertificateTemplate({ residentName, fields, issuedDay, issuedMonth, issuedYear, editing, onFieldChange }) {
  const nameParts = residentName.trim().split(/\s+/);
  const firstName = Object.hasOwn(fields, "first_name") ? fields.first_name : nameParts[0];
  const middleName = Object.hasOwn(fields, "middle_name") ? fields.middle_name : nameParts.slice(1, -1).join(" ");
  const lastName = Object.hasOwn(fields, "last_name") ? fields.last_name : nameParts.length > 1 ? nameParts.at(-1) : "";
  const age = fields.age ?? calculateAgeFromBirthDate(fields.date_of_birth);

  return (
    <div className="barangay-certificate-wording mx-auto max-w-3xl space-y-10 pt-3 text-slate-800" style={{ fontSize: "12pt", lineHeight: 1.65 }}>
      <p>
        This is to certify that <CertificateValue value={firstName} field="first_name" editing={editing} onFieldChange={onFieldChange} bold />{" "}
        {middleName && <><CertificateValue value={middleName} field="middle_name" editing={editing} onFieldChange={onFieldChange} bold />{" "}</>}
        {editing && !middleName && <><CertificateValue value="" field="middle_name" editing onFieldChange={onFieldChange} bold />{" "}</>}
        <CertificateValue value={lastName} field="last_name" editing={editing} onFieldChange={onFieldChange} bold />,{" "}
        <CertificateValue value={age} field="age" editing={editing} onFieldChange={onFieldChange} bold /> years old, <CertificateValue value={fields.sex} field="sex" editing={editing} onFieldChange={onFieldChange} bold />, <CertificateValue value={fields.civil_status} field="civil_status" editing={editing} onFieldChange={onFieldChange} bold />, <CertificateValue value={fields.citizenship} field="citizenship" editing={editing} onFieldChange={onFieldChange} bold /> citizen, and a bona fide resident of Purok <CertificateValue value={fields.purok} field="purok" editing={editing} onFieldChange={onFieldChange} bold />, Barangay Tayud, Consolacion, Cebu, is an indigent member of this barangay.
      </p>
      <p>
        This certification is issued at the request of the above-named person for <CertificateValue value={fields.purpose} field="purpose" editing={editing} onFieldChange={onFieldChange} bold /> and for whatever legal purpose it may serve.
      </p>
      <p>
        Issued and Given this <CertificateValue value={issuedDay} field="age" editing={false} onFieldChange={onFieldChange} bold /> day of {issuedMonth}, {issuedYear}, at Barangay Tayud, Consolacion, Cebu, Philippines.
      </p>
    </div>
  );
}

function IndigencyTemplate({ residentName, fields, issuedDay, issuedMonth, issuedYear, editing, onFieldChange }) {
  const fullName = fields.full_name || residentName;
  const purpose = fields.purpose === "Other"
    ? fields.purpose_other || fields.additional_details || "Other"
    : fields.purpose;

  return (
    <div className="indigency-certificate-wording mx-auto max-w-3xl space-y-7 pt-5 text-slate-800" style={{ fontSize: "12pt", lineHeight: 1.65 }}>
      <p className="font-semibold">To whom it may concern:</p>
      <p>
        This is to certify that <CertificateValue value={fullName} field="full_name" editing={editing} onFieldChange={onFieldChange} /> is a resident of Purok <CertificateValue value={fields.purok} field="purok" editing={editing} onFieldChange={onFieldChange} />, Barangay Tayud, Municipality of Consolacion and Province of Cebu.
      </p>
      <p>
        It is further certified that the aforementioned person is without formal employment and without income.
      </p>
      <p>
        This certification is issued upon the request of the above-mentioned person for <CertificateValue value={purpose} field={fields.purpose === "Other" ? "purpose_other" : "purpose"} editing={editing} onFieldChange={onFieldChange} /> and for whatever legal purpose it may serve.
      </p>
      <p>
        Issued and given this <span className="font-semibold">{issuedDay}</span> day of <span className="font-semibold">{issuedMonth}</span>, <span className="font-semibold">{issuedYear}</span>, at Barangay Tayud, Consolacion, Cebu, Philippines.
      </p>
    </div>
  );
}

function DocumentPaper({ request, documentTemplate, templateType, label, residentName, formattedDate, fields, issuedDay, issuedMonth, issuedYear, paperDesign, paperSize, editing, onFieldChange }) {
  const dimensions = paperSize === "a4" ? { width: "8.27in", height: "11.69in" } : paperSize === "legal" ? { width: "8.5in", height: "14in" } : { width: "8.5in", height: "11in" };
  const savedLayout = { content_top: 64, content_left: 19, content_right: 19, content_bottom: 19, font_size_pt: 12, text_color: "#1f2937", accent_color: "#123f70", ...(request.type?.document_layout || {}) };
  const layout = {
    ...savedLayout,
    content_top: Math.min(76, Math.max(51, Number(savedLayout.content_top))),
    content_left: Math.min(38, Math.max(13, Number(savedLayout.content_left))),
    content_right: Math.min(38, Math.max(13, Number(savedLayout.content_right))),
    content_bottom: Math.min(38, Math.max(13, Number(savedLayout.content_bottom))),
    font_size_pt: Math.min(14, Math.max(10, Number(savedLayout.font_size_pt))),
  };
  const isJobseeker = templateType === "jobseeker";
  const isBarangayCertificate = templateType === "barangay_certificate";
  const isIndigencyCertificate = templateType === "indigency";
  const isResidencyCertificate = templateType === "residency";
  const isFormalCertificate = isBarangayCertificate || isIndigencyCertificate || isResidencyCertificate;
  const paper = (
    <article data-paper-size={paperSize} className={`document-paper relative mx-auto flex min-h-[11in] w-full flex-col overflow-hidden bg-white shadow-sm ${isBarangayCertificate ? "document-paper--barangay-certificate" : ""} ${isIndigencyCertificate ? "document-paper--indigency-certificate" : ""} ${isResidencyCertificate ? "document-paper--residency-certificate" : ""} ${isJobseeker ? "document-paper--multi-page" : paperDesign ? "document-paper--designed p-0" : "p-[0.55in]"}`} style={{ "--paper-width": dimensions.width, "--paper-height": dimensions.height, "--document-text-color": layout.text_color, "--document-accent-color": layout.accent_color, width: dimensions.width, height: isJobseeker ? "auto" : dimensions.height, minHeight: isJobseeker ? 0 : dimensions.height, color: layout.text_color }}>
      {!isJobseeker && paperDesign && <img src={paperDesign} alt="Uploaded document paper design" className="pointer-events-none absolute inset-0 h-full w-full object-fill" style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }} />}
      {!isJobseeker && !paperDesign && <header className="relative z-10 border-b border-[#123F70] pb-4">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <img src="/images/logo-blue-version.png" alt="TugonBarangay" className="h-14 w-14 object-contain" />
            <div>
              <p className="text-[8px] font-bold uppercase tracking-[0.24em] text-[#2455D6]">Tugon Barangay</p>
              {!isFormalCertificate && <h1 className="mt-1 text-[19px] font-bold leading-tight text-[#123F70]">{label}</h1>}
              <p className="mt-1 text-[8px] font-semibold uppercase tracking-[0.18em] text-slate-400">Official document</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Document No.</p>
            <p className="mt-1 text-[11px] font-bold">{String(request.id).padStart(6, "0")}</p>
          </div>
        </div>
      </header>}

      <div className="relative z-10 flex-1" style={isJobseeker ? { padding: 0 } : paperDesign ? { paddingTop: `${layout.content_top}mm`, paddingLeft: `${layout.content_left}mm`, paddingRight: `${layout.content_right}mm`, paddingBottom: `${layout.content_bottom}mm` } : { paddingTop: "20px", paddingBottom: "20px" }}>
        {!isJobseeker && <h1 className={`mb-7 text-center font-bold uppercase tracking-wide ${isFormalCertificate ? "document-title--formal-certificate" : "text-[16px]"}`} style={{ color: layout.accent_color, ...(isFormalCertificate ? { fontSize: `${Math.max(20, layout.font_size_pt * 1.8)}pt` } : {}) }}>{label}</h1>}
        {!isJobseeker && documentTemplate && request.type?.template_enabled !== false ? (
          <div className="document-wording whitespace-pre-wrap" style={{ color: layout.text_color, fontSize: `${layout.font_size_pt}pt`, lineHeight: 1.55 }}>
            {editing ? (
              <textarea
                aria-label="Edit document wording"
                value={renderDocumentTemplate(fields.document_body || documentTemplate, fields, request, residentName, label, formattedDate)}
                onChange={(event) => onFieldChange("document_body", event.target.value)}
                className="min-h-[5in] w-full resize-y rounded-lg border border-[#F1D9A8] bg-white p-4 text-inherit outline-none focus:border-[#2455D6] focus:ring-2 focus:ring-[#2455D6]/20"
              />
            ) : (
              <FormattedTemplateText text={renderDocumentTemplate(fields.document_body || documentTemplate, fields, request, residentName, label, formattedDate)} />
            )}
          </div>
        ) : (
          <>
            {templateType === "barangay" && <BarangayTemplate request={request} residentName={residentName} fields={fields} editing={editing} onFieldChange={onFieldChange} />}
            {templateType === "barangay_certificate" && <BarangayCertificateTemplate residentName={residentName} fields={fields} issuedDay={issuedDay} issuedMonth={issuedMonth} issuedYear={issuedYear} editing={editing} onFieldChange={onFieldChange} />}
            {templateType === "indigency" && <IndigencyTemplate residentName={residentName} fields={fields} issuedDay={issuedDay} issuedMonth={issuedMonth} issuedYear={issuedYear} editing={editing} onFieldChange={onFieldChange} />}
            {templateType === "residency" && <ResidencyTemplate request={request} residentName={residentName} fields={fields} editing={editing} onFieldChange={onFieldChange} />}
            {templateType === "business" && <BusinessTemplate request={request} residentName={residentName} fields={fields} editing={editing} onFieldChange={onFieldChange} />}
            {templateType === "character" && <CharacterTemplate request={request} residentName={residentName} fields={fields} editing={editing} onFieldChange={onFieldChange} />}
            {templateType === "jobseeker" && <JobseekerTemplate request={request} residentName={residentName} fields={fields} issuedDay={issuedDay} issuedMonth={issuedMonth} issuedYear={issuedYear} paperDesign={paperDesign} editing={editing} onFieldChange={onFieldChange} />}
            {templateType === "generic" && <GenericTemplate label={label} residentName={residentName} fields={fields} editing={editing} onFieldChange={onFieldChange} />}
          </>
        )}
      </div>

      {!isJobseeker && !paperDesign && <footer className="relative z-10 grid grid-cols-[1fr_auto] gap-8 border-t border-slate-200 pt-4">
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
      </footer>}
    </article>
  );

  return paper;
}

function TemplateHeading({ title, subtitle }) {
  return (
    <div className="document-template-heading mb-6 text-center">
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
        <DetailLine label="Date of birth" value={fields.date_of_birth} fieldName="date_of_birth" editing={editing} onFieldChange={onFieldChange} />
        <DetailLine label="Sex" value={fields.sex} fieldName="sex" editing={editing} onFieldChange={onFieldChange} />
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
        <DetailLine label="Date of birth" value={fields.date_of_birth} fieldName="date_of_birth" editing={editing} onFieldChange={onFieldChange} />
        <DetailLine label="Sex" value={fields.sex} fieldName="sex" editing={editing} onFieldChange={onFieldChange} />
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

function JobseekerTemplate({ request, residentName, fields, issuedDay, issuedMonth, issuedYear, paperDesign }) {
  const fullName = fields.full_name || residentName;
  const age = fields.age || calculateAgeFromBirthDate(request.resident?.date_of_birth);
  const registeredSex = String(request.resident?.sex || fields.sex || "").toLowerCase();
  const pronoun = registeredSex === "male" ? "He" : registeredSex === "female" ? "She" : "They";
  const template = request.type?.template_enabled === false
    ? FIRST_TIME_JOBSEEKER_WORDING
    : request.type?.template || FIRST_TIME_JOBSEEKER_WORDING;
  const wordingValues = {
    ...fields,
    full_name: fullName,
    age,
    pronoun,
    pronoun_verb: pronoun === "They" ? "have" : "has",
    pronoun_possessive: pronoun === "He" ? "his" : pronoun === "She" ? "her" : "their",
    punong_barangay_name: fields.punong_barangay_name || "____________________________",
  };
  const pages = template.split(/\{\{page_break\}\}/i).slice(0, 2);

  return (
    <div className="jobseeker-document-pages">
      {pages.map((page, index) => (
        <section className="jobseeker-page text-[10px] leading-[1.55]" key={index}>
          {paperDesign && <img src={paperDesign} alt="Uploaded document paper design" className="pointer-events-none absolute inset-0 z-0 h-full w-full object-fill" />}
          <FormattedTemplateText
            text={renderDocumentTemplate(page, wordingValues, request, residentName, "First-Time Jobseeker Certification", `${issuedMonth} ${issuedDay}, ${issuedYear}`)}
          />
        </section>
      ))}
    </div>
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
