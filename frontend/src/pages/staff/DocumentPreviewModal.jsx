import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  BUSINESS_CLEARANCE_WORDING,
  CONSTRUCTION_PERMIT_WORDING,
  FENCING_PERMIT_WORDING,
  isLegacyBusinessClearanceWording,
} from "../../utils/documentWording";

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
  "Business Permit": "business",
  "Barangay Indigency": "indigency",
  "Business Clearance": "business",
  "Certificate of Good Moral Character": "character",
  "First-Time Jobseeker Certification": "jobseeker",
  "First-Time Job Seeker Certification": "jobseeker",
  Cedula: "cedula",
  "Cedula (Community Tax Certificate)": "cedula",
};

function getDocumentDate(request) {
  const candidate =
    request?.released_at ||
    request?.document_generated_at ||
    request?.created_at;
  const date = candidate ? new Date(candidate) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function getBusinessClearanceIssueDate(request) {
  const usesReleaseDate = ["ready_for_release", "completed"].includes(
    request?.status,
  );
  const candidate =
    request?.released_at ||
    (usesReleaseDate ? request?.status_changed_at : null) ||
    request?.document_generated_at ||
    request?.created_at;
  const date = candidate ? new Date(candidate) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function getBusinessClearanceValidUntil(request) {
  const issueDate = getBusinessClearanceIssueDate(request);
  const dateParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  })
    .formatToParts(issueDate)
    .reduce(
      (parts, item) => ({ ...parts, [item.type]: Number(item.value) }),
      {},
    );
  const nextYear = dateParts.year + 1;
  const daysInTargetMonth = new Date(
    Date.UTC(nextYear, dateParts.month, 0),
  ).getUTCDate();
  const validDate = new Date(
    Date.UTC(
      nextYear,
      dateParts.month - 1,
      Math.min(dateParts.day, daysInTargetMonth),
    ),
  );
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "UTC",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(validDate);
}

