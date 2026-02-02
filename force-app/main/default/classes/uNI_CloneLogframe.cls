/**
 * Invocable clone helper used by Create/Return Reprogramming flows.
 * Clones Logframe structure (Outcomes, Outputs, Indicators) and bumps version by +1.
 */
public without sharing class uNI_CloneLogframe {

    public class Request {
        @InvocableVariable(required=true) 
        public Id logframeId;

        @InvocableVariable 
        public Boolean appendVersionToName;  // applies to Logframe only

        // NEW: value for uNI_ProjectYears__c coming from Flow
        @InvocableVariable
        public Integer projectYears; // adjust type if uNI_ProjectYears__c is not Integer
    }

    public class Response {
        @InvocableVariable public Id sourceLogframeId;
        @InvocableVariable public Id newLogframeId;
        @InvocableVariable public Integer outcomesCloned;
        @InvocableVariable public Integer outputsCloned;
        @InvocableVariable public Integer indicatorsCloned;
        @InvocableVariable public List<String> errors;
    }

    @InvocableMethod(label='Clone Logframe Structure (+1 version)')
    public static List<Response> run(List<Request> reqs){
        List<Response> out = new List<Response>();
        for (Request r : reqs) out.add(cloneAll(r));
        return out;
    }

    // ---------- Helpers ----------
    // Bump a version field on a record by +1 (handles Number or Text)
    private static void bumpVersion(SObject rec, Schema.SObjectField fld){
        Schema.DescribeFieldResult d = fld.getDescribe();
        Object cur = rec.get(fld);
        Integer next;
        try { next = (cur == null) ? 0 : Integer.valueOf(String.valueOf(cur)); }
        catch (Exception e) { next = 0; }
        next++;
        Schema.DisplayType t = d.getType();
        if (t == Schema.DisplayType.Integer || t == Schema.DisplayType.Long) {
            rec.put(fld, next);
        } else if (t == Schema.DisplayType.Double || t == Schema.DisplayType.Percent || t == Schema.DisplayType.Currency) {
            rec.put(fld, Decimal.valueOf(next));
        } else {
            rec.put(fld, String.valueOf(next));
        }
    }

    // Copy the parent's version value (as-is) to a child field, preserving the child field's type
    private static void setVersionFromParent(Object parentVersion, SObject child, Schema.SObjectField childFld){
        Schema.DescribeFieldResult d = childFld.getDescribe();
        Schema.DisplayType t = d.getType();
        if (parentVersion == null) { child.put(childFld, null); return; }
        String s = String.valueOf(parentVersion);
        if (t == Schema.DisplayType.Integer || t == Schema.DisplayType.Long) {
            Integer v; try { v = Integer.valueOf(s); } catch (Exception e) { v = 0; }
            child.put(childFld, v);
        } else if (t == Schema.DisplayType.Double || t == Schema.DisplayType.Percent || t == Schema.DisplayType.Currency) {
            Decimal v; try { v = Decimal.valueOf(s); } catch (Exception e) { v = 0; }
            child.put(childFld, v);
        } else {
            child.put(childFld, s);
        }
    }

    private static String nameWithVersion(String base, SObject rec, Schema.SObjectField versionFld){
        Object v = rec.get(versionFld);
        return (base == null ? 'Record' : base) + ' — v' + String.valueOf(v);
    }

    private static Boolean canWrite(Schema.SObjectField f){
        return f.getDescribe().isUpdateable();
    }

    private static Object computeNextVersionValue(Object current, Schema.SObjectField fld){
        Schema.DescribeFieldResult d = fld.getDescribe();
        Schema.DisplayType t = d.getType();
        Integer base;
        try { base = (current == null) ? 0 : Integer.valueOf(String.valueOf(current)); }
        catch (Exception e) { base = 0; }
        Integer next = base + 1;
        if (t == Schema.DisplayType.Integer || t == Schema.DisplayType.Long) {
            return next;
        } else if (t == Schema.DisplayType.Double ||
                   t == Schema.DisplayType.Percent ||
                   t == Schema.DisplayType.Currency) {
            return Decimal.valueOf(next);
        }
        return String.valueOf(next);
    }

    private static uNI_Logframe__c findExistingLogframe(Id indAppId, Object targetVersion){
        if (indAppId == null || targetVersion == null) {
            return null;
        }
        // uNI_LogframeVersion__c is a Text field in this org, so bind as String
        String v = String.valueOf(targetVersion);
        List<uNI_Logframe__c> rows = [
            SELECT Id, uNI_LogframeVersion__c
            FROM uNI_Logframe__c
            WHERE uNI_Individual_Application__c = :indAppId
              AND uNI_LogframeVersion__c = :v
            LIMIT 1
        ];
        return rows.isEmpty() ? null : rows[0];
    }

    // ---------- Core ----------
    private static Response cloneAll(Request req){
        Response res = new Response();
        res.errors = new List<String>();
        res.sourceLogframeId = (req != null ? req.logframeId : null);
        if (req == null || req.logframeId == null) {
            res.errors.add('Missing logframeId.');
            return res;
        }

        // 1) ALWAYS CLONE THE LOGFRAME (and bump its version +1)
        Id targetLogframeId;
        Object newLogframeVersionValue;
        try {
            uNI_Logframe__c srcLF = [
                SELECT Id, Name, uNI_Individual_Application__c, uNI_ProjectYears__c,
                       uNI_IsEditableLogframe__c, uNI_LogframeVersion__c
                FROM uNI_Logframe__c
                WHERE Id = :req.logframeId
                LIMIT 1
            ];

            // Guard: if the target version already exists, skip cloning
            Object targetVersionValue = computeNextVersionValue(
                srcLF.get(uNI_Logframe__c.uNI_LogframeVersion__c),
                uNI_Logframe__c.uNI_LogframeVersion__c
            );
            uNI_Logframe__c existing = findExistingLogframe(
                srcLF.uNI_Individual_Application__c,
                targetVersionValue
            );
            if (existing != null) {
                res.newLogframeId = existing.Id;
                res.outcomesCloned = 0;
                res.outputsCloned = 0;
                res.indicatorsCloned = 0;
                return res;
            }

            uNI_Logframe__c newLF = srcLF.clone(false,false,false);
            bumpVersion(newLF, uNI_Logframe__c.uNI_LogframeVersion__c);   // v = old + 1 on the NEW logframe

            // NEW: override Project Years with value passed from Flow (if provided)
            if (req.projectYears != null && canWrite(uNI_Logframe__c.uNI_ProjectYears__c)) {
                newLF.uNI_ProjectYears__c = req.projectYears;
                System.debug('Project Years updated ' + req.projectYears);
            }

            if (req.appendVersionToName == true && canWrite(uNI_Logframe__c.Name)) {
                newLF.Name = nameWithVersion(srcLF.Name, newLF, uNI_Logframe__c.uNI_LogframeVersion__c);
            }
            insert newLF;
            targetLogframeId = newLF.Id;
            res.newLogframeId = newLF.Id;

            // capture the NEW logframe's version value (Number or Text) to assign to all children
            newLogframeVersionValue = newLF.get(uNI_Logframe__c.uNI_LogframeVersion__c);
        } catch (Exception e) {
            res.errors.add('Logframe clone failed: ' + e.getMessage());
            return res; // cannot proceed without a target logframe
        }

        // 2) OUTCOMES (DO NOT TOUCH Name – it's Auto Number). Set version = new logframe's version.
        List<uNI_PortfolioOutcomes__c> srcOutcomes = [
            SELECT Id, Name, uNI_Outcome__c, uNI_Contributions__c, uNI_ExpectedResults__c,
                   uNI_CallForProposals__c, uNI_ResponseBy__c, uNI_IndividualApplication__c,
                   uNI_OutcomeTitle__c, uNI_Logframe__c, uNI_LogframeVersion__c
            FROM uNI_PortfolioOutcomes__c
            WHERE uNI_Logframe__c = :req.logframeId
        ];
        List<uNI_PortfolioOutcomes__c> newOutcomes = new List<uNI_PortfolioOutcomes__c>();
        for (uNI_PortfolioOutcomes__c o : srcOutcomes){
            uNI_PortfolioOutcomes__c n = o.clone(false,false,false);
            n.uNI_Logframe__c = targetLogframeId;
            setVersionFromParent(newLogframeVersionValue, n, uNI_PortfolioOutcomes__c.uNI_LogframeVersion__c);
            newOutcomes.add(n);
        }
        Map<Id, Id> outcomeOldToNew = new Map<Id, Id>();
        if (!newOutcomes.isEmpty()){
            Database.SaveResult[] sr = Database.insert(newOutcomes, false);
            for (Integer i = 0; i < sr.size(); i++){
                if (sr[i].isSuccess()) outcomeOldToNew.put(srcOutcomes[i].Id, sr[i].getId());
                else res.errors.add('Outcome clone failed: ' + sr[i].getErrors()[0].getMessage());
            }
        }
        res.outcomesCloned = outcomeOldToNew.size();

        // 3) OUTPUTS (DO NOT TOUCH Name). Set version = new logframe's version.
        List<uNI_PortfolioOutput__c> srcOutputs = [
            SELECT Id, Name, uNI_ProjectSpecificContributions__c, uNI_OutputTitle__c, uNI_OutputDescription__c,
                   uNI_CallForProposals__c, uNI_ResponseBy__c, Mapping_Output_Field_in_Relative_Objs__c,
                   uNI_IndividualApplication__c, uNI_Logframe__c,
                   uNI_Year1__c, uNI_Year2__c, uNI_Year3__c, uNI_Year4__c, uNI_Year5__c, uNI_Year6__c, uNI_Year7__c, uNI_Year8__c,
                   uNI_Year1Narrative__c, uNI_Year2Narrative__c, uNI_Year3Narrative__c, uNI_Year4Narrative__c,
                   uNI_Year5Narrative__c, uNI_Year6Narrative__c, uNI_Year7Narrative__c, uNI_Year8Narrative__c,
                   uNI_total__c, uNI_YearsPercent__c, Lead_Organization__c,
                   Sub_implementers_1__c, Sub_implementers_2__c, Sub_implementers_3__c, Sub_implementers_4__c,
                   Sub_implementers_5__c, Sub_implementers_6__c, Sub_implementers_7__c, Sub_implementers_8__c,
                   uNI_LogframeVersion__c
            FROM uNI_PortfolioOutput__c
            WHERE uNI_Logframe__c = :req.logframeId
        ];
        List<uNI_PortfolioOutput__c> newOutputs = new List<uNI_PortfolioOutput__c>();
        for (uNI_PortfolioOutput__c p : srcOutputs){
            uNI_PortfolioOutput__c n = p.clone(false,false,false);
            n.uNI_Logframe__c = targetLogframeId;
            setVersionFromParent(newLogframeVersionValue, n, uNI_PortfolioOutput__c.uNI_LogframeVersion__c);
            n.put('uNI_Version__c', n.get('uNI_LogframeVersion__c'));
            newOutputs.add(n);
        }
        Map<Id, Id> outputOldToNew = new Map<Id, Id>();
        if (!newOutputs.isEmpty()){
            Database.SaveResult[] sr = Database.insert(newOutputs, false);
            for (Integer i = 0; i < sr.size(); i++){
                if (sr[i].isSuccess()) outputOldToNew.put(srcOutputs[i].Id, sr[i].getId());
                else res.errors.add('Output clone failed: ' + sr[i].getErrors()[0].getMessage());
            }
        }
        res.outputsCloned = outputOldToNew.size();

        // 4) INDICATORS (Outcome- or Output-linked). Set version = new logframe's version.
        Set<Id> oldOutcomeIds = outcomeOldToNew.keySet();
        Set<Id> oldOutputIds  = outputOldToNew.keySet();

        List<uNI_Indicator__c> srcInds = new List<uNI_Indicator__c>();
        if (!oldOutcomeIds.isEmpty() || !oldOutputIds.isEmpty()){
            srcInds = [
                SELECT Id, Name, uNI_Indicator_Heading__c, uNI_Index__c, uNI_Disaggregation__c,
                       uNI_Smart_Indicator__c, uNI_IndicatorNumerator__c, uNI_IndicatorDenominator__c,
                       uNI_Comments__c, uNI_Year1Result__c, uNI_Year2Result__c, uNI_Year3Result__c,
                       uNI_Year1Target__c, uNI_Year2Target__c, uNI_Year3Target__c, uNI_Year4Target__c,
                       uNI_Year5Target__c, uNI_Year6Target__c, uNI_Year7Target__c, uNI_Year8Target__c,
                       uNI_End_Of_Project_Target__c, uNI_Post_Grant__c, uNI_Baseline__c,
                       uNI_MeansofVerificationDataSources__c, uNI_AssumptionsRationale__c,
                       uNI_ReportingFrequency__c, uNI_Result_End_Of_Project__c,
                       uNI_Comments_from_Implementer_Year1__c, uNI_Comments_from_Implementer_Year2__c, uNI_Comments_from_Implementer_Year3__c,
                       uNI_Output__c, uNI_Outcome__c, uNI_LogframeVersion__c
                FROM uNI_Indicator__c
                WHERE (uNI_Outcome__c IN :oldOutcomeIds) OR (uNI_Output__c IN :oldOutputIds)
            ];
        }

        List<uNI_Indicator__c> newInds = new List<uNI_Indicator__c>();
        for (uNI_Indicator__c ind : srcInds){
            uNI_Indicator__c ni = ind.clone(false,false,false);

            if (ind.uNI_Outcome__c != null && outcomeOldToNew.containsKey(ind.uNI_Outcome__c)) {
                ni.uNI_Outcome__c = outcomeOldToNew.get(ind.uNI_Outcome__c);
                ni.uNI_Output__c  = null;
            } else if (ind.uNI_Output__c != null && outputOldToNew.containsKey(ind.uNI_Output__c)) {
                ni.uNI_Output__c  = outputOldToNew.get(ind.uNI_Output__c);
                ni.uNI_Outcome__c = null;
            } else {
                continue;
            }

            setVersionFromParent(newLogframeVersionValue, ni, uNI_Indicator__c.uNI_LogframeVersion__c);
            newInds.add(ni);
        }

        Integer okInds = 0;
        if (!newInds.isEmpty()){
            Integer chunk = 5000;
            for (Integer start = 0; start < newInds.size(); start += chunk){
                Integer endExclusive = Math.min(start + chunk, newInds.size());
                List<uNI_Indicator__c> slice = new List<uNI_Indicator__c>();
                for (Integer i = start; i < endExclusive; i++){
                    slice.add(newInds[i]);
                }
                Database.SaveResult[] sr = Database.insert(slice, false);
                for (Database.SaveResult s : sr){
                    if (s.isSuccess()) okInds++;
                    else if (s.getErrors() != null && s.getErrors().size() > 0)
                        res.errors.add('Indicator clone failed: ' + s.getErrors()[0].getMessage());
                }
            }
        }
        res.indicatorsCloned = okInds;

        return res;
    }
}
