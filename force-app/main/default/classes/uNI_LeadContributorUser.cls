/**
* @File Name : uNI_LeadContributorUser.cls
* @Description :
* @Author :
* @Last Modified By :
* @Last Modified On : November 17, 2025
* @Modification Log :
*==============================================================================
* Ver | Date | Author | Modification
*==============================================================================
* 1.0 | November 17, 2025 |   | Initial Version
**/

public class uNI_LeadContributorUser {

// ====== INPUT WRAPPER ======
public class InputWrapper {
    @InvocableVariable(required=true)
    public String flowApiName;      // Flow API Name coming from flow
    
    @InvocableVariable(required=true)
    public String combinedInput;    // The input string (same as earlier)
    
    @InvocableVariable(required=true)
    public String combinedInput1;
}

// ====== OUTPUT WRAPPER ======
public class OutputWrapper {
    @InvocableVariable public String contributorIds;
    @InvocableVariable public String contributorNames;
    @InvocableVariable public String implementerId;
    @InvocableVariable public String implementerName;

    // Old logic output (Ids + Names)
    @InvocableVariable public String userIds;
    @InvocableVariable public String userNames;
    @InvocableVariable public List<Id> idList;

}

@InvocableMethod(label='Process User Logic')
public static List<OutputWrapper> processData(List<InputWrapper> reqList) {

    InputWrapper req = reqList[0];
    String flowName = req.flowApiName;
    String raw      = req.combinedInput;

    // Final output object
    OutputWrapper out = new OutputWrapper();

    // =====================================================================
    // ========== CASE 1: Flow Name = uNI_EditContributor (New Logic) ======
    // =====================================================================
    if (flowName == 'uNI_EditContributor') {
        List<String> parts = raw.split('@', -1);

        if (parts.size() < 5) {
            throw new AuraHandledException(
                'Expected format: existingLeadImpl @ newLeadImpl @ currentContrib @ removeContrib @ addContrib'
            );
        }

        // Extract and clean segments
        String existingLead    = clean(parts[0]);
        String newLead         = clean(parts[1]);
        String currentContrib  = clean(parts[2]);
        String removeContrib   = clean(parts[3]);
        String addContrib      = clean(parts[4]);

        // ---- Final Lead Implementer ----
        String finalLeadId =
            String.isNotBlank(newLead) ? newLead : existingLead;

        // ---- Contributor set building ----
        Set<String> contributors = new Set<String>();

        if (String.isNotBlank(currentContrib))
            contributors.addAll(currentContrib.split(','));

        if (String.isNotBlank(addContrib))
            contributors.addAll(addContrib.split(','));

        if (String.isNotBlank(removeContrib))
            contributors.removeAll(new Set<String>(removeContrib.split(',')));

        contributors.remove('');

        // ---- Query Users ----
        Set<String> queryIds = new Set<String>();
        queryIds.add(finalLeadId);
        queryIds.addAll(contributors);

        Map<String, User> userMap = new Map<String, User>(
            [SELECT Id, Name FROM User WHERE Id IN :queryIds]
        );

        // ---- Prepare output ----
        out.implementerId = finalLeadId;
        out.implementerName = userMap.containsKey(finalLeadId)
                                ? userMap.get(finalLeadId).Name : '';

        out.contributorIds = String.join(new List<String>(contributors), ',');

        List<String> contribNames = new List<String>();
        for (String cid : contributors) {
            if (userMap.containsKey(cid)) {
                contribNames.add(userMap.get(cid).Name);
            }
        }
        out.contributorNames = String.join(contribNames, ',');
    }
            // =====================================================================
    // ========== CASE 2: Convert String to List<Id> ========================
    // =====================================================================
            if (flowName == 'uNI_EditRelatedDonors') {
                
                // Clean ; → , and remove stray commas
                String cleaned = clean(raw);

                Set<Id> idSet = new Set<Id>();

                for (String s : cleaned.split(',')) {
                    if (String.isNotBlank(s)) {
                        idSet.add((Id)s);   // Set automatically removes duplicates
                    }
                }

                // Convert back to List<Id> for Flow
                out.idList = new List<Id>(idSet);

                return new List<OutputWrapper>{ out };
                }

                else if (flowName == 'uNI_InitiateEvaluation') {
                
                // Clean ; → , and remove stray commas
                String cleaned = clean(raw);

                Set<Id> idSet = new Set<Id>();

                for (String s : cleaned.split(',')) {
                    if (String.isNotBlank(s)) {
                        idSet.add((Id)s);   // Set automatically removes duplicates
                    }
                }

                // Convert back to List<Id> for Flow
                out.idList = new List<Id>(idSet);

                return new List<OutputWrapper>{ out };
                }

    // =====================================================================
    // ========== CASE 3: Any Other Flow Name → Old Logic ==================
    // =====================================================================
    else {

        List<String> usersSetList = raw.split('@');

        String currentIds = clean(usersSetList[0]);
        String removeIds  = clean(usersSetList[1]);
        String addIds     = clean(usersSetList[2]);

        Set<String> currentIdsSet = new Set<String>(currentIds.split(','));
        Set<String> removeIdsSet  = new Set<String>(removeIds.split(','));
        Set<String> addIdsSet     = new Set<String>(addIds.split(','));

        currentIdsSet.addAll(addIdsSet);
        currentIdsSet.removeAll(removeIdsSet);

        List<User> users = [
            SELECT Id, Name FROM User
            WHERE Id IN :currentIdsSet
        ];

        // Build string outputs
        List<String> idList = new List<String>();
        List<String> nameList = new List<String>();

        for (User u : users) {
            idList.add(u.Id);
            nameList.add(u.Name);
        }

        out.userIds   = String.join(idList, ',');
        out.userNames = String.join(nameList, ',');
    }

    return new List<OutputWrapper>{ out };
}

// ====== CLEANING FUNCTION ======
private static String clean(String s) {
    if (s == null) return '';
    s = s.replace(';', ',').trim();
    s = s.replaceAll('^,+', '');
    s = s.replaceAll(',+$', '');
    return s;
}
}