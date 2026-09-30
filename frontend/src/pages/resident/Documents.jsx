import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, FileText } from "lucide-react";
import {
  inputClass,
  primaryButtonClass,
  residentApi,
} from "../../services/residentApi";
import { RequestRow } from "../../components/resident/ResidentUI";
import FeedbackPrompt from "../../components/resident/FeedbackPrompt";

const PURPOSE_OPTIONS = [
  "Employment",
  "School Requirement",
  "Financial Assistance",
  "Legal Requirement",
  "Scholarship",
  "Loan/Application",
  "Other",
];

const APPLICANT_FIELDS = {
  full_name: { label: "Full Name", type: "text" },
  date_of_birth: { label: "Date of Birth", type: "date" },
  sex: { label: "Sex", type: "select", options: ["Female", "Male", "Other"] },
  civil_status: {
    label: "Civil Status",
    type: "select",
    options: ["Single", "Married", "Widowed", "Separated", "Other"],
  },
  purok: { label: "Purok", type: "text" },
  contact_number: { label: "Contact Number", type: "tel" },
  email_address: { label: "Email Address", type: "email" },
};

function getApplicantDefaults(user = {}) {
  const fullName = [
    user.first_name,
    user.middle_name,
    user.last_name,
    user.suffix,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    full_name: fullName || user.name || "",
    date_of_birth: user.date_of_birth || "",
    sex: user.sex || "",
    civil_status: user.civil_status || "",
    purok: user.purok || "",
    contact_number: user.mobile_number || "",
    email_address: user.email || "",
    municipality_city: user.municipality_city || "Consolacion",
    province: user.province || "Cebu",
    business_contact_number: user.mobile_number || "",
    business_email_address: user.email || "",
  };
}

