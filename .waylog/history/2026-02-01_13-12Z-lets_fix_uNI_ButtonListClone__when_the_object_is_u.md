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


**OpenAI Codex**

Re-applied the PM/PO change in your refreshed `uNI_ButtonListClone`:

- Added RR field import `uNI_IsUserPMOrPO__c`
- Included it in `RR_RECORD_FIELDS`
- Set `rrIsPMPO` from that field instead of `rrIsActionOwner`

File updated:
- `force-app/main/default/lwc/uNI_ButtonListClone/uNI_ButtonListClone.js`

If you want me to re-check any other recent edits (e.g., “Review Reprogramming Request”, “Submit PRC Feedback”, or the commented PRC review button), tell me and I’ll verify those too.

---


**User**

still not visible can you please add the logs for this condition?

---


**OpenAI Codex**

Added debug logs for the two visibility checks in `force-app/main/default/lwc/uNI_ButtonListClone/uNI_ButtonListClone.js`:

- **Review Reprogramming Request** now logs `rrIsPMPO`, `rrStatus`, and computed `visible`.
- **Submit PRC Feedback** now logs `rrStage`, `rrActionOwner`, `rrIsActionOwner`, and computed `visible`.

Load the record and check the browser console for:
- `@@ [uNI_ButtonListClone] RR Review Reprogramming Request visibility`
- `@@ [uNI_ButtonListClone] RR Submit PRC Feedback visibility`

If you want logs for a different button/condition, tell me which one and I’ll add it.

---


**User**

@@ [uNI_ButtonListClone] RR Review Reprogramming Request visibility Proxy(Object) {}[[Handler]]: en[[Target]]: Object[[IsRevoked]]: false

---


**OpenAI Codex**

That console output is just the LWC “reactive membrane” proxy — it means the object was logged, but you didn’t expand it. It doesn’t show the actual field values.

To see why the button isn’t visible, I need the real values:

Please expand the log in the browser console and share the values of:
- `rrIsPMPO`
- `rrStatus`
- `visible`

If it’s easier, I can tweak the log to print a plain JSON snapshot so the values are obvious, e.g.:

```js
console.warn('RR Review visibility (snapshot)', JSON.parse(JSON.stringify({
  rrIsPMPO,
  rrStatus,
  visible
})));
```

Tell me if you want me to add that, or just paste the expanded values.

---


**User**

sure please always add the logs in stringify versions

---


**OpenAI Codex**

Updated both logs to print stringify snapshots so you’ll see real values (not proxies).

Re-check the console; the logs now output plain objects with:
- `rrIsPMPO`, `rrStatus`, `visible`
- `rrStage`, `rrActionOwner`, `rrIsActionOwner`, `visible`

If you want this stringify style applied to any other logs in the file, tell me which ones.

---


**User**

still the same log

@@ [uNI_ButtonListClone] RR Review Reprogramming Request visibility Proxy(Object) {}[[Handler]]: en[[Target]]: Object[[Prototype]]: Objectconstructor: ƒ Object()hasOwnProperty: ƒ hasOwnProperty()isPrototypeOf: ƒ isPrototypeOf()propertyIsEnumerable: ƒ propertyIsEnumerable()toLocaleString: ƒ toLocaleString()toString: ƒ toString()valueOf: ƒ valueOf()length: 0name: "valueOf"arguments: (...)caller: (...)[[Prototype]]: ƒ ()[[Scopes]]: Scopes[0]__defineGetter__: ƒ (e,t)__defineSetter__: ƒ (e,t)__lookupGetter__: ƒ (e)__lookupSetter__: ƒ (e)__proto__: (...)get __proto__: ƒ __proto__()set __proto__: ƒ __proto__()[[IsRevoked]]: false

---


**OpenAI Codex**

Switched the logs to output a raw JSON string (not an object), so the console can’t wrap it as a proxy.

Now you should see lines like:
```
@@ [uNI_ButtonListClone] RR Review Reprogramming Request visibility {"rrIsPMPO":true,"rrStatus":"Requested","visible":true}
```

Please paste that exact log line so we can see the values.

---


**User**

in the uNI_ButtonListClone, while the proposal selection for (individualapplicaiton) is going on im getting repeated buttons like Score Proposal Assessment and Score Assessment , why is this happening.

---


**OpenAI Codex**

It’s happening because `ACTION_CONFIG.IndividualApplication` contains **two entries** with the same label/value for **“Score Proposal Assessment”**. Both pass the same visibility check, and there’s no de‑duplication, so both render.

You can see the duplicates here:
- `force-app/main/default/lwc/uNI_ButtonListClone/uNI_ButtonListClone.js:645`
- `force-app/main/default/lwc/uNI_ButtonListClone/uNI_ButtonListClone.js:875`

The visibility filter also treats `'Score Proposal Assessment'` and `'Score Assessment'` as valid labels, so if both exist, they’ll both show.

If you want, I can:
1) Remove the duplicate action entry, or  
2) Add a de‑dupe step in the filter so identical labels only render once.

---


**User**

can you please remove the duplicate entry, that is not used,

---


**OpenAI Codex**

Removed the duplicate “Score Proposal Assessment” block (and its surrounding duplicate generic actions) from `force-app/main/default/lwc/uNI_ButtonListClone/uNI_ButtonListClone.js`. The original entry remains earlier in the list, so it will still show once.

