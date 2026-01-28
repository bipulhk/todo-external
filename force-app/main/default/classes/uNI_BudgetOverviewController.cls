/**
* @File Name : uNI_BudgetOverviewController.cls
* @Description : Budget Overview tables (version-aware)
* @Author :
* @Last Modified By :
* @Last Modified On : Nov 18, 2025
* @Modification Log :
*==============================================================================
* Ver | Date       | Author | Modification
*==============================================================================
* 1.0 | Sep 15,2025|        | Initial Version
* 1.1 | Nov 18,2025|        | Made getTables version-aware
**/
public class uNI_BudgetOverviewController {

    public class Table1Wrapper {
        @AuraEnabled public List<uNI_Expense_Types__c> expenseTypes;
        @AuraEnabled public List<uNI_PortfolioOutput__c> portOutputs;
        @AuraEnabled public uNI_Expense_Types__c expSummary;
    }

    // ---------------- SAVE (unchanged, records already carry version) ----------------
    @AuraEnabled
    public static void saveTable1(Id indAppId, String version, String table1Json, String table3Json, String table5Json,String statusVal) {
        try {
            if (indAppId == null) {
                throw new AuraHandledException('Individual Application Id is required.');
            }else{
                System.debug('@@ind val'+ statusVal);
                IndividualApplication ind = new IndividualApplication(id= indAppId, uNI_CurrentBudgetOverviewStatus__c= statusVal);
                update ind;
            }

            String versionToUse = String.isBlank(version) ? '1' : version.trim();

            // Table 1 / Expense types
            Table1Wrapper wrapper =
                (Table1Wrapper) JSON.deserialize(table1Json, Table1Wrapper.class);

            List<uNI_Expense_Types__c> toSave = new List<uNI_Expense_Types__c>();

            if (wrapper.expenseTypes != null) {
                toSave.addAll(wrapper.expenseTypes);
            }
            if (wrapper.expSummary != null) {
                uNI_Expense_Types__c summaryRec = wrapper.expSummary;
                summaryRec.Name = 'Summary';
                // optionally mark summary if you have such a field
                // summaryRec.Is_Summary__c = true;
                // toSave.add(summaryRec);
            }

            if (!toSave.isEmpty()) {
                for (uNI_Expense_Types__c rec : toSave) {
                    rec.uNI_IndividualApplication__c = indAppId;
                    rec.uNI_Version__c = versionToUse;
                }
                upsert toSave;
            }

            // Table 3 / Portfolio Outputs by year
            Table1Wrapper wrapper3 =
                (Table1Wrapper) JSON.deserialize(table3Json, Table1Wrapper.class);

            List<uNI_PortfolioOutput__c> toSavePO = new List<uNI_PortfolioOutput__c>();

            if (wrapper3.portOutputs != null) {
                toSavePO.addAll(wrapper3.portOutputs);
            }

            if (!toSavePO.isEmpty()) {
                for (uNI_PortfolioOutput__c rec : toSavePO) {
                    rec.uNI_IndividualApplication__c = indAppId;
                    rec.uNI_LogframeVersion__c = versionToUse;
                }
                upsert toSavePO;
            }

            // Table 5 / Summary Budget per consortium member
            List<uNI_SummaryBudget__c> summaryList =
                (List<uNI_SummaryBudget__c>) JSON.deserialize(
                    table5Json,
                    List<uNI_SummaryBudget__c>.class
                );
            if (!summaryList.isEmpty()) {
                for (uNI_SummaryBudget__c rec : summaryList) {
                    rec.uNI_IndividualApplication__c = indAppId;
                    rec.uNI_Version__c = versionToUse;
                }
                upsert summaryList;
            }
        } catch (Exception e) {
            throw new AuraHandledException('Error saving Budget Overview: ' + e.getMessage());
        }
    }

