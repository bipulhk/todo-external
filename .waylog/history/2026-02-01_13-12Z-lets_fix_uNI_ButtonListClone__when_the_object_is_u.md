# lets fix uNI_ButtonListClone, when the object is u
_Exported on 02/01/2026 at 18:42:16 GMT+5:30 from OpenAI Codex via WayLog_


**OpenAI Codex**

<permissions instructions>Filesystem sandboxing defines which files can be read or written. `sandbox_mode` is `danger-full-access`: No filesystem sandboxing - all commands are permitted. Network access is enabled. Approvals are your mechanism to get user consent to run shell commands without the sandbox. `approval_policy` is `never`: This is a non-interactive mode where you may NEVER ask the user for approval to run commands. Instead, you must always persist and work around constraints to solve the task for the user. You MUST do your utmost best to finish the task and validate your work before yielding. If this mode is paired with `danger-full-access`, take advantage of it to deliver the best outcome for the user. Further, in this mode, your default testing philosophy is overridden: Even if you don't see local patterns for testing, you may add tests and scripts to validate your work. Just remove them before yielding.</permissions instructions>

---


**User**

lets fix uNI_ButtonListClone, when the object is uNI_ReprogrammingRequest__c and for the 'Define Stage 1' the condition should be RR_uNI_IsProjectParameterCreatedForRep__c = false and RR_uNI_isStage1Defined__c = true and RR_uNI_Stage__c = Stage 1 and isPMPO = true

---


**OpenAI Codex**

Updated the “Define Stage 1” visibility rule in `force-app/main/default/lwc/uNI_ButtonListClone/uNI_ButtonListClone.js` to require PM/PO, Stage 1, Stage 1 defined, and project parameters not created.

Next steps if you want:
1) I can scan for any other “Define Stage 1” conditions in related components to keep them consistent.
2) I can run a quick search to see if any tests or docs mention the old logic.

---


**User**

what is the visibility condition for Submit PRC Feedback? Also for 'Submit for PRC For Review'

---


**OpenAI Codex**

You’ve got two separate sections in `force-app/main/default/lwc/uNI_ButtonListClone/uNI_ButtonListClone.js` — one for Individual Application (IA) actions and one for Reprogramming Request (RR) actions. Also, the label in code is **“Submit to PRC for review”** (not “Submit for PRC For Review”).

IA conditions:
- **Submit PRC Feedback** → `isIaGad && stage === 'Stage 3' && actionOwner === 'PRC' && IsActionOwner`  
  `force-app/main/default/lwc/uNI_ButtonListClone/uNI_ButtonListClone.js:2019`
- **Submit to PRC for review** → `isIaGad && stage === 'Stage 3' && actionOwner === 'GAM'`  
  `force-app/main/default/lwc/uNI_ButtonListClone/uNI_ButtonListClone.js:2023`

RR conditions:
- **Submit PRC Feedback** → `rrIsPMPO`  
  `force-app/main/default/lwc/uNI_ButtonListClone/uNI_ButtonListClone.js:2177`
- **Submit to PRC for review** → `rrIsPMPO`  
  `force-app/main/default/lwc/uNI_ButtonListClone/uNI_ButtonListClone.js:2181`

If you want, tell me which object you care about and I can adjust the condition.

---


**User**

always refer the uNI_ReprogrammingRequest__c object unless i say other wise

---


**OpenAI Codex**

Got it — I’ll default to the `uNI_ReprogrammingRequest__c` object unless you say otherwise.

---


**User**

Sumit PRC Feedback  visible when and  rrStage = 'Stage 3' and rrActionOwner = PRC and rrIsActionOwner = True

comment out Submit to PRC for review button its not needed at the moment 

 The 'Review Reprograming Request' visible when status = Requested and rrIsPMPO  = True

---


**OpenAI Codex**

Updated the `uNI_ReprogrammingRequest__c` rules in `force-app/main/default/lwc/uNI_ButtonListClone/uNI_ButtonListClone.js`:

- **Submit PRC Feedback** now shows only when `rrStage === 'Stage 3'`, `rrActionOwner === 'PRC'`, and `rrIsActionOwner` is true.
- **Review Reprogramming Request** now shows only when `rrStatus === 'Requested'` and `rrIsPMPO` is true.
- **Submit to PRC for review** action is commented out in the RR menu config.

If you want, I can also remove the unused visibility branch for “Submit to PRC for review” in the RR filter to keep it tidy.

---


**User**

for the uNI_ButtonListClone, what is the the visibility condition if the objec is uNI_ReprogrammingRequest__c for the button 'Review Reprogramming Request'

i have recently updated the buttonlistclone lwc so please check again

---


**OpenAI Codex**

For `uNI_ReprogrammingRequest__c`, the current visibility condition for **“Review Reprogramming Request”** is:

- `rrIsPMPO && rrStatus === 'Requested'`

This is in `force-app/main/default/lwc/uNI_ButtonListClone/uNI_ButtonListClone.js:2161`.

---


**User**

i have created the  uNI_IsUserPMOrPO__c for the reprogramming request please use that field to check that

---


**OpenAI Codex**

Updated `uNI_ButtonListClone` to use the new `uNI_IsUserPMOrPO__c` field on `uNI_ReprogrammingRequest__c` for PM/PO checks.

Changes:
- Added RR field import and included it in `RR_RECORD_FIELDS`.
- Set `rrIsPMPO` from `RR_uNI_IsUserPMOrPO__c` instead of `rrIsActionOwner`.

File touched:
- `force-app/main/default/lwc/uNI_ButtonListClone/uNI_ButtonListClone.js`

If you want this field used anywhere else (other components or Apex), point me to them.

---


**User**

i have recently refreshed the uNI_ButtonListClone LWC, can you please check again and do it in that pls

---
