<?php

namespace Database\Seeders;

use App\Models\ChatbotFaq;
use Illuminate\Database\Seeder;

class ChatbotFaqSeeder extends Seeder
{
    private const STOP_WORDS = [
        'a',
        'an',
        'and',
        'are',
        'can',
        'do',
        'does',
        'for',
        'how',
        'i',
        'if',
        'in',
        'is',
        'it',
        'my',
        'of',
        'on',
        'or',
        'the',
        'to',
        'what',
        'when',
        'where',
        'who',
        'why',
        'will',
        'with',
    ];

    private const FAQS = [
        ['General Information', 'What can BantayBot do?', 'BantayBot answers common questions about TugonBarangay, resident accounts, document requests, complaints, and barangay services. For a question it cannot answer, use Escalate to staff to record it for follow-up.'],
        ['General Information', 'What services are available in TugonBarangay?', 'Residents can register and manage their profile, request barangay documents, track document requests, submit complaints with supporting evidence, view notifications, and ask BantayBot for information. Availability can depend on account verification.'],
        ['General Information', 'What is TugonBarangay?', 'TugonBarangay is the barangay resident portal for online service requests, complaint reporting, account information, and service updates.'],
        ['General Information', 'Where is the barangay office?', 'The portal is for Barangay Poblacion Oriental, Consolacion, Cebu. A street address is not listed in the portal; use the office contact details for directions.'],
        ['General Information', 'What are the barangay office hours?', 'The listed office hours are Monday to Friday, 8:00 AM to 5:00 PM. Confirm holiday schedules with the barangay office.'],
        ['Account & Verification', 'How do I create an account?', 'Choose Register on the sign-in page and enter your resident information. Your details must match the barangay registry. Create a password with at least eight characters, including uppercase and lowercase letters, a number, and a symbol.'],
        ['Account & Verification', 'Why do I need to verify my account?', 'Verification helps confirm that an account belongs to a resident in the barangay. Some services, including document requests and complaint submissions, require a verified account.'],
        ['Account & Verification', 'How long does account verification take?', 'Verification is reviewed by barangay personnel. The portal does not publish a fixed review time; check your account status and contact the office if it remains pending.'],
        ['Account & Verification', 'Why is my account still pending verification?', 'Your registration may still be waiting for staff review, or some details may need to be checked against the barangay registry. Confirm that your submitted information is accurate and contact the office if you need help.'],
        ['Account & Verification', 'What should I do if my registration is rejected?', 'Review the rejection reason shown with your account status. If you believe the information is correct or need help correcting it, contact the barangay office before registering again.'],
        ['Account & Verification', 'I forgot my password. What should I do?', 'Self-service password reset is not currently available in the portal. Contact the barangay office at barangay@tugonbarangay.gov.ph for account assistance.'],
        ['Document Requirements', 'What documents can I request through TugonBarangay?', 'The portal currently lists Barangay Certification, Barangay Residency, Barangay Indigency, Construction Permit, and Business Permit. The available types and their forms are shown under Document Requests.'],
        ['Document Requirements', 'What are the requirements for a Barangay Certification?', 'Complete the applicant information and state the purpose. Upload a valid government-issued ID. If you choose Other as the purpose, provide the requested additional details.'],
        ['Document Requirements', 'What are the requirements for Barangay Residency?', 'Complete the applicant information, municipality and province, years of residency, and purpose. A valid ID or other proof of residency can be uploaded when applicable; the form marks these as optional unless staff request them.'],
        ['Document Requirements', 'What are the requirements for Barangay Indigency?', 'Complete the applicant information, state the purpose, and upload a valid government-issued ID. Additional details may be requested for an Other purpose.'],
        ['Document Requirements', 'What are the requirements for a Construction Permit?', 'Complete the property and project information and upload a valid ID. The form may also request proof of ownership, title or tax declaration, authorization for a representative, and construction plans as applicable.'],
        ['Document Requirements', 'What are the requirements for a Business Permit?', 'Complete the business and applicant information and upload a valid ID. The form may request business registration, proof of premises, community tax certificate, or other permits depending on the business.'],
        ['Barangay Certification', 'What is a Barangay Certification?', 'A Barangay Certification is an official document issued by the barangay for a stated purpose. Confirm that the certificate meets the requirements of the organization requesting it.'],
        ['Barangay Certification', 'What information is needed for a Barangay Certification?', 'The form asks for your name, date of birth, sex, civil status, purok, contact number, email address, purpose, and a valid ID upload.'],
        ['Barangay Certification', 'How do I request a Barangay Certification?', 'Open Document Requests, select Barangay Certification, complete the applicant information and purpose, attach a valid ID, then submit. Track the request in your request history.'],
        ['Barangay Certification', 'How much is the Barangay Certification?', 'The portal does not list a confirmed fee. Contact the barangay office to verify the current amount before paying.'],
        ['Barangay Certification', 'How long does it take to process a Barangay Certification?', 'Processing time can depend on verification, complete requirements, and barangay workload. Track the request status in TugonBarangay or ask the office for an estimate.'],
        ['Barangay Residency', 'What is a Barangay Residency Certificate?', 'A Barangay Residency Certificate documents residency information recorded or verified by the barangay. The barangay office determines what proof is needed for your case.'],
        ['Barangay Residency', 'Who can request a Barangay Residency Certificate?', 'Residents may submit a request through the portal. The barangay will verify the submitted resident and address information before issuing a certificate.'],
        ['Barangay Residency', 'What information is needed for Barangay Residency?', 'The form requests your name, date of birth, sex, civil status, purok, municipality or city, province, years of residency, and purpose. Supporting proof may be uploaded if applicable.'],
        ['Barangay Residency', 'How do I request a Barangay Residency Certificate?', 'Open Document Requests, choose Barangay Residency, complete the applicant and residency details, then submit. Check your request history for status updates.'],
        ['Barangay Residency', 'How much is the Barangay Residency Certificate?', 'The portal does not list a confirmed fee. Contact the barangay office to verify the current amount before paying.'],
        ['Barangay Residency', 'How long does it take to process Barangay Residency?', 'Processing time depends on verification and the completeness of your information. Follow the status in your request history or contact the office for an estimate.'],
        ['Barangay Indigency', 'What is a Barangay Indigency Certificate?', 'A Barangay Indigency Certificate is an official document related to an indigency request. The barangay reviews the purpose and supporting information before deciding whether it can be issued.'],
        ['Barangay Indigency', 'Who can request a Barangay Indigency Certificate?', 'Residents can submit a request through the portal. Barangay personnel review the information and determine whether the request meets the applicable requirements.'],
        ['Barangay Indigency', 'What information is needed for Barangay Indigency?', 'The form asks for your name, date of birth, sex, civil status, purok, contact number, purpose, and a valid government-issued ID.'],
        ['Barangay Indigency', 'How do I request a Barangay Indigency Certificate?', 'Open Document Requests, select Barangay Indigency, complete the applicant details and purpose, upload a valid ID, and submit the request.'],
        ['Barangay Indigency', 'How much is the Barangay Indigency Certificate?', 'The portal does not list a confirmed fee. Contact the barangay office to verify whether a fee applies and the current amount.'],
        ['Barangay Indigency', 'How long does it take to process Barangay Indigency?', 'Processing time depends on staff review and the completeness of the information. Track the status in your request history or ask the barangay office.'],
        ['Construction Permit', 'What is a Construction Permit?', 'A Construction Permit request asks the barangay to review information about proposed construction, renovation, repair, extension, or fencing. The relevant approving office may require additional permits.'],
        ['Construction Permit', 'What information is needed for a Construction Permit?', 'The form asks for property and ownership details, project type, structure details, floors, estimated cost, proposed start date, and project description, along with applicant contact details.'],
        ['Construction Permit', 'What documents do I need for a Construction Permit?', 'Upload a valid ID. Depending on the property and project, the form may request proof of ownership, title or tax declaration, owner authorization or lease, and architectural, structural, electrical, plumbing, or other plans.'],
        ['Construction Permit', 'How do I request a Construction Permit?', 'Open Document Requests, choose Construction Permit, complete the property and project forms, attach the applicable requirements, and submit. Track the request status in the portal.'],
        ['Construction Permit', 'How much is the Construction Permit?', 'The portal does not list a confirmed fee. Permit costs can depend on the project and review; contact the barangay or relevant permitting office for the current assessment.'],
        ['Construction Permit', 'How long does it take to process a Construction Permit?', 'Review time depends on the project details, submitted plans, other required approvals, and office workload. Ask the barangay or relevant permitting office for an estimate.'],
        ['Business Permit', 'What is a Business Permit?', 'A Business Permit request is for barangay review of a business operating within the barangay. Other municipal or national permits may also be required.'],
        ['Business Permit', 'What information is needed for a Business Permit?', 'The form asks for ownership type, business name and type, nature of business, location and purok, estimated investment, number of employees, start date, and contact details.'],
        ['Business Permit', 'What documents do I need for a Business Permit?', 'Upload a valid ID. The form may ask for DTI, SEC, or CDA registration depending on ownership, proof of premises, a community tax certificate, and other applicable permits.'],
        ['Business Permit', 'How do I request a Business Permit?', 'Open Document Requests, select Business Permit, complete the business details, attach the applicable documents, and submit. Track the request in your history.'],
        ['Business Permit', 'How much is the Business Permit?', 'The portal does not list a confirmed fee. Contact the barangay office to confirm current barangay charges and any other applicable permit fees.'],
        ['Business Permit', 'How long does it take to process a Business Permit?', 'Processing time depends on the submitted business information, required documents, and office workload. Contact the barangay office for an estimate.'],
        ['Document Request', 'How do I request a document online?', 'Open Document Requests, select the document type, complete its form, upload required files, and submit. The request appears in your request history.'],
        ['Document Request', 'Can I upload my requirements online?', 'Yes. The document request form accepts PDF, JPG, JPEG, and PNG files up to 5 MB per file. Required uploads vary by document type.'],
        ['Document Request', 'Can I edit my request after submitting it?', 'A submitted request cannot be edited while it is under review. If staff return it with For Correction status, open the request, update the information or replace files, then resubmit it. For other statuses, contact the barangay office.'],
        ['Document Request', 'Can I cancel my document request?', 'The portal does not currently provide a cancel action. Contact the barangay office and provide your request number if you no longer need the document.'],
        ['Document Request', 'Where can I see my submitted requests?', 'Open Document Requests and view Request History. Select a request to see its details, status, and any staff correction remarks.'],
        ['Request Status', 'How can I check my request status?', 'Open Document Requests and find your request in Request History. The status and any staff remarks are shown with its details.'],
        ['Request Status', 'What does Pending mean?', 'Pending means the request has been submitted and is waiting for staff verification or review. Check the request details for any staff remarks.'],
        ['Request Status', 'What does Processing mean?', 'Processing means staff have accepted the request for preparation or further processing. Check the portal for later status updates.'],
        ['Request Status', 'What does Approved mean?', 'An approval means the request passed a review step. Follow the current status shown in Request History; the document may still need processing before it is ready for release.'],
        ['Request Status', 'What does Rejected mean?', 'Rejected means the request was not approved. Open its details to read any staff remarks, then contact the barangay office if you need clarification.'],
        ['Request Status', 'What does Ready for Release mean?', 'Ready for Release means the document is marked ready for pickup. Check any staff instructions and contact the barangay office about pickup requirements.'],
        ['Request Status', 'What does Released mean?', 'Released means the document has been handed over. The portal may show the request as Complete after release; contact the office if the status does not match what happened.'],
        ['Request Status', 'Why was my request rejected?', 'Open the request details and read the staff remarks for the reason. If no reason is shown or you need clarification, contact the barangay office with your request number.'],
        ['Document Release', 'Where can I claim my document?', 'Documents marked Ready for Release should be claimed at the barangay office. Check the request details or contact the office before visiting.'],
        ['Document Release', 'What do I need to bring when claiming my document?', 'Bring a valid ID and your request reference number. Contact the barangay office to confirm whether additional documents are needed.'],
        ['Document Release', 'Can someone else claim my document?', 'The portal does not specify an alternate-claimant policy. Contact the barangay office before sending someone else, and ask what authorization or identification they require.'],
        ['Document Release', 'How will I know when my document is ready?', 'Check Request History for the current status. If a notification is sent for your update, it will also appear under Notifications. When the status is Ready for Release, follow the pickup instructions shown by staff.'],
        ['Fees & Payment', 'How much does a barangay document cost?', 'Fees depend on the document and current barangay rules. The portal does not provide a confirmed fee schedule; ask the barangay office before paying.'],
        ['Fees & Payment', 'Where can I pay the required fees?', 'The portal does not currently support online payment or list a payment counter. Confirm the approved payment location and method with the barangay office.'],
        ['Fees & Payment', 'Do I need to pay online?', 'No online payment feature is available in the portal. Contact the barangay office for the current fee and accepted payment method.'],
        ['Fees & Payment', 'Are there documents that are free?', 'The portal does not publish which documents, if any, are free. Ask the barangay office to confirm the current fee for your document.'],
        ['Complaint Management', 'How do I file a complaint?', 'Open Complaints, choose a category, describe what happened, add the date and location if known, optionally attach evidence, then submit. You can follow the complaint in Complaint History.'],
        ['Complaint Management', 'What information is needed when filing a complaint?', 'Choose the closest category, add a short subject and a clear description, and include the incident date, location, and other relevant information when available.'],
        ['Complaint Management', 'Can I attach evidence to my complaint?', 'Yes. You can attach one PDF, JPG, JPEG, or PNG file up to 5 MB. Evidence is stored privately and can be accessed through the portal by you and authorized barangay personnel handling the complaint.'],
        ['Complaint Management', 'Can I check my complaint status?', 'Yes. Open Complaints and find the report in Complaint History. The current status and any staff remarks or resolution details appear in its details.'],
        ['Complaint Management', 'What happens after I submit a complaint?', 'The complaint is recorded as Pending. Reports that describe serious ongoing disturbances, escalating conflict, threats, or violence may be flagged for priority staff review. Staff review and action updates are shown when available.'],
        ['Complaint Management', 'Can I edit or cancel my complaint?', 'The portal does not currently offer complaint editing or cancellation. Contact the barangay office and provide your complaint reference number if you need to correct or withdraw information.'],
        ['Complaint Management', 'How will I know if my complaint has been acted upon?', 'Check Complaint History for the latest status, staff remarks, or resolution details. Contact the barangay office with your complaint reference if you need an update.'],
        ['Privacy & Security', 'How is my personal information protected?', 'The portal limits account and service information to authenticated use and stores passwords as hashes. Avoid sharing your password and use only the official portal.'],
        ['Privacy & Security', 'Why does TugonBarangay need my personal information?', 'Information is used to verify resident accounts and process the service or complaint you submit. Provide only accurate information requested by the form.'],
        ['Privacy & Security', 'Who can access my information?', 'Your account and records are associated with your resident profile. Authorized barangay personnel may review information needed to process your requests or complaints.'],
        ['Privacy & Security', 'Is my uploaded document secure?', 'Uploads are stored on the application server and are not served as public links. Access them only through the authenticated portal; do not share your account token or password.'],
        ['System Assistance', 'How do I use the resident dashboard?', 'Use the resident navigation to open Overview, Document Requests, Complaints, Notifications, Profile, or BantayBot. Some submission actions require a verified account.'],
        ['System Assistance', 'Where can I view my request history?', 'Open Document Requests. Your request history includes status, request details, staff remarks, and actions available for requests returned For Correction.'],
        ['System Assistance', 'Where can I view my complaint history?', 'Open Complaints and scroll to Complaint History. Expand a complaint to view its details, priority flag, evidence, staff remarks, and resolution information.'],
        ['System Assistance', 'What should I do if I encounter a problem with the system?', 'Retry once and check your internet connection. If the problem continues, escalate your question in BantayBot or email barangay@tugonbarangay.gov.ph with a description of the issue.'],
        ['System Assistance', 'What should I do if I cannot upload a document?', 'Use a PDF, JPG, JPEG, or PNG file within the 5 MB limit. Check that the required file is selected, then try again. If it still fails, contact the barangay office.'],
        ['System Assistance', 'What should I do if my request information is incorrect?', 'If the request is For Correction, use Correct and Resubmit to update the information. For other statuses, contact the barangay office with your request number.'],
        ['Fallback / Unknown', 'I cannot find the answer to my question.', 'I could not find a confident answer in the available FAQ. You can rephrase your question or select Escalate to staff to record it for follow-up.'],
        ['Fallback / Unknown', 'Can I talk to barangay staff?', 'Yes. Select Escalate to staff below an answer to record your question for barangay follow-up. The portal will show a reference number after it is saved.'],
        ['Fallback / Unknown', 'How can I contact the barangay office?', 'Email barangay@tugonbarangay.gov.ph or visit the Barangay Poblacion Oriental office during listed office hours, Monday to Friday, 8:00 AM to 5:00 PM.'],
    ];

    public function run(): void
    {
        ChatbotFaq::whereIn('question', [
            'What are the requirements for a barangay clearance?',
            'How long does a document request take?',
        ])->update(['is_active' => false]);

        foreach (self::FAQS as [$category, $question, $answer]) {
            $keywords = collect(preg_split('/[^a-z0-9]+/i', strtolower($question)))
                ->filter(fn(string $word) => strlen($word) > 2 && !in_array($word, self::STOP_WORDS, true))
                ->unique()
                ->values()
                ->all();

            ChatbotFaq::updateOrCreate(
                ['question' => $question],
                [
                    'category' => $category,
                    'answer' => $answer,
                    'keywords' => $keywords,
                    'is_active' => true,
                ],
            );
        }
    }
}