    // ---------------- MAIN LOAD (VERSION-AWARE) ----------------
    @AuraEnabled(cacheable=true)
    public static Map<String, Object> getTables(String indAppId, String version) {
        System.debug('indAppId from LWC = ' + indAppId + ', version param = ' + version);

        Map<String, Object> result = new Map<String, Object>();

        if (String.isBlank(indAppId)) {
            throw new AuraHandledException('Individual Application Id is required.');
        }

        // Normalise version – if none passed, default to "1"
        String versionToUse = String.isBlank(version) ? '1' : version.trim();
        System.debug('BudgetOverview: using version = ' + versionToUse);

        String cfpId;
        IndividualApplication indApp = [
            SELECT Id,
                   uNI_Project_Year__c,
                   uNI_CurrentBudgetStatus__c,
                   uNI_EKOStartDate__c,
                   uNI_GADStartDate__c,
                   uNI_ImplementationStartDate__c,
                   uNI_ImplementationEndDate__c,
                   uNI_CurrentBudgetOverviewStatus__c,
                   uNI_Sections_Marked_Complete__c,
                   FundingOpportunityId
            FROM IndividualApplication
            WHERE Id = :indAppId
        ];

        if (indApp != null) {
            cfpId = indApp.FundingOpportunityId;
            result.put('status', indApp.uNI_CurrentBudgetStatus__c);
            result.put('overviewStatus', indApp.uNI_CurrentBudgetOverviewStatus__c);
        }

        // 1) Expense Types (version-aware via uNI_Version__c)
        List<uNI_Expense_Types__c> expTypes = [
            SELECT Id,
                   Name,
                   uNI_Output_Totals__c,
                   uNI_CallForProposals__c,
                   uNI_Output1__c,
                   uNI_Output2__c,
                   uNI_Output3__c,
                   uNI_Output4__c,
                   uNI_Output5__c,
                   uNI_Output6__c,
                   uNI_Output7__c,
                   uNI_Output8__c,
                   uNI_Output9__c,
                   uNI_Output10__c,
                   uNI_Output11__c,
                   uNI_Output12__c,
                   uNI_Output13__c,
                   uNI_Output14__c,
                   uNI_Output15__c,
                   uNI_Cross_Cutting__c,
                   uNI_Output1Narrative__c,
                   uNI_Output2Narrative__c,
                   uNI_Output3Narrative__c,
                   uNI_Output4Narrative__c,
                   uNI_Output5Narrative__c,
                   uNI_Output6Narrative__c,
                   uNI_Output7Narrative__c,
                   uNI_Output8Narrative__c,
                   uNI_Output9Narrative__c,
                   uNI_Output10Narrative__c,
                   uNI_Output11Narrative__c,
                   uNI_Output12Narrative__c,
                   uNI_Output13Narrative__c,
                   uNI_Output14Narrative__c,
                   uNI_Output15Narrative__c,
                   uNI_CrossCuttingNarrative__c,
                   uNI_ExpensePercent__c,
                   uNI_Version__c
            FROM uNI_Expense_Types__c
            WHERE uNI_IndividualApplication__c = :indAppId
              AND uNI_Version__c = :versionToUse AND uNI_CostType__c ='Budget'
            ORDER BY CreatedDate ASC
        ];

        // 2) Portfolio Outputs (version-aware via LogframeVersion)
        List<uNI_PortfolioOutput__c> outputs = [
            SELECT Id,
                   Name,
                   uNI_ProjectSpecificContributions__c,
                   uNI_OutputTitle__c,
                   uNI_OutputDescription__c,
                   uNI_CallForProposals__c,
                   uNI_ResponseBy__c,
                   Mapping_Output_Field_in_Relative_Objs__c,
                   uNI_IndividualApplication__c,
                   uNI_Logframe__c,
                   uNI_InternalSequence__c,
                   uNI_LogframeVersion__c,
                   uNI_Year1__c,
                   uNI_Year2__c,
                   uNI_Year3__c,
                   uNI_Year4__c,
                   uNI_Year5__c,
                   uNI_Year6__c,
                   uNI_Year7__c,
                   uNI_Year8__c,
                   uNI_Year1Narrative__c,
                   uNI_Year2Narrative__c,
                   uNI_Year3Narrative__c,
                   uNI_Year4Narrative__c,
                   uNI_Year5Narrative__c,
                   uNI_Year6Narrative__c,
                   uNI_Year7Narrative__c,
                   uNI_Year8Narrative__c
            FROM uNI_PortfolioOutput__c
            WHERE uNI_IndividualApplication__c = :indAppId
              AND uNI_Logframe__c != null
              AND (uNI_LogframeVersion__c = :versionToUse or uNI_Version__c=:versionToUse)
            ORDER BY uNI_InternalSequence__c ASC
        ];

        Integer crosscuttingIndex = -1;
        for (Integer idx = 0; idx < outputs.size(); idx++) {
            if (isCrosscuttingOutput(outputs[idx])) {
                crosscuttingIndex = idx;
                break;
            }
        }
        if (crosscuttingIndex > -1) {
            uNI_PortfolioOutput__c crosscuttingOutput = outputs.remove(crosscuttingIndex);
            outputs.add(crosscuttingOutput);
        }

        List<uNI_PortfolioOutput__c> nonCrosscuttingOutputs = getNonCrosscuttingOutputs(outputs);

        // 3) Summary Budget (version-aware via uNI_Version__c)
        List<uNI_SummaryBudget__c> summaryBds = [
            SELECT Id,
                   Name,
                   uNI_CallForProposals__c,
                   uNI_Output4Narrative__c,
                   is_Lead_Organization_1__c,
                   Expense_type__c,
                   uNI_Output_1__c,
                   uNI_Output_2__c,
                   uNI_Output_3__c,
                   uNI_Output_4__c,
                   uNI_Output_5__c,
                   uNI_Output_6__c,
                   uNI_Output_7__c,
                   uNI_Output_8__c,
                   uNI_Output_9__c,
                   uNI_Output_10__c,
                   uNI_Output_11__c,
                   uNI_Output_12__c,
                   uNI_Output_13__c,
                   uNI_Output_14__c,
                   uNI_Output_15__c,
                   uNI_Cross_Cutting__c,
                   uNI_CrossCuttingNarrative__c,
                   is_Full_Row_Span__c,
                   uNI_IndividualApplication__c,
                   uNI_Output_Totals__c,
                   uNI_Output1Narrative__c,
                   uNI_Output2Narrative__c,
                   uNI_Output3Narrative__c,
                   uNI_Output5Narrative__c,
                   uNI_Output6Narrative__c,
                   uNI_Output7Narrative__c,
                   uNI_Output8Narrative__c,
                   uNI_Output9Narrative__c,
                   uNI_Output10Narrative__c,
                   uNI_Output11Narrative__c,
                   uNI_Output12Narrative__c,
                   uNI_Output13Narrative__c,
                   uNI_Output14Narrative__c,
                   uNI_Output15Narrative__c,
                   uNI_ConsortiumPercent__c,
                   uNI_Investment_record_type__c,
                   uNI_Version__c
            FROM uNI_SummaryBudget__c
            WHERE uNI_IndividualApplication__c = :indAppId and uNI_Investment_record_type__c ='GAD'
              AND is_Full_Row_Span__c = false
              AND uNI_Version__c = :versionToUse
            ORDER BY is_Lead_Organization_1__c DESC
        ];

        List<TableWrapper> allTables = new List<TableWrapper>();

        TableWrapper prinTbl1 = new TableWrapper();
        TableWrapper prinTbl2 = new TableWrapper();
        TableWrapper prinTbl3 = new TableWrapper();
        TableWrapper prinTbl4 = new TableWrapper();
        TableWrapper prinTbl5 = new TableWrapper();
        TableWrapper prinTbl6 = new TableWrapper();

        // ---------------- Table 1: Expense group vs outputs ----------------
        List<ColumnWrapper> colwraps = new List<ColumnWrapper>();
        ColumnWrapper colwrap1 = new ColumnWrapper();
        colwrap1.name = 'US$';
        colwraps.add(colwrap1);

        Integer i = 1;
        for (uNI_PortfolioOutput__c po : nonCrosscuttingOutputs) {
            ColumnWrapper colWrap2 = new ColumnWrapper();
            colWrap2.name = 'Output ' + String.valueOf(i);
            colWrap2.no = String.valueOf(i);
            colwraps.add(colWrap2);
            i++;
        }
        if (crosscuttingIndex > -1) {
             ColumnWrapper colwrap3 = new ColumnWrapper();
            colwrap3.name = 'Cross cutting';
            colwraps.add(colwrap3);
        }

        System.debug('Column wrappers after outputs: ' + colwraps);

        ColumnWrapper colwrap3 = new ColumnWrapper();
        //colwrap3.name = 'Cross cutting';
        //colwraps.add(colwrap3);
        ColumnWrapper colwrap4 = new ColumnWrapper();
        colwrap4.name = 'Total';
        colwraps.add(colwrap4);
        ColumnWrapper colwrap5 = new ColumnWrapper();
        colwrap5.name = '%';
        colwraps.add(colwrap5);

        prinTbl1.colwraps = colwraps;
        System.debug('Column wrappers after force entry: ' + colwraps);

        Integer outputSze = nonCrosscuttingOutputs.size();
        if (outputSze > 0) {
            prinTbl1.isOutput1 = true;
            prinTbl2.isOutput1 = true;
        }
        if (outputSze > 1) {
            prinTbl1.isOutput2 = true;
            prinTbl2.isOutput2 = true;
        }
        if (outputSze > 2) {
            prinTbl1.isOutput3 = true;
            prinTbl2.isOutput1 = true;
        }
        if (outputSze > 3) {
            prinTbl1.isOutput4 = true;
            prinTbl2.isOutput4 = true;
        }
        if (outputSze > 4) {
            prinTbl1.isOutput5 = true;
            prinTbl2.isOutput5 = true;
        }
        if (outputSze > 5) {
            prinTbl1.isOutput6 = true;
            prinTbl2.isOutput6 = true;
        }
        if (outputSze > 6) {
            prinTbl1.isOutput7 = true;
            prinTbl2.isOutput7 = true;
        }
        if (outputSze > 7) {
            prinTbl1.isOutput8 = true;
            prinTbl2.isOutput1 = true;
        }
        if (outputSze > 8) {
            prinTbl1.isOutput9 = true;
            prinTbl2.isOutput9 = true;
        }
        if (outputSze > 9) {
            prinTbl1.isOutput10 = true;
            prinTbl2.isOutput10 = true;
        }
        if (outputSze > 10) {
            prinTbl1.isOutput11 = true;
            prinTbl2.isOutput11 = true;
        }
        if (outputSze > 11) {
            prinTbl1.isOutput12 = true;
            prinTbl2.isOutput12 = true;
        }
        if (outputSze > 12) {
            prinTbl1.isOutput13 = true;
            prinTbl2.isOutput13 = true;
        }
        if (outputSze > 13) {
            prinTbl1.isOutput14 = true;
            prinTbl2.isOutput14 = true;
        }
        if (outputSze > 14) {
            prinTbl1.isOutput15 = true;
            prinTbl2.isOutput15 = true;
        }
        if(crosscuttingIndex>-1){
            prinTbl1.isCrossCutting = true;
            prinTbl2.isCrossCutting = true;
        }

        uNI_Expense_Types__c expSummary = new uNI_Expense_Types__c();
        Decimal op1 = 0, op2 = 0, op3 = 0, op4 = 0, op5 = 0, op6 = 0,
                op7 = 0, op8 = 0, op9 = 0, op10 = 0, op11 = 0, op12 = 0,
                op13 = 0, op14 = 0, op15 = 0, cutting = 0;

        for (uNI_Expense_Types__c exp : expTypes) {
            if (outputSze > 0 && exp.uNI_Output1__c != null)  op1  += exp.uNI_Output1__c;
            if (outputSze > 1 && exp.uNI_Output2__c != null)  op2  += exp.uNI_Output2__c;
            if (outputSze > 2 && exp.uNI_Output3__c != null)  op3  += exp.uNI_Output3__c;
            if (outputSze > 3 && exp.uNI_Output4__c != null)  op4  += exp.uNI_Output4__c;
            if (outputSze > 4 && exp.uNI_Output5__c != null)  op5  += exp.uNI_Output5__c;
            if (outputSze > 5 && exp.uNI_Output6__c != null)  op6  += exp.uNI_Output6__c;
            if (outputSze > 6 && exp.uNI_Output7__c != null)  op7  += exp.uNI_Output7__c;
            if (outputSze > 7 && exp.uNI_Output8__c != null)  op8  += exp.uNI_Output8__c;
            if (outputSze > 8 && exp.uNI_Output9__c != null)  op9  += exp.uNI_Output9__c;
            if (outputSze > 9 && exp.uNI_Output10__c != null) op10 += exp.uNI_Output10__c;
            if (outputSze > 10 && exp.uNI_Output11__c != null) op11 += exp.uNI_Output11__c;
            if (outputSze > 11 && exp.uNI_Output12__c != null) op12 += exp.uNI_Output12__c;
            if (outputSze > 12 && exp.uNI_Output13__c != null) op13 += exp.uNI_Output13__c;
            if (outputSze > 13 && exp.uNI_Output14__c != null) op14 += exp.uNI_Output14__c;
            if (outputSze > 14 && exp.uNI_Output15__c != null) op15 += exp.uNI_Output15__c;
            if (exp.uNI_Cross_Cutting__c != null)             cutting += exp.uNI_Cross_Cutting__c;
        }

        expSummary.Name                  = 'Total';
        expSummary.uNI_Output1__c        = op1;
        expSummary.uNI_Output2__c        = op2;
        expSummary.uNI_Output3__c        = op3;
        expSummary.uNI_Output4__c        = op4;
        expSummary.uNI_Output5__c        = op5;
        expSummary.uNI_Output6__c        = op6;
        expSummary.uNI_Output7__c        = op7;
        expSummary.uNI_Output8__c        = op8;
        expSummary.uNI_Output9__c        = op9;
        expSummary.uNI_Output10__c       = op10;
        expSummary.uNI_Output11__c       = op11;
        expSummary.uNI_Output12__c       = op12;
        expSummary.uNI_Output13__c       = op13;
        expSummary.uNI_Output14__c       = op14;
        expSummary.uNI_Output15__c       = op15;
        expSummary.uNI_Cross_Cutting__c  = cutting;

        prinTbl1.expenseTypes = expTypes;
        prinTbl1.expSummary   = expSummary;
        allTables.add(prinTbl1);

        // ---------------- Table 2: narratives by expense group & output ----------------
        List<ColumnWrapper> colwraps2 = new List<ColumnWrapper>();
        colwrap1 = new ColumnWrapper();
        colwrap1.name = 'US$';
        colwraps2.add(colwrap1);
        i = 1;
        for (uNI_PortfolioOutput__c po2 : nonCrosscuttingOutputs) {
            ColumnWrapper cw = new ColumnWrapper();
            cw.name = 'Output ' + String.valueOf(i);
            cw.no   = String.valueOf(i);
            colwraps2.add(cw);
            i++;
        }
        if (crosscuttingIndex > -1) {
             ColumnWrapper crossCuttingCol = new ColumnWrapper();
            crossCuttingCol.name = 'Cross cutting';
            colwraps2.add(crossCuttingCol);
        }
        
        prinTbl2.colwraps      = colwraps2;
        prinTbl2.expenseTypes  = expTypes;
        allTables.add(prinTbl2);

        // ---------------- Table 3: outputs vs years ----------------
        List<ColumnWrapper> colwraps3 = new List<ColumnWrapper>();
        Integer year = (indApp.uNI_ImplementationStartDate__c != null)
            ? indApp.uNI_ImplementationStartDate__c.year()
            : System.today().year();
            Integer endyear = (indApp.uNI_ImplementationEndDate__c != null)
            ? indApp.uNI_ImplementationEndDate__c.year()
            : System.today().year();
        Integer noOfYears = endyear-year;

        colwrap1 = new ColumnWrapper();
        colwrap1.name = 'US$';
        colwraps3.add(colwrap1);

        Integer yearCount = year;
        for (Integer j = 0; j < =noOfYears; j++) {
            ColumnWrapper cw = new ColumnWrapper();
            cw.name = String.valueOf(yearCount);
            colwraps3.add(cw);

            if (j == 0) prinTbl3.isYear1 = true;
            if (j == 1) prinTbl3.isYear2 = true;
            if (j == 2) prinTbl3.isYear3 = true;
            if (j == 3) prinTbl3.isYear4 = true;
            if (j == 4) prinTbl3.isYear5 = true;
            if (j == 5) prinTbl3.isYear6 = true;
            if (j == 6) prinTbl3.isYear7 = true;
            if (j == 7) prinTbl3.isYear8 = true;

            yearCount++;
        }

        colwrap4        = new ColumnWrapper();
        colwrap4.name   = 'Total';
        colwraps3.add(colwrap4);
        colwrap5        = new ColumnWrapper();
        colwrap5.name   = '%';
        colwraps3.add(colwrap5);

        prinTbl3.colwraps  = colwraps3;
        prinTbl3.portOutputs = outputs;
        uNI_PortfolioOutput__c poSummary = new uNI_PortfolioOutput__c();
        poSummary.uNI_OutputTitle__c = 'Total';
        prinTbl3.portOutputSummary = poSummary;
        allTables.add(prinTbl3);

        // ---------------- Table 4: narratives by output & years ----------------
        List<ColumnWrapper> colwraps4List = new List<ColumnWrapper>();
        Integer yearCount2 = year;
        colwrap1 = new ColumnWrapper();
        colwrap1.name = 'US$';
        colwraps4List.add(colwrap1);
        for (Integer j = 0; j < =noOfYears; j++) {
            ColumnWrapper cw = new ColumnWrapper();
            cw.name = String.valueOf(yearCount2);
            colwraps4List.add(cw);
            yearCount2++;
        }

        prinTbl4.colwraps = colwraps4List;
        prinTbl4.portOutputs = outputs;
        uNI_PortfolioOutput__c po1 = new uNI_PortfolioOutput__c();
        po1.uNI_OutputTitle__c = 'Total';
        prinTbl4.portOutputSummary = po1;
        allTables.add(prinTbl4);

        // ---------------- Table 5: by output & consortium members ----------------
        List<ColumnWrapper> colwraps5 = new List<ColumnWrapper>();
        List<ConstriumMember> consMembs = new List<ConstriumMember>();

        colwrap1 = new ColumnWrapper();
        colwrap1.name = 'US$';
        colwraps5.add(colwrap1);

        if (summaryBds.size() > 0) {
            ColumnWrapper cwLead = new ColumnWrapper();
            cwLead.name = 'Lead Organization Name';
            cwLead.name2 = '('+summaryBds[0].Name+')';// 'Lead Organization Name';
            colwraps5.add(cwLead);
        }

        // Lead org row (we want the one with Name = 'Lead Organization Name')
        uNI_SummaryBudget__c leadsummWithName = null;
        for (uNI_SummaryBudget__c summBd : summaryBds) {
            if (summBd.is_Lead_Organization_1__c==true){// summBd.Name == 'Lead Organization Name') {
                leadsummWithName = summBd;
                break;
            }
        }

        if (leadsummWithName == null && !summaryBds.isEmpty()) {
            // fallback to first record if the named one doesn't exist
            leadsummWithName = summaryBds[0];
        }

        Integer outputIndex = 0;
        for (uNI_PortfolioOutput__c po2 : outputs) {
            System.debug('@@title po2'+ po2.uNI_OutputTitle__c);
            ConstriumMember consMemb = new ConstriumMember();
            consMemb.outputName = po2.uNI_OutputTitle__c;
            consMemb.outputAPI  = 'uNI_Output_' + (outputIndex + 1) + '__c';

            Integer opNo = outputIndex + 1;

            if (leadsummWithName != null) {
                if (isCrosscuttingOutput(po2)) {
                    consMemb.LeadOrganizationVal   = leadsummWithName.uNI_Cross_Cutting__c;
                    consMemb.LeadOrganizationNarr  = leadsummWithName.uNI_CrossCuttingNarrative__c;
                    consMemb.LeadOrganizationValId = leadsummWithName.Id;
                }
                else{
                switch on opNo {
                    when 1 {
                        consMemb.LeadOrganizationVal   = leadsummWithName.uNI_Output_1__c;
                        consMemb.LeadOrganizationNarr  = leadsummWithName.uNI_Output1Narrative__c;
                        consMemb.LeadOrganizationValId = leadsummWithName.Id;
                    }
                    when 2 {
                        consMemb.LeadOrganizationVal   = leadsummWithName.uNI_Output_2__c;
                        consMemb.LeadOrganizationNarr  = leadsummWithName.uNI_Output2Narrative__c;
                        consMemb.LeadOrganizationValId = leadsummWithName.Id;
                    }
                    when 3 {
                        consMemb.LeadOrganizationVal   = leadsummWithName.uNI_Output_3__c;
                        consMemb.LeadOrganizationNarr  = leadsummWithName.uNI_Output3Narrative__c;
                        consMemb.LeadOrganizationValId = leadsummWithName.Id;
                    }
                    when 4 {
                        consMemb.LeadOrganizationVal   = leadsummWithName.uNI_Output_4__c;
                        consMemb.LeadOrganizationNarr  = leadsummWithName.uNI_Output4Narrative__c;
                        consMemb.LeadOrganizationValId = leadsummWithName.Id;
                    }
                    when 5 {
                        consMemb.LeadOrganizationVal   = leadsummWithName.uNI_Output_5__c;
                        consMemb.LeadOrganizationNarr  = leadsummWithName.uNI_Output5Narrative__c;
                        consMemb.LeadOrganizationValId = leadsummWithName.Id;
                    }
                    when 6 {
                        consMemb.LeadOrganizationVal   = leadsummWithName.uNI_Output_6__c;
                        consMemb.LeadOrganizationNarr  = leadsummWithName.uNI_Output6Narrative__c;
                        consMemb.LeadOrganizationValId = leadsummWithName.Id;
                    }
                    when 7 {
                        consMemb.LeadOrganizationVal   = leadsummWithName.uNI_Output_7__c;
                        consMemb.LeadOrganizationNarr  = leadsummWithName.uNI_Output7Narrative__c;
                        consMemb.LeadOrganizationValId = leadsummWithName.Id;
                    }
                    when 8 {
                        consMemb.LeadOrganizationVal   = leadsummWithName.uNI_Output_8__c;
                        consMemb.LeadOrganizationNarr  = leadsummWithName.uNI_Output8Narrative__c;
                        consMemb.LeadOrganizationValId = leadsummWithName.Id;
                    }
                }
                }
            }

            // fill sub-implementers (summaryBds[1..] etc.) by output index
            for (Integer sbIdx = 0; sbIdx < summaryBds.size(); sbIdx++) {
                uNI_SummaryBudget__c sb = summaryBds[sbIdx];
                /*
                if (sb.Name == 'Lead Organization Name' || sb.Name == 'Sub-implementers') {
                    continue;
                }*/
                 if(sb.is_Lead_Organization_1__c==true || sb.is_Full_Row_Span__c==true){
                    continue;
                }
                Integer subNo = sbIdx;
                if (subNo <= 0) continue;

                Decimal val;
                String narr;

                if (isCrosscuttingOutput(po2)) {
                    val   = sb.uNI_Cross_Cutting__c;
                    narr  = sb.uNI_CrossCuttingNarrative__c;
                }
                else{

                        switch on opNo {
                            when 1 {
                                val  = sb.uNI_Output_1__c;
                                narr = sb.uNI_Output1Narrative__c;
                            }
                            when 2 {
                                val  = sb.uNI_Output_2__c;
                                narr = sb.uNI_Output2Narrative__c;
                            }
                            when 3 {
                                val  = sb.uNI_Output_3__c;
                                narr = sb.uNI_Output3Narrative__c;
                            }
                            when 4 {
                                val  = sb.uNI_Output_4__c;
                                narr = sb.uNI_Output4Narrative__c;
                            }
                            when 5 {
                                val  = sb.uNI_Output_5__c;
                                narr = sb.uNI_Output5Narrative__c;
                            }
                            when 6 {
                                val  = sb.uNI_Output_6__c;
                                narr = sb.uNI_Output6Narrative__c;
                            }
                            when 7 {
                                val  = sb.uNI_Output_7__c;
                                narr = sb.uNI_Output7Narrative__c;
                            }
                            when 8 {
                                val  = sb.uNI_Output_8__c;
                                narr = sb.uNI_Output8Narrative__c;
                            }
                            when else {
                                val  = null;
                                narr = null;
                            }
                        }
                }
                if (subNo == 1) { consMemb.subImp1  = val; consMemb.subImp1Narr  = narr; consMemb.subImp1Id  = sb.Id; }
                if (subNo == 2) { consMemb.subImp2  = val; consMemb.subImp2Narr  = narr; consMemb.subImp2Id  = sb.Id; }
                if (subNo == 3) { consMemb.subImp3  = val; consMemb.subImp3Narr  = narr; consMemb.subImp3Id  = sb.Id; }
                if (subNo == 4) { consMemb.subImp4  = val; consMemb.subImp4Narr  = narr; consMemb.subImp4Id  = sb.Id; }
                if (subNo == 5) { consMemb.subImp5  = val; consMemb.subImp5Narr  = narr; consMemb.subImp5Id  = sb.Id; }
                if (subNo == 6) { consMemb.subImp6  = val; consMemb.subImp6Narr  = narr; consMemb.subImp6Id  = sb.Id; }
                if (subNo == 7) { consMemb.subImp7  = val; consMemb.subImp7Narr  = narr; consMemb.subImp7Id  = sb.Id; }
                if (subNo == 8) { consMemb.subImp8  = val; consMemb.subImp8Narr  = narr; consMemb.subImp8Id  = sb.Id; }
            }

            consMembs.add(consMemb);
            outputIndex++;
        }

        ConstriumMember consMembTotal = new ConstriumMember();
        consMembTotal.outputName = 'Total';
        consMembTotal.showData   = true;

        ConstriumMember consMembPerc = new ConstriumMember();
        consMembPerc.outputName = '%';
        consMembPerc.showData   = true;

        Integer subIdx = 1;
        for (uNI_SummaryBudget__c summBd : summaryBds) {
            /*if (summBd.Name == 'Lead Organization Name' || summBd.Name == 'Sub-implementers') {
                continue;
            }*/
             if(summBd.is_Lead_Organization_1__c==true || summBd.is_Full_Row_Span__c==true){
                continue;
            }
            ColumnWrapper cw = new ColumnWrapper();
            cw.name = 'Sub-implementer ' + String.valueOf(subIdx);
            cw.name2 = '('+ summBd.Name+')';// 'Sub-implementers ' + String.valueOf(subIdx);
            cw.no   = String.valueOf(subIdx);

            if (subIdx > 0) prinTbl5.isSubImp1 = true;
            if (subIdx > 1) prinTbl5.isSubImp2 = true;
            if (subIdx > 2) prinTbl5.isSubImp3 = true;
            if (subIdx > 3) prinTbl5.isSubImp4 = true;
            if (subIdx > 4) prinTbl5.isSubImp5 = true;
            if (subIdx > 5) prinTbl5.isSubImp6 = true;
            if (subIdx > 6) prinTbl5.isSubImp7 = true;
            if (subIdx > 7) prinTbl5.isSubImp8 = true;
            if (subIdx > 8) prinTbl5.isSubImp9 = true;
            if (subIdx > 9) prinTbl5.isSubImp10 = true;

            colwraps5.add(cw);
            subIdx++;
        }

        colwrap4 = new ColumnWrapper();
        colwrap4.name = 'Total';
        colwraps5.add(colwrap4);

        prinTbl5.colwraps      = colwraps5;
        prinTbl5.portOutputs   = outputs;
        uNI_PortfolioOutput__c table5Summary = new uNI_PortfolioOutput__c();
        table5Summary.uNI_OutputTitle__c = 'Total';
        prinTbl5.portOutputSummary = table5Summary;
        prinTbl5.consMembTotal = consMembTotal;
        prinTbl5.consMembPerc  = consMembPerc;
        prinTbl5.consMembers   = consMembs;
        prinTbl5.showData      = true;
        allTables.add(prinTbl5);

        // ---------------- Table 6: narratives per consortium member ----------------
        List<ColumnWrapper> colwraps6 = new List<ColumnWrapper>();
        colwrap1 = new ColumnWrapper();
        colwrap1.name = 'US$';
        colwraps6.add(colwrap1);

        if (summaryBds.size() > 0) {
            ColumnWrapper cwLead = new ColumnWrapper();
            cwLead.name ='Lead Organization Name';
            cwLead.name2 = '('+summaryBds[0].Name+')';// ('+summaryBds[0].Name+')';// 'Lead Organization Name';
            colwraps6.add(cwLead);
        }

        Integer subIdx2 = 1;
        for (uNI_SummaryBudget__c summBd2 : summaryBds) {
            if(summBd2.is_Lead_Organization_1__c==true || summBd2.is_Full_Row_Span__c==true){
                continue;
            }
            /*if (summBd2.Name == 'Lead Organization Name' || summBd2.Name == 'Sub-implementers') {
                continue;
            }*/
            ColumnWrapper cw = new ColumnWrapper();
            cw.name = 'Sub-implementer ' + String.valueOf(subIdx2);
            cw.name2 = '('+ summBd2.Name+')';//'Sub-implementers ' + String.valueOf(subIdx2);
            cw.no   = String.valueOf(subIdx2);
            colwraps6.add(cw);
            subIdx2++;
        }

        prinTbl6.colwraps    = colwraps6;
        prinTbl6.portOutputs = outputs;
        allTables.add(prinTbl6);

        result.put('data', allTables);
        return result;
    }

