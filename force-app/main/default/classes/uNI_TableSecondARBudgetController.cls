/**
* @File Name : uNI_TableSecondARBudgetController.cls
* @Description :
* @Author :
* @Last Modified By :
* @Last Modified On : December 3, 2025
* @Modification Log :
*==============================================================================
* Ver | Date | Author | Modification
*==============================================================================
* 1.0 | December 3, 2025 |   | Initial Version
**/

public with sharing class uNI_TableSecondARBudgetController {

    public class TableDataWrapper {
        @AuraEnabled public uNI_Annual_Report__c annualReport {get;set;}
        @AuraEnabled public List<DisbursementWrapper> disbursements {get;set;}
    }

    public class DisbursementWrapper {
        @AuraEnabled public String Id {get;set;}
        @AuraEnabled public String label {get;set;}
        @AuraEnabled public Decimal amount {get;set;}
    }

    @AuraEnabled(cacheable=true)
    public static TableDataWrapper getTableData(String recordId) {
        TableDataWrapper result = new TableDataWrapper();
        
        uNI_Annual_Report__c ar = [
            SELECT Id, 
                   uNI_Individual_Application__c, 
                   uNI_Year_Formula__c, 
                   uNI_Interest_income__c, 
                   uNI_Other_income_including_ERC_fees__c, 
                   uNI_Grant_expenses_including_ERC_fees__c, 
                   uNI_Other_funds_out__c
            FROM uNI_Annual_Report__c 
            WHERE Id = :recordId 
            LIMIT 1
        ];
        
        result.annualReport = ar;
        result.disbursements = new List<DisbursementWrapper>();

        if (ar.uNI_Individual_Application__c != null && ar.uNI_Year_Formula__c != null) {
            List<uNI_PPF__c> ppfList = [
                SELECT Id, CreatedDate, uNI_PPFProposedAmount__c 
                FROM uNI_PPF__c 
                WHERE uNI_IndividualApplication__c = :ar.uNI_Individual_Application__c 
                AND uNI_DisbursementYear__c = :ar.uNI_Year_Formula__c
                ORDER BY CreatedDate ASC
            ];

            Integer count = 1;
            for(uNI_PPF__c ppf : ppfList) {
                DisbursementWrapper dw = new DisbursementWrapper();
                dw.Id = ppf.Id;
                dw.amount = ppf.uNI_PPFProposedAmount__c != null ? ppf.uNI_PPFProposedAmount__c : 0;
                
                String datePart = '';
                if(ppf.CreatedDate != null) {
                    datePart = ' (' + ppf.CreatedDate.month() + '/' + ppf.CreatedDate.year() + ')';
                }
                dw.label = 'Disbursement ' + count + datePart;
                
                result.disbursements.add(dw);
                count++;
            }
        }
        
        return result;
    }

    @AuraEnabled
    public static void saveTableData(uNI_Annual_Report__c arData, String disbursementsJson) {
        try {
            update arData;
            
            if(String.isNotBlank(disbursementsJson)) {
                List<DisbursementWrapper> wrappers = (List<DisbursementWrapper>) JSON.deserialize(disbursementsJson, List<DisbursementWrapper>.class);
                List<uNI_PPF__c> ppfToUpdate = new List<uNI_PPF__c>();
                
                for(DisbursementWrapper w : wrappers) {
                    ppfToUpdate.add(new uNI_PPF__c(
                        Id = w.Id,
                        uNI_PPFProposedAmount__c = w.amount
                    ));
                }
                
                if(!ppfToUpdate.isEmpty()) {
                    update ppfToUpdate;
                }
            }
        } catch(Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
}