public with sharing class uNI_TableFourARBudgetController {
    public class ResultWrapper {
        @AuraEnabled public List<uNI_Expense_Types__c> expenseTypes;
        @AuraEnabled public Integer numberOfOutputs;
        @AuraEnabled public String disbursementYear;
        @AuraEnabled public Map<Id, String> countryNames;
    }

    @AuraEnabled
    public static void saveTable(String updatesJson) {
        if (String.isBlank(updatesJson)) return;

        List<Object> raw = (List<Object>) JSON.deserializeUntyped(updatesJson);
        List<SObject> toUpdate = new List<SObject>();

        for (Object o : raw) {
            if (!(o instanceof Map<String, Object>)) continue;
            Map<String, Object> entry = (Map<String, Object>) o;
            String recId = (String) entry.get('id');
            if (String.isBlank(recId)) continue;

            Map<String, Object> updates = (Map<String, Object>) entry.get('updates');
            if (updates == null || updates.isEmpty()) continue;

            String sobjectName = Id.valueOf(recId).getSObjectType().getDescribe().getName();
            SObject sobj = Schema.getGlobalDescribe().get(sobjectName).newSObject();
            sobj.put('Id', recId);

            Map<String, Schema.SObjectField> fieldsMap = Schema.getGlobalDescribe().get(sobjectName).getDescribe().fields.getMap();

            for (String apiName : updates.keySet()) {
                if (!fieldsMap.containsKey(apiName)) continue;
                Object rawVal = updates.get(apiName);
                Schema.DescribeFieldResult dfr = fieldsMap.get(apiName).getDescribe();

                if (rawVal == null || String.valueOf(rawVal).trim() == '') {
                    sobj.put(apiName, null);
                    continue;
                }

                switch on dfr.getType() {
                    when INTEGER  { sobj.put(apiName, Integer.valueOf(String.valueOf(rawVal))); }
                    when DOUBLE   { sobj.put(apiName, Double.valueOf(String.valueOf(rawVal))); }
                    when CURRENCY { sobj.put(apiName, Decimal.valueOf(String.valueOf(rawVal))); }
                    when PERCENT  { sobj.put(apiName, Decimal.valueOf(String.valueOf(rawVal))); }
                    when DATE     { sobj.put(apiName, Date.valueOf(String.valueOf(rawVal))); }
                    when DATETIME { sobj.put(apiName, DateTime.valueOf(String.valueOf(rawVal))); }
                    when BOOLEAN  { sobj.put(apiName, Boolean.valueOf(String.valueOf(rawVal))); }
                    when else     { sobj.put(apiName, String.valueOf(rawVal)); }
                }
            }

            toUpdate.add(sobj);
        }

        if (!toUpdate.isEmpty()) {
            update toUpdate;
        }
    }

    @AuraEnabled(cacheable=false)
    public static ResultWrapper getTableData(Id recordId) {
        if (recordId == null) {
            throw new AuraHandledException('recordId is required');
        }

        ResultWrapper res = new ResultWrapper();

        // Year from disbursement
        try {
            uNI_PPF__c disb = [
                SELECT uNI_DisbursementYear__c, uNI_IndividualApplication__c
                FROM uNI_PPF__c
                WHERE Id = :recordId
                LIMIT 1
            ];
            if (disb != null && disb.uNI_DisbursementYear__c != null) {
                res.disbursementYear = String.valueOf(disb.uNI_DisbursementYear__c);
            }
        } catch (Exception e) {
            // ignore
        }

        List<uNI_Expense_Types__c> expList = [
            SELECT Id, Name, uNI_CostType__c,
                   uNI_Output1__c, uNI_Output2__c, uNI_Output3__c, uNI_Output4__c, uNI_Output5__c,
                   uNI_Output6__c, uNI_Output7__c, uNI_Output8__c, uNI_Output9__c, uNI_Output10__c,
                   uNI_Output11__c, uNI_Output12__c, uNI_Output13__c, uNI_Output14__c, uNI_Output15__c,
                   uNI_Cross_Cutting__c,
                   uNI_ProjectedExpenseOutput1__c, uNI_ProjectedExpenseOutput2__c, uNI_ProjectedExpenseOutput3__c, uNI_ProjectedExpenseOutput4__c, uNI_ProjectedExpenseOutput5__c,
                   uNI_ProjectedExpenseOutput6__c, uNI_ProjectedExpenseOutput7__c, uNI_ProjectedExpenseOutput8__c, uNI_ProjectedExpenseOutput9__c, uNI_ProjectedExpenseOutput10__c,
                   uNI_ProjectedExpenseOutput11__c, uNI_ProjectedExpenseOutput12__c, uNI_ProjectedExpenseOutput13__c, uNI_ProjectedExpenseOutput14__c, uNI_ProjectedExpenseOutput15__c,
                   uNI_ProjectedExpenseOutput1AR__c, uNI_ProjectedExpenseOutput2AR__c, uNI_ProjectedExpenseOutput3AR__c, uNI_ProjectedExpenseOutput4AR__c, uNI_ProjectedExpenseOutput5AR__c,
                   uNI_ProjectedExpenseOutput6AR__c, uNI_ProjectedExpenseOutput7AR__c, uNI_ProjectedExpenseOutput8AR__c, uNI_ProjectedExpenseOutput9AR__c, uNI_ProjectedExpenseOutput10AR__c,
                   uNI_ProjectedExpenseOutput11AR__c, uNI_ProjectedExpenseOutput12AR__c, uNI_ProjectedExpenseOutput13AR__c, uNI_ProjectedExpenseOutput14AR__c, uNI_ProjectedExpenseOutput15AR__c,
                   uNI_ProjectedExpenseCrossCutting__c, uNI_ProjectedExpenseCrossCuttingAR__c,
                   uNI_Output1Country__c, uNI_Output2Country__c, uNI_Output3Country__c, uNI_Output4Country__c, uNI_Output5Country__c,
                   uNI_Output6Country__c, uNI_Output7Country__c, uNI_Output8Country__c, uNI_Output9Country__c, uNI_Output10Country__c,
                   uNI_Output11Country__c, uNI_Output12Country__c, uNI_Output13Country__c, uNI_Output14Country__c, uNI_Output15Country__c,
                   uNI_CrosscuttingCountry__c,
                   uNI_Output1CountryActual__c, uNI_Output2CountryActual__c, uNI_Output3CountryActual__c, uNI_Output4CountryActual__c, uNI_Output5CountryActual__c,
                   uNI_Output6CountryActual__c, uNI_Output7CountryActual__c, uNI_Output8CountryActual__c, uNI_Output9CountryActual__c, uNI_Output10CountryActual__c,
                   uNI_Output11CountryActual__c, uNI_Output12CountryActual__c, uNI_Output13CountryActual__c, uNI_Output14CountryActual__c, uNI_Output15CountryActual__c,
                   uNI_CrosscuttingCountryActual__c,
                   uNI_VarianceAnalysisAR__c,
                   uNI_IndividualApplication__c,
                   uNI_Disbursement__c, uNI_Disbursement__r.uNI_IndividualApplication__c,
                   uNI_AnnualReport__c, uNI_AnnualReport__r.uNI_Individual_Application__c
            FROM uNI_Expense_Types__c
            WHERE uNI_Disbursement__c = :recordId
               OR uNI_AnnualReport__c = :recordId
               OR uNI_IndividualApplication__c = :recordId
            ORDER BY uNI_CostType__c, CreatedDate
        ];

        res.expenseTypes = expList;
        // Country name map
        Set<Id> countryIds = new Set<Id>();
        for (uNI_Expense_Types__c rec : expList) {
            for (Integer i = 1; i <= 15; i++) {
                Id cid = (Id) rec.get('uNI_Output' + i + 'Country__c');
                if (cid != null) countryIds.add(cid);
            }
            if (rec.uNI_CrosscuttingCountry__c != null) {
                countryIds.add(rec.uNI_CrosscuttingCountry__c);
            }
        }
        Map<Id, String> countryNameMap = new Map<Id, String>();
        if (!countryIds.isEmpty()) {
            for (uNI_Country__c c : [SELECT Id, Name FROM uNI_Country__c WHERE Id IN :countryIds]) {
                countryNameMap.put(c.Id, c.Name);
            }
        }
        res.countryNames = countryNameMap;
        System.debug('[Table4] recordId=' + recordId + ' rows=' + expList.size());
        System.debug('[Table4] recordId=' + recordId + ' rows=' + expList.size());

        Integer outputsCount = 0;
        Id indId;
        if (!expList.isEmpty()) {
            uNI_Expense_Types__c first = expList[0];
            if (first.uNI_IndividualApplication__c != null) {
                indId = first.uNI_IndividualApplication__c;
            } else if (first.uNI_Disbursement__r != null) {
                indId = first.uNI_Disbursement__r.uNI_IndividualApplication__c;
            }
        }

        // If still not found, derive from Annual Report record
        if (indId == null) {
            try {
                uNI_Annual_Report__c ar = [
                    SELECT uNI_Individual_Application__c
                    FROM uNI_Annual_Report__c
                    WHERE Id = :recordId
                    LIMIT 1
                ];
                indId = ar != null ? ar.uNI_Individual_Application__c : null;
            } catch (Exception e) {
                // ignore; indId stays null
            }
        }

        if (indId != null) {
            outputsCount = [SELECT COUNT() FROM uNI_PortfolioOutput__c WHERE uNI_IndividualApplication__c = :indId AND uNI_Logframe__c != null];
        }
        System.debug('[Table4] outputsCount=' + outputsCount + ' indId=' + indId);
        res.numberOfOutputs = outputsCount;
        return res;
    }
    @AuraEnabled
public static Id createExpenseType(
    Id parentRecordId,
    Id countryId,
    Integer outputIndex,
    Decimal projectedAmount
) {
    if (parentRecordId == null || countryId == null || outputIndex == null) {
        throw new AuraHandledException('Missing required fields');
    }

    uNI_Expense_Types__c exp = new uNI_Expense_Types__c();

    // Link to correct parent (same logic as query)
    exp.uNI_AnnualReport__c = parentRecordId; 
    // OR set Disbursement / IndividualApplication depending on your page

    // Dynamically set Output country + projected field
    String countryField = 'uNI_Output' + outputIndex + 'Country__c';
    String projField    = 'uNI_ProjectedExpenseOutput' + outputIndex + '__c';

    exp.put(countryField, countryId);
    exp.put(projField, projectedAmount);

    insert exp;
    return exp.Id;
}

}