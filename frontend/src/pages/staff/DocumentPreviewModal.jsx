import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";

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
  "Barangay Indigency": "generic",
  "Business Clearance": "business",
  "Certificate of Good Moral Character": "character",
  "First-Time Jobseeker Certification": "jobseeker",
  "First-Time Job Seeker Certification": "jobseeker",
};

function DocumentPreviewModal({ request, onClose, onSave, readOnly = false }) {
  const { token, user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [fields, setFields] = useState(request?.document_content || request?.details?.form_fields || {});
  const [paperDesign, setPaperDesign] = useState("");
  const [applicantPhoto, setApplicantPhoto] = useState(null);
  const [paperDesignLoading, setPaperDesignLoading] = useState(() => Boolean(
    request?.type?.id && /\.jpe?g$/i.test(request?.type?.uploaded_template_name || ""),
  ));
  const [saving, setSaving] = useState(false);
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

  useEffect(() => {
    const photoPath = request?.details?.requirements?.applicant_photo?.path;
    if (!request?.id || !token || !photoPath || request.document_type !== "Barangay Certification") {
      return undefined;
    }

    const controller = new AbortController();
    let photoUrl = "";
    fetch(`http://127.0.0.1:8000/api/staff/document-requests/${request.id}/requirements/applicant_photo`, {
      headers: { Accept: "application/json", Authorization: "Bearer " + token },
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error("Unable to load the applicant photo.");
        return response.blob();
      })
      .then((image) => {
        if (!image.type.startsWith("image/")) throw new Error("The applicant photo is not a supported image.");
        if (controller.signal.aborted) return;
        photoUrl = URL.createObjectURL(image);
        setApplicantPhoto({ path: photoPath, url: photoUrl });
      })
      .catch((photoError) => {
        if (!controller.signal.aborted) setError(photoError.message);
      });

    return () => {
      controller.abort();
      if (photoUrl) URL.revokeObjectURL(photoUrl);
    };
  }, [request?.id, request?.document_type, request?.details?.requirements?.applicant_photo?.path, token]);

  if (!request) return null;

  const documentType = request.document_type;
  const templateType = TEMPLATE_TYPES[documentType] || "generic";
  const label = request.document_type_label || DOCUMENT_LABELS[documentType] || documentType;
  const photoPath = request.details?.requirements?.applicant_photo?.path;
  const applicantPhotoUrl = applicantPhoto?.path === photoPath ? applicantPhoto.url : "";
  const paperSize = ["a4", "legal"].includes(request.type?.paper_size) ? request.type.paper_size : "letter";
  const residentName = [fields.first_name, fields.middle_name, fields.last_name]
    .filter(Boolean)
    .join(" ") || fields.full_name || request.resident?.name || "Resident Name";
  const issueDate = new Date(request.released_at || request.document_generated_at || request.created_at);
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

  const handleFieldChange = (fieldName, value) => {
    setFields((current) => {
      const updated = { ...current, [fieldName]: value };
      if (
        request.type?.template &&
        request.document_type === "Barangay Certification" &&
        ["sex", "derogatory_status"].includes(fieldName) &&
        current.document_body
      ) {
        updated.document_body = renderDocumentTemplate(
          request.type.template,
          updated,
          request,
          residentName,
          label,
          formattedDate,
        );
      }
      return updated;
    });
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
                  const initialFields = { ...(request.document_content || request.details?.form_fields || {}) };
                  if (request.document_type === "Barangay Certification" && !initialFields.derogatory_status) {
                    initialFields.derogatory_status = "pending_verification";
                  }
                  if (request.type?.template && request.type?.template_enabled !== false) {
                    const generatedBody = renderDocumentTemplate(request.type.template, initialFields, request, residentName, label, formattedDate);
                    initialFields.document_body = request.document_type === "Barangay Certification"
                      ? syncClearanceBody(generatedBody, initialFields, generatedBody)
                      : initialFields.document_body || generatedBody;
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
              onClick={() => window.print()}
              disabled={paperDesignLoading}
              className="inline-flex items-center justify-center rounded-xl bg-[#2455D6] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#1D46B5] focus:outline-none focus:ring-2 focus:ring-[#2455D6]/30 disabled:cursor-wait disabled:opacity-60"
            >
              {paperDesignLoading ? "Loading design..." : "Print"}
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
        {editing && request.document_type === "Barangay Certification" && (
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
            <label htmlFor="clearance-record-check" className="block text-sm font-bold text-slate-800">
              Barangay record-check outcome
              <select
                id="clearance-record-check"
                value={fields.derogatory_status || "pending_verification"}
                onChange={(event) => handleFieldChange("derogatory_status", event.target.value)}
                className="mt-2 block w-full max-w-lg rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800"
              >
                <option value="pending_verification">PENDING VERIFICATION</option>
                <option value="no_derogatory_record">NO DEROGATORY RECORD ON FILE</option>
                <option value="refer_authorized_review">REFER FOR AUTHORIZED REVIEW</option>
              </select>
            </label>
            <p className="mt-2 max-w-3xl text-xs leading-5 text-slate-600">
              Confirm NO DEROGATORY RECORD ON FILE only after checking barangay records. Pending or in-progress complaints keep this request pending; a complaint alone is not proof of wrongdoing. Use REFER FOR AUTHORIZED REVIEW only for a substantiated adverse finding under approved barangay rules. A referral cannot be released.
            </p>
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
              templateType={templateType}
              applicantPhoto={applicantPhotoUrl}
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
              onFieldChange={handleFieldChange}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function renderDocumentTemplate(template, fields, request, residentName, label, formattedDate) {
  const issuedDate = new Date(request.released_at || request.document_generated_at || request.created_at);
  const issuedDayValue = new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", day: "numeric" }).format(issuedDate);
  const birthDate = fields.date_of_birth ? new Date(`${String(fields.date_of_birth).slice(0, 10)}T00:00:00`) : null;
  const sex = String(fields.sex || "").trim().toLowerCase();
  const isFemale = ["female", "f", "woman"].includes(sex);
  const isMale = ["male", "m", "man"].includes(sex);
  const recordCheckStatements = {
    no_derogatory_record: "NO DEROGATORY RECORD ON FILE",
    pending_verification: "PENDING VERIFICATION",
    refer_authorized_review: "REFER FOR AUTHORIZED REVIEW",
  };
  const values = {
    ...fields,
    date_of_birth: birthDate && !Number.isNaN(birthDate.getTime())
      ? new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", month: "long", day: "numeric", year: "numeric" }).format(birthDate)
      : fields.date_of_birth,
    resident_name: residentName,
    full_name: fields.full_name || [fields.first_name, fields.middle_name, fields.last_name].filter(Boolean).join(" ") || residentName,
    document_title: label,
    document_number: String(request.id).padStart(6, "0"),
    date_issued: formattedDate,
    issued_day: `${issuedDayValue}${ordinalSuffix(Number(issuedDayValue))}`,
    issued_month: new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", month: "long" }).format(issuedDate),
    issued_year: new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", year: "numeric" }).format(issuedDate),
    object_pronoun: isFemale ? "her" : isMale ? "him" : "them",
    subject_pronoun: isFemale ? "she" : isMale ? "he" : "they",
    subject_verb: isFemale || isMale ? "is" : "are",
    derogatory_remarks: recordCheckStatements[fields.derogatory_status] || "PENDING VERIFICATION",
  };

  return template.replace(/\{\{([a-z][a-z0-9_]*)\}\}/gi, (placeholder, key) => {
    const value = values[key];
    return value === undefined || value === null ? placeholder : String(value);
  });
}

function syncClearanceBody(body, fields, generatedBody) {
  const sex = String(fields.sex || "").trim().toLowerCase();
  const isFemale = ["female", "f", "woman"].includes(sex);
  const isMale = ["male", "m", "man"].includes(sex);
  const objectPronoun = isFemale ? "her" : isMale ? "him" : "them";
  const subjectPronoun = isFemale ? "she" : isMale ? "he" : "they";
  const subjectVerb = isFemale || isMale ? "is" : "are";
  const recordCheckStatements = {
    no_derogatory_record: "NO DEROGATORY RECORD ON FILE",
    pending_verification: "PENDING VERIFICATION",
    refer_authorized_review: "REFER FOR AUTHORIZED REVIEW",
  };
  const remark = recordCheckStatements[fields.derogatory_status] || "PENDING VERIFICATION";

  return String(body || generatedBody)
    .replace(/against\s+(her|him|them)\b/i, `against ${objectPronoun}`)
    .replace(/as of this date,\s*(she|he|they)\s+(is|are)\s+a law[- ]abiding citizen\.?/i, `as of this date, ${subjectPronoun} ${subjectVerb} a law abiding citizen.`)
    .replace(/^(REMARKS\s*:\s*).*$/im, `$1${remark}`);
}

function getPunongBarangayName(template) {
  const lines = String(template || "").trim().split(/\r?\n/);
  const titleIndex = lines.findIndex((line) => line.trim().toLowerCase() === "punong barangay");
  const name = titleIndex > 0 ? lines[titleIndex - 1].trim() : "";
  return name || "HON. FE Q. CUYOS";
}

function AdminClearanceTemplate({ template, applicantPhoto }) {
  const lines = String(template || "").split(/\r?\n/);
  const content = [];
  let index = 0;
  let photoPlaced = false;

  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line) {
      content.push(<div key={`space-${index}`} className="h-2" aria-hidden="true" />);
      index += 1;
      continue;
    }

    if (/left thumb mark/i.test(line) && /right thumb mark/i.test(line)) {
      content.push(
        <div key={`thumbs-${index}`} className="mt-2 flex justify-end gap-2 pr-[0.05in]">
          {["Left Thumb Mark", "Right Thumb Mark"].map((label) => (
            <div key={label} className="w-[1.15in] text-center">
              <div className="h-[1.05in] border border-black" />
              <p className="mt-1 text-[7pt]">{label}</p>
            </div>
          ))}
        </div>,
      );
      index += 1;
      continue;
    }

    if (/^_+$/.test(line)) {
      content.push(
        <div key={`signature-line-${index}`} className="mt-3 flex justify-end pr-[0.05in]">
          <div className="h-6 w-[2.2in] border-b border-black" />
        </div>,
      );
      index += 1;
      continue;
    }

    if (line.includes(":")) {
      const detailLines = [];
      while (index < lines.length && lines[index].trim().includes(":")) {
        const [label, ...valueParts] = lines[index].split(":");
        detailLines.push({
          label: label.trim(),
          value: valueParts.join(":").trim(),
          key: index,
        });
        index += 1;
      }

      content.push(
        <div key={`details-${detailLines[0].key}`} className="grid grid-cols-[1fr_1.2in] gap-x-3">
          <div className="space-y-0.5">
            {detailLines.map((detail) => (
              <ClearanceDetail key={detail.key} label={detail.label} value={detail.value} />
            ))}
          </div>
          {!photoPlaced && (
            <div className="mt-3 flex h-[1.2in] w-[1.2in] items-center justify-center overflow-hidden bg-white">
              {applicantPhoto
                ? <img src={applicantPhoto} alt="Applicant photo" className="h-full w-full object-cover" />
                : <span className="text-center text-[7pt] text-slate-500">Applicant photo</span>}
            </div>
          )}
        </div>,
      );
      photoPlaced = true;
      continue;
    }

    if (/^applicant['’]s signature$/i.test(line)) {
      content.push(
        <p key={`signature-label-${index}`} className="pr-[0.05in] text-right text-[7pt]">
          {line}
        </p>,
      );
      index += 1;
      continue;
    }

    if (
      lines[index + 1]?.trim().toLowerCase() === "punong barangay"
    ) {
      index += 1;
      continue;
    }

    if (/^punong barangay$/i.test(line) && index > 0) {
      content.push(
        <div key={`signatory-${index}`} className="mt-2 flex justify-end pr-[0.05in] text-center leading-tight">
          <div className="w-[2.8in]">
            <p className="text-[10pt] font-bold">{lines[index - 1].trim()}</p>
            <p className="text-[9pt]">{line}</p>
          </div>
        </div>,
      );
      index += 1;
      continue;
    }

    content.push(
      <p key={`text-${index}`} className={/^paid under$/i.test(line) ? "mt-2 text-[7pt]" : ""}>
        {line}
      </p>,
    );
    index += 1;
  }

  return <div>{content}</div>;
}

function FormattedTemplateText({ text }) {
  return String(text).split(/\n\s*\n/).map((paragraph, index) => (
    <p key={index} className="mb-4 last:mb-0">
      {paragraph.split(/(\*\*[^*]+\*\*)/g).map((part, partIndex) => (
        part.startsWith("**") && part.endsWith("**")
          ? <strong key={partIndex}>{part.slice(2, -2)}</strong>
          : <span key={partIndex}>{part.split("\n").flatMap((line, lineIndex) => lineIndex ? [<br key={`br-${lineIndex}`} />, line] : [line])}</span>
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

function CertificateValue({ value, field, editing, onFieldChange, className = "" }) {
  if (editing && field !== "age") {
    return (
      <input
        aria-label={field.replaceAll("_", " ")}
        value={value || ""}
        onChange={(event) => onFieldChange(field, event.target.value)}
        className={`inline-block min-w-14 border-b border-dashed border-slate-400 bg-white/80 px-1 text-center font-semibold outline-none focus:border-[#2455D6] ${className}`}
      />
    );
  }
  const hasValue = value !== undefined && value !== null && value !== "";
  return <span className={`font-semibold ${className}`}>{hasValue ? value : "________________"}</span>;
}

function BarangayCertificateTemplate({ residentName, fields, issuedDay, issuedMonth, issuedYear, editing, onFieldChange }) {
  const nameParts = residentName.trim().split(/\s+/);
  const firstName = Object.hasOwn(fields, "first_name") ? fields.first_name : nameParts[0];
  const middleName = Object.hasOwn(fields, "middle_name") ? fields.middle_name : nameParts.slice(1, -1).join(" ");
  const lastName = Object.hasOwn(fields, "last_name") ? fields.last_name : nameParts.length > 1 ? nameParts.at(-1) : "";
  const age = fields.age ?? calculateAgeFromBirthDate(fields.date_of_birth);

  return (
    <div className="mx-auto max-w-3xl space-y-8 pt-5 text-[12px] leading-8 text-slate-800">
      <p>
        This is to certify that <CertificateValue value={firstName} field="first_name" editing={editing} onFieldChange={onFieldChange} />{" "}
        {middleName && <><CertificateValue value={middleName} field="middle_name" editing={editing} onFieldChange={onFieldChange} />{" "}</>}
        {editing && !middleName && <><CertificateValue value="" field="middle_name" editing onFieldChange={onFieldChange} />{" "}</>}
        <CertificateValue value={lastName} field="last_name" editing={editing} onFieldChange={onFieldChange} />,{" "}
        <CertificateValue value={age} field="age" editing={editing} onFieldChange={onFieldChange} /> years old, <CertificateValue value={fields.sex} field="sex" editing={editing} onFieldChange={onFieldChange} />, <CertificateValue value={fields.civil_status} field="civil_status" editing={editing} onFieldChange={onFieldChange} />, <CertificateValue value={fields.citizenship} field="citizenship" editing={editing} onFieldChange={onFieldChange} /> citizen, and a bona fide resident of Purok <CertificateValue value={fields.purok} field="purok" editing={editing} onFieldChange={onFieldChange} />, Barangay Tayud, Consolacion, Cebu, is an indigent member of this barangay.
      </p>
      <p>
        This certification is issued at the request of the above-named person for <CertificateValue value={fields.purpose} field="purpose" editing={editing} onFieldChange={onFieldChange} /> and for whatever legal purpose it may serve.
      </p>
      <p>
        Issued and Given this <CertificateValue value={issuedDay} field="age" editing={false} onFieldChange={onFieldChange} /> day of {issuedMonth}, {issuedYear}, at Barangay Tayud, Consolacion, Cebu, Philippines.
      </p>
    </div>
  );
}

function ClearanceDetail({ label, value }) {
  return (
    <div className="grid grid-cols-[1.05in_0.12in_1fr] gap-x-1 text-[9pt] leading-[1.5] text-black">
      <span className="font-bold">{label}</span>
      <span>:</span>
      <span>{value || ""}</span>
    </div>
  );
}

function BarangayClearanceCertificate({ request, fields, applicantPhoto, signatoryName, narrative }) {
  const issuedDate = new Date(request.released_at || request.document_generated_at || request.created_at);
  const dateParts = new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(issuedDate).reduce((parts, item) => ({ ...parts, [item.type]: item.value }), {});
  const serialYear = dateParts.year.slice(-2);
  const serialNumber = `BJNO. ${serialYear}-${String(request.id).padStart(4, "0")}`;
  const shortDate = `${dateParts.month}/${dateParts.day}/${dateParts.year}`;
  const birthDate = fields.date_of_birth
    ? new Date(`${String(fields.date_of_birth).slice(0, 10)}T00:00:00`)
    : null;
  const formattedBirthDate = birthDate && !Number.isNaN(birthDate.getTime())
    ? new Intl.DateTimeFormat("en-PH", {
        timeZone: "Asia/Manila",
        month: "long",
        day: "numeric",
        year: "numeric",
      }).format(birthDate)
    : fields.date_of_birth;

  return (
    <div className="flex h-full flex-col font-sans text-black">
      <div className="mb-3 self-end text-right text-[8pt] leading-[1.2]">
        <p className="font-bold">{serialNumber}</p>
        <p>{shortDate}</p>
        <p>(Date)</p>
      </div>

      <p className="mb-2 text-justify text-[9pt] leading-[1.35] indent-[0.4in]">
        {narrative}
      </p>

      <div className="grid grid-cols-[1fr_1.35in] gap-x-3">
        <div className="space-y-0.5">
          <ClearanceDetail label="NAME" value={fields.full_name || [fields.first_name, fields.middle_name, fields.last_name].filter(Boolean).join(" ")} />
          <ClearanceDetail label="HOME ADDRESS" value={fields.address} />
          <ClearanceDetail label="PLACE OF BIRTH" value={fields.place_of_birth} />
          <ClearanceDetail label="DATE OF BIRTH" value={formattedBirthDate} />
          <ClearanceDetail label="REMARKS" value={fields.derogatory_status === "no_derogatory_record" ? "NO DEROGATORY RECORD ON FILE" : fields.derogatory_status === "refer_authorized_review" ? "REFER FOR AUTHORIZED REVIEW" : "PENDING VERIFICATION"} />
          <ClearanceDetail label="PURPOSE" value={fields.purpose} />
        </div>
        <div className="mt-[0.4in] flex h-[1.2in] w-[1.2in] items-center justify-center overflow-hidden bg-white">
          {applicantPhoto ? (
            <img src={applicantPhoto} alt="Applicant photo" className="h-full w-full object-cover" />
          ) : (
            <span className="text-center text-[7pt] text-slate-500">Applicant photo</span>
          )}
        </div>
      </div>

      <div className="mt-3 flex justify-end">
        <div className="mr-[0.05in] flex w-[2.2in] flex-col items-center">
          <div className="h-6 w-full border-b border-black" />
          <p className="mt-1 text-[7pt]">Applicant&apos;s Signature</p>
        </div>
      </div>

      <div className="mt-2 space-y-1 text-[9pt] leading-tight">
        <ClearanceDetail label="VALID FOR" value="Six (6) Months" />
        <ClearanceDetail label="Res. Cert. No." value="____________________" />
        <ClearanceDetail label="Issued at" value="CONSOLACION, CEBU" />
      </div>

      <div className="mt-1 flex justify-end gap-2 pr-[0.05in]">
        {["Left Thumb Mark", "Right Thumb Mark"].map((label) => (
          <div key={label} className="w-[1.15in] text-center">
            <div className="h-[1.05in] border border-black" />
            <p className="mt-1 text-[7pt]">{label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-end pr-[0.05in] text-center leading-tight">
        <div className="w-[2.8in]">
          <p className="text-[10pt] font-bold">{signatoryName}</p>
          <p className="text-[9pt]">Punong Barangay</p>
        </div>
      </div>

      <div className="relative z-20 mt-2 w-fit bg-white px-2 py-1 text-[7pt] leading-[1.2]">
        <p className="mb-0.5">Paid Under</p>
        <ClearanceDetail label="O.R. No." value="____________________" />
        <ClearanceDetail label="Amount Paid" value="₱ 75.00" />
        <ClearanceDetail label="Doc. Stamp" value="₱ 30.00" />
      </div>
    </div>
  );
}

function DocumentPaper({ request, templateType, applicantPhoto, label, residentName, formattedDate, fields, issuedDay, issuedMonth, issuedYear, paperDesign, paperSize, editing, onFieldChange }) {
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
  const generatedTemplateBody = request.type?.template
    ? renderDocumentTemplate(request.type.template, fields, request, residentName, label, formattedDate)
    : "";
  const templateBody = request.document_type === "Barangay Certification"
    ? syncClearanceBody(generatedTemplateBody, fields, generatedTemplateBody)
    : fields.document_body || generatedTemplateBody;
  const isClearance = request.document_type === "Barangay Certification";
  const paper = (
    <article data-paper-size={paperSize} className={`document-paper relative mx-auto flex min-h-[11in] w-full flex-col overflow-hidden bg-white shadow-sm ${isClearance ? "document-paper--clearance" : ""} ${paperDesign ? "document-paper--designed p-0" : isClearance ? "p-[0.3in]" : "p-[0.55in]"}`} style={{ "--paper-width": dimensions.width, "--paper-height": dimensions.height, "--document-text-color": layout.text_color, "--document-accent-color": layout.accent_color, width: dimensions.width, height: dimensions.height, minHeight: dimensions.height, color: layout.text_color }}>
      {paperDesign && <img src={paperDesign} alt="Uploaded document paper design" className="pointer-events-none absolute inset-0 h-full w-full object-fill" style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }} />}
      {!paperDesign && !isClearance && <header className="relative z-10 border-b border-[#123F70] pb-4">
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
      </header>}

      <div className="relative z-10 flex-1" style={paperDesign ? { paddingTop: `${layout.content_top}mm`, paddingLeft: `${layout.content_left}mm`, paddingRight: `${layout.content_right}mm`, paddingBottom: `${layout.content_bottom}mm` } : isClearance ? {} : { paddingTop: "20px", paddingBottom: "20px" }}>
        {!isClearance && <h1 className="mb-7 text-center text-[16px] font-bold uppercase tracking-wide" style={{ color: layout.accent_color }}>{label}</h1>}
        {templateType === "barangay" && !isClearance && (
          <div className="mb-4 flex justify-end">
            <div className="flex h-[1.5in] w-[1.25in] items-center justify-center overflow-hidden border border-slate-500 bg-white text-center text-[9px] text-slate-400">
              {applicantPhoto
                ? <img src={applicantPhoto} alt="Applicant photo" className="h-full w-full object-cover" />
                : "Applicant photo"}
            </div>
          </div>
        )}
        {isClearance && !editing && request.type?.template && request.type?.template_enabled !== false ? (
          <div className="document-wording text-[9pt] leading-[1.45] text-black">
            <AdminClearanceTemplate template={templateBody} applicantPhoto={applicantPhoto} />
          </div>
        ) : isClearance && !editing ? (
          <BarangayClearanceCertificate
            request={request}
            fields={fields}
            applicantPhoto={applicantPhoto}
            signatoryName={getPunongBarangayName(request.type?.template)}
            narrative={templateBody.split(/\n\s*\n/)[0]}
          />
        ) : request.type?.template && request.type?.template_enabled !== false ? (
          <div className="document-wording whitespace-pre-wrap" style={{ color: layout.text_color, fontSize: `${layout.font_size_pt}pt`, lineHeight: 1.55 }}>
            {editing ? (
              <textarea
                aria-label="Edit document wording"
                value={templateBody}
                onChange={(event) => onFieldChange("document_body", event.target.value)}
                className="min-h-[5in] w-full resize-y rounded-lg border border-[#F1D9A8] bg-white p-4 text-inherit outline-none focus:border-[#2455D6] focus:ring-2 focus:ring-[#2455D6]/20"
              />
            ) : (
              <FormattedTemplateText text={templateBody} />
            )}
          </div>
        ) : (
          <>
            {templateType === "barangay" && <BarangayTemplate request={request} residentName={residentName} fields={fields} editing={editing} onFieldChange={onFieldChange} />}
            {templateType === "barangay_certificate" && <BarangayCertificateTemplate residentName={residentName} fields={fields} issuedDay={issuedDay} issuedMonth={issuedMonth} issuedYear={issuedYear} editing={editing} onFieldChange={onFieldChange} />}
            {templateType === "residency" && <ResidencyTemplate request={request} residentName={residentName} fields={fields} editing={editing} onFieldChange={onFieldChange} />}
            {templateType === "business" && <BusinessTemplate request={request} residentName={residentName} fields={fields} editing={editing} onFieldChange={onFieldChange} />}
            {templateType === "character" && <CharacterTemplate request={request} residentName={residentName} fields={fields} editing={editing} onFieldChange={onFieldChange} />}
            {templateType === "jobseeker" && <JobseekerTemplate request={request} residentName={residentName} fields={fields} editing={editing} onFieldChange={onFieldChange} />}
            {templateType === "generic" && <GenericTemplate label={label} residentName={residentName} fields={fields} editing={editing} onFieldChange={onFieldChange} />}
          </>
        )}
      </div>

      {!paperDesign && !isClearance && <footer className="relative z-10 grid grid-cols-[1fr_auto] gap-8 border-t border-slate-200 pt-4">
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