    private static List<uNI_PortfolioOutput__c> getNonCrosscuttingOutputs(List<uNI_PortfolioOutput__c> outputs) {
        List<uNI_PortfolioOutput__c> filtered = new List<uNI_PortfolioOutput__c>();
        if (outputs == null) {
            return filtered;
        }
        for (uNI_PortfolioOutput__c po : outputs) {
            if (!isCrosscuttingOutput(po)) {
                filtered.add(po);
            }
        }
        return filtered;
    }

    private static Boolean isCrosscuttingOutput(uNI_PortfolioOutput__c po) {
        if (po == null || String.isBlank(po.uNI_OutputTitle__c)) {
            return false;
        }
        return po.uNI_OutputTitle__c.trim().equalsIgnoreCase('Crosscutting');
    }

    // ---------------- SUPPORTING WRAPPERS ----------------
    public class ConstriumMember {
        @AuraEnabled public String  outputName;
        @AuraEnabled public String  outputAPI;
        @AuraEnabled public Decimal LeadOrganizationVal;
        @AuraEnabled public String  LeadOrganizationNarr;
        @AuraEnabled public String  subImp1Narr;
        @AuraEnabled public String  subImp2Narr;
        @AuraEnabled public String  subImp3Narr;
        @AuraEnabled public String  subImp4Narr;
        @AuraEnabled public String  subImp5Narr;
        @AuraEnabled public String  subImp6Narr;
        @AuraEnabled public String  subImp7Narr;
        @AuraEnabled public String  subImp8Narr;
        @AuraEnabled public Decimal subImp1;
        @AuraEnabled public Decimal subImp2;
        @AuraEnabled public Decimal subImp3;
        @AuraEnabled public Decimal subImp4;
        @AuraEnabled public Decimal subImp5;
        @AuraEnabled public Decimal subImp6;
        @AuraEnabled public Decimal subImp7;
        @AuraEnabled public Decimal subImp8;
        @AuraEnabled public String  subImp1Id;
        @AuraEnabled public String  subImp2Id;
        @AuraEnabled public String  subImp3Id;
        @AuraEnabled public String  subImp4Id;
        @AuraEnabled public String  subImp5Id;
        @AuraEnabled public String  subImp6Id;
        @AuraEnabled public String  subImp7Id;
        @AuraEnabled public String  subImp8Id;
        @AuraEnabled public String  LeadOrganizationValId;
        @AuraEnabled public Boolean showData;
        @AuraEnabled public Decimal rowTotal;
    }

