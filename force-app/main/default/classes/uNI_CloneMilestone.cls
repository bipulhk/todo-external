/**
* @File Name : uNI_CloneMilestone.cls
* @Description :
* @Author :
* @Last Modified By :
* @Last Modified On : November 21, 2025
* @Modification Log :
*==============================================================================
* Ver | Date | Author | Modification
*==============================================================================
* 1.0 | November 21, 2025 |   | Initial Version
**/

// Invocable clone helper used by Create/Return Reprogramming flows.
public without sharing class uNI_CloneMilestone {

    public class Request {
        @InvocableVariable(required=true)
        public Id individualApplicationId;

        @InvocableVariable(required=true)
        public String sourceVersion;

        @InvocableVariable(required=true)
        public String targetVersion;

        @InvocableVariable
        public Id logframeId;
    }

    public class Response {
        @InvocableVariable public Id individualApplicationId;
        @InvocableVariable public String sourceVersion;
        @InvocableVariable public String targetVersion;
        @InvocableVariable public Integer recordsCloned;
        @InvocableVariable public List<String> errors;
    }

    @InvocableMethod(label='Clone Milestones (previous → target version)')
    public static List<Response> run(List<Request> requests) {
        List<Response> results = new List<Response>();
        if (requests == null) {
            return results;
        }
        for (Request req : requests) {
            results.add(cloneMilestones(req));
        }
        return results;
    }

    private static Response cloneMilestones(Request req) {
        Response res = new Response();
        res.errors = new List<String>();

        if (req == null ||
            req.individualApplicationId == null ||
            String.isBlank(req.sourceVersion) ||
            String.isBlank(req.targetVersion)) {
            res.errors.add('Missing individualApplicationId, sourceVersion, or targetVersion.');
            return res;
        }

        res.individualApplicationId = req.individualApplicationId;
        res.sourceVersion = req.sourceVersion;
        res.targetVersion = req.targetVersion;

        Id iaId = req.individualApplicationId;

        uNI_Logframe__c sourceLogframe = resolveLogframe(iaId, req.sourceVersion);
        if (sourceLogframe == null) {
            res.errors.add('No logframe found for source version ' + req.sourceVersion);
            return res;
        }

        uNI_Logframe__c targetLogframe = resolveLogframe(iaId, req.targetVersion);
        if (targetLogframe == null) {
            if (req.logframeId != null) {
                targetLogframe = new uNI_Logframe__c(Id = req.logframeId, uNI_LogframeVersion__c = req.targetVersion);
            } else {
                res.errors.add('No logframe found for target version ' + req.targetVersion);
                return res;
            }
        }

        Map<Id, String> sourceOutputMap = new Map<Id, String>();
        for (uNI_PortfolioOutput__c output : [
            SELECT Id, uNI_OutputTitle__c
            FROM uNI_PortfolioOutput__c
            WHERE uNI_Logframe__c = :sourceLogframe.Id
        ]) {
            sourceOutputMap.put(output.Id, output.uNI_OutputTitle__c);
        }
        Map<String, Id> targetOutputMap = new Map<String, Id>();
        for (uNI_PortfolioOutput__c output : [
            SELECT Id, uNI_OutputTitle__c
            FROM uNI_PortfolioOutput__c
            WHERE uNI_Logframe__c = :targetLogframe.Id
        ]) {
            targetOutputMap.put(output.uNI_OutputTitle__c, output.Id);
        }

        Map<Id, String> sourceOutcomeMap = new Map<Id, String>();
        for (uNI_PortfolioOutcomes__c outcome : [
            SELECT Id, Name
            FROM uNI_PortfolioOutcomes__c
            WHERE uNI_Logframe__c = :sourceLogframe.Id
        ]) {
            sourceOutcomeMap.put(outcome.Id, outcome.Name);
        }
        Map<String, Id> targetOutcomeMap = new Map<String, Id>();
        for (uNI_PortfolioOutcomes__c outcome : [
            SELECT Id, Name
            FROM uNI_PortfolioOutcomes__c
            WHERE uNI_Logframe__c = :targetLogframe.Id
        ]) {
            targetOutcomeMap.put(outcome.Name, outcome.Id);
        }

        Set<Id> sourceOutputIds = new Set<Id>(sourceOutputMap.keySet());
        Set<Id> sourceOutcomeIds = new Set<Id>(sourceOutcomeMap.keySet());

        if (sourceOutputIds.isEmpty() && sourceOutcomeIds.isEmpty()) {
            res.errors.add('Source logframe has no outputs or outcomes to clone.');
            return res;
        }

        List<uNI_Milestone__c> sourceMilestones = [
            SELECT Id,
                   Name,
                   uNI_Revised_Due_Date_Year1__c,
                   uNI_Comments_from_Implementer_Year1__c,
                   uNI_Milestone_Heading__c,
                   uNI_Comments__c,
                   uNI_Outcome__c,
                   uNI_Output__c,
                   uNI_Milestone_Date__c,
                   uNI_Status__c,
                   uNI_Revised_Due_Date_Year2__c,
                   uNI_Revised_Due_Date_Year3__c,
                   uNI_Comments_from_Implementer_Year2__c,
                   uNI_Comments_from_Implementer_Year3__c,
                   uNI_LogframeVersion__c,
                   uNI_CompletionDate__c,
                   uNI_BehindSchedule__c,
                   uNI_Description__c,
                   uNI_Milestone_Title__c
            FROM uNI_Milestone__c
            WHERE (uNI_Output__c IN :sourceOutputIds OR uNI_Outcome__c IN :sourceOutcomeIds)
        ];

        if (sourceMilestones.isEmpty()) {
            res.recordsCloned = 0;
            return res;
        }

        List<uNI_Milestone__c> clones = new List<uNI_Milestone__c>();
        for (uNI_Milestone__c sourceMilestone : sourceMilestones) {
            uNI_Milestone__c clone = sourceMilestone.clone(false, false, false);
            clone.uNI_LogframeVersion__c = req.targetVersion;

            Id targetOutputId = rebindByLabel(
                sourceMilestone.uNI_Output__c,
                sourceOutputMap,
                targetOutputMap
            );
            clone.uNI_Output__c = targetOutputId;

            Id targetOutcomeId = rebindByLabel(
                sourceMilestone.uNI_Outcome__c,
                sourceOutcomeMap,
                targetOutcomeMap
            );
            clone.uNI_Outcome__c = targetOutcomeId;
            clones.add(clone);
        }

        Database.SaveResult[] saveResults = Database.insert(clones, false);
        Integer successCount = 0;
        for (Integer i = 0; i < saveResults.size(); i++) {
            if (saveResults[i].isSuccess()) {
                successCount++;
            } else if (saveResults[i].getErrors() != null && !saveResults[i].getErrors().isEmpty()) {
                res.errors.add(
                    'Clone failed for milestone ' + sourceMilestones[i].Id + ': ' +
                    saveResults[i].getErrors()[0].getMessage()
                );
            }
        }
        res.recordsCloned = successCount;
        return res;
    }

    private static uNI_Logframe__c resolveLogframe(Id iaId, String version) {
        List<uNI_Logframe__c> logframes = [
            SELECT Id, uNI_LogframeVersion__c
            FROM uNI_Logframe__c
            WHERE uNI_Individual_Application__c = :iaId
              AND uNI_LogframeVersion__c = :version
            ORDER BY CreatedDate DESC
            LIMIT 1
        ];
        return logframes.isEmpty() ? null : logframes[0];
    }

    private static Id rebindByLabel(
        Id sourceId,
        Map<Id, String> sourceMap,
        Map<String, Id> targetMap
    ) {
        if (sourceId == null) {
            return null;
        }
        String label = sourceMap.get(sourceId);
        if (label == null) {
            return null;
        }
        return targetMap.get(label);
    }
}