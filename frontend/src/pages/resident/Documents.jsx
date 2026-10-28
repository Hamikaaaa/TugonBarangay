import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, ChevronLeft, ChevronRight, FileText } from "lucide-react";
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
  first_name: { label: "First name", type: "text" },
  last_name: { label: "Last name", type: "text" },
  middle_name: { label: "Middle name", type: "text", required: false },
  address: {
    label: "House/Building No., Street, and Subdivision",
    type: "text",
    required: false,
  },
  purok: { label: "Purok", type: "text" },
  date_of_birth: { label: "Date of Birth", type: "date" },
  sex: { label: "Sex", type: "select", options: ["Female", "Male", "Other"] },
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
  const residentAddress =
    user.address ||
    (user.purok
      ? `${formatPurok(user.purok)}, Barangay Tayud, Consolacion, Cebu`
      : "");

  return {
    full_name: fullName || user.name || "",
    first_name: firstName,
    middle_name: middleName,
    last_name: lastName,
    address: residentAddress,
    date_of_birth: dateOfBirth,
    age: calculateAge(dateOfBirth),
    sex: user.sex || "",
    civil_status: user.civil_status || "",
    citizenship: user.citizenship || "Filipino",
    purok: user.purok || "",
    contact_number: user.mobile_number || "",
    email_address: user.email || "",
    project_owner_name: fullName || user.name || "",
    project_address: residentAddress,
    construction_type: "",
    construction_type_other: "",
    municipality_city: user.municipality_city || "Consolacion",
    province: user.province || "Cebu",
    business_contact_number: user.mobile_number || "",
    business_email_address: user.email || "",
    business_purok: user.purok || "",
    business_address: user.address || "",
    tax_year: String(new Date().getFullYear()),
  };
}

function getClearanceAddress(purok) {
  const value = String(purok || "").trim();
  return value ? `${formatPurok(value)}, Barangay Tayud, Consolacion, Cebu` : "";
}