    public class TableWrapper {
        @AuraEnabled public String Id;
        @AuraEnabled public String tableDesc;

        @AuraEnabled public String  sObjectName;
        @AuraEnabled public Boolean isExpenseTable;
        @AuraEnabled public Boolean isBudgetConMember;
        @AuraEnabled public Boolean isBudgetFundingMember;
        @AuraEnabled public Boolean createEmptyRow;
        @AuraEnabled public Boolean isExtendable;
        @AuraEnabled public Boolean isLoopTable;
        @AuraEnabled public Boolean isSummaryTable;
        @AuraEnabled public Boolean isYear1;
        @AuraEnabled public Boolean isYear2;
        @AuraEnabled public Boolean isYear3;
        @AuraEnabled public Boolean isYear4;
        @AuraEnabled public Boolean isYear5;
        @AuraEnabled public Boolean isYear6;
        @AuraEnabled public Boolean isYear7;
        @AuraEnabled public Boolean isYear8;
        @AuraEnabled public Boolean showData;
        @AuraEnabled public Boolean isOutput1;
        @AuraEnabled public Boolean isOutput2;
        @AuraEnabled public Boolean isOutput3;
        @AuraEnabled public Boolean isOutput4;
        @AuraEnabled public Boolean isOutput5;
        @AuraEnabled public Boolean isOutput6;
        @AuraEnabled public Boolean isOutput7;
        @AuraEnabled public Boolean isOutput8;
        @AuraEnabled public Boolean isOutput9;
        @AuraEnabled public Boolean isOutput10;
        @AuraEnabled public Boolean isOutput11;
        @AuraEnabled public Boolean isOutput12;
        @AuraEnabled public Boolean isOutput13;
        @AuraEnabled public Boolean isOutput14;
        @AuraEnabled public Boolean isOutput15;
        @AuraEnabled public Boolean isSubImp1;
        @AuraEnabled public Boolean isSubImp2;
        @AuraEnabled public Boolean isSubImp3;
        @AuraEnabled public Boolean isSubImp4;
        @AuraEnabled public Boolean isSubImp5;
        @AuraEnabled public Boolean isSubImp6;
        @AuraEnabled public Boolean isSubImp7;
        @AuraEnabled public Boolean isSubImp8;
        @AuraEnabled public Boolean isSubImp9;
        @AuraEnabled public Boolean isSubImp10;
        @AuraEnabled public Boolean isCrossCutting;
        @AuraEnabled public uNI_Expense_Types__c expSummary;
        @AuraEnabled public uNI_SummaryBudget__c budConSummary;
        @AuraEnabled public uNI_Budget_Summary_Source_of_Funding__c budFundingSummary;
        @AuraEnabled public String footerQuestion;
        @AuraEnabled public List<uNI_Abbreviation__c> abbrevations;
        @AuraEnabled public List<uNI_RiskRegister__c> riskRegits;
        @AuraEnabled public List<uNI_ProjectActivities__c> activities;
        @AuraEnabled public List<uNI_ProcurementNeeds__c> procNeeds;
        @AuraEnabled public List<uNI_SummaryBudget__c> budgetConsMembs;
        @AuraEnabled public List<uNI_Budget_Summary_Source_of_Funding__c> budgetSourceOfFunding;
        @AuraEnabled public List<uNI_ProjectSummary__c> projSummaries;
        @AuraEnabled public uNI_PortfolioOutput__c portOutputSummary;
        @AuraEnabled public List<uNI_PortfolioOutput__c> portOutputs;
        @AuraEnabled public List<uNI_PortfolioOutcomes__c> portOutcomes;
        @AuraEnabled public List<uNI_Expense_Types__c> expenseTypes;
        @AuraEnabled public List<ConstriumMember> consMembers;
        @AuraEnabled public ConstriumMember consMembTotal;
        @AuraEnabled public ConstriumMember consMembPerc;
        @AuraEnabled public Boolean isEdit;
        @AuraEnabled public Integer noOfOutputs;
        @AuraEnabled public List<ColumnWrapper> colwraps;
        @AuraEnabled public String indAppId;
        @AuraEnabled public List<Map<String, String>> picklistOptions;

