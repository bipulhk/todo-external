public with sharing class uNI_TableThreeARBudgetController {
    public class ResultWrapper {
        @AuraEnabled public List<uNI_Expense_Types__c> expenseTypes;
        @AuraEnabled public Integer numberOfOutputs;
        @AuraEnabled public Map<String, Decimal> summary;
    }

    @AuraEnabled(cacheable=false)
    public static ResultWrapper getTableData(Id recordId) {
        if (recordId == null) {
            throw new AuraHandledException('recordId is required');
        }

        System.debug('Table3AR getTableData recordId=' + recordId);

        // Allow loading by Disbursement, Individual Application, or Annual Report Id
        List<uNI_Expense_Types__c> expList = [
            SELECT Id, Name, uNI_CostType__c,
                   uNI_ProjectedExpenseOutput1__c, uNI_ProjectedExpenseOutput2__c, uNI_ProjectedExpenseOutput3__c, uNI_ProjectedExpenseOutput4__c, uNI_ProjectedExpenseOutput5__c,
                   uNI_ProjectedExpenseOutput6__c, uNI_ProjectedExpenseOutput7__c, uNI_ProjectedExpenseOutput8__c, uNI_ProjectedExpenseOutput9__c, uNI_ProjectedExpenseOutput10__c,
                   uNI_ProjectedExpenseOutput11__c, uNI_ProjectedExpenseOutput12__c, uNI_ProjectedExpenseOutput13__c, uNI_ProjectedExpenseOutput14__c, uNI_ProjectedExpenseOutput15__c,
                   uNI_ProjectedExpenseOutput1AR__c, uNI_ProjectedExpenseOutput2AR__c, uNI_ProjectedExpenseOutput3AR__c, uNI_ProjectedExpenseOutput4AR__c, uNI_ProjectedExpenseOutput5AR__c,
                   uNI_ProjectedExpenseOutput6AR__c, uNI_ProjectedExpenseOutput7AR__c, uNI_ProjectedExpenseOutput8AR__c, uNI_ProjectedExpenseOutput9AR__c, uNI_ProjectedExpenseOutput10AR__c,
                   uNI_ProjectedExpenseOutput11AR__c, uNI_ProjectedExpenseOutput12AR__c, uNI_ProjectedExpenseOutput13AR__c, uNI_ProjectedExpenseOutput14AR__c, uNI_ProjectedExpenseOutput15AR__c,
                   uNI_ProjectedExpenseCrossCutting__c, uNI_ProjectedExpenseCrossCuttingAR__c,
                   uNI_VarianceAnalysisAR__c,
                   uNI_IndividualApplication__c,
                   uNI_Disbursement__c, uNI_Disbursement__r.uNI_IndividualApplication__c
            FROM uNI_Expense_Types__c
            WHERE uNI_Disbursement__c = :recordId
               OR uNI_IndividualApplication__c = :recordId
               OR uNI_AnnualReport__c = :recordId
            ORDER BY uNI_CostType__c, CreatedDate
        ];

        System.debug('Table3AR fetched rows size=' + expList.size() + ' rows=' + expList);

        ResultWrapper res = new ResultWrapper();
        res.expenseTypes = expList;
        res.summary = new Map<String, Decimal>();

        Id indId;
        if (!expList.isEmpty()) {
            uNI_Expense_Types__c first = expList[0];
            if (first.uNI_IndividualApplication__c != null) {
                indId = first.uNI_IndividualApplication__c;
            } else if (first.uNI_Disbursement__r != null) {
                indId = first.uNI_Disbursement__r.uNI_IndividualApplication__c;
            }
        }

        String versionToUse;
        // If still not found, derive from Annual Report record
        if (indId == null) {
            try {
                uNI_Annual_Report__c ar = [
                    SELECT uNI_Individual_Application__c, uNI_LogframeVersion__c
                    FROM uNI_Annual_Report__c
                    WHERE Id = :recordId
                    LIMIT 1
                ];
                indId = ar != null ? ar.uNI_Individual_Application__c : null;
                versionToUse = ar != null ? ar.uNI_LogframeVersion__c : null;
            } catch (Exception e) {
                // ignore; indId stays null
            }
        }

        if (versionToUse == null && indId != null) {
            try {
                IndividualApplication ia = [
                    SELECT uNI_LogframeVersion__c
                    FROM IndividualApplication
                    WHERE Id = :indId
                    LIMIT 1
                ];
                versionToUse = ia != null ? ia.uNI_LogframeVersion__c : null;
            } catch (Exception e) {
                // ignore; versionToUse stays null
            }
        }

        Integer outputsCount;
        if (indId != null) {
            if (!String.isBlank(versionToUse)) {
                outputsCount = [
                    SELECT COUNT()
                    FROM uNI_PortfolioOutput__c
                    WHERE uNI_IndividualApplication__c = :indId
                      AND uNI_Logframe__c != null
                      AND (
                        uNI_Version__c = :versionToUse
                        OR uNI_Version__c = null
                        OR uNI_LogframeVersion__c = :versionToUse
                      )
                      AND uNI_OutputTitle__c != 'Crosscutting'
                ];
            } else {
                outputsCount = [
                    SELECT COUNT()
                    FROM uNI_PortfolioOutput__c
                    WHERE uNI_IndividualApplication__c = :indId
                      AND uNI_Logframe__c != null
                      AND uNI_OutputTitle__c != 'Crosscutting'
                ];
            }
        }
        res.numberOfOutputs = outputsCount;
        System.debug('Table3AR outputsCount=' + outputsCount + ' indId=' + indId);

        Map<Integer, Decimal> projTotals = new Map<Integer, Decimal>();
        Map<Integer, Decimal> actualTotals = new Map<Integer, Decimal>();
        for (Integer i = 1; i <= 15; i++) {
            projTotals.put(i, 0);
            actualTotals.put(i, 0);
        }

        Decimal projCross = 0;
        Decimal actualCross = 0;

        for (uNI_Expense_Types__c rec : expList) {
            for (Integer i = 1; i <= 15; i++) {
                Decimal projVal = (Decimal) rec.get('uNI_ProjectedExpenseOutput' + i + '__c');
                Decimal actVal = (Decimal) rec.get('uNI_ProjectedExpenseOutput' + i + 'AR__c');
                projTotals.put(i, projTotals.get(i) + (projVal == null ? 0 : projVal));
                actualTotals.put(i, actualTotals.get(i) + (actVal == null ? 0 : actVal));
            }

            if (rec.uNI_ProjectedExpenseCrossCutting__c != null) {
                projCross += rec.uNI_ProjectedExpenseCrossCutting__c;
            }
            if (rec.uNI_ProjectedExpenseCrossCuttingAR__c != null) {
                actualCross += rec.uNI_ProjectedExpenseCrossCuttingAR__c;
            }
        }

        for (Integer i = 1; i <= 15; i++) {
            res.summary.put('uNI_ProjectedExpenseOutput' + i + '__c', projTotals.get(i));
            res.summary.put('uNI_ProjectedExpenseOutput' + i + 'AR__c', actualTotals.get(i));
        }
        res.summary.put('uNI_ProjectedExpenseCrossCutting__c', projCross);
        res.summary.put('uNI_ProjectedExpenseCrossCuttingAR__c', actualCross);

        return res;
    }

    @AuraEnabled
    public static void saveTable(
        String updatesJson,
        Id annualReportId,
        Decimal overallTarget,
        Decimal overallSpent,
        Decimal fundsUtilized,
        Decimal targetAmountForPeriod
    ) {
        // persist detail edits
        if (!String.isBlank(updatesJson)) {
            List<Object> raw = (List<Object>) JSON.deserializeUntyped(updatesJson);
            List<SObject> toUpdate = new List<SObject>();

            for (Object o : raw) {
                if (!(o instanceof Map<String, Object>)) {
                    continue;
                }
                Map<String, Object> entry = (Map<String, Object>) o;

                String recId = (String) entry.get('id');
                if (String.isBlank(recId)) {
                    continue;
                }

                Map<String, Object> updates = (Map<String, Object>) entry.get('updates');
                if (updates == null || updates.isEmpty()) {
                    continue;
                }

                String sobjectName = Id.valueOf(recId).getSObjectType().getDescribe().getName();
                SObject sobj = Schema.getGlobalDescribe().get(sobjectName).newSObject();
                sobj.put('Id', recId);

                Map<String, Schema.SObjectField> fieldsMap = Schema.getGlobalDescribe().get(sobjectName).getDescribe().fields.getMap();

                for (String apiName : updates.keySet()) {
                    if (!fieldsMap.containsKey(apiName)) {
                        continue;
                    }
                    Object rawVal = updates.get(apiName);
                    Schema.DescribeFieldResult dfr = fieldsMap.get(apiName).getDescribe();

                    if (rawVal == null || String.valueOf(rawVal).trim() == '') {
                        sobj.put(apiName, null);
                        continue;
                    }

                    switch on dfr.getType() {
                        when INTEGER {
                            sobj.put(apiName, Integer.valueOf(String.valueOf(rawVal)));
                        }
                        when DOUBLE {
                            sobj.put(apiName, Double.valueOf(String.valueOf(rawVal)));
                        }
                        when CURRENCY {
                            sobj.put(apiName, Decimal.valueOf(String.valueOf(rawVal)));
                        }
                        when PERCENT {
                            sobj.put(apiName, Decimal.valueOf(String.valueOf(rawVal)));
                        }
                        when DATE {
                            sobj.put(apiName, Date.valueOf(String.valueOf(rawVal)));
                        }
                        when DATETIME {
                            sobj.put(apiName, DateTime.valueOf(String.valueOf(rawVal)));
                        }
                        when BOOLEAN {
                            sobj.put(apiName, Boolean.valueOf(String.valueOf(rawVal)));
                        }
                        when else {
                            sobj.put(apiName, String.valueOf(rawVal));
                        }
                    }
                }

                toUpdate.add(sobj);
            }

            if (!toUpdate.isEmpty()) {
                update toUpdate;
            }
        }

        // roll up totals to Annual Report
        if (annualReportId != null &&
            (overallTarget != null || overallSpent != null || fundsUtilized != null || targetAmountForPeriod != null)) {
            uNI_Annual_Report__c ar = new uNI_Annual_Report__c(Id = annualReportId);
            if (overallTarget != null) {
                ar.uNI_OverallTarget__c = overallTarget;
            }
            if (overallSpent != null) {
                ar.uNI_OverallBudgetSpent__c = overallSpent;
            }
            if (fundsUtilized != null) {
                ar.uNI_FundsUtilizedinthisreportingperiod__c = fundsUtilized;
            }
            if (targetAmountForPeriod != null) {
                ar.uNI_TargetAmountForThisReportingPeriod__c = targetAmountForPeriod;
            }
            update ar;
        }
    }
}