const DOCUMENT_TYPES = [
  {
    label: "Barangay Certification",
    applicantFields: [
      "full_name",
      "date_of_birth",
      "sex",
      "civil_status",
      "purok",
      "contact_number",
      "email_address",
    ],
    fields: [
      {
        key: "purpose",
        label: "Purpose of certification",
        type: "select",
        options: PURPOSE_OPTIONS,
      },
      {
        key: "additional_details",
        label: "Additional details or reason for requesting",
        type: "textarea",
        required: false,
        requiredWhen: { key: "purpose", value: "Other" },
      },
    ],
    requirements: [
      { key: "valid_id", label: "Valid government-issued ID", required: true },
    ],
  },
  {
    label: "Barangay Residency",
    applicantFields: [
      "full_name",
      "date_of_birth",
      "sex",
      "civil_status",
      "purok",
      "municipality_city",
      "province",
    ],
    fields: [
      {
        key: "years_of_residency",
        label: "Years of residency",
        type: "number",
        min: "0",
        step: "1",
      },
      {
        key: "months_of_residency",
        label: "Additional months",
        type: "number",
        min: "0",
        max: "11",
        step: "1",
      },
      { key: "purpose", label: "Purpose of request", type: "text" },
    ],
    requirements: [
      {
        key: "valid_id",
        label: "Valid ID showing your address",
        required: false,
      },
      {
        key: "proof_of_residency",
        label: "Other supporting proof (if requested)",
        required: false,
      },
    ],
  },
  {
    label: "Barangay Indigency",
    applicantFields: [
      "full_name",
      "date_of_birth",
      "sex",
      "civil_status",
      "purok",
      "contact_number",
    ],
    fields: [
      {
        key: "purpose",
        label: "Purpose of request",
        type: "select",
        options: [
          "Medical Assistance",
          "Educational Assistance",
          "Financial Assistance",
          "Scholarship",
          "Legal Assistance",
          "Social Welfare Assistance",
          "Other",
        ],
      },
      {
        key: "additional_details",
        label: "Additional details or reason for requesting",
        type: "textarea",
        required: false,
        requiredWhen: { key: "purpose", value: "Other" },
      },
    ],
    requirements: [
      { key: "valid_id", label: "Valid government-issued ID", required: true },
    ],
  },
  {
    label: "Construction Permit",
    notice:
      "This request covers the barangay clearance portion. Municipal building permit requirements may be handled separately by the Building Official.",
    applicantFields: ["full_name", "contact_number", "email_address"],
    fields: [
      { key: "valid_id_type", label: "Valid ID type", type: "text" },
      { key: "valid_id_number", label: "Valid ID number", type: "text" },
      {
        key: "property_owner_name",
        label: "Property owner's name",
        type: "text",
      },
      {
        key: "property_street_number",
        label: "Property street/house number (if needed)",
        type: "text",
        required: false,
      },
      { key: "property_purok", label: "Purok", type: "text" },
      {
        key: "lot_number",
        label: "Lot number (if available)",
        type: "text",
        required: false,
      },
      {
        key: "tax_declaration_number",
        label: "Tax Declaration number (if available)",
        type: "text",
        required: false,
      },
      {
        key: "title_number",
        label: "TCT/OCT number (if available)",
        type: "text",
        required: false,
      },
      {
        key: "property_ownership",
        label: "Applicant's relationship to property",
        type: "select",
        options: ["Owner", "Authorized Representative"],
      },
      {
        key: "construction_type",
        label: "Type of construction",
        type: "select",
        options: [
          "New construction",
          "Renovation",
          "Repair",
          "Extension",
          "Fencing",
        ],
      },
      {
        key: "structure_type",
        label: "Type of structure",
        type: "select",
        options: ["Residential", "Commercial", "Other"],
      },
      {
        key: "structure_details",
        label: "Specify structure (if Other)",
        type: "text",
        showWhen: { key: "structure_type", value: "Other" },
      },
      {
        key: "number_of_floors",
        label: "Number of floors",
        type: "number",
        min: "1",
        step: "1",
      },
      {
        key: "estimated_project_cost",
        label: "Estimated project cost (PHP)",
        type: "number",
        min: "0",
        step: "0.01",
      },
      {
        key: "proposed_construction_date",
        label: "Proposed construction date",
        type: "date",
      },
      {
        key: "project_description",
        label: "Brief construction description",
        type: "textarea",
      },
    ],
    requirements: [
      { key: "valid_id", label: "Valid ID", required: true },
      {
        key: "proof_of_ownership",
        label: "Proof of ownership",
        required: false,
      },
      {
        key: "title_or_tax_declaration",
        label: "TCT/OCT or Tax Declaration",
        required: false,
      },
      {
        key: "lease_or_authorization",
        label: "Lease or owner authorization",
        required: false,
        requiredWhen: {
          key: "property_ownership",
          value: "Authorized Representative",
        },
      },
      {
        key: "architectural_plans",
        label: "Building/architectural plans",
        required: false,
      },
      { key: "structural_plans", label: "Structural plans", required: false },
      { key: "electrical_plans", label: "Electrical plans", required: false },
      {
        key: "plumbing_plans",
        label: "Plumbing/sanitary plans",
        required: false,
      },
      {
        key: "other_plans",
        label: "Other plans required by the Building Official",
        required: false,
      },
    ],
  },
  {
    label: "Business Permit",
    notice:
      "This request covers barangay business clearance. The municipal Mayor's/Business Permit is handled separately.",
    applicantFields: ["full_name", "contact_number", "email_address"],
    fields: [
      {
        key: "business_ownership",
        label: "Business ownership",
        type: "select",
        options: [
          "Sole Proprietorship",
          "Partnership",
          "Corporation",
          "Cooperative",
          "Other",
        ],
      },
      { key: "business_name", label: "Business name", type: "text" },
      { key: "business_type", label: "Business type", type: "text" },
      { key: "nature_of_business", label: "Nature of business", type: "text" },
      {
        key: "business_street_number",
        label: "Business street/house number (if needed)",
        type: "text",
        required: false,
      },
      { key: "business_purok", label: "Purok", type: "text" },
      {
        key: "estimated_investment",
        label: "Capital/estimated investment (PHP)",
        type: "number",
        min: "0",
        step: "0.01",
      },
      {
        key: "number_of_employees",
        label: "Number of employees",
        type: "number",
        min: "0",
        step: "1",
      },
      {
        key: "business_start_date",
        label: "Date business will start",
        type: "date",
      },
      {
        key: "business_contact_number",
        label: "Business contact number",
        type: "tel",
      },
      {
        key: "business_email_address",
        label: "Business email address",
        type: "email",
      },
    ],
    requirements: [
      { key: "valid_id", label: "Valid government-issued ID", required: true },
      {
        key: "business_registration",
        label: "Business registration (DTI, SEC, or CDA as applicable)",
        required: false,
        requiredWhen: {
          key: "business_ownership",
          value: [
            "Sole Proprietorship",
            "Partnership",
            "Corporation",
            "Cooperative",
          ],
        },
      },
      {
        key: "lease_or_proof_of_ownership",
        label: "Lease contract or proof of ownership",
        required: false,
      },
      {
        key: "community_tax_certificate",
        label: "Community Tax Certificate",
        required: false,
      },
      {
        key: "other_business_permits",
        label: "Other permits, if applicable",
        required: false,
      },
    ],
  },
];