        public TableWrapper() {}
    }

    public class ColumnWrapper {
        @AuraEnabled public String name;
        @AuraEnabled public String name2;
        @AuraEnabled public String no;
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

        private Integer parseVersionToInteger(String val) {
            try {
                return String.isBlank(val) ? null : Integer.valueOf(val);
            } catch (Exception e) {
                return null;
            }
        }
    }

    // -------------------------------------------------------------------------
    // LATEST VS PREVIOUS VERSION COMPARISON (EXPENSE TYPES & PORTFOLIO OUTPUTS)
    // -------------------------------------------------------------------------
    public class BudgetOverviewComparisonRow {
        @AuraEnabled public String id;
        @AuraEnabled public String changeType;
        @AuraEnabled public String recordType;
        @AuraEnabled public String name;
        @AuraEnabled public String fieldLabel;
        @AuraEnabled public String previousValue;
        @AuraEnabled public String latestValue;
    }

    public class BudgetOverviewComparisonResult {
        @AuraEnabled public String latestVersion;
        @AuraEnabled public String previousVersion;
        @AuraEnabled public String message;
        @AuraEnabled public List<BudgetOverviewComparisonRow> differences;

        public BudgetOverviewComparisonResult() {
            differences = new List<BudgetOverviewComparisonRow>();
        }
    }

