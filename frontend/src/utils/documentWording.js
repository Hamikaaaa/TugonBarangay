export const BUSINESS_CLEARANCE_WORDING = `( {{new_application_mark}} ) - NEW\n( {{renewal_application_mark}} ) - RENEWAL\nSERIES OF {{issued_year}}\nDATE ISSUED: {{date_issued}}\n\nBARANGAY BUSINESS CLEARANCE\n\n{{business_name}}\nBUSINESS NAME\n\n{{full_name}}\nBUSINESS OWNER\n\n{{business_address}}\nADDRESS OF BUSINESS\n\nThis clearance is not valid unless the Official Receipt of the Business Tax and the Community Tax Certificate are issued.\n\nVALID ONLY UNTIL {{valid_until}}.\n\nHon. Fe Q. Cuyos\nPunong Barangay`;

export const CONSTRUCTION_PERMIT_WORDING = `**TO WHOM IT MAY CONCERN:**

This is to certify that **{{full_name}}**, a resident of **{{address}}**, has requested a Barangay Clearance for the proposed construction of **{{type_of_structure}}** located at **{{construction_site_address}}**, within the territorial jurisdiction of Barangay **{{barangay_name}}**.

Based on the records of this Barangay and the information submitted by the applicant, the Barangay has no objection to the proposed construction activity, subject to compliance with applicable barangay ordinances and the necessary permits and clearances from the Municipal or City Government and other concerned authorities.

This clearance is issued upon the request of the applicant for **construction purposes** and does not constitute a Building Permit or authorize construction without the required approvals from the appropriate government agencies.

Issued this {{issued_day}} of {{issued_month}}, {{issued_year}}, at Barangay {{barangay_name}}, {{municipality}}, Cebu, Philippines.`;

export const FENCING_PERMIT_WORDING = `**TO WHOM IT MAY CONCERN:**

This is to certify that **{{full_name}}**, a resident of **{{address}}**, has requested a Barangay Clearance for the proposed construction or installation of a fence around the property located at **{{property_address}}**, within the territorial jurisdiction of Barangay **{{barangay_name}}**.

Based on the information submitted by the applicant and the records of this Barangay, the Barangay has no objection to the proposed fencing activity, subject to compliance with applicable barangay ordinances, property boundaries, and the necessary permits and clearances from the Municipal or City Government and other concerned authorities.

This clearance is issued upon the request of the applicant for **fencing purposes** and does not constitute a Fencing Permit or authorize construction without the required approvals from the appropriate government agencies.

Issued this {{issued_day}} of {{issued_month}}, {{issued_year}}, at Barangay {{barangay_name}}, {{municipality}}, Cebu, Philippines.`;

const LEGACY_BUSINESS_CLEARANCE_WORDING = `This clearance is not valid unless the Official Receipt of the Business Tax and the Community Tax Certificate are issued.\n\nVALID ONLY UNTIL December 31, {{issued_year}}.`;

export function isLegacyBusinessClearanceWording(value) {
  const normalize = (text) => String(text || "").replace(/\s+/g, " ").trim().toLowerCase();
  return normalize(value) === normalize(LEGACY_BUSINESS_CLEARANCE_WORDING);
}