function formatPurok(value) {
  const purok = String(value || "").trim();
  if (!purok) return "";
  return /^purok\b/i.test(purok) ? purok : `Purok ${purok}`;
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
    if (normalized.includes("applicant_photo") && normalized.includes("mimes")) {
      return "Applicant photos must be JPG or PNG images up to 5 MB.";
    }
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

function getValidationField(message, document) {
  const match = String(message || "").match(/\b(form_fields|requirements)\.([a-zA-Z0-9_]+)\b/);
  if (!match) return null;

  const [, section, key] = match;
  const field = section === "requirements"
    ? document?.requirements?.find((item) => item.key === key)
    : document?.fields?.find((item) => item.key === key) ||
      document?.applicantFieldConfigs?.find((item) => item.key === key);

  return field ? { key, label: field.label || key, section } : null;
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
    applicantFields: ["first_name", "last_name", "middle_name", "address", "place_of_birth", "date_of_birth"],
    applicantFieldConfigs: [
      { key: "first_name", label: "First Name", type: "text", required: true },
      { key: "last_name", label: "Last Name", type: "text", required: true },
      { key: "middle_name", label: "Middle Name", type: "text", required: true },
      { key: "address", label: "Address", type: "text", required: true },
      { key: "place_of_birth", label: "Place of Birth", type: "text", required: true },
      { key: "date_of_birth", label: "Date of Birth", type: "date", required: true },
    ],
    fields: [
      {
        key: "purpose",
        label: "Purpose",
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
      { key: "valid_id", label: "Valid ID", required: true },
      { key: "purok_certificate", label: "Purok Certification", required: true },
      { key: "applicant_photo", label: "Applicant Photo (JPG or PNG, up to 5 MB)", required: false },
    ],
  },
  {
    label: "Certificate of Residency",
    value: "Barangay Residency",
    fee: 130,
    applicantFields: [
      "full_name",
      "address",
      "purok",
      "date_of_birth",
      "sex",
    ],
    fields: [
      {
        key: "years_of_residency",
        label: "Length of residency (years)",
        type: "number",
        min: "0",
        step: "1",
      },
      {
        key: "months_of_residency",
        label: "Additional months of residency",
        type: "number",
        required: false,
        min: "0",
        max: "11",
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
    applicantFields: [
      "full_name",
      "address",
      "date_of_birth",
      "sex",
      "purok",
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
    label: "Business Clearance",
    value: "Business Permit",
    notice: "For new applications, attach a Purok Certification, Cedula, applicant ID, DTI/SEC registration, and a picture of the business. For renewals, attach the previous Business Clearance and Purok Certification. If rented, attach the contract of lease.",
    applicantFields: ["full_name", "last_name", "first_name", "middle_name", "address", "contact_number"],
    applicantFieldConfigs: [
      { key: "full_name", label: "Name of taxpayer", type: "text", required: false, residentVisible: false },
      { key: "last_name", label: "Last name", type: "text", required: true },
      { key: "first_name", label: "First name", type: "text", required: true },
      { key: "middle_name", label: "Middle name", type: "text", required: true },
      { key: "address", label: "Complete owner address", type: "text", required: true },
      { key: "contact_number", label: "Contact number", type: "tel", required: true },
    ],
    fields: [
      { key: "application_type", label: "Application", type: "select", options: ["New", "Renewal"], required: true },
      { key: "amendment_type", label: "Amendments (optional)", type: "select", options: ["None", "From Single to Partnership", "From Single to Corporation", "From Partnership to Single", "From Partnership to Corporation", "From Corporation to Single", "From Corporation to Partnership"], required: false },
      { key: "transfer_type", label: "Transfer", type: "select", options: ["None", "Location", "Ownership"], required: false },
      { key: "transfer_location_to", label: "Transfer location to", type: "text", required: false, showWhen: { key: "transfer_type", value: "Location" }, requiredWhen: { key: "transfer_type", value: "Location" } },
      { key: "transfer_owner_to", label: "Transfer ownership to (person / entity)", type: "text", required: false, showWhen: { key: "transfer_type", value: "Ownership" }, requiredWhen: { key: "transfer_type", value: "Ownership" } },
      { key: "business_ownership", label: "Type of business", type: "select", options: ["Sole Proprietorship", "Partnership", "Corporation", "Cooperative"], required: true },
      { key: "business_name", label: "Business name", type: "text", required: true },
      { key: "tradename_franchise_name", label: "Tradename / franchise name", type: "text", required: false },
      { key: "business_address", label: "Complete business address", type: "text", required: true },
      { key: "business_area_sqm", label: "Business area (sq. m.)", type: "number", min: 0, step: "0.01", required: true },
      { key: "place_of_business", label: "Place of business", type: "select", options: ["Owned", "Rented"], required: true },
      { key: "monthly_rental", label: "Monthly rental (PHP)", type: "number", min: 0, step: "0.01", required: false, showWhen: { key: "place_of_business", value: "Rented" }, requiredWhen: { key: "place_of_business", value: "Rented" } },
      { key: "lessor_name", label: "Lessor's name", type: "text", required: false, showWhen: { key: "place_of_business", value: "Rented" }, requiredWhen: { key: "place_of_business", value: "Rented" } },
      { key: "lessor_address", label: "Lessor's address", type: "text", required: false, showWhen: { key: "place_of_business", value: "Rented" }, requiredWhen: { key: "place_of_business", value: "Rented" } },
      { key: "business_attestation_accepted", label: "Attestation acceptance", type: "text", required: false, residentVisible: false },
    ],
    requirements: [
      { key: "purok_certification", label: "Purok Certification", required: false, showWhen: { key: "application_type", value: ["New", "Renewal"] }, requiredWhen: { key: "application_type", value: ["New", "Renewal"] } },
      { key: "cedula_copy", label: "Cedula (Community Tax Certificate)", required: false, showWhen: { key: "application_type", value: "New" }, requiredWhen: { key: "application_type", value: "New" } },
      { key: "applicant_id", label: "Applicant's ID", required: false, showWhen: { key: "application_type", value: "New" }, requiredWhen: { key: "application_type", value: "New" } },
      { key: "dti_sec_registration", label: "DTI / SEC registration", required: false, showWhen: { key: "application_type", value: "New" }, requiredWhen: { key: "application_type", value: "New" } },
      { key: "business_picture", label: "Picture of the business", required: false, showWhen: { key: "application_type", value: "New" }, requiredWhen: { key: "application_type", value: "New" } },
      { key: "previous_business_clearance", label: "Previous Business Clearance", required: false, showWhen: { key: "application_type", value: "Renewal" }, requiredWhen: { key: "application_type", value: "Renewal" } },
      { key: "lease_contract", label: "Contract of lease", required: false, showWhen: { key: "place_of_business", value: "Rented" }, requiredWhen: { key: "place_of_business", value: "Rented" } },
    ],
  },
  {
    label: "Certificate of Good Moral Character",
    value: "Certificate of Good Moral Character",
    fee: 0,
    applicantFields: ["full_name", "address", "purok", "date_of_birth", "sex"],
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
];

function conditionMatches(condition, values) {
  if (!condition) return false;
  const expected = condition.value;
  return Array.isArray(expected)
    ? expected.includes(values[condition.key])
    : values[condition.key] === expected;
}

function mapConfiguredDocumentType(type) {
  const applicantFieldConfigs = (type.applicant_fields || type.applicantFieldConfigs || []).filter(
    (field) => field.enabled !== false,
  );
  const configuredFields = (type.fields || []).filter(
    (field) => field.enabled !== false,
  );
  if (["Construction Permit", "Fencing Permit"].includes(type.value)) {
    const isFencingPermit = type.value === "Fencing Permit";
    const applicantConfigByKey = new Map(
      applicantFieldConfigs.map((field) => [field.key, field]),
    );
    const applicantDefinitions = [
      { key: "full_name", label: "Name", type: "text", required: true },
      { key: "address", label: "Address", type: "text", required: true },
      { key: "contact_number", label: "Contact number", type: "tel", required: true },
      { key: "email_address", label: "Email address", type: "email", required: false },
    ].map((field) => ({
      ...applicantConfigByKey.get(field.key),
      ...field,
      readOnly: false,
      group: "1. Applicant information",
    }));
    const fieldConfigByKey = new Map(
      configuredFields.map((field) => [field.key, field]),
    );
    const projectFields = [
      { key: "project_owner_name", label: "Project owner", type: "text", required: true },
      { key: "project_address", label: "Project address/location", type: "text", required: true },
      {
        key: "construction_type",
        label: "Type of construction",
        type: "select",
        required: true,
        options: isFencingPermit ? ["Fencing"] : ["New Construction", "Renovation/Repair", "Extension/Addition", "Demolition", "Fencing", "Other"],
      },
      ...(!isFencingPermit ? [{
        key: "type_of_structure",
        label: "Type of structure/building",
        type: "text",
        required: true,
      }] : []),
      {
        key: "construction_type_other",
        label: "Specify other construction type",
        type: "text",
        required: false,
        showWhen: { key: "construction_type", value: "Other" },
        requiredWhen: { key: "construction_type", value: "Other" },
      },
      ...(!isFencingPermit ? [{
        key: "proposed_floor_area",
        label: "Proposed floor area (m², if applicable)",
        type: "number",
        required: false,
        min: 0,
        step: "0.01",
      }] : [
        { key: "fence_material", label: "Fence material", type: "text", required: true },
        { key: "fence_height", label: "Fence height (meters)", type: "number", required: true, min: 0, step: "0.01" },
        { key: "fence_length", label: "Fence length (meters)", type: "number", required: true, min: 0, step: "0.01" },
      ]),
    ].map((field) => ({
      ...fieldConfigByKey.get(field.key),
      ...field,
      group: isFencingPermit && field.key.startsWith("fence_") ? "3. Fence details" : "2. Project information",
    }));
    const certificationField = fieldConfigByKey.get("applicant_certification_accepted");
    return {
      ...type,
      ...(isFencingPermit ? {
        requirements: [
          { key: "purok_certificate", label: "Purok Certification", required: true },
        ],
      } : {}),
      description: isFencingPermit
        ? "File this form so the barangay can inspect the proposed fence before preparing the Fencing Permit."
        : "File this form so the barangay can review and inspect the proposed construction project.",
      applicantFieldConfigs: applicantDefinitions,
      applicantFields: applicantDefinitions.map((field) => field.key),
      fields: [
        ...projectFields,
        ...(certificationField ? [{ ...certificationField, residentVisible: false }] : []),
      ],
    };
  }
  if (type.value === "Business Permit") {
    const applicantOrder = [
      "full_name",
      "last_name",
      "first_name",
      "middle_name",
      "address",
      "contact_number",
    ];
    const orderedApplicantFields = applicantOrder
      .map((key) => applicantFieldConfigs.find((field) => field.key === key))
      .filter(Boolean)
      .map((field) => ({
        ...field,
        group: "2. Type, taxpayer, and business information",
        residentVisible: field.key !== "full_name",
        required: field.key === "full_name" ? false : ["last_name", "first_name", "middle_name", "address", "contact_number"].includes(field.key) || field.required,
      }));
    const omittedBusinessKeys = new Set([
      "tax_year",
      "nature_of_business",
      "business_purok",
      "amendment_owner_from",
      "amendment_owner_to",
      "transfer_location_from",
      "transfer_owner_from",
      "taxpayer_signature_name",
      "taxpayer_position",
    ]);
    const orderedBusinessFields = configuredFields
      .filter((field) => !omittedBusinessKeys.has(field.key))
      .map((field) => ({
        ...field,
        group: ["application_type", "amendment_type", "transfer_type", "transfer_location_to", "transfer_owner_to"].includes(field.key)
          ? "1. Application details"
          : "2. Type, taxpayer, and business information",
        ...(field.key === "amendment_type"
          ? {
              required: false,
              options: ["None", "From Single to Partnership", "From Single to Corporation", "From Partnership to Single", "From Partnership to Corporation", "From Corporation to Single", "From Corporation to Partnership"],
            }
          : {}),
        ...(field.key === "transfer_type" ? { required: false, options: ["None", "Location", "Ownership"] } : {}),
      }));
    const businessTypeField = orderedBusinessFields.find(
      (field) => field.key === "business_ownership",
    );
    return {
      ...type,
      applicantFieldConfigs: [],
      applicantFields: [],
      fields: [
        ...orderedBusinessFields.filter((field) => field.group.startsWith("1.")),
        ...(businessTypeField ? [businessTypeField] : []),
        ...orderedApplicantFields,
        ...orderedBusinessFields.filter(
          (field) => field.group.startsWith("2.") && field.key !== "business_ownership",
        ),
      ],
      requirements: (type.requirements || []).filter(
        (requirement) =>
          requirement.enabled !== false &&
          !["authorization_letter", "authorized_person_id", "business_owner_id"].includes(requirement.key),
      ),
    };
  }
  if (
    type.value === "Barangay Certification" ||
    type.label === "Barangay Clearance"
  ) {
    const clearanceApplicantFields = applicantFieldConfigs
      .filter((field) => field.key !== "purok")
      .map((field) =>
        field.key === "address"
          ? {
              ...field,
              label: "Address",
              required: true,
              residentVisible: true,
            }
          : field,
      );
    if (!clearanceApplicantFields.some((field) => field.key === "address")) {
      clearanceApplicantFields.push({
        key: "address",
        label: "Address",
        type: "text",
        required: true,
      });
    }
    return {
      ...type,
      applicantFieldConfigs: clearanceApplicantFields,
      applicantFields: clearanceApplicantFields.map((field) => field.key),
      fields: configuredFields,
    };
  }
  return {
    ...type,
    applicantFieldConfigs,
    applicantFields: applicantFieldConfigs.map((field) => field.key),
    fields: configuredFields,
    requirements: (type.requirements || []).filter(
      (requirement) => requirement.enabled !== false,
    ),
  };
}

function ApplicantCamera({ stream, onCapture, onCancel }) {
  const videoRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [captureError, setCaptureError] = useState("");

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video?.videoWidth || !video.videoHeight) {
      setCaptureError("The camera is not ready yet. Please wait and try again.");
      return;
    }

    const scale = Math.min(1, 1280 / Math.max(video.videoWidth, video.videoHeight));
    const canvas = window.document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const context = canvas.getContext("2d");
    if (!context) {
      setCaptureError("We couldn’t prepare the photo. Please try again or upload an image.");
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) {
        setCaptureError("We couldn’t capture the photo. Please try again or upload an image.");
        return;
      }
      if (blob.size > 5 * 1024 * 1024) {
        setCaptureError("The captured photo is larger than 5 MB. Please try again or upload a smaller image.");
        return;
      }

      const filename = `applicant-photo-${new Date().toISOString().replace(/[:.]/g, "-")}.jpg`;
      onCapture(new File([blob], filename, { type: "image/jpeg" }));
    }, "image/jpeg", 0.85);
  };

  return (
    <div className="mt-3 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        onLoadedMetadata={() => setReady(true)}
        aria-label="Live applicant photo camera preview"
        className="max-h-80 w-full rounded-lg bg-black object-contain"
      />
      {captureError && (
        <p role="alert" className="text-sm text-red-700">
          {captureError}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={capturePhoto}
          disabled={!ready}
          className={`${primaryButtonClass} disabled:cursor-not-allowed disabled:opacity-50`}
        >
          Capture photo
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
          Close camera
        </button>
      </div>
    </div>
  );
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
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [applicantPhotoPreview, setApplicantPhotoPreview] = useState("");
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState("info");
  const [submitting, setSubmitting] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [businessAttestationOpen, setBusinessAttestationOpen] = useState(false);
  const [businessAttestationAccepted, setBusinessAttestationAccepted] = useState(false);
  const [permitCertificationOpen, setPermitCertificationOpen] = useState(false);
  const [permitCertificationAccepted, setPermitCertificationAccepted] = useState(false);
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
  const photoPreviewUrlRef = useRef(null);
  const cameraRequestRef = useRef(0);

  useEffect(() => () => {
    cameraStream?.getTracks().forEach((track) => track.stop());
  }, [cameraStream]);

  useEffect(() => () => {
    if (photoPreviewUrlRef.current) URL.revokeObjectURL(photoPreviewUrlRef.current);
  }, []);

  const setRequirementFile = (key, file) => {
    if (key === "applicant_photo") {
      if (photoPreviewUrlRef.current) {
        URL.revokeObjectURL(photoPreviewUrlRef.current);
      }
      photoPreviewUrlRef.current = file ? URL.createObjectURL(file) : null;
      setApplicantPhotoPreview(photoPreviewUrlRef.current || "");
    }
    setRequirementFiles((current) => ({ ...current, [key]: file }));
  };

  const clearRequirementFiles = () => {
    if (photoPreviewUrlRef.current) {
      URL.revokeObjectURL(photoPreviewUrlRef.current);
      photoPreviewUrlRef.current = null;
    }
    setApplicantPhotoPreview("");
    setRequirementFiles({});
  };

  const closeApplicantCamera = () => {
    cameraRequestRef.current += 1;
    setCameraLoading(false);
    setCameraStream(null);
  };

  const openApplicantCamera = async () => {
    setCameraError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera access isn’t available here. It usually requires HTTPS and browser permission. You can still upload a JPG or PNG photo.");
      return;
    }

    const requestId = cameraRequestRef.current + 1;
    cameraRequestRef.current = requestId;
    setCameraLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: "user" },
      });
      if (cameraRequestRef.current !== requestId) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      setCameraStream(stream);
    } catch (error) {
      if (cameraRequestRef.current !== requestId) return;
      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        setCameraError("Camera permission was denied. Allow camera access in your browser settings, or upload a JPG or PNG photo.");
      } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
        setCameraError("No camera was found. You can upload a JPG or PNG photo instead.");
      } else {
        setCameraError("We couldn’t open the camera. Check your camera connection and browser permissions, or upload a JPG or PNG photo.");
      }
    } finally {
      if (cameraRequestRef.current === requestId) setCameraLoading(false);
    }
  };

  useEffect(() => {
    if (!documentType && !editingRequest) {
      setFormFields(getApplicantDefaults(user));
    }
  }, [documentType, editingRequest, user]);

  useEffect(() => {
    let active = true;
    residentApi("/resident/document-types", token)
      .then((result) => {
        if (active) setCatalogTypes(result.data || []);
      })
      .catch((error) => {
        if (active) {
          setCatalogTypes([]);
          setMessage("We couldn't load document types. Refresh the page and try again.");
          setMessageTone("error");
        }
      });
    return () => {
      active = false;
    };
  }, [token]);

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
    if (catalogTypes === null) return DOCUMENT_TYPES.map(mapConfiguredDocumentType);
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
    closeApplicantCamera();
    setCameraError("");
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

    setBusinessAttestationAccepted(false);
    setBusinessAttestationOpen(false);
    setPermitCertificationAccepted(false);
    setPermitCertificationOpen(false);
    setEditingRequest(request);
    setDocumentType(request.document_type);
    const applicantDefaults = getApplicantDefaults(user);
    setFormFields({
      ...applicantDefaults,
      ...existingFields,
      ...(request.document_type === "Business Permit"
        ? {
            address:
              existingFields.address ||
              getClearanceAddress(applicantDefaults.purok) ||
              applicantDefaults.address,
          }
        : {}),
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
    clearRequirementFiles();
    setMessage("");
    setMessageTone("info");
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const cancelCorrection = () => {
    closeApplicantCamera();
    setCameraError("");
    setEditingRequest(null);
    setDocumentType("");
    setBusinessAttestationAccepted(false);
    setBusinessAttestationOpen(false);
    setPermitCertificationAccepted(false);
    setPermitCertificationOpen(false);
    closeApplicantCamera();
    setCameraError("");
    setFormFields(getApplicantDefaults(user));
    setNotes("");
    clearRequirementFiles();
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
    if (selectedDocument.value === "Business Permit" && !businessAttestationAccepted) {
      setBusinessAttestationOpen(true);
      setMessage("Review and accept the Business Clearance attestation before submitting.");
      setMessageTone("error");
      return;
    }
    const hasPermitCertification = ["Construction Permit", "Fencing Permit"].includes(selectedDocument.value);
    if (hasPermitCertification && !permitCertificationAccepted) {
      setPermitCertificationOpen(true);
      setMessage("Review and accept the applicant certification before submitting.");
      setMessageTone("error");
      return;
    }
    if (!formFields.date_of_birth && selectedDocument.applicantFields.includes("date_of_birth")) {
      setMessage("Your date of birth is missing. Add it to your profile before requesting this document.");
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
            field.key !== "applicant_certification_accepted" &&
            field.submit !== false &&
            (!field.showWhen || conditionMatches(field.showWhen, formFields)),
        ),
      ];
      const submittedFields = {};
      requestFieldDefinitions.forEach(({ key }) => {
        const value =
          key === "full_name" && documentType === "Business Permit"
            ? [formFields.first_name, formFields.middle_name, formFields.last_name]
                .filter(Boolean)
                .join(" ")
            :
          key === "purpose" &&
          formFields.purpose === "Other" &&
          selectedDocument.fields.some((field) => field.key === "purpose_other")
            ? formFields.purpose_other
            : formFields[key];
        if (value !== undefined && value !== "") {
          submittedFields[key] = String(value).trim();
        }
      });
      if (selectedDocument.value === "Construction Permit") {
        submittedFields.applicant_certification_accepted = "Yes";
      }
      Object.entries(submittedFields).forEach(([key, value]) => {
        formData.append(`form_fields[${key}]`, value);
      });
      const visibleRequirementKeys = new Set(visibleRequirements.map((requirement) => requirement.key));
      Object.entries(requirementFiles).forEach(([key, file]) => {
        if (file && visibleRequirementKeys.has(key)) {
          formData.append(`requirements[${key}]`, file);
        }
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
                unavailable_reason: "This one-time certificate has already been requested or issued.",
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
      setPermitCertificationAccepted(false);
      setPermitCertificationOpen(false);
      setBusinessAttestationAccepted(false);
      setBusinessAttestationOpen(false);
      setFormFields(getApplicantDefaults(user));
      setNotes("");
      clearRequirementFiles();
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
      const validationField = getValidationField(error.message, selectedDocument);
      if (validationField) {
        setMessage(
          validationField.section === "requirements"
            ? `Please upload ${validationField.label}.`
            : `Please complete ${validationField.label}.`,
        );
        requestAnimationFrame(() => {
          const control = validationField.section === "requirements"
            ? window.document.getElementById(`requirement-${validationField.key}`)
            : window.document.querySelector(
                `[data-validation-field="${validationField.key}"]`,
              );
          control?.scrollIntoView({ behavior: "smooth", block: "center" });
          control?.focus({ preventScroll: true });
        });
      } else {
        setMessage(getFriendlyRequestError(error, selectedDocument));
      }
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
                  const nextDocumentType = event.target.value;
                  setDocumentType(nextDocumentType);
                  setPermitCertificationAccepted(false);
                  setPermitCertificationOpen(false);
                  setBusinessAttestationAccepted(false);
                  setBusinessAttestationOpen(false);
                  const applicantDefaults = getApplicantDefaults(user);
                  const isBusinessPermit = nextDocumentType === "Business Permit";
                  setFormFields({
                    ...applicantDefaults,
                    project_owner_name: applicantDefaults.full_name,
                    project_address: applicantDefaults.address,
                    construction_type: nextDocumentType === "Fencing Permit" ? "Fencing" : "",
                    ...(isBusinessPermit
                      ? {
                          address: getClearanceAddress(applicantDefaults.purok) || applicantDefaults.address,
                          amendment_type: "None",
                          transfer_type: "None",
                          business_ownership: "",
                          business_name: "",
                          tradename_franchise_name: "",
                          business_address: "",
                          business_area_sqm: "",
                          place_of_business: "",
                          monthly_rental: "",
                          lessor_name: "",
                          lessor_address: "",
                        }
                      : {}),
                  });
                  clearRequirementFiles();
                  closeApplicantCamera();
                  setCameraError("");
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
                    {document.one_time && document.available === false ? " (Already requested)" : ""}
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

              {selectedDocument.value !== "Business Permit" && <div className="mt-6 border-t border-slate-100 pt-5">
                <h3 className="text-sm font-bold text-[#172B4D]">
                  {["Construction Permit", "Fencing Permit"].includes(selectedDocument.value)
                    ? "1. Applicant information"
                    : "Applicant information"}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  {["Construction Permit", "Fencing Permit"].includes(selectedDocument.value)
                    ? "Your profile information is filled in when available. Review and complete the required applicant details."
                    : "Your profile details are filled in automatically. Complete any missing details in your profile."}
                </p>
                {selectedDocument.fee_mode === "assessed" ? (
                  <p className="mt-3 rounded-xl bg-[#EEF4FF] px-4 py-3 text-sm font-semibold text-[#2455D6]">
                    { ["Construction Permit", "Fencing Permit"].includes(selectedDocument.value)
                      ? "The inspector will determine the fee for this permit. We will notify you when the document is ready for release."
                      : "The barangay will assess the fee and notify you when your Business Clearance is ready for release."}
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
                      return config?.residentVisible !== false && (!config?.showWhen || conditionMatches(config.showWhen, formFields));
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
                          {field.required && <span className="ml-1 text-red-600" aria-hidden="true">*</span>}
                        </span>
                        {field.type === "select" ? (
                          <select
                            data-validation-field={key}
                            required={field.requiredWhen
                              ? conditionMatches(field.requiredWhen, formFields)
                              : field.required !== false}
                            value={formFields[key] ?? ""}
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
                            data-validation-field={key}
                            required={field.readOnly && formFields[key] ? false : (field.requiredWhen
                              ? conditionMatches(field.requiredWhen, formFields)
                              : field.required !== false)}
                            type={field.type}
                            value={formFields[key] || ""}
                            readOnly={field.readOnly && Boolean(formFields[key])}
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
              </div>}

              <div className="mt-6 border-t border-slate-100 pt-5">
                <h3 className="text-sm font-bold text-[#172B4D]">
                  {selectedDocument.value === "Business Permit"
                    ? "Business Clearance application"
                    : ["Construction Permit", "Fencing Permit"].includes(selectedDocument.value)
                      ? `${selectedDocument.label} application`
                      : "Request details"}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  {selectedDocument.value === "Business Permit"
                    ? "Complete the two groups below. Profile details are prefilled and can be edited."
                    : ["Construction Permit", "Fencing Permit"].includes(selectedDocument.value)
                      ? `Complete the project information so the barangay can inspect the proposed ${selectedDocument.value === "Fencing Permit" ? "fence" : "construction project"}.`
                      : "Provide the information needed for this document."}
                </p>
                {selectedDocument.fee_mode === "assessed" && (
                  <p className="mt-3 rounded-xl bg-[#EEF4FF] px-4 py-3 text-sm font-semibold text-[#2455D6]">
                    { ["Construction Permit", "Fencing Permit"].includes(selectedDocument.value)
                      ? "The inspector will determine the fee for this permit. We will notify you when the document is ready for release."
                      : "The barangay will assess the fee and notify you when your Business Clearance is ready for release."}
                  </p>
                )}
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {Object.entries(selectedDocument.fields
                    .filter((field) => field.residentVisible !== false && (!field.showWhen || conditionMatches(field.showWhen, formFields)))
                    .reduce((groups, field) => {
                      const group = field.group || "";
                      (groups[group] ||= []).push(field);
                      return groups;
                    }, {}))
                    .map(([group, fields]) => <Fragment key={group || "ungrouped"}>
                    {group && <h4 className="-mb-2 border-b border-slate-100 pb-2 text-xs font-bold uppercase tracking-wide text-[#55708F] sm:col-span-2">{group}</h4>}
                    {fields.map((field) => {
                        const required = field.requiredWhen
                          ? conditionMatches(field.requiredWhen, formFields)
                          : field.required !== false;
                      const controlProps = {
                        "data-validation-field": field.key,
                        required: field.readOnly && formFields[field.key] ? false : required,
                        value: formFields[field.key] ?? "",
                        onChange: (event) => setFormFields((current) => {
                          const updated = { ...current, [field.key]: event.target.value };
                          if (["first_name", "middle_name", "last_name"].includes(field.key)) {
                            updated.full_name = [updated.first_name, updated.middle_name, updated.last_name]
                              .filter(Boolean)
                              .join(" ");
                          }
                          return updated;
                        }),
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
                            <select {...controlProps} disabled={field.readOnly && Boolean(formFields[field.key])}>
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
                              readOnly={field.readOnly && Boolean(formFields[field.key])}
                              {...controlProps}
                              className={`${inputClass} ${field.readOnly && formFields[field.key] ? "bg-slate-100 text-slate-500" : ""}`}
                            />
                          )}
                        </label>
                      );
                    })}
                    </Fragment>)}
                </div>
                {selectedDocument.value === "Business Permit" && <section className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
                  <h4 className="mb-3 border-b border-slate-200 pb-2 text-xs font-bold uppercase tracking-wide text-[#55708F]">3. Attestation and undertaking</h4>
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <label className="flex items-start gap-3 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={businessAttestationAccepted}
                        onChange={(event) => setBusinessAttestationAccepted(event.target.checked)}
                        className="mt-1 h-4 w-4 accent-[#2455D6]"
                      />
                      <span>I have read and agree to the attestation and undertaking.</span>
                    </label>
                    <button type="button" onClick={() => setBusinessAttestationOpen(true)} className="min-h-9 rounded-lg border border-[#2455D6]/25 bg-white px-3 text-xs font-bold text-[#2455D6] hover:bg-blue-50">View attestation</button>
                  </div>
                </section>}
                {["Construction Permit", "Fencing Permit"].includes(selectedDocument.value) && <section className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
                  <h4 className="mb-3 border-b border-slate-200 pb-2 text-xs font-bold uppercase tracking-wide text-[#55708F]">{selectedDocument.value === "Fencing Permit" ? "4." : "3."} Applicant certification</h4>
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <p className="text-sm text-slate-700">
                      {permitCertificationAccepted
                        ? "You accepted the applicant’s certification."
                        : "Review and accept the applicant’s certification before submitting."}
                    </p>
                    <button type="button" onClick={() => setPermitCertificationOpen(true)} className="min-h-9 rounded-lg border border-[#2455D6]/25 bg-white px-3 text-xs font-bold text-[#2455D6] hover:bg-blue-50">
                      {permitCertificationAccepted ? "Review certification" : "View and accept certification"}
                    </button>
                  </div>
                </section>}
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
                      barangay staff. Applicant photos must be JPG or PNG.
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

                    const inputId = `requirement-${requirement.key}`;
                    const isApplicantPhoto = requirement.key === "applicant_photo";

                    return (
                      <div key={requirement.key} className="block">
                        <label htmlFor={inputId} className="text-sm font-bold text-slate-700">
                          {label}
                          {!required && (
                            <span className="ml-1 font-normal text-slate-400">
                              (optional)
                            </span>
                          )}
                        </label>
                        <input
                          id={inputId}
                          data-validation-field={requirement.key}
                          required={
                            required &&
                            !hasExistingFile &&
                            !requirementFiles[requirement.key]
                          }
                          type="file"
                          accept={isApplicantPhoto
                            ? ".jpg,.jpeg,.png,image/jpeg,image/png"
                            : ".pdf,.jpg,.jpeg,.png"}
                          capture={isApplicantPhoto ? "user" : undefined}
                          onChange={(event) => {
                            if (isApplicantPhoto) {
                              closeApplicantCamera();
                              setCameraError("");
                            }
                            setRequirementFile(
                              requirement.key,
                              event.target.files?.[0] || null,
                            );
                          }}
                          className={`${inputClass} file:mr-3 file:rounded-lg file:border-0 file:bg-[#2455D6]/10 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-[#2455D6]`}
                        />
                        {isApplicantPhoto && (
                          <>
                            <button
                              type="button"
                              onClick={openApplicantCamera}
                              disabled={Boolean(cameraStream) || cameraLoading}
                              className="mt-2 inline-flex items-center gap-2 rounded-lg border border-[#2455D6]/30 px-3 py-2 text-sm font-semibold text-[#2455D6] hover:bg-[#2455D6]/5 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Camera className="h-4 w-4" aria-hidden="true" />
                              {cameraLoading
                                ? "Opening camera…"
                                : cameraStream
                                  ? "Camera is open"
                                  : "Take a new photo"}
                            </button>
                            {cameraError && (
                              <p role="alert" className="mt-2 text-sm text-red-700">
                                {cameraError}
                              </p>
                            )}
                            {cameraStream && (
                              <ApplicantCamera
                                stream={cameraStream}
                                onCapture={(file) => {
                                  setRequirementFile("applicant_photo", file);
                                  closeApplicantCamera();
                                  setCameraError("");
                                }}
                                onCancel={closeApplicantCamera}
                              />
                            )}
                            {applicantPhotoPreview && requirementFiles.applicant_photo && (
                              <div className="mt-3 flex items-center gap-3">
                                <img
                                  src={applicantPhotoPreview}
                                  alt="Applicant photo selected for upload"
                                  className="h-20 w-20 rounded-lg border border-slate-200 object-cover"
                                />
                                <span className="text-sm text-slate-600">
                                  {requirementFiles.applicant_photo.name}
                                </span>
                              </div>
                            )}
                          </>
                        )}
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
                      </div>
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
      {permitCertificationOpen && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPermitCertificationOpen(false); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="permit-certification-title" className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#2455D6]">Applicant certification</p>
              <h2 id="permit-certification-title" className="mt-1 text-lg font-bold text-[#172B4D]">Certification and undertaking</h2>
            </div>
            <button type="button" onClick={() => setPermitCertificationOpen(false)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Close</button>
          </div>
          <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm leading-7 text-slate-700">I hereby certify that all information provided in this application is true and correct. I further agree to comply with all applicable laws, ordinances, and regulations governing {selectedDocument?.value === "Fencing Permit" ? "fence construction and related activities" : "construction activities"} within the barangay.</p>
          <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm leading-6 text-slate-700">
            <input type="checkbox" checked={permitCertificationAccepted} onChange={(event) => setPermitCertificationAccepted(event.target.checked)} className="mt-1 h-4 w-4 accent-[#2455D6]" />
            <span>I have read and agree to this certification.</span>
          </label>
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={() => setPermitCertificationOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="button" disabled={!permitCertificationAccepted} onClick={() => { setPermitCertificationOpen(false); setMessage(""); setMessageTone("info"); }} className="rounded-lg bg-[#2455D6] px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">Agree and continue</button>
          </div>
        </section>
      </div>}
      {businessAttestationOpen && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setBusinessAttestationOpen(false); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="business-attestation-title" className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#2455D6]">Required review</p>
              <h2 id="business-attestation-title" className="mt-1 text-lg font-bold text-[#172B4D]">Online Attestation and Undertaking</h2>
            </div>
            <button type="button" onClick={() => setBusinessAttestationOpen(false)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Close</button>
          </div>
          <div className="mt-5 space-y-4 text-sm leading-6 text-slate-700">
            <p>I agree to comply with the barangay's regulatory requirements and to address any deficiencies communicated to me within 30 days of receiving notice.</p>
            <p>I understand that providing false or misleading information may result in the denial or revocation of the business clearance and other action allowed by applicable law.</p>
            <p>By checking the agreement box and submitting this online application, I confirm that I have read and understood the information provided, that the information I entered is true and accurate to the best of my knowledge, and that I will comply with applicable laws, ordinances, policies, rules, and regulations.</p>
          </div>
          <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
            <input type="checkbox" checked={businessAttestationAccepted} onChange={(event) => setBusinessAttestationAccepted(event.target.checked)} className="mt-1 h-4 w-4 accent-[#2455D6]" />
            <span>I have read and agree to this online attestation and undertaking.</span>
          </label>
          <div className="mt-5 flex justify-end">
            <button type="button" disabled={!businessAttestationAccepted} onClick={() => { setBusinessAttestationOpen(false); setMessage(""); setMessageTone("info"); }} className="rounded-lg bg-[#2455D6] px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">Agree and continue</button>
          </div>
        </section>
      </div>}
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