    @AuraEnabled(cacheable=true)
    public static BudgetOverviewComparisonResult getBudgetOverviewComparison(Id indAppId) {
        BudgetOverviewComparisonResult result = new BudgetOverviewComparisonResult();
        if (indAppId == null) {
            result.message = 'Individual Application Id is required to compare versions.';
            return result;
        }

        List<String> versions = fetchBOVersions(indAppId);
        if (versions.isEmpty()) {
            result.message = 'No budget overview versions found for this application.';
            return result;
        }
        if (versions.size() == 1) {
            result.latestVersion = versions[0];
            result.message = 'Only one version exists. Add another version to see differences.';
            return result;
        }

        result.latestVersion = versions[0];
        result.previousVersion = versions[1];

        Map<String, Map<String, String>> latestExpenses = buildExpenseSnapshot(indAppId, result.latestVersion);
        Map<String, Map<String, String>> previousExpenses = buildExpenseSnapshot(indAppId, result.previousVersion);
        Map<String, Map<String, String>> latestOutputs = buildOutputSnapshot(indAppId, result.latestVersion);
        Map<String, Map<String, String>> previousOutputs = buildOutputSnapshot(indAppId, result.previousVersion);

        compareSnapshot('Expense Type', latestExpenses, previousExpenses, result.differences);
        compareSnapshot('Portfolio Output', latestOutputs, previousOutputs, result.differences);

        if (result.differences.isEmpty()) {
            result.message = 'No differences found between versions ' + result.previousVersion + ' and ' + result.latestVersion + '.';
        }

        return result;
    }

