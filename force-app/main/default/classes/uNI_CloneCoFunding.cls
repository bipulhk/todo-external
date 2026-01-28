/**
* @File Name : uNI_CloneCoFunding.cls
* @Description : Clone Co-Funding (Budget Source of Funding) rows from previous version to target version
* @Author :
* @Last Modified By :
* @Last Modified On : November 14, 2025
* @Modification Log :
*==============================================================================
* Ver | Date | Author | Modification
*==============================================================================
* 1.0 | November 14, 2025 |   | Initial Version
**/

public with sharing class uNI_CloneCoFunding {

    // ===== Request / Response DTOs =====
    public class Request {
        // IA whose Source of Funding records we want to clone
        @InvocableVariable(required=true)
        public Id individualApplicationId;

        // Version to clone FROM (e.g. "1")
        @InvocableVariable(required=true)
        public String sourceVersion;

        // Version to set on the cloned rows (already decided in Flow, e.g. "2")
        @InvocableVariable(required=true)
        public String targetVersion;

        // Reprogramming Request to associate the cloned rows to
        @InvocableVariable(required=true)
        public Id reprogrammingRequestId;
    }

    public class Response {
        @InvocableVariable public Id individualApplicationId;
        @InvocableVariable public String sourceVersion;
        @InvocableVariable public String targetVersion;
        @InvocableVariable public Id reprogrammingRequestId;
        @InvocableVariable public Integer recordsCloned;
        @InvocableVariable public List<String> errors;
    }

    // ===== Invocable entry point =====
    @InvocableMethod(label='Clone Co-Funding (previous → target version)')
    public static List<Response> run(List<Request> reqs) {
        List<Response> out = new List<Response>();
        for (Request r : reqs) {
            out.add(cloneForRequest(r));
        }
        return out;
    }

    // Helper: set targetVersion into the correct field type
    private static void setVersionFromFlow(String version,
                                           SObject rec,
                                           Schema.SObjectField fld) {
        Schema.DescribeFieldResult d = fld.getDescribe();
        Schema.DisplayType t = d.getType();

        if (version == null) {
            rec.put(fld, null);
            return;
        }

        String s = String.valueOf(version);

        try {
            if (t == Schema.DisplayType.Integer || t == Schema.DisplayType.Long) {
                rec.put(fld, Integer.valueOf(s));
            } else if (t == Schema.DisplayType.Double ||
                       t == Schema.DisplayType.Percent ||
                       t == Schema.DisplayType.Currency) {
                rec.put(fld, Decimal.valueOf(s));
            } else {
                // Text or anything else: store as String
                rec.put(fld, s);
            }
        } catch (Exception e) {
            // If parsing fails, fall back to storing as String
            rec.put(fld, s);
        }
    }

    // ===== Core logic per request =====
    private static Response cloneForRequest(Request req) {
        Response res = new Response();
        res.errors = new List<String>();
        res.recordsCloned = 0;

        if (req == null ||
            req.individualApplicationId == null ||
            String.isBlank(req.sourceVersion) ||
            String.isBlank(req.targetVersion) ||
            req.reprogrammingRequestId == null) {

            res.errors.add('Missing individualApplicationId, sourceVersion, targetVersion, or reprogrammingRequestId.');
            return res;
        }

        res.individualApplicationId = req.individualApplicationId;
        res.sourceVersion = req.sourceVersion;
        res.targetVersion = req.targetVersion;
        res.reprogrammingRequestId = req.reprogrammingRequestId;

        // 1) Query source records for IA + sourceVersion
        List<uNI_Budget_Summary_Source_of_Funding__c> srcRows = [
            SELECT Id,
                   Name,
                   uNI_CallForProposals__c,
                   is_Full_Row_Span__c,
                   Amount_USD__c,
                   Notes__c,
                   uNI_IndividualApplication__c,
                   uNI_SourcesOfCofunding__c,
                   uNI_InKinds__c,
                   uNI_Cash__c,
                   uNI_Comments__c,
                   uNI_Total__c,
                   uNI_Type__c,
                   uNI_version__c,
                   uNI_ReprogrammingRequest__c
            FROM uNI_Budget_Summary_Source_of_Funding__c
            WHERE uNI_IndividualApplication__c = :req.individualApplicationId
              AND uNI_version__c = :req.sourceVersion
        ];

        if (srcRows.isEmpty()) {
            // Nothing to clone; not an error, just 0 results.
            return res;
        }

        // 2) Clone each record, keep IA, set Reprogramming Request, set targetVersion
        List<uNI_Budget_Summary_Source_of_Funding__c> clones =
            new List<uNI_Budget_Summary_Source_of_Funding__c>();

        for (uNI_Budget_Summary_Source_of_Funding__c row : srcRows) {
            uNI_Budget_Summary_Source_of_Funding__c n =
                row.clone(false, false, false);

            // Ensure we keep the same IA
            n.uNI_IndividualApplication__c = req.individualApplicationId;

            // Link to the Reprogramming Request passed from Flow
            n.uNI_ReprogrammingRequest__c = req.reprogrammingRequestId;

            // Set version from Flow (targetVersion)
            setVersionFromFlow(
                req.targetVersion,
                n,
                uNI_Budget_Summary_Source_of_Funding__c.uNI_version__c
            );

            clones.add(n);
        }

        // 3) Insert cloned records (partial success)
        if (!clones.isEmpty()) {
            Database.SaveResult[] srList = Database.insert(clones, false);
            for (Integer i = 0; i < srList.size(); i++) {
                Database.SaveResult sr = srList[i];
                if (sr.isSuccess()) {
                    res.recordsCloned++;
                } else if (sr.getErrors() != null && !sr.getErrors().isEmpty()) {
                    res.errors.add(
                        'Budget Source clone failed (source Id: ' + srcRows[i].Id + '): ' +
                        sr.getErrors()[0].getMessage()
                    );
                }
            }
        }

        return res;
    }
}