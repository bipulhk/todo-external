public with sharing class uNI_GADPortalHelper {
    @AuraEnabled(cacheable=false)
    public static Map<String, Object> getGranteeStageInfo(Id recordId) {
        Map<String, Object> result = new Map<String, Object>();
        result.put('isGrantee', false);
        result.put('stage', null);
        result.put('uNI_IsStage2PackageSubmitted__c',null);
        result.put('uNI_IsStage3PackageSubmitted__c',null);
        result.put('uNI_ResubmitStage2Package__c',false);
        result.put('isGAD',false);
        result.put('isInvestment',false);
          result.put('userEmail',null);
          result.put('IsUserPRCTeam',false);
        result.put('IsUserPRCLead',false);
        result.put('IsUserPRCAndOwner',false);
        result.put('isContributor', false);
        
        System.debug(' recieved recordId is '+recordId);
        Id currentUserId = UserInfo.getUserId();
        if(String.isBlank(recordId)) return result;

        // Get the IndividualApplication record with lookup fields
        IndividualApplication app = [
            SELECT Id, uNI_GranteeContact__r.Email,uNI_IsStage4PackageSubmitted__c,uNI_IsStage2PackageSubmitted__c,uNI_IsStage3PackageSubmitted__c,uNI_Stage__c,uNI_CurrentActionOwner__c,
            uNI_ResubmitStage2Package__c,uNI_WaitingForActionByIds__c,uNI_IsGAD__c,uNI_IsInvestment__c,uNI_PRCIds__c,uNI_PRCLeadMember__c,uNI_IsUserCurrentActionOwner__c
            FROM IndividualApplication
            WHERE Id = :recordId
            LIMIT 1
        ];

        // Get logged in user email
        String userEmail = [
    SELECT Email 
    FROM User 
    WHERE Id = :UserInfo.getUserId()
].Email;
       Integer contributorCount = [SELECT COUNT() FROM Contributor__c WHERE User__c = :currentUserId AND IndividualApplication__c = :recordId];
Boolean isContributor = (contributorCount > 0);
        Boolean isGrantee = (app.uNI_GranteeContact__r != null 
                             && String.valueOf(app.uNI_GranteeContact__r.Email).equalsIgnoreCase(userEmail));
        Boolean isPendingEbVote=app.uNI_WaitingForActionByIds__c!=null?(app.uNI_WaitingForActionByIds__c?.contains(UserInfo.getUserId())) && app.uNI_Stage__c=='Stage 5' && app.uNI_CurrentActionOwner__c=='EB':false;

 Boolean isPRCTeam=app.uNI_PRCIds__c!=null?app.uNI_PRCIds__c.contains(UserInfo.getUserId()):false;
        Boolean isPRCLead=app.uNI_PRCLeadMember__c!=null?(app.uNI_PRCLeadMember__c==UserInfo.getUserId()?true:false):false;
        Boolean isUserPRCAndOwner=app.uNI_CurrentActionOwner__c=='PRC' && app.uNI_IsUserCurrentActionOwner__c;

        System.debug('uNI_GADPortalHelper: userEmail=' + userEmail + ', isGrantee=' + isGrantee + ', isContributor=' + isContributor);
        System.debug('uNI_GADPortalHelper: isInvestment=' + app.uNI_IsInvestment__c + ', isGAD=' + app.uNI_IsGAD__c + ', stage=' + app.uNI_Stage__c);
        System.debug('uNI_GADPortalHelper: PRC team=' + isPRCTeam + ', PRC lead=' + isPRCLead + ', PRC+Owner=' + isUserPRCAndOwner);
       result.put('userEmail',userEmail);
        result.put('isGrantee', isGrantee);
        result.put('stage', app.uNI_Stage__c);
        result.put('uNI_IsStage2PackageSubmitted__c',app.uNI_IsStage2PackageSubmitted__c);
        result.put('uNI_IsStage3PackageSubmitted__c',app.uNI_IsStage3PackageSubmitted__c);
        result.put('uNI_IsStage4PackageSubmitted__c',app.uNI_IsStage4PackageSubmitted__c);
        result.put('isPendingEbVote',isPendingEbVote);
        result.put('uNI_ResubmitStage2Package__c',app.uNI_ResubmitStage2Package__c);
        result.put('isGAD',app.uNI_IsGAD__c);
        result.put('isInvestment',app.uNI_IsInvestment__c);
         result.put('IsUserPRCTeam',isPRCTeam);
        result.put('IsUserPRCLead',isPRCLead);
        result.put('IsUserPRCAndOwner',isUserPRCAndOwner);
        result.put('isContributor', isContributor);

        return result;
    }
}