    private static void compareSnapshot(
        String recordType,
        Map<String, Map<String, String>> latestMap,
        Map<String, Map<String, String>> previousMap,
        List<BudgetOverviewComparisonRow> target
    ) {
        Set<String> allKeys = new Set<String>();
        allKeys.addAll(latestMap.keySet());
        allKeys.addAll(previousMap.keySet());

        for (String key : allKeys) {
            Map<String, String> latest = latestMap.get(key);
            Map<String, String> previous = previousMap.get(key);

            if (latest == null || previous == null) {
                BudgetOverviewComparisonRow row = new BudgetOverviewComparisonRow();
                row.id = recordType + '|' + key + '|row';
                row.recordType = recordType;
                row.name = key;
                row.fieldLabel = 'Row';
                row.changeType = latest == null ? 'Removed' : 'Added';
                row.previousValue = previous == null ? '' : 'Present';
                row.latestValue = latest == null ? '' : 'Present';
                target.add(row);
                continue;
            }

            for (String fieldLabel : latest.keySet()) {
                String prevVal = previous.get(fieldLabel);
                String newVal = latest.get(fieldLabel);
                if (areValuesEqual(prevVal, newVal)) {
                    continue;
                }
                BudgetOverviewComparisonRow row = new BudgetOverviewComparisonRow();
                row.id = recordType + '|' + key + '|' + fieldLabel;
                row.recordType = recordType;
                row.name = key;
                row.fieldLabel = fieldLabel;
                row.changeType = 'Modified';
                row.previousValue = displayValue(prevVal);
                row.latestValue = displayValue(newVal);
                target.add(row);
            }
        }
    }