function conditionMatches(condition, values) {
  if (!condition) return false;
  const expected = condition.value;
  return Array.isArray(expected)
    ? expected.includes(values[condition.key])
    : values[condition.key] === expected;
}

function Documents({ requests, token, onRefresh, user }) {
  const [documentType, setDocumentType] = useState("");
  const [formFields, setFormFields] = useState(() =>
    getApplicantDefaults(user),
  );
  const [notes, setNotes] = useState("");
  const [editingRequest, setEditingRequest] = useState(null);
  const [requirementFiles, setRequirementFiles] = useState({});
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [history, setHistory] = useState(requests);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyMeta, setHistoryMeta] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
  });
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");
  const [reloadHistory, setReloadHistory] = useState(0);
  const formRef = useRef(null);

  const changeHistoryPage = (page) => {
    setHistoryLoading(true);
    setHistoryPage(page);
  };

  const retryHistory = () => {
    setHistoryLoading(true);
    setReloadHistory((current) => current + 1);
  };

  useEffect(() => {
    let active = true;

    residentApi(`/resident/requests?page=${historyPage}`, token)
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
  const selectedDocument = DOCUMENT_TYPES.find(
    (document) => document.label === documentType,
  );
  const requiredFileCount =
    selectedDocument?.requirements.filter(
      (requirement) =>
        requirement.required ||
        conditionMatches(requirement.requiredWhen, formFields),
    ).length || 0;

  const startCorrection = (request) => {
    setEditingRequest(request);
    setDocumentType(request.document_type);
    setFormFields({
      ...getApplicantDefaults(user),
      ...(request.details?.form_fields || {}),
    });
    setNotes(request.details?.notes || "");
    setRequirementFiles({});
    setMessage("");
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const cancelCorrection = () => {
    setEditingRequest(null);
    setDocumentType("");
    setFormFields(getApplicantDefaults(user));
    setNotes("");
    setRequirementFiles({});
    setMessage("");
    formRef.current?.reset();
  };

  const submitRequest = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    try {
      const formData = new FormData();
      formData.append("document_type", documentType);
      formData.append("notes", notes.trim());
      const requestFieldDefinitions = [
        ...selectedDocument.applicantFields.map((key) => ({ key })),
        ...selectedDocument.fields.filter(
          (field) =>
            !field.showWhen || conditionMatches(field.showWhen, formFields),
        ),
      ];
      requestFieldDefinitions.forEach(({ key }) => {
        const value = formFields[key];
        if (value !== undefined && value !== "") {
          formData.append(`form_fields[${key}]`, value.trim());
        }
      });
      Object.entries(requirementFiles).forEach(([key, file]) => {
        if (file) formData.append(`requirements[${key}]`, file);
      });

      const endpoint = editingRequest
        ? `/resident/requests/${editingRequest.id}/resubmit`
        : "/resident/requests";
      const data = await residentApi(endpoint, token, {
        method: "POST",
        body: formData,
      });
      setMessage(
        editingRequest
          ? `Correction submitted. Request ${data.request.id} is pending verification.`
          : `Request submitted. Your Request ID is ${data.request.id}.`,
      );
      if (!editingRequest) setFeedbackOpen(true);
      setEditingRequest(null);
      setDocumentType("");
      setFormFields(getApplicantDefaults(user));
      setNotes("");
      setRequirementFiles({});
      formRef.current?.reset();
      setHistoryPage(1);
      setHistoryLoading(true);
      setReloadHistory((current) => current + 1);
      try {
        await onRefresh?.();
      } catch {
        // The request is saved; the request history has its own refresh state.
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <div className="space-y-6 pb-8">
      <header className="relative overflow-hidden rounded-[28px] border border-white/70 bg-white/70 px-6 py-7 shadow-[0_8px_28px_rgba(18,63,112,0.05)] backdrop-blur-sm sm:px-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-[#2455D6]/5 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 right-32 h-48 w-48 rounded-full bg-[#E52B32]/5 blur-2xl" />

        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#2455D6] text-white">
              <FileText
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
                Document requests
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                Request official barangay documents and track every submission
                in one place.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              document
                .getElementById("new-document-request")
                ?.scrollIntoView({ behavior: "smooth" })
            }
            className={primaryButtonClass}
          >
            Start a document request <span aria-hidden="true">→</span>
          </button>
        </div>
      </header>

      <section className="rounded-[26px] border border-slate-200/80 bg-white/90 p-6 shadow-[0_8px_28px_rgba(18,63,112,0.06)] backdrop-blur-sm sm:p-8">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-[#172B4D]">
            {editingRequest
              ? "Correct your document request"
              : "Start a document request"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {editingRequest
              ? "Update the requested information or replace a supporting document, then send it back for verification."
              : "Choose a service and provide any information staff should know."}
          </p>
        </div>

        {editingRequest && (
          <div className="mt-5 flex items-start justify-between gap-4 rounded-xl border border-[#F1D9A8] bg-[#FFF7E7] p-4">
            <div>
              <p className="text-sm font-bold text-[#805900]">
                Request {editingRequest.id} needs a correction
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#624700]">
                {editingRequest.staff_remarks ||
                  "Please review and update the information or requirements below."}
              </p>
            </div>
            <button
              type="button"
              onClick={cancelCorrection}
              className="shrink-0 rounded-lg px-3 py-2 text-sm font-semibold text-[#805900] transition hover:bg-white/70"
            >
              Cancel
            </button>
          </div>
        )}

        <form ref={formRef} id="new-document-request" onSubmit={submitRequest}>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-bold text-slate-700">
                Document type
              </span>
              <select
                required
                value={documentType}
                disabled={Boolean(editingRequest)}
                onChange={(event) => {
                  setDocumentType(event.target.value);
                  setFormFields(getApplicantDefaults(user));
                  setRequirementFiles({});
                }}
                className={inputClass}
              >
                <option value="">Select a document</option>
                {DOCUMENT_TYPES.map((document) => (
                  <option key={document.label}>{document.label}</option>
                ))}
              </select>
            </label>
          </div>

          {selectedDocument && (
            <>
              {selectedDocument.notice && (
                <p className="mt-5 rounded-xl bg-[#EEF4FF] px-4 py-3 text-sm text-[#41658A]">
                  {selectedDocument.notice}
                </p>
              )}

              <div className="mt-6 border-t border-slate-100 pt-5">
                <h3 className="text-sm font-bold text-[#172B4D]">
                  Applicant information
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Profile details are filled in when available. You can complete
                  any missing information.
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {selectedDocument.applicantFields.map((key) => {
                    const field = APPLICANT_FIELDS[key] || {
                      label:
                        key === "municipality_city"
                          ? "Municipality/City"
                          : key === "province"
                            ? "Province"
                            : key,
                      type: "text",
                    };
                    return (
                      <label key={key} className="block">
                        <span className="text-sm font-bold text-slate-700">
                          {field.label}
                        </span>
                        {field.type === "select" ? (
                          <select
                            required
                            value={formFields[key] || ""}
                            onChange={(event) =>
                              setFormFields((current) => ({
                                ...current,
                                [key]: event.target.value,
                              }))
                            }
                            className={inputClass}
                          >
                            <option value="">
                              Select {field.label.toLowerCase()}
                            </option>
                            {field.options.map((option) => (
                              <option key={option}>{option}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            required
                            type={field.type}
                            value={formFields[key] || ""}
                            onChange={(event) =>
                              setFormFields((current) => ({
                                ...current,
                                [key]: event.target.value,
                              }))
                            }
                            className={inputClass}
                          />
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6 border-t border-slate-100 pt-5">
                <h3 className="text-sm font-bold text-[#172B4D]">
                  Request details
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Provide the information needed for this document.
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {selectedDocument.fields
                    .filter(
                      (field) =>
                        !field.showWhen ||
                        conditionMatches(field.showWhen, formFields),
                    )
                    .map((field) => {
                      const required =
                        field.required !== false ||
                        conditionMatches(field.requiredWhen, formFields);
                      const controlProps = {
                        required,
                        value: formFields[field.key] || "",
                        onChange: (event) =>
                          setFormFields((current) => ({
                            ...current,
                            [field.key]: event.target.value,
                          })),
                        className: inputClass,
                      };

                      return (
                        <label key={field.key} className="block">
                          <span className="text-sm font-bold text-slate-700">
                            {field.label}
                            {!required && (
                              <span className="ml-1 font-normal text-slate-400">
                                (optional)
                              </span>
                            )}
                          </span>
                          {field.type === "select" ? (
                            <select {...controlProps}>
                              <option value="">Select an option</option>
                              {field.options.map((option) => (
                                <option key={option}>{option}</option>
                              ))}
                            </select>
                          ) : field.type === "textarea" ? (
                            <textarea rows={3} {...controlProps} />
                          ) : (
                            <input
                              type={field.type}
                              min={field.min}
                              max={field.max}
                              step={field.step}
                              {...controlProps}
                            />
                          )}
                        </label>
                      );
                    })}
                </div>
              </div>

              <div className="mt-6 border-t border-slate-100 pt-5">
                <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-end">
                  <div>
                    <h3 className="text-sm font-bold text-[#172B4D]">
                      Supporting documents
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Upload PDF, JPG, or PNG files up to 5 MB each. Optional
                      documents can be provided if applicable or requested by
                      barangay staff.
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-[#55708F]">
                    {requiredFileCount} required,{" "}
                    {selectedDocument.requirements.length - requiredFileCount}{" "}
                    optional
                  </span>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {selectedDocument.requirements.map((requirement) => {
                    const required =
                      requirement.required ||
                      conditionMatches(requirement.requiredWhen, formFields);
                    const hasExistingFile = Boolean(
                      editingRequest?.details?.requirements?.[requirement.key]
                        ?.path,
                    );
                    let label = requirement.label;
                    if (requirement.key === "business_registration") {
                      const registrationLabels = {
                        "Sole Proprietorship": "DTI registration",
                        Partnership: "SEC registration",
                        Corporation: "SEC registration",
                        Cooperative: "CDA registration",
                      };
                      label = registrationLabels[formFields.business_ownership]
                        ? `${registrationLabels[formFields.business_ownership]} document`
                        : requirement.label;
                    }

                    return (
                      <label key={requirement.key} className="block">
                        <span className="text-sm font-bold text-slate-700">
                          {label}
                          {!required && (
                            <span className="ml-1 font-normal text-slate-400">
                              (optional)
                            </span>
                          )}
                        </span>
                        <input
                          required={required && !hasExistingFile}
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(event) =>
                            setRequirementFiles((current) => ({
                              ...current,
                              [requirement.key]:
                                event.target.files?.[0] || null,
                            }))
                          }
                          className={`${inputClass} file:mr-3 file:rounded-lg file:border-0 file:bg-[#2455D6]/10 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-[#2455D6]`}
                        />
                        {hasExistingFile &&
                          !requirementFiles[requirement.key] && (
                            <span className="mt-1 block text-xs text-slate-500">
                              Current file:{" "}
                              {editingRequest.details.requirements[
                                requirement.key
                              ].original_name || "Previously submitted"}
                              . Choose a replacement if requested.
                            </span>
                          )}
                      </label>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {selectedDocument && (
            <label className="mt-5 block">
              <span className="text-sm font-bold text-slate-700">
                Note to staff{" "}
                <span className="font-normal text-slate-400">(optional)</span>
              </span>
              <textarea
                maxLength={2000}
                rows={3}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className={inputClass}
                placeholder="Add context about your request or the corrections made."
              />
            </label>
          )}

          {message && (
            <p
              role="status"
              className="mt-4 rounded-xl bg-[#EEF4FF] px-4 py-3 text-sm font-semibold text-[#2455D6]"
            >
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className={`${primaryButtonClass} mt-5`}
          >
            {submitting
              ? "Submitting..."
              : editingRequest
                ? "Resubmit for verification"
                : "Submit request"}
          </button>
        </form>
      </section>

      <section className="overflow-hidden rounded-[26px] border border-slate-200/80 bg-white/90 shadow-[0_8px_28px_rgba(18,63,112,0.06)] backdrop-blur-sm">
        <div className="border-b border-slate-100 px-6 py-5 sm:px-8">
          <h2 className="text-lg font-bold tracking-tight text-[#172B4D]">
            Request history
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            {historyMeta.total}{" "}
            {historyMeta.total === 1 ? "request" : "requests"} submitted
          </p>
        </div>

        {historyLoading ? (
          <div
            className="space-y-4 px-6 py-7 sm:px-8"
            aria-label="Loading document request history"
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
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2455D6]/10 text-2xl text-[#2455D6]">
              <FileText
                className="h-6 w-6"
                strokeWidth={1.8}
                aria-hidden="true"
              />
            </div>
            <h3 className="mt-4 text-sm font-bold text-[#172B4D]">
              No document requests yet
            </h3>
            <p className="mx-auto mt-1 max-w-xs text-sm text-slate-500">
              Requests you submit will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 px-6 sm:px-8">
            {history.map((request) => (
              <div key={request.id} className="transition hover:bg-slate-50/70">
                <RequestRow request={request} />
                {request.status === "for_correction" && (
                  <div className="pb-4 pl-[52px]">
                    <button
                      type="button"
                      onClick={() => startCorrection(request)}
                      className="inline-flex min-h-10 items-center rounded-xl bg-[#C74444] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#AD3838]"
                    >
                      Correct and resubmit
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {!historyLoading && !historyError && historyMeta.last_page > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 sm:px-8">
            <p className="text-xs text-slate-500">
              Page {historyMeta.current_page} of {historyMeta.last_page}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                aria-label="Previous page"
                disabled={historyPage <= 1}
                onClick={() => changeHistoryPage(Math.max(1, historyPage - 1))}
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
      </section>
      {feedbackOpen && (
        <FeedbackPrompt
          token={token}
          serviceType="document_request"
          onClose={() => setFeedbackOpen(false)}
        />
      )}
    </div>
  );
}

export default Documents;