If you want me to also de‑dupe other repeated buttons in this file (e.g., Upload Stage 4 Package variants), tell me which ones to clean up.

---


**User**

remove Assign Reviewers , Add Reviewers, For the IndividualApplication.

---


**OpenAI Codex**

Removed the “Assign Reviewers” and “Add Reviewer” actions from the IndividualApplication menu and deleted their visibility checks.

File updated:
- `force-app/main/default/lwc/uNI_ButtonListClone/uNI_ButtonListClone.js`

If you want to hide any other IA-only buttons, send the labels and I’ll remove them too.

---


**User**

remove Assessment Response As well .

---


**OpenAI Codex**

Removed “Assessment Response” from the IndividualApplication menu and deleted its visibility check in `force-app/main/default/lwc/uNI_ButtonListClone/uNI_ButtonListClone.js`.

If you want any other IA buttons removed, list the labels.

---


**User**

Also the Provide Proposal Selection Feedback should call the uNIFeedbackForm lwc.

---


**OpenAI Codex**

Updated “Provide Proposal Feedback” to launch the `uNI_FeedbackForm` LWC by setting it to `type: 'LWC'` and `value: 'uNI_FeedbackForm'` in `force-app/main/default/lwc/uNI_ButtonListClone/uNI_ButtonListClone.js`.

If the label in the UI is actually “Provide Proposal Selection Feedback” and you want that text changed too, tell me and I’ll update the label.

---


**User**

Remove Proposal Assessment Report button

---


**OpenAI Codex**

Removed the “Proposal Assessment Report” action from the IndividualApplication menu and deleted its visibility check in `force-app/main/default/lwc/uNI_ButtonListClone/uNI_ButtonListClone.js`.

If you want any other IA buttons removed, list them and I’ll take care of it.

---


**User**

Also remove View L3 Scores.

---


**OpenAI Codex**

Removed “View L3 Scores” from the IndividualApplication menu and deleted its visibility check in `force-app/main/default/lwc/uNI_ButtonListClone/uNI_ButtonListClone.js`.

If you want any other IA buttons removed, just list the labels.

---


**User**

The Report Incident Should Appear when the RecordType.Name = 'Investments'

---


**OpenAI Codex**

Updated the IndividualApplication visibility logic so **“Report Incident”** only shows for Investment record types (i.e., RecordType.Name = “Investments” via the existing dev-name check).

Change is in:
- `force-app/main/default/lwc/uNI_ButtonListClone/uNI_ButtonListClone.js`

If you want it keyed to a different record type label or additional conditions, tell me.

---


**User**

lets do now for the ReprogrammingRequest objects. clear your understanding since i have recently refreshed the code.

---


**OpenAI Codex**

Happy to — but what exactly do you want changed for **uNI_ReprogrammingRequest__c**?

Please specify:
- the button label(s), and
- the new visibility condition(s)

(If it’s multiple buttons, list them and I’ll apply all at once.)

---


**User**

no i just want you to go through it so that you know what to change when i ask you to.

---


**OpenAI Codex**

I went through the refreshed `uNI_ReprogrammingRequest__c` section in `force-app/main/default/lwc/uNI_ButtonListClone/uNI_ButtonListClone.js`. Here’s the current layout so I’m aligned for future changes:

- **RR data + flags**: `RR_RECORD_FIELDS` includes `RR_uNI_IsUserPMOrPO__c` and `RR_isUserPT` (from `uNI_Investment__r.uNI_IsUserPT__c`). `rrIsPMPO` now comes from the RR field, and `rrIsPT` comes from `RR_isUserPT`.
- **Record type gate**: everything is hidden unless `RecordType.DeveloperName === 'uNI_MaterialEB'`.
- **Menu config**: all RR actions live under `ACTION_CONFIG.uNI_ReprogrammingRequest__c` → `Manage` menu. `Submit to PRC for review` is commented out in the menu config.
- **Visibility filter**: all RR button conditions are in `filterReprogrammingActions(...)`.  
  - `Review Reprogramming Request` = `rrIsPMPO && rrStatus === 'Requested'` (with stringify log).  
  - `Submit PRC Feedback` = `rrStage === 'Stage 3' && rrActionOwner === 'PRC' && rrIsActionOwner` (with stringify log).
- **Notable spots if you want changes later**:  
  - `Define Stage 1` currently checks `rrIsPMPO && rrStage === 'Stage 1' && !rrIsStage1Defined && rrProjParams`.  
  - `Project Parameters` currently returns `true` even though the comment says PM/PO only.

If you want me to adjust any of those now, just tell me which label and new condition.

---


**User**

is there a move to stage 3 button??

---


**OpenAI Codex**

For `uNI_ReprogrammingRequest__c`, there is **no “Move to Stage 3”** button. The RR menu has **“Start Stage 3”** instead (label appears in the RR menu config and in the visibility filter).

Locations:
- `force-app/main/default/lwc/uNI_ButtonListClone/uNI_ButtonListClone.js:960` (RR menu action label “Start Stage 3”)
- `force-app/main/default/lwc/uNI_ButtonListClone/uNI_ButtonListClone.js:1967` (visibility logic for “Start Stage 3”)

If you want a “Move to Stage 3” label or different behavior, tell me the condition and I’ll add it.

---