    private static Map<String, Map<String, String>> buildExpenseSnapshot(Id indAppId, String version) {
        Map<String, Map<String, String>> snap = new Map<String, Map<String, String>>();
        if (String.isBlank(version)) {
            return snap;
        }
        for (uNI_Expense_Types__c rec : [
            SELECT Name,
                   uNI_Output1__c, uNI_Output2__c, uNI_Output3__c, uNI_Output4__c, uNI_Output5__c,
                   uNI_Output6__c, uNI_Output7__c, uNI_Output8__c, uNI_Output9__c, uNI_Output10__c,
                   uNI_Output11__c, uNI_Output12__c, uNI_Output13__c, uNI_Output14__c, uNI_Output15__c,
                   uNI_Cross_Cutting__c,
                   uNI_Output_Totals__c,
                   uNI_ExpensePercent__c,
                   uNI_Version__c
            FROM uNI_Expense_Types__c
            WHERE uNI_IndividualApplication__c = :indAppId
              AND uNI_Version__c = :version
        ]) {
            String key = normalizeKey(rec.Name);
            Map<String, String> fields = new Map<String, String>();
            fields.put('Output 1', safeString(rec.uNI_Output1__c));
            fields.put('Output 2', safeString(rec.uNI_Output2__c));
            fields.put('Output 3', safeString(rec.uNI_Output3__c));
            fields.put('Output 4', safeString(rec.uNI_Output4__c));
            fields.put('Output 5', safeString(rec.uNI_Output5__c));
            fields.put('Output 6', safeString(rec.uNI_Output6__c));
            fields.put('Output 7', safeString(rec.uNI_Output7__c));
            fields.put('Output 8', safeString(rec.uNI_Output8__c));
            fields.put('Output 9', safeString(rec.uNI_Output9__c));
            fields.put('Output 10', safeString(rec.uNI_Output10__c));
            fields.put('Output 11', safeString(rec.uNI_Output11__c));
            fields.put('Output 12', safeString(rec.uNI_Output12__c));
            fields.put('Output 13', safeString(rec.uNI_Output13__c));
            fields.put('Output 14', safeString(rec.uNI_Output14__c));
            fields.put('Output 15', safeString(rec.uNI_Output15__c));
            fields.put('Cross Cutting', safeString(rec.uNI_Cross_Cutting__c));
            fields.put('Total', safeString(rec.uNI_Output_Totals__c));
            fields.put('Percent', safeString(rec.uNI_ExpensePercent__c));
            snap.put(key, fields);
        }
        return snap;
    }

    private static Map<String, Map<String, String>> buildOutputSnapshot(Id indAppId, String version) {
        Map<String, Map<String, String>> snap = new Map<String, Map<String, String>>();
        if (String.isBlank(version)) {
            return snap;
        }
        for (uNI_PortfolioOutput__c rec : [
            SELECT uNI_OutputTitle__c,
                   uNI_Year1__c, uNI_Year2__c, uNI_Year3__c, uNI_Year4__c,
                   uNI_Year5__c, uNI_Year6__c, uNI_Year7__c, uNI_Year8__c,
                   uNI_LogframeVersion__c,
                   uNI_total__c
            FROM uNI_PortfolioOutput__c
             WHERE uNI_IndividualApplication__c = :indAppId
              AND uNI_Logframe__c != null
              AND (uNI_LogframeVersion__c = :version or uNI_Version__c=:version)
            ORDER BY uNI_InternalSequence__c ASC
        ]) {
            String key = normalizeKey(rec.uNI_OutputTitle__c);
            Map<String, String> fields = new Map<String, String>();
            fields.put('Year 1', safeString(rec.uNI_Year1__c));
            fields.put('Year 2', safeString(rec.uNI_Year2__c));
            fields.put('Year 3', safeString(rec.uNI_Year3__c));
            fields.put('Year 4', safeString(rec.uNI_Year4__c));
            fields.put('Year 5', safeString(rec.uNI_Year5__c));
            fields.put('Year 6', safeString(rec.uNI_Year6__c));
            fields.put('Year 7', safeString(rec.uNI_Year7__c));
            fields.put('Year 8', safeString(rec.uNI_Year8__c));
            fields.put('Total', safeString(rec.uNI_total__c));
            snap.put(key, fields);
        }
        return snap;
    }

    private static List<String> fetchBOVersions(Id indAppId) {
        List<String> versions = new List<String>();
        for (AggregateResult ar : [
            SELECT uNI_Version__c versionValue
            FROM uNI_Expense_Types__c
            WHERE uNI_IndividualApplication__c = :indAppId
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

    private static Boolean areValuesEqual(String a, String b) {
        String normA = normalizeValue(a);
        String normB = normalizeValue(b);
        if (normA == null && normB == null) return true;
        if (normA != null) return normA.equals(normB);
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

    private static String normalizeKey(String value) {
        return value == null ? '' : value.trim().toLowerCase();
    }
}