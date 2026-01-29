/**
* @File Name : uNI_AnnualReportsListCommPortalCtlr.cls
* @Description :
* @Author :
* @Last Modified By :
* @Last Modified On : November 3, 2025
* @Modification Log :
*==============================================================================
* Ver | Date | Author | Modification
*==============================================================================
* 1.0 | November 3, 2025 |   | Initial Version
**/

// Apex Class: uNI_AnnualReportController.cls
public without sharing class uNI_AnnualReportsListCommPortalCtlr {
    @AuraEnabled(cacheable=true)
    public static List<uNI_Annual_Report__c> getReportsByApplication(Id applicationId) {
        if (applicationId == null) return new List<uNI_Annual_Report__c>();
        return [
            SELECT Id, Name, uNI_DateSubmittedtoUnitaid__c, uNI_Status__c
            FROM uNI_Annual_Report__c
            WHERE uNI_Individual_Application__c = :applicationId
            AND uNI_Status__c <> 'Planned'
            ORDER BY CreatedDate DESC
        ];
    }
}