function formatFieldValue(value) {
  if (value === null || value === undefined || value === "")
    return "Not provided";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function formatPermitResidentAddress(addressValue, purokValue) {
  const address = String(addressValue || "").trim();
  if (!address && purokValue) {
    return `${formatPurok(purokValue)}, Barangay Tayud, Consolacion, Cebu`;
  }
  if (!address) return "[Purok], Barangay Tayud, Consolacion, Cebu";
  const [firstPart = "", ...remainingParts] = address.split(",");
  const firstPartIsPurok =
    /^purok\b/i.test(firstPart.trim()) ||
    !remainingParts.length ||
    /barangay|consolacion|cebu/i.test(remainingParts.join(" "));
  const normalizedFirstPart = firstPartIsPurok
    ? formatPurok(firstPart)
    : firstPart.trim();
  return [normalizedFirstPart, ...remainingParts.map((part) => part.trim())]
    .filter(Boolean)
    .join(", ");
}

function formatPurok(value) {
  const purok = String(value || "").trim();
  if (!purok) return "";
  return /^purok\b/i.test(purok) ? purok : `Purok ${purok}`;
}

function stripPurokPrefix(value) {
  return String(value || "")
    .trim()
    .replace(/^purok\s+/i, "");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function insertNameBeforeRole(text, role, name) {
  if (!name) return text;
  const pattern = new RegExp(`(^|\\n)(\\s*)${escapeRegExp(role)}\\b`, "im");
  return text.replace(pattern, (match, lineStart, indentation, offset, source) => {
    const previousLine = source
      .slice(0, offset)
      .trimEnd()
      .split("\n")
      .at(-1)
      ?.replaceAll("**", "")
      .trim();
    if (previousLine?.toLowerCase() === String(name).trim().toLowerCase()) {
      return match;
    }
    return `${lineStart}${indentation}**${name}**\n${indentation}${role}`;
  });
}

function openDocumentPrintDialog() {
  const modal = document.getElementById("document-preview-modal");
  if (!modal) {
    window.print();
    return;
  }

  const changedDisplays = [];
  let branch = modal;
  while (branch?.parentElement) {
    const parent = branch.parentElement;
    Array.from(parent.children).forEach((sibling) => {
      if (sibling === branch) return;
      changedDisplays.push({
        element: sibling,
        value: sibling.style.getPropertyValue("display"),
        priority: sibling.style.getPropertyPriority("display"),
      });
      sibling.style.setProperty("display", "none", "important");
    });

    if (parent !== document.body) {
      changedDisplays.push({
        element: parent,
        value: parent.style.getPropertyValue("display"),
        priority: parent.style.getPropertyPriority("display"),
      });
      parent.style.setProperty("display", "contents", "important");
    }

    if (parent === document.body) break;
    branch = parent;
  }

  let restored = false;
  const restoreLayout = () => {
    if (restored) return;
    restored = true;
    changedDisplays.reverse().forEach(({ element, value, priority }) => {
      if (value) element.style.setProperty("display", value, priority);
      else element.style.removeProperty("display");
    });
    window.removeEventListener("afterprint", restoreLayout);
  };

  window.addEventListener("afterprint", restoreLayout);
  try {
    window.print();
  } catch (error) {
    restoreLayout();
    throw error;
  }
}

function DocumentPreviewModal({ request, onClose, onSave, readOnly = false }) {
  const { token, user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [fields, setFields] = useState(() => {
    const initialFields =
      request?.document_content || request?.details?.form_fields || {};
    if (request?.document_type !== "Barangay Certification")
      return initialFields;
    return {
      ...initialFields,
      address: initialFields.address || "",
      derogatory_status: request?.identity_review?.has_blocking_case
        ? "pending_verification"
        : request?.identity_review?.has_involved_person_match &&
            !initialFields.derogatory_reviewed
          ? "required_review"
          : initialFields.derogatory_reviewed
            ? initialFields.derogatory_status || "no_derogatory_record"
            : "no_derogatory_record",
    };
  });
  const [paperDesign, setPaperDesign] = useState("");
  const [applicantPhoto, setApplicantPhoto] = useState(null);
  const [paperDesignLoading, setPaperDesignLoading] = useState(() =>
    Boolean(
      request?.type?.id &&
      /\.jpe?g$/i.test(request?.type?.uploaded_template_name || ""),
    ),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [checkingPrintEligibility, setCheckingPrintEligibility] =
    useState(false);
  const isClearance = request?.document_type === "Barangay Certification";
  const isGoodMoral =
    request?.document_type === "Certificate of Good Moral Character";
  const requiresCaseReview = isClearance || isGoodMoral;
  const clearanceHasBlockingCase = Boolean(
    request?.identity_review?.has_blocking_case,
  );
  const clearanceHasInvolvedPersonMatch = Boolean(
    request?.identity_review?.has_involved_person_match,
  );
  const clearancePrintBlocked =
    isClearance &&
    (clearanceHasBlockingCase ||
      fields.derogatory_status !== "no_derogatory_record" ||
      (clearanceHasInvolvedPersonMatch && !fields.derogatory_reviewed));
  const goodMoralPrintBlocked =
    isGoodMoral &&
    (clearanceHasBlockingCase || clearanceHasInvolvedPersonMatch);
  const printBlocked = clearancePrintBlocked || goodMoralPrintBlocked;

  const printDocument = useCallback(async () => {
    if (paperDesignLoading || checkingPrintEligibility) return;
    if (!requiresCaseReview) {
      openDocumentPrintDialog();
      return;
    }
    if (isClearance && fields.derogatory_status !== "no_derogatory_record") {
      setError(
        "Printing is blocked until the clearance record check is confirmed as NO DEROGATORY RECORDS.",
      );
      return;
    }
    if (
      isClearance &&
      clearanceHasInvolvedPersonMatch &&
      !fields.derogatory_reviewed
    ) {
      setError(
        "A close name match was found in complaint records. Review it, select an outcome, and save before printing.",
      );
      return;
    }

    setCheckingPrintEligibility(true);
    setError("");
    try {
      const area = user?.role === "admin" ? "admin" : "staff";
      const response = await fetch(
        `http://127.0.0.1:8000/api/${area}/document-requests/${request.id}`,
        {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const payload = await response.json();
      if (!response.ok)
        throw new Error(
          payload.message ||
            "Unable to verify the clearance record before printing.",
        );
      if (payload.data?.identity_review?.has_blocking_case) {
        setError(
          "Printing is blocked while this resident has an unresolved complaint or an open or referred case.",
        );
        return;
      }
      if (
        isGoodMoral &&
        payload.data?.identity_review?.has_involved_person_match
      ) {
        setError(
          "Printing is blocked because this resident is listed in an unresolved complaint’s involved-person list.",
        );
        return;
      }
      if (
        payload.data?.identity_review?.has_involved_person_match &&
        !payload.data?.document_content?.derogatory_reviewed
      ) {
        setError(
          "A close name match was found in complaint records. Review and save the record-check outcome before printing.",
        );
        return;
      }
      openDocumentPrintDialog();
    } catch (printError) {
      setError(
        printError.message ||
          "Unable to verify the clearance record before printing.",
      );
    } finally {
      setCheckingPrintEligibility(false);
    }
  }, [
    checkingPrintEligibility,
    clearanceHasInvolvedPersonMatch,
    fields.derogatory_reviewed,
    fields.derogatory_status,
    isClearance,
    isGoodMoral,
    paperDesignLoading,
    requiresCaseReview,
    request?.id,
    token,
    user?.role,
  ]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "p") {
        event.preventDefault();
        void printDocument();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, printDocument]);

  useEffect(() => {
    const templateName = request?.type?.uploaded_template_name || "";
    if (!request?.type?.id || !token || !/\.jpe?g$/i.test(templateName)) {
      return undefined;
    }

    const controller = new AbortController();
    let previewUrl = "";
    const area = user?.role === "admin" ? "admin" : "staff";
    fetch(
      `http://127.0.0.1:8000/api/${area}/document-types/${request.type.id}/template`,
      {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        signal: controller.signal,
      },
    )
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
  }, [
    request?.id,
    request?.type?.id,
    request?.type?.uploaded_template_name,
    token,
    user?.role,
  ]);

  useEffect(() => {
    const photoPath = request?.details?.requirements?.applicant_photo?.path;
    if (
      !request?.id ||
      !token ||
      !photoPath ||
      request.document_type !== "Barangay Certification"
    ) {
      return undefined;
    }

    const controller = new AbortController();
    let photoUrl = "";
    const area = user?.role === "admin" ? "admin" : "staff";
    fetch(
      `http://127.0.0.1:8000/api/${area}/document-requests/${request.id}/requirements/applicant_photo`,
      {
        headers: {
          Accept: "application/json",
          Authorization: "Bearer " + token,
        },
        signal: controller.signal,
      },
    )
      .then((response) => {
        if (!response.ok)
          throw new Error("Unable to load the applicant photo.");
        return response.blob();
      })
      .then((image) => {
        if (!image.type.startsWith("image/"))
          throw new Error("The applicant photo is not a supported image.");
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
  }, [
    request?.id,
    request?.document_type,
    request?.details?.requirements?.applicant_photo?.path,
    token,
    user?.role,
  ]);

  if (!request) return null;

  const documentType = request.document_type;
  const templateType = TEMPLATE_TYPES[documentType] || "generic";
  const label =
    request.document_type_label ||
    DOCUMENT_LABELS[documentType] ||
    documentType;
  const photoPath = request.details?.requirements?.applicant_photo?.path;
  const applicantPhotoUrl =
    applicantPhoto && applicantPhoto.path === photoPath
      ? applicantPhoto.url
      : "";
  const paperSize = ["a4", "legal"].includes(request.type?.paper_size)
    ? request.type.paper_size
    : "letter";
  const isCedula =
    documentType === "Cedula" ||
    documentType === "Cedula (Community Tax Certificate)";
  const paperWidth = isCedula
    ? "8.5in"
    : paperSize === "a4"
      ? "8.27in"
      : "8.5in";
  const paperHeight = isCedula
    ? "5.5in"
    : paperSize === "a4"
      ? "11.69in"
      : paperSize === "legal"
        ? "14in"
        : "11in";
  const printPageSize = isCedula ? "8.5in 5.5in" : paperSize;
  const nameParts = [fields.first_name, fields.middle_name, fields.last_name]
    .filter(Boolean)
    .join(" ");
  const residentName =
    (documentType === "Business Permit"
      ? fields.full_name || nameParts
      : nameParts) ||
    fields.full_name ||
    request.resident?.name ||
    "Resident Name";
  const issueDate =
    documentType === "Business Permit"
      ? getBusinessClearanceIssueDate(request)
      : getDocumentDate(request);
  const issueDateParts = new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
    .formatToParts(issueDate)
    .reduce((parts, item) => ({ ...parts, [item.type]: item.value }), {});
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
      if (fieldName === "derogatory_status") updated.derogatory_reviewed = true;
      return updated;
    });
  };

  return (
    <div
      id="document-preview-modal"
      style={{
        "--paper-width": paperWidth,
        "--paper-height": paperHeight,
        "--document-paper-size": printPageSize,
      }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#071B3D]/70 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`${label} preview`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <style>{`@media print { @page { size: ${printPageSize}; margin: 0; } }`}</style>
      <div className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#2455D6]">
              Document preview
            </p>
            <h2 className="mt-1 text-lg font-bold text-[#172B4D]">{label}</h2>
          </div>
          <div className="flex items-center gap-2">
            {!readOnly && (
              <button
                type="button"
                onClick={() => {
                  setError("");
                  const initialFields = {
                    ...(request.document_content ||
                      request.details?.form_fields ||
                      {}),
                  };
                  if (request.document_type === "Barangay Certification") {
                    initialFields.address = initialFields.address || "";
                  }
                  if (request.document_type === "Barangay Certification") {
                    if (request.identity_review?.has_blocking_case) {
                      initialFields.derogatory_status = "pending_verification";
                    } else if (
                      request.identity_review?.has_involved_person_match &&
                      !initialFields.derogatory_reviewed
                    ) {
                      initialFields.derogatory_status = "required_review";
                    } else if (!initialFields.derogatory_reviewed) {
                      initialFields.derogatory_status = "no_derogatory_record";
                    }
                  }
                  if (
                    request.type?.template &&
                    request.type?.template_enabled !== false
                  ) {
                    const generatedBody = renderDocumentTemplate(
                      request.type.template,
                      initialFields,
                      request,
                      residentName,
                      label,
                      formattedDate,
                    );
                    initialFields.document_body =
                      request.document_type === "Barangay Certification"
                        ? syncClearanceBody(
                            generatedBody,
                            initialFields,
                            generatedBody,
                          )
                        : initialFields.document_body || generatedBody;
                  }
                  setFields(initialFields);
                  setEditing((current) => !current);
                }}
                disabled={
                  saving ||
                  !onSave ||
                  !["processing", "ready_for_release"].includes(request.status)
                }
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
            {!readOnly && (
              <button
                type="button"
                onClick={() => void printDocument()}
                disabled={
                  paperDesignLoading || checkingPrintEligibility || printBlocked
                }
                className="inline-flex items-center justify-center rounded-xl bg-[#2455D6] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#1D46B5] focus:outline-none focus:ring-2 focus:ring-[#2455D6]/30 disabled:cursor-wait disabled:opacity-60"
              >
                {paperDesignLoading
                  ? "Loading design..."
                  : checkingPrintEligibility
                    ? "Checking..."
                    : printBlocked
                      ? "Print blocked"
                      : "Print"}
              </button>
            )}
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
            <p className="mt-1 text-xs text-[#805900]">
              Save edits to this request before approving the document for
              release.
            </p>
          </div>
        )}
        {editing && request.document_type === "Barangay Certification" && (
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
            <label
              htmlFor="clearance-record-check"
              className="block text-sm font-bold text-slate-800"
            >
              Barangay record-check outcome
              <select
                id="clearance-record-check"
                value={
                  fields.derogatory_status ||
                  (request.identity_review?.has_blocking_case
                    ? "pending_verification"
                    : request.identity_review?.has_involved_person_match
                      ? "required_review"
                      : "no_derogatory_record")
                }
                onChange={(event) =>
                  handleFieldChange("derogatory_status", event.target.value)
                }
                className="mt-2 block w-full max-w-lg rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800"
              >
                <option value="required_review">REQUIRED REVIEW</option>
                <option value="pending_verification">
                  PENDING VERIFICATION
                </option>
                <option value="no_derogatory_record">
                  NO DEROGATORY RECORDS
                </option>
                <option value="refer_authorized_review">
                  REFER FOR AUTHORIZED REVIEW
                </option>
              </select>
            </label>
            <p className="mt-2 max-w-3xl text-xs leading-5 text-slate-600">
              A close name match in a complaint's involved-person list is
              flagged REQUIRED REVIEW. Check the record, choose the appropriate
              outcome, and save it. Unresolved complaints and open or referred
              cases still block printing and release; a complaint alone is not
              proof of wrongdoing.
            </p>
          </div>
        )}
        {!editing && isClearance && clearanceHasBlockingCase && (
          <p className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-xs font-semibold leading-5 text-amber-900">
            Remarks show PENDING VERIFICATION because an unresolved complaint or
            an open or referred blotter case is on file. This blocks clearance
            printing and release.
          </p>
        )}
        {!editing && isGoodMoral && goodMoralPrintBlocked && (
          <p className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-xs font-semibold leading-5 text-amber-900">
            This certificate cannot be printed or released while an unresolved
            complaint, open or referred blotter case, or unresolved complaint
            involved-person match is on file.
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="border-b border-[#F2D4D0] bg-[#FFF0EE] px-5 py-3 text-xs font-semibold text-[#C74444]"
          >
            {error}
          </p>
        )}

        <div className="document-preview-scroll overflow-auto bg-slate-100 p-4 sm:p-8">
          {paperDesignLoading ? (
            <div
              className="document-paper mx-auto flex items-center justify-center border border-slate-200 bg-white text-sm font-semibold text-slate-500 shadow-sm"
              style={{
                width: paperWidth,
                height: paperHeight,
              }}
              role="status"
            >
              Preparing the final document layout…
            </div>
          ) : (
            <DocumentPaper
              request={request}
              templateType={templateType}
              applicantPhoto={applicantPhotoUrl}
              label={label}
              residentName={residentName}
              issueDate={issueDate}
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

function renderDocumentTemplate(
  template,
  fields,
  request,
  residentName,
  label,
  formattedDate,
) {
  const issuedDate = getDocumentDate(request);
  const issuedDayValue = new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    day: "numeric",
  }).format(issuedDate);
  const birthDate = fields.date_of_birth
    ? new Date(`${String(fields.date_of_birth).slice(0, 10)}T00:00:00`)
    : null;
  const sex = String(fields.sex || request?.resident?.sex || "")
    .trim()
    .toLowerCase();
  const isFemale = ["female", "f", "woman"].includes(sex);
  const isMale = ["male", "m", "man"].includes(sex);
  const recordCheckStatements = {
    required_review: "REQUIRED REVIEW",
    no_derogatory_record: "NO DEROGATORY RECORDS",
    pending_verification: "PENDING VERIFICATION",
    refer_authorized_review: "REFER FOR AUTHORIZED REVIEW",
  };
  const values = {
    ...fields,
    address:
      request.document_type === "Barangay Certification"
        ? fields.address || ""
        : /\bpurok\s*\{\{\s*address\s*\}\}/i.test(template)
          ? stripPurokPrefix(fields.purok || fields.address)
          : ["Construction Permit", "Fencing Permit"].includes(
                request.document_type,
              )
            ? formatPermitResidentAddress(fields.address, fields.purok)
            : fields.address || formatPurok(fields.purok),
    purok: /\bpurok\s*\{\{\s*purok\s*\}\}/i.test(template)
      ? stripPurokPrefix(fields.purok)
      : formatPurok(fields.purok),
    date_of_birth:
      birthDate && !Number.isNaN(birthDate.getTime())
        ? new Intl.DateTimeFormat("en-PH", {
            timeZone: "Asia/Manila",
            month: "long",
            day: "numeric",
            year: "numeric",
          }).format(birthDate)
        : fields.date_of_birth,
    resident_name: residentName,
    full_name:
      fields.full_name ||
      [fields.first_name, fields.middle_name, fields.last_name]
        .filter(Boolean)
        .join(" ") ||
      residentName,
    type_of_structure:
      fields.type_of_structure ||
      fields.construction_type_other ||
      fields.construction_type ||
      "[Type of Structure/Building]",
    construction_site_address:
      fields.project_address ||
      fields.construction_site_address ||
      "[Construction Site Address]",
    property_address:
      fields.project_address || fields.property_address || "[Property Address]",
    barangay_name: fields.barangay_name || "Tayud",
    municipality:
      fields.municipality || fields.municipality_city || "Consolacion",
    document_title: label,
    document_number: String(request.id).padStart(6, "0"),
    date_issued: formattedDate,
    issued_day: `${issuedDayValue}${ordinalSuffix(Number(issuedDayValue))}`,
    issued_month: new Intl.DateTimeFormat("en-PH", {
      timeZone: "Asia/Manila",
      month: "long",
    }).format(issuedDate),
    issued_year: new Intl.DateTimeFormat("en-PH", {
      timeZone: "Asia/Manila",
      year: "numeric",
    }).format(issuedDate),
    new_application_mark: fields.application_type === "New" ? "X" : " ",
    renewal_application_mark: fields.application_type === "Renewal" ? "X" : " ",
    valid_until: getBusinessClearanceValidUntil(request),
    punong_barangay_name: [
      "Business Permit",
      "First-Time Jobseeker Certification",
      "First-Time Job Seeker Certification",
    ].includes(request.document_type)
      ? "Hon. Fe Q. Cuyos"
      : getPunongBarangayName(request.type?.template),
    pronoun: isFemale ? "she" : isMale ? "he" : "they",
    pronoun_possessive: isFemale ? "her" : isMale ? "his" : "their",
    pronoun_verb: isFemale || isMale ? "has" : "have",
    object_pronoun: isFemale ? "her" : isMale ? "him" : "them",
    subject_pronoun: isFemale ? "she" : isMale ? "he" : "they",
    subject_verb: isFemale || isMale ? "is" : "are",
    derogatory_remarks:
      recordCheckStatements[fields.derogatory_status] || "PENDING VERIFICATION",
  };

  return template.replace(/\{\{([a-z][a-z0-9_]*)\}\}/gi, (placeholder, key) => {
    const value = values[key];
    return value === undefined || value === null ? placeholder : String(value);
  });
}

function syncClearanceBody(body, fields, generatedBody) {
  const sex = String(fields.sex || "")
    .trim()
    .toLowerCase();
  const isFemale = ["female", "f", "woman"].includes(sex);
  const isMale = ["male", "m", "man"].includes(sex);
  const objectPronoun = isFemale ? "her" : isMale ? "him" : "them";
  const subjectPronoun = isFemale ? "she" : isMale ? "he" : "they";
  const subjectVerb = isFemale || isMale ? "is" : "are";
  const recordCheckStatements = {
    required_review: "REQUIRED REVIEW",
    no_derogatory_record: "NO DEROGATORY RECORDS",
    pending_verification: "PENDING VERIFICATION",
    refer_authorized_review: "REFER FOR AUTHORIZED REVIEW",
  };
  const remark =
    recordCheckStatements[fields.derogatory_status] || "PENDING VERIFICATION";

  return String(body || generatedBody)
    .replace(/against\s+(her|him|them)\b/i, `against ${objectPronoun}`)
    .replace(
      /as of this date,\s*(she|he|they)\s+(is|are)\s+a law[- ]abiding citizen\.?/i,
      `as of this date, ${subjectPronoun} ${subjectVerb} a law abiding citizen.`,
    )
    .replace(/^(REMARKS\s*:\s*).*$/im, `$1${remark}`);
}

function getPunongBarangayName() {
  return "Hon. Fe Q. Cuyos";
}

function AdminClearanceTemplate({ template, applicantPhoto, clearanceNumber }) {
  const supportingLabels = /^(valid for|res\. cert\. no\.|issued at)$/i;
  const residentCertificateNumber = String(clearanceNumber).padStart(5, "0");
  const templateLines = String(template || "").split(/\r?\n/);
  const supportingDetails = templateLines
    .map((line, key) => {
      const [label, ...valueParts] = line.split(":");
      return {
        label: label.trim(),
        value: valueParts.join(":").trim(),
        key,
      };
    })
    .filter((detail) => supportingLabels.test(detail.label))
    .map((detail) =>
      /^res\. cert\. no\.$/i.test(detail.label)
        ? { ...detail, value: residentCertificateNumber }
        : detail,
    );
  if (
    !supportingDetails.some((detail) =>
      /^res\. cert\. no\.$/i.test(detail.label),
    )
  ) {
    supportingDetails.splice(1, 0, {
      label: "Res. Cert. No.",
      value: residentCertificateNumber,
      key: "generated-res-cert-number",
    });
  }
  const lines = templateLines.filter((line, lineIndex) => {
    const [label] = line.split(":");
    const trimmed = line.trim();
    return (
      !supportingLabels.test(label.trim()) &&
      !/^applicant.*signature$/i.test(trimmed) &&
      !/^_+$/.test(trimmed) &&
      !/^punong barangay$/i.test(trimmed) &&
      !/^hon\.?\s+fe\s+q\.?\s+cuyos$/i.test(trimmed) &&
      templateLines[lineIndex + 1]?.trim().toLowerCase() !== "punong barangay"
    );
  });
  const content = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line) {
      content.push(
        <div key={`space-${index}`} className="h-2" aria-hidden="true" />,
      );
      index += 1;
      continue;
    }

    if (/left thumb mark/i.test(line) && /right thumb mark/i.test(line)) {
      content.push(
        <div key={`thumbs-${index}`} className="mt-3 flex items-center gap-5">
          <div className="min-w-0 flex-1 space-y-1">
            {supportingDetails.map((detail) => (
              <ClearanceDetail
                key={detail.key}
                label={detail.label}
                value={detail.value}
                compact
              />
            ))}
          </div>
          <div className="w-[2.45in] shrink-0">
            <div className="-mt-16 flex justify-center gap-3">
              {["Left Thumb Mark", "Right Thumb Mark"].map((label) => (
                <div key={label} className="w-[1.15in] text-center">
                  <div className="h-[1.05in] border border-black" />
                  <p className="mt-1 text-[7pt]">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>,
      );
      index += 1;
      continue;
    }

    if (/^_+$/.test(line)) {
      content.push(
        <div
          key={`signature-line-${index}`}
          className="mt-3 flex justify-end pr-[0.05in]"
        >
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

      const remarksIndex = detailLines.findIndex((detail) =>
        /^remarks$/i.test(detail.label),
      );
      content.push(
        remarksIndex < 0 ? (
          <div key={`details-${detailLines[0].key}`} className="space-y-1">
            {detailLines.map((detail) => (
              <ClearanceDetail
                key={detail.key}
                label={detail.label}
                value={detail.value}
              />
            ))}
          </div>
        ) : (
          <div key={`details-${detailLines[0].key}`} className="space-y-1">
            {detailLines.slice(0, remarksIndex).map((detail) => (
              <ClearanceDetail
                key={detail.key}
                label={detail.label}
                value={detail.value}
              />
            ))}
            <div className="grid grid-cols-[minmax(0,1fr)_2.45in] items-start gap-5">
              <div className="min-h-[2.1in] space-y-1">
                {detailLines.slice(remarksIndex).map((detail) => (
                  <ClearanceDetail
                    key={detail.key}
                    label={detail.label}
                    value={detail.value}
                  />
                ))}
              </div>
              <ClearanceApplicantPhotoSignature
                applicantPhoto={applicantPhoto}
              />
            </div>
          </div>
        ),
      );
      continue;
    }

    if (/^applicant['’]s signature$/i.test(line)) {
      content.push(
        <p
          key={`signature-label-${index}`}
          className="pr-[0.05in] text-right text-[7pt]"
        >
          {line}
        </p>,
      );
      index += 1;
      continue;
    }

    if (lines[index + 1]?.trim().toLowerCase() === "punong barangay") {
      index += 1;
      continue;
    }

    if (/^punong barangay$/i.test(line) && index > 0) {
      content.push(
        <div
          key={`signatory-${index}`}
          className="mt-2 flex justify-end pr-[0.05in] text-center leading-tight"
        >
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
      <p
        key={`text-${index}`}
        className={/^paid under$/i.test(line) ? "mt-2 text-[7pt]" : ""}
      >
        {line}
      </p>,
    );
    index += 1;
  }

  return <div className="space-y-1">{content}</div>;
}

function FormattedTemplateText({
  text,
  page1Layout,
  page2Layout,
  paperDesign,
  sheet = true,
  jobseekerTitle = false,
  emphasisValues = [],
  applicantName = "",
  punongBarangayName = "",
}) {
  const normalizedEmphasisValues = emphasisValues
    .filter((value) => value !== null && value !== undefined && String(value).trim())
    .map((value) => String(value).trim())
    .sort((left, right) => right.length - left.length);
  const emphasisPattern = normalizedEmphasisValues.length
    ? new RegExp(
        `(${[
          ...normalizedEmphasisValues.map(escapeRegExp),
          ...(jobseekerTitle ? ["\\b(?:she|he|they)\\b"] : []),
        ].join("|")})`,
        "giu",
      )
    : null;
  const pages = String(text).split(/\{\{\s*page_break\s*\}\}/i);
  const oathText = pages[1] || "";
  const oathStatements = oathText.match(/(?:^|\n)\s*\d+\.\s/g) || [];
  const continuationBreak = oathText.match(/\n(?=\s*8\.\s)/);
  if (
    jobseekerTitle &&
    pages.length === 2 &&
    oathText.length > 900 &&
    oathStatements.length >= 7 &&
    continuationBreak
  ) {
    const breakAt = continuationBreak.index;
    pages.splice(
      1,
      1,
      oathText.slice(0, breakAt),
      oathText.slice(breakAt).trimStart(),
    );
  }

  return pages.flatMap((page, pageIndex) => {
      const paragraphs = (
        <div
          key={`page-content-${pageIndex}`}
          className={
            sheet
              ? `jobseeker-content-page jobseeker-sheet ${paperDesign ? "jobseeker-sheet--uploaded" : ""} ${pageIndex ? "jobseeker-content-page--second" : ""}`
              : undefined
          }
          style={
            sheet
              ? jobseekerPageStyle(
                  pageIndex ? page2Layout : page1Layout,
                  Boolean(paperDesign),
                  false,
                )
              : undefined
          }
        >
          {sheet && paperDesign && (
            <img
              src={paperDesign}
              alt=""
              aria-hidden="true"
              className="jobseeker-sheet-design"
            />
          )}
          {page.split(/\n\s*\n/).map((paragraph, index, pageParagraphs) => {
            const [firstLine, ...remainingLines] = paragraph.split("\n");
            const isJobseekerTitle =
              jobseekerTitle &&
              /^\*{0,2}(?:certification|oath of undertaking)\*{0,2}$/i.test(
                firstLine.trim(),
              );
            const isOathContinuation =
              jobseekerTitle && pageIndex > 1 && index === 0;
            let body = isJobseekerTitle
              ? remainingLines.join("\n")
              : paragraph;
            if (jobseekerTitle && pageIndex > 1) {
              body = insertNameBeforeRole(
                body,
                "First Time Jobseeker",
                applicantName,
              );
              body = insertNameBeforeRole(
                body,
                "Punong Barangay",
                punongBarangayName,
              );
            }
            const signatoryStart = jobseekerTitle
              ? pageParagraphs.findIndex((item) =>
                  /\b(?:First Time Jobseeker|Punong Barangay)\b/i.test(item) ||
                  /_{5,}/.test(item),
                )
              : -1;
            const isSignatureBlock =
              signatoryStart >= 0 && index >= signatoryStart;
            const renderedBody = body
              ? body.split(/(\*\*[^*]+\*\*)/g).flatMap((part, partIndex) => {
                  if (part.startsWith("**") && part.endsWith("**")) {
                    return (
                      <strong key={partIndex}>{part.slice(2, -2)}</strong>
                    );
                  }
                  const pieces = emphasisPattern
                    ? part.split(emphasisPattern)
                    : [part];
                  return pieces.map((piece, pieceIndex) => {
                    const emphasized = normalizedEmphasisValues.some(
                      (value) => value.toLowerCase() === piece.toLowerCase(),
                    ) ||
                      (jobseekerTitle && /^(she|he|they)$/i.test(piece));
                    if (jobseekerTitle && /^(she|he|they)$/i.test(piece)) {
                      return (
                        <span key={`${partIndex}-${pieceIndex}`}>
                          <span className="text-[1.35em]">
                            {piece.slice(0, 1)}
                          </span>
                          {piece.slice(1)}
                        </span>
                      );
                    }
                    const content = piece
                      .split("\n")
                      .flatMap((line, lineIndex) =>
                        lineIndex ? [<br key={`br-${lineIndex}`} />, line] : [line],
                      );
                    return emphasized ? (
                      <strong key={`${partIndex}-${pieceIndex}`}>{content}</strong>
                    ) : (
                      <span key={`${partIndex}-${pieceIndex}`}>{content}</span>
                    );
                  });
                })
              : null;

            return (
              <div key={`${pageIndex}-${index}`}>
                {isJobseekerTitle && (
                  <h1 className="mb-6 mt-[-0.4in] text-center text-[30px] font-bold uppercase tracking-wide text-[#123F70]">
                    {firstLine.replaceAll("**", "").trim()}
                  </h1>
                )}
                {isOathContinuation && (
                  <h1 className="mb-6 mt-[-0.4in] text-center text-[30px] font-bold uppercase tracking-wide text-[#123F70]">
                    Oath of Undertaking
                  </h1>
                )}
                {renderedBody && (
                  <p
                    className={`${isSignatureBlock ? /First Time Jobseeker|Witnessed by:/i.test(body) ? "mb-5 text-right" : "mb-2 text-right" : jobseekerTitle && /^to whom it may concern:/i.test(body.trim()) ? "mb-8 text-justify" : "mb-5 text-justify"} ${index === signatoryStart ? "mt-6" : ""}`}
                  >
                    {renderedBody}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      );

      return [
        ...(pageIndex
          ? [
              <div
                key={`page-break-${pageIndex}`}
                className="document-page-break"
                aria-hidden="true"
              />,
            ]
          : []),
        paragraphs,
      ];
    });
}

function jobseekerPageStyle(
  pageLayout,
  hasPaperDesign = false,
  compact = false,
) {
  return {
    paddingTop: hasPaperDesign
      ? `${Math.max(0, Number(pageLayout?.content_top || 64))}mm`
      : "20px",
    paddingLeft: hasPaperDesign ? "1.5in" : "1in",
    paddingRight: hasPaperDesign ? "1.5in" : "1in",
    paddingBottom: hasPaperDesign
      ? `${Math.max(0, Number(pageLayout?.content_bottom || 19))}mm`
      : "20px",
    color: "#172B4D",
    fontSize: compact ? "10pt" : "12pt",
    lineHeight: compact ? 1.45 : 1.65,
  };
}

function BarangayCertificateWording({
  text,
  fields,
  issuedDay,
  issuedMonth,
  issuedYear,
}) {
  const purok = String(fields.purok || "").trim();
  const address = purok
    ? `${formatPurok(purok)}, Barangay Tayud, Consolacion, Cebu`
    : fields.address;
  const emphasisValues = [
    "TO WHOM IT MAY CONCERN:",
    fields.full_name ||
      [fields.first_name, fields.middle_name, fields.last_name]
        .filter(Boolean)
        .join(" "),
    fields.age !== undefined && fields.age !== null && fields.age !== ""
      ? `${fields.age} years old`
      : "",
    fields.sex,
    fields.civil_status,
    fields.citizenship ? `${fields.citizenship} citizen` : "",
    address,
    fields.purpose,
    issuedDay,
    issuedMonth,
    issuedYear,
  ]
    .filter(
      (value) => value !== null && value !== undefined && String(value).trim(),
    )
    .map((value) => String(value).trim())
    .sort((left, right) => right.length - left.length);
  const emphasisPattern = emphasisValues.length
    ? new RegExp(`(${emphasisValues.map(escapeRegExp).join("|")})`, "giu")
    : null;

  const renderParagraph = (paragraph, paragraphIndex) => {
    const plainParagraph = paragraph.replaceAll("**", "").trim();
    if (/^barangay certificate$/i.test(plainParagraph)) {
      return (
        <h1
          key={paragraphIndex}
          className="-mt-2 mb-5 text-center font-extrabold leading-tight text-[#123F70]"
          style={{ fontSize: "50pt" }}
        >
          {plainParagraph}
        </h1>
      );
    }

    const lines = plainParagraph.split("\n");
    return (
      <p key={paragraphIndex} className="mb-4 last:mb-0">
        {lines.flatMap((line, lineIndex) => {
          const pieces = emphasisPattern ? line.split(emphasisPattern) : [line];
          const rendered = pieces.map((piece, pieceIndex) => {
            const emphasized = emphasisValues.some(
              (value) => value.toLowerCase() === piece.toLowerCase(),
            );
            return emphasized ? (
              <strong key={`${lineIndex}-${pieceIndex}`}>{piece}</strong>
            ) : (
              <span key={`${lineIndex}-${pieceIndex}`}>{piece}</span>
            );
          });
          return lineIndex
            ? [<br key={`br-${lineIndex}`} />, ...rendered]
            : rendered;
        })}
      </p>
    );
  };

  const paragraphs = String(text)
    .split(/\n\s*\n/)
    .flatMap((paragraph) => {
      const lines = paragraph.split("\n");
      if (
        /^\*{0,2}barangay certificate\*{0,2}$/i.test(lines[0]?.trim() || "") &&
        lines.length > 1
      ) {
        return [lines[0], lines.slice(1).join("\n")].filter((part) =>
          part.trim(),
        );
      }
      return [paragraph];
    });

  return <>{paragraphs.map(renderParagraph)}</>;
}

function GoodMoralWording({
  text,
  residentName,
  address,
  purpose,
  formattedDate,
  issuedDay,
  issuedMonth,
  issuedYear,
}) {
  const addressText = String(address || "").trim();
  const purokAddress = String(text || "").match(/\bPurok\b[^.]*?\bCebu\b/i)?.[0];
  const expandedAddress = addressText.replace(
    /,\s*Consolacion,\s*Cebu$/i,
    ", Municipality of Consolacion, Province of Cebu",
  );
  const issuedDate = `${issuedDay} day of ${issuedMonth}, ${issuedYear}`;
  const emphasisValues = [
    "TO WHOM IT MAY CONCERN:",
    residentName,
    addressText,
    expandedAddress,
    purokAddress,
    String(text || "").match(/\b\d+\s+years?\b/i)?.[0],
    purpose,
    formattedDate,
    issuedDate,
    issuedDay,
    issuedMonth,
    issuedYear,
  ]
    .filter(
      (value) => value !== null && value !== undefined && String(value).trim(),
    )
    .map((value) => String(value).trim())
    .sort((left, right) => right.length - left.length);
  const emphasisPattern = emphasisValues.length
    ? new RegExp(
        `(${[
          ...emphasisValues.map(escapeRegExp),
          "\\b\\d{1,2}(?:st|nd|rd|th)\\s+day\\s+of\\s+[A-Za-z]+,?\\s+\\d{4}\\b",
        ].join("|")})`,
        "giu",
      )
    : null;

  return (
    <div className="space-y-5">
      {String(text)
        .split(/\n\s*\n/)
        .filter((paragraph) => paragraph.trim())
        .map((paragraph, index) => (
          <p key={index}>
            {paragraph
              .replaceAll("**", "")
              .split("\n")
              .flatMap((line, lineIndex) => {
                const pieces = line.split(emphasisPattern);
                const rendered = pieces.map((piece, pieceIndex) =>
                  emphasisValues.some(
                    (value) => value.toLowerCase() === piece.toLowerCase(),
                  ) ||
                  /^\d{1,2}(?:st|nd|rd|th)\s+day\s+of\s+[A-Za-z]+,?\s+\d{4}$/i.test(
                    piece,
                  ) ? (
                    <strong key={`${lineIndex}-${pieceIndex}`}>{piece}</strong>
                  ) : (
                    <span key={`${lineIndex}-${pieceIndex}`}>{piece}</span>
                  ),
                );
                return lineIndex
                  ? [<br key={`break-${lineIndex}`} />, ...rendered]
                  : rendered;
              })}
          </p>
        ))}
    </div>
  );
}

const StyledCertificateWording = GoodMoralWording;

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
  if (
    today.getMonth() < birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() &&
      today.getDate() < birthDate.getDate())
  )
    age -= 1;
  return age >= 0 ? age : "";
}

function CertificateValue({
  value,
  field,
  editing,
  onFieldChange,
  className = "",
}) {
  if (editing && field !== "age") {
    return (
      <input
        aria-label={field.replaceAll("_", " ")}
        value={field === "purok" ? stripPurokPrefix(value) : value || ""}
        onChange={(event) => onFieldChange(field, event.target.value)}
        className={`inline-block min-w-14 border-b border-dashed border-slate-400 bg-white/80 px-1 text-center font-semibold outline-none focus:border-[#2455D6] ${className}`}
      />
    );
  }
  const hasValue = value !== undefined && value !== null && value !== "";
  return (
    <span className={`font-semibold ${className}`}>
      {hasValue
        ? field === "purok"
          ? stripPurokPrefix(value)
          : value
        : "________________"}
    </span>
  );
}

function BarangayCertificateTemplate({
  residentName,
  fields,
  issuedDay,
  issuedMonth,
  issuedYear,
  editing,
  onFieldChange,
}) {
  const nameParts = residentName.trim().split(/\s+/);
  const firstName = Object.hasOwn(fields, "first_name")
    ? fields.first_name
    : nameParts[0];
  const middleName = Object.hasOwn(fields, "middle_name")
    ? fields.middle_name
    : nameParts.slice(1, -1).join(" ");
  const lastName = Object.hasOwn(fields, "last_name")
    ? fields.last_name
    : nameParts.length > 1
      ? nameParts.at(-1)
      : "";
  const age = fields.age ?? calculateAgeFromBirthDate(fields.date_of_birth);

  return (
    <div className="mx-auto max-w-3xl space-y-8 pt-5 text-[12px] leading-8 text-slate-800">
      <p>
        This is to certify that{" "}
        <CertificateValue
          value={firstName}
          field="first_name"
          editing={editing}
          onFieldChange={onFieldChange}
        />{" "}
        {middleName && (
          <>
            <CertificateValue
              value={middleName}
              field="middle_name"
              editing={editing}
              onFieldChange={onFieldChange}
            />{" "}
          </>
        )}
        {editing && !middleName && (
          <>
            <CertificateValue
              value=""
              field="middle_name"
              editing
              onFieldChange={onFieldChange}
            />{" "}
          </>
        )}
        <CertificateValue
          value={lastName}
          field="last_name"
          editing={editing}
          onFieldChange={onFieldChange}
        />
        ,{" "}
        <CertificateValue
          value={age}
          field="age"
          editing={editing}
          onFieldChange={onFieldChange}
        />{" "}
        years old,{" "}
        <CertificateValue
          value={fields.sex}
          field="sex"
          editing={editing}
          onFieldChange={onFieldChange}
        />
        ,{" "}
        <CertificateValue
          value={fields.civil_status}
          field="civil_status"
          editing={editing}
          onFieldChange={onFieldChange}
        />
        ,{" "}
        <CertificateValue
          value={fields.citizenship}
          field="citizenship"
          editing={editing}
          onFieldChange={onFieldChange}
        />{" "}
        citizen, and a bona fide resident of Purok{" "}
        <CertificateValue
          value={fields.purok}
          field="purok"
          editing={editing}
          onFieldChange={onFieldChange}
        />
        , Barangay Tayud, Consolacion, Cebu, is an indigent member of this
        barangay.
      </p>
      <p>
        This certification is issued at the request of the above-named person
        for{" "}
        <CertificateValue
          value={fields.purpose}
          field="purpose"
          editing={editing}
          onFieldChange={onFieldChange}
        />{" "}
        and for whatever legal purpose it may serve.
      </p>
      <p>
        Issued and Given this{" "}
        <CertificateValue
          value={issuedDay}
          field="age"
          editing={false}
          onFieldChange={onFieldChange}
        />{" "}
        day of {issuedMonth}, {issuedYear}, at Barangay Tayud, Consolacion,
        Cebu, Philippines.
      </p>
    </div>
  );
}

function ClearanceDetail({ label, value, compact = false }) {
  const isSalutation = /^to whom it may concern$/i.test(label);
  return (
    <div
      className={`grid ${isSalutation ? "w-fit grid-cols-[max-content_0.12in_max-content] whitespace-nowrap" : compact ? "grid-cols-[1.15in_0.12in_1fr]" : "grid-cols-[1.5in_0.12in_1fr]"} gap-x-1 text-[10pt] leading-[1.5] text-black`}
    >
      <span className="font-bold">{label}</span>
      <span>:</span>
      <span>{value || ""}</span>
    </div>
  );
}

function ClearanceApplicantPhoto({ applicantPhoto }) {
  return (
    <div className="flex h-[1.2in] w-[1.2in] items-center justify-center overflow-hidden bg-white">
      {applicantPhoto ? (
        <img
          src={applicantPhoto}
          alt="Applicant photo"
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="text-center text-[7pt] text-slate-500">
          Applicant photo
        </span>
      )}
    </div>
  );
}

function ClearanceApplicantPhotoSignature({ applicantPhoto }) {
  return (
    <div className="w-[2.45in]">
      <div className="flex justify-center">
        <ClearanceApplicantPhoto applicantPhoto={applicantPhoto} />
      </div>
      <div className="mx-auto mt-2 w-[2.2in]">
        <div className="h-6 border-b border-black" />
        <p className="text-center text-[7pt]">Applicant&apos;s Signature</p>
      </div>
    </div>
  );
}

function BarangayClearanceCertificate({
  request,
  fields,
  applicantPhoto,
  narrative,
}) {
  const issuedDate = getDocumentDate(request);
  const dateParts = new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  })
    .formatToParts(issuedDate)
    .reduce((parts, item) => ({ ...parts, [item.type]: item.value }), {});
  const clearanceNumber = request.clearance_number ?? request.id;
  const serialNumber = String(clearanceNumber);
  const residentCertificateNumber = serialNumber.padStart(5, "0");
  const shortDate = `${dateParts.month}/${dateParts.day}/${dateParts.year}`;
  const birthDate = fields.date_of_birth
    ? new Date(`${String(fields.date_of_birth).slice(0, 10)}T00:00:00`)
    : null;
  const formattedBirthDate =
    birthDate && !Number.isNaN(birthDate.getTime())
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

      <p className="mb-4 text-justify text-[10pt] leading-[1.5] indent-[0.4in]">
        {narrative}
      </p>

      <div className="space-y-1">
        <ClearanceDetail
          label="NAME"
          value={
            fields.full_name ||
            [fields.first_name, fields.middle_name, fields.last_name]
              .filter(Boolean)
              .join(" ")
          }
        />
        <ClearanceDetail label="HOME ADDRESS" value={fields.address} />
        <ClearanceDetail label="PLACE OF BIRTH" value={fields.place_of_birth} />
        <ClearanceDetail label="DATE OF BIRTH" value={formattedBirthDate} />
        <div className="grid grid-cols-[minmax(0,1fr)_2.45in] items-start gap-5">
          <div className="min-h-[2.1in] space-y-1">
            <ClearanceDetail
              label="REMARKS"
              value={
                fields.derogatory_status === "required_review"
                  ? "REQUIRED REVIEW"
                  : fields.derogatory_status === "no_derogatory_record"
                    ? "NO DEROGATORY RECORDS"
                    : fields.derogatory_status === "refer_authorized_review"
                      ? "REFER FOR AUTHORIZED REVIEW"
                      : "PENDING VERIFICATION"
              }
            />
            <ClearanceDetail label="PURPOSE" value={fields.purpose} />
          </div>
          <ClearanceApplicantPhotoSignature applicantPhoto={applicantPhoto} />
        </div>
      </div>

      <div className="mt-3 flex items-start gap-5">
        <div className="min-w-0 flex-1 space-y-1 text-[10pt] leading-[1.5]">
          <ClearanceDetail label="VALID FOR" value="Six (6) Months" />
          <ClearanceDetail
            label="Res. Cert. No."
            value={residentCertificateNumber}
          />
          <ClearanceDetail label="Issued at" value="CONSOLACION, CEBU" />
        </div>
        <div className="w-[2.45in] shrink-0">
          <div className="-mt-16 flex justify-center gap-3">
            {["Left Thumb Mark", "Right Thumb Mark"].map((label) => (
              <div key={label} className="w-[1.15in] text-center">
                <div className="h-[1.05in] border border-black" />
                <p className="mt-1 text-[7pt]">{label}</p>
              </div>
            ))}
          </div>
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

function DocumentPaper({
  request,
  templateType,
  applicantPhoto,
  label,
  residentName,
  issueDate,
  formattedDate,
  fields,
  issuedDay,
  issuedMonth,
  issuedYear,
  paperDesign,
  paperSize,
  editing,
  onFieldChange,
}) {
  const dimensions =
    request.document_type === "Cedula" ||
    request.document_type === "Cedula (Community Tax Certificate)"
      ? { width: "8.5in", height: "5.5in" }
      : paperSize === "a4"
        ? { width: "8.27in", height: "11.69in" }
        : paperSize === "legal"
          ? { width: "8.5in", height: "14in" }
          : { width: "8.5in", height: "11in" };
  const savedLayout = {
    content_top: 64,
    content_left: 19,
    content_right: 19,
    content_bottom: 19,
    font_size_pt: 12,
    text_color: "#172B4D",
    accent_color: "#123f70",
    ...(request.type?.document_layout || {}),
  };
  const layout = {
    ...savedLayout,
    content_top: Math.min(76, Math.max(51, Number(savedLayout.content_top))),
    content_left: Math.min(38, Math.max(13, Number(savedLayout.content_left))),
    content_right: Math.min(
      38,
      Math.max(13, Number(savedLayout.content_right)),
    ),
    content_bottom: Math.min(
      38,
      Math.max(13, Number(savedLayout.content_bottom)),
    ),
    font_size_pt: Math.min(14, Math.max(10, Number(savedLayout.font_size_pt))),
  };
  const page2Layout = {
    ...layout,
    ...(savedLayout.page2 || {}),
    content_top: Math.min(
      76,
      Math.max(
        51,
        Number(savedLayout.page2?.content_top ?? layout.content_top),
      ),
    ),
    content_left: Math.min(
      38,
      Math.max(
        13,
        Number(savedLayout.page2?.content_left ?? layout.content_left),
      ),
    ),
    content_right: Math.min(
      38,
      Math.max(
        13,
        Number(savedLayout.page2?.content_right ?? layout.content_right),
      ),
    ),
    content_bottom: Math.min(
      38,
      Math.max(
        13,
        Number(savedLayout.page2?.content_bottom ?? layout.content_bottom),
      ),
    ),
    font_size_pt: Math.min(
      14,
      Math.max(
        10,
        Number(savedLayout.page2?.font_size_pt ?? layout.font_size_pt),
      ),
    ),
  };
  const configuredTemplate =
    typeof request.type?.template === "string" ? request.type.template : "";
  const permitDefaultTemplate =
    request.document_type === "Construction Permit"
      ? CONSTRUCTION_PERMIT_WORDING
      : request.document_type === "Fencing Permit"
        ? FENCING_PERMIT_WORDING
        : "";
  const effectiveTemplate = configuredTemplate.trim() || permitDefaultTemplate;
  const hasConfiguredTemplate =
    Boolean(effectiveTemplate.trim()) &&
    (request.type?.template_enabled !== false ||
      Boolean(permitDefaultTemplate));
  const generatedTemplateBody = hasConfiguredTemplate
    ? renderDocumentTemplate(
        effectiveTemplate,
        fields,
        request,
        residentName,
        label,
        formattedDate,
      )
    : "";
  const savedDocumentBody =
    typeof fields.document_body === "string" ? fields.document_body.trim() : "";
  const templateBody =
    request.document_type === "Barangay Certification"
      ? syncClearanceBody(generatedTemplateBody, fields, generatedTemplateBody)
      : savedDocumentBody
        ? renderDocumentTemplate(
            savedDocumentBody,
            fields,
            request,
            residentName,
            label,
            formattedDate,
          )
        : generatedTemplateBody;
  const isClearance = request.document_type === "Barangay Certification";
  const isBusinessClearance = request.document_type === "Business Permit";
  const isPermit = ["Construction Permit", "Fencing Permit"].includes(
    request.document_type,
  );
  const isCedula =
    request.document_type === "Cedula" ||
    request.document_type === "Cedula (Community Tax Certificate)";
  const isBarangayCertificate =
    request.document_type === "Barangay Certificate";
  const isStyledCertificate = ["character", "residency", "indigency"].includes(
    templateType,
  );
  const certificateTitleMarginTop = "-0.4in";
  const clearanceTitleMarginTop = "-0.4in";
  const useConfiguredTemplate =
    hasConfiguredTemplate &&
    Boolean(templateBody.trim()) &&
    !isBusinessClearance;
  const businessWording = isBusinessClearance
    ? renderDocumentTemplate(
        request.type?.template_enabled !== false &&
          configuredTemplate.trim() &&
          !isLegacyBusinessClearanceWording(configuredTemplate)
          ? configuredTemplate
          : BUSINESS_CLEARANCE_WORDING,
        fields,
        request,
        residentName,
        label,
        formattedDate,
      )
    : "";
  const paper = (
    <article
      data-paper-size={paperSize}
      className={`document-paper relative mx-auto flex min-h-[11in] w-full flex-col overflow-hidden bg-white shadow-sm ${paperDesign ? "document-paper--designed" : ""} ${templateType === "jobseeker" ? "document-paper--jobseeker" : ""} ${isClearance ? "document-paper--clearance" : ""} ${isBusinessClearance ? "document-paper--business" : ""} ${isCedula ? "document-paper--cedula" : ""} ${paperDesign || isCedula ? "p-0" : isClearance ? "p-[0.3in]" : "p-[0.55in]"}`}
      style={{
        "--paper-width": dimensions.width,
        "--paper-height": dimensions.height,
        "--document-text-color": "#172B4D",
        "--document-accent-color": layout.accent_color,
        width: dimensions.width,
        height: dimensions.height,
        minHeight: dimensions.height,
        color: "#172B4D",
      }}
    >
      {paperDesign && templateType !== "jobseeker" && (
        <img
          src={paperDesign}
          alt="Uploaded document paper design"
          className="pointer-events-none absolute inset-0 h-full w-full object-fill"
          style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}
        />
      )}
      {!paperDesign && !isClearance && !isBusinessClearance && !isCedula && (
        <header className="relative z-10 border-b border-[#123F70] pb-4">
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <img
                src="/images/logo-blue-version.png"
                alt="TugonBarangay"
                className="h-14 w-14 object-contain"
              />
              <div>
                <p className="text-[8px] font-bold uppercase tracking-[0.24em] text-[#2455D6]">
                  Tugon Barangay
                </p>
                <h1 className="mt-1 text-[19px] font-bold leading-tight text-[#123F70]">
                  {label}
                </h1>
                <p className="mt-1 text-[8px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Official document
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">
                Document No.
              </p>
              <p className="mt-1 text-[11px] font-bold">
                {String(request.id).padStart(6, "0")}
              </p>
            </div>
          </div>
        </header>
      )}

      <div
        className="relative z-10 flex-1"
        style={
          templateType === "jobseeker"
            ? {}
            : paperDesign
              ? {
                  paddingTop: `${layout.content_top}mm`,
                  paddingLeft:
                    isBarangayCertificate || isStyledCertificate || isPermit
                      ? "1.5in"
                      : isClearance
                        ? "1in"
                        : `${layout.content_left}mm`,
                  paddingRight:
                    isBarangayCertificate || isStyledCertificate || isPermit
                      ? "1.5in"
                      : isClearance
                        ? "1in"
                        : `${layout.content_right}mm`,
                  paddingBottom: `${layout.content_bottom}mm`,
                }
              : isClearance
                ? {}
                : isStyledCertificate || isPermit
                  ? {
                      paddingTop: "20px",
                      paddingLeft: "1in",
                      paddingRight: "1in",
                      paddingBottom: "20px",
                    }
                  : { paddingTop: "20px", paddingBottom: "20px" }
        }
      >
        {!isBusinessClearance &&
          !isCedula &&
          templateType !== "jobseeker" &&
          !isStyledCertificate &&
          (isBarangayCertificate ? (
            <h1
              className="mb-10 text-center text-[30px] font-bold uppercase tracking-wide"
              style={{
                color: layout.accent_color,
                ...(paperDesign
                  ? {
                      width: "calc(100% + 3in)",
                      marginLeft: "-1.5in",
                      marginTop: certificateTitleMarginTop,
                    }
                  : {}),
              }}
            >
              {label}
            </h1>
          ) : isClearance ? (
            <h1
              className="mb-10 text-center text-[30px] font-bold uppercase tracking-wide"
              style={{
                color: layout.accent_color,
                ...(paperDesign
                  ? {
                      width: "calc(100% + 2in)",
                      marginLeft: "-1in",
                      marginTop: clearanceTitleMarginTop,
                    }
                  : {}),
              }}
            >
              {label}
            </h1>
          ) : isPermit ? (
            <h1
              className="mb-10 mt-[-0.4in] text-center text-[30px] font-bold uppercase tracking-wide text-[#123F70]"
            >
              {label}
            </h1>
          ) : (
            <h1
              className="mb-10 text-center text-[16px] font-bold uppercase tracking-wide"
              style={{ color: layout.accent_color }}
            >
              {label}
            </h1>
          ))}
        {templateType === "barangay" && !isClearance && (
          <div className="mb-4 flex justify-end">
            <div className="flex h-[1.5in] w-[1.25in] items-center justify-center overflow-hidden border border-slate-500 bg-white text-center text-[9px] text-slate-400">
              {applicantPhoto ? (
                <img
                  src={applicantPhoto}
                  alt="Applicant photo"
                  className="h-full w-full object-cover"
                />
              ) : (
                "Applicant photo"
              )}
            </div>
          </div>
        )}
        {isClearance && !editing && useConfiguredTemplate ? (
          <div className="document-wording text-[10pt] leading-[1.5] text-black">
            <AdminClearanceTemplate
              template={templateBody}
              applicantPhoto={applicantPhoto}
              clearanceNumber={request.clearance_number ?? request.id}
            />
          </div>
        ) : isClearance && !editing ? (
          <BarangayClearanceCertificate
            request={request}
            fields={fields}
            applicantPhoto={applicantPhoto}
            narrative={templateBody.split(/\n\s*\n/)[0]}
          />
        ) : isBarangayCertificate && useConfiguredTemplate ? (
          <div className="document-wording text-justify text-[12pt] leading-[1.65] text-black">
            {editing ? (
              <textarea
                aria-label="Edit document wording"
                value={templateBody}
                onChange={(event) =>
                  onFieldChange("document_body", event.target.value)
                }
                className="min-h-[5in] w-full resize-y rounded-lg border border-[#F1D9A8] bg-white p-4 text-inherit outline-none focus:border-[#2455D6] focus:ring-2 focus:ring-[#2455D6]/20"
              />
            ) : (
              <BarangayCertificateWording
                text={templateBody}
                fields={fields}
                issuedDay={issuedDay}
                issuedMonth={issuedMonth}
                issuedYear={issuedYear}
              />
            )}
          </div>
        ) : isStyledCertificate && useConfiguredTemplate ? (
          <div className="document-wording text-justify text-[12pt] leading-[1.65] text-[#172B4D]">
            <h1 className="mb-10 mt-[-0.4in] text-center text-[30px] font-bold uppercase tracking-wide text-[#123F70]">
              {label}
            </h1>
            {editing ? (
              <textarea
                aria-label="Edit document wording"
                value={templateBody}
                onChange={(event) =>
                  onFieldChange("document_body", event.target.value)
                }
                className="min-h-[5in] w-full resize-y rounded-lg border border-[#F1D9A8] bg-white p-4 text-inherit outline-none focus:border-[#2455D6] focus:ring-2 focus:ring-[#2455D6]/20"
              />
            ) : (
              <StyledCertificateWording
                text={templateBody}
                residentName={residentName}
                address={
                  fields.address ||
                  (fields.purok
                    ? `${formatPurok(fields.purok)}, Barangay Tayud, Municipality of Consolacion, Province of Cebu`
                    : "")
                }
                purpose={fields.purpose}
                formattedDate={formattedDate}
                issuedDay={issuedDay}
                issuedMonth={issuedMonth}
                issuedYear={issuedYear}
              />
            )}
          </div>
        ) : isPermit && useConfiguredTemplate ? (
          <div className="document-wording text-justify text-[12pt] leading-[1.65] text-[#172B4D]">
            {editing ? (
              <textarea
                aria-label="Edit document wording"
                value={templateBody}
                onChange={(event) =>
                  onFieldChange("document_body", event.target.value)
                }
                className="min-h-[5in] w-full resize-y rounded-lg border border-[#F1D9A8] bg-white p-4 text-inherit outline-none focus:border-[#2455D6] focus:ring-2 focus:ring-[#2455D6]/20"
              />
            ) : (
              <FormattedTemplateText text={templateBody} sheet={false} />
            )}
          </div>
        ) : useConfiguredTemplate ? (
          <div
            className="document-wording whitespace-pre-wrap"
            style={{
              color: "#172B4D",
              fontSize: `${layout.font_size_pt}pt`,
              lineHeight: 1.55,
            }}
          >
            {editing ? (
              <textarea
                aria-label="Edit document wording"
                value={templateBody}
                onChange={(event) =>
                  onFieldChange("document_body", event.target.value)
                }
                className="min-h-[5in] w-full resize-y rounded-lg border border-[#F1D9A8] bg-white p-4 text-inherit outline-none focus:border-[#2455D6] focus:ring-2 focus:ring-[#2455D6]/20"
              />
            ) : (
              <FormattedTemplateText
                text={templateBody}
                page1Layout={templateType === "jobseeker" ? layout : null}
                page2Layout={templateType === "jobseeker" ? page2Layout : null}
                paperDesign={templateType === "jobseeker" ? paperDesign : ""}
                jobseekerTitle={templateType === "jobseeker"}
                applicantName={residentName}
                punongBarangayName={getPunongBarangayName()}
                emphasisValues={
                  templateType === "jobseeker"
                    ? [
                        "TO WHOM IT MAY CONCERN:",
                        residentName,
                        fields.address,
                        fields.purok ? formatPurok(fields.purok) : "",
                        fields.years_of_residency !== undefined &&
                        fields.years_of_residency !== ""
                          ? `${fields.years_of_residency} years`
                          : "",
                        "RA 11261",
                        "First Time Jobseekers Act of 2019",
                        "Oath of Undertaking",
                        `${issuedDay} day of ${issuedMonth}, ${issuedYear}`,
                        "one year",
                        "one (1) year",
                        getPunongBarangayName(),
                      ]
                    : []
                }
              />
            )}
          </div>
        ) : (
          <>
            {templateType === "barangay" && (
              <BarangayTemplate
                request={request}
                residentName={residentName}
                fields={fields}
                editing={editing}
                onFieldChange={onFieldChange}
              />
            )}
            {templateType === "barangay_certificate" && (
              <BarangayCertificateTemplate
                residentName={residentName}
                fields={fields}
                issuedDay={issuedDay}
                issuedMonth={issuedMonth}
                issuedYear={issuedYear}
                editing={editing}
                onFieldChange={onFieldChange}
              />
            )}
            {templateType === "residency" && (
              <ResidencyTemplate
                request={request}
                residentName={residentName}
                fields={fields}
                editing={editing}
                onFieldChange={onFieldChange}
              />
            )}
            {templateType === "business" && (
              <BusinessTemplate
                request={request}
                residentName={residentName}
                fields={fields}
                wording={businessWording}
                editing={editing}
                onFieldChange={onFieldChange}
              />
            )}
            {templateType === "cedula" && (
              <CedulaTemplate
                request={request}
                residentName={residentName}
                fields={fields}
                editing={editing}
                onFieldChange={onFieldChange}
              />
            )}
            {templateType === "character" && (
              <CharacterTemplate
                request={request}
                residentName={residentName}
                fields={fields}
                editing={editing}
                onFieldChange={onFieldChange}
              />
            )}
            {templateType === "indigency" && (
              <IndigencyTemplate
                residentName={residentName}
                fields={fields}
                editing={editing}
                onFieldChange={onFieldChange}
              />
            )}
            {templateType === "jobseeker" && (
              <JobseekerTemplate
                request={request}
                residentName={residentName}
                fields={fields}
                page1Layout={layout}
                paperDesign={paperDesign}
                editing={editing}
                onFieldChange={onFieldChange}
              />
            )}
            {templateType === "generic" && (
              <GenericTemplate
                label={label}
                residentName={residentName}
                fields={fields}
                editing={editing}
                onFieldChange={onFieldChange}
              />
            )}
          </>
        )}
      </div>

      {!paperDesign && !isClearance && !isBusinessClearance && !isCedula && (
        <footer className="relative z-10 grid grid-cols-[1fr_auto] gap-8 border-t border-slate-200 pt-4">
          <div>
            <div className="mb-1 flex items-end gap-2">
              <div className="h-px w-20 bg-slate-300" />
              <span className="text-[8px] font-semibold text-slate-400">
                Authorized signature
              </span>
            </div>
            <p className="mt-1 text-[9px] font-semibold">
              Authorized Barangay Officer
            </p>
          </div>
          <div className="text-right">
            <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">
              Date issued
            </p>
            <p className="mt-1 text-[9px] font-semibold">{formattedDate}</p>
          </div>
        </footer>
      )}
    </article>
  );

  return paper;
}

function TemplateHeading({ title, subtitle }) {
  return (
    <div className="document-template-heading mb-6 text-center">
      <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#2455D6]">
        Official Barangay Document
      </p>
      <h2 className="mt-2 text-[25px] font-bold tracking-tight text-[#123F70]">
        {title}
      </h2>
      <p className="mt-2 text-[10px] uppercase tracking-wider text-slate-400">
        {subtitle}
      </p>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="mb-5 border border-slate-200 rounded-sm p-4">
      <h3 className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#2455D6]">
        {title}
      </h3>
      {children}
    </section>
  );
}

function DetailLine({
  label,
  value,
  fieldName,
  editing,
  onFieldChange,
  boldValue = false,
  largerText = false,
}) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 border-b border-slate-100 py-2 last:border-0">
      <dt className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </dt>
      <dd className={`${largerText ? "text-[12px]" : "text-[10px]"} ${boldValue ? "font-bold" : "font-semibold"} text-slate-700`}>
        {editing ? (
          <input
            type={fieldName === "date_of_birth" ? "date" : "text"}
            value={value || ""}
            onChange={(event) => onFieldChange(fieldName, event.target.value)}
            className={`w-full rounded border border-[#F1D9A8] bg-white px-2 py-1.5 ${largerText ? "text-[12px]" : "text-[10px]"} font-semibold text-slate-700 outline-none focus:border-[#805900] focus:ring-2 focus:ring-[#805900]/15`}
          />
        ) : (
          formatFieldValue(fieldName === "purok" ? formatPurok(value) : value)
        )}
      </dd>
    </div>
  );
}

function jobseekerCertificatePageStyle(pageLayout, hasPaperDesign, compact = false) {
  return {
    paddingTop: hasPaperDesign
      ? `${Math.max(0, Number(pageLayout?.content_top || 64))}mm`
      : "20px",
    paddingLeft: hasPaperDesign ? "1.5in" : "1in",
    paddingRight: hasPaperDesign ? "1.5in" : "1in",
    paddingBottom: hasPaperDesign
      ? `${Math.max(0, Number(pageLayout?.content_bottom || 19))}mm`
      : "20px",
    color: "#172B4D",
    fontSize: compact ? "10pt" : "12pt",
    lineHeight: compact ? 1.45 : 1.65,
  };
}

function BarangayTemplate({ residentName, fields, editing, onFieldChange }) {
  return (
    <>
      <TemplateHeading
        title="Barangay Clearance"
        subtitle="Certificate of official barangay verification"
      />
      <div className="mb-5 rounded-sm bg-[#F5F8FF] p-4 text-center">
        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
          This certificate is issued to
        </p>
        <p className="mt-1 text-[18px] font-bold text-[#123F70]">
          {residentName}
        </p>
      </div>
      <Section title="Purpose of the request">
        {editing ? (
          <textarea
            value={fields.purpose || ""}
            onChange={(event) => onFieldChange("purpose", event.target.value)}
            className="min-h-16 w-full rounded border border-[#F1D9A8] bg-white p-2 text-[10px] leading-4 text-slate-700 outline-none focus:border-[#805900] focus:ring-2 focus:ring-[#805900]/15"
          />
        ) : (
          <p className="text-[11px] leading-5 text-slate-600">
            {fields.purpose ||
              fields.additional_details ||
              "The resident has requested official barangay verification for the stated purpose."}
          </p>
        )}
      </Section>
      <Section title="Resident information">
        <DetailLine
          label="Address"
          value={fields.address}
          fieldName="address"
          editing={editing}
          onFieldChange={onFieldChange}
        />
        <DetailLine
          label="Purok"
          value={fields.purok}
          fieldName="purok"
          editing={editing}
          onFieldChange={onFieldChange}
        />
        <DetailLine
          label="Date of birth"
          value={fields.date_of_birth}
          fieldName="date_of_birth"
          editing={editing}
          onFieldChange={onFieldChange}
        />
        <DetailLine
          label="Sex"
          value={fields.sex}
          fieldName="sex"
          editing={editing}
          onFieldChange={onFieldChange}
        />
      </Section>
      <p className="mt-1 text-[9px] leading-4 text-slate-500">
        The certificate is valid for the purpose stated above and is subject to
        barangay policy. It is not a substitute for any other official document.
      </p>
    </>
  );
}

function ResidencyTemplate({ residentName, fields, editing, onFieldChange }) {
  return (
    <>
      <TemplateHeading
        title="Certificate of Residency"
        subtitle="Official confirmation of barangay residence"
      />
      <div className="mb-5 rounded-sm bg-[#F5F8FF] p-4 text-center">
        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
          This certificate is issued to
        </p>
        {editing ? (
          <input
            value={residentName}
            onChange={(event) => onFieldChange("full_name", event.target.value)}
            className="mt-2 w-full rounded border border-[#F1D9A8] bg-white px-3 py-2 text-center text-[18px] font-bold text-[#123F70] outline-none focus:border-[#805900] focus:ring-2 focus:ring-[#805900]/15"
          />
        ) : (
          <p className="mt-1 text-[18px] font-bold text-[#123F70]">
            {residentName}
          </p>
        )}
      </div>
      <Section title="Residency details">
        <DetailLine
          label="Address"
          value={fields.address}
          fieldName="address"
          editing={editing}
          onFieldChange={onFieldChange}
          boldValue
        />
        <DetailLine
          label="Purok"
          value={fields.purok}
          fieldName="purok"
          editing={editing}
          onFieldChange={onFieldChange}
        />
        <DetailLine
          label="Date of birth"
          value={fields.date_of_birth}
          fieldName="date_of_birth"
          editing={editing}
          onFieldChange={onFieldChange}
        />
        <DetailLine
          label="Sex"
          value={fields.sex}
          fieldName="sex"
          editing={editing}
          onFieldChange={onFieldChange}
        />
        <DetailLine
          label="Length of residency (years)"
          value={fields.years_of_residency}
          fieldName="years_of_residency"
          editing={editing}
          onFieldChange={onFieldChange}
          boldValue
        />
        <DetailLine
          label="Additional months of residency"
          value={fields.months_of_residency}
          fieldName="months_of_residency"
          editing={editing}
          onFieldChange={onFieldChange}
        />
        <DetailLine
          label="Purpose"
          value={fields.purpose}
          fieldName="purpose"
          editing={editing}
          onFieldChange={onFieldChange}
        />
      </Section>
      <p className="text-[9px] leading-4 text-slate-500">
        This certificate confirms the resident’s stated period of residence
        within the barangay and is issued based on the information provided.
      </p>
    </>
  );
}

function IndigencyTemplate({ residentName, fields, editing, onFieldChange }) {
  return (
    <>
      <TemplateHeading
        title="Certificate of Indigency"
        subtitle="Official barangay certification of indigency"
      />
      <div className="mb-5 rounded-sm bg-[#F5F8FF] p-4 text-center">
        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
          This certificate is issued to
        </p>
        <p className="mt-1 text-[18px] font-bold text-[#123F70]">
          {residentName}
        </p>
      </div>
      <Section title="Resident information">
        <DetailLine
          label="Address"
          value={fields.address}
          fieldName="address"
          editing={editing}
          onFieldChange={onFieldChange}
          boldValue
        />
        <DetailLine
          label="Purok"
          value={fields.purok}
          fieldName="purok"
          editing={editing}
          onFieldChange={onFieldChange}
        />
        <DetailLine
          label="Purpose"
          value={fields.purpose}
          fieldName="purpose"
          editing={editing}
          onFieldChange={onFieldChange}
        />
      </Section>
      <p className="mt-1 text-[9px] leading-4 text-slate-500">
        This certificate confirms the resident&apos;s indigency based on the
        information provided and is issued for the stated purpose.
      </p>
    </>
  );
}

function BusinessCertificateValue({
  value,
  fieldName,
  editing,
  onFieldChange,
  className = "",
}) {
  if (editing) {
    return (
      <input
        value={value || ""}
        onChange={(event) => onFieldChange(fieldName, event.target.value)}
        className={`w-full border-b border-dashed border-slate-400 bg-white px-1 text-center font-bold outline-none focus:border-blue-600 ${className}`}
      />
    );
  }
  return (
    <p className={`font-bold underline underline-offset-2 ${className}`}>
      {value || ""}
    </p>
  );
}

function BusinessTemplate({
  residentName,
  fields,
  wording,
  editing,
  onFieldChange,
}) {
  const lines = String(wording || "").split(/\r?\n/);
  const lineIndex = (label) =>
    lines.findIndex((line) => line.trim().toUpperCase() === label);
  const businessNameIndex = lineIndex("BUSINESS NAME");
  const ownerIndex = lineIndex("BUSINESS OWNER");
  const addressIndex = lineIndex("ADDRESS OF BUSINESS");
  const titleIndex = lines.findIndex((line) =>
    /BARANGAY BUSINESS CLEARANCE/i.test(line),
  );
  const signatoryIndex = lineIndex("PUNONG BARANGAY");
  const wordingValue = (index, fallback) =>
    index > 0 ? lines[index - 1].trim() : fallback;
  const businessName = wordingValue(businessNameIndex, fields.business_name);
  const businessOwner = wordingValue(ownerIndex, residentName);
  const businessAddress = wordingValue(addressIndex, fields.business_address);
  const bodyLines = lines
    .slice(
      addressIndex >= 0 ? addressIndex + 1 : 0,
      signatoryIndex >= 0 ? signatoryIndex - 1 : undefined,
    )
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <div className="business-clearance-content flex min-h-[9.7in] w-full flex-col px-3 pt-2 text-black">
      {editing ? (
        <div className="mx-auto mt-8 w-full max-w-xl space-y-6">
          <p className="text-center text-sm font-semibold text-slate-500">
            Edit the business details shown in the clearance.
          </p>
          <label className="block text-center text-xs font-semibold uppercase text-slate-500">
            Business name
            <BusinessCertificateValue
              value={fields.business_name}
              fieldName="business_name"
              editing
              onFieldChange={onFieldChange}
              className="mt-1 text-base uppercase"
            />
          </label>
          <label className="block text-center text-xs font-semibold uppercase text-slate-500">
            Business owner
            <BusinessCertificateValue
              value={residentName}
              fieldName="full_name"
              editing
              onFieldChange={onFieldChange}
              className="mt-1 text-base uppercase"
            />
          </label>
          <label className="block text-center text-xs font-semibold uppercase text-slate-500">
            Address of business
            <BusinessCertificateValue
              value={fields.business_address}
              fieldName="business_address"
              editing
              onFieldChange={onFieldChange}
              className="mt-1 text-base uppercase"
            />
          </label>
        </div>
      ) : (
        <div className="w-full pt-2 text-center">
          <div className="flex items-start justify-between gap-6 text-left text-[9pt] font-medium leading-5">
            <div>
              {lines.slice(0, 2).map((line, index) => (
                <p key={index}>{line}</p>
              ))}
            </div>
            <div className="text-right">
              {lines.slice(2, 4).map((line, index) => (
                <p key={index}>{line}</p>
              ))}
            </div>
          </div>
          <h1 className="mt-7 text-[17pt] font-bold uppercase tracking-wide">
            {titleIndex >= 0
              ? lines[titleIndex].trim()
              : "Barangay Business Clearance"}
          </h1>
          <div className="mt-6 space-y-1">
            <p className="text-[15pt] font-bold uppercase underline underline-offset-2">
              {businessName}
            </p>
            <p className="text-[9pt] uppercase">
              {lines[businessNameIndex] || "BUSINESS NAME"}
            </p>
          </div>
          <div className="mt-5 space-y-1">
            <p className="text-[14pt] font-bold uppercase underline underline-offset-2">
              {businessOwner}
            </p>
            <p className="text-[9pt] uppercase">
              {lines[ownerIndex] || "BUSINESS OWNER"}
            </p>
          </div>
          <div className="mt-5 space-y-1">
            <p className="text-[11pt] font-bold uppercase underline underline-offset-2">
              {businessAddress}
            </p>
            <p className="text-[9pt] uppercase">
              {lines[addressIndex] || "ADDRESS OF BUSINESS"}
            </p>
          </div>
          <div className="mt-9 space-y-5 text-[10pt] leading-5">
            {bodyLines.map((line, index) => (
              <p
                key={index}
                className={
                  /^VALID ONLY UNTIL/i.test(line) ? "font-bold uppercase" : ""
                }
              >
                {line}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CharacterTemplate({ residentName, fields, editing, onFieldChange }) {
  const details = [
    ["Address", "address"],
    ["Date of birth", "date_of_birth"],
    ["Age", "age"],
    ["Sex", "sex"],
    ["Citizenship", "citizenship"],
    ["Civil status", "civil_status"],
    ["Purok", "purok"],
  ];

  return (
    <>
      <h1 className="mb-10 mt-[-0.7in] text-center text-[30px] font-bold uppercase tracking-wide text-[#123F70]">
        Certificate of Good Moral Character
      </h1>
      <div className="mb-7 text-center text-[12pt] leading-[1.65] text-[#172B4D]">
        <p className="font-bold uppercase">To whom it may concern:</p>
        {editing ? (
          <input
            value={residentName}
            onChange={(event) => onFieldChange("full_name", event.target.value)}
            aria-label="Resident name"
            className="mt-4 w-full border-b border-[#123F70] bg-transparent px-2 py-1 text-center text-[14pt] font-bold text-[#123F70] outline-none"
          />
        ) : (
          <p className="mt-4 text-[14pt] font-bold text-[#123F70]">
            {residentName}
          </p>
        )}
      </div>
      <p className="mb-5 text-justify text-[12pt] leading-[1.65] text-[#172B4D]">
        This is to certify that <strong>{residentName}</strong>, a resident of{" "}
        <strong>{fields.address || fields.purok || "this barangay"}</strong>, is
        known to be of good moral character and has demonstrated responsible,
        lawful, and respectful conduct within the community.
      </p>
      <div className="mb-5 space-y-1 text-[11pt] leading-[1.5] text-[#172B4D]">
        {details.map(([label, fieldName]) => (
          <div
            key={fieldName}
            className="grid grid-cols-[1.45in_0.12in_1fr] gap-2"
          >
            <strong className="uppercase">{label}</strong>
            <span>:</span>
            {editing && fieldName !== "age" ? (
              <input
                value={fields[fieldName] || ""}
                onChange={(event) =>
                  onFieldChange(fieldName, event.target.value)
                }
                aria-label={label}
                className="min-w-0 border-b border-slate-400 bg-transparent px-1 outline-none"
              />
            ) : (
              <span>{fields[fieldName] || "—"}</span>
            )}
          </div>
        ))}
      </div>
      <p className="mb-5 text-justify text-[12pt] leading-[1.65] text-[#172B4D]">
        This certification is issued at the request of the above-named person
        for <strong>{fields.purpose || "the stated purpose"}</strong> and for
        whatever legal purpose it may serve.
      </p>
      <p className="text-[10pt] leading-[1.5] text-[#172B4D]">
        The information contained in this certificate is based on the verified
        request and available barangay records.
      </p>
    </>
  );
}

function JobseekerTemplate({
  residentName,
  fields,
  page1Layout,
  paperDesign,
  editing,
  onFieldChange,
}) {
  return (
    <>
      <section
        className={`jobseeker-content-page jobseeker-sheet jobseeker-sheet--certificate ${paperDesign ? "jobseeker-sheet--uploaded" : ""}`}
        style={jobseekerCertificatePageStyle(page1Layout, Boolean(paperDesign))}
      >
        {paperDesign && (
          <img
            src={paperDesign}
            alt=""
            aria-hidden="true"
            className="jobseeker-sheet-design"
          />
        )}
        <div className="mb-6 text-center">
          <h2 className="text-[30px] font-bold uppercase tracking-tight text-[#123F70]">
            Certification
          </h2>
          <p className="mt-2 text-[10px] uppercase tracking-wider text-slate-400">
            Official certification of employment readiness
          </p>
        </div>
        <div className="mb-5 rounded-sm bg-[#F5F8FF] p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
            This certificate is issued to
          </p>
          {editing ? (
            <input
              value={residentName}
              onChange={(event) =>
                onFieldChange("full_name", event.target.value)
              }
              className="mt-2 w-full rounded border border-[#F1D9A8] bg-white px-3 py-2 text-center text-[18px] font-bold text-[#123F70] outline-none focus:border-[#805900] focus:ring-2 focus:ring-[#805900]/15"
            />
          ) : (
            <p className="mt-1 text-[18px] font-bold text-[#123F70]">
              {residentName}
            </p>
          )}
        </div>
        <Section title="Personal information">
          <DetailLine
            label="Address"
            value={fields.address}
            fieldName="address"
            editing={editing}
            onFieldChange={onFieldChange}
            largerText
          />
          <DetailLine
            label="Date of birth"
            value={fields.date_of_birth}
            fieldName="date_of_birth"
            editing={editing}
            onFieldChange={onFieldChange}
            largerText
          />
          <DetailLine
            label="Age"
            value={fields.age}
            fieldName="age"
            editing={false}
            onFieldChange={onFieldChange}
            largerText
          />
          <DetailLine
            label="Sex"
            value={fields.sex}
            fieldName="sex"
            editing={editing}
            onFieldChange={onFieldChange}
            largerText
          />
          <DetailLine
            label="Citizenship"
            value={fields.citizenship}
            fieldName="citizenship"
            editing={editing}
            onFieldChange={onFieldChange}
            largerText
          />
          <DetailLine
            label="Civil status"
            value={fields.civil_status}
            fieldName="civil_status"
            editing={editing}
            onFieldChange={onFieldChange}
            largerText
          />
          <DetailLine
            label="Purok"
            value={fields.purok}
            fieldName="purok"
            editing={editing}
            onFieldChange={onFieldChange}
            largerText
          />
        </Section>
        <Section title="Employment information">
          <DetailLine
            label="Purpose"
            value={fields.purpose}
            fieldName="purpose"
            editing={editing}
            onFieldChange={onFieldChange}
            largerText
          />
        </Section>
        <p className="text-[9px] leading-4 text-slate-500">
          This certification confirms that the resident is a first-time job
          seeker and has completed the required barangay verification process.
        </p>
      </section>
      <div className="document-page-break" aria-hidden="true" />
      <section
        className={`jobseeker-oath-page jobseeker-content-page jobseeker-content-page--second jobseeker-sheet ${paperDesign ? "jobseeker-sheet--uploaded" : ""}`}
        style={jobseekerCertificatePageStyle(page1Layout, Boolean(paperDesign), true)}
      >
        {paperDesign && (
          <img
            src={paperDesign}
            alt=""
            aria-hidden="true"
            className="jobseeker-sheet-design"
          />
        )}
        <div className="mb-6 text-center">
          <h2 className="text-[30px] font-bold tracking-tight text-[#123F70]">
            Oath of Undertaking
          </h2>
          <p className="mt-2 text-[10px] uppercase tracking-wider text-slate-400">
            First-Time Jobseekers Act of 2019 (RA 11261)
          </p>
        </div>
        <p className="mb-4 text-[10pt] leading-[1.5] text-slate-700">
          I, <strong>{residentName}</strong>, a resident of{" "}
          <strong>
            {fields.purok ? `${formatPurok(fields.purok)}, ` : ""}
            {fields.address || "Barangay Tayud, Consolacion, Cebu"}
          </strong>
          , availing the benefits of Republic Act 11261, do hereby declare and
          undertake:
        </p>
        <ol className="list-decimal space-y-2 pl-5 text-[10pt] leading-[1.5] text-slate-700">
          <li>
            This is the first time I will actively look for a job, and I am
            requesting this certification to avail of the benefits of the law.
          </li>
          <li>
            I understand that the benefits and privileges under the law are
            valid for one year from the date the barangay certification is
            issued, and may be availed of only once.
          </li>
          <li>
            I consent to the use of my personal information for the required
            First-Time Jobseekers roster and will not use this certification
            fraudulently.
          </li>
          <li>
            I will inform the Barangay when I become employed and confirm that I
            am not receiving similar exemptions under another program or law.
          </li>
        </ol>
        <p className="mt-5 text-[10pt] leading-[1.5] text-slate-700">
          I certify that the statements above are true and correct.
        </p>
        <div className="mt-12 grid grid-cols-2 gap-10 text-center text-[9px]">
          <div>
            <div className="border-t border-slate-500 pt-1 font-semibold">
              {residentName || "First-Time Jobseeker"}
            </div>
            <span>Applicant</span>
          </div>
          <div>
            <div className="border-t border-slate-500 pt-1 font-semibold">
              {getPunongBarangayName()}
            </div>
            <span>Punong Barangay / Witness</span>
          </div>
        </div>
      </section>
    </>
  );
}

function CedulaTemplate({
  request,
  residentName,
  fields,
  editing,
  onFieldChange,
}) {
  const fullName = [fields.last_name, fields.first_name, fields.middle_name]
    .filter(Boolean)
    .join(", ");
  const issued = getDocumentDate(request);
  const issueYear = new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
  }).format(issued);
  const dateIssued = new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    month: "numeric",
    day: "numeric",
    year: "2-digit",
  }).format(issued);
  const cell = "border border-[#8d8b78] px-1 py-0.5 leading-tight";
  const label =
    "block text-[5.5pt] font-semibold uppercase leading-none text-[#777566]";
  const value =
    "mt-0.5 min-h-3 text-[7.5pt] font-medium leading-tight text-[#172B4D]";
  const annualGrossSalary = Number(fields.taxable_amount);
  const annualGrossSalaryTax = Number.isFinite(annualGrossSalary)
    ? Math.floor(Math.max(0, annualGrossSalary) / 1000)
    : 0;
  const communityTaxDue = 5 + annualGrossSalaryTax;
  const interest = 0;
  const totalAmountPaid = communityTaxDue + interest;
  const formatPesos = (amount) =>
    `₱ ${Number(amount).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formattedAnnualGrossSalary =
    fields.taxable_amount !== "" &&
    fields.taxable_amount !== null &&
    fields.taxable_amount !== undefined &&
    Number.isFinite(annualGrossSalary)
      ? `₱ ${Math.round(annualGrossSalary).toLocaleString("en-PH")}`
      : "";
  const line = (key, fallback = "") =>
    editing ? (
      <input
        value={fields[key] || ""}
        onChange={(event) => onFieldChange(key, event.target.value)}
        className="w-full border-b border-slate-400 bg-transparent text-[10pt] outline-none"
      />
    ) : (
      fields[key] || fallback || " "
    );

  return (
    <div className="h-full border border-[#8d8b78] bg-[#fffef8] p-1 text-[7pt] leading-tight text-[#172B4D]">
      <div className="grid grid-cols-[1fr_1.15fr_1.35fr] border-b border-[#8d8b78]">
        <div className={`${cell} text-[11pt] font-bold`}>
          COMMUNITY TAX CERTIFICATE
        </div>
        <div
          className={`${cell} bg-[#4b4a41] text-center text-[9pt] font-bold text-white`}
        >
          INDIVIDUAL
        </div>
        <div className={`${cell} text-center text-[9pt] font-bold`}>
          CCI {issueYear}{" "}
          <span className="font-normal tracking-[0.16em]">
            {String(request.id || "").padStart(8, "0")}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-[1fr_1.5fr_1.5fr]">
        <div className={cell}>
          <span className={label}>Year</span>
          <div className={value}>{issueYear}</div>
        </div>
        <div className={cell}>
          <span className={label}>
            Place of issue (City/Municipality/Province)
          </span>
          <div className={value}>
            {fields.place_of_issue || "Consolacion, Cebu"}
          </div>
        </div>
        <div className={cell}>
          <span className={label}>Date issued</span>
          <div className={value}>{dateIssued}</div>
        </div>
      </div>
      <div className="grid grid-cols-3">
        {[
          ["Last name", "last_name"],
          ["First name", "first_name"],
          ["Middle name", "middle_name"],
        ].map(([title, key]) => (
          <div key={key} className={cell}>
            <span className={label}>{title}</span>
            <div className={value}>{line(key)}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-[2fr_1fr_1fr]">
        <div className={cell}>
          <span className={label}>Address</span>
          <div className={value}>
            {line(
              "address",
              fields.purok
                ? `${formatPurok(fields.purok)}, Barangay Tayud, Consolacion, Cebu`
                : "",
            )}
          </div>
        </div>
        <div className={cell}>
          <span className={label}>TIN (if any)</span>
          <div className={value}>{line("tin")}</div>
        </div>
        <div className={cell}>
          <span className={label}>Sex</span>
          <div className={value}>{line("sex")}</div>
        </div>
      </div>
      <div className="grid grid-cols-4">
        {[
          ["Citizenship", "citizenship"],
          ["Place of birth", "place_of_birth"],
          ["Height", "height"],
          ["Date of birth", "date_of_birth"],
        ].map(([title, key]) => (
          <div key={key} className={cell}>
            <span className={label}>{title}</span>
            <div className={value}>{line(key)}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-4">
        {[
          ["Civil status", "civil_status"],
          ["Profession / occupation / business", "occupation"],
          ["Weight", "weight"],
          ["Contact number", "contact_number"],
        ].map(([title, key]) => (
          <div key={key} className={cell}>
            <span className={label}>{title}</span>
            <div className={value}>{line(key)}</div>
          </div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-[1fr_1fr_1fr] text-[6.5pt] font-bold uppercase">
        <div className={cell}>Tax computation</div>
        <div className={cell}>Taxable amount</div>
        <div className={cell}>Community tax due</div>
      </div>
      <div className="grid grid-cols-[1fr_1fr_1fr] text-[6.5pt]">
        <div className={cell}>Basic community tax</div>
        <div className={cell}>₱ 5.00</div>
        <div className={cell}>₱ 5.00</div>
        <div className={cell}>
          1. Gross receipts or earnings derived from business during the
          preceding year (₱1 for every ₱1,000)
        </div>
        <div className={cell}></div>
        <div className={cell}></div>
        <div className={cell}>
          2. Salaries or gross receipts / earnings from profession or occupation
          (₱1 per ₱1,000)
        </div>
        <div className={cell}>{formattedAnnualGrossSalary}</div>
        <div className={cell}>{formatPesos(annualGrossSalaryTax)}</div>
        <div className={cell}>
          3. Income from real property (₱1 for every ₱1,000)
        </div>
        <div className={cell}></div>
        <div className={cell}></div>
        <div className={`${cell} font-bold`}>Total community tax due</div>
        <div className={cell}></div>
        <div className={`${cell} font-bold`}>
          {formatPesos(communityTaxDue)}
        </div>
      </div>
      <div className="grid grid-cols-[1.5fr_1fr] text-[7pt]">
        <div className={`${cell} min-h-12`}>
          <span className={label}>Taxpayer’s signature / thumbprint</span>
        </div>
        <div className="grid grid-cols-[1fr_auto]">
          <div className={cell}>TOTAL</div>
          <div className={`${cell} min-w-16 text-right font-semibold`}>
            {formatPesos(communityTaxDue)}
          </div>
          <div className={cell}>INTEREST</div>
          <div className={`${cell} min-w-16`}></div>
          <div className={`${cell} font-bold`}>TOTAL AMOUNT PAID</div>
          <div className={`${cell} min-w-16 text-right font-semibold`}>
            {formatPesos(totalAmountPaid)}
          </div>
          <div className={`${cell} col-span-2 min-h-8`}>
            <span className={label}>(in words)</span>
          </div>
        </div>
      </div>
      <div className="mt-1 flex justify-end text-center">
        <div className="w-44 border-t border-[#8d8b78] pt-0.5">
          <p className="text-[7.5pt] font-bold">Municipal Treasurer</p>
          <p className="text-[5.5pt] uppercase">City / Municipal Treasurer</p>
        </div>
      </div>
      <p className="mt-0.5 text-right text-[5.5pt] text-slate-500">
        Taxpayer’s copy · {fullName || residentName}
      </p>
    </div>
  );
}

function GenericTemplate({
  label,
  residentName,
  fields,
  editing,
  onFieldChange,
}) {
  return (
    <>
      <TemplateHeading title={label} subtitle="Official barangay document" />
      <div className="mb-5 rounded-sm bg-[#F5F8FF] p-4 text-center">
        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
          This document is issued to
        </p>
        <p className="mt-1 text-[18px] font-bold text-[#123F70]">
          {residentName}
        </p>
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
        This document is prepared from the information and supporting
        requirements reviewed by barangay staff.
      </p>
    </>
  );
}

export default DocumentPreviewModal;
