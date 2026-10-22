import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, FileText } from "lucide-react";
import {
  inputClass,
  primaryButtonClass,
  residentApi,
} from "../../services/residentApi";
import { shouldPromptForFeatureFeedback } from "../../services/featureFeedback";
import { RequestRow } from "../../components/resident/ResidentUI";
import FeedbackPrompt from "../../components/resident/FeedbackPrompt";

const APPLICANT_FIELDS = {
  full_name: { label: "Full Name", type: "text" },
  first_name: { label: "First Name", type: "text" },
  middle_name: { label: "Middle Name", type: "text", required: false },
  last_name: { label: "Last Name", type: "text" },
  address: {
    label: "House/Building No., Street, and Subdivision",
    type: "text",
    required: false,
  },
  purok: { label: "Purok", type: "text" },
  date_of_birth: { label: "Date of Birth", type: "date" },
  sex: { label: "Sex", type: "select", options: ["Female", "Male", "Other"] },
  civil_status: { label: "Civil status", type: "select", options: ["Single", "Married", "Widowed", "Separated"] },
  citizenship: { label: "Citizenship", type: "text" },
  occupation: { label: "Occupation or profession", type: "text" },
  contact_number: { label: "Contact Number", type: "tel" },
  email_address: { label: "Email Address", type: "email" },
};

function getApplicantDefaults(user = {}) {
  const profileNameParts = String(user.name || "").trim().split(/\s+/).filter(Boolean);
  const firstName = user.first_name || profileNameParts[0] || "";
  const middleName = user.middle_name || profileNameParts.slice(1, -1).join(" ");
  const lastName = user.last_name || (profileNameParts.length > 1 ? profileNameParts.at(-1) : "");
  const fullName = [
    firstName,
    middleName,
    lastName,
    user.suffix,
  ]
    .filter(Boolean)
    .join(" ");

  const dateOfBirth = user.date_of_birth
    ? String(user.date_of_birth).slice(0, 10)
    : "";

  return {
    full_name: fullName || user.name || "",
    first_name: firstName,
    middle_name: middleName,
    last_name: lastName,
    address: user.address || "",
    date_of_birth: dateOfBirth,
    age: calculateAge(dateOfBirth),
    sex: user.sex || "",
    civil_status: user.civil_status || "",
    citizenship: user.citizenship || "Filipino",
    purok: user.purok || "",
    contact_number: user.mobile_number || "",
    email_address: user.email || "",
    municipality_city: user.municipality_city || "Consolacion",
    province: user.province || "Cebu",
    business_contact_number: user.mobile_number || "",
    business_email_address: user.email || "",
  };
}

function getFriendlyRequestError(error, document) {
  const message = String(error?.message || "");
  const normalized = message.toLowerCase();

  if (normalized.includes("unable to connect") || normalized.includes("server took too long")) {
    return "We couldn’t reach the barangay service. Check your connection and try again.";
  }
  if (normalized.includes("already requested") || normalized.includes("one-time")) {
    return "This certificate has already been requested or issued for your account.";
  }
  if (normalized.includes("date_of_birth") || normalized.includes("date of birth")) {
    return "Enter a valid date of birth. It must be today or an earlier date.";
  }
  if (normalized.includes("age")) {
    return "We couldn’t calculate your age from your date of birth. Update your profile date of birth and try again.";
  }
  if (normalized.includes("requirements.")) {
    const requirement = document?.requirements.find((item) =>
      normalized.includes(item.key.toLowerCase()),
    );
    if (normalized.includes("required")) {
      return requirement
        ? `Please upload your ${requirement.label}.`
        : "Please upload all required documents before submitting.";
    }
    if (normalized.includes("mimes")) {
      return "Uploaded documents must be PDF, JPG, or PNG files.";
    }
    if (normalized.includes("max")) {
      return "Each uploaded document must be 5 MB or smaller.";
    }
    return "We couldn’t use one of the uploaded documents. Check the file and try again.";
  }
  if (normalized.includes("required") || normalized.includes("form_fields")) {
    return "Please complete all required information in the form.";
  }
  return message || "We couldn’t submit your request. Please check the form and try again.";
}

