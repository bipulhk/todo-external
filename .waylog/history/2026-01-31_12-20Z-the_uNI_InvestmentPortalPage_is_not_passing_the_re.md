# the uNI_InvestmentPortalPage is not passing the re
_Exported on 01/31/2026 at 17:50:22 GMT+5:30 from OpenAI Codex via WayLog_


**OpenAI Codex**

<permissions instructions>Filesystem sandboxing defines which files can be read or written. `sandbox_mode` is `danger-full-access`: No filesystem sandboxing - all commands are permitted. Network access is enabled. Approvals are your mechanism to get user consent to run shell commands without the sandbox. `approval_policy` is `never`: This is a non-interactive mode where you may NEVER ask the user for approval to run commands. Instead, you must always persist and work around constraints to solve the task for the user. You MUST do your utmost best to finish the task and validate your work before yielding. If this mode is paired with `danger-full-access`, take advantage of it to deliver the best outcome for the user. Further, in this mode, your default testing philosophy is overridden: Even if you don't see local patterns for testing, you may add tests and scripts to validate your work. Just remove them before yielding.</permissions instructions>

---


**User**

the uNI_InvestmentPortalPage is not passing the recordId to the uNIInvestmentOverviewPage to the mind you that the the uNI_InvestmentPortalPage is placed in a community portal page.

---


**OpenAI Codex**

Updated the portal to pass a proper `lwc:props` object (with `recordId`) to the dynamic loader and added an Experience Cloud-friendly `pageRef.attributes.recordId` fallback. Also exposed `@api recordId` on the overview page so it can receive the prop.

Changes:
- `force-app/main/default/lwc/uNI_InvestmentPortalPage/uNI_InvestmentPortalPage.js`
- `force-app/main/default/lwc/uNI_InvestmentPortalPage/uNI_InvestmentPortalPage.html`
- `force-app/main/default/lwc/uNIInvestmentOverviewPage/uNIInvestmentOverviewPage.js`

Why this fixes it:
- `lwc:component` expects an object in `lwc:props`; previously a string was passed, so `recordId` never mapped.
- Community pages sometimes provide `recordId` via `pageRef.attributes`, so we now capture it.

Next steps (pick any):
1) Load the Experience Cloud page and verify `recordId` is populated in `uNIInvestmentOverviewPage`.
2) If other dynamic tabs need `recordId`, add `@api recordId;` in those LWCs too.

---


**User**

still no data, can you please refer how the uNI_AnnualReport fetching the recordId and is passing the recordId to the child components. like uNIAnnualReportOverview
and implement the same in the uNI_InvestmentPortalPage and the uNIInvestmentOverviewPage LWC.

---


**OpenAI Codex**

Aligned `uNI_InvestmentPortalPage` to the same pattern as `uNI_AnnualReport`: pass the recordId as a simple string via `lwc-params` and have the child resolve it through `@api params` (with a `params || recordId` fallback). Also added a guard so tabs render only once a recordId is available.

Changes:
- `force-app/main/default/lwc/uNI_InvestmentPortalPage/uNI_InvestmentPortalPage.js`
- `force-app/main/default/lwc/uNI_InvestmentPortalPage/uNI_InvestmentPortalPage.html`
- `force-app/main/default/lwc/uNIInvestmentOverviewPage/uNIInvestmentOverviewPage.js`

Next steps if data still isn’t showing:
1) In `uNIInvestmentOverviewPage`, use `resolvedInvestmentId` in your `@wire(getRecord, …)` or Apex calls (same as `uNIAnnualReportOverview` uses `resolvedARId`).
2) Drop a quick `console.log('resolvedInvestmentId', this.resolvedInvestmentId);` in `connectedCallback` to confirm the value is coming through in the community page.

---


**User**

still not there can you please add some logs to check if there a recordId present in the uNI_InvestmentPortalPage and uNIInvestmentOverviewPage page.

---


**OpenAI Codex**

Added targeted console logs to both components so you can confirm whether a recordId is present and where it was sourced. Logs are gated to avoid spamming once a valid ID is found.

Changes:
- `force-app/main/default/lwc/uNI_InvestmentPortalPage/uNI_InvestmentPortalPage.js`
- `force-app/main/default/lwc/uNIInvestmentOverviewPage/uNIInvestmentOverviewPage.js`

What to look for in the browser console:
- `[uNI_InvestmentPortalPage] recordId ... source=state|attributes|path|api|initTabs-missing`
- `[uNIInvestmentOverviewPage] recordId ... params ... resolved ... source=connectedCallback|renderedCallback`

If you want, I can also wire the overview page to `getRecord` with `resolvedInvestmentId` to confirm data retrieval end‑to‑end.

---


**User**

the record ids are there 
[uNIInvestmentOverviewPage] recordId undefined params 0iTFT00000003yn2AA resolved 0iTFT00000003yn2AA source= connectedCallback

