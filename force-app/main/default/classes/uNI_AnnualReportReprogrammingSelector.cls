/**
 * Invocable helper for Annual Report flow.
 *
 * Business rule:
 * - If there is an Approved Reprogramming Request for the IA,
 *   with Approved Date <= cutoff for the report year, use that RR's logframe version.
 * - If none match, return "0" so the flow falls back to IA logframe version.
 *
 * When multiple RRs match, this returns the most recent Approved Date
 * (closest to the cutoff).
 */
public with sharing class uNI_AnnualReportReprogrammingSelector {

    public class Request {
        @InvocableVariable(required=true)
        public Id individualApplicationId;

        // Reporting year (String to match flow values like "2025")
        @InvocableVariable(required=true)
        public String reportYear;

        // Optional cutoff date (if not provided, defaults to June 1 of reportYear)
        @InvocableVariable
        public Date cutoffDate;
    }

    public class Response {
        @InvocableVariable public String logframeVersion;
        @InvocableVariable public Id reprogrammingRequestId;
        @InvocableVariable public String reprogrammingRequestName;
        @InvocableVariable public Date approvedDate;
    }

    @InvocableMethod(label='Get Approved Reprogramming Version for Annual Report')
    public static List<Response> run(List<Request> requests) {
        List<Response> results = new List<Response>();
        if (requests == null || requests.isEmpty()) {
            return results;
        }

        for (Request req : requests) {
            Response res = new Response();
            // Default: no qualifying RR found, flow will use IA logframe version instead.
            res.logframeVersion = '0';

            if (req == null || req.individualApplicationId == null || String.isBlank(req.reportYear)) {
                results.add(res);
                continue;
            }

            Integer yearVal;
            try {
                yearVal = Integer.valueOf(req.reportYear.trim());
            } catch (Exception e) {
                results.add(res);
                continue;
            }

            Date cutoff = req.cutoffDate != null
                ? req.cutoffDate
                : Date.newInstance(yearVal, 6, 1);

            // Get the most recent approved RR before the cutoff for this report year.
            List<uNI_ReprogrammingRequest__c> rr = [
                SELECT Id, Name, uNI_LogframeVersion__c, uNI_ApprovedDate__c
                FROM uNI_ReprogrammingRequest__c
                WHERE uNI_Investment__c = :req.individualApplicationId
                  AND uNI_Status__c = 'Approved'
                  AND uNI_AnnualReportYear__c = :req.reportYear
                  AND uNI_ApprovedDate__c != null
                  AND uNI_ApprovedDate__c <= :cutoff
                ORDER BY uNI_ApprovedDate__c DESC
                LIMIT 1
            ];

            if (!rr.isEmpty()) {
                uNI_ReprogrammingRequest__c match = rr[0];
                res.reprogrammingRequestId = match.Id;
                res.reprogrammingRequestName = match.Name;
                res.approvedDate = match.uNI_ApprovedDate__c;
                res.logframeVersion =
                    match.uNI_LogframeVersion__c == null
                        ? '0'
                        : String.valueOf(match.uNI_LogframeVersion__c);
            }

            results.add(res);
        }

        return results;
    }
}