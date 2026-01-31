public with sharing class uNI_ProjectTeamController {
    public class ProjectTeamRow {
        @AuraEnabled public String role;
        @AuraEnabled public String userName;
        public ProjectTeamRow(String role, String userName) {
            this.role = role;
            this.userName = userName;
        }
    }

    @AuraEnabled(cacheable=true)
    public static List<ProjectTeamRow> getProjectTeam(Id investmentId) {
        if (investmentId == null) {
            System.debug(LoggingLevel.WARN, 'uNI_ProjectTeamController.getProjectTeam: investmentId is null');
            return new List<ProjectTeamRow>();
        }
        System.debug(LoggingLevel.INFO, 'uNI_ProjectTeamController.getProjectTeam: investmentId=' + investmentId);
        System.debug(LoggingLevel.INFO, 'uNI_ProjectTeamController.getProjectTeam: userId=' + UserInfo.getUserId() +
            ', profileId=' + UserInfo.getProfileId() + ', userType=' + UserInfo.getUserType());
        List<String> roles = new List<String>{ 'PM', 'PO', 'Strategy', 'Legal', 'MEL', 'Procurement' };
        String roleFilter = '\'' + String.join(roles, '\',\'') + '\'';
        List<ProjectTeamRow> rows = new List<ProjectTeamRow>();
        String soql =
            'SELECT uNI_ReviewerRole__c, User__r.Name, User__r.FirstName, User__r.LastName, User__r.Alias ' +
            'FROM uNI_Reviewer__c ' +
            'WHERE uNI_IndividualApplication__c = :investmentId ' +
            'AND uNI_ReviewerRole__c INCLUDES (' + roleFilter + ') ' +
            'ORDER BY CreatedDate ASC';

        for (uNI_Reviewer__c rec : Database.query(soql)) {
            rows.add(new ProjectTeamRow(rec.uNI_ReviewerRole__c, buildUserDisplayName(rec)));
        }
        return rows;
    }

    @AuraEnabled(cacheable=true)
    public static List<ProjectTeamRow> getImplementingPartners(Id investmentId) {
        if (investmentId == null) {
            System.debug(LoggingLevel.WARN, 'uNI_ProjectTeamController.getImplementingPartners: investmentId is null');
            return new List<ProjectTeamRow>();
        }
        List<String> roles = new List<String>{ 'Implementer', 'Contributor' };
        String roleFilter = '\'' + String.join(roles, '\',\'') + '\'';
        List<ProjectTeamRow> rows = new List<ProjectTeamRow>();
        String soql =
            'SELECT uNI_ReviewerRole__c, User__r.Name, User__r.FirstName, User__r.LastName, User__r.Alias ' +
            'FROM uNI_Reviewer__c ' +
            'WHERE uNI_IndividualApplication__c = :investmentId ' +
            'AND uNI_ReviewerRole__c INCLUDES (' + roleFilter + ') ' +
            'ORDER BY CreatedDate ASC';

        for (uNI_Reviewer__c rec : Database.query(soql)) {
            rows.add(new ProjectTeamRow(rec.uNI_ReviewerRole__c, buildUserDisplayName(rec)));
        }
        return rows;
    }
    
    private static String buildUserDisplayName(uNI_Reviewer__c rec) {
        String displayName = '';
        if (rec.User__r != null) {
            String firstName = rec.User__r.FirstName;
            String lastName = rec.User__r.LastName;
            if (!String.isBlank(firstName) || !String.isBlank(lastName)) {
                displayName = String.join(new List<String>{ firstName, lastName }, ' ').trim();
            } else if (!String.isBlank(rec.User__r.Name) && !rec.User__r.Name.startsWith('User')) {
                displayName = rec.User__r.Name;
            } else if (!String.isBlank(rec.User__r.Alias)) {
                displayName = rec.User__r.Alias;
            }
        }
        return displayName;
    }
}
