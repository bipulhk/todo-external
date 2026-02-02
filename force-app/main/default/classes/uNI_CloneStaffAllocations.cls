/**
 * @File Name : uNI_CloneStaffAllocations.cls
 * @Description : Clone Staff Allocations from one version to another for an IA
 * @Author :
 * @Last Modified By :
 * @Last Modified On : November 2025
 * @Modification Log :
 *==============================================================================
 * Ver | Date         | Author | Modification
 *==============================================================================
 * 1.0 | Nov xx, 2025 |        | Initial Version
 **/
// Invocable clone helper used by Create/Return Reprogramming flows.
public without sharing class uNI_CloneStaffAllocations {

    // ===== Request / Response DTOs =====
    public class Request {
        // IA whose Staff Allocation records we want to clone
        @InvocableVariable(required=true)
        public Id individualApplicationId;

        // Version to clone FROM (e.g. "1")
        @InvocableVariable(required=true)
        public String sourceVersion;

        // Version to clone TO (e.g. "2")
        @InvocableVariable(required=true)
        public String targetVersion;
    }

    public class Response {
        @InvocableVariable public Id individualApplicationId;
        @InvocableVariable public String sourceVersion;
        @InvocableVariable public String targetVersion;
        @InvocableVariable public Integer clonedCount;
        @InvocableVariable public String message;
    }

    @InvocableMethod(
        label='Clone Staff Allocations by Version'
        description='Clones uNI_StaffAllocations__c rows for an Individual Application from a source version to a target version.'
    )
    public static List<Response> cloneStaffAllocations(List<Request> requests) {
        List<Response> results = new List<Response>();

        if (requests == null) {
            return results;
        }

        for (Request req : requests) {
            Response res = new Response();
            res.individualApplicationId = req.individualApplicationId;
            res.sourceVersion = req.sourceVersion;
            res.targetVersion = req.targetVersion;
            res.clonedCount = 0;

            try {
                if (req.individualApplicationId == null ||
                    String.isBlank(req.sourceVersion) ||
                    String.isBlank(req.targetVersion)) {

                    res.message = 'Missing required input (IA Id, sourceVersion, or targetVersion).';
                    results.add(res);
                    continue;
                }

                if (req.sourceVersion == req.targetVersion) {
                    res.message = 'Source and target version are the same; nothing to clone.';
                    results.add(res);
                    continue;
                }

                // ---- 1. Delete any existing Staff Allocations for the target version (avoid duplicates) ----
                List<uNI_StaffAllocations__c> existingTarget = [
                    SELECT Id
                    FROM uNI_StaffAllocations__c
                    WHERE uNI_IndividualApplications__c = :req.individualApplicationId
                      AND uNI_Version__c = :req.targetVersion
                ];

                if (!existingTarget.isEmpty()) {
                    delete existingTarget;
                }

                // ---- 2. Load all Staff Allocations for the source version ----
                List<uNI_StaffAllocations__c> sourceRows = [
                    SELECT Id,
                           Position_title__c,
                           Country__c,
                           Employing_organization__c,
                           Expense_Type__c,
                           Total_Salary__c,
                           Cost_per_LOE__c,
                           LOE__c,
                           LOE1__c, LOE2__c, LOE3__c, LOE4__c, LOE5__c, LOE6__c,
                           Year1__c, Year2__c, Year3__c, Year4__c, Year5__c, Year6__c,
                           Fully_loaded_salary1__c, Fully_loaded_salary2__c, Fully_loaded_salary3__c,
                           Fully_loaded_salary4__c, Fully_loaded_salary5__c, Fully_loaded_salary6__c,
                           month1__c, month2__c, month3__c, month4__c, month5__c, month6__c,
                           of_Allowances_Fringe__c,
                           Comments__c,
                           uNI_Outputs__c,
                           uNI_IndividualApplications__c,
                           uNI_Version__c
                    FROM uNI_StaffAllocations__c
                    WHERE uNI_IndividualApplications__c = :req.individualApplicationId
                      AND uNI_Version__c = :req.sourceVersion
                ];

                if (sourceRows.isEmpty()) {
                    res.message = 'No Staff Allocations found for source version ' + req.sourceVersion + '.';
                    results.add(res);
                    continue;
                }

                // ---- 3. Clone each row, bumping the version ----
                List<uNI_StaffAllocations__c> clones = new List<uNI_StaffAllocations__c>();

                for (uNI_StaffAllocations__c src : sourceRows) {
                    uNI_StaffAllocations__c clone = new uNI_StaffAllocations__c();

                    // Parent & version
                    clone.uNI_IndividualApplications__c = req.individualApplicationId;
                    clone.uNI_Version__c = req.targetVersion;

                    // Core fields
                    clone.Position_title__c        = src.Position_title__c;
                    clone.Country__c               = src.Country__c;
                    clone.Employing_organization__c = src.Employing_organization__c;
                    clone.Expense_Type__c          = src.Expense_Type__c;

                    clone.Total_Salary__c          = src.Total_Salary__c;
                    clone.Cost_per_LOE__c          = src.Cost_per_LOE__c;
                    clone.LOE__c                   = src.LOE__c;

                    // LOE per year
                    clone.LOE1__c                  = src.LOE1__c;
                    clone.LOE2__c                  = src.LOE2__c;
                    clone.LOE3__c                  = src.LOE3__c;
                    clone.LOE4__c                  = src.LOE4__c;
                    clone.LOE5__c                  = src.LOE5__c;
                    clone.LOE6__c                  = src.LOE6__c;

                    // Year totals
                    clone.Year1__c                 = src.Year1__c;
                    clone.Year2__c                 = src.Year2__c;
                    clone.Year3__c                 = src.Year3__c;
                    clone.Year4__c                 = src.Year4__c;
                    clone.Year5__c                 = src.Year5__c;
                    clone.Year6__c                 = src.Year6__c;

                    // Fully loaded salaries
                    clone.Fully_loaded_salary1__c  = src.Fully_loaded_salary1__c;
                    clone.Fully_loaded_salary2__c  = src.Fully_loaded_salary2__c;
                    clone.Fully_loaded_salary3__c  = src.Fully_loaded_salary3__c;
                    clone.Fully_loaded_salary4__c  = src.Fully_loaded_salary4__c;
                    clone.Fully_loaded_salary5__c  = src.Fully_loaded_salary5__c;
                    clone.Fully_loaded_salary6__c  = src.Fully_loaded_salary6__c;

                    // Months
                    clone.month1__c                = src.month1__c;
                    clone.month2__c                = src.month2__c;
                    clone.month3__c                = src.month3__c;
                    clone.month4__c                = src.month4__c;
                    clone.month5__c                = src.month5__c;
                    clone.month6__c                = src.month6__c;

                    // Other fields
                    clone.of_Allowances_Fringe__c  = src.of_Allowances_Fringe__c;
                    clone.Comments__c              = src.Comments__c;
                    clone.uNI_Outputs__c           = src.uNI_Outputs__c;

                    clones.add(clone);
                }

                if (!clones.isEmpty()) {
                    insert clones;
                }

                res.clonedCount = clones.size();
                res.message = 'Cloned ' + clones.size() + ' Staff Allocation record(s) from version ' +
                              req.sourceVersion + ' to ' + req.targetVersion + '.';
            } catch (Exception e) {
                res.message = 'Error during clone: ' + e.getMessage();
            }

            results.add(res);
        }

        return results;
    }
}