function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return "";
  const birthDate = new Date(`${dateOfBirth.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(birthDate.getTime())) return "";

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const beforeBirthday =
    today.getMonth() < birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() &&
      today.getDate() < birthDate.getDate());
  if (beforeBirthday) age -= 1;
  return age >= 0 ? String(age) : "";
}

const GENERAL_REQUEST_PURPOSES = [
  "Employment",
  "School enrollment or scholarship",
  "Business or business permit",
  "Travel",
  "Bank or loan application",
  "Other",
];

const DOCUMENT_TYPES = [
  {
    label: "Barangay Clearance",
    value: "Barangay Certification",
    fee: 80,
    applicantFields: [
      "full_name",
      "address",
      "purok",
      "date_of_birth",
      "sex",
    ],
    fields: [
      {
        key: "purpose",
        label: "Purpose of request",
        type: "select",
        options: GENERAL_REQUEST_PURPOSES,
      },
      {
        key: "purpose_other",
        label: "Please specify your purpose",
        type: "text",
        submit: false,
        showWhen: { key: "purpose", value: "Other" },
        requiredWhen: { key: "purpose", value: "Other" },
      },
    ],
    requirements: [
      { key: "purok_certificate", label: "Purok Certificate", required: true },
      { key: "valid_id", label: "Valid government-issued ID", required: true },
    ],
  },
  {
    label: "Certificate of Residency",
    value: "Barangay Residency",
    fee: 130,
    applicantFields: ["first_name", "last_name", "middle_name", "purok"],
    fields: [
      {
        key: "years_of_residency",
        label: "Length of residency (years)",
        type: "number",
        required: true,
        min: "0",
        step: "1",
      },
      {
        key: "purpose",
        label: "Purpose of request",
        type: "select",
        options: GENERAL_REQUEST_PURPOSES,
      },
      {
        key: "purpose_other",
        label: "Please specify your purpose",
        type: "text",
        submit: false,
        showWhen: { key: "purpose", value: "Other" },
        requiredWhen: { key: "purpose", value: "Other" },
      },
    ],
    requirements: [
      { key: "purok_certificate", label: "Purok Certificate", required: true },
      { key: "valid_id", label: "Valid government-issued ID", required: true },
    ],
  },
  {
    label: "Barangay Indigency",
    applicantFields: ["full_name", "purok"],
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
  {
    label: "Cedula (Community Tax Certificate)",
    value: "Cedula",
    fee: 0,
    fee_mode: "assessed",
    applicantFields: ["first_name", "last_name", "middle_name", "purok"],
    applicantFieldConfigs: [
      { key: "first_name", label: "First Name", type: "text", required: true },
      { key: "last_name", label: "Last Name", type: "text", required: true },
      { key: "middle_name", label: "Middle Name", type: "text", required: true },
      { key: "purok", label: "Purok", type: "text", required: true },
    ],
    fields: [
      {
        key: "taxable_amount",
        label: "Annual Gross Salary (PHP)",
        type: "number",
        required: true,
        min: 0,
        step: 1,
      },
    ],
    requirements: [
      { key: "national_government_id", label: "National Government ID", required: true },
    ],
  },
  {
    label: "Fencing Permit",
    value: "Fencing Permit",
    fee: 0,
    fee_mode: "assessed",
    applicantFields: ["full_name", "contact_number", "email_address"],
    fields: [
      { key: "property_owner_name", label: "Property owner's name", type: "text", required: true },
      { key: "property_address", label: "Property address", type: "text", required: true },
      { key: "property_purok", label: "Property Purok", type: "text", required: true },
      { key: "property_ownership", label: "Applicant's relationship to property", type: "select", required: true, options: ["Owner", "Authorized Representative"] },
      { key: "fence_material", label: "Fence material", type: "text", required: true },
      { key: "fence_height", label: "Fence height (meters)", type: "number", required: true, min: 0, step: "0.01" },
      { key: "fence_length", label: "Fence length (meters)", type: "number", required: true, min: 0, step: "0.01" },
      { key: "proposed_construction_date", label: "Proposed construction date", type: "date", required: true },
      { key: "project_description", label: "Additional project details", type: "textarea", required: false },
    ],
    requirements: [
      { key: "valid_id", label: "Valid government-issued ID", required: true },
      { key: "proof_of_ownership", label: "Proof of ownership", required: false },
      { key: "lease_or_authorization", label: "Owner authorization or lease", required: false, requiredWhen: { key: "property_ownership", value: "Authorized Representative" } },
      { key: "site_plan", label: "Property sketch or site plan", required: false },
    ],
  },
  {
    label: "Construction Permit",
    value: "Construction Permit",
    fee: 0,
    fee_mode: "assessed",
    applicantFields: ["full_name", "contact_number", "email_address"],
    fields: [
      { key: "valid_id_type", label: "Valid ID type", type: "text", required: true },
      { key: "valid_id_number", label: "Valid ID number", type: "text", required: true },
      { key: "property_owner_name", label: "Property owner's name", type: "text", required: true },
      { key: "property_street_number", label: "Property street/house number", type: "text", required: false },
      { key: "property_purok", label: "Property Purok", type: "text", required: true },
      { key: "lot_number", label: "Lot number", type: "text", required: false },
      { key: "tax_declaration_number", label: "Tax Declaration number", type: "text", required: false },
      { key: "title_number", label: "TCT/OCT number", type: "text", required: false },
      { key: "property_ownership", label: "Applicant's relationship to property", type: "select", required: true, options: ["Owner", "Authorized Representative"] },
      { key: "construction_type", label: "Type of construction", type: "select", required: true, options: ["New construction", "Renovation", "Repair", "Extension", "Fencing"] },
      { key: "structure_type", label: "Type of structure", type: "select", required: true, options: ["Residential", "Commercial", "Other"] },
      { key: "structure_details", label: "Specify structure", type: "text", required: true, requiredWhen: { key: "structure_type", value: "Other" }, showWhen: { key: "structure_type", value: "Other" } },
      { key: "number_of_floors", label: "Number of floors", type: "number", required: true, min: 1 },
      { key: "estimated_project_cost", label: "Estimated project cost (PHP)", type: "number", required: true, min: 0 },
      { key: "proposed_construction_date", label: "Proposed construction date", type: "date", required: true },
      { key: "project_description", label: "Brief construction description", type: "textarea", required: true },
    ],
    requirements: [
      { key: "valid_id", label: "Valid ID", required: true },
      { key: "proof_of_ownership", label: "Proof of ownership", required: false },
      { key: "title_or_tax_declaration", label: "TCT/OCT or Tax Declaration", required: false },
      { key: "lease_or_authorization", label: "Lease or owner authorization", required: false, requiredWhen: { key: "property_ownership", value: "Authorized Representative" } },
      { key: "architectural_plans", label: "Building/architectural plans", required: false },
      { key: "structural_plans", label: "Structural plans", required: false },
      { key: "electrical_plans", label: "Electrical plans", required: false },
      { key: "plumbing_plans", label: "Plumbing/sanitary plans", required: false },
      { key: "other_plans", label: "Other plans required by the Building Official", required: false },
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

function mapConfiguredDocumentType(type) {
  const applicantFieldConfigs = (type.applicant_fields || []).filter(
    (field) => field.enabled !== false,
  );
  return {
    ...type,
    applicantFieldConfigs,
    applicantFields: applicantFieldConfigs.map((field) => field.key),
    fields: (type.fields || []).filter((field) => field.enabled !== false),
    requirements: (type.requirements || []).filter(
      (requirement) => requirement.enabled !== false,
    ),
  };
}

function Documents({ requests, token, onRefresh, user }) {
  const [catalogTypes, setCatalogTypes] = useState(null);
  const [documentType, setDocumentType] = useState("");
  const [formFields, setFormFields] = useState(() =>
    getApplicantDefaults(user),
  );
  const [notes, setNotes] = useState("");
  const [editingRequest, setEditingRequest] = useState(null);
  const [requirementFiles, setRequirementFiles] = useState({});
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState("info");
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

  useEffect(() => {
    if (!documentType && !editingRequest) {
      setFormFields(getApplicantDefaults(user));
    }
  }, [documentType, editingRequest, user]);

  const loadCatalogTypes = useCallback(async (silent = false) => {
    if (!token) return;
    try {
      const result = await residentApi("/resident/document-types", token);
      const nextTypes = result.data || [];
      setCatalogTypes((current) =>
        JSON.stringify(current) === JSON.stringify(nextTypes) ? current : nextTypes,
      );
    } catch {
      if (!silent) {
        setCatalogTypes([]);
        setMessage("We couldn't load document types. Refresh the page and try again.");
        setMessageTone("error");
      }
    }
  }, [token]);

  useEffect(() => {
    loadCatalogTypes();
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") loadCatalogTypes(true);
    };
    const timer = window.setInterval(refreshWhenVisible, 15000);
    window.addEventListener("focus", refreshWhenVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshWhenVisible);
    };
  }, [loadCatalogTypes]);

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
  const availableDocuments = useMemo(() => {
    if (catalogTypes === null) return DOCUMENT_TYPES;
    return catalogTypes.map(mapConfiguredDocumentType);
  }, [catalogTypes]);
  const selectedDocument = (catalogTypes === null && editingRequest?.type
    ? mapConfiguredDocumentType(editingRequest.type)
    : availableDocuments.find(
        (document) => (document.value || document.label) === documentType,
      )) || (editingRequest?.type ? mapConfiguredDocumentType(editingRequest.type) : null);
  const documentOptions = selectedDocument && !availableDocuments.some(
    (document) => (document.value || document.label) === documentType,
  )
    ? [...availableDocuments, selectedDocument]
    : availableDocuments;
  const oneTimeAlreadyRequested =
    selectedDocument?.one_time &&
    selectedDocument.available === false &&
    !editingRequest;
  const requiredFileCount =
    selectedDocument?.requirements.filter(
      (requirement) =>
        (!requirement.showWhen || conditionMatches(requirement.showWhen, formFields)) &&
        (requirement.required ||
          conditionMatches(requirement.requiredWhen, formFields)),
    ).length || 0;
  const visibleRequirements = selectedDocument?.requirements.filter(
    (requirement) =>
      !requirement.showWhen || conditionMatches(requirement.showWhen, formFields),
  ) || [];

  const startCorrection = (request) => {
    const existingFields = request.details?.form_fields || {};
    const requestDocument = availableDocuments.find(
      (document) => (document.value || document.label) === request.document_type,
    ) || (request.type ? mapConfiguredDocumentType(request.type) : null);
    const purposeOptions =
      requestDocument?.fields.find((field) => field.key === "purpose")?.options || [];
    const supportsCustomPurpose = requestDocument?.fields.some(
      (field) => field.key === "purpose_other",
    );
    const hasCustomPurpose =
      (supportsCustomPurpose ||
        ["Barangay Certification", "Barangay Residency"].includes(request.document_type)) &&
      existingFields.purpose &&
      !purposeOptions.includes(existingFields.purpose);

    setEditingRequest(request);
    setDocumentType(request.document_type);
    const applicantDefaults = getApplicantDefaults(user);
    setFormFields({
      ...applicantDefaults,
      ...existingFields,
      ...(applicantDefaults.date_of_birth
        ? {
            date_of_birth: applicantDefaults.date_of_birth,
            age: applicantDefaults.age,
          }
        : {}),
      ...(hasCustomPurpose
        ? { purpose: "Other", purpose_other: existingFields.purpose }
        : {}),
    });
    setNotes(request.details?.notes || "");
    setRequirementFiles({});
    setMessage("");
    setMessageTone("info");
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const cancelCorrection = () => {
    setEditingRequest(null);
    setDocumentType("");
    setFormFields(getApplicantDefaults(user));
    setNotes("");
    setRequirementFiles({});
    setMessage("");
    setMessageTone("info");
    formRef.current?.reset();
  };

  const submitRequest = async (event) => {
    event.preventDefault();
    if (!selectedDocument) {
      setMessage("Choose a document type before submitting your request.");
      setMessageTone("error");
      return;
    }
    if (!formFields.date_of_birth && selectedDocument.applicantFields.includes("date_of_birth")) {
      setMessage("Your date of birth is missing. Add it to your profile before requesting this document.");
      setMessageTone("error");
      return;
    }
    if (selectedDocument.value === "First-Time Jobseeker Certification" && (formFields.age === undefined || formFields.age === null || formFields.age === "")) {
      setMessage("Your age could not be calculated. Make sure your date of birth is recorded in your resident profile.");
      setMessageTone("error");
      return;
    }
    setSubmitting(true);
    setMessage("");
    setMessageTone("info");
    try {
      const formData = new FormData();
      formData.append("document_type", documentType);
      formData.append("notes", notes.trim());
      const requestFieldDefinitions = [
        ...selectedDocument.applicantFields
          .map((key) => ({
            key,
            field: selectedDocument.applicantFieldConfigs?.find((item) => item.key === key),
          }))
          .filter(({ field }) => !field?.showWhen || conditionMatches(field.showWhen, formFields)),
        ...selectedDocument.fields.filter(
          (field) =>
            field.submit !== false &&
            (!field.showWhen || conditionMatches(field.showWhen, formFields)),
        ),
      ];
      requestFieldDefinitions.forEach(({ key }) => {
        const value =
          key === "purpose" &&
          formFields.purpose === "Other" &&
          selectedDocument.fields.some((field) => field.key === "purpose_other")
            ? formFields.purpose_other
            : formFields[key];
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
      setMessageTone("success");
      if (!editingRequest && selectedDocument.one_time) {
        setCatalogTypes((current) =>
          (current || []).map((type) => type.value === documentType
            ? {
                ...type,
                available: false,
                unavailable_reason: "You have already availed this one-time certificate. You cannot request it again.",
              }
            : type),
        );
      }
      if (
        !editingRequest &&
        shouldPromptForFeatureFeedback(user?.id, "document_request")
      ) {
        setFeedbackOpen(true);
      }
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
      setMessage(getFriendlyRequestError(error, selectedDocument));
      setMessageTone("error");
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
                disabled={catalogTypes === null || Boolean(editingRequest)}
                onChange={(event) => {
                  setDocumentType(event.target.value);
                  setFormFields(getApplicantDefaults(user));
                  setRequirementFiles({});
                }}
                className={inputClass}
              >
                <option value="">
                  {catalogTypes === null ? "Loading document types..." : "Select a document"}
                </option>
                {documentOptions.map((document) => (
                  <option
                    key={document.value || document.label}
                    value={document.value || document.label}
                    disabled={!editingRequest && document.one_time && document.available === false}
                  >
                    {document.label}
                    {document.one_time && document.available === false ? " (Already availed)" : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {selectedDocument && (
            <>
              {selectedDocument.description && (
                <p className="mt-5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-600">
                  {selectedDocument.description}
                </p>
              )}
              {selectedDocument.notice && (
                <p className="mt-5 rounded-xl bg-[#EEF4FF] px-4 py-3 text-sm text-[#41658A]">
                  {selectedDocument.notice}
                </p>
              )}
              {oneTimeAlreadyRequested && (
                <p role="alert" className="mt-5 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                  {selectedDocument.unavailable_reason || "This document can only be requested once."}
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
                {selectedDocument.fee_mode === "assessed" ? (
                  <p className="mt-3 rounded-xl bg-[#EEF4FF] px-4 py-3 text-sm font-semibold text-[#2455D6]">
                    {selectedDocument.value === "Cedula"
                      ? "Community tax will be assessed by barangay staff."
                      : "Fee will be assessed by barangay staff based on your business information."}
                  </p>
                ) : selectedDocument.fee !== undefined && (
                            <p className="mt-3 rounded-xl bg-[#EEF4FF] px-4 py-3 text-sm font-semibold text-[#2455D6]">
                              {Number(selectedDocument.fee) === 0
                                ? `${selectedDocument.label} has no fee.`
                                : `${selectedDocument.label} fee: ₱${Number(selectedDocument.fee).toFixed(2)}. Pay this at the barangay when you visit to claim your certificate.`}
                  </p>
                )}
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {selectedDocument.applicantFields
                    .filter((key) => {
                      const config = selectedDocument.applicantFieldConfigs?.find((item) => item.key === key);
                      return !config?.showWhen || conditionMatches(config.showWhen, formFields);
                    })
                    .map((key) => {
                    const field = selectedDocument.applicantFieldConfigs?.find(
                      (item) => item.key === key,
                    ) || APPLICANT_FIELDS[key] || {
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
                            required={field.requiredWhen
                              ? conditionMatches(field.requiredWhen, formFields)
                              : field.required !== false}
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
                            {(field.options || []).map((option) => (
                              <option key={option}>{option}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            required={!field.readOnly && (field.requiredWhen
                              ? conditionMatches(field.requiredWhen, formFields)
                              : field.required !== false)}
                            type={field.type}
                            value={formFields[key] || ""}
                            readOnly={field.readOnly}
                            onChange={(event) =>
                              setFormFields((current) => ({
                                ...current,
                                [key]: event.target.value,
                                ...(key === "date_of_birth"
                                  ? { age: calculateAge(event.target.value) }
                                  : {}),
                              }))
                            }
                            className={`${inputClass} ${field.readOnly ? "bg-slate-100 text-slate-500" : ""}`}
                          />
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>

              {selectedDocument.fields.length > 0 && <div className="mt-6 border-t border-slate-100 pt-5">
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
                        const required = field.requiredWhen
                          ? conditionMatches(field.requiredWhen, formFields)
                          : field.required !== false;
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
                              {(field.options || []).map((option) => (
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
              </div>}

              {visibleRequirements.length > 0 && <div className="mt-6 border-t border-slate-100 pt-5">
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
                    {visibleRequirements.length - requiredFileCount}{" "}
                    optional
                  </span>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {visibleRequirements.map((requirement) => {
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
              </div>}
            </>
          )}

          {selectedDocument && selectedDocument.value !== "Cedula" && (
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
              role={messageTone === "error" ? "alert" : "status"}
              className={`mt-4 rounded-xl px-4 py-3 text-sm font-semibold ${
                messageTone === "error"
                  ? "bg-red-50 text-red-700"
                  : messageTone === "success"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-[#EEF4FF] text-[#2455D6]"
              }`}
            >
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || oneTimeAlreadyRequested}
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
                <RequestRow request={request} token={token} />
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
