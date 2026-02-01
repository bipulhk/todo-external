# for the uNI_LogframeVersions, the external communi
_Exported on 02/01/2026 at 11:03:43 GMT+5:30 from OpenAI Codex via WayLog_


**OpenAI Codex**

<permissions instructions>Filesystem sandboxing defines which files can be read or written. `sandbox_mode` is `danger-full-access`: No filesystem sandboxing - all commands are permitted. Network access is enabled. Approvals are your mechanism to get user consent to run shell commands without the sandbox. `approval_policy` is `never`: This is a non-interactive mode where you may NEVER ask the user for approval to run commands. Instead, you must always persist and work around constraints to solve the task for the user. You MUST do your utmost best to finish the task and validate your work before yielding. If this mode is paired with `danger-full-access`, take advantage of it to deliver the best outcome for the user. Further, in this mode, your default testing philosophy is overridden: Even if you don't see local patterns for testing, you may add tests and scripts to validate your work. Just remove them before yielding.</permissions instructions>

---


**User**

for the uNI_LogframeVersions, the external community user is not abe to see the communiyt portal , can you please check why , check and before fixig anything tell me exactly the issue, also please add debug logs

---


**OpenAI Codex**

Found a concrete code issue that can break the LWC for external/community users.

Issue (before any fix)
- In `force-app/main/default/classes/uNI_LogframeController.cls`, method `getRelatedRecordsByVersion` builds `realLogframeversion` using a SOQL bind of `Id = :logframes`. `logframes` is a `List<uNI_Logframe__c>`, not a single Id, so this is an invalid bind and throws a runtime `QueryException` when that line executes. That would cause the LWC wire to fail and can blank the community page.

Debug logs added (no functional changes)
- Added targeted `System.debug` statements in `force-app/main/default/classes/uNI_LogframeController.cls` to trace:
  - incoming params, resolved IA id, version chosen
  - IA/logframe query results
  - derived logframe version, counts of outcomes/outputs/indicators
  - context resolver methods and version list generation

If you want me to fix the root issue, say the word and I’ll apply the smallest safe change.  
Suggested next steps:
1) Deploy this change and reproduce with the external user; capture the debug log.
2) If logs confirm the `realLogframeversion` query failure, I’ll patch it.

I didn’t run tests.

---


**User**

i got only 1 log recieved recordId is a14FT00000jbu6KYAQ

---


**OpenAI Codex**

Got it. That single log line with `recordId = a14FT00000jbu6KYAQ` is what I’d expect from the new debug in `getRelatedRecordsByVersion` (or the resolver). I can’t tell more without the rest of the debug output.

Please paste the full debug snippet around that line (a few lines before/after), especially:
- `getRelatedRecordsByVersion` start
- `resolved iaId`
- `versionToFetch`
- `logframes.size`
- any exception lines

Once I see those, I’ll confirm the exact failing line and fix it.

---


**User**

i think this is the issue, the record id present here is of a reprogrammingrequest object, (the id where i have placed the component right now) make some changes to the LWC so that it uses the uNI_ReprogrammingObjectCheck apex to check the object api, and if the object api is something other than the IndividualApplication , query the related Individualapplication/investment (uNI_Investment__c) in this case. the record id passed here should be uNI_ReprogrammingRequest__c.uNI_Investment__c (also take care that this should happen only if the component is not placed in the IndividualApplication pages.

---


**User**

<turn_aborted>
  <turn_id>5</turn_id>
  <reason>interrupted</reason>
  <guidance>The user interrupted the previous turn. Do not continue or repeat work from that turn unless the user explicitly asks. If any tools/commands were aborted, they may have partially executed; verify current state before retrying.</guidance>
</turn_aborted>

---


**User**

i think this is the issue, the record id present here is of a reprogrammingrequest object, (the id where i have placed the component right now) make some changes to the LWC so that it uses the uNI_ReprogrammingObjectCheck apex to check the object api, and if the object api is something other than the IndividualApplication , query the related Individualapplication/investment (uNI_Investment__c) in this case. the record id passed here should be uNI_ReprogrammingRequest__c.uNI_Investment__c (also take care that this should happen only if the component is not placed in the IndividualApplication pages.

before making any changes confirm your approach with me

---


**OpenAI Codex**

Proposed approach (no changes yet):

- Update `force-app/main/default/lwc/uNI_LogframeVersions/uNI_LogframeVersions.js` to:
  - Use `uNI_ReprogrammingObjectCheck.getObjectApiName(recordId)` to detect context object.
  - If object is `IndividualApplication`, keep using `recordId` as the IA id (no change).
  - If object is anything else (e.g., `uNI_ReprogrammingRequest__c`), query `uNI_Investment__c` (the related IA) and use that as the effective `applicationId` for all logframe queries.
- This would replace or supersede the current `resolveInvestmentId` wiring to ensure the IA id is always correct when the component is placed on non‑IA pages.

Does this match what you want? If yes, I’ll proceed with the LWC changes.

---
