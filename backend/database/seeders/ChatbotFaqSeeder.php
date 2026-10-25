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

    /**
     * Old questions that no longer exist in the updated FAQ list.
     * They are set to inactive so BantayBot stops matching them.
     */
    private const RETIRED_QUESTIONS = [
        // Previously deactivated
        'What are the requirements for a barangay clearance?',
        'How long does a document request take?',
        'What does Approved mean?',
        'What does Released mean?',

        // Document Requirements (replaced by reworded versions)
        'Where can I find the current requirements and fee for a document?',
        'What are the requirements for Certificate of Residency?',
        'What are the requirements for Certificate of Indigency?',
        'What are the requirements for Certificate of Good Moral Character?',

        // Barangay Certification
        'What is a Barangay Certification?',
        'What information is needed for a Barangay Certification?',
        'How do I request a Barangay Certification?',
        'How much is the Barangay Certification?',
        'How long does it take to process a Barangay Certification?',

        // Barangay Residency
        'What is a Barangay Residency Certificate?',
        'Who can request a Barangay Residency Certificate?',
        'What information is needed for Barangay Residency?',
        'How do I request a Barangay Residency Certificate?',
        'How much is the Barangay Residency Certificate?',
        'How long does it take to process Barangay Residency?',

        // Barangay Indigency
        'What is a Barangay Indigency Certificate?',
        'Who can request a Barangay Indigency Certificate?',
        'What information is needed for Barangay Indigency?',
        'How do I request a Barangay Indigency Certificate?',
        'How much is the Barangay Indigency Certificate?',
        'How long does it take to process Barangay Indigency?',

        // Business Permit
        'What is a Business Permit?',
        'What information is needed for a Business Permit?',
        'What documents do I need for a Business Permit?',
        'How do I request a Business Permit?',
        'How much is the Business Permit?',
        'How long does it take to process a Business Permit?',

        // Document Request / Release / Fees
        'Can I cancel my document request?',
        'Where can I see my submitted requests?',
        'What do I need to bring when claiming my document?',
        'Can someone else claim my document?',
        'How will I know when my document is ready?',
        'Where can I pay the required fees?',
        'Do I need to pay online?',
        'Are there documents that are free?',

        // Complaint Management
        'What information is needed when filing a complaint?',
        'What complaint categories can I choose?',
        'What happens to a complaint after I submit it?',
        'Can I change my complaint after submitting it?',
        'Can I attach evidence to my complaint?',
        'Can I check my complaint status?',
        'Can I edit or cancel my complaint?',
        'How will I know if my complaint has been acted upon?',

        // Privacy & Security
        'How is my personal information protected?',
        'Why does TugonBarangay need my personal information?',
        'Who can access my information?',
        'Is my uploaded document secure?',

        // System Assistance
        'Where can I view my request history?',
        'Where can I view my complaint history?',
        'How do I manage my notifications?',
        'How do I send feedback about a service?',
        'How do I send a question to barangay staff from BantayBot?',
        'Does BantayBot answer every question automatically?',
        'What should I do if I encounter a problem with the system?',
        'What should I do if I cannot upload a document?',
        'What should I do if my request information is incorrect?',

        // Fallback / Unknown
        'I cannot find the answer to my question.',
        'Can I talk to barangay staff?',
    ];

    private const FAQS = [
        // ---------------------------------------------------------------
        // General Information
        // ---------------------------------------------------------------
        ['General Information', 'What can BantayBot do?', 'BantayBot answers common questions about TugonBarangay, resident accounts, document requests, complaints, and barangay services. For questions it cannot answer, use Ask Barangay Staff to send them for follow-up.'],
        ['General Information', 'What services are available in TugonBarangay?', 'Residents can register and manage their profile, request barangay documents, track document requests, submit complaints with supporting evidence, view notifications, and ask BantayBot for information. Availability can depend on account verification.'],
        ['General Information', 'What is TugonBarangay?', 'TugonBarangay is the barangay resident portal for online service requests, complaint reporting, account information, and service updates.'],
        ['General Information', 'Where is the barangay office?', 'The barangay office is located at the Purok 2 Calachuchi, Tayud, Consolacion, Cebu, 6001.'],
        ['General Information', 'What are the barangay office hours?', 'The listed office hours are Monday to Friday, 8:00 AM to 5:00 PM. Confirm holiday schedules with the barangay office.'],

        // ---------------------------------------------------------------
        // Account & Verification
        // ---------------------------------------------------------------
        ['Account & Verification', 'How do I create an account?', 'Choose Register on the sign-in page and enter your resident information. Your first name, last name, date of birth, sex, and purok must match the barangay registry. Use an email address not already used by another portal account. Create a password with at least eight characters, including uppercase and lowercase letters, a number, and a symbol. Your registration will be pending barangay verification.'],
        ['Account & Verification', 'Which details must match the barangay registry?', 'The registration check matches your first name, last name, date of birth, sex, and purok to a registry record. If the form does not accept your details, contact the barangay office for help.'],
        ['Account & Verification', 'Can I register multiple accounts using my name or the same barangay registry record?', 'Please create only one account per resident. Registration checks your first name, last name, date of birth, sex, and purok against a registry record, and each account must use a unique email address. The portal does not currently block a second account that matches the same registry record, so duplicate registrations may be submitted and will be pending barangay verification. If you already registered or cannot access your account, contact barangay@tugonbarangay.gov.ph for help instead of creating another account.'],
        ['Account & Verification', 'Can I request a document or file a complaint while my account is pending?', 'No. Document requests, correction resubmissions, and complaint submissions require a verified account. You can sign in and check your status while staff review your registration.'],
        ['Account & Verification', 'What information can I change in my profile?', 'Open Profile to update your mobile number and house or street address. The portal does not let you edit your name, date of birth, sex, purok, or email there. Contact the barangay office if those details need correction.'],
        ['Account & Verification', 'Can I change my account email address?', 'The resident profile page does not currently let you change your email address. Contact barangay@tugonbarangay.gov.ph for account help.'],
        ['Account & Verification', 'Why do I need to verify my account?', 'Verification helps confirm that an account belongs to a resident in the barangay. Some services, including document requests and complaint submissions, require a verified account.'],
        ['Account & Verification', 'How long does account verification take?', 'Verification is reviewed by barangay personnel. The portal does not publish a fixed review time; check your account status and contact the office if it remains pending.'],
        ['Account & Verification', 'Why is my account still pending verification?', 'Your registration may still be waiting for staff review, or some details may need to be checked against the barangay registry. Confirm that your submitted information is accurate and contact the office if you need help.'],
        ['Account & Verification', 'What should I do if my registration is rejected?', 'Review the rejection reason shown with your account status. If you believe the information is correct or need help correcting it, contact the barangay office before registering again.'],
        ['Account & Verification', 'I forgot my password. What should I do?', 'Click “Forgot Password” on the login page and follow the instructions to reset your password.'],

        // ---------------------------------------------------------------
        // Privacy & Security
        // ---------------------------------------------------------------
        ['Privacy & Security', 'Is my personal information safe in TugonBarangay?', 'TugonBarangay helps protect your account and personal information. Your password is stored securely. Keep your password private and do not share it with anyone.'],
        ['Privacy & Security', 'Why do I need to provide my personal information?', 'Your information helps the barangay confirm your identity and process your document requests and complaints. Make sure the information you provide is correct.'],
        ['Privacy & Security', 'Who can see my personal information?', 'Authorized barangay staff can see the information needed to process your requests and complaints. Keep your password and account details private.'],
        ['Privacy & Security', 'Are my uploaded documents kept private?', 'Your uploaded documents are stored in the system and are not available through public links. Access them through your account, and do not share your password with others.'],

        // ---------------------------------------------------------------
        // Document Requirements
        // ---------------------------------------------------------------
        ['Document Requirements', 'What documents can I request through TugonBarangay?', "You can see the available documents on the Document Requests page. These include:\nBarangay Clearance\nBarangay Certificate\nCertificate of Residency\nCertificate of Indigency\nBusiness Clearance\nCertificate of Good Moral Character\nFirst-Time Job Seeker Certification\nFencing Permit\nConstruction Permit\nCedula"],
        ['Document Requirements', 'Where can I see the requirements and fees for a document?', "Open Document Requests.\nChoose the document you need.\nCheck the form for the requirements and fee.\nFollow the instructions shown on the page."],
        ['Document Requirements', 'What are the requirements for Barangay Clearance?', 'You need to provide a Purok Certificate. Fill out the form and upload any other required files shown on the page. Check the form for the latest requirements and fee.'],
        ['Document Requirements', 'What are the requirements for a Certificate of Residency?', 'You need to provide a Purok Certificate. Fill out the form and upload any other required files shown on the page. Check the form for the latest requirements and fee.'],
        ['Document Requirements', 'What are the requirements for a Certificate of Indigency?', 'You need to provide a Purok Certificate. Fill out the form and upload any other required files shown on the page. Check the form for the latest requirements and fee.'],
        ['Document Requirements', 'What are the requirements for Business Clearance?', "The requirements depend on whether you are applying for a new Business Clearance or renewing an existing one. These requirements are temporary and may change.\n\nFor New Applications:\nApplication Form\nPurok Certification\nCedula\nApplicant’s Valid ID\nDTI or SEC Registration\nPicture of the Business\n\nFor Renewals:\nApplication Form\nCedula\nOld Business Clearance\n\nPlease check the form or contact the barangay office at 032-423-4841 for the latest requirements and applicable fee."],
        ['Document Requirements', 'How much is the Business Clearance fee?', 'The barangay secretary will check the type of business and determine the applicable fee. The amount will be provided after the requirements and type of Business Clearance have been reviewed. For questions, contact the barangay office at 032-423-4841.'],
        ['Document Requirements', 'What are the requirements for a Certificate of Good Moral Character?', 'You need to provide a Purok Certificate. Fill out the application form and upload the required documents shown on the page. Please note that this certificate will not be issued to applicants who are involved in ongoing or unresolved barangay complaint cases. The same restriction applies to Barangay Clearance. Check the form for the latest requirements and fees.'],
        ['Document Requirements', 'What are the requirements for a First-Time Job Seeker Certification?', 'Fill out the form and upload the required files. The current form asks for a Purok Certificate and a diploma. Check the form for the latest requirements and fee.'],
        ['Document Requirements', 'Can I request a First-Time Job Seeker Certification more than once?', 'This document is intended for one-time use. The system will not allow another request if you already have one, unless your previous request was rejected. If you have questions, contact the barangay office.'],

        // Cedula
        ['Document Requirements', 'What are the requirements for a Cedula?', 'You need to present a valid ID so the barangay staff can check your information and make sure your name is spelled correctly. A Purok Certificate is not required.'],
        ['Document Requirements', 'How much does a Cedula cost?', 'The minimum fee is ₱78 for regular applicants and ₱6 for senior citizens. A 2% monthly increase applies starting in March, while January and February have no increase. The exact fee will be provided through a notification after the barangay staff processes your request.'],

        // Fencing Permit
        ['Document Requirements', 'What are the requirements for a Fencing Permit?', "You need the following:\nPurok Certificate\nFencing Clearance\n\nThe barangay councilor will inspect the property before the permit can be released."],
        ['Document Requirements', 'How much does a Fencing Permit cost?', 'The minimum fee is ₱530, including ₱30 for document stamps. The final amount depends on the property type (residential, commercial, or industrial) and the fencing materials used (concrete or light materials). The exact fee will be notified through the system once your request is approved and ready for release.'],
        ['Document Requirements', 'How long does it take to process a Fencing Permit?', 'The property must be inspected by the barangay councilor. Processing may take 1 to 7 days, depending on the inspection schedule and the availability of the staff.'],

        // Construction Permit
        ['Document Requirements', 'What are the requirements for a Construction Permit?', 'You need a Purok Certificate. The barangay councilor must inspect the property, and the barangay secretary will check the other requirements before releasing the permit.'],
        ['Document Requirements', 'How much does a Construction Permit cost?', 'The fee depends on whether the construction is residential, commercial, or industrial. The exact fee will be notified through the system once your request is approved and ready for release.'],
        ['Document Requirements', 'How long does it take to process a Construction Permit?', 'The barangay councilor must inspect the property first. If the councilor is available, the inspection may be done sooner. After the inspection, the secretary will check the requirements before releasing the permit. Processing may take up to 7 days.'],

        // ---------------------------------------------------------------
        // Document Request (general)
        // ---------------------------------------------------------------
        ['Document Request', 'What is a barangay document?', 'A barangay document is an official paper issued by the barangay for a specific purpose.'],
        ['Document Request', 'How do I request a document online?', 'Open Document Requests, choose the document you need, fill out the form, upload the required files, and submit your request.'],
        ['Document Request', 'What information do I need to provide?', 'Provide the information asked for in the form. This may include your full name, address, purpose of request, and other details. You may also need to upload a Purok Certificate or other required files.'],
        ['Document Request', 'What are the requirements for my document request?', 'The requirements depend on the document you choose. Open Document Requests and select your document to see what you need to submit.'],
        ['Document Request', 'Can I upload my requirements online?', 'Yes. You can upload PDF, JPG, JPEG, or PNG files. Each file must be no larger than 5 MB.'],
        ['Document Request', 'How long will my request take?', 'The processing time depends on your document, the completeness of your requirements, and the barangay staff’s workload. Check your request status for updates.'],
        ['Document Request', 'Can I edit my request after submitting it?', 'You cannot edit your request while it is being reviewed. If its status is For Correction, you can make the requested changes and submit it again.'],
        ['Document Request', 'Can I cancel my request?', 'You may request to cancel your document request by selecting “Ask Barangay Staff” for assistance. Cancellation is subject to the barangay staff’s approval.'],
        ['Document Request', 'Can I request different documents at the same time?', 'You can request different available documents, depending on the system’s rules. Some documents, such as the First-Time Job Seeker Certification, may have limits on how often you can request them.'],
        ['Document Request', 'What should I do if I entered the wrong information?', 'If your request is marked For Correction, make the needed changes and select Correct and Resubmit. If your request has another status, contact the barangay office and provide your request number.'],

        // ---------------------------------------------------------------
        // Request Status
        // ---------------------------------------------------------------
        ['Request Status', 'How can I check my request status?', 'Open Document Requests, go to Request History, and select your request to see its status and any messages from the barangay staff.'],
        ['Request Status', 'What does Pending mean?', 'Your request has been submitted and is waiting for the barangay staff to check it.'],
        ['Request Status', 'What does Under Review mean?', 'The barangay staff are checking your information and uploaded files.'],
        ['Request Status', 'What does Processing mean?', 'Your requirements have been checked, and the staff are preparing your document.'],
        ['Request Status', 'What does For Correction mean?', 'You need to correct your information or upload a new file. Read the staff’s message, make the changes, and select Correct and Resubmit.'],
        ['Request Status', 'What does Rejected mean?', 'Your request was not approved. Check the staff’s message to see why it was rejected.'],
        ['Request Status', 'What does Ready for Release mean?', 'Your document is ready to be claimed at the barangay office. Check the instructions before visiting.'],
        ['Request Status', 'What does Completed mean?', 'Your document has been released, and the barangay staff have marked your request as complete.'],
        ['Request Status', 'Why was my request rejected?', 'Check your request details and read the staff’s message to see the reason. Contact the barangay office if you need help understanding it.'],

        // ---------------------------------------------------------------
        // Document Release
        // ---------------------------------------------------------------
        ['Document Release', 'Where can I claim my document?', 'You can claim your document at the barangay office when its status is Ready for Release. Follow the pickup instructions provided by the staff.'],
        ['Document Release', 'What should I bring when claiming my document?', 'Bring a valid ID or a screenshot of your request. To check if you need anything else, call (032) 423-4841 or select Ask Barangay Staff.'],
        ['Document Release', 'Can someone else claim my document for me?', "Yes. The person claiming your document must bring the following:\nAn authorization letter from the document owner\nA photocopy of the owner’s valid ID with three signatures\nTheir own valid ID with three signatures\n\nPlease make sure all the required documents are ready before visiting the barangay office. To check if you need anything else, call (032) 423-4841 or select Ask Barangay Staff."],

        // ---------------------------------------------------------------
        // Fees & Payment
        // ---------------------------------------------------------------
        ['Fees & Payment', 'How much does a barangay document cost?', 'The fee depends on the document you need. Open Document Requests and select your document to check the current fee. Some documents may be free.'],
        ['Fees & Payment', 'How do I pay for my document?', 'Online payment is not available yet. Pay the required fee at the barangay office when you claim your document.'],

        // ---------------------------------------------------------------
        // Complaint Management
        // ---------------------------------------------------------------
        ['Complaint Management', 'How do I file a complaint?', 'Open Complaints, choose the type of complaint, explain what happened, and enter the date and location if you know them. You can also upload a photo or other evidence. Submit your complaint and check Complaint History for updates.'],
        ['Complaint Management', 'What information do I need to provide when filing a complaint?', 'Provide a short title and explain what happened. Include the date, location, and other important details if you know them.'],
        ['Complaint Management', 'What types of complaints can I report?', "You can choose from these complaint categories:\nNoise and Disturbance\nNeighbor Dispute\nProperty Disputes\nPublic Nuisance\nEnvironmental Concern\nAnimal-Related Concern\nPeace and Order\nRoad and Public Concern\nFacility Concern\nIllegal or Unauthorized Activity\nOther Barangay Concern"],
        ['Complaint Management', 'What happens after I submit my complaint?', 'The status will first show as Pending while the barangay staff wait to review it. They may update it to In Progress, Resolved, Rejected, or Closed. You can check the status in Complaint History.'],
        ['Complaint Management', 'What does Pending mean for my complaint?', 'Your complaint has been submitted and is waiting for the barangay staff to review it.'],
        ['Complaint Management', 'What does In Progress mean for my complaint?', 'The barangay staff are working on your complaint.'],
        ['Complaint Management', 'What does Resolved mean for my complaint?', 'The barangay staff have recorded a solution to your complaint. Check the complaint details to read the update.'],
        ['Complaint Management', 'What does Rejected mean for my complaint?', 'The barangay staff did not approve or proceed with your complaint. Check their remarks to understand why.'],
        ['Complaint Management', 'What does Closed mean for my complaint?', 'The barangay staff have closed your complaint. Check the complaint details to see the recorded result.'],
        ['Complaint Management', 'Can I edit or cancel my complaint after submitting it?', 'You cannot edit or cancel a complaint through the portal at this time. Contact the barangay office and provide your complaint reference number for assistance.'],
        ['Complaint Management', 'Can I upload a photo or evidence with my complaint?', 'Yes. You can upload one PDF, JPG, JPEG, or PNG file up to 5 MB.'],
        ['Complaint Management', 'How can I check my complaint status?', 'Open Complaints, go to Complaint History, and select your complaint to see its latest status and any staff remarks.'],
        ['Complaint Management', 'How will I know if the barangay staff have handled my complaint?', 'Check Complaint History for updates and the recorded result. If you need more information, contact the barangay office and provide your complaint reference number.'],
        ['Complaint Management', 'What should I do if my complaint is urgent?', 'Call the Barangay Tanod at 0926-238-3088 for immediate assistance. Do not rely on the online complaint system for emergencies.'],

        // ---------------------------------------------------------------
        // Emergency & Contacts
        // ---------------------------------------------------------------
        ['Emergency & Contacts', 'What should I do if I need immediate help or there is an emergency?', "Call the appropriate contact number directly. Do not wait for a reply through TugonBarangay.\nBarangay Tanod: 0926-238-3088\nTayud Fire Volunteers: 0956-064-3314\nBarangay Patient Transport Vehicle: 0906-082-9198"],
        ['Emergency & Contacts', 'Who should I contact for noise or disturbance?', 'Call the Barangay Tanod at 0926-238-3088.'],
        ['Emergency & Contacts', 'Who should I contact for a neighbor or property dispute?', 'Call the Barangay Tanod at 0926-238-3088 for assistance.'],
        ['Emergency & Contacts', 'Who should I contact for a peace and order concern?', 'Call the Barangay Tanod at 0926-238-3088.'],
        ['Emergency & Contacts', 'Who should I contact if there is a fire?', 'Call Tayud Fire Volunteers at 0956-064-3314.'],
        ['Emergency & Contacts', 'Who should I contact if a patient needs transport?', 'Call the Barangay Patient Transport Vehicle at 0906-082-9198.'],

        // ---------------------------------------------------------------
        // System Assistance
        // ---------------------------------------------------------------
        ['System Assistance', 'How do I use the resident dashboard?', 'Use the menu to open Overview, Document Requests, Complaints, Notifications, Profile, or BantayBot. Some services require a verified account.'],
        ['System Assistance', 'Where can I check my document request history?', 'Open Document Requests and go to your request history. You can check your request status, details, staff messages, and whether you need to correct anything.'],
        ['System Assistance', 'Where can I check my complaint history?', 'Open Complaints and find Complaint History. Select a complaint to see its status, details, uploaded evidence, staff messages, and recorded result.'],
        ['System Assistance', 'How do I check my notifications?', 'Open Notifications to see updates about your document requests and complaints. You can mark notifications as read, mark all as read, or delete them.'],
        ['System Assistance', 'How do I give feedback about a barangay service?', 'Open Share Feedback, choose the service you want to rate, and give it a score from 1 to 5. You can also leave a comment.'],
        ['System Assistance', 'How can I ask barangay staff for help through BantayBot?', 'After BantayBot answers, select Ask Barangay Staff if you need further help. Your question will be sent for follow-up, and the system will provide a reference number.'],
        ['System Assistance', 'What should I do if BantayBot cannot answer my question?', 'Try asking your question using different words. If BantayBot still cannot answer, select Ask Barangay Staff to request help from the barangay staff.'],
        ['System Assistance', 'What should I do if TugonBarangay is not working properly?', 'Check your internet connection and try again. If the problem continues, select Ask Barangay Staff in BantayBot or email barangay@tugonbarangay.gov.ph with a description of the problem.'],
        ['System Assistance', 'Why can\'t I upload my document?', 'Make sure your file is in PDF, JPG, JPEG, or PNG format and is no larger than 5 MB. Select the file and try uploading it again. If it still does not work, contact the barangay office.'],
        ['System Assistance', 'What should I do if I entered the wrong information in my document request?', 'If your request status is For Correction, update the information and select Correct and Resubmit. If your request has another status, contact the barangay office and provide your request number.'],

        // ---------------------------------------------------------------
        // Fallback / Unknown
        // ---------------------------------------------------------------
        ['Fallback / Unknown', 'What should I do if I cannot find the answer to my question?', 'Try asking your question in a different way. If BantayBot still cannot answer, select Ask Barangay Staff to get help from the barangay staff.'],
        ['Fallback / Unknown', 'Can I talk to barangay staff through TugonBarangay?', 'Yes. Select Ask Barangay Staff if you need help with your question. Your question will be recorded, and you will receive a reference number for follow-up.'],
        ['Fallback / Unknown', 'How can I contact the barangay office?', 'You can call the Barangay Tayud office at 032-423-4841 for assistance. You may also visit the barangay office from Monday to Friday, 8:00 AM to 5:00 PM.'],
    ];

    private const CEB_STOP_WORDS = [
        'ang', 'ug', 'og', 'sa', 'nga', 'mga', 'ba', 'ko', 'ka', 'ni', 'na', 'ay',
        'unsa', 'unsay', 'unsang', 'giunsa', 'asa', 'kinsa', 'ngano', 'nganong', 'kanus',
        'ako', 'akong', 'imo', 'imong', 'nako', 'nimo', 'kay', 'lang', 'usab', 'pwede',
        'mahimo', 'naa', 'adunay', 'kini', 'kana', 'niini', 'kung', 'para', 'gikan',
        'sama', 'ug', 'o', 'pa', 'man', 'unsaon', 'ngadto', 'kamo', 'ikaw',
    ];

    /**
     * Bisaya (Cebuano) translations, keyed by the English question above.
     * Each value is [question_ceb, answer_ceb].
     * Portal menu and button names (Document Requests, Complaints, Ask Barangay Staff,
     * status names like Pending / For Correction) are intentionally kept in English
     * because that is how they appear in the portal interface.
     */
    private const BISAYA = [
        // General Information
        'What can BantayBot do?' => ['Unsa ang mahimo sa BantayBot?', 'Ang BantayBot motubag sa komon nga mga pangutana bahin sa TugonBarangay, account sa residente, mga hangyo sa dokumento, mga reklamo, ug mga serbisyo sa barangay. Kung dili makatubag ang BantayBot sa imong pangutana, gamita ang Ask Barangay Staff aron ipadala kini alang sa follow-up.'],
        'What services are available in TugonBarangay?' => ['Unsa nga mga serbisyo ang anaa sa TugonBarangay?', 'Ang mga residente makarehistro ug maka-manage sa ilang profile, makahangyo og mga dokumento sa barangay, makasubay sa ilang mga hangyo sa dokumento, makapasaka og reklamo uban ang ebidensya, makakita og mga notification, ug makapangutana sa BantayBot. Ang pagkaanaa sa pipila ka serbisyo nagdepende sa verification sa imong account.'],
        'What is TugonBarangay?' => ['Unsa ang TugonBarangay?', 'Ang TugonBarangay mao ang portal sa mga residente sa barangay para sa online nga mga hangyo sa serbisyo, pagreport og reklamo, impormasyon sa account, ug mga update bahin sa serbisyo.'],
        'Where is the barangay office?' => ['Asa ang opisina sa barangay?', 'Ang opisina sa barangay anaa sa Purok 2 Calachuchi, Tayud, Consolacion, Cebu, 6001.'],
        'What are the barangay office hours?' => ['Unsa ang oras sa opisina sa barangay?', 'Ang oras sa opisina gikan Lunes hangtod Biyernes, 8:00 AM hangtod 5:00 PM. Pangutan-a ang opisina sa barangay bahin sa iskedyul sa mga holiday.'],

        // Account & Verification
        'How do I create an account?' => ['Unsaon nako paghimo og account?', 'Pilia ang Register sa sign-in page ug isulod ang imong impormasyon isip residente. Ang imong first name, last name, petsa sa pagkahimugso, sex, ug purok kinahanglan motugma sa barangay registry. Gamit og email address nga wala pa gigamit sa lain nga account sa portal. Himoa ang imong password nga labing menos walo ka karakter, lakip ang uppercase ug lowercase nga letra, usa ka numero, ug usa ka simbolo. Ang imong registration maghulat sa verification sa barangay.'],
        'Which details must match the barangay registry?' => ['Unsang mga detalye ang kinahanglan motugma sa barangay registry?', 'Gitandi sa registration check ang imong first name, last name, petsa sa pagkahimugso, sex, ug purok sa usa ka rekord sa registry. Kung dili madawat sa form ang imong mga detalye, kontaka ang opisina sa barangay para sa tabang.'],
        'Can I register multiple accounts using my name or the same barangay registry record?' => ['Pwede ba ko mo-register og daghang account gamit ang akong ngalan o parehas nga rekord sa barangay registry?', 'Palihug paghimo lang og usa ka account kada residente. Gitandi sa registration ang imong first name, last name, petsa sa pagkahimugso, sex, ug purok sa usa ka rekord sa registry, ug ang matag account kinahanglan adunay lahi nga email address. Wala pa gibabagan sa portal ang ikaduhang account nga parehas ang rekord sa registry, busa posible nga maka-submit og doble nga registration ug maghulat kini sa verification sa barangay. Kung nakarehistro na ka o dili ka makasulod sa imong account, kontaka ang barangay@tugonbarangay.gov.ph para sa tabang imbes nga maghimo og lain nga account.'],
        'Can I request a document or file a complaint while my account is pending?' => ['Makahangyo ba ko og dokumento o makapasaka og reklamo samtang pending pa ang akong account?', 'Dili. Ang mga hangyo sa dokumento, pag-resubmit sa correction, ug pagpasaka og reklamo nanginahanglan og verified nga account. Makasulod ka ug makita ang imong status samtang gisusi pa sa staff ang imong registration.'],
        'What information can I change in my profile?' => ['Unsang impormasyon ang akong mabag-o sa akong profile?', 'Ablihi ang Profile aron ma-update ang imong mobile number ug address sa balay o dalan. Dili nimo mabag-o sa portal ang imong ngalan, petsa sa pagkahimugso, sex, purok, o email. Kontaka ang opisina sa barangay kung kinahanglan i-correct kini nga mga detalye.'],
        'Can I change my account email address?' => ['Mabag-o ba nako ang email address sa akong account?', 'Dili pa mabag-o ang email address sa profile page sa residente. Kontaka ang barangay@tugonbarangay.gov.ph para sa tabang sa account.'],
        'Why do I need to verify my account?' => ['Ngano nga kinahanglan nako i-verify ang akong account?', 'Ang verification makatabang aron makumpirma nga ang account iya sa usa ka residente sa barangay. Ang pipila ka serbisyo, lakip ang mga hangyo sa dokumento ug pagpasaka og reklamo, nanginahanglan og verified nga account.'],
        'How long does account verification take?' => ['Unsa ka dugay ang account verification?', 'Ang verification gisusi sa mga personnel sa barangay. Walay gipatik nga takdang oras sa portal; susiha ang status sa imong account ug kontaka ang opisina kung pending gihapon kini.'],
        'Why is my account still pending verification?' => ['Ngano nga pending pa gihapon ang verification sa akong account?', 'Basin naghulat pa ang imong registration sa review sa staff, o ang pipila ka detalye kinahanglan pa matandi sa barangay registry. Siguroha nga husto ang imong gi-submit nga impormasyon ug kontaka ang opisina kung kinahanglan nimo og tabang.'],
        'What should I do if my registration is rejected?' => ['Unsay buhaton nako kung gi-reject ang akong registration?', 'Basaha ang rason sa pag-reject nga gipakita uban sa status sa imong account. Kung gituohan nimo nga husto ang impormasyon o kinahanglan nimo og tabang sa pag-correct niini, kontaka ang opisina sa barangay sa dili pa ka mo-register pag-usab.'],
        'I forgot my password. What should I do?' => ['Nakalimot ko sa akong password. Unsay buhaton nako?', 'I-click ang “Forgot Password” sa login page ug sunda ang mga instruksyon aron ma-reset ang imong password.'],

        // Privacy & Security
        'Is my personal information safe in TugonBarangay?' => ['Luwas ba ang akong personal nga impormasyon sa TugonBarangay?', 'Gipanalipdan sa TugonBarangay ang imong account ug personal nga impormasyon. Luwas nga gitipigan ang imong password. Itago ang imong password ug ayaw ipaambit kang bisan kinsa.'],
        'Why do I need to provide my personal information?' => ['Ngano nga kinahanglan nako ihatag ang akong personal nga impormasyon?', 'Ang imong impormasyon makatabang sa barangay aron makumpirma kung kinsa ka ug maproseso ang imong mga hangyo sa dokumento ug mga reklamo. Siguroha nga husto ang imong gihatag nga impormasyon.'],
        'Who can see my personal information?' => ['Kinsa ang makakita sa akong personal nga impormasyon?', 'Ang awtorisadong staff sa barangay makakita sa impormasyon nga gikinahanglan aron maproseso ang imong mga hangyo ug reklamo. Itago ang imong password ug detalye sa account.'],
        'Are my uploaded documents kept private?' => ['Pribado ba ang akong gi-upload nga mga dokumento?', 'Ang imong gi-upload nga mga dokumento gitipigan sa sistema ug dili makita pinaagi sa publiko nga link. Ablihi kini pinaagi sa imong account, ug ayaw ipaambit ang imong password sa uban.'],

        // Document Requirements
        'What documents can I request through TugonBarangay?' => ['Unsang mga dokumento ang akong mahangyo pinaagi sa TugonBarangay?', "Makita nimo ang anaa nga mga dokumento sa Document Requests page. Lakip niini:\nBarangay Clearance\nBarangay Certificate\nCertificate of Residency\nCertificate of Indigency\nBusiness Clearance\nCertificate of Good Moral Character\nFirst-Time Job Seeker Certification\nFencing Permit\nConstruction Permit\nCedula"],
        'Where can I see the requirements and fees for a document?' => ['Asa nako makita ang mga requirement ug bayranan sa dokumento?', "Ablihi ang Document Requests.\nPilia ang dokumento nga imong gikinahanglan.\nSusiha ang form para sa mga requirement ug bayranan.\nSunda ang mga instruksyon nga gipakita sa page."],
        'What are the requirements for Barangay Clearance?' => ['Unsa ang mga requirement sa Barangay Clearance?', 'Kinahanglan ka mohatag og Purok Certificate. Pun-a ang form ug i-upload ang uban pang gikinahanglan nga file nga gipakita sa page. Susiha ang form para sa pinakabag-o nga mga requirement ug bayranan.'],
        'What are the requirements for a Certificate of Residency?' => ['Unsa ang mga requirement sa Certificate of Residency?', 'Kinahanglan ka mohatag og Purok Certificate. Pun-a ang form ug i-upload ang uban pang gikinahanglan nga file nga gipakita sa page. Susiha ang form para sa pinakabag-o nga mga requirement ug bayranan.'],
        'What are the requirements for a Certificate of Indigency?' => ['Unsa ang mga requirement sa Certificate of Indigency?', 'Kinahanglan ka mohatag og Purok Certificate. Pun-a ang form ug i-upload ang uban pang gikinahanglan nga file nga gipakita sa page. Susiha ang form para sa pinakabag-o nga mga requirement ug bayranan.'],
        'What are the requirements for Business Clearance?' => ['Unsa ang mga requirement sa Business Clearance?', "Ang mga requirement nagdepende kung nag-apply ka ba og bag-ong Business Clearance o nag-renew sa existing. Kini nga mga requirement temporaryo ug mahimong mausab.\n\nPara sa Bag-ong Aplikasyon:\nApplication Form\nPurok Certification\nCedula\nValid ID sa Aplikante\nDTI o SEC Registration\nLarawan sa Negosyo\n\nPara sa Renewal:\nApplication Form\nCedula\nKaraang Business Clearance\n\nPalihug susiha ang form o kontaka ang opisina sa barangay sa 032-423-4841 para sa pinakabag-o nga mga requirement ug angay nga bayranan."],
        'How much is the Business Clearance fee?' => ['Pila ang bayranan sa Business Clearance?', 'Susihon sa barangay secretary ang klase sa negosyo ug iyang ipahibalo ang angay nga bayranan. Ihatag ang kantidad human masusi ang mga requirement ug klase sa Business Clearance. Kung naay pangutana, kontaka ang opisina sa barangay sa 032-423-4841.'],
        'What are the requirements for a Certificate of Good Moral Character?' => ['Unsa ang mga requirement sa Certificate of Good Moral Character?', 'Kinahanglan ka mohatag og Purok Certificate. Pun-a ang application form ug i-upload ang gikinahanglan nga mga dokumento nga gipakita sa page. Palihug timan-i nga kini nga sertipiko dili ihatag sa mga aplikante nga naapil sa nagpadayon o wala pa masulbad nga kaso sa reklamo sa barangay. Parehas ang pagpugong alang sa Barangay Clearance. Susiha ang form para sa pinakabag-o nga mga requirement ug bayranan.'],
        'What are the requirements for a First-Time Job Seeker Certification?' => ['Unsa ang mga requirement sa First-Time Job Seeker Certification?', 'Pun-a ang form ug i-upload ang gikinahanglan nga mga file. Karon, ang form nangayo og Purok Certificate ug diploma. Susiha ang form para sa pinakabag-o nga mga requirement ug bayranan.'],
        'Can I request a First-Time Job Seeker Certification more than once?' => ['Pwede ba nako hangyoon ang First-Time Job Seeker Certification labaw pa sa makausa?', 'Kini nga dokumento alang sa makausa lang nga paggamit. Dili motugot ang sistema og lain nga hangyo kung naa na kay usa, gawas kung gi-reject ang imong nahaunang hangyo. Kung naay pangutana, kontaka ang opisina sa barangay.'],
        'What are the requirements for a Cedula?' => ['Unsa ang mga requirement sa Cedula?', 'Kinahanglan ka mopakita og valid ID aron masusi sa staff sa barangay ang imong impormasyon ug masiguro nga husto ang spelling sa imong ngalan. Dili kinahanglan ang Purok Certificate.'],
        'How much does a Cedula cost?' => ['Pila ang bayranan sa Cedula?', 'Ang minimum nga bayranan kay ₱78 para sa regular nga aplikante ug ₱6 para sa senior citizen. Naay 2% nga dugang matag bulan sugod sa Marso, samtang walay dugang sa Enero ug Pebrero. Ang eksaktong bayranan ipahibalo pinaagi sa notification human maproseso sa staff sa barangay ang imong hangyo.'],
        'What are the requirements for a Fencing Permit?' => ['Unsa ang mga requirement sa Fencing Permit?', "Kinahanglan nimo ang mosunod:\nPurok Certificate\nFencing Clearance\n\nSusihon sa barangay councilor ang propiedad sa dili pa ma-release ang permit."],
        'How much does a Fencing Permit cost?' => ['Pila ang bayranan sa Fencing Permit?', 'Ang minimum nga bayranan kay ₱530, lakip ang ₱30 para sa document stamps. Ang katapusang kantidad nagdepende sa klase sa propiedad (residential, commercial, o industrial) ug sa materyales sa bakod (concrete o light materials). Ang eksaktong bayranan ipahibalo pinaagi sa sistema kung aprobado na ug andam na i-release ang imong hangyo.'],
        'How long does it take to process a Fencing Permit?' => ['Unsa ka dugay ang pagproseso sa Fencing Permit?', 'Kinahanglan susihon sa barangay councilor ang propiedad. Ang pagproseso mahimong 1 hangtod 7 ka adlaw, depende sa iskedyul sa inspeksyon ug sa availability sa staff.'],
        'What are the requirements for a Construction Permit?' => ['Unsa ang mga requirement sa Construction Permit?', 'Kinahanglan nimo og Purok Certificate. Kinahanglan susihon sa barangay councilor ang propiedad, ug susihon sa barangay secretary ang uban pang requirement sa dili pa i-release ang permit.'],
        'How much does a Construction Permit cost?' => ['Pila ang bayranan sa Construction Permit?', 'Ang bayranan nagdepende kung residential, commercial, o industrial ang konstruksyon. Ang eksaktong bayranan ipahibalo pinaagi sa sistema kung aprobado na ug andam na i-release ang imong hangyo.'],
        'How long does it take to process a Construction Permit?' => ['Unsa ka dugay ang pagproseso sa Construction Permit?', 'Kinahanglan unang susihon sa barangay councilor ang propiedad. Kung available ang councilor, mahimong mas dali ang inspeksyon. Human sa inspeksyon, susihon sa secretary ang mga requirement sa dili pa i-release ang permit. Ang pagproseso mahimong molungtad hangtod 7 ka adlaw.'],

        // Document Request
        'What is a barangay document?' => ['Unsa ang dokumento sa barangay?', 'Ang dokumento sa barangay usa ka opisyal nga papel nga gi-isyu sa barangay para sa usa ka piho nga katuyoan.'],
        'How do I request a document online?' => ['Giunsa nako paghangyo og dokumento online?', 'Ablihi ang Document Requests, pilia ang dokumento nga imong gikinahanglan, pun-a ang form, i-upload ang gikinahanglan nga mga file, ug i-submit ang imong hangyo.'],
        'What information do I need to provide?' => ['Unsang impormasyon ang kinahanglan nako ihatag?', 'Ihatag ang impormasyon nga gipangayo sa form. Mahimong naa niini ang imong tibuok ngalan, address, katuyoan sa hangyo, ug uban pang detalye. Mahimo usab nga kinahanglan nimo i-upload ang Purok Certificate o uban pang gikinahanglan nga file.'],
        'What are the requirements for my document request?' => ['Unsa ang mga requirement sa akong hangyo sa dokumento?', 'Ang mga requirement nagdepende sa dokumento nga imong gipili. Ablihi ang Document Requests ug pilia ang imong dokumento aron makita kung unsay kinahanglan nimo i-submit.'],
        'Can I upload my requirements online?' => ['Pwede ba nako i-upload online ang akong mga requirement?', 'Oo. Makapa-upload ka og PDF, JPG, JPEG, o PNG nga file. Ang matag file dili molapas sa 5 MB.'],
        'How long will my request take?' => ['Unsa ka dugay ang akong hangyo?', 'Ang oras sa pagproseso nagdepende sa imong dokumento, kakumpletohan sa imong mga requirement, ug kabug-at sa trabaho sa staff sa barangay. Susiha ang status sa imong hangyo para sa mga update.'],
        'Can I edit my request after submitting it?' => ['Mabag-o ba nako ang akong hangyo human ko mo-submit?', 'Dili nimo mabag-o ang imong hangyo samtang gisusi pa kini. Kung ang status niini kay For Correction, mahimo nimong himoon ang gihangyo nga mga kausaban ug i-submit kini pag-usab.'],
        'Can I cancel my request?' => ['Pwede ba nako i-cancel ang akong hangyo?', 'Mahimo kang mohangyo nga i-cancel ang imong hangyo sa dokumento pinaagi sa pagpili sa “Ask Barangay Staff” para sa tabang. Ang pag-cancel nagdepende sa pag-aprobar sa staff sa barangay.'],
        'Can I request different documents at the same time?' => ['Pwede ba nako hangyoon ang lain-laing dokumento sa samang higayon?', 'Mahimo nimong hangyoon ang lain-laing anaa nga dokumento, depende sa mga lagda sa sistema. Ang pipila ka dokumento, sama sa First-Time Job Seeker Certification, adunay limitasyon kung pila ka higayon nimo kini mahangyo.'],
        'What should I do if I entered the wrong information?' => ['Unsay buhaton nako kung sayop ang akong nasulod nga impormasyon?', 'Kung ang imong hangyo gimarkahan og For Correction, himoa ang gikinahanglan nga mga kausaban ug pilia ang Correct and Resubmit. Kung lahi ang status sa imong hangyo, kontaka ang opisina sa barangay ug ihatag ang imong request number.'],

        // Request Status
        'How can I check my request status?' => ['Giunsa nako pagsusi sa status sa akong hangyo?', 'Ablihi ang Document Requests, adto sa Request History, ug pilia ang imong hangyo aron makita ang status ug bisan unsang mensahe gikan sa staff sa barangay.'],
        'What does Pending mean?' => ['Unsay buot ipasabot sa Pending?', 'Na-submit na ang imong hangyo ug naghulat nga susihon sa staff sa barangay.'],
        'What does Under Review mean?' => ['Unsay buot ipasabot sa Under Review?', 'Gisusi sa staff sa barangay ang imong impormasyon ug gi-upload nga mga file.'],
        'What does Processing mean?' => ['Unsay buot ipasabot sa Processing?', 'Nasusi na ang imong mga requirement, ug giandam na sa staff ang imong dokumento.'],
        'What does For Correction mean?' => ['Unsay buot ipasabot sa For Correction?', 'Kinahanglan nimo i-correct ang imong impormasyon o mag-upload og bag-ong file. Basaha ang mensahe sa staff, himoa ang mga kausaban, ug pilia ang Correct and Resubmit.'],
        'What does Rejected mean?' => ['Unsay buot ipasabot sa Rejected?', 'Wala giaprobahan ang imong hangyo. Basaha ang mensahe sa staff aron makita ang rason kung nganong gi-reject kini.'],
        'What does Ready for Release mean?' => ['Unsay buot ipasabot sa Ready for Release?', 'Andam na nga kuhaon ang imong dokumento sa opisina sa barangay. Susiha ang mga instruksyon sa dili pa moadto.'],
        'What does Completed mean?' => ['Unsay buot ipasabot sa Completed?', 'Na-release na ang imong dokumento, ug gimarkahan na sa staff sa barangay nga kompleto na ang imong hangyo.'],
        'Why was my request rejected?' => ['Ngano nga gi-reject ang akong hangyo?', 'Susiha ang detalye sa imong hangyo ug basaha ang mensahe sa staff aron makita ang rason. Kontaka ang opisina sa barangay kung kinahanglan nimo og tabang sa pagsabot niini.'],

        // Document Release
        'Where can I claim my document?' => ['Asa nako makuha ang akong dokumento?', 'Makuha nimo ang imong dokumento sa opisina sa barangay kung ang status niini kay Ready for Release. Sunda ang mga instruksyon sa pagkuha nga gihatag sa staff.'],
        'What should I bring when claiming my document?' => ['Unsay dad-on nako kung kuhaon ang akong dokumento?', 'Dad-a ang valid ID o screenshot sa imong hangyo. Aron mahibal-an kung naay lain pang kinahanglan, tawag sa (032) 423-4841 o pilia ang Ask Barangay Staff.'],
        'Can someone else claim my document for me?' => ['Pwede ba ang lain nga tawo mokuha sa akong dokumento para nako?', "Oo. Ang tawo nga mokuha sa imong dokumento kinahanglan mohatag sa mosunod:\nAuthorization letter gikan sa tag-iya sa dokumento\nPhotocopy sa valid ID sa tag-iya nga naay tulo ka pirma\nIyang kaugalingong valid ID nga naay tulo ka pirma\n\nSiguroha nga andam ang tanang gikinahanglan nga dokumento sa dili pa moadto sa opisina sa barangay. Aron mahibal-an kung naay lain pang kinahanglan, tawag sa (032) 423-4841 o pilia ang Ask Barangay Staff."],

        // Fees & Payment
        'How much does a barangay document cost?' => ['Pila ang bayranan sa dokumento sa barangay?', 'Ang bayranan nagdepende sa dokumento nga imong gikinahanglan. Ablihi ang Document Requests ug pilia ang imong dokumento aron makita ang kasamtangang bayranan. Ang pipila ka dokumento mahimong libre.'],
        'How do I pay for my document?' => ['Unsaon nako pagbayad sa akong dokumento?', 'Wala pay online payment. Bayri ang gikinahanglan nga bayranan sa opisina sa barangay kung kuhaon nimo ang imong dokumento.'],

        // Complaint Management
        'How do I file a complaint?' => ['Giunsa nako pagpasaka og reklamo?', 'Ablihi ang Complaints, pilia ang klase sa reklamo, ipasabot kung unsay nahitabo, ug isulod ang petsa ug lugar kung nahibal-an nimo. Mahimo ka usab nga mag-upload og litrato o uban pang ebidensya. I-submit ang imong reklamo ug susiha ang Complaint History para sa mga update.'],
        'What information do I need to provide when filing a complaint?' => ['Unsang impormasyon ang kinahanglan nako ihatag kung mopasaka og reklamo?', 'Ihatag ang mubo nga titulo ug ipasabot kung unsay nahitabo. Apil-a ang petsa, lugar, ug uban pang importanteng detalye kung nahibal-an nimo.'],
        'What types of complaints can I report?' => ['Unsang klase sa reklamo ang akong mahimong i-report?', "Makapili ka niini nga mga kategorya sa reklamo:\nNoise and Disturbance\nNeighbor Dispute\nProperty Disputes\nPublic Nuisance\nEnvironmental Concern\nAnimal-Related Concern\nPeace and Order\nRoad and Public Concern\nFacility Concern\nIllegal or Unauthorized Activity\nOther Barangay Concern"],
        'What happens after I submit my complaint?' => ['Unsay mahitabo human nako ma-submit ang akong reklamo?', 'Ang status una nga makita isip Pending samtang naghulat ang staff sa barangay nga susihon kini. Mahimo nilang usbon kini ngadto sa In Progress, Resolved, Rejected, o Closed. Makita nimo ang status sa Complaint History.'],
        'What does Pending mean for my complaint?' => ['Unsay buot ipasabot sa Pending sa akong reklamo?', 'Na-submit na ang imong reklamo ug naghulat nga susihon sa staff sa barangay.'],
        'What does In Progress mean for my complaint?' => ['Unsay buot ipasabot sa In Progress sa akong reklamo?', 'Gitrabaho na sa staff sa barangay ang imong reklamo.'],
        'What does Resolved mean for my complaint?' => ['Unsay buot ipasabot sa Resolved sa akong reklamo?', 'Girekord na sa staff sa barangay ang solusyon sa imong reklamo. Susiha ang detalye sa reklamo aron mabasa ang update.'],
        'What does Rejected mean for my complaint?' => ['Unsay buot ipasabot sa Rejected sa akong reklamo?', 'Wala giaprobahan o wala gipadayon sa staff sa barangay ang imong reklamo. Susiha ang ilang remarks aron masabtan ang rason.'],
        'What does Closed mean for my complaint?' => ['Unsay buot ipasabot sa Closed sa akong reklamo?', 'Gisirhan na sa staff sa barangay ang imong reklamo. Susiha ang detalye sa reklamo aron makita ang girekord nga resulta.'],
        'Can I edit or cancel my complaint after submitting it?' => ['Pwede ba nako usbon o i-cancel ang akong reklamo human ko mo-submit?', 'Dili ka makausab o maka-cancel og reklamo pinaagi sa portal karon. Kontaka ang opisina sa barangay ug ihatag ang imong complaint reference number para sa tabang.'],
        'Can I upload a photo or evidence with my complaint?' => ['Pwede ba ko mag-upload og litrato o ebidensya uban sa akong reklamo?', 'Oo. Makapa-upload ka og usa ka PDF, JPG, JPEG, o PNG nga file hangtod sa 5 MB.'],
        'How can I check my complaint status?' => ['Giunsa nako pagsusi sa status sa akong reklamo?', 'Ablihi ang Complaints, adto sa Complaint History, ug pilia ang imong reklamo aron makita ang pinakabag-o nga status ug bisan unsang remarks sa staff.'],
        'How will I know if the barangay staff have handled my complaint?' => ['Giunsa nako pagkahibalo nga gihimuan na og lakang sa staff sa barangay ang akong reklamo?', 'Susiha ang Complaint History para sa mga update ug girekord nga resulta. Kung kinahanglan nimo og dugang impormasyon, kontaka ang opisina sa barangay ug ihatag ang imong complaint reference number.'],
        'What should I do if my complaint is urgent?' => ['Unsay buhaton nako kung dinalian ang akong reklamo?', 'Tawga ang Barangay Tanod sa 0926-238-3088 para sa dayon nga tabang. Ayaw pag-depende sa online complaint system kung emergency.'],

        // Emergency & Contacts
        'What should I do if I need immediate help or there is an emergency?' => ['Unsay buhaton nako kung kinahanglan nako og dayon nga tabang o naay emergency?', "Tawga dayon ang angay nga contact number. Ayaw paghulat og tubag pinaagi sa TugonBarangay.\nBarangay Tanod: 0926-238-3088\nTayud Fire Volunteers: 0956-064-3314\nBarangay Patient Transport Vehicle: 0906-082-9198"],
        'Who should I contact for noise or disturbance?' => ['Kinsa ang kontakon nako para sa kasaba o kagubot?', 'Tawga ang Barangay Tanod sa 0926-238-3088.'],
        'Who should I contact for a neighbor or property dispute?' => ['Kinsa ang kontakon nako para sa panaglalis sa silingan o propiedad?', 'Tawga ang Barangay Tanod sa 0926-238-3088 para sa tabang.'],
        'Who should I contact for a peace and order concern?' => ['Kinsa ang kontakon nako para sa kabalaka bahin sa kalinaw ug kahusay?', 'Tawga ang Barangay Tanod sa 0926-238-3088.'],
        'Who should I contact if there is a fire?' => ['Kinsa ang kontakon nako kung naay sunog?', 'Tawga ang Tayud Fire Volunteers sa 0956-064-3314.'],
        'Who should I contact if a patient needs transport?' => ['Kinsa ang kontakon nako kung kinahanglan og transportasyon ang usa ka masakiton?', 'Tawga ang Barangay Patient Transport Vehicle sa 0906-082-9198.'],

        // System Assistance
        'How do I use the resident dashboard?' => ['Giunsa nako paggamit ang dashboard sa residente?', 'Gamita ang menu aron maabli ang Overview, Document Requests, Complaints, Notifications, Profile, o BantayBot. Ang pipila ka serbisyo nanginahanglan og verified nga account.'],
        'Where can I check my document request history?' => ['Asa nako makita ang kasaysayan sa akong mga hangyo sa dokumento?', 'Ablihi ang Document Requests ug adto sa imong request history. Makita nimo ang status sa imong hangyo, detalye, mensahe sa staff, ug kung naa bay kinahanglan nimo i-correct.'],
        'Where can I check my complaint history?' => ['Asa nako makita ang kasaysayan sa akong mga reklamo?', 'Ablihi ang Complaints ug pangitaa ang Complaint History. Pilia ang usa ka reklamo aron makita ang status, detalye, gi-upload nga ebidensya, mensahe sa staff, ug girekord nga resulta.'],
        'How do I check my notifications?' => ['Giunsa nako pagtan-aw sa akong mga notification?', 'Ablihi ang Notifications aron makita ang mga update bahin sa imong mga hangyo sa dokumento ug mga reklamo. Mahimo nimong i-mark as read ang mga notification, i-mark all as read, o papason kini.'],
        'How do I give feedback about a barangay service?' => ['Giunsa nako paghatag og feedback bahin sa serbisyo sa barangay?', 'Ablihi ang Share Feedback, pilia ang serbisyo nga imong i-rate, ug hatagi kini og score gikan 1 hangtod 5. Makasulat ka usab og komento.'],
        'How can I ask barangay staff for help through BantayBot?' => ['Giunsa nako pagpangayo og tabang sa staff sa barangay pinaagi sa BantayBot?', 'Human motubag ang BantayBot, pilia ang Ask Barangay Staff kung kinahanglan nimo og dugang tabang. Ipadala ang imong pangutana alang sa follow-up, ug hatagan ka sa sistema og reference number.'],
        'What should I do if BantayBot cannot answer my question?' => ['Unsay buhaton nako kung dili makatubag ang BantayBot sa akong pangutana?', 'Sulayi ang pagpangutana gamit ang lahi nga mga pulong. Kung dili gihapon makatubag ang BantayBot, pilia ang Ask Barangay Staff aron mangayo og tabang sa staff sa barangay.'],
        'What should I do if TugonBarangay is not working properly?' => ['Unsay buhaton nako kung dili maayo ang pag-work sa TugonBarangay?', 'Susiha ang imong internet connection ug sulayi pag-usab. Kung magpadayon ang problema, pilia ang Ask Barangay Staff sa BantayBot o i-email ang barangay@tugonbarangay.gov.ph uban ang paghulagway sa problema.'],
        'Why can\'t I upload my document?' => ['Ngano nga dili ko maka-upload sa akong dokumento?', 'Siguroha nga ang imong file kay PDF, JPG, JPEG, o PNG ug dili molapas sa 5 MB. Pilia ang file ug sulayi pag-upload pag-usab. Kung dili gihapon mo-work, kontaka ang opisina sa barangay.'],
        'What should I do if I entered the wrong information in my document request?' => ['Unsay buhaton nako kung sayop ang akong nasulod nga impormasyon sa akong hangyo sa dokumento?', 'Kung ang status sa imong hangyo kay For Correction, i-update ang impormasyon ug pilia ang Correct and Resubmit. Kung lahi ang status sa imong hangyo, kontaka ang opisina sa barangay ug ihatag ang imong request number.'],

        // Fallback / Unknown
        'What should I do if I cannot find the answer to my question?' => ['Unsay buhaton nako kung wala nako makita ang tubag sa akong pangutana?', 'Sulayi ang pagpangutana sa lahi nga paagi. Kung dili gihapon makatubag ang BantayBot, pilia ang Ask Barangay Staff aron makakuha og tabang gikan sa staff sa barangay.'],
        'Can I talk to barangay staff through TugonBarangay?' => ['Pwede ba ko makigsulti sa staff sa barangay pinaagi sa TugonBarangay?', 'Oo. Pilia ang Ask Barangay Staff kung kinahanglan nimo og tabang sa imong pangutana. Irekord ang imong pangutana, ug makadawat ka og reference number para sa follow-up.'],
        'How can I contact the barangay office?' => ['Giunsa nako pagkontak sa opisina sa barangay?', 'Mahimo ka motawag sa opisina sa Barangay Tayud sa 032-423-4841 para sa tabang. Mahimo usab ka moadto sa opisina sa barangay gikan Lunes hangtod Biyernes, 8:00 AM hangtod 5:00 PM.'],
    ];

    public function run(): void
    {
        ChatbotFaq::whereIn('question', self::RETIRED_QUESTIONS)->update(['is_active' => false]);

        foreach (self::FAQS as [$category, $question, $answer]) {
            [$questionCeb, $answerCeb] = self::BISAYA[$question] ?? [null, null];

            if ($questionCeb === null) {
                $this->command?->warn("No Bisaya translation for: {$question}");
            }

            ChatbotFaq::updateOrCreate(
                ['question' => $question],
                [
                    'category' => $category,
                    'answer' => $answer,
                    'keywords' => $this->keywordsFor($question, self::STOP_WORDS),
                    'question_ceb' => $questionCeb,
                    'answer_ceb' => $answerCeb,
                    'keywords_ceb' => $questionCeb
                        ? $this->keywordsFor($questionCeb, self::CEB_STOP_WORDS)
                        : null,
                    'is_active' => true,
                ],
            );
        }
    }

    /**
     * Build a keyword list from a question, ignoring short and stop words.
     */
    private function keywordsFor(string $question, array $stopWords): array
    {
        return collect(preg_split('/[^a-z0-9]+/i', strtolower($question)))
            ->filter(fn(string $word) => strlen($word) > 2 && !in_array($word, $stopWords, true))
            ->unique()
            ->values()
            ->all();
    }
}