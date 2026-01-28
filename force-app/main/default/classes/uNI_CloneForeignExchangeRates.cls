public with sharing class uNI_CloneForeignExchangeRates {

    // ===== Request & Response DTOs =====
    public class Request {
        // IA whose FX records we want to clone
        @InvocableVariable(required=true)
        public Id individualApplicationId;

        // Version to clone FROM
        @InvocableVariable(required=true)
        public String sourceVersion;

        // Version to set on the cloned records (Flow already bumped this, e.g. "2")
        @InvocableVariable(required=true)
        public String targetVersion;
    }

    public class Response {
        @InvocableVariable public Id individualApplicationId;
        @InvocableVariable public String sourceVersion;
        @InvocableVariable public String targetVersion;
        @InvocableVariable public Integer recordsCloned;
        @InvocableVariable public List<String> errors;
    }

    // ===== Invocable entry point =====
    @InvocableMethod(label='Clone Foreign Exchange Rates (previous → target version)')
    public static List<Response> run(List<Request> reqs) {
        List<Response> out = new List<Response>();
        for (Request r : reqs) {
            out.add(cloneForRequest(r));
        }
        return out;
    }

    // Convert a String version value into the proper field type and set it
    private static void setVersionFromFlow(String version, SObject rec, Schema.SObjectField fld) {
        Schema.DescribeFieldResult d = fld.getDescribe();
        Schema.DisplayType t = d.getType();

        if (version == null) {
            rec.put(fld, null);
            return;
        }

        String s = String.valueOf(version);

        try {
            if (t == Schema.DisplayType.Integer || t == Schema.DisplayType.Long) {
                rec.put(fld, Integer.valueOf(s));
            } else if (t == Schema.DisplayType.Double ||
                       t == Schema.DisplayType.Percent ||
                       t == Schema.DisplayType.Currency) {
                rec.put(fld, Decimal.valueOf(s));
            } else {
                // Text or anything else: store as String
                rec.put(fld, s);
            }
        } catch (Exception e) {
            // If parsing fails, fall back to storing as String
            rec.put(fld, s);
        }
    }

    // ===== Core logic per request =====
    private static Response cloneForRequest(Request req) {
        Response res = new Response();
        res.errors = new List<String>();
        res.recordsCloned = 0;

        if (req == null ||
            req.individualApplicationId == null ||
            String.isBlank(req.sourceVersion) ||
            String.isBlank(req.targetVersion)) {

            res.errors.add('Missing individualApplicationId, sourceVersion, or targetVersion.');
            return res;
        }

        res.individualApplicationId = req.individualApplicationId;
        res.targetVersion = req.targetVersion;

        res.sourceVersion = req.sourceVersion;

        // 1) Query source FX records for IA + sourceVersion
        List<uNI_ForeignExchangeRates__c> srcFx = [
            SELECT Id,
                   Name,
                   uNI_PartnerOrganization__c,
                   uNI_Country__c,
                   uNI_LocalCurrency__c,
                   uNI_ForexInUS__c,
                   uNI_Source__c,
                   uNI_IndividualApplication__c,
                   uNI_Version__c
            FROM uNI_ForeignExchangeRates__c
            WHERE uNI_IndividualApplication__c = :req.individualApplicationId
              AND uNI_Version__c = :req.sourceVersion
        ];

        if (srcFx.isEmpty()) {
            // Nothing to clone; not an error, just 0 results.
            return res;
        }

        // 2) Clone each record, keep same IA, set version = targetVersion from Flow
        List<uNI_ForeignExchangeRates__c> clones = new List<uNI_ForeignExchangeRates__c>();
        for (uNI_ForeignExchangeRates__c fx : srcFx) {
            uNI_ForeignExchangeRates__c n = fx.clone(false, false, false);

            // Ensure we keep the same IA
            n.uNI_IndividualApplication__c = req.individualApplicationId;

            // Set version from Flow (already bumped)
            setVersionFromFlow(
                req.targetVersion,
                n,
                uNI_ForeignExchangeRates__c.uNI_Version__c
            );

            clones.add(n);
        }

        // 3) Insert cloned records (partial success)
        if (!clones.isEmpty()) {
            Database.SaveResult[] srList = Database.insert(clones, false);
            for (Integer i = 0; i < srList.size(); i++) {
                Database.SaveResult sr = srList[i];
                if (sr.isSuccess()) {
                    res.recordsCloned++;
                } else if (sr.getErrors() != null && !sr.getErrors().isEmpty()) {
                    res.errors.add(
                        'FX clone failed (source Id: ' + srcFx[i].Id + '): ' +
                        sr.getErrors()[0].getMessage()
                    );
                }
            }
        }

        return res;
    }
}