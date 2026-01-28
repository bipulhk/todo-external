# fetch all the child lwc from the uNI_MilestoneTab 
_Exported on 01/28/2026 at 17:02:46 GMT+5:30 from OpenAI Codex via WayLog_


**OpenAI Codex**

<permissions instructions>Filesystem sandboxing defines which files can be read or written. `sandbox_mode` is `danger-full-access`: No filesystem sandboxing - all commands are permitted. Network access is enabled. Approvals are your mechanism to get user consent to run shell commands without the sandbox. `approval_policy` is `never`: This is a non-interactive mode where you may NEVER ask the user for approval to run commands. Instead, you must always persist and work around constraints to solve the task for the user. You MUST do your utmost best to finish the task and validate your work before yielding. If this mode is paired with `danger-full-access`, take advantage of it to deliver the best outcome for the user. Further, in this mode, your default testing philosophy is overridden: Even if you don't see local patterns for testing, you may add tests and scripts to validate your work. Just remove them before yielding.</permissions instructions>

---


**User**

fetch all the child lwc from the uNI_MilestoneTab and uNI_BudgetTab LWCS (including the nessasary controllers.

---


**OpenAI Codex**

Found the child LWC references and the Apex controllers actually present in this repo. Some of the referenced children/controllers are missing locally (likely from another package or not yet retrieved).

**From `uNI_MilestoneTab`**
- Child LWC (via dynamic loader):
  - `uNI_sd_milestoneTracker` (not found under `force-app/main/default/lwc`)
  - `uNI_sd_milestoneTimeline` (not found under `force-app/main/default/lwc`)
- Required helper LWC:
  - `uNI_dynamicLwcLoader` (tag: `c-u-n-i-dynamic-lwc-loader`) — not found under `force-app/main/default/lwc`
- Apex controllers referenced by `uNI_MilestoneTab` itself:
  - `uNI_LogframeController` (methods: `getAvailableLogframeVersions`, `resolveInvestmentId`) — not found in `force-app/main/default/classes`
  - `uNI_ReprogrammingObjectCheck` (method: `getObjectApiName`) — not found in `force-app/main/default/classes`

**From `uNI_BudgetTab`**
- Child LWC (via dynamic loader):
  - `uNI_FERatesv` (not found under `force-app/main/default/lwc`)
  - `uNI_BudgetOverview` (present: `force-app/main/default/lwc/uNI_BudgetOverview`)
  - `uNI_BudgetData` (present: `force-app/main/default/lwc/uNI_BudgetData`)
  - `uNI_CoFunding` (not found under `force-app/main/default/lwc`)
  - `uNI_StaffAllocations` (not found under `force-app/main/default/lwc`)
- Required helper LWC:
  - `uNI_dynamicLwcLoader` (tag: `c-u-n-i-dynamic-lwc-loader`) — not found under `force-app/main/default/lwc`
- Apex controllers referenced by `uNI_BudgetTab` itself:
  - `uNI_LogframeController` (methods: `getAvailableLogframeVersions`, `resolveInvestmentId`) — not found in `force-app/main/default/classes`
  - `uNI_ReprogrammingObjectCheck` (method: `getObjectApiName`) — not found in `force-app/main/default/classes`

**Controllers for the child LWCs that are present**
- `uNI_BudgetOverview` uses `uNI_BudgetOverviewController`  
  - Present: `force-app/main/default/classes/uNI_BudgetOverviewController.cls`
- `uNI_BudgetData` uses `uNI_BudgetDataController`  
  - Present: `force-app/main/default/classes/uNI_BudgetDataController.cls`

If you want me to pull missing LWCs/controllers into this repo (e.g., update `package.xml` or a `manifest` for retrieval), tell me which org/package/source they live in and I’ll prep the fetch list.

---


**User**

run the command and fetch all required files from the salesforce org.

---


**OpenAI Codex**

Ran the retrieve from the org using `sf project retrieve start -x manifest/package.unichat.xml`. It succeeded and pulled all listed items except `uNI_dynamicLwcLoader`, which is not found in the org.

Key outcomes:
- Retrieved/updated Apex classes: `uNI_LogframeController`, `uNI_ReprogrammingObjectCheck`, `uNI_BudgetOverviewController`, plus existing ones.
- Retrieved LWCs: `uNI_FERatesv`, `uNI_CoFunding`, `uNI_StaffAllocations`, `uNI_sd_milestoneTracker`, `uNI_sd_milestoneTimeline`, plus refreshed existing bundles.
- Warning: `uNI_dynamicLwcLoader` is missing in the org.

If you want, I can:
1) search the org for the correct name of the dynamic loader LWC and re-retrieve, or  
2) remove it from the manifest and proceed.

Which should I do?

---
