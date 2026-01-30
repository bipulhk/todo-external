# recently i ran the uNI_Create_Annual_Report_1 flow
_Exported on 01/31/2026 at 02:05:19 GMT+5:30 from OpenAI Codex via WayLog_


**OpenAI Codex**

<permissions instructions>Filesystem sandboxing defines which files can be read or written. `sandbox_mode` is `danger-full-access`: No filesystem sandboxing - all commands are permitted. Network access is enabled. Approvals are your mechanism to get user consent to run shell commands without the sandbox. `approval_policy` is `never`: This is a non-interactive mode where you may NEVER ask the user for approval to run commands. Instead, you must always persist and work around constraints to solve the task for the user. You MUST do your utmost best to finish the task and validate your work before yielding. If this mode is paired with `danger-full-access`, take advantage of it to deliver the best outcome for the user. Further, in this mode, your default testing philosophy is overridden: Even if you don't see local patterns for testing, you may add tests and scripts to validate your work. Just remove them before yielding.</permissions instructions>

---


**User**

recently i ran the uNI_Create_Annual_Report_1 flow, but the expense types records were not created properly, the expensetype records were not created properly i think since it didnt loaded correctly for the annual report id : a19FT000001xRMzYAM, can you check and tell me why?

---


**OpenAI Codex**

I can’t see the org data for AR `a19FT000001xRMzYAM`, but the flow + Apex logic point to a few concrete failure modes. The creation of “Annual Report” expense types is handled by the invocable Apex `uNI_CreateExpensesForAnnualReport` called from the flow. The record insert depends entirely on matching version/year data, and it will silently create placeholders if no matching source rows are found.

**What can cause “not created properly” based on the code**
- **Version mismatch = no source rows.** The Apex only clones source rows where `uNI_CostType__c = 'Budget'` and `uNI_Version__c = <version input>`. If the version passed from the flow doesn’t match existing Budget expense types, you’ll only get placeholder rows (defaults) with no data. See `force-app/main/default/classes/uNI_CreateExpensesForAnnualReport.cls`.
- **Target year mismatch filters source rows out.** When a `targetYear` is passed, the code skips any Budget expense type with a different `uNI_TargetYear__c`. If your Budget expense types are tagged with a different year, they’ll be ignored. See `force-app/main/default/classes/uNI_CreateExpensesForAnnualReport.cls`.
- **No BudgetData for that year/output = projected outputs empty.** For yearly aggregation, it only reads `uNI_BudgetData__c` with `uNI_Years__c = targetYear` **and** `uNI_PortfolioOutput__c != null`. If your budget rows for that year are missing outputs, projected outputs will be blank even if the base expense type record exists. See `force-app/main/default/classes/uNI_CreateExpensesForAnnualReport.cls`.
- **Potential wrong version in reprogramming path.** In the reprogramming branch, the flow passes `get_Reprogramming_requests.logframeVersion` directly (not the `SelectedLogframeVersionForAR` formula). If that value is wrong (or unexpectedly “0”), it won’t match Budget expense types. See `force-app/main/default/flows/uNI_Create_Annual_Report_1.flow-meta.xml`.

**What I’d check for AR `a19FT000001xRMzYAM`**
- The **version** passed into the invocable for that run and whether Budget expense types exist for that exact version.
- The **target year** selected in the screen vs. `uNI_TargetYear__c` on Budget expense types.
- Whether `uNI_BudgetData__c` has rows for that **year** and **version** with `uNI_PortfolioOutput__c` populated.
- Whether the flow ran the **reprogramming branch** and what `get_Reprogramming_requests.logframeVersion` actually was.

If you can give me the flow interview debug log (or just the values for version + selected report year + IA Id), I can pinpoint the exact mismatch. If you want, I can also add lightweight logging in `uNI_CreateExpensesForAnnualReport.cls` to surface the inputs and counts so this becomes easier to diagnose next time.

---
