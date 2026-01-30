public without sharing class uNI_CreateExpensesForAnnualReport {
    private static final List<String> DEFAULT_GROUPS = new List<String>{
        'Health commodities and health equipment',
        'Procurement and supply chain',
        'Travel related',
        'External professional services',
        'Equipment other than health',
        'Communications materials and publications',
        'Project staff',
        'Other project expenses',
        'Grant financial audit',
        'General administrative expense'
    };
    private static final Integer MAX_OUTPUTS = 15;
    private static final String COST_TYPE = 'Annual Report';
    private static final String UNSPECIFIED_GROUP = 'Unspecified';

    public class InvocableInput {
        @InvocableVariable(required=true)
        public Id individualApplicationId;

        @InvocableVariable(required=true)
        public String version;

        @InvocableVariable
        public Id annualReportId;

        // Optional: limit aggregation to a specific year (uNI_Years__c on BudgetData)
        @InvocableVariable
        public Integer targetYear;
    }

    public class InvocableResult {
        @InvocableVariable public Integer code; // 0 success, non-zero error
        @InvocableVariable public String message;
        @InvocableVariable public Integer recordsUpserted;
    }

    @InvocableMethod(
        label='Create Expenses for Annual Report'
        description='Clones Budget Expense Type rows into Annual Report Expense Types (including country/year slots) for the given application/version.'
    )
    public static List<InvocableResult> processFromFlow(List<InvocableInput> inputs) {
        List<InvocableResult> out = new List<InvocableResult>();
        if (inputs == null || inputs.isEmpty()) {
            InvocableResult r = new InvocableResult(); r.code = 4; r.message = 'No input provided'; out.add(r); return out;
        }
        if (inputs.size() > 1) {
            InvocableResult r = new InvocableResult(); r.code = 5; r.message = 'Only a single input is supported'; out.add(r); return out;
        }

        InvocableInput req = inputs[0];
        InvocableResult res = new InvocableResult();

        if (req.individualApplicationId == null || String.isBlank(req.version)) {
            res.code = 3;
            res.message = 'individualApplicationId and version are required';
            out.add(res);
            return out;
        }

        try {
            res.recordsUpserted = processInternal(req);
            res.code = 0;
            res.message = 'Success';
        } catch (Exception e) {
            res.code = 1;
            res.message = 'Error: ' + e.getMessage();
        }
        out.add(res);
        return out;
    }

    // Core logic: clone Budget Expense Types into Annual Report Expense Types (with country/year fields)
    private static Integer processInternal(InvocableInput req) {
        Id iaId = req.individualApplicationId;
        String version = req.version;
        Id arId = req.annualReportId;
        // Resolve target year: prefer targetYear input, fallback to Annual Report number
        Integer targetYear = req.targetYear;
        if (targetYear == null && arId != null) {
            try {
                uNI_Annual_Report__c arRec = [
                    SELECT uNI_AnnualReportNumber__c
                    FROM uNI_Annual_Report__c
                    WHERE Id = :arId
                    LIMIT 1
                ];
                if (arRec != null && arRec.uNI_AnnualReportNumber__c != null) {
                    targetYear = Integer.valueOf(String.valueOf(arRec.uNI_AnnualReportNumber__c));
                }
            } catch (Exception e) {
                // ignore; targetYear stays null
            }
        }

        // Determine baseYear from BudgetData for slot calculation
        Integer baseYear = null;
        try {
            AggregateResult ar = [
                SELECT MIN(uNI_Years__c) minYear
                FROM uNI_BudgetData__c
                WHERE uNI_IndividualApplication__c = :iaId
                  AND uNI_Version__c = :version
                  AND uNI_Years__c != null
            ];
            if (ar != null && ar.get('minYear') != null) {
                baseYear = Integer.valueOf(String.valueOf(ar.get('minYear')));
            }
        } catch (Exception e) {
            baseYear = null;
        }

        Integer yearSlot = null;
        if (baseYear != null && targetYear != null) {
            Integer slot = targetYear - baseYear + 1;
            if (slot != null && slot >= 1 && slot <= MAX_OUTPUTS) {
                yearSlot = slot;
            }
        }

        // If a target year is provided, aggregate BudgetData by expense group + output for that year
        Map<String, Map<Integer, Decimal>> yearOutputTotals = new Map<String, Map<Integer, Decimal>>();
        Map<String, Map<Integer, String>> yearOutputCountries = new Map<String, Map<Integer, String>>();
        Map<String, Decimal> yearCrossTotals = new Map<String, Decimal>();
        Map<String, String> yearCrossCountries = new Map<String, String>();
        if (targetYear != null) {
            Map<Id, Integer> outputIndexMap = new Map<Id, Integer>();
            Map<Id, String> outputTitleMap = new Map<Id, String>();
            Integer seq = 1;
            for (uNI_PortfolioOutput__c po : [
                SELECT Id, uNI_InternalSequence__c, uNI_OutputTitle__c
                FROM uNI_PortfolioOutput__c
                WHERE uNI_IndividualApplication__c = :iaId
                  AND uNI_Logframe__c != null
                ORDER BY uNI_InternalSequence__c ASC, CreatedDate ASC
            ]) {
                if (!outputIndexMap.containsKey(po.Id)) {
                    outputIndexMap.put(po.Id, seq++);
                }
                outputTitleMap.put(po.Id, po.uNI_OutputTitle__c);
            }

            List<uNI_BudgetData__c> yrBudgetRows = [
                SELECT uNI_ExpenseGroup__c, uNI_PortfolioOutput__c, uNI_TotalCost__c, uNI_Country__c
                FROM uNI_BudgetData__c
                WHERE uNI_IndividualApplication__c = :iaId
                  AND uNI_Version__c = :version
                  AND uNI_Years__c = :targetYear
                  AND uNI_PortfolioOutput__c != null
            ];

            for (uNI_BudgetData__c bd : yrBudgetRows) {
                String grp = String.isBlank(bd.uNI_ExpenseGroup__c) ? UNSPECIFIED_GROUP : bd.uNI_ExpenseGroup__c;
                Decimal cost = bd.uNI_TotalCost__c;
                if (cost == null) continue;

                Id outputId = bd.uNI_PortfolioOutput__c;
                String title = outputTitleMap.get(outputId);
                Boolean isCrosscutting = title != null && title.trim().equalsIgnoreCase('Crosscutting');

                if (isCrosscutting) {
                    yearCrossTotals.put(grp, (yearCrossTotals.containsKey(grp) ? yearCrossTotals.get(grp) : 0) + cost);
                    if (bd.uNI_Country__c != null && !yearCrossCountries.containsKey(grp)) {
                        yearCrossCountries.put(grp, bd.uNI_Country__c);
                    }
                } else {
                    Integer outIdx = outputIndexMap.get(outputId);
                    if (outIdx == null || outIdx < 1 || outIdx > MAX_OUTPUTS) continue;
                    Map<Integer, Decimal> outMap = yearOutputTotals.get(grp);
                    if (outMap == null) {
                        outMap = new Map<Integer, Decimal>();
                        yearOutputTotals.put(grp, outMap);
                    }
                    outMap.put(outIdx, (outMap.containsKey(outIdx) ? outMap.get(outIdx) : 0) + cost);

                    Map<Integer, String> cMap = yearOutputCountries.get(grp);
                    if (cMap == null) {
                        cMap = new Map<Integer, String>();
                        yearOutputCountries.put(grp, cMap);
                    }
                    if (bd.uNI_Country__c != null && !cMap.containsKey(outIdx)) {
                        cMap.put(outIdx, bd.uNI_Country__c);
                    }
                }
            }
        }

        // Source Budget expense types (values to clone)
        List<uNI_Expense_Types__c> sourceExpenseTypes = [
            SELECT Id, Name,
                   uNI_Cross_Cutting__c,
                   uNI_CrosscuttingCountry__c,
                   uNI_CrosscuttingYearBudget__c,
                   uNI_CrosscuttingYearCountry__c,
                   uNI_TargetYear__c,
                   uNI_Output1__c, uNI_Output2__c, uNI_Output3__c, uNI_Output4__c, uNI_Output5__c,
                   uNI_Output6__c, uNI_Output7__c, uNI_Output8__c, uNI_Output9__c, uNI_Output10__c,
                   uNI_Output11__c, uNI_Output12__c, uNI_Output13__c, uNI_Output14__c, uNI_Output15__c,
                   uNI_Output1Country__c, uNI_Output2Country__c, uNI_Output3Country__c, uNI_Output4Country__c, uNI_Output5Country__c,
                   uNI_Output6Country__c, uNI_Output7Country__c, uNI_Output8Country__c, uNI_Output9Country__c, uNI_Output10Country__c,
                   uNI_Output11Country__c, uNI_Output12Country__c, uNI_Output13Country__c, uNI_Output14Country__c, uNI_Output15Country__c,
                   uNI_Year1Budget__c, uNI_Year2Budget__c, uNI_Year3Budget__c, uNI_Year4Budget__c, uNI_Year5Budget__c,
                   uNI_Year6Budget__c, uNI_Year7Budget__c, uNI_Year8Budget__c, uNI_Year9Budget__c, uNI_Year10Budget__c,
                   uNI_Year11Budget__c, uNI_Year12Budget__c, uNI_Year13Budget__c, uNI_Year14Budget__c, uNI_Year15Budget__c,
                   uNI_Year1Country__c, uNI_Year2Country__c, uNI_Year3Country__c, uNI_Year4Country__c, uNI_Year5Country__c,
                   uNI_Year6Country__c, uNI_Year7Country__c, uNI_Year8Country__c, uNI_Year9Country__c, uNI_Year10Country__c,
                   uNI_Year11Country__c, uNI_Year12Country__c, uNI_Year13Country__c, uNI_Year14Country__c, uNI_Year15Country__c
            FROM uNI_Expense_Types__c
            WHERE uNI_IndividualApplication__c = :iaId
              AND uNI_Version__c = :version
              AND uNI_CostType__c = 'Budget'
        ];

        // Collect group names (default + any found in source)
        Set<String> groupNames = new Set<String>(DEFAULT_GROUPS);
        Map<String, uNI_Expense_Types__c> sourceByName = new Map<String, uNI_Expense_Types__c>();
        for (uNI_Expense_Types__c src : sourceExpenseTypes) {
            if (targetYear != null && src.uNI_TargetYear__c != null && src.uNI_TargetYear__c != targetYear) {
                continue; // skip non-matching target year when one is specified
            }
            groupNames.add(src.Name);
            sourceByName.put(src.Name, src);
        }

        // Fetch existing Annual Report expense types for these groups
        Map<String, uNI_Expense_Types__c> existingAR = new Map<String, uNI_Expense_Types__c>();
        if (!groupNames.isEmpty()) {
            for (uNI_Expense_Types__c ex : [
                SELECT Id, Name
                FROM uNI_Expense_Types__c
                WHERE uNI_IndividualApplication__c = :iaId
                  AND uNI_CostType__c = :COST_TYPE
                  AND uNI_Version__c = :version
                  AND Name IN :groupNames
            ]) {
                existingAR.put(ex.Name, ex);
            }
        }

        // Preserve default ordering, then extras alphabetically
        List<String> orderedGroups = new List<String>(DEFAULT_GROUPS);
        List<String> extras = new List<String>();
        for (String g : groupNames) {
            if (!orderedGroups.contains(g)) {
                extras.add(g);
            }
        }
        extras.sort();
        orderedGroups.addAll(extras);

        List<uNI_Expense_Types__c> inserts = new List<uNI_Expense_Types__c>();
        List<String> placeholders = new List<String>(); // groups created without a source row
        for (String name : orderedGroups) {
            uNI_Expense_Types__c src = sourceByName.get(name);

            uNI_Expense_Types__c tgt = new uNI_Expense_Types__c();
            tgt.Name = name;
            tgt.uNI_IndividualApplication__c = iaId;
            tgt.uNI_Version__c = version;
            tgt.uNI_CostType__c = COST_TYPE;
            if (arId != null) {
                tgt.uNI_AnnualReport__c = arId;
            }
            if (targetYear != null) {
                tgt.put('uNI_TargetYear__c', targetYear);
            }
            if (baseYear != null) {
                tgt.put('uNI_BaseYear__c', baseYear);
            }
            if (yearSlot != null) {
                tgt.put('uNI_YearSlot__c', yearSlot);
            }

            // Populate projected budgets, countries, and year buckets from source
            if (src != null) {
                for (Integer i = 1; i <= MAX_OUTPUTS; i++) {
                    if (targetYear != null) {
                        Map<Integer, Decimal> outMap = yearOutputTotals.get(name);
                        if (outMap != null && outMap.containsKey(i)) {
                            tgt.put('uNI_ProjectedExpenseOutput' + i + '__c', outMap.get(i));
                        }
                        Map<Integer, String> cMap = yearOutputCountries.get(name);
                        if (cMap != null && cMap.containsKey(i)) {
                            tgt.put('uNI_Output' + i + 'Country__c', cMap.get(i));
                        }
                    } else {
                        // Use per-output totals only (do not fall back to year buckets)
                        Decimal outVal = (Decimal) src.get('uNI_Output' + i + '__c');
                        if (outVal != null) {
                            tgt.put('uNI_ProjectedExpenseOutput' + i + '__c', outVal);
                        }
                        // Use per-output country only (do not fall back to year buckets)
                        String countryVal = (String) src.get('uNI_Output' + i + 'Country__c');
                        if (countryVal != null) {
                            tgt.put('uNI_Output' + i + 'Country__c', countryVal);
                        }
                    }

                    Decimal yearVal = (Decimal) src.get('uNI_Year' + i + 'Budget__c');
                    if (yearVal != null) {
                        tgt.put('uNI_Year' + i + 'Budget__c', yearVal);
                    }
                    String yearCountry = (String) src.get('uNI_Year' + i + 'Country__c');
                    if (yearCountry != null) {
                        tgt.put('uNI_Year' + i + 'Country__c', yearCountry);
                    }
                }

                if (targetYear != null) {
                    if (yearCrossTotals.containsKey(name)) {
                        tgt.uNI_ProjectedExpenseCrossCutting__c = yearCrossTotals.get(name);
                    } else if (src.uNI_CrosscuttingYearBudget__c != null && yearSlot != null) {
                        tgt.uNI_ProjectedExpenseCrossCutting__c = src.uNI_CrosscuttingYearBudget__c;
                    }
                    if (yearCrossCountries.containsKey(name)) {
                        tgt.uNI_CrosscuttingCountry__c = yearCrossCountries.get(name);
                    } else if (src.uNI_CrosscuttingYearCountry__c != null && yearSlot != null) {
                        tgt.uNI_CrosscuttingCountry__c = src.uNI_CrosscuttingYearCountry__c;
                    }
                } else {
                    // Crosscutting: use source totals when no target year is specified
                    tgt.uNI_ProjectedExpenseCrossCutting__c = src.uNI_Cross_Cutting__c;
                    tgt.uNI_CrosscuttingCountry__c = src.uNI_CrosscuttingCountry__c;
                }
                tgt.uNI_CrosscuttingYearBudget__c = src.uNI_CrosscuttingYearBudget__c;
                tgt.uNI_CrosscuttingYearCountry__c = src.uNI_CrosscuttingYearCountry__c;
            } else {
                // no source row; still create a tagged placeholder record for this expense group
                placeholders.add(name);
            }

            inserts.add(tgt);
        }

        if (!inserts.isEmpty()) {
            insert inserts;
            System.debug(LoggingLevel.INFO, '[uNI_CreateExpensesForAnnualReport] Inserted Annual Report Expense Types: ' + inserts.size());
            if (!placeholders.isEmpty()) {
                System.debug(LoggingLevel.INFO, '[uNI_CreateExpensesForAnnualReport] Placeholder groups with no Budget source: ' + placeholders);
            }
        }

        return inserts.size();
    }

    private static List<Decimal> initTotals() {
        List<Decimal> totals = new List<Decimal>();
        for (Integer i = 0; i < MAX_OUTPUTS; i++) {
            totals.add(0);
        }
        return totals;
    }

    private static List<String> initCountryList() {
        List<String> countries = new List<String>();
        for (Integer i = 0; i < MAX_OUTPUTS; i++) {
            countries.add(null);
        }
        return countries;
    }

    private static Boolean isCrosscuttingTitle(String title) {
        return title != null && title.trim().toLowerCase() == 'crosscutting';
    }

    private static Integer toYear(Object val) {
        if (val == null) return null;
        try {
            return Integer.valueOf(String.valueOf(val));
        } catch (Exception e) {
            return null;
        }
    }
}