but hte details are not showing in the uNIInvestmentOverviewPage(picture attached. )

<image></image>

---


**User**

the record ids are there 
[uNIInvestmentOverviewPage] recordId undefined params 0iTFT00000003yn2AA resolved 0iTFT00000003yn2AA source= connectedCallback

but hte details are not showing in the uNIInvestmentOverviewPage(picture attached. )

---


**OpenAI Codex**

I added a real data fetch + template for `uNIInvestmentOverviewPage`, using the same IndividualApplication fields you already use in `uNIAnnualReportOverview`, and resolving the investment id via `uNI_LogframeController.resolveInvestmentId` to handle non‑IA context IDs. It now renders an “Investment summary” table and shows a helpful error if the record can’t be loaded.

Changes:
- `force-app/main/default/lwc/uNIInvestmentOverviewPage/uNIInvestmentOverviewPage.js`
- `force-app/main/default/lwc/uNIInvestmentOverviewPage/uNIInvestmentOverviewPage.html`

What to check next:
1) Reload the community page and confirm the table populates.  
2) If it’s still blank, check the browser console for:
   - `[uNIInvestmentOverviewPage] resolvedInvestmentId …`
   - Any `getRecord` errors (likely FLS or wrong object type).

If you want, I can also add a visible debug section to show the resolved id + object type on the page itself (useful for portal testing).

---


**User**

no you got it wrong i wanted this layout like the record detail page, undo whatever shit you just did. 

also from now onwards confirm with me before proceeding. 
<image></image>

---


**User**

no you got it wrong i wanted this layout like the record detail page, undo whatever shit you just did. 

also from now onwards confirm with me before proceeding.

---


**OpenAI Codex**

Reverted the `uNIInvestmentOverviewPage` back to the pre‑layout version (empty template + the logging you requested).  
Files now:

- `force-app/main/default/lwc/uNIInvestmentOverviewPage/uNIInvestmentOverviewPage.js`
- `force-app/main/default/lwc/uNIInvestmentOverviewPage/uNIInvestmentOverviewPage.html`

From here I won’t make further code changes until you tell me exactly what to build.

To match the record‑detail style you showed, please confirm:
- Object API name for the recordId `0iT…` (is it `IndividualApplication` or something else?)
- Exact field list to display (looks like: `uNI_LeadOrg__c`, `uNI_IARecordPortalLink__c`, `uNI_ImplementationStartDate__c`, `uNI_ImplementationEndDate__c`, `uNI_Project_Year__c`, `uNI_ApprovedCountries__c`, `uNI_Consortium_Partners__c`, `uNI_InvestmentDescription__c`, `Programmatic Priority(ies)`).
- Whether you want a 2‑column record‑detail layout using `lightning-record-view-form` + `lightning-output-field` (recommended).

Once you confirm those, I’ll implement exactly that layout.

---


**User**

1, Yes, 
2. leave the Programmatic Priority(ies), add the rest 
3. 2 column try to replicate as close as possible

---


**OpenAI Codex**

Implemented the 2‑column record‑detail style using `lightning-record-view-form` and `lightning-output-field`, excluding Programmatic Priority(ies) as requested.

Updated:
- `force-app/main/default/lwc/uNIInvestmentOverviewPage/uNIInvestmentOverviewPage.html`

If the fields don’t render, it usually means:
- The record isn’t an `IndividualApplication`, or
- Field‑level security / profile access in the community.

Before I change anything else, tell me if you want me to:
1) Add support for a different object API name, or
2) Keep it fixed to `IndividualApplication`.

---


**User**

can you please improve the UI a bit to replicate this 

currently its looking like this 
<image></image><image></image>

---


**User**

can you please improve the UI a bit to replicate this 

currently its looking like this

---


**OpenAI Codex**

Got it. Before I change anything (per your request), please confirm:

- OK to replace `lightning-record-view-form` + `lightning-output-field` with a custom two‑column SLDS layout (to match the screenshot spacing and labels)?
- Keep the same field list as we already set (Lead Org, Consortium Partners, Investment Description, IA Portal Link, Start, End, Project Year, Approved Countries)?

Once you confirm, I’ll implement the UI tweaks.

---


**User**

Yes for both

---


**OpenAI Codex**

Updated the layout to a custom two‑column SLDS grid with labels/values aligned like your screenshot, and added light borders/padding to match the record‑detail look.

Changes:
- `force-app/main/default/lwc/uNIInvestmentOverviewPage/uNIInvestmentOverviewPage.html`
- `force-app/main/default/lwc/uNIInvestmentOverviewPage/uNIInvestmentOverviewPage.css`

If you want the left/right label widths tweaked (e.g., tighter labels or more space for values), tell me the exact proportions and I’ll adjust.

---
