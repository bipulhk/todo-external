/**
 * ――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――
 * Class Name      : uNI_RTFEmailSender
 * Author          : <YourName>
 * Created Date    : Jan 19, 2026
 * Last Modified By: <YourName>
 * Last Modified On: Jan 19, 2026
 * Description     : This class implements for......
 *  
 * Change History  :
 *  Date          │   Author     │   Change
 * ――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――
 *  Jan 19, 2026  │ <YourName>   │ Initial version
 * ――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――
 */


// public class uNI_RTFEmailSender {

// 	@AuraEnabled(cacheable=true)
// 	public static void doSomething() {
// 		// Your logic here
// 	}

// }


public with sharing class uNI_RTFEmailSender {
    public class Request {
        @InvocableVariable(required=true)
        public List<String> targetUserIds;

        @InvocableVariable
        public List<String> ccUserIds;

        @InvocableVariable(required=true)
        public String subject;

        @InvocableVariable(required=true)
        public String htmlBody;

        // Pass contentVersionIds (from File Upload or ContentDocumentLink)
        @InvocableVariable
        public List<Id> contentVersionIds;

        // Optional: used only for logging/debug context if you want later
        @InvocableVariable
        public Id relatedRecordId;

        // Optional: org-wide email address override (preferred sender)
        @InvocableVariable
        public Id orgWideEmailAddressId;

        // Optional: org-wide email address (Address field value) if Id not provided
        @InvocableVariable
        public String orgWideEmailAddress;
    }

    public class Response {
        @InvocableVariable
        public Boolean success;

        @InvocableVariable
        public String message;
    }

    @InvocableMethod(label='Send Email With Files' description='Sends an HTML email and attaches Salesforce Files (contentVersionIds).')
    public static List<Response> send(List<Request> requests) {
        List<Response> responses = new List<Response>();

        if (requests == null || requests.isEmpty()) {
            return responses;
        }

        for (Request req : requests) {
            Response res = new Response();
            try {
                // Basic validation
                if (req.targetUserIds == null || req.targetUserIds.isEmpty()) {
                    throw new AuraHandledException('Target User Ids are required.');
                }
                if (String.isBlank(req.subject)) {
                    throw new AuraHandledException('Subject is required.');
                }
                if (String.isBlank(req.htmlBody)) {
                    throw new AuraHandledException('Body is required.');
                }

                Messaging.SingleEmailMessage email = new Messaging.SingleEmailMessage();
                req.targetUserIds = extractValidIds(req.targetUserIds);
                req.ccUserIds = extractValidIds(req.ccUserIds);

                Set<String> allUserIds = new Set<String>();
                allUserIds.addAll(req.targetUserIds);
                if (req.ccUserIds != null) allUserIds.addAll(req.ccUserIds);

                Map<String, String> userIdToEmailMap = getUserEmailMap(allUserIds);
                List<String> toEmails = getEmailAddresses(req.targetUserIds, userIdToEmailMap);
                if (toEmails.isEmpty()) {
                    throw new AuraHandledException('No valid email addresses found for target users.');
                }
                email.setToAddresses(toEmails);
                if (req.ccUserIds != null && !req.ccUserIds.isEmpty()) {
                    List<String> ccEmails = getEmailAddresses(req.ccUserIds, userIdToEmailMap);
                    if (!ccEmails.isEmpty()) {
                        email.setCcAddresses(ccEmails);
                    }
                }
                email.setSubject(req.subject);
                email.setHtmlBody(req.htmlBody);

                // Set org-wide email address if provided (or default if available)
                Id orgWideId = resolveOrgWideEmailId(req.orgWideEmailAddressId, req.orgWideEmailAddress);
                if (orgWideId != null) {
                    email.setOrgWideEmailAddressId(orgWideId);
                }

                // Attach files (contentVersionIds -> latest ContentVersion -> EmailFileAttachment)
                List<Messaging.EmailFileAttachment> attachments = buildAttachments(extractValidIds(req.contentVersionIds));
                if (!attachments.isEmpty()) {
                    email.setFileAttachments(attachments);
                }

                // Send
                Messaging.SendEmailResult[] results = Messaging.sendEmail(new Messaging.SingleEmailMessage[] { email }, false);

                if (results != null && results.size() == 1 && results[0].isSuccess()) {
                    res.success = true;
                    res.message = 'Email sent successfully' + (attachments.isEmpty() ? '.' : (' with ' + attachments.size() + ' attachment(s).'));
                } else {
                    String err = 'Unknown error sending email.';
                    if (results != null && !results.isEmpty() && results[0].getErrors() != null && results[0].getErrors().size() > 0) {
                        err = results[0].getErrors()[0].getMessage();
                    }
                    res.success = false;
                    res.message = err;
                }
            } catch (Exception e) {
                res.success = false;
                res.message = e.getMessage();
            }
            responses.add(res);
        }

        return responses;
    }

    // Helpers

    private static Map<String, String> getUserEmailMap(Set<String> userIds) {
        Map<String, String> result = new Map<String, String>();
        if (userIds == null || userIds.isEmpty()) {
            return result;
        }
        for (User u : [
            SELECT Id, Email FROM User
            WHERE Id IN :userIds AND IsActive = true
        ]) {
            if (!String.isBlank(u.Email)) {
                result.put(String.valueOf(u.Id), u.Email);
            }
        }
        return result;
    }

    private static List<String> getEmailAddresses(List<String> userIds, Map<String, String> userIdToEmailMap) {
        List<String> emails = new List<String>();
        if (userIds == null || userIds.isEmpty()) {
            return emails;
        }
        for (String userId : userIds) {
            String email = userIdToEmailMap.get(userId);
            if (!String.isBlank(email)) {
                emails.add(email);
            }
        }
        return emails;
    }

    private static List<String> extractValidIds(List<String> inputList) {
        List<String> cleanedIds = new List<String>();

        if (inputList != null) {
            for (String entry : inputList) {
                if (String.isNotBlank(entry)) {
                    entry = entry.replace('[', '')
                                 .replace(']', '');

                    List<String> ids = entry.split(',');
                    for (String id : ids) {
                        id = id.trim();
                        if (String.isNotBlank(id)) {
                            cleanedIds.add(id);
                        }
                    }
                }
            }
        }

        return cleanedIds;
    }

    private static List<Messaging.EmailFileAttachment> buildAttachments(List<String> contentVersionIds) {
        List<Messaging.EmailFileAttachment> out = new List<Messaging.EmailFileAttachment>();
        if (contentVersionIds == null || contentVersionIds.isEmpty()) return out;

        // De-dupe and split ContentVersion vs ContentDocument ids
        Set<Id> versionIds = new Set<Id>();
        Set<Id> documentIds = new Set<Id>();
        for (String i : contentVersionIds) {
            if (String.isBlank(i)) continue;
            try {
                Id idVal = (Id)i;
                if (idVal.getSObjectType() == ContentVersion.SObjectType) {
                    versionIds.add(idVal);
                } else if (idVal.getSObjectType() == ContentDocument.SObjectType) {
                    documentIds.add(idVal);
                }
            } catch (Exception e) {
                // Ignore invalid ids
            }
        }
        if (versionIds.isEmpty() && documentIds.isEmpty()) return out;

        // Pull latest versions for documents, or explicit versions by id
        // NOTE: VersionData is a Blob; avoid attaching too many / too large files.
        List<ContentVersion> versions = [
            SELECT ContentDocumentId, Title, FileExtension, VersionData
            FROM ContentVersion
            WHERE (Id IN :versionIds) OR (IsLatest = true AND ContentDocumentId IN :documentIds)
        ];

        for (ContentVersion cv : versions) {
            Messaging.EmailFileAttachment a = new Messaging.EmailFileAttachment();
            String ext = String.isBlank(cv.FileExtension) ? '' : ('.' + cv.FileExtension);
            a.setFileName(cv.Title + ext);
            a.setBody(cv.VersionData);
            out.add(a);
        }

        return out;
    }

    private static Id resolveOrgWideEmailId(Id orgWideEmailAddressId, String orgWideEmailAddress) {
        if (orgWideEmailAddressId != null) {
            List<OrgWideEmailAddress> byId = [
                SELECT Id
                FROM OrgWideEmailAddress
                WHERE Id = :orgWideEmailAddressId
                LIMIT 1
            ];
            if (!byId.isEmpty()) return byId[0].Id;
        }

        if (!String.isBlank(orgWideEmailAddress)) {
            List<OrgWideEmailAddress> byAddress = [
                SELECT Id
                FROM OrgWideEmailAddress
                WHERE Address = :orgWideEmailAddress
                LIMIT 1
            ];
            if (!byAddress.isEmpty()) return byAddress[0].Id;
        }

        List<OrgWideEmailAddress> allowAll = [
            SELECT Id
            FROM OrgWideEmailAddress
            WHERE IsAllowAllProfiles = true AND IsVerified = true
            LIMIT 1
        ];
        if (!allowAll.isEmpty()) return allowAll[0].Id;

        return null;
    }
}
