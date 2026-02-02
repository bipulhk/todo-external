/**
* @File Name : uNI_CloneBudgetData.cls
* @Description :
* @Author :
* @Last Modified By :
* @Last Modified On : November 20, 2025
* @Modification Log :
*==============================================================================
* Ver | Date | Author | Modification
*==============================================================================
* 1.0 | November 20, 2025 |   | Initial Version
**/

/**
 * Invocable clone helper used by Create/Return Reprogramming flows.
 * Clones Summary Budgets, Expense Types, and Budget Data rows from source → target version,
 * and remaps Budget Data to the new versioned Outputs.
 */
public without sharing class uNI_CloneBudgetData {

    // ===== Request / Response DTOs =====
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
        @InvocableVariable public Integer budgetRowsCloned;
        @InvocableVariable public Integer expenseTypesCloned;
        @InvocableVariable public Integer summaryBudgetsCloned;
        @InvocableVariable public Integer portfolioOutputsCloned;
        @InvocableVariable public Integer totalRecordsCloned;
        @InvocableVariable public List<String> errors;
    }

    @InvocableMethod(label='Clone Budget Data (previous  + target version)')
    public static List<Response> run(List<Request> reqs) {
        List<Response> out = new List<Response>();
        if (reqs == null) {
            return out;
        }
        for (Request r : reqs) {
            out.add(cloneForRequest(r));
        }
        return out;
    }

    // ===== Helper models =====
    private class CloneContext {
        Map<Id, Id> summaryBudgetMap = new Map<Id, Id>();
    }

    private static Map<Id, Id> buildOutputIdMap(Id indAppId,
                                                String sourceVersion,
                                                String targetVersion) {
        Map<Id, Id> result = new Map<Id, Id>();
        if (indAppId == null || String.isBlank(sourceVersion) || String.isBlank(targetVersion)) {
            return result;
        }

        String sourceVersionValue = sourceVersion.trim();
        String targetVersionValue = targetVersion.trim();

        List<uNI_PortfolioOutput__c> srcOutputs = [
            SELECT Id, uNI_InternalSequence__c, uNI_OutputTitle__c, uNI_Version__c
            FROM uNI_PortfolioOutput__c
            WHERE uNI_IndividualApplication__c = :indAppId
              AND uNI_Version__c = :sourceVersionValue
        ];

        List<uNI_PortfolioOutput__c> targetOutputs = [
            SELECT Id, uNI_InternalSequence__c, uNI_OutputTitle__c, uNI_Version__c
            FROM uNI_PortfolioOutput__c
            WHERE uNI_IndividualApplication__c = :indAppId
              AND uNI_Version__c = :targetVersionValue
        ];

        Map<String, Id> targetBySeq = new Map<String, Id>();
        Map<String, Id> targetByTitle = new Map<String, Id>();
        for (uNI_PortfolioOutput__c t : targetOutputs) {
            if (t.uNI_InternalSequence__c != null) {
                targetBySeq.put(String.valueOf(t.uNI_InternalSequence__c), t.Id);
            }
            if (t.uNI_OutputTitle__c != null) {
                String key = t.uNI_OutputTitle__c.trim().toLowerCase();
                if (!targetByTitle.containsKey(key)) {
                    targetByTitle.put(key, t.Id);
                }
            }
        }

        for (uNI_PortfolioOutput__c s : srcOutputs) {
            Id targetId;
            if (s.uNI_InternalSequence__c != null) {
                targetId = targetBySeq.get(String.valueOf(s.uNI_InternalSequence__c));
            }
            if (targetId == null && s.uNI_OutputTitle__c != null) {
                targetId = targetByTitle.get(s.uNI_OutputTitle__c.trim().toLowerCase());
            }
            if (targetId != null) {
                result.put(s.Id, targetId);
            }
        }

        return result;
    }

    private static Object normalizeVersionValue(String version, Schema.SObjectField fld) {
        if (String.isBlank(version)) {
            return null;
        }
        Schema.DescribeFieldResult describe = fld.getDescribe();
        Schema.DisplayType type = describe.getType();
        String value = version.trim();
        try {
            if (type == Schema.DisplayType.Integer || type == Schema.DisplayType.Long) {
                return Integer.valueOf(value);
            } else if (type == Schema.DisplayType.Double ||
                       type == Schema.DisplayType.Percent ||
                       type == Schema.DisplayType.Currency) {
                return Decimal.valueOf(value);
            }
        } catch (Exception e) {
            // fall through and return as string
        }
        return value;
    }

    private static Boolean hasTargetVersionRecords(String objectApiName, Id indAppId, Object versionValue) {
        if (indAppId == null || versionValue == null) {
            return false;
        }
        String soql =
            'SELECT Id FROM ' + objectApiName +
            ' WHERE uNI_IndividualApplication__c = :indAppId' +
            ' AND uNI_Version__c = :versionValue' +
            ' LIMIT 1';
        List<SObject> rows = Database.query(soql);
        return !rows.isEmpty();
    }

    // ===== Core logic per request =====
    private static Response cloneForRequest(Request req) {
        Response res = new Response();
        res.errors = new List<String>();
        res.budgetRowsCloned = 0;
        res.expenseTypesCloned = 0;
        res.summaryBudgetsCloned = 0;
        res.portfolioOutputsCloned = 0;
        res.totalRecordsCloned = 0;

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

        CloneContext ctx = new CloneContext();

        ctx.summaryBudgetMap = cloneSummaryBudgets(req, req.sourceVersion, res);
        res.expenseTypesCloned = cloneExpenseTypes(req, req.sourceVersion, res);
        res.budgetRowsCloned = cloneBudgetRows(req, req.sourceVersion, ctx, res);

        res.totalRecordsCloned =
            res.summaryBudgetsCloned +
            res.portfolioOutputsCloned +
            res.expenseTypesCloned +
            res.budgetRowsCloned;

        return res;
    }

    // ----- Object specific cloning -----
    private static Map<Id, Id> cloneSummaryBudgets(Request req, String sourceVersion, Response res) {
        Map<Id, Id> idMap = new Map<Id, Id>();

        Object targetVersionValue =
            normalizeVersionValue(req.targetVersion, uNI_SummaryBudget__c.uNI_Version__c);
        if (hasTargetVersionRecords('uNI_SummaryBudget__c', req.individualApplicationId, targetVersionValue)) {
            return idMap;
        }

        List<uNI_SummaryBudget__c> src = [
            SELECT Id,
                   Name,
                   is_Full_Row_Span__c,
                   uNI_Investment_record_type__c,
                   uNI_IndividualApplication__c,
                   uNI_CallForProposals__c,
                   Expense_type__c,
                   uNI_Output_1__c, uNI_Output_2__c, uNI_Output_3__c, uNI_Output_4__c,
                   uNI_Output_5__c, uNI_Output_6__c, uNI_Output_7__c, uNI_Output_8__c,
                   uNI_Output_9__c, uNI_Output_10__c, uNI_Output_11__c, uNI_Output_12__c,
                   uNI_Output_13__c, uNI_Output_14__c, uNI_Output_15__c,
                   uNI_Cross_Cutting__c,
                   uNI_Output_Totals__c,
                   uNI_Output1Narrative__c, uNI_Output2Narrative__c, uNI_Output3Narrative__c,
                   uNI_Output4Narrative__c, uNI_Output5Narrative__c, uNI_Output6Narrative__c,
                   uNI_Output7Narrative__c, uNI_Output8Narrative__c, uNI_Output9Narrative__c,
                   uNI_Output10Narrative__c, uNI_Output11Narrative__c, uNI_Output12Narrative__c,
                   uNI_Output13Narrative__c, uNI_Output14Narrative__c, uNI_Output15Narrative__c,
                   uNI_CrossCuttingNarrative__c,
                   uNI_ConsortiumPercent__c,
                   uNI_Version__c
            FROM uNI_SummaryBudget__c
            WHERE uNI_IndividualApplication__c = :req.individualApplicationId
              AND uNI_Version__c = :sourceVersion
        ];

        if (src.isEmpty()) {
            return idMap;
        }

        List<uNI_SummaryBudget__c> clones = new List<uNI_SummaryBudget__c>();
        for (uNI_SummaryBudget__c sb : src) {
            uNI_SummaryBudget__c copy = sb.clone(false, false, false);
            copy.uNI_IndividualApplication__c = req.individualApplicationId;
            setVersionFromFlow(
                req.targetVersion,
                copy,
                uNI_SummaryBudget__c.uNI_Version__c
            );
            clones.add(copy);
        }

        Database.SaveResult[] results = Database.insert(clones, false);
        for (Integer i = 0; i < results.size(); i++) {
            Database.SaveResult sr = results[i];
            if (sr.isSuccess()) {
                res.summaryBudgetsCloned++;
                idMap.put(src[i].Id, sr.getId());
            } else if (sr.getErrors() != null && !sr.getErrors().isEmpty()) {
                res.errors.add(
                    'SummaryBudget clone failed (source Id: ' + src[i].Id + '): ' +
                    sr.getErrors()[0].getMessage()
                );
            }
        }

        return idMap;
    }

    private static Integer cloneExpenseTypes(Request req, String sourceVersion, Response res) {
        Integer count = 0;

        Object targetVersionValue =
            normalizeVersionValue(req.targetVersion, uNI_Expense_Types__c.uNI_Version__c);
        if (hasTargetVersionRecords('uNI_Expense_Types__c', req.individualApplicationId, targetVersionValue)) {
            return count;
        }

        List<uNI_Expense_Types__c> src = [
            SELECT Id,
                   Name,
                   uNI_IndividualApplication__c,
                   uNI_CallForProposals__c,
                   Total__c,
                   uNI_Output1__c, uNI_Output2__c, uNI_Output3__c, uNI_Output4__c,
                   uNI_Output5__c, uNI_Output6__c, uNI_Output7__c, uNI_Output8__c,
                   uNI_Output9__c, uNI_Output10__c, uNI_Output11__c, uNI_Output12__c,
                   uNI_Output13__c, uNI_Output14__c, uNI_Output15__c,
                   uNI_Cross_Cutting__c,
                   uNI_Output_Totals__c,
                   uNI_Output1Narrative__c, uNI_Output2Narrative__c, uNI_Output3Narrative__c,
                   uNI_Output4Narrative__c, uNI_Output5Narrative__c, uNI_Output6Narrative__c,
                   uNI_Output7Narrative__c, uNI_Output8Narrative__c, uNI_Output9Narrative__c,
                   uNI_Output10Narrative__c, uNI_Output11Narrative__c, uNI_Output12Narrative__c,
                   uNI_Output13Narrative__c, uNI_Output14Narrative__c, uNI_Output15Narrative__c,
                   uNI_CrossCuttingNarrative__c,
                   uNI_ExpensePercent__c,
                   uNI_Version__c
            FROM uNI_Expense_Types__c
            WHERE uNI_IndividualApplication__c = :req.individualApplicationId
              AND uNI_Version__c = :sourceVersion
        ];

        if (src.isEmpty()) {
            return count;
        }

        List<uNI_Expense_Types__c> clones = new List<uNI_Expense_Types__c>();
        for (uNI_Expense_Types__c et : src) {
            uNI_Expense_Types__c copy = et.clone(false, false, false);
            copy.uNI_IndividualApplication__c = req.individualApplicationId;
            setVersionFromFlow(
                req.targetVersion,
                copy,
                uNI_Expense_Types__c.uNI_Version__c
            );
            clones.add(copy);
        }

        Database.SaveResult[] results = Database.insert(clones, false);
        for (Integer i = 0; i < results.size(); i++) {
            Database.SaveResult sr = results[i];
            if (sr.isSuccess()) {
                count++;
            } else if (sr.getErrors() != null && !sr.getErrors().isEmpty()) {
                res.errors.add(
                    'ExpenseType clone failed (source Id: ' + src[i].Id + '): ' +
                    sr.getErrors()[0].getMessage()
                );
            }
        }

        return count;
    }

    private static Integer cloneBudgetRows(Request req,
                                           String sourceVersion,
                                           CloneContext ctx,
                                           Response res) {
        Integer count = 0;

        Object targetVersionValue =
            normalizeVersionValue(req.targetVersion, uNI_BudgetData__c.uNI_Version__c);
        if (hasTargetVersionRecords('uNI_SummaryBudget__c', req.individualApplicationId, targetVersionValue) ||
            hasTargetVersionRecords('uNI_BudgetData__c', req.individualApplicationId, targetVersionValue)) {
            return count;
        }

        Map<Id, Id> outputIdMap =
            buildOutputIdMap(req.individualApplicationId, sourceVersion, req.targetVersion);

        List<uNI_BudgetData__c> src = [
            SELECT Id,
                   uNI_PortfolioOutput__c,
                   uNI_Summary_Budget__c,
                   uNI_PortfolioOutput__r.uNI_Version__c,
                   uNI_Summary_Budget__r.uNI_Version__c,
                   uNI_Activity__c,
                   uNI_SubActivity__c,
                   Organization_Name__c,
                   uNI_Country__c,
                   uNI_Years__c,
                   uNI_ExpenseGroup__c,
                   uNI_ExpenseType__c,
                   uNI_UnitCost__c,
                   uNI_CountrySNU__c,
                   uNI_NoofUnits__c,
                   uNI_AllocatedtoUnitaid__c,
                   uNI_TotalCost__c,
                   uNI_Description__c,
                   uNI_Assumptions__c,
                   uNI_StageGate__c,
                   uNI_FundingSource__c,
                   uNI_CostTotalOptA__c,
                   uNI_CostPerUnit__c,
                   uNI_MeasurementUnit__c,
                   uNI_Multiplier__c,
                   uNI_CostTotalOptB__c,
                   uNI_CostTotalGrp2__c,
                   uNI_CostAllocatedToCofunding__c,
                   uNI_CostTotalUnitaidUS__c,
                   uNI_CostTotalCoFundingUS__c,
                   uNI_Custom1Text__c,
                   uNI_Custom2Text__c,
                   uNI_Custom3Text__c,
                   uNI_Custom4Perc__c,
                   uNI_Custom5Perc__c,
                   uNI_Custom6Perc__c,
                   uNI_Custom7US__c,
                   uNI_Custom8US__c,
                   uNI_Custom9US__c,
                   uNI_Custom10Num__c,
                   uNI_Custom11Num__c,
                   uNI_Custom12Num__c,
                   uNI_Version__c
            FROM uNI_BudgetData__c
            WHERE uNI_IndividualApplication__c = :req.individualApplicationId
              AND uNI_Version__c = :sourceVersion
        ];

        if (src.isEmpty()) {
            return count;
        }

        List<uNI_BudgetData__c> clones = new List<uNI_BudgetData__c>();
        for (uNI_BudgetData__c bd : src) {
            uNI_BudgetData__c copy = bd.clone(false, false, false);
            copy.uNI_IndividualApplication__c = req.individualApplicationId;
            setVersionFromFlow(
                req.targetVersion,
                copy,
                uNI_BudgetData__c.uNI_Version__c
            );

            if (bd.uNI_Summary_Budget__c != null &&
                ctx.summaryBudgetMap.containsKey(bd.uNI_Summary_Budget__c)) {
                copy.uNI_Summary_Budget__c = ctx.summaryBudgetMap.get(bd.uNI_Summary_Budget__c);
            }

            if (bd.uNI_PortfolioOutput__c != null &&
                outputIdMap.containsKey(bd.uNI_PortfolioOutput__c)) {
                copy.uNI_PortfolioOutput__c = outputIdMap.get(bd.uNI_PortfolioOutput__c);
            }

            clones.add(copy);
        }

        Database.SaveResult[] results = Database.insert(clones, false);
        for (Integer i = 0; i < results.size(); i++) {
            Database.SaveResult sr = results[i];
            if (sr.isSuccess()) {
                count++;
            } else if (sr.getErrors() != null && !sr.getErrors().isEmpty()) {
                res.errors.add(
                    'Budget row clone failed (source Id: ' + src[i].Id + '): ' +
                    sr.getErrors()[0].getMessage()
                );
            }
        }

        return count;
    }

    // ----- Shared helpers -----
    private static void setVersionFromFlow(String version,
                                           SObject record,
                                           Schema.SObjectField fld) {
        Schema.DescribeFieldResult describe = fld.getDescribe();
        Schema.DisplayType type = describe.getType();

        if (version == null) {
            record.put(fld, null);
            return;
        }

        String value = String.valueOf(version);

        try {
            if (type == Schema.DisplayType.Integer || type == Schema.DisplayType.Long) {
                record.put(fld, Integer.valueOf(value));
            } else if (type == Schema.DisplayType.Double ||
                       type == Schema.DisplayType.Percent ||
                       type == Schema.DisplayType.Currency) {
                record.put(fld, Decimal.valueOf(value));
            } else {
                record.put(fld, value);
            }
        } catch (Exception e) {
            record.put(fld, value);
        }
    }
}
