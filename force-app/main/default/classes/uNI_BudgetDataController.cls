public without sharing class uNI_BudgetDataController {

    // -------------------------------------------------------------------------
    // GET BUDGET DATA (VERSION AWARE)
    // -------------------------------------------------------------------------
    @AuraEnabled(cacheable=false)
    public static Map<String, Object> getBudgetData(Id parentId, String version) {
        Map<String, Object> result = new Map<String, Object>();

        // Fetch the parent IndividualApplication
        IndividualApplication app = [
            SELECT Id, Budget_Data__c, uNI_GADStartDate__c, uNI_ImplementationStartDate__c,uNI_ImplementationEndDate__c,uNI_Project_Year__c, uNI_CurrentBudgetStatus__c,uNI_ApprovedFundingCieling__c
            FROM IndividualApplication
            WHERE Id = :parentId
            LIMIT 1
        ];

        // Read Budget_Data_Columns__c (multi-select stored on uNI_BudgetDataColumns__c for this IA)
        List<uNI_BudgetDataColumns__c> bdColumns = [
            SELECT Id, uNI_Budget_Data_Columns__c,uNI_Custom_Columns_Original_Labels__c,uNI_Custom_Columns_Updated_Labels__c 
            FROM uNI_BudgetDataColumns__c
            WHERE uNI_Investments__c = :parentId
              AND is_Active__c = true
        ];

        // Build selectedColumns from stored multi-select (semicolon-delimited string)
        List<String> selectedColumns = new List<String>();
        if (bdColumns != null && !bdColumns.isEmpty() && bdColumns[0].uNI_Budget_Data_Columns__c != null) {
            selectedColumns = new List<String>(
                bdColumns[0].uNI_Budget_Data_Columns__c.split(';')
            );

            // Split fields (null-safe for older records that don't have custom label values)
            List<String> budgetCols  = bdColumns[0].uNI_Budget_Data_Columns__c.split(';');
            List<String> updatedLbls = String.isBlank(bdColumns[0].uNI_Custom_Columns_Updated_Labels__c)
                ? new List<String>()
                : bdColumns[0].uNI_Custom_Columns_Updated_Labels__c.split('\\|\\|\\|');
            List<String> originalLbls = String.isBlank(bdColumns[0].uNI_Custom_Columns_Original_Labels__c)
                ? new List<String>()
                : bdColumns[0].uNI_Custom_Columns_Original_Labels__c.split('\\|\\|\\|');


            for (String budgetCol : budgetCols) {
                budgetCol = budgetCol.trim();

                // Find match in updated labels
                Integer idx = updatedLbls.indexOf(budgetCol);

                if (idx != -1 && idx < originalLbls.size() && idx < updatedLbls.size()) {
                    String originalLabel = originalLbls[idx];
                    String customLabel = updatedLbls[idx];

                    // Match Custom X
                    if (originalLabel.containsIgnoreCase('Custom 1')) {
                        result.put('custom1',true);
                        result.put('custom1Label',customLabel);
                    } else if (originalLabel.containsIgnoreCase('Custom 2')) {
                        result.put('custom2', true);
                        result.put('custom2Label',customLabel);
                    } else if (originalLabel.containsIgnoreCase('Custom 3')) {
                        result.put('custom3', true);
                        result.put('custom3Label',customLabel);
                    } else if (originalLabel.containsIgnoreCase('Custom 4')) {
                        result.put('custom4', true);
                        result.put('custom4Label',customLabel);
                    } else if (originalLabel.containsIgnoreCase('Custom 5')) {
                        result.put('custom5', true);
                        result.put('custom5Label',customLabel);
                    } else if (originalLabel.containsIgnoreCase('Custom 6')) {
                        result.put('custom6', true);
                        result.put('custom6Label',customLabel);
                    } else if (originalLabel.containsIgnoreCase('Custom 7')) {
                        result.put('custom7', true);
                        result.put('custom7Label',customLabel);
                    } else if (originalLabel.containsIgnoreCase('Custom 8')) {
                        result.put('custom8', true);
                        result.put('custom8Label',customLabel);
                    } else if (originalLabel.containsIgnoreCase('Custom 9')) {
                        result.put('custom9', true);
                        result.put('custom9Label',customLabel);
                    } else if (originalLabel.containsIgnoreCase('Custom 10')) {
                        result.put('custom10', true);
                        result.put('custom10Label',customLabel);
                    } else if (originalLabel.containsIgnoreCase('Custom 11')) {
                        result.put('custom11', true);
                        result.put('custom11Label',customLabel);
                    } else if (originalLabel.containsIgnoreCase('Custom 12')) {
                        result.put('custom12', true);
                        result.put('custom12Label',customLabel);
                    }
                }
            }
            System.debug('@@seleColumsn size ' + selectedColumns.size());
            System.debug('@@seleColumss ' + selectedColumns);
        }
        result.put('allowedBudget', app.uNI_ApprovedFundingCieling__c);
        // Return selected columns to LWC so it can show/hide table columns.
        result.put('selectedColumns', selectedColumns);
        result.put('showTable', selectedColumns.size() > 0);

        // ---------------------------------------------------------------------
        // 1️⃣ Fetch Budget Data (VERSION FILTER)
        // ---------------------------------------------------------------------
        List<uNI_BudgetData__c> data;

        if (String.isBlank(version)) {
            data = [
                SELECT Id,
                       uNI_IndividualApplication__c,
                       uNI_Summary_Budget__c,
                       uNI_PortfolioOutput__c,
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
                       uNI_CostTotalCoFundingUS__c
                FROM uNI_BudgetData__c
                WHERE uNI_IndividualApplication__c = :parentId
            ];
        } else {
            data = [
                SELECT Id,
                       uNI_IndividualApplication__c,
                       uNI_Summary_Budget__c,
                       uNI_PortfolioOutput__c,
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
                WHERE uNI_IndividualApplication__c = :parentId
                  AND uNI_Version__c = :version
            ];
        }

        List<Map<String, Object>> dataList = new List<Map<String, Object>>();
        for (uNI_BudgetData__c rec : data) {
            Map<String, Object> m = new Map<String, Object>();
            m.put('id', rec.Id);
            m.put('output', rec.uNI_PortfolioOutput__c);
            m.put('activity', rec.uNI_Activity__c);
            m.put('subActivity', rec.uNI_SubActivity__c);
            m.put('orgName', rec.uNI_Summary_Budget__c);
            m.put('country', rec.uNI_Country__c);
            m.put('countrySNU', rec.uNI_CountrySNU__c);
            m.put('year', rec.uNI_Years__c != null ? String.valueOf(rec.uNI_Years__c) : null);
            m.put('expenseGroup', rec.uNI_ExpenseGroup__c);
            m.put('expenseType', rec.uNI_ExpenseType__c);
            m.put('unitCost', rec.uNI_UnitCost__c);
            m.put('numUnits', rec.uNI_NoofUnits__c);
            m.put('percentUnitaid', rec.uNI_AllocatedtoUnitaid__c);
            m.put('totalCost', rec.uNI_TotalCost__c);
            m.put('description', rec.uNI_Description__c);
            m.put('assumptions', rec.uNI_Assumptions__c);

            // Stage Gate & Funding
            m.put('stageGate', rec.uNI_StageGate__c);
            m.put('fundingSrc', rec.uNI_FundingSource__c);

            // Grouping 1 (Option A)
            m.put('grp1ACost', rec.uNI_CostTotalOptA__c);

            // Grouping 1 (Option B)
            m.put('grp1BCostPerUnitVal', rec.uNI_CostPerUnit__c);
            m.put('grp1BMeasUnitVal', rec.uNI_MeasurementUnit__c);
            m.put('grp1BNoOfUnitsVal', rec.uNI_NoofUnits__c);
            m.put('grp1BMultiplierVal', rec.uNI_Multiplier__c);
            m.put('grp1BTotalVal', rec.uNI_CostTotalGrp2__c);

            // Grouping 2: Complementary
            m.put('grp2CostPerUnit', rec.uNI_CostTotalGrp2__c);
            m.put('grp2PercUnitaid', rec.uNI_AllocatedtoUnitaid__c);
            m.put('grp2PercCoFunding', rec.uNI_CostAllocatedToCofunding__c);
            m.put('grp2USDUnitaid', rec.uNI_CostTotalUnitaidUS__c);
            m.put('grp2USDCoFunding', rec.uNI_CostTotalCoFundingUS__c);
            m.put('grp2totalProj', rec.uNI_TotalCost__c);

            m.put('custom1Val',  rec.uNI_Custom1Text__c);
            m.put('custom2Val',  rec.uNI_Custom2Text__c);
            m.put('custom3Val',  rec.uNI_Custom3Text__c);
            m.put('custom4Val',  rec.uNI_Custom4Perc__c);
            m.put('custom5Val',  rec.uNI_Custom5Perc__c);
            m.put('custom6Val',  rec.uNI_Custom6Perc__c);
            m.put('custom7Val',  rec.uNI_Custom7US__c);
            m.put('custom8Val',  rec.uNI_Custom8US__c);
            m.put('custom9Val',  rec.uNI_Custom9US__c);
            m.put('custom10Val', rec.uNI_Custom10Num__c);
            m.put('custom11Val', rec.uNI_Custom11Num__c);
            m.put('custom12Val', rec.uNI_Custom12Num__c);

            dataList.add(m);
        }
        result.put('data', dataList);

        // ---------------------------------------------------------------------
        // 2️⃣ Fetch Picklist Options (same as before, plus version filter for expense groups)
        // ---------------------------------------------------------------------

        // Organization names (version-aware)
        System.debug('BudgetDataController: orgNames query -> parentId=' + parentId + ', version=' + version);
        List<uNI_SummaryBudget__c> summaryBudgets;
        if (String.isBlank(version)) {
            summaryBudgets = [
                SELECT Id, Name, uNI_Investment_record_type__c
                FROM uNI_SummaryBudget__c
                WHERE uNI_IndividualApplication__c = :parentId
                    AND is_Full_Row_Span__c = false AND uNI_Investment_record_type__c='Investment'
                ORDER BY is_Lead_Organization_1__c DESC
            ];
        } else {
            summaryBudgets = [
                SELECT Id, Name, uNI_Version__c, uNI_Investment_record_type__c
                FROM uNI_SummaryBudget__c
                WHERE uNI_IndividualApplication__c = :parentId
                  AND is_Full_Row_Span__c = false AND uNI_Investment_record_type__c='Investment'
                  AND (uNI_Version__c = :version OR uNI_Version__c = null)
                ORDER BY is_Lead_Organization_1__c DESC
            ];
        }
        System.debug('BudgetDataController: orgNames result size=' + (summaryBudgets == null ? 0 : summaryBudgets.size()));
        if (summaryBudgets != null) {
            for (uNI_SummaryBudget__c sb : summaryBudgets) {
                System.debug('BudgetDataController: orgName => Id=' + sb.Id + ', Name=' + sb.Name + ', version=' + sb.uNI_Version__c + ', type=' + sb.uNI_Investment_record_type__c);
            }
        }

        List<Map<String, String>> orgNames = new List<Map<String, String>>();
        for (uNI_SummaryBudget__c summBd : summaryBudgets) {
            orgNames.add(new Map<String, String>{
                'label' => summBd.Name,
                'value' => summBd.Id
            });
        }

        // Outputs
        List<Map<String, String>> outputOptions = new List<Map<String, String>>();
        if (String.isBlank(version)) {
            uNI_PortfolioOutput__c crosscuttingOutput;
            for (uNI_PortfolioOutput__c o : [
                SELECT Id, uNI_OutputTitle__c, uNI_InternalSequence__c
                FROM uNI_PortfolioOutput__c
                WHERE uNI_IndividualApplication__c = :parentId
                  AND uNI_Logframe__c != null
                ORDER BY uNI_InternalSequence__c ASC, CreatedDate ASC
            ]) {
                if (String.isBlank(o.uNI_OutputTitle__c)) continue;
                if (o.uNI_OutputTitle__c.trim().equalsIgnoreCase('Crosscutting')) {
                    crosscuttingOutput = o;
                    continue;
                }
                outputOptions.add(new Map<String, String>{ 'label' => o.uNI_OutputTitle__c, 'value'  => o.Id });
                System.debug('BudgetDataController: output option => Id=' + o.Id + ', title=' + o.uNI_OutputTitle__c + ', version=<all>');
            }
            if (crosscuttingOutput != null) {
                outputOptions.add(new Map<String, String>{ 'label' => crosscuttingOutput.uNI_OutputTitle__c, 'value' => crosscuttingOutput.Id });
            }
        } else {
            uNI_PortfolioOutput__c crosscuttingOutput;
            for (uNI_PortfolioOutput__c o : [
                SELECT Id, uNI_OutputTitle__c, uNI_InternalSequence__c, uNI_Version__c
                FROM uNI_PortfolioOutput__c
                WHERE uNI_IndividualApplication__c = :parentId
                  AND uNI_Logframe__c != null
                  AND (uNI_Version__c = :version OR uNI_Version__c = null)
                ORDER BY uNI_InternalSequence__c ASC, CreatedDate ASC
            ]) {
                if (String.isBlank(o.uNI_OutputTitle__c)) continue;
                if (o.uNI_OutputTitle__c.trim().equalsIgnoreCase('Crosscutting')) {
                    crosscuttingOutput = o;
                    continue;
                }
                outputOptions.add(new Map<String, String>{ 'label' => o.uNI_OutputTitle__c, 'value'  => o.Id });
                System.debug('BudgetDataController: output option => Id=' + o.Id + ', title=' + o.uNI_OutputTitle__c + ', version=' + o.uNI_Version__c);
            }
            if (crosscuttingOutput != null) {
                outputOptions.add(new Map<String, String>{ 'label' => crosscuttingOutput.uNI_OutputTitle__c, 'value' => crosscuttingOutput.Id });
            }
        }

        // Funding Source (Donor Agreement)
        List<Map<String, String>> fundingSources = new List<Map<String, String>>();
        for (uNI_DonorAgreement__c e : [
            SELECT Id, Name, uNI_DonorName__c, uNI_RMStatus__c
            FROM uNI_DonorAgreement__c
            WHERE uNI_AgreementActive__c = true
            ORDER BY CreatedDate ASC
        ]) {
            fundingSources.add(new Map<String, String>{
                'label' => e.Name,
                'value' => e.Id
            });
        }

        // Country
        List<Map<String, String>> countryOptions = new List<Map<String, String>>();
        for (uNI_Country__c e : [
            SELECT Id, Name
            FROM uNI_Country__c
            ORDER BY Name ASC
        ]) {
            countryOptions.add(new Map<String, String>{
                'label' => e.Name,
                'value' => e.Id
            });
        }

        // Expense Groups (from uNI_Expense_Types__c, VERSION AWARE)
        List<uNI_Expense_Types__c> expenseTypeRecords;
        if (String.isBlank(version)) {
            expenseTypeRecords = [
                SELECT Id, Name
                FROM uNI_Expense_Types__c
                WHERE uNI_IndividualApplication__c = :parentId and uNI_CostType__c ='Budget'
            ];
        } else {
            expenseTypeRecords = [
                SELECT Id, Name, uNI_Version__c
                FROM uNI_Expense_Types__c
                WHERE uNI_IndividualApplication__c = :parentId and uNI_CostType__c ='Budget'
                  AND uNI_Version__c = :version
            ];
        }

        List<Map<String, String>> expenseGroupOptions = new List<Map<String, String>>();
        for (uNI_Expense_Types__c e : expenseTypeRecords) {
            expenseGroupOptions.add(new Map<String, String>{
                'label' => e.Name,
                'value' => e.Name
            });
        }

        // Year options from IA start date + years
        List<String> yearOptions = new List<String>();
        Integer startYear;
        Integer endYear ;
        Integer duration;
        if (app.uNI_ImplementationStartDate__c != null) {
            startYear = app.uNI_ImplementationStartDate__c.year();
        }
        if (app.uNI_ImplementationEndDate__c != null) {
            endYear = app.uNI_ImplementationEndDate__c.year();
        }
        duration = endYear-startYear;
        if (startYear != null && app.uNI_Project_Year__c != null) {
           // Integer startYearVal = startYear.year();
            for (Integer i = 0; i <=duration; i++) {
                yearOptions.add(String.valueOf(startYear+ i));
            }
        }
        System.debug('@@yearOptions ' + yearOptions);

        result.put('outputOptions', outputOptions);
        result.put('orgNames', orgNames);
        result.put('expenseGroupOptions', expenseGroupOptions);
        result.put('fundingSources', fundingSources);
        result.put('countryOptions', countryOptions);
        result.put('yearOptions', yearOptions);
        result.put('status', app.uNI_CurrentBudgetStatus__c);

        return result;
    }

    // -------------------------------------------------------------------------
    // LATEST VS PREVIOUS VERSION COMPARISON
    // -------------------------------------------------------------------------
    public class BudgetComparisonRow {
        @AuraEnabled public String id;
        @AuraEnabled public String changeType;
        @AuraEnabled public String fieldLabel;
        @AuraEnabled public String output;
        @AuraEnabled public String activity;
        @AuraEnabled public String subActivity;
        @AuraEnabled public String orgName;
        @AuraEnabled public String country;
        @AuraEnabled public String countrySNU;
        @AuraEnabled public String year;
        @AuraEnabled public String expenseGroup;
        @AuraEnabled public String expenseType;
        @AuraEnabled public String previousValue;
        @AuraEnabled public String latestValue;
    }

    public class BudgetComparisonResult {
        @AuraEnabled public String latestVersion;
        @AuraEnabled public String previousVersion;
        @AuraEnabled public String message;
        @AuraEnabled public List<BudgetComparisonRow> differences;

        public BudgetComparisonResult() {
            differences = new List<BudgetComparisonRow>();
        }
    }

    private class BudgetRowSnapshot {
        String key;
        String output;
        String activity;
        String subActivity;
        String orgName;
        String country;
        String countrySNU;
        String year;
        String expenseGroup;
        String expenseType;
        Map<String, String> values = new Map<String, String>();
    }

    private class VersionComparator implements System.Comparator<String> {
        public Integer compare(String a, String b) {
            Integer aNum = parseVersionToInteger(a);
            Integer bNum = parseVersionToInteger(b);

            if (aNum != null && bNum != null) {
                if (aNum == bNum) return 0;
                return aNum > bNum ? -1 : 1;
            }
            if (aNum != null) return -1;
            if (bNum != null) return 1;

            if (a == b) return 0;
            String aVal = a == null ? '' : a.toLowerCase();
            String bVal = b == null ? '' : b.toLowerCase();
            return bVal.compareTo(aVal);
        }
    }

    @AuraEnabled(cacheable=true)
    public static BudgetComparisonResult getBudgetDataComparison(Id parentId) {
        BudgetComparisonResult result = new BudgetComparisonResult();
        if (parentId == null) {
            result.message = 'Parent Id is required to compare versions.';
            return result;
        }

        List<String> versions = fetchVersions(parentId);
        if (versions.isEmpty()) {
            result.message = 'No versioned budget data found for this application.';
            return result;
        }
        if (versions.size() == 1) {
            result.latestVersion = versions[0];
            result.message = 'Only one budget data version exists. Add another version to see differences.';
            return result;
        }

        result.latestVersion = versions[0];
        result.previousVersion = versions[1];

        Map<String, BudgetRowSnapshot> latestMap = buildSnapshotMap(parentId, result.latestVersion);
        Map<String, BudgetRowSnapshot> previousMap = buildSnapshotMap(parentId, result.previousVersion);

        Set<String> allKeys = new Set<String>();
        allKeys.addAll(latestMap.keySet());
        allKeys.addAll(previousMap.keySet());

        Map<String, String> fieldLabels = new Map<String, String>{
            'stageGate' => 'Stage Gate',
            'fundingSrc' => 'Funding Source',
            'unitCost' => 'Unit Cost',
            'numUnits' => 'Number of Units',
            'percentUnitaid' => 'Percent Unitaid',
            'totalCost' => 'Total Cost',
            'description' => 'Description',
            'assumptions' => 'Assumptions',
            'grp1ACostVal' => 'Cost (total, US$)',
            'grp1BCostPerUnitVal' => 'Cost (per unit, US$)',
            'grp1BMeasUnitVal' => 'Measurement Unit',
            'grp1BMultiplierVal' => 'Multiplier',
            'grp2CostPerUnit' => 'Complementary: Cost (total, US$)',
            'grp2PercUnitaid' => 'Cost (% allocated to Unitaid)',
            'grp2PercCoFunding' => 'Cost (% allocated to co-funding)',
            'grp2USDUnitaid' => 'Cost (total Unitaid, US$)',
            'grp2USDCoFunding' => 'Cost (total co-funding, US$)'
        };

        List<String> fieldOrder = new List<String>{
            'stageGate',
            'fundingSrc',
            'unitCost',
            'numUnits',
            'percentUnitaid',
            'totalCost',
            'description',
            'assumptions',
            'grp1ACostVal',
            'grp1BCostPerUnitVal',
            'grp1BMeasUnitVal',
            'grp1BMultiplierVal',
            'grp2CostPerUnit',
            'grp2PercUnitaid',
            'grp2PercCoFunding',
            'grp2USDUnitaid',
            'grp2USDCoFunding'
        };

        for (String key : allKeys) {
            BudgetRowSnapshot latest = latestMap.get(key);
            BudgetRowSnapshot previous = previousMap.get(key);
            BudgetRowSnapshot context = (latest != null) ? latest : previous;

            if (latest == null || previous == null) {
                BudgetComparisonRow diffRow = buildBaseDiffRow(context, key + '__row');
                diffRow.changeType = (latest == null) ? 'Removed' : 'Added';
                diffRow.fieldLabel = 'Row';
                diffRow.previousValue = displayValue(previous != null ? 'Present in v' + result.previousVersion : null);
                diffRow.latestValue = displayValue(latest != null ? 'Present in v' + result.latestVersion : null);
                result.differences.add(diffRow);
                continue;
            }

            for (String fieldKey : fieldOrder) {
                String previousVal = previous.values.get(fieldKey);
                String latestVal = latest.values.get(fieldKey);

                if (areValuesEqual(previousVal, latestVal)) {
                    continue;
                }

                BudgetComparisonRow diffRow = buildBaseDiffRow(context, key + '__' + fieldKey);
                diffRow.changeType = 'Modified';
                diffRow.fieldLabel = fieldLabels.get(fieldKey);
                diffRow.previousValue = displayValue(previousVal);
                diffRow.latestValue = displayValue(latestVal);

                result.differences.add(diffRow);
            }
        }

        if (result.differences.isEmpty()) {
            result.message = 'No differences found between versions ' + result.previousVersion + ' and ' + result.latestVersion + '.';
        }

        return result;
    }

    private static BudgetComparisonRow buildBaseDiffRow(BudgetRowSnapshot snapshot, String idValue) {
        BudgetComparisonRow row = new BudgetComparisonRow();
        row.id = idValue;
        if (snapshot == null) {
            return row;
        }
        row.output = snapshot.output;
        row.activity = snapshot.activity;
        row.subActivity = snapshot.subActivity;
        row.orgName = snapshot.orgName;
        row.country = snapshot.country;
        row.countrySNU = snapshot.countrySNU;
        row.year = snapshot.year;
        row.expenseGroup = snapshot.expenseGroup;
        row.expenseType = snapshot.expenseType;
        return row;
    }

    private static Map<String, BudgetRowSnapshot> buildSnapshotMap(Id parentId, String version) {
        Map<String, BudgetRowSnapshot> mapByKey = new Map<String, BudgetRowSnapshot>();
        if (String.isBlank(version)) {
            return mapByKey;
        }

        List<uNI_BudgetData__c> records = [
            SELECT Id,
                   uNI_Version__c,
                   uNI_PortfolioOutput__c,
                   uNI_PortfolioOutput__r.uNI_OutputTitle__c,
                   uNI_Activity__c,
                   uNI_SubActivity__c,
                   uNI_Summary_Budget__c,
                   uNI_Summary_Budget__r.Name,
                   uNI_Country__c,
                   uNI_CountrySNU__c,
                   uNI_Years__c,
                   uNI_ExpenseGroup__c,
                   uNI_ExpenseType__c,
                   uNI_UnitCost__c,
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
                   uNI_CostTotalGrp2__c,
                   uNI_CostAllocatedToCofunding__c,
                   uNI_CostTotalUnitaidUS__c,
                   uNI_CostTotalCoFundingUS__c
            FROM uNI_BudgetData__c
            WHERE uNI_IndividualApplication__c = :parentId
              AND uNI_Version__c = :version
        ];

        for (uNI_BudgetData__c rec : records) {
            BudgetRowSnapshot snap = new BudgetRowSnapshot();
            snap.output = rec.uNI_PortfolioOutput__r != null ? rec.uNI_PortfolioOutput__r.uNI_OutputTitle__c : null;
            snap.activity = rec.uNI_Activity__c;
            snap.subActivity = rec.uNI_SubActivity__c;
            snap.orgName = rec.uNI_Summary_Budget__r != null ? rec.uNI_Summary_Budget__r.Name : null;
            snap.country = rec.uNI_Country__c;
            snap.countrySNU = rec.uNI_CountrySNU__c;
            snap.year = rec.uNI_Years__c != null ? String.valueOf(rec.uNI_Years__c) : null;
            snap.expenseGroup = rec.uNI_ExpenseGroup__c;
            snap.expenseType = rec.uNI_ExpenseType__c;

            snap.values.put('stageGate', safeString(rec.uNI_StageGate__c));
            snap.values.put('fundingSrc', safeString(rec.uNI_FundingSource__c));
            snap.values.put('unitCost', safeString(rec.uNI_UnitCost__c));
            snap.values.put('numUnits', safeString(rec.uNI_NoofUnits__c));
            snap.values.put('percentUnitaid', safeString(rec.uNI_AllocatedtoUnitaid__c));
            snap.values.put('totalCost', safeString(rec.uNI_TotalCost__c));
            snap.values.put('description', safeString(rec.uNI_Description__c));
            snap.values.put('assumptions', safeString(rec.uNI_Assumptions__c));
            snap.values.put('grp1ACostVal', safeString(rec.uNI_CostTotalOptA__c));
            snap.values.put('grp1BCostPerUnitVal', safeString(rec.uNI_CostPerUnit__c));
            snap.values.put('grp1BMeasUnitVal', safeString(rec.uNI_MeasurementUnit__c));
            snap.values.put('grp1BMultiplierVal', safeString(rec.uNI_Multiplier__c));
            snap.values.put('grp2CostPerUnit', safeString(rec.uNI_CostTotalGrp2__c));
            snap.values.put('grp2PercUnitaid', safeString(rec.uNI_AllocatedtoUnitaid__c));
            snap.values.put('grp2PercCoFunding', safeString(rec.uNI_CostAllocatedToCofunding__c));
            snap.values.put('grp2USDUnitaid', safeString(rec.uNI_CostTotalUnitaidUS__c));
            snap.values.put('grp2USDCoFunding', safeString(rec.uNI_CostTotalCoFundingUS__c));

            snap.key = buildSnapshotKey(snap);
            mapByKey.put(snap.key, snap);
        }

        return mapByKey;
    }

    private static String buildSnapshotKey(BudgetRowSnapshot snap) {
        List<String> parts = new List<String>{
            normalizeKeyPart(snap.output),
            normalizeKeyPart(snap.activity),
            normalizeKeyPart(snap.subActivity),
            normalizeKeyPart(snap.orgName),
            normalizeKeyPart(snap.country),
            normalizeKeyPart(snap.countrySNU),
            normalizeKeyPart(snap.year),
            normalizeKeyPart(snap.expenseGroup),
            normalizeKeyPart(snap.expenseType)
        };
        return String.join(parts, '|');
    }

    private static String normalizeKeyPart(String value) {
        return value == null ? '' : value.trim().toLowerCase();
    }

    private static Boolean areValuesEqual(String a, String b) {
        String normA = normalizeValue(a);
        String normB = normalizeValue(b);
        if (normA == null && normB == null) {
            return true;
        }
        if (normA != null) {
            return normA.equals(normB);
        }
        return false;
    }

    private static String normalizeValue(String value) {
        if (String.isBlank(value)) {
            return null;
        }
        String trimmed = value.trim();
        try {
            Decimal numeric = Decimal.valueOf(trimmed);
            return numeric.stripTrailingZeros().toPlainString();
        } catch (Exception e) {
            // not numeric
        }
        return trimmed;
    }

    private static String displayValue(String value) {
        return value == null ? '' : value;
    }

    private static String safeString(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private static List<String> fetchVersions(Id parentId) {
        List<String> versions = new List<String>();
        for (AggregateResult ar : [
            SELECT uNI_Version__c versionValue
            FROM uNI_BudgetData__c
            WHERE uNI_IndividualApplication__c = :parentId
              AND uNI_Version__c != null
            GROUP BY uNI_Version__c
        ]) {
            String v = (String) ar.get('versionValue');
            if (!String.isBlank(v)) {
                versions.add(v);
            }
        }

        versions.sort(new VersionComparator());
        return versions;
    }

    private static Integer parseVersionToInteger(String value) {
        try {
            return String.isBlank(value) ? null : Integer.valueOf(value);
        } catch (Exception e) {
            return null;
        }
    }

    // -------------------------------------------------------------------------
        // SAVE SELECTED COLUMNS (V2)
    // -------------------------------------------------------------------------
    @AuraEnabled
    public static void saveSelectedColumnsV2(Id parentId, List<String> selectedColumns,string customOriginalLabels, string customUpdatedLabels) {
        if (parentId == null) {
            throw new AuraHandledException('Parent Id is required');
        }

        IndividualApplication app = [
            SELECT Id, Budget_Data__c
            FROM IndividualApplication
            WHERE Id = :parentId
            LIMIT 1
        ];

        List<uNI_BudgetDataColumns__c> bdColumns = [
            SELECT Id, uNI_Budget_Data_Columns__c
            FROM uNI_BudgetDataColumns__c
            WHERE uNI_Investments__c = :parentId
              AND is_Active__c = true
        ];

        // Prevent re-generating if already generated once
        if (bdColumns != null && !bdColumns.isEmpty() && bdColumns[0].uNI_Budget_Data_Columns__c != null) {
            throw new AuraHandledException('Table has already been generated once. Selected columns cannot be changed.');
        }

        String valueToSet = '';
        if (selectedColumns != null && !selectedColumns.isEmpty()) {
            valueToSet = String.join(selectedColumns, ';');
        }

        // Persist selected columns on uNI_BudgetDataColumns__c so future loads reuse the same column set.
        uNI_BudgetDataColumns__c bdColumn = new uNI_BudgetDataColumns__c(
            uNI_Investments__c = parentId,
            uNI_Budget_Data_Columns__c = valueToSet,
            is_Active__c = true,
            uNI_Custom_Columns_Original_Labels__c=customOriginalLabels,
            uNI_Custom_Columns_Updated_Labels__c=customUpdatedLabels,
            Type__c = 'Budget Data'
        );
        insert bdColumn;
    }

    // Old saveSelectedColumns (on IA multi-picklist) – left as is if still used anywhere
    @AuraEnabled
    public static void saveSelectedColumns(Id parentId, List<String> selectedColumns) {
        if (parentId == null) {
            throw new AuraHandledException('Parent Id is required');
        }
        IndividualApplication app = [
            SELECT Id, Budget_Data__c
            FROM IndividualApplication
            WHERE Id = :parentId
            LIMIT 1
        ];

        // Prevent re-generating if already generated once
        if (app != null && app.Budget_Data__c != null && app.Budget_Data__c.trim().length() > 0) {
            throw new AuraHandledException('Table has already been generated once. Selected columns cannot be changed.');
        }

        String valueToSet = '';
        if (selectedColumns != null && !selectedColumns.isEmpty()) {
            valueToSet = String.join(selectedColumns, ';');
        }
        app.Budget_Data__c = valueToSet;
        update app;
    }

    // -------------------------------------------------------------------------
    // PICKLIST DATA (unchanged)
    // -------------------------------------------------------------------------
    @AuraEnabled(cacheable=true)
    public static Map<String, Object> getPicklistData(Id parentId) {
        Map<String, Object> result = new Map<String, Object>();

        // Outputs
        List<Map<String, String>> outputOptions = new List<Map<String, String>>();
        for (uNI_PortfolioOutput__c rec : [
            SELECT Id, uNI_OutputTitle__c
            FROM uNI_PortfolioOutput__c
            WHERE uNI_IndividualApplication__c = :parentId
              AND uNI_Logframe__c != null
            ORDER BY uNI_InternalSequence__c ASC, CreatedDate ASC
        ]) {
            outputOptions.add(new Map<String, String>{
                'label' => rec.uNI_OutputTitle__c,
                'value' => rec.Id
            });
        }
        result.put('outputOptions', outputOptions);

        // Years (from IA via any output)
        List<String> yearOptions = new List<String>();
        uNI_PortfolioOutput__c oneRecord = [
            SELECT uNI_IndividualApplication__r.uNI_GADStartDate__c,
                   uNI_IndividualApplication__r.uNI_Project_Year__c
            FROM uNI_PortfolioOutput__c
            WHERE uNI_IndividualApplication__c = :parentId
              AND uNI_Logframe__c != null
            LIMIT 1
        ];

        if (oneRecord != null && oneRecord.uNI_IndividualApplication__r != null) {
            Date startDate = System.today();
            if (oneRecord.uNI_IndividualApplication__r.uNI_GADStartDate__c != null) {
                startDate = oneRecord.uNI_IndividualApplication__r.uNI_GADStartDate__c;
            }
            Integer totalYears = (Integer) oneRecord.uNI_IndividualApplication__r.uNI_Project_Year__c;
            if (startDate != null && totalYears != null) {
                Integer startYear = startDate.year();
                for (Integer i = 0; i < totalYears; i++) {
                    yearOptions.add(String.valueOf(startYear + i));
                }
            }
        }
        result.put('yearOptions', yearOptions);

        // Expense Type picklist (Names)
        List<String> expenseTypeOptions = new List<String>();
        for (uNI_Expense_Types__c rec : [
            SELECT Name
            FROM uNI_Expense_Types__c
            WHERE uNI_IndividualApplication__c = :parentId and uNI_CostType__c ='Budget'
            ORDER BY Name
        ]) {
            expenseTypeOptions.add(rec.Name);
        }
        result.put('expenseTypeOptions', expenseTypeOptions);

        return result;
    }

    // -------------------------------------------------------------------------
    // Helper: toDecimal
    // -------------------------------------------------------------------------
    private static Decimal toDecimal(Object val) {
        if (val == null) return null;
        if (val instanceof Decimal) return (Decimal) val;
        if (val instanceof Integer) return Decimal.valueOf((Integer) val);
        if (val instanceof Long)    return Decimal.valueOf((Long) val);
        if (val instanceof Double)  return Decimal.valueOf((Double) val);
        if (val instanceof String && ((String) val).trim() != '') {
            try {
                return Decimal.valueOf((String) val);
            } catch (Exception e) {
                return null;
            }
        }
        return null;
    }

    // -------------------------------------------------------------------------
    // SAVE BUDGET DATA (VERSION AWARE)
    // -------------------------------------------------------------------------
    @AuraEnabled
    public static void saveBudgetData(String parentId, String budgetDataJSON, String status, Decimal actualBudget,String version) {
        if (String.isBlank(budgetDataJSON)) return;

        List<Object> rawList = (List<Object>) JSON.deserializeUntyped(budgetDataJSON);
        List<uNI_BudgetData__c> recordsToInsert = new List<uNI_BudgetData__c>();
        for (Object obj : rawList) {
            Map<String, Object> row = (Map<String, Object>) obj;
            uNI_BudgetData__c rec = new uNI_BudgetData__c();
            rec.uNI_IndividualApplication__c = parentId;
            rec.uNI_Version__c = version; // 🔹 VERSION SET HERE

            String idVal = String.valueOf(row.get('id'));
            rec.Id = (idVal != null && idVal.startsWith('temp_')) ? null : idVal;

            rec.uNI_PortfolioOutput__c  = ((String) row.get('output'))!=''?((String) row.get('output')):null ;
            rec.uNI_Activity__c         = (String) row.get('activity');
            rec.uNI_SubActivity__c      = (String) row.get('subActivity');
            System.debug('@@orgName ' + row.get('orgName'));
            rec.uNI_Summary_Budget__c   = (String) row.get('orgName') != '' ? (String) row.get('orgName') : null;
            rec.uNI_Country__c          = (String) row.get('country');
            rec.uNI_CountrySNU__c       = (String) row.get('countrySNU');

            rec.uNI_Years__c = (row.get('year') != null && row.get('year') != '')
                ? Integer.valueOf((String) row.get('year'))
                : null;

            rec.uNI_ExpenseGroup__c     = (String) row.get('expenseGroup');
            rec.uNI_ExpenseType__c      = (String) row.get('expenseType');
            rec.uNI_Description__c      = (String) row.get('description');
            rec.uNI_Assumptions__c      = (String) row.get('assumptions');

            // Stage Gate & funding
            rec.uNI_StageGate__c        = (String) row.get('stageGate');
            rec.uNI_FundingSource__c    = (String) row.get('fundingSrc');

            System.debug('@@group 1 cost val ' + toDecimal(row.get('grp1ACostVal')));
            rec.uNI_CostTotalOptA__c    = toDecimal(row.get('grp1ACostVal'));

            // Grouping 1 (Option B)
            rec.uNI_CostPerUnit__c      = toDecimal(row.get('grp1BCostPerUnitVal'));
            rec.uNI_MeasurementUnit__c  = (String) row.get('grp1BMeasUnitVal');
            rec.uNI_NoofUnits__c        = toDecimal(row.get('grp1BNoOfUnitsVal'));
            rec.uNI_Multiplier__c       = toDecimal(row.get('grp1BMultiplierVal'));
            rec.uNI_CostTotalOptB__c    = toDecimal(row.get('grp1BTotalVal'));

            // Grouping 2: Complementary
            rec.uNI_CostTotalGrp2__c          = toDecimal(row.get('grp2CostPerUnit'));
            rec.uNI_AllocatedtoUnitaid__c     = toDecimal(row.get('grp2PercUnitaid'));
            rec.uNI_CostAllocatedToCofunding__c = toDecimal(row.get('grp2PercCoFunding'));
            rec.uNI_CostTotalUnitaidUS__c     = toDecimal(row.get('grp2USDUnitaid'));
            rec.uNI_CostTotalCoFundingUS__c   = toDecimal(row.get('grp2USDCoFunding'));
            rec.uNI_TotalCost__c              = toDecimal(row.get('grp2totalProj'));

            // Custom fields
            rec.uNI_Custom1Text__c              = String.valueOf(row.get('custom1Val'));
            rec.uNI_Custom2Text__c              = String.valueOf(row.get('custom2Val'));
            rec.uNI_Custom3Text__c              = String.valueOf(row.get('custom3Val'));
            rec.uNI_Custom4Perc__c              = toDecimal(row.get('custom4Val'));
            rec.uNI_Custom5Perc__c              = toDecimal(row.get('custom5Val'));
            rec.uNI_Custom6Perc__c              = toDecimal(row.get('custom6Val'));
            rec.uNI_Custom7US__c                = toDecimal(row.get('custom7Val'));
            rec.uNI_Custom8US__c                = toDecimal(row.get('custom8Val'));
            rec.uNI_Custom9US__c                = toDecimal(row.get('custom9Val'));
            rec.uNI_Custom10Num__c              = toDecimal(row.get('custom10Val'));
            rec.uNI_Custom11Num__c              = toDecimal(row.get('custom11Val'));
            rec.uNI_Custom12Num__c              = toDecimal(row.get('custom12Val'));

            System.debug('@@group 1A cost val ' + toDecimal(row.get('grp1ACostVal')));

            recordsToInsert.add(rec);
        }

        if (!recordsToInsert.isEmpty()) {
            upsert recordsToInsert;
        }

        // Update Budget Status on IA
        IndividualApplication indApp = new IndividualApplication(
            Id = parentId,
            uNI_CurrentBudgetStatus__c = status,
            uNI_TotalApprovedBudget__c=actualBudget
        );
        update indApp;

        // If just draft, skip the heavy aggregations
        if (status == 'Draft') {
            return;
        }

        // ---------------------------------------------------------------------
        // BELOW: all your aggregation logic, now VERSION-AWARE via budgetList
        // ---------------------------------------------------------------------

        // Step 1: Get portfolio outputs in chronological order for THIS VERSION
        List<uNI_BudgetData__c> budgetList;
        if (String.isBlank(version)) {
            budgetList = [
                SELECT Id,
                       uNI_IndividualApplication__c,
                       uNI_PortfolioOutput__c,
                       uNI_Years__c,
                       uNI_Summary_Budget__c,
                       uNI_ExpenseType__c,
                       uNI_ExpenseGroup__c,
                       uNI_TotalCost__c,
                       uNI_Country__c
                FROM uNI_BudgetData__c
                WHERE uNI_IndividualApplication__c = :parentId
                  AND uNI_PortfolioOutput__c != null
                ORDER BY CreatedDate ASC
            ];
        } else {
            budgetList = [
                SELECT Id,
                       uNI_IndividualApplication__c,
                       uNI_PortfolioOutput__c,
                       uNI_Years__c,
                       uNI_Summary_Budget__c,
                       uNI_ExpenseType__c,
                       uNI_ExpenseGroup__c,
                       uNI_TotalCost__c,
                       uNI_Version__c,
                       uNI_Country__c
                FROM uNI_BudgetData__c
                WHERE uNI_IndividualApplication__c = :parentId
                  AND uNI_PortfolioOutput__c != null
                  AND uNI_Version__c = :version
                ORDER BY CreatedDate ASC
            ];
        }

        Map<Id, String> outputTitleMap = new Map<Id, String>();
        Set<Id> referencedOutputIds = new Set<Id>();
        for (uNI_BudgetData__c bd : budgetList) {
            if (bd.uNI_PortfolioOutput__c != null) {
                referencedOutputIds.add(bd.uNI_PortfolioOutput__c);
            }
        }
        if (!referencedOutputIds.isEmpty()) {
            for (uNI_PortfolioOutput__c po : [
                SELECT Id, uNI_OutputTitle__c
                FROM uNI_PortfolioOutput__c
                WHERE Id IN :referencedOutputIds
            ]) {
                outputTitleMap.put(po.Id, po.uNI_OutputTitle__c);
            }
        }

        List<Id> orderedOutputIds = new List<Id>();
        Map<Id, Integer> outputIndexMap = new Map<Id, Integer>();

        for (uNI_BudgetData__c bd : budgetList) {
            if (!orderedOutputIds.contains(bd.uNI_PortfolioOutput__c)) {
                orderedOutputIds.add(bd.uNI_PortfolioOutput__c);
                outputIndexMap.put(bd.uNI_PortfolioOutput__c, orderedOutputIds.size());
            }
        }
        System.debug('@@outputIndexMap ' + outputIndexMap);

        // Step 2: Aggregate total cost by ExpenseGroup + Output
        Map<Id, Integer> outputSequenceMap = new Map<Id, Integer>();
        List<uNI_PortfolioOutput__c> orderedOutputs;
        uNI_PortfolioOutput__c crosscuttingOrdered;

        if (String.isBlank(version)) {
            orderedOutputs = [
                SELECT Id, uNI_OutputTitle__c, uNI_InternalSequence__c
                FROM uNI_PortfolioOutput__c
                WHERE uNI_IndividualApplication__c = :parentId
                  AND uNI_Logframe__c != null
                ORDER BY uNI_InternalSequence__c ASC, CreatedDate ASC
            ];
        } else {
            orderedOutputs = [
                SELECT Id, uNI_OutputTitle__c, uNI_InternalSequence__c, uNI_Version__c
                FROM uNI_PortfolioOutput__c
                WHERE uNI_IndividualApplication__c = :parentId
                  AND uNI_Logframe__c != null
                  AND (uNI_Version__c = :version OR uNI_Version__c = null)
                ORDER BY uNI_InternalSequence__c ASC, CreatedDate ASC
            ];
        }

        for (uNI_PortfolioOutput__c o : orderedOutputs) {
            Boolean isCross = o.uNI_OutputTitle__c != null && o.uNI_OutputTitle__c.trim().equalsIgnoreCase('Crosscutting');
            if (isCross) {
                crosscuttingOrdered = o;
                continue;
            }
            outputSequenceMap.put(o.Id, outputSequenceMap.size() + 1);
            if (!outputTitleMap.containsKey(o.Id)) {
                outputTitleMap.put(o.Id, o.uNI_OutputTitle__c);
            }
        }
        if (crosscuttingOrdered != null) {
            outputSequenceMap.put(crosscuttingOrdered.Id, outputSequenceMap.size() + 1);
            if (!outputTitleMap.containsKey(crosscuttingOrdered.Id)) {
                outputTitleMap.put(crosscuttingOrdered.Id, crosscuttingOrdered.uNI_OutputTitle__c);
            }
        }

        Map<String, Decimal> expenseOutputSum = new Map<String, Decimal>();
        Map<String, String> countryByExpenseOutput = new Map<String, String>();
        Map<String, Map<Integer, Decimal>> expenseYearTotals = new Map<String, Map<Integer, Decimal>>(); // ExpenseGroup -> (Year -> Total)
        Map<String, Map<Integer, String>> expenseYearCountries = new Map<String, Map<Integer, String>>(); // ExpenseGroup -> (Year -> Country Id)
        Map<String, Set<Integer>> expenseYearSet = new Map<String, Set<Integer>>(); // ExpenseGroup -> distinct years
        for (uNI_BudgetData__c bd : budgetList) {
            String key = bd.uNI_ExpenseGroup__c + '|' + bd.uNI_PortfolioOutput__c;
            Decimal existing = expenseOutputSum.containsKey(key) ? expenseOutputSum.get(key) : 0;
            expenseOutputSum.put(key, existing + (bd.uNI_TotalCost__c != null ? bd.uNI_TotalCost__c : 0));
            if (bd.uNI_Country__c != null && !countryByExpenseOutput.containsKey(key)) {
                countryByExpenseOutput.put(key, bd.uNI_Country__c);
            }

            // Year-level accumulation for Expense Types
            if (bd.uNI_Years__c != null) {
                Integer yrKey;
                try { yrKey = Integer.valueOf(String.valueOf(bd.uNI_Years__c)); } catch (Exception e) { yrKey = null; }
                if (yrKey != null) {
                    String grp = bd.uNI_ExpenseGroup__c;
                    Map<Integer, Decimal> yrTotals = expenseYearTotals.get(grp);
                    if (yrTotals == null) {
                        yrTotals = new Map<Integer, Decimal>();
                        expenseYearTotals.put(grp, yrTotals);
                    }
                    Decimal yrExisting = yrTotals.containsKey(yrKey) ? yrTotals.get(yrKey) : 0;
                    yrTotals.put(yrKey, yrExisting + (bd.uNI_TotalCost__c != null ? bd.uNI_TotalCost__c : 0));

                    Map<Integer, String> yrCountries = expenseYearCountries.get(grp);
                    if (yrCountries == null) {
                        yrCountries = new Map<Integer, String>();
                        expenseYearCountries.put(grp, yrCountries);
                    }
                    if (bd.uNI_Country__c != null && !yrCountries.containsKey(yrKey)) {
                        yrCountries.put(yrKey, bd.uNI_Country__c);
                    }

                    Set<Integer> yrSet = expenseYearSet.get(grp);
                    if (yrSet == null) {
                        yrSet = new Set<Integer>();
                        expenseYearSet.put(grp, yrSet);
                    }
                    yrSet.add(yrKey);
                }
            }
        }
        System.debug('@@expenseOutputSum ' + expenseOutputSum);

        // Step 3: Existing expense type records, filtered by version if provided
        Map<String, uNI_Expense_Types__c> existingMap = new Map<String, uNI_Expense_Types__c>();
        List<uNI_Expense_Types__c> existingExpenseTypes;

        if (String.isBlank(version)) {
            existingExpenseTypes = [
                SELECT Id, Name, uNI_IndividualApplication__c, Total__c,
                       uNI_Output1__c, uNI_Output2__c, uNI_Output3__c, uNI_Output4__c,
                       uNI_Output5__c, uNI_Output6__c, uNI_Output7__c, uNI_Output8__c,
                       uNI_Output9__c, uNI_Output10__c, uNI_Output11__c, uNI_Output12__c,
                       uNI_Output13__c, uNI_Output14__c, uNI_Output15__c,
                       uNI_Output_Totals__c,
                       uNI_Output1Narrative__c, uNI_Output2Narrative__c, uNI_Output3Narrative__c,
                       uNI_Output4Narrative__c, uNI_Output6Narrative__c, uNI_Output7Narrative__c,
                       uNI_Output8Narrative__c, uNI_Output9Narrative__c, uNI_Output10Narrative__c,
                       uNI_Output11Narrative__c, uNI_Output12Narrative__c, uNI_Output13Narrative__c,
                       uNI_Output14Narrative__c, uNI_Output15Narrative__c,
                       uNI_ExpensePercent__c,
                       uNI_CrossCuttingNarrative__c,
                       uNI_Output5Narrative__c,
                       uNI_Version__c
                FROM uNI_Expense_Types__c
                WHERE uNI_IndividualApplication__c = :parentId and uNI_CostType__c ='Budget'
            ];
        } else {
            existingExpenseTypes = [
                SELECT Id, Name, uNI_IndividualApplication__c, Total__c,
                       uNI_Output1__c, uNI_Output2__c, uNI_Output3__c, uNI_Output4__c,
                       uNI_Output5__c, uNI_Output6__c, uNI_Output7__c, uNI_Output8__c,
                       uNI_Output9__c, uNI_Output10__c, uNI_Output11__c, uNI_Output12__c,
                       uNI_Output13__c, uNI_Output14__c, uNI_Output15__c,
                       uNI_Output_Totals__c,
                       uNI_Output1Narrative__c, uNI_Output2Narrative__c, uNI_Output3Narrative__c,
                       uNI_Output4Narrative__c, uNI_Output6Narrative__c, uNI_Output7Narrative__c,
                       uNI_Output8Narrative__c, uNI_Output9Narrative__c, uNI_Output10Narrative__c,
                       uNI_Output11Narrative__c, uNI_Output12Narrative__c, uNI_Output13Narrative__c,
                       uNI_Output14Narrative__c, uNI_Output15Narrative__c,
                       uNI_ExpensePercent__c,
                       uNI_CrossCuttingNarrative__c,
                       uNI_Output5Narrative__c,
                       uNI_Version__c
                FROM uNI_Expense_Types__c
                WHERE uNI_IndividualApplication__c = :parentId and uNI_CostType__c ='Budget'
                  AND (uNI_Version__c = :version OR uNI_Version__c = null)
            ];
        }

        for (uNI_Expense_Types__c et : existingExpenseTypes) {
            existingMap.put(et.Name, et);
        }
        System.debug('@@existingMap ' + existingMap);

        // Step 4: Build or update ExpenseType records in a map
        Map<String, uNI_Expense_Types__c> expenseTypeMap = new Map<String, uNI_Expense_Types__c>();
        Map<String, Decimal> totalSumByExpense = new Map<String, Decimal>();

        for (String key : expenseOutputSum.keySet()) {
            List<String> parts = key.split('\\|');
            String expType = parts[0];
            Id outputId = (parts.size() > 1) ? (Id) parts[1] : null;
            String outputTitle = (outputId != null && outputTitleMap.containsKey(outputId))
                ? outputTitleMap.get(outputId)
                : null;
            Boolean isCrosscutting = outputTitle != null && outputTitle.trim().equalsIgnoreCase('Crosscutting');
            String countryVal = countryByExpenseOutput.get(key);

            Integer outputIndex = outputSequenceMap.get(outputId);
            if (!isCrosscutting && (outputIndex == null || outputIndex > 15)) continue;

            uNI_Expense_Types__c rec;
            if (expenseTypeMap.containsKey(expType)) {
                rec = expenseTypeMap.get(expType);
            } else if (existingMap.containsKey(expType)) {
                rec = existingMap.get(expType);
            } else {
                rec = new uNI_Expense_Types__c(
                    Name = expType,
                    uNI_IndividualApplication__c = parentId,
                    uNI_Version__c = version,
                    uNI_CostType__c = 'Budget'
                );
            }

            if (!String.isBlank(version)) {
                rec.uNI_Version__c = version;
            }

            Decimal cost = expenseOutputSum.get(key);
            Decimal runningTotal = totalSumByExpense.containsKey(expType)
                ? totalSumByExpense.get(expType)
                : 0;
            totalSumByExpense.put(expType, runningTotal + cost);

            if (isCrosscutting) {
                rec.uNI_Cross_Cutting__c = cost;
                if (countryVal != null) {
                    rec.uNI_CrosscuttingCountry__c = countryVal;
                }
            } else {
                switch on outputIndex {
                    when 1  { rec.uNI_Output1__c  = cost; if (countryVal != null) rec.uNI_Output1Country__c = countryVal; }
                    when 2  { rec.uNI_Output2__c  = cost; if (countryVal != null) rec.uNI_Output2Country__c = countryVal; }
                    when 3  { rec.uNI_Output3__c  = cost; if (countryVal != null) rec.uNI_Output3Country__c = countryVal; }
                    when 4  { rec.uNI_Output4__c  = cost; if (countryVal != null) rec.uNI_Output4Country__c = countryVal; }
                    when 5  { rec.uNI_Output5__c  = cost; if (countryVal != null) rec.uNI_Output5Country__c = countryVal; }
                    when 6  { rec.uNI_Output6__c  = cost; if (countryVal != null) rec.uNI_Output6Country__c = countryVal; }
                    when 7  { rec.uNI_Output7__c  = cost; if (countryVal != null) rec.uNI_Output7Country__c = countryVal; }
                    when 8  { rec.uNI_Output8__c  = cost; if (countryVal != null) rec.uNI_Output8Country__c = countryVal; }
                    when 9  { rec.uNI_Output9__c  = cost; if (countryVal != null) rec.uNI_Output9Country__c = countryVal; }
                    when 10 { rec.uNI_Output10__c = cost; if (countryVal != null) rec.uNI_Output10Country__c = countryVal; }
                    when 11 { rec.uNI_Output11__c = cost; if (countryVal != null) rec.uNI_Output11Country__c = countryVal; }
                    when 12 { rec.uNI_Output12__c = cost; if (countryVal != null) rec.uNI_Output12Country__c = countryVal; }
                    when 13 { rec.uNI_Output13__c = cost; if (countryVal != null) rec.uNI_Output13Country__c = countryVal; }
                    when 14 { rec.uNI_Output14__c = cost; if (countryVal != null) rec.uNI_Output14Country__c = countryVal; }
                    when 15 { rec.uNI_Output15__c = cost; if (countryVal != null) rec.uNI_Output15Country__c = countryVal; }
                }
            }

            expenseTypeMap.put(expType, rec);
        }

        // Step 6: Upsert expense types (one per expense group)
        upsert expenseTypeMap.values();

        // ---------------------------------------------------------------------
        // Output-year totals (PortfolioOutput__c Year1–Year8)
        // ---------------------------------------------------------------------
        Set<Integer> yearSet = new Set<Integer>();
        for (uNI_BudgetData__c bd : budgetList) {
            if (bd.uNI_Years__c != null) {
                yearSet.add(Integer.valueOf(bd.uNI_Years__c));
            }
        }
        List<Integer> years = new List<Integer>(yearSet);
        years.sort();
        Integer baseYear = years.isEmpty() ? 0 : years[0];

        // Stamp base year on expense types for later year-slot calculations
        if (baseYear != 0) {
            for (uNI_Expense_Types__c rec : expenseTypeMap.values()) {
                rec.put('uNI_BaseYear__c', baseYear);
            }
        }

        // Populate Year#Budget / Year#Country on expense types (baseYear-aligned) and persist
        if (baseYear != 0 && !expenseYearTotals.isEmpty()) {
            for (String expName : expenseTypeMap.keySet()) {
                uNI_Expense_Types__c rec = expenseTypeMap.get(expName);
                Map<Integer, Decimal> yrTotals = expenseYearTotals.get(expName);
                Map<Integer, String> yrCountries = expenseYearCountries.get(expName);
                Set<Integer> yrSet = expenseYearSet.get(expName);
                if (yrSet != null && yrSet.size() == 1) {
                    List<Integer> yrList = new List<Integer>(yrSet);
                    if (!yrList.isEmpty()) {
                        rec.put('uNI_TargetYear__c', yrList[0]);
                    }
                }
                if (yrTotals == null) continue;
                for (Integer yearVal : yrTotals.keySet()) {
                    Integer slot = yearVal - baseYear + 1;
                    if (slot < 1 || slot > 15) continue;
                    Decimal val = yrTotals.get(yearVal);
                    String countryVal = (yrCountries != null) ? yrCountries.get(yearVal) : null;
                    switch on slot {
                        when 1  { rec.uNI_Year1Budget__c  = val; if (countryVal != null) rec.uNI_Year1Country__c  = countryVal; }
                        when 2  { rec.uNI_Year2Budget__c  = val; if (countryVal != null) rec.uNI_Year2Country__c  = countryVal; }
                        when 3  { rec.uNI_Year3Budget__c  = val; if (countryVal != null) rec.uNI_Year3Country__c  = countryVal; }
                        when 4  { rec.uNI_Year4Budget__c  = val; if (countryVal != null) rec.uNI_Year4Country__c  = countryVal; }
                        when 5  { rec.uNI_Year5Budget__c  = val; if (countryVal != null) rec.uNI_Year5Country__c  = countryVal; }
                        when 6  { rec.uNI_Year6Budget__c  = val; if (countryVal != null) rec.uNI_Year6Country__c  = countryVal; }
                        when 7  { rec.uNI_Year7Budget__c  = val; if (countryVal != null) rec.uNI_Year7Country__c  = countryVal; }
                        when 8  { rec.uNI_Year8Budget__c  = val; if (countryVal != null) rec.uNI_Year8Country__c  = countryVal; }
                        when 9  { rec.uNI_Year9Budget__c  = val; if (countryVal != null) rec.uNI_Year9Country__c  = countryVal; }
                        when 10 { rec.uNI_Year10Budget__c = val; if (countryVal != null) rec.uNI_Year10Country__c = countryVal; }
                        when 11 { rec.uNI_Year11Budget__c = val; if (countryVal != null) rec.uNI_Year11Country__c = countryVal; }
                        when 12 { rec.uNI_Year12Budget__c = val; if (countryVal != null) rec.uNI_Year12Country__c = countryVal; }
                        when 13 { rec.uNI_Year13Budget__c = val; if (countryVal != null) rec.uNI_Year13Country__c = countryVal; }
                        when 14 { rec.uNI_Year14Budget__c = val; if (countryVal != null) rec.uNI_Year14Country__c = countryVal; }
                        when 15 { rec.uNI_Year15Budget__c = val; if (countryVal != null) rec.uNI_Year15Country__c = countryVal; }
                    }
                }
            }
            upsert expenseTypeMap.values();
        }

        // Aggregate total cost by Output + Year
        Map<String, Decimal> outputYearTotals = new Map<String, Decimal>();
        for (uNI_BudgetData__c bd : budgetList) {
            String key = bd.uNI_PortfolioOutput__c + '|' + bd.uNI_Years__c;
            Decimal sum = outputYearTotals.containsKey(key) ? outputYearTotals.get(key) : 0;
            outputYearTotals.put(key, sum + (bd.uNI_TotalCost__c != null ? bd.uNI_TotalCost__c : 0));
        }

        // Fetch outputs
        Map<Id, uNI_PortfolioOutput__c> outputMap = new Map<Id, uNI_PortfolioOutput__c>();
        List<uNI_PortfolioOutput__c> outputRecords;
        if (String.isBlank(version)) {
            outputRecords = [
                SELECT Id, Name,
                       uNI_Year1__c, uNI_Year2__c, uNI_Year3__c, uNI_Year4__c,
                       uNI_Year5__c, uNI_Year6__c, uNI_Year7__c, uNI_Year8__c,
                       uNI_Version__c
                FROM uNI_PortfolioOutput__c
                WHERE uNI_IndividualApplication__c = :parentId
                  AND uNI_Logframe__c != null
            ];
        } else {
            outputRecords = [
                SELECT Id, Name,
                       uNI_Year1__c, uNI_Year2__c, uNI_Year3__c, uNI_Year4__c,
                       uNI_Year5__c, uNI_Year6__c, uNI_Year7__c, uNI_Year8__c,
                       uNI_Version__c
                FROM uNI_PortfolioOutput__c
                WHERE uNI_IndividualApplication__c = :parentId
                  AND uNI_Logframe__c != null
                  AND (uNI_Version__c = :version OR uNI_Version__c = null)
            ];
        }

        for (uNI_PortfolioOutput__c o : outputRecords) {
            outputMap.put(o.Id, o);
        }

        // Populate Year1–Year8
        for (String key : outputYearTotals.keySet()) {
            List<String> parts = key.split('\\|');
            if (parts.size() != 2) continue;

            Id outputId = (Id) parts[0];
            Integer yearVal = Integer.valueOf(parts[1]);
            Decimal totalCost = outputYearTotals.get(key);

            if (!outputMap.containsKey(outputId) || baseYear == 0) continue;

            uNI_PortfolioOutput__c rec = outputMap.get(outputId);
            if (!String.isBlank(version)) {
                rec.uNI_Version__c = version;
            }
            Integer yearIndex = yearVal - baseYear + 1;
            if (yearIndex < 1 || yearIndex > 8) continue;

            switch on yearIndex {
                when 1 { rec.uNI_Year1__c = totalCost; }
                when 2 { rec.uNI_Year2__c = totalCost; }
                when 3 { rec.uNI_Year3__c = totalCost; }
                when 4 { rec.uNI_Year4__c = totalCost; }
                when 5 { rec.uNI_Year5__c = totalCost; }
                when 6 { rec.uNI_Year6__c = totalCost; }
                when 7 { rec.uNI_Year7__c = totalCost; }
                when 8 { rec.uNI_Year8__c = totalCost; }
            }
        }

        upsert outputMap.values();

        // ---------------------------------------------------------------------
        // SummaryBudget aggregation (by SummaryBudget + Output)
        // ---------------------------------------------------------------------
        Map<String, Decimal> sbOutputSum = new Map<String, Decimal>();
        for (uNI_BudgetData__c bd : budgetList) {
            String key = bd.uNI_Summary_Budget__c + '|' + bd.uNI_PortfolioOutput__c;
            Decimal sum = sbOutputSum.containsKey(key) ? sbOutputSum.get(key) : 0;
            sbOutputSum.put(key, sum + (bd.uNI_TotalCost__c != null ? bd.uNI_TotalCost__c : 0));
        }

        Map<Id, uNI_SummaryBudget__c> summaryMap = new Map<Id, uNI_SummaryBudget__c>();
        List<uNI_SummaryBudget__c> summaryRecords;
        if (String.isBlank(version)) {
            summaryRecords = [
                SELECT Id, Name,
                       uNI_Output_1__c, uNI_Output_2__c, uNI_Output_3__c, uNI_Output_4__c,
                       uNI_Output_5__c, uNI_Output_6__c, uNI_Output_7__c, uNI_Output_8__c,
                       uNI_Output_9__c, uNI_Output_10__c, uNI_Output_11__c, uNI_Output_12__c,
                       uNI_Output_13__c, uNI_Output_14__c, uNI_Output_15__c,
                       uNI_Version__c
                FROM uNI_SummaryBudget__c
                WHERE uNI_IndividualApplication__c = :parentId
                  AND is_Full_Row_Span__c = false
            ];
        } else {
            summaryRecords = [
                SELECT Id, Name,
                       uNI_Output_1__c, uNI_Output_2__c, uNI_Output_3__c, uNI_Output_4__c,
                       uNI_Output_5__c, uNI_Output_6__c, uNI_Output_7__c, uNI_Output_8__c,
                       uNI_Output_9__c, uNI_Output_10__c, uNI_Output_11__c, uNI_Output_12__c,
                       uNI_Output_13__c, uNI_Output_14__c, uNI_Output_15__c,
                       uNI_Version__c
                FROM uNI_SummaryBudget__c
                WHERE uNI_IndividualApplication__c = :parentId
                  AND is_Full_Row_Span__c = false
                  AND (uNI_Version__c = :version OR uNI_Version__c = null)
            ];
        }

        for (uNI_SummaryBudget__c sb : summaryRecords) {
            summaryMap.put(sb.Id, sb);
        }

        Map<Id, Decimal> totalPerSummary = new Map<Id, Decimal>();

        for (String key : sbOutputSum.keySet()) {
            List<String> parts = key.split('\\|');
            if (parts.size() != 2) continue;

            Id summaryId = (Id) parts[0];
            Id outputId = (Id) parts[1];
            Decimal totalCost = sbOutputSum.get(key);
            String outputTitle = (outputId != null && outputTitleMap.containsKey(outputId))
                ? outputTitleMap.get(outputId)
                : null;
            Boolean isCrosscutting = outputTitle != null && outputTitle.trim().equalsIgnoreCase('Crosscutting');
            if (isCrosscutting) {
                continue;
            }

            if (!summaryMap.containsKey(summaryId) || !outputSequenceMap.containsKey(outputId)) continue;

            uNI_SummaryBudget__c rec = summaryMap.get(summaryId);
            if (!String.isBlank(version)) {
                rec.uNI_Version__c = version;
            }
            Integer outputIndex = outputSequenceMap.get(outputId);
            if (outputIndex == null || outputIndex > 15) continue;

            switch on outputIndex {
                when 1  { rec.uNI_Output_1__c  = totalCost; }
                when 2  { rec.uNI_Output_2__c  = totalCost; }
                when 3  { rec.uNI_Output_3__c  = totalCost; }
                when 4  { rec.uNI_Output_4__c  = totalCost; }
                when 5  { rec.uNI_Output_5__c  = totalCost; }
                when 6  { rec.uNI_Output_6__c  = totalCost; }
                when 7  { rec.uNI_Output_7__c  = totalCost; }
                when 8  { rec.uNI_Output_8__c  = totalCost; }
                when 9  { rec.uNI_Output_9__c  = totalCost; }
                when 10 { rec.uNI_Output_10__c = totalCost; }
                when 11 { rec.uNI_Output_11__c = totalCost; }
                when 12 { rec.uNI_Output_12__c = totalCost; }
                when 13 { rec.uNI_Output_13__c = totalCost; }
                when 14 { rec.uNI_Output_14__c = totalCost; }
                when 15 { rec.uNI_Output_15__c = totalCost; }
            }

            Decimal running = totalPerSummary.containsKey(summaryId)
                ? totalPerSummary.get(summaryId)
                : 0;
            totalPerSummary.put(summaryId, running + totalCost);
        }

        upsert summaryMap.values();
    }
}
