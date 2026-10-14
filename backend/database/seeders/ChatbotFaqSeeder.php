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
        ['Account & Verification', 'How do I create an account?', 'Choose Register on the sign-in page and enter your resident information. Your first name, last name, date of birth, sex, and purok must match the barangay registry. Use an email address not already used by any portal account. Create a password with at least eight characters, including uppercase and lowercase letters, a number, and a symbol. Your registration will be pending barangay verification.'],
        ['Account & Verification', 'Which details must match the barangay registry?', 'The registration check matches your first name, last name, date of birth, sex, and purok to a registry record. If the form does not accept your details, contact the barangay office for help.'],
        ['Account & Verification', 'Can I register multiple accounts using my name or the same barangay registry record?', 'Please create only one account per resident. Registration checks your first name, last name, date of birth, sex, and purok against the barangay registry, and each account must use a unique email address. The portal does not currently block a second account that matches the same registry record, so duplicate registrations may be submitted and will be pending barangay verification. If you already registered or cannot access your account, contact barangay@tugonbarangay.gov.ph for help instead of creating another account.'],
        ['Account & Verification', 'Can I request a document or file a complaint while my account is pending?', 'No. Document requests, correction resubmissions, and complaint submissions require a verified account. You can sign in and check your status while staff review your registration.'],
        ['Account & Verification', 'What information can I change in my profile?', 'Open Profile to update your mobile number and house or street address. The portal does not let you edit your name, date of birth, sex, purok, or email there. Contact the barangay office if those details need correction.'],
        ['Account & Verification', 'Can I change my account email address?', 'The resident profile page does not currently let you change your email address. Contact barangay@tugonbarangay.gov.ph for account help.'],
        ['Account & Verification', 'Why do I need to verify my account?', 'Verification helps confirm that an account belongs to a resident in the barangay. Some services, including document requests and complaint submissions, require a verified account.'],
        ['Account & Verification', 'How long does account verification take?', 'Verification is reviewed by barangay personnel. The portal does not publish a fixed review time; check your account status and contact the office if it remains pending.'],
        ['Account & Verification', 'Why is my account still pending verification?', 'Your registration may still be waiting for staff review, or some details may need to be checked against the barangay registry. Confirm that your submitted information is accurate and contact the office if you need help.'],
        ['Account & Verification', 'What should I do if my registration is rejected?', 'Review the rejection reason shown with your account status. If you believe the information is correct or need help correcting it, contact the barangay office before registering again.'],
        ['Account & Verification', 'I forgot my password. What should I do?', 'Self-service password reset is not currently available in the portal. Contact the barangay office at barangay@tugonbarangay.gov.ph for account assistance.'],
        ['Document Requirements', 'What documents can I request through TugonBarangay?', 'Open Document Requests to see the currently active document types. The current setup includes Barangay Clearance, Barangay Certificate, Certificate of Residency, Certificate of Indigency, Business Clearance, Certificate of Good Moral Character, and First-Time Job Seeker Certification. Administrators can change which documents are available.'],
        ['Document Requirements', 'Where can I find the current requirements and fee for a document?', 'Open Document Requests and select the document type. Its page shows the current questions, required uploads, and fee. Follow the portal because administrators can update these details.'],
        ['Document Requirements', 'What are the requirements for Barangay Clearance?', 'Complete the questions shown on the Barangay Clearance form and upload each required file shown there. The current default setup asks for a Purok Certificate and valid government-issued ID; check the form for the latest requirements and fee.'],
        ['Document Requirements', 'What are the requirements for Certificate of Residency?', 'Complete the questions shown on the Certificate of Residency form, including residency details when requested, and upload the required files. The current default setup asks for a Purok Certificate and valid government-issued ID; check the form for current requirements and fee.'],
        ['Document Requirements', 'What are the requirements for Certificate of Indigency?', 'Complete the questions shown on the Certificate of Indigency form and upload its required files. The current default setup asks for a Purok Certificate and valid government-issued ID and has no fee; check the form for current details.'],
        ['Document Requirements', 'What are the requirements for Business Clearance?', 'Complete the applicant and business questions shown on the Business Clearance form and upload its required files. The current default setup asks for a Purok Certificate and valid government-issued ID. Staff assess the fee; check the form for current details.'],
        ['Document Requirements', 'What are the requirements for Certificate of Good Moral Character?', 'Complete the questions shown on the Certificate of Good Moral Character form and upload its required files. The current default setup asks for a Purok Certificate and valid government-issued ID and has no fee; check the form for current details.'],
        ['Document Requirements', 'Can I request a First-Time Job Seeker Certification more than once?', 'The current setup marks First-Time Job Seeker Certification as a one-time document type. The portal prevents another request while a previous request exists, except when that request was rejected. Check the active document form and contact the barangay office if you need guidance.'],
        ['Barangay Certification', 'What is a Barangay Certification?', 'A Barangay Certification is an official document issued by the barangay for a stated purpose. Confirm that the certificate meets the requirements of the organization requesting it.'],
        ['Barangay Certification', 'What information is needed for a Barangay Certification?', 'For Barangay Clearance, provide your full name, address, purok, date of birth, sex, and purpose. Upload a Purok Certificate and a valid government-issued ID.'],
        ['Barangay Certification', 'How do I request a Barangay Certification?', 'Open Document Requests, select the active certificate type, complete the form, upload each required file, and submit. The page shows its current fee and requirements.'],
        ['Barangay Certification', 'How much is the Barangay Certification?', 'Open Document Requests and select the certificate type to see its current fee. Fees can be changed by the barangay administrator.'],
        ['Barangay Certification', 'How long does it take to process a Barangay Certification?', 'Processing time can depend on verification, complete requirements, and barangay workload. Track the request status in TugonBarangay or ask the office for an estimate.'],
        ['Barangay Residency', 'What is a Barangay Residency Certificate?', 'A Barangay Residency Certificate documents residency information recorded or verified by the barangay. The barangay office determines what proof is needed for your case.'],
        ['Barangay Residency', 'Who can request a Barangay Residency Certificate?', 'Residents may submit a request through the portal. The barangay will verify the submitted resident and address information before issuing a certificate.'],
        ['Barangay Residency', 'What information is needed for Barangay Residency?', 'The form requests your full name, address, purok, date of birth, sex, purpose, and length of residency. Upload a Purok Certificate and a valid government-issued ID.'],
        ['Barangay Residency', 'How do I request a Barangay Residency Certificate?', 'Open Document Requests, select Certificate of Residency, provide the applicant and residency details, and upload a Purok Certificate and valid government-issued ID. Check your request history for status updates.'],
        ['Barangay Residency', 'How much is the Barangay Residency Certificate?', 'Open Document Requests and select Certificate of Residency to see its current fee and payment instructions. Fees can be changed by the barangay administrator.'],
        ['Barangay Residency', 'How long does it take to process Barangay Residency?', 'Processing time depends on verification and the completeness of your information. Follow the status in your request history or contact the office for an estimate.'],
        ['Barangay Indigency', 'What is a Barangay Indigency Certificate?', 'A Barangay Indigency Certificate is an official document related to an indigency request. The barangay reviews the purpose and supporting information before deciding whether it can be issued.'],
        ['Barangay Indigency', 'Who can request a Barangay Indigency Certificate?', 'Residents can submit a request through the portal. Barangay personnel review the information and determine whether the request meets the applicable requirements.'],
        ['Barangay Indigency', 'What information is needed for Barangay Indigency?', 'Provide your full name, address, date of birth, sex, purok, and purpose. Upload a Purok Certificate and valid government-issued ID.'],
        ['Barangay Indigency', 'How do I request a Barangay Indigency Certificate?', 'Open Document Requests, select Certificate of Indigency, complete the form, upload each required file, and submit. Check the page for the current fee and requirements.'],
        ['Barangay Indigency', 'How much is the Barangay Indigency Certificate?', 'Open Document Requests and select Certificate of Indigency to see its current fee. The current default setup has no fee, but the page shows the latest amount.'],
        ['Barangay Indigency', 'How long does it take to process Barangay Indigency?', 'Processing time depends on staff review and the completeness of the information. Track the status in your request history or ask the barangay office.'],
        ['Business Permit', 'What is a Business Permit?', 'Business Clearance is for barangay review of a business operating within the barangay. Other municipal or national permits may also be required.'],
        ['Business Permit', 'What information is needed for a Business Permit?', 'Provide your contact number, business name and address, full name, applicant address, sex, occupation, and income.'],
        ['Business Permit', 'What documents do I need for a Business Permit?', 'Upload a Purok Certificate and a valid government-issued ID.'],
        ['Business Permit', 'How do I request a Business Permit?', 'Open Document Requests, select Business Clearance, complete the applicant and business details, upload a Purok Certificate and valid ID, and submit. Track the request in your history.'],
        ['Business Permit', 'How much is the Business Permit?', 'Open Document Requests and select Business Clearance to see its current fee. In the current setup, staff assess the fee using the submitted business information. Follow the payment instructions shown in the portal.'],
        ['Business Permit', 'How long does it take to process a Business Permit?', 'Processing time depends on the submitted business information, required documents, and office workload. Contact the barangay office for an estimate.'],
        ['Document Request', 'How do I request a document online?', 'Open Document Requests, select the document type, complete its form, upload required files, and submit. The request appears in your request history.'],
        ['Document Request', 'Can I upload my requirements online?', 'Yes. The document request form accepts PDF, JPG, JPEG, and PNG files up to 5 MB per file. Required uploads vary by document type.'],
        ['Document Request', 'Can I edit my request after submitting it?', 'A submitted request cannot be edited while it is under review. If staff return it with For Correction status, open the request, update the information or replace files, then resubmit it. For other statuses, contact the barangay office.'],
        ['Document Request', 'Can I cancel my document request?', 'The portal does not currently provide a cancel action. Contact the barangay office and provide your request number if you no longer need the document.'],
        ['Document Request', 'Where can I see my submitted requests?', 'Open Document Requests and view Request History. Select a request to see its details, status, and any staff correction remarks.'],
        ['Request Status', 'How can I check my request status?', 'Open Document Requests and find your request in Request History. The status and any staff remarks are shown with its details.'],
        ['Request Status', 'What does Pending mean?', 'Pending means the request has been submitted and is waiting for staff verification or review. Check the request details for any staff remarks.'],
        ['Request Status', 'What does Under Review mean?', 'Under Review means barangay staff are checking your submitted information and requirements. You will see a notification when the status changes.'],
        ['Request Status', 'What does Processing mean?', 'Processing means staff verified the requirements and are preparing your document. Check Request History and Notifications for updates.'],
        ['Request Status', 'What does For Correction mean?', 'For Correction means staff need you to update information or replace a file. Open the request, read the staff remarks, choose Correct and Resubmit, make the requested changes, and send it again.'],
        ['Request Status', 'What does Rejected mean?', 'Rejected means the request was not approved. Open its details to read the rejection reason and staff remarks. Contact the barangay office if you need clarification.'],
        ['Request Status', 'What does Ready for Release mean?', 'Ready for Release means the document is marked ready for pickup. Check any staff instructions and contact the barangay office about pickup requirements.'],
        ['Request Status', 'What does Completed mean?', 'Completed means staff marked the request complete after releasing the document. If the status does not match what happened, contact the barangay office with your request number.'],
        ['Request Status', 'Why was my request rejected?', 'Open the request details and read the staff remarks for the reason. If no reason is shown or you need clarification, contact the barangay office with your request number.'],
        ['Document Release', 'Where can I claim my document?', 'Documents marked Ready for Release should be claimed at the barangay office. Check the request details or contact the office before visiting.'],
        ['Document Release', 'What do I need to bring when claiming my document?', 'Bring a valid ID and your request reference number. Contact the barangay office to confirm whether additional documents are needed.'],
        ['Document Release', 'Can someone else claim my document?', 'The portal does not specify an alternate-claimant policy. Contact the barangay office before sending someone else, and ask what authorization or identification they require.'],
        ['Document Release', 'How will I know when my document is ready?', 'Check Request History for the current status. If a notification is sent for your update, it will also appear under Notifications. When the status is Ready for Release, follow the pickup instructions shown by staff.'],
        ['Fees & Payment', 'How much does a barangay document cost?', 'The resident Document Requests page shows the current fee for each active document type. Business Clearance fees are assessed by staff based on business details and income.'],
        ['Fees & Payment', 'Where can I pay the required fees?', 'Fees are paid at the barangay when you visit to claim a released document. The portal does not currently support online payment.'],
        ['Fees & Payment', 'Do I need to pay online?', 'No online payment feature is available in the portal. Contact the barangay office for the current fee and accepted payment method.'],
        ['Fees & Payment', 'Are there documents that are free?', 'Some document types may have no fee. Open Document Requests and check the current fee shown for each active type, since administrators can change fees.'],
        ['Complaint Management', 'How do I file a complaint?', 'Open Complaints, choose a category, describe what happened, add the date and location if known, optionally attach evidence, then submit. You can follow the complaint in Complaint History.'],
        ['Complaint Management', 'What information is needed when filing a complaint?', 'Choose the closest category, add a short subject and a clear description, and include the incident date, location, and other relevant information when available.'],
        ['Complaint Management', 'What complaint categories can I choose?', 'The current list includes Noise and Disturbance, Neighbor Dispute, Property Disputes, Public Nuisance, Environmental Concern, Animal Related Concern, Peace and Order, Road and Public, Facility Concern, Illegal or Unauthorized Activity, and Other Barangay Concern. Choose from the categories currently shown in the complaint form.'],
        ['Complaint Management', 'What happens to a complaint after I submit it?', 'A submitted complaint starts as Pending. Staff may move it to In Progress, Resolved, Rejected, or Closed. Serious ongoing safety concerns may be flagged for priority review. You can view the current status, staff remarks, and resolution details in Complaint History.'],
        ['Complaint Management', 'What does In Progress mean for my complaint?', 'In Progress means staff are working on your complaint. Check Complaint History for staff remarks and later status updates.'],
        ['Complaint Management', 'What does Resolved mean for my complaint?', 'Resolved means staff recorded a resolution. Open the complaint details to read the resolution information. The case may later be marked Closed.'],
        ['Complaint Management', 'What does Rejected mean for my complaint?', 'Rejected means staff did not accept or proceed with the complaint. Open Complaint History to read the resolution details or staff remarks, and contact the barangay office if you need clarification.'],
        ['Complaint Management', 'What does Closed mean for my complaint?', 'Closed means staff have closed the complaint case. Open its details in Complaint History to review the recorded resolution.'],
        ['Complaint Management', 'Can I change my complaint after submitting it?', 'The portal does not provide a way to edit or cancel a submitted complaint. Contact the barangay office and provide your complaint reference if you need to correct or withdraw information.'],
        ['Complaint Management', 'Can I attach evidence to my complaint?', 'Yes. You can attach one PDF, JPG, JPEG, or PNG file up to 5 MB. Evidence is stored privately and can be accessed through the portal by you and authorized barangay personnel handling the complaint.'],
        ['Complaint Management', 'Can I check my complaint status?', 'Yes. Open Complaints and find the report in Complaint History. The current status and any staff remarks or resolution details appear in its details.'],
        ['Complaint Management', 'Can I edit or cancel my complaint?', 'The portal does not currently offer complaint editing or cancellation. Contact the barangay office and provide your complaint reference number if you need to correct or withdraw information.'],
        ['Complaint Management', 'How will I know if my complaint has been acted upon?', 'Check Complaint History for the latest status, staff remarks, or resolution details. Contact the barangay office with your complaint reference if you need an update.'],
        ['Privacy & Security', 'How is my personal information protected?', 'The portal limits account and service information to authenticated use and stores passwords as hashes. Avoid sharing your password and use only the official portal.'],
        ['Privacy & Security', 'Why does TugonBarangay need my personal information?', 'Information is used to verify resident accounts and process the service or complaint you submit. Provide only accurate information requested by the form.'],
        ['Privacy & Security', 'Who can access my information?', 'Your account and records are associated with your resident profile. Authorized barangay personnel may review information needed to process your requests or complaints.'],
        ['Privacy & Security', 'Is my uploaded document secure?', 'Uploads are stored on the application server and are not served as public links. Access them only through the authenticated portal; do not share your account token or password.'],
        ['System Assistance', 'How do I use the resident dashboard?', 'Use the resident navigation to open Overview, Document Requests, Complaints, Notifications, Profile, or BantayBot. Some submission actions require a verified account.'],
        ['System Assistance', 'Where can I view my request history?', 'Open Document Requests. Your request history includes status, request details, staff remarks, and actions available for requests returned For Correction.'],
        ['System Assistance', 'Where can I view my complaint history?', 'Open Complaints and scroll to Complaint History. Expand a complaint to view its details, priority flag, evidence, staff remarks, and resolution information.'],
        ['System Assistance', 'How do I manage my notifications?', 'Open Notifications to view service updates. You can mark one notification as read, mark all as read, or delete a notification. Document and complaint status changes may create notifications in the portal.'],
        ['System Assistance', 'How do I send feedback about a service?', 'Open Share Feedback, choose General service, Document request, Complaint, or BantayBot, select a rating from 1 to 5, and optionally add a comment.'],
        ['System Assistance', 'How do I send a question to barangay staff from BantayBot?', 'After BantayBot answers, choose Escalate to staff. Your question is recorded for barangay follow-up and appears in your escalated questions with a reference number. The portal does not give a fixed reply time.'],
        ['System Assistance', 'Does BantayBot answer every question automatically?', 'BantayBot looks for a matching answer in its active FAQ list. If it cannot find a confident answer, rephrase your question or choose Escalate to staff so the barangay can follow up.'],
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
            'What does Approved mean?',
            'What does Released mean?',
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
