public without sharing class uNI_LogframeController {

    public uNI_LogframeController() {}

    // -------------------------
    // PUBLIC: Existing endpoint (kept compatible)
    // Uses IA.uNI_LogframeVersion__c if present, else defaults to '1' (as before).

    // -------------------------
    // Add this helper method to the uNI_LogframeController class
private static Boolean isCurrentUserSystemAdmin() {
    return [
        SELECT COUNT()
        FROM User
        WHERE Id = :UserInfo.getUserId()
        AND Profile.Name = 'System Administrator'
    ] > 0;
}
    @AuraEnabled(cacheable=true)
    public static Map<String, Object> getRelatedRecords(Id recordId) {
        // Load IA
        IndividualApplication ia = [
            SELECT Id, uNI_ProjectName__c, uNI_ImplementationStartDate__c, uNI_InvestmentEndDate__c,
                   uNI_Consortium_Partners__c, uNI_Project_Countries__c, uNI_GranteeContact__r.Name,
                   uNI_GAM__c, uNI_ProgramManagerUser__c, uNI_ProgramOfficerUser__c, uNI_LogframeVersion__c
            FROM IndividualApplication
            WHERE Id = :recordId
            LIMIT 1
        ];

        // Preserve your previous behavior: if IA field is blank, use '1'
        String versionToFetch = String.isBlank(ia.uNI_LogframeVersion__c) ? '1' : ia.uNI_LogframeVersion__c;

        uNI_Logframe__c lf = fetchLogframeForVersion(ia.Id, versionToFetch, /*fallbackToLatestIfBlank*/ false);
        return assembleDtoForIaAndLogframe(ia, lf);
    }

    // -------------------------
    // PUBLIC: New endpoint for (IA + Version). If version is blank, we load the latest.
    // Use this for your combobox-driven LWC wire.
    // -------------------------
    // @AuraEnabled(cacheable=true)
    // === NEW: load the logframe DTO by selected version ('' or null -> latest) ===
@AuraEnabled(cacheable=true)
public static Map<String, Object> getRelatedRecordsByVersion(Id applicationId, String version) {
    System.debug(LoggingLevel.INFO, '[uNI_LogframeController.getRelatedRecordsByVersion] start applicationId=' + applicationId + ', version=' + version + ', userId=' + UserInfo.getUserId());
    // Defensive: allow being called with a Reprogramming Request Id
    Id iaId = coerceToIaId(applicationId);
    System.debug(LoggingLevel.INFO, '[uNI_LogframeController.getRelatedRecordsByVersion] resolved iaId=' + iaId);
    if (iaId == null) {
        System.debug(LoggingLevel.WARN, '[uNI_LogframeController.getRelatedRecordsByVersion] iaId is null; returning empty DTO.');
        return new Map<String,Object>{
            'outcomes' => new List<uNI_PortfolioOutcomes__c>(),
            'outputs' => new List<uNI_PortfolioOutput__c>(),
            'indicators' => new List<uNI_Indicator__c>(),
            'fieldsMap' => new Map<String,Object>(),
            'projectyears' => 0,
            'isEditableLogframe' => false
        };
    }

    // Resolve which version to fetch (''/null -> latest for this IA)
    String versionToFetch = version;
    if (String.isBlank(versionToFetch)) {
        List<AggregateResult> maxV = [
            SELECT uNI_LogframeVersion__c v
            FROM uNI_Logframe__c
            WHERE uNI_Individual_Application__c = :iaId
                  AND uNI_LogframeVersion__c != null
            GROUP BY uNI_LogframeVersion__c
            ORDER BY uNI_LogframeVersion__c DESC
            LIMIT 1
        ];
        versionToFetch = maxV.isEmpty() ? '1' : (String)maxV[0].get('v');
    }
    System.debug(LoggingLevel.INFO, '[uNI_LogframeController.getRelatedRecordsByVersion] versionToFetch=' + versionToFetch);

    Map<String, Object> dto = new Map<String, Object>();
    Id currentUserId = UserInfo.getUserId();
    String yearsFieldsFromLabel = Label.uNI_Project_Year_Logframe;
    System.debug(LoggingLevel.INFO, '[uNI_LogframeController.getRelatedRecordsByVersion] yearsFieldsFromLabel=' + yearsFieldsFromLabel);

    // ---- Load IA safely
    List<IndividualApplication> iaRows = [
        SELECT Id, uNI_ProjectName__c, uNI_ImplementationStartDate__c, uNI_InvestmentEndDate__c,
               uNI_Consortium_Partners__c, uNI_Project_Countries__c, uNI_GranteeContact__r.Name,
               uNI_GAM__c, uNI_ProgramManagerUser__c, uNI_ProgramOfficerUser__c, uNI_LogframeVersion__c
        FROM IndividualApplication
        WHERE Id = :iaId
        LIMIT 1
    ];
    System.debug(LoggingLevel.INFO, '[uNI_LogframeController.getRelatedRecordsByVersion] iaRows.size=' + iaRows.size());
    if (iaRows.isEmpty()) {
        // IA missing — return empty dto (no exception to the UI)
        dto.put('isEditableLogframe', false);
        dto.put('outcomes', new List<uNI_PortfolioOutcomes__c>());
        dto.put('outputs', new List<uNI_PortfolioOutput__c>());
        dto.put('indicators', new List<uNI_Indicator__c>());
        dto.put('projectyears', 0);
        dto.put('fieldsMap', new Map<String,Object>());
        return dto;
    }
    IndividualApplication grantApplication = iaRows[0];

    Map<String,Object> resultFieldsApplication = new Map<String,Object>();
    resultFieldsApplication.put('ProjectTitle', grantApplication.uNI_ProjectName__c);
    resultFieldsApplication.put('ProjectDurationStart', grantApplication.uNI_ImplementationStartDate__c);
    resultFieldsApplication.put('ProjectDurationEnd', grantApplication.uNI_InvestmentEndDate__c);
    resultFieldsApplication.put('ConsirtiumPartners', grantApplication.uNI_Consortium_Partners__c);
    resultFieldsApplication.put('LeadGrantee', grantApplication.uNI_GranteeContact__r != null ? grantApplication.uNI_GranteeContact__r.Name : null);
    resultFieldsApplication.put('ProjectCountries', grantApplication.uNI_Project_Countries__c);
    dto.put('fieldsMap', resultFieldsApplication);
    dto.put('liveVersion', grantApplication.uNI_LogframeVersion__c);

    // ---- Load the specific logframe for the chosen version (safe)
    List<uNI_Logframe__c> logframes = [
        SELECT Id, uNI_ProjectYears__c, uNI_IsEditableLogframe__c
        FROM uNI_Logframe__c
        WHERE uNI_Individual_Application__c = :iaId
          AND uNI_LogframeVersion__c = :versionToFetch
        ORDER BY CreatedDate DESC
        LIMIT 1
    ];
    System.debug(LoggingLevel.INFO, '[uNI_LogframeController.getRelatedRecordsByVersion] logframes.size=' + logframes.size());
    if (logframes.isEmpty()) {
        dto.put('isEditableLogframe', false);
        dto.put('outcomes', new List<uNI_PortfolioOutcomes__c>());
        dto.put('outputs', new List<uNI_PortfolioOutput__c>());
        dto.put('indicators', new List<uNI_Indicator__c>());
        dto.put('projectyears', 0);
        return dto;
    }
    uNI_Logframe__c logFrameRecord = logframes[0];
    dto.put('projectyears', logFrameRecord.uNI_ProjectYears__c);
    String realLogframeversion = [select id, Name, uNI_LogframeVersion__c from uNI_Logframe__c where Id =: logframes limit 1].uNI_LogframeVersion__c;
    System.debug(LoggingLevel.INFO, '[uNI_LogframeController.getRelatedRecordsByVersion] logFrameRecord.Id=' + logFrameRecord.Id + ', realLogframeversion=' + realLogframeversion);


    // Use bind variable for dynamic query
    Id lfId = logFrameRecord.Id;

    String staticIndicatorFields = 'Id, Name, uNI_Indicator_Heading__c, uNI_Smart_Indicator__c,uNI_Index__c, uNI_IndicatorNumerator__c,' +
                                   'uNI_AssumptionsRationale__c,uNI_MeansofVerificationDataSources__c,uNI_ReportingFrequency__c,' +
                                   'uNI_IndicatorDenominator__c, uNI_Post_Grant__c, uNI_Comments__c, uNI_End_Of_Project_Target__c, uNI_Baseline__c, uNI_Disaggregation__c';
    String indicatorFields = staticIndicatorFields + ',' + yearsFieldsFromLabel;
    String milestoneFields = 'Id, Name, uNI_Milestone_Heading__c,uNI_Milestone_Date__c, uNI_Comments__c';

    String queryOutcomes = 'SELECT Id, Name, uNI_OutcomeTitle__c, ' +
        '(SELECT ' + indicatorFields + ' FROM Indicators__r ORDER BY uNI_Index__c ASC), ' +
        '(SELECT ' + milestoneFields + ' FROM Milestones__r ORDER BY CreatedDate ASC) ' +
        'FROM uNI_PortfolioOutcomes__c ' +
        'WHERE uNI_Logframe__c = :lfId ' +
        'AND uNI_LogframeVersion__c = :realLogframeversion ' +
        'ORDER BY CreatedDate ASC';

    String queryOutputs = 'SELECT Id, Name, uNI_OutputTitle__c, ' +
        '(SELECT ' + indicatorFields + ' FROM Indicators__r ORDER BY uNI_Index__c ASC), ' +
        '(SELECT ' + milestoneFields + ' FROM Milestones__r ORDER BY CreatedDate ASC) ' +
        'FROM uNI_PortfolioOutput__c ' +
        'WHERE uNI_Logframe__c = :lfId ' +
        'AND uNI_LogframeVersion__c = :realLogframeversion ' +
        'ORDER BY CreatedDate ASC';

    List<uNI_PortfolioOutcomes__c> outcomes = (List<uNI_PortfolioOutcomes__c>) Database.query(queryOutcomes);
    for (Integer i = outcomes.size() - 1; i >= 0; i--) {
        if (outcomes[i].uNI_OutcomeTitle__c == 'Crosscutting') outcomes.remove(i);
    }
    List<uNI_PortfolioOutput__c> outputs = (List<uNI_PortfolioOutput__c>) Database.query(queryOutputs);
        for (Integer i = outputs.size() - 1; i >= 0; i--) {
        if (outputs[i].uNI_OutputTitle__c == 'Crosscutting') {
            outputs.remove(i);
        }
    }
    System.debug(LoggingLevel.INFO, '[uNI_LogframeController.getRelatedRecordsByVersion] outcomes.size=' + outcomes.size() + ', outputs.size=' + outputs.size());


    Set<Id> outcomesIds = (new Map<Id,uNI_PortfolioOutcomes__c>(outcomes)).keySet();
    Set<Id> outputsIds  = (new Map<Id,uNI_PortfolioOutput__c>(outputs)).keySet();

    List<uNI_Indicator__c> outcomesIndicators = outcomesIds.isEmpty() ? new List<uNI_Indicator__c>() : [
        SELECT Id, Name, uNI_Indicator_Heading__c, uNI_Outcome__c,uNI_Output__c,
               uNI_Smart_Indicator__c, uNI_IndicatorNumerator__c, uNI_IndicatorDenominator__c, uNI_Disaggregation__c
        FROM uNI_Indicator__c WHERE uNI_Outcome__c IN :outcomesIds
    ];
    List<uNI_Indicator__c> outputsIndicators = outputsIds.isEmpty() ? new List<uNI_Indicator__c>() : [
        SELECT Id, Name, uNI_Indicator_Heading__c, uNI_Outcome__c,uNI_Output__c,
               uNI_Smart_Indicator__c, uNI_IndicatorNumerator__c, uNI_IndicatorDenominator__c, uNI_Disaggregation__c
        FROM uNI_Indicator__c WHERE uNI_Output__c IN :outputsIds
    ];

    List<uNI_Indicator__c> allIndicators = new List<uNI_Indicator__c>();
    allIndicators.addAll(outcomesIndicators);
    allIndicators.addAll(outputsIndicators);
    System.debug(LoggingLevel.INFO, '[uNI_LogframeController.getRelatedRecordsByVersion] indicators.size=' + allIndicators.size());

    dto.put('outcomes', outcomes);
    dto.put('outputs', outputs);
    dto.put('indicators', allIndicators);

    Boolean isCurrentUserAuthorized =
        currentUserId == grantApplication.uNI_GAM__c ||
        currentUserId == grantApplication.uNI_ProgramManagerUser__c ||
        currentUserId == grantApplication.uNI_ProgramOfficerUser__c || 
        isCurrentUserSystemAdmin();

    Boolean finalIsEditableStatus = logFrameRecord.uNI_IsEditableLogframe__c && isCurrentUserAuthorized;
    dto.put('isEditableLogframe', finalIsEditableStatus);
    System.debug(LoggingLevel.INFO, '[uNI_LogframeController.getRelatedRecordsByVersion] isEditableLogframe=' + finalIsEditableStatus);

    return dto;
}

// Helper: coerce any incoming Id to the IA Id (supports Reprogramming Request)
private static Id coerceToIaId(Id incomingId) {
    System.debug(LoggingLevel.INFO, '[uNI_LogframeController.coerceToIaId] incomingId=' + incomingId);
    if (incomingId == null) return null;
    Schema.SObjectType t = incomingId.getSObjectType();
    System.debug(LoggingLevel.INFO, '[uNI_LogframeController.coerceToIaId] sObjectType=' + String.valueOf(t));
    if (t == IndividualApplication.SObjectType) return incomingId;

    // If the caller accidentally passed a Reprogramming Request Id
    if (t == uNI_ReprogrammingRequest__c.SObjectType) {
        List<uNI_ReprogrammingRequest__c> rows = [
            SELECT uNI_Investment__c
            FROM uNI_ReprogrammingRequest__c
            WHERE Id = :incomingId
            LIMIT 1
        ];
        System.debug(LoggingLevel.INFO, '[uNI_LogframeController.coerceToIaId] rr rows.size=' + rows.size());
        return rows.isEmpty() ? null : rows[0].uNI_Investment__c;
    }
    // Unknown type — try using as-is (may still be an IA Id string)
    return incomingId;
}


    // -------------------------
    // PUBLIC: Versions list for the combobox
       // === NEW: return distinct versions available for an IA (sorted descending) ===
@AuraEnabled(cacheable=true)
public static List<String> getAvailableLogframeVersions(Id applicationId) {
    System.debug(LoggingLevel.INFO, '[uNI_LogframeController.getAvailableLogframeVersions] applicationId=' + applicationId);
    if (applicationId == null) return new List<String>();

    // Get distinct, non-null versions for this IA
    List<AggregateResult> grouped = [
        SELECT uNI_LogframeVersion__c v
        FROM uNI_Logframe__c
        WHERE uNI_Individual_Application__c = :applicationId
              AND uNI_LogframeVersion__c != null
        GROUP BY uNI_LogframeVersion__c
        ORDER BY uNI_LogframeVersion__c DESC
    ];

    List<String> versions = new List<String>();
    for (AggregateResult ar : grouped) {
        String v = (String)ar.get('v');
        if (!String.isBlank(v)) versions.add(v);
    }
    System.debug(LoggingLevel.INFO, '[uNI_LogframeController.getAvailableLogframeVersions] versions=' + versions);

    // If none found, but a logframe exists without version, default to '1'
    if (versions.isEmpty()) {
        Integer cnt = [
            SELECT COUNT()
            FROM uNI_Logframe__c
            WHERE uNI_Individual_Application__c = :applicationId
        ];
        System.debug(LoggingLevel.INFO, '[uNI_LogframeController.getAvailableLogframeVersions] version list empty; logframe count=' + cnt);
        if (cnt > 0) {
            versions.add('1');
        }
    }
    return versions;
}

    // -------------------------
    // PRIVATE: Fetches a logframe by version; if version is blank and fallback=true, returns latest.
    // -------------------------
    private static uNI_Logframe__c fetchLogframeForVersion(Id iaId, String version, Boolean fallbackToLatestIfBlank) {
        if (!String.isBlank(version)) {
            List<uNI_Logframe__c> lfExact = [
                SELECT Id, uNI_ProjectYears__c, uNI_IsEditableLogframe__c
                FROM uNI_Logframe__c
                WHERE uNI_Individual_Application__c = :iaId
                  AND uNI_LogframeVersion__c = :version
                ORDER BY CreatedDate DESC
                LIMIT 1
            ];
            if (!lfExact.isEmpty()) return lfExact[0];
            // If exact not found and fallback is allowed, we can decide to return latest.
            if (!fallbackToLatestIfBlank) return null;
        }

        if (fallbackToLatestIfBlank) {
            List<uNI_Logframe__c> lfLatest = [
                SELECT Id, uNI_ProjectYears__c, uNI_IsEditableLogframe__c
                FROM uNI_Logframe__c
                WHERE uNI_Individual_Application__c = :iaId
                ORDER BY CreatedDate DESC
                LIMIT 1
            ];
            if (!lfLatest.isEmpty()) return lfLatest[0];
        }

        return null;
    }

   // -------------------------
// PRIVATE: Assembler — builds the same DTO shape your LWC expects
// -------------------------
private static Map<String, Object> assembleDtoForIaAndLogframe(IndividualApplication ia, uNI_Logframe__c lf) {
    Map<String, Object> result = new Map<String, Object>();
    Map<String, Object> resultFieldsApplication = new Map<String, Object>();
    String realLogframeversion = [select id, Name, uNI_LogframeVersion__c from uNI_Logframe__c where Id =: lf.Id limit 1].uNI_LogframeVersion__c;
    // Integer versionInt = [select id, Name, uNI_Version__c from IndividualApplication where Id =: ia.Id limit 1].uNI_Version__c;


    // fieldsMap
    resultFieldsApplication.put('ProjectTitle', ia.uNI_ProjectName__c);
    resultFieldsApplication.put('ProjectDurationStart', ia.uNI_ImplementationStartDate__c);
    resultFieldsApplication.put('ProjectDurationEnd', ia.uNI_InvestmentEndDate__c);
    resultFieldsApplication.put('ConsirtiumPartners', ia.uNI_Consortium_Partners__c);
    resultFieldsApplication.put('LeadGrantee', ia.uNI_GranteeContact__r != null ? ia.uNI_GranteeContact__r.Name : null);
    resultFieldsApplication.put('ProjectCountries', ia.uNI_Project_Countries__c);
    result.put('fieldsMap', resultFieldsApplication);
    result.put('liveVersion', ia.uNI_LogframeVersion__c);

    if (lf == null) {
        // No logframe for that IA/version
        result.put('isEditableLogframe', false);
        result.put('outcomes', new List<uNI_PortfolioOutcomes__c>());
        result.put('outputs', new List<uNI_PortfolioOutput__c>());
        result.put('indicators', new List<uNI_Indicator__c>());
        result.put('projectyears', 0);
        return result;
    }

    String yearsFieldsFromLabel = Label.uNI_Project_Year_Logframe; // e.g. "uNI_Year1Target__c,uNI_Year2Target__c,..."
    result.put('projectyears', lf.uNI_ProjectYears__c);

    // IMPORTANT: bind a simple variable, not lf.Id
    Id lfId = lf.Id;

    // Indicator & milestone fields
    String staticIndicatorFields =
        'Id, Name, uNI_Indicator_Heading__c, uNI_Smart_Indicator__c, uNI_Index__c, uNI_IndicatorNumerator__c,' +
        'uNI_AssumptionsRationale__c, uNI_MeansofVerificationDataSources__c, uNI_ReportingFrequency__c,' +
        'uNI_IndicatorDenominator__c, uNI_Post_Grant__c, uNI_Comments__c, uNI_End_Of_Project_Target__c, uNI_Baseline__c, uNI_Disaggregation__c';

    String indicatorFields = staticIndicatorFields + ',' + yearsFieldsFromLabel;
    String milestoneFields = 'Id, Name, uNI_Milestone_Heading__c, uNI_Milestone_Date__c, uNI_Comments__c';

    // Outcomes
    String queryOutcomes =
        'SELECT Id, Name, uNI_OutcomeTitle__c, ' +
        '(SELECT ' + indicatorFields + ' FROM Indicators__r ORDER BY uNI_Index__c ASC), ' +
        '(SELECT ' + milestoneFields + ' FROM Milestones__r ORDER BY CreatedDate ASC) ' +
        'FROM uNI_PortfolioOutcomes__c ' +
        'WHERE uNI_Logframe__c = :lfId ' +
        'AND uNI_LogframeVersion__c =:realLogframeversion '+
        'ORDER BY CreatedDate ASC';

    List<uNI_PortfolioOutcomes__c> outcomes =
        (List<uNI_PortfolioOutcomes__c>) Database.query(queryOutcomes);

    // Remove "Crosscutting"
    for (Integer i = outcomes.size() - 1; i >= 0; i--) {
        if (outcomes[i].uNI_OutcomeTitle__c == 'Crosscutting') {
            outcomes.remove(i);
        }
    }

    // Outputs
    String queryOutputs =
        'SELECT Id, Name, uNI_OutputTitle__c, ' +
        '(SELECT ' + indicatorFields + ' FROM Indicators__r ORDER BY uNI_Index__c ASC), ' +
        '(SELECT ' + milestoneFields + ' FROM Milestones__r ORDER BY CreatedDate ASC) ' +
        'FROM uNI_PortfolioOutput__c ' +
        'WHERE uNI_Logframe__c = :lfId ' + 
        'AND uNI_LogframeVersion__c =:realLogframeversion '+
        'ORDER BY CreatedDate ASC';
    system.debug('@Bipul query '+ queryOutputs);
    List<uNI_PortfolioOutput__c> outputs =
        (List<uNI_PortfolioOutput__c>) Database.query(queryOutputs);
    System.debug(outputs);


    // Indicators (flatten)
    Set<Id> outcomesIds = (new Map<Id, uNI_PortfolioOutcomes__c>(outcomes)).keySet();
    Set<Id> outputsIds  = (new Map<Id, uNI_PortfolioOutput__c>(outputs)).keySet();

    List<uNI_Indicator__c> outcomesIndicators = new List<uNI_Indicator__c>();
    if (!outcomesIds.isEmpty()) {
        outcomesIndicators = [
            SELECT Id, Name, uNI_Indicator_Heading__c, uNI_Outcome__c, uNI_Output__c,
                   uNI_Smart_Indicator__c, uNI_IndicatorNumerator__c, uNI_IndicatorDenominator__c, uNI_Disaggregation__c
            FROM uNI_Indicator__c
            WHERE uNI_Outcome__c IN :outcomesIds
        ];
    }

    List<uNI_Indicator__c> outputsIndicators = new List<uNI_Indicator__c>();
    if (!outputsIds.isEmpty()) {
        outputsIndicators = [
            SELECT Id, Name, uNI_Indicator_Heading__c, uNI_Outcome__c, uNI_Output__c,
                   uNI_Smart_Indicator__c, uNI_IndicatorNumerator__c, uNI_IndicatorDenominator__c, uNI_Disaggregation__c
            FROM uNI_Indicator__c
            WHERE uNI_Output__c IN :outputsIds
        ];
    }

    List<uNI_Indicator__c> records = new List<uNI_Indicator__c>();
    records.addAll(outcomesIndicators);
    records.addAll(outputsIndicators);

    result.put('outcomes', outcomes);
    result.put('outputs', outputs);
    result.put('indicators', records);

    // Editability: previous logic retained
    Id currentUserId = UserInfo.getUserId();
    Boolean isCurrentUserAuthorized =
        (currentUserId == ia.uNI_GAM__c) ||
        (currentUserId == ia.uNI_ProgramManagerUser__c) ||
        (currentUserId == ia.uNI_ProgramOfficerUser__c);

    Boolean finalIsEditableStatus = lf.uNI_IsEditableLogframe__c && isCurrentUserAuthorized;
    result.put('isEditableLogframe', finalIsEditableStatus);

    return result;
}


    private static Map<String, Object> emptyDto() {
        Map<String, Object> result = new Map<String, Object>();
        result.put('fieldsMap', new Map<String, Object>());
        result.put('isEditableLogframe', false);
        result.put('outcomes', new List<uNI_PortfolioOutcomes__c>());
        result.put('outputs', new List<uNI_PortfolioOutput__c>());
        result.put('indicators', new List<uNI_Indicator__c>());
        result.put('projectyears', 0);
        return result;
    }

    // -------------------------
    // EXISTING METHODS (unchanged below this line, except minor formatting)
    // -------------------------

    @AuraEnabled
    public static void setLogframeAsReadOnly(Id recordId) {
        uNI_Logframe__c logFrameRecord = [
            SELECT Id, uNI_Individual_Application__c, uNI_ProjectYears__c, uNI_IsEditableLogframe__c
            FROM uNI_Logframe__c
            WHERE uNI_Individual_Application__c = :recordId
            LIMIT 1
        ];
        logFrameRecord.uNI_IsEditableLogframe__c = false;
        update logFrameRecord;
    }

    @AuraEnabled
    public static Integer getIndicatorIndexFromParentId(Id applicationId, Id parentIndicatorId, String type) {
        Map<String, Object> dto = getRelatedRecords(applicationId);
        List<uNI_Indicator__c> allIndicatorsReturned = (List<uNI_Indicator__c>) dto.get('indicators');
        Integer countIndex = 0;
        if (type == 'Outcome') {
            for (uNI_Indicator__c ind : allIndicatorsReturned) {
                if (ind.uNI_Outcome__c == parentIndicatorId) countIndex += 1;
            }
        } else if (type == 'Output') {
            for (uNI_Indicator__c ind : allIndicatorsReturned) {
                if (ind.uNI_Output__c == parentIndicatorId) countIndex += 1;
            }
        }
        return countIndex;
    }

    @AuraEnabled
    public static void saveOutputRecords(List<uNI_PortfolioOutput__c> outputs) {
        update outputs;
    }

    @AuraEnabled
    public static void deleteMilestonesAndIndicators(Id recordId) {
        List<Id> toDeleteIds = new List<Id>{ recordId };
        Database.delete(toDeleteIds, true);
    }

    @AuraEnabled
    public static void deleteRecord(Id recordIdToDelete, String type) {
        List<Id> toDeleteIds = new List<Id>{ recordIdToDelete };
        List<Id> toDeleteMilestonesIds = new List<Id>();
        List<Id> toDeleteIndicatorsIds = new List<Id>();

        if (type == 'Output') {
            for (uNI_Indicator__c r : [SELECT Id FROM uNI_Indicator__c WHERE uNI_Output__c = :recordIdToDelete]) {
                toDeleteIndicatorsIds.add(r.Id);
            }
            for (uNI_Milestone__c r : [SELECT Id FROM uNI_Milestone__c WHERE uNI_Output__c = :recordIdToDelete]) {
                toDeleteMilestonesIds.add(r.Id);
            }
        } else if (type == 'Outcome') {
            for (uNI_Indicator__c r : [SELECT Id FROM uNI_Indicator__c WHERE uNI_Outcome__c = :recordIdToDelete]) {
                toDeleteIndicatorsIds.add(r.Id);
            }
            for (uNI_Milestone__c r : [SELECT Id FROM uNI_Milestone__c WHERE uNI_Outcome__c = :recordIdToDelete]) {
                toDeleteMilestonesIds.add(r.Id);
            }
        }

        Database.delete(toDeleteIds, true);
        Database.delete(toDeleteIndicatorsIds, true);
        Database.delete(toDeleteMilestonesIds, true);
    }

@AuraEnabled
public static void createUpdateRecord(
    String recordId,            // IA Id
    String recordIdToUpdate,    // Outcome/Output Id (for Update)
    String type,                // 'Outcome' | 'Output'
    String title,               // new title
    String operation,           // 'Create' | 'Update'
    String version              // may be null/'' => resolve to latest
) {
    // --- Resolve target version for CREATE only (UPDATE doesn't need version) ---
    String v = version;
    if (operation == 'Create') {
        if (String.isBlank(v)) {
            // pick latest logframe version for this IA
            List<AggregateResult> maxV = [
                SELECT uNI_LogframeVersion__c v
                FROM uNI_Logframe__c
                WHERE uNI_Individual_Application__c = :recordId
                      AND uNI_LogframeVersion__c != null
                GROUP BY uNI_LogframeVersion__c
                ORDER BY uNI_LogframeVersion__c DESC
                LIMIT 1
            ];
            v = maxV.isEmpty() ? '1' : (String)maxV[0].get('v');
        }

        // Find a logframe **for that version** under the IA
        List<uNI_Logframe__c> lfList = [
            SELECT Id
            FROM uNI_Logframe__c
            WHERE uNI_Individual_Application__c = :recordId
              AND uNI_LogframeVersion__c = :v
            ORDER BY CreatedDate DESC
            LIMIT 1
        ];
        if (lfList.isEmpty()) {
            throw new AuraHandledException('No logframe found for version ' + v + ' under this application.');
        }
        Id lfId = lfList[0].Id;

        // Create Outcome/Output on that logframe + version
        if (type == 'Outcome') {
            uNI_PortfolioOutcomes__c rec = new uNI_PortfolioOutcomes__c(
                uNI_Logframe__c = lfId,
                uNI_OutcomeTitle__c = title,
                uNI_LogframeVersion__c = v
            );
            insert rec;
        } else if (type == 'Output') {
            uNI_PortfolioOutput__c rec = new uNI_PortfolioOutput__c(
                uNI_Logframe__c = lfId,
                uNI_OutputTitle__c = title,
                uNI_LogframeVersion__c = v
            );
              rec.uNI_IndividualApplication__c = recordId;
            insert rec;
        } else {
            throw new AuraHandledException('Unsupported type for create: ' + String.valueOf(type));
        }
        return;
    }

    // --- UPDATE path (do not require a logframe query) ---
    if (operation == 'Update') {
        if (String.isBlank(recordIdToUpdate)) {
            throw new AuraHandledException('Missing recordIdToUpdate for Update operation.');
        }

        if (type == 'Outcome') {
            List<uNI_PortfolioOutcomes__c> rows = [
                SELECT Id, uNI_OutcomeTitle__c
                FROM uNI_PortfolioOutcomes__c
                WHERE Id = :recordIdToUpdate
                LIMIT 1
            ];
            if (rows.isEmpty()) {
                throw new AuraHandledException('Outcome not found: ' + recordIdToUpdate);
            }
            uNI_PortfolioOutcomes__c rec = rows[0];
            rec.uNI_OutcomeTitle__c = title;
            update rec;

        } else if (type == 'Output') {
            List<uNI_PortfolioOutput__c> rows = [
                SELECT Id, uNI_OutputTitle__c
                FROM uNI_PortfolioOutput__c
                WHERE Id = :recordIdToUpdate
                LIMIT 1
            ];
            if (rows.isEmpty()) {
                throw new AuraHandledException('Output not found: ' + recordIdToUpdate);
            }
            uNI_PortfolioOutput__c rec = rows[0];
            rec.uNI_OutputTitle__c = title;
            update rec;

        } else {
            throw new AuraHandledException('Unsupported type for update: ' + String.valueOf(type));
        }
        return;
    }

    // --- Unsupported operation ---
    throw new AuraHandledException('Unsupported operation: ' + String.valueOf(operation));
}


@AuraEnabled
public static uNI_Indicator__c createIndicatorRecord(
    Id parentId,
    String heading,
    String type,             // 'Outcome' or 'Output'
    Boolean subIndicator,    // true for sub-indicator, false for main
    String disaggregation,
    String version
) {
    try {
        if (parentId == null || String.isBlank(type)) {
            throw new AuraHandledException('Missing parentId or type.');
        }

        // -------- 1) Resolve parent Logframe --------
        Id logframeId;
        if (type == 'Outcome') {
            uNI_PortfolioOutcomes__c outcome = [
                SELECT Id, uNI_Logframe__c
                FROM uNI_PortfolioOutcomes__c
                WHERE Id = :parentId
                LIMIT 1
            ];
            logframeId = outcome.uNI_Logframe__c;
        } else if (type == 'Output') {
            uNI_PortfolioOutput__c output = [
                SELECT Id, uNI_Logframe__c
                FROM uNI_PortfolioOutput__c
                WHERE Id = :parentId
                LIMIT 1
            ];
            logframeId = output.uNI_Logframe__c;
        } else {
            throw new AuraHandledException('Invalid type. Expected Outcome or Output.');
        }

        if (logframeId == null) {
            throw new AuraHandledException('Parent is not linked to a logframe.');
        }

        // -------- 2) Resolve version (use passed value, else fallback) --------
        String v = version;
        if (String.isBlank(v)) {
            uNI_Logframe__c lf = [
                SELECT uNI_LogframeVersion__c
                FROM uNI_Logframe__c
                WHERE Id = :logframeId
                LIMIT 1
            ];
            v = (lf != null && !String.isBlank(lf.uNI_LogframeVersion__c))
                ? lf.uNI_LogframeVersion__c
                : '1';
        }

        // -------- 3) Compute parent ordinal (the "1" in 1.1, 2.1, etc.) --------
        Integer parentOrdinal = 1;
        if (type == 'Outcome') {
            List<uNI_PortfolioOutcomes__c> allParents = [
                SELECT Id
                FROM uNI_PortfolioOutcomes__c
                WHERE uNI_Logframe__c = :logframeId
                ORDER BY CreatedDate ASC
            ];
            for (Integer i = 0; i < allParents.size(); i++) {
                if (allParents[i].Id == parentId) {
                    parentOrdinal = i + 1;
                    break;
                }
            }
        } else { // Output
            List<uNI_PortfolioOutput__c> allParents = [
                SELECT Id
                FROM uNI_PortfolioOutput__c
                WHERE uNI_Logframe__c = :logframeId
                ORDER BY CreatedDate ASC
            ];
            for (Integer i = 0; i < allParents.size(); i++) {
                if (allParents[i].Id == parentId) {
                    parentOrdinal = i + 1;
                    break;
                }
            }
        }

        // -------- 4) Compute sequence under this parent for index only --------
        // (count existing indicators for this parent)
        Integer seq = 0;
        if (type == 'Outcome') {
            seq = [SELECT COUNT() FROM uNI_Indicator__c WHERE uNI_Outcome__c = :parentId];
        } else { // Output
            seq = [SELECT COUNT() FROM uNI_Indicator__c WHERE uNI_Output__c = :parentId];
        }

        // Start at .1 (so first index is 1.1, not 1.0)
        Integer seqForIndex = seq + 1;
        Decimal computedIndex =
            Decimal.valueOf(String.valueOf(parentOrdinal) + '.' + String.valueOf(seqForIndex));

        // -------- 5) Create record, using heading exactly as passed from LWC --------
        uNI_Indicator__c rec = new uNI_Indicator__c();
        rec.uNI_LogframeVersion__c   = v;
        rec.uNI_Indicator_Heading__c = heading;        // 👈 keep the P/O X.Y you send from JS
        rec.uNI_Index__c             = computedIndex;  // for ordering

        if (!String.isBlank(disaggregation)) {
            rec.uNI_Disaggregation__c = disaggregation;
        }

        if (type == 'Outcome') {
            rec.uNI_Outcome__c = parentId;
        } else {
            rec.uNI_Output__c = parentId;
        }

        // If you have a dedicated "is sub-indicator" field, set it here:
        // rec.uNI_IsSubIndicator__c = subIndicator;

        insert rec;
        return rec;

    } catch (Exception e) {
        throw new AuraHandledException('Error creating indicator: ' + e.getMessage());
    }
}







    @AuraEnabled
public static void createMilestoneRecord(Id parentId, String heading, String type, String version) {
    String v = String.isBlank(version) ? '1' : version;

    uNI_Milestone__c milestoneRecord = new uNI_Milestone__c();
    milestoneRecord.uNI_LogframeVersion__c = v;
    milestoneRecord.uNI_Milestone_Heading__c = heading;
    if (type == 'Output') milestoneRecord.uNI_Output__c = parentId;
    else if (type == 'Outcome') milestoneRecord.uNI_Outcome__c = parentId;
    insert milestoneRecord;
}

  @AuraEnabled
public static void saveRecords(String dataTableRecords, String updatedValues, Id parentId, String type) {
    // If nothing was edited, just exit
    if (String.isBlank(updatedValues)) {
        return;
    }

    // ---------- MILESTONES (OutputMilestone) ----------
    if (type == 'OutputMilestone') {
        // draftValues from LWC: [{ Id: '...', uNI_Milestone_Date__c: '2025-01-01', ... }, ...]
        List<uNI_Milestone__c> draftList =
            (List<uNI_Milestone__c>) JSON.deserialize(updatedValues, List<uNI_Milestone__c>.class);

        Set<Id> ids = new Set<Id>();
        for (uNI_Milestone__c d : draftList) {
            if (d.Id != null) ids.add(d.Id);
        }
        if (ids.isEmpty()) return;

        // Load existing milestones so we can do "only overwrite non-null fields"
        Map<Id, uNI_Milestone__c> existing = new Map<Id, uNI_Milestone__c>(
            [
                SELECT Id, uNI_Milestone_Heading__c, uNI_Milestone_Date__c, uNI_Comments__c
                FROM uNI_Milestone__c
                WHERE Id IN :ids
            ]
        );

        List<uNI_Milestone__c> toUpdate = new List<uNI_Milestone__c>();

        for (uNI_Milestone__c draft : draftList) {
            uNI_Milestone__c rec = existing.get(draft.Id);
            if (rec == null) continue;

            if (draft.uNI_Milestone_Heading__c != null) {
                rec.uNI_Milestone_Heading__c = draft.uNI_Milestone_Heading__c;
            }
            if (draft.uNI_Milestone_Date__c != null) {
                rec.uNI_Milestone_Date__c = draft.uNI_Milestone_Date__c;
            }
            if (draft.uNI_Comments__c != null) {
                rec.uNI_Comments__c = draft.uNI_Comments__c;
            }

            // In your current usage OutputMilestone = milestone under Output
            if (parentId != null) {
                rec.uNI_Output__c = parentId;
            }

            toUpdate.add(rec);
        }

        if (!toUpdate.isEmpty()) {
            update toUpdate;
        }
        return;
    }

    // ---------- INDICATORS (Outcome / Output) ----------
    // draftValues from LWC: [{ Id: '...', uNI_Smart_Indicator__c: '...'}, ...]
    List<uNI_Indicator__c> draftIndicators =
        (List<uNI_Indicator__c>) JSON.deserialize(updatedValues, List<uNI_Indicator__c>.class);

    Set<Id> indIds = new Set<Id>();
    for (uNI_Indicator__c d : draftIndicators) {
        if (d.Id != null) indIds.add(d.Id);
    }
    if (indIds.isEmpty()) return;

    // Load existing indicators with all editable fields
    Map<Id, uNI_Indicator__c> existingInd = new Map<Id, uNI_Indicator__c>(
        [
            SELECT Id,
                   uNI_Indicator_Heading__c,
                   uNI_Smart_Indicator__c,
                   uNI_AssumptionsRationale__c,
                   uNI_MeansofVerificationDataSources__c,
                   uNI_ReportingFrequency__c,
                   uNI_IndicatorNumerator__c,
                   uNI_IndicatorDenominator__c,
                   uNI_Disaggregation__c,
                   uNI_Baseline__c,
                   uNI_End_Of_Project_Target__c,
                   uNI_Post_Grant__c,
                   uNI_Comments__c,
                   uNI_Year1Target__c,
                   uNI_Year2Target__c,
                   uNI_Year3Target__c,
                   uNI_Year4Target__c,
                   uNI_Year5Target__c,
                   uNI_Year6Target__c,
                   uNI_Year7Target__c,
                   uNI_Year8Target__c
            FROM uNI_Indicator__c
            WHERE Id IN :indIds
        ]
    );

    List<uNI_Indicator__c> toUpdateInd = new List<uNI_Indicator__c>();

    for (uNI_Indicator__c draft : draftIndicators) {
        uNI_Indicator__c rec = existingInd.get(draft.Id);
        if (rec == null) continue;

        // Only overwrite fields that were actually provided in the draft row
        if (draft.uNI_Indicator_Heading__c != null)
            rec.uNI_Indicator_Heading__c = draft.uNI_Indicator_Heading__c;
        if (draft.uNI_Smart_Indicator__c != null)
            rec.uNI_Smart_Indicator__c = draft.uNI_Smart_Indicator__c;
        if (draft.uNI_AssumptionsRationale__c != null)
            rec.uNI_AssumptionsRationale__c = draft.uNI_AssumptionsRationale__c;
        if (draft.uNI_MeansofVerificationDataSources__c != null)
            rec.uNI_MeansofVerificationDataSources__c = draft.uNI_MeansofVerificationDataSources__c;
        if (draft.uNI_ReportingFrequency__c != null)
            rec.uNI_ReportingFrequency__c = draft.uNI_ReportingFrequency__c;
        if (draft.uNI_IndicatorNumerator__c != null)
            rec.uNI_IndicatorNumerator__c = draft.uNI_IndicatorNumerator__c;
        if (draft.uNI_IndicatorDenominator__c != null)
            rec.uNI_IndicatorDenominator__c = draft.uNI_IndicatorDenominator__c;
        if (draft.uNI_Disaggregation__c != null)
            rec.uNI_Disaggregation__c = draft.uNI_Disaggregation__c;
        if (draft.uNI_Baseline__c != null)
            rec.uNI_Baseline__c = draft.uNI_Baseline__c;
        if (draft.uNI_End_Of_Project_Target__c != null)
            rec.uNI_End_Of_Project_Target__c = draft.uNI_End_Of_Project_Target__c;
        if (draft.uNI_Post_Grant__c != null)
            rec.uNI_Post_Grant__c = draft.uNI_Post_Grant__c;
        if (draft.uNI_Comments__c != null)
            rec.uNI_Comments__c = draft.uNI_Comments__c;

        // Year targets
        if (draft.uNI_Year1Target__c != null)
            rec.uNI_Year1Target__c = draft.uNI_Year1Target__c;
        if (draft.uNI_Year2Target__c != null)
            rec.uNI_Year2Target__c = draft.uNI_Year2Target__c;
        if (draft.uNI_Year3Target__c != null)
            rec.uNI_Year3Target__c = draft.uNI_Year3Target__c;
        if (draft.uNI_Year4Target__c != null)
            rec.uNI_Year4Target__c = draft.uNI_Year4Target__c;
        if (draft.uNI_Year5Target__c != null)
            rec.uNI_Year5Target__c = draft.uNI_Year5Target__c;
        if (draft.uNI_Year6Target__c != null)
            rec.uNI_Year6Target__c = draft.uNI_Year6Target__c;
        if (draft.uNI_Year7Target__c != null)
            rec.uNI_Year7Target__c = draft.uNI_Year7Target__c;
        if (draft.uNI_Year8Target__c != null)
            rec.uNI_Year8Target__c = draft.uNI_Year8Target__c;

        // Set the parent again, based on "type"
        if (type == 'Output' && parentId != null) {
            rec.uNI_Output__c = parentId;
        } else if (type == 'Outcome' && parentId != null) {
            rec.uNI_Outcome__c = parentId;
        }

        toUpdateInd.add(rec);
    }

    if (!toUpdateInd.isEmpty()) {
        update toUpdateInd;
    }
}


    public static List<Integer> extractRowValue(String jsonString, Id parentId) {
        List<Object> jsonList = (List<Object>) JSON.deserializeUntyped(jsonString);
        List<Integer> rowIndexes = new List<Integer>();
        for (Object obj : jsonList) {
            Map<String, Object> jsonMap = (Map<String, Object>) obj;
            if (jsonMap.containsKey(parentId)) {
                String rowValue = (String) jsonMap.get(parentId);
                Integer rowNum = Integer.valueOf(rowValue.replace('row-', ''));
                rowIndexes.add(rowNum);
            }
        }
        return rowIndexes;
    }

@AuraEnabled(cacheable=true)
public static Integer getProjectYearsForContext(Id contextId) {
    System.debug(LoggingLevel.INFO, '[uNI_LogframeController.getProjectYearsForContext] contextId=' + contextId);
    if (contextId == null) return null;

    Schema.SObjectType sType = contextId.getSObjectType();

    if (sType == uNI_ReprogrammingRequest__c.SObjectType) {
        uNI_ReprogrammingRequest__c rr = [
            SELECT uNI_ProjectYears__c
            FROM uNI_ReprogrammingRequest__c
            WHERE Id = :contextId
            LIMIT 1
        ];
        System.debug(LoggingLevel.INFO, '[uNI_LogframeController.getProjectYearsForContext] rr.uNI_ProjectYears__c=' + rr.uNI_ProjectYears__c);

        return rr.uNI_ProjectYears__c != null 
            ? rr.uNI_ProjectYears__c.intValue() 
            : null;
    }

    return null;
}


    // bipul new
    @AuraEnabled(cacheable=true)
public static Id resolveInvestmentId(Id contextId) {
    System.debug(LoggingLevel.INFO, '[uNI_LogframeController.resolveInvestmentId] contextId=' + contextId);
    if (contextId == null) return null;

        Schema.SObjectType sType = contextId.getSObjectType();

    if (sType == IndividualApplication.SObjectType) {
        System.debug(LoggingLevel.INFO, '[uNI_LogframeController.resolveInvestmentId] context is IndividualApplication');
        return contextId;
    } else if (sType == uNI_ReprogrammingRequest__c.SObjectType) {
        System.debug(LoggingLevel.INFO, '[uNI_LogframeController.resolveInvestmentId] context is uNI_ReprogrammingRequest__c');
        return [
            SELECT uNI_Investment__c
            FROM uNI_ReprogrammingRequest__c
            WHERE Id = :contextId
            LIMIT 1
        ].uNI_Investment__c;
    }
        // Add more child objects here if needed
        return null;
    }


}
