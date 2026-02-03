import { LightningElement, api, track, wire } from 'lwc';
import { CurrentPageReference } from 'lightning/navigation';
import { refreshApex } from '@salesforce/apex';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';

import RR_LOGFRAME_VERSION from '@salesforce/schema/uNI_ReprogrammingRequest__c.uNI_LogframeVersion__c';
import RR_INVESTMENT_FIELD from '@salesforce/schema/uNI_ReprogrammingRequest__c.uNI_Investment__c';

import getRelatedRecordsByVersion
    from '@salesforce/apex/uNI_LogframeController.getRelatedRecordsByVersion';
import getAvailableLogframeVersions
    from '@salesforce/apex/uNI_LogframeController.getAvailableLogframeVersions';
import resolveInvestmentId
    from '@salesforce/apex/uNI_LogframeController.resolveInvestmentId';

import createUpdateRecord
    from '@salesforce/apex/uNI_LogframeController.createUpdateRecord';
import deleteRecord
    from '@salesforce/apex/uNI_LogframeController.deleteRecord';
import createIndicatorRecord
    from '@salesforce/apex/uNI_LogframeController.createIndicatorRecord';
import createMilestoneRecord
    from '@salesforce/apex/uNI_LogframeController.createMilestoneRecord';
import deleteMilestonesAndIndicators
    from '@salesforce/apex/uNI_LogframeController.deleteMilestonesAndIndicators';
import saveRecords
    from '@salesforce/apex/uNI_LogframeController.saveRecords';
import getIndicatorIndexFromParentId
    from '@salesforce/apex/uNI_LogframeController.getIndicatorIndexFromParentId';
import setLogframeAsReadOnly
    from '@salesforce/apex/uNI_LogframeController.setLogframeAsReadOnly';
import getObjectApiName
    from '@salesforce/apex/uNI_ReprogrammingObjectCheck.getObjectApiName';

// NEW: context-based years override (Reprogramming Request)
import getProjectYearsForContext
    from '@salesforce/apex/uNI_LogframeController.getProjectYearsForContext';

export default class LogframeManagement extends LightningElement {
    @api recordId;
    @api investmentId;

    @api version;                 // initial/default version (string)
    @track selectedVersion = '';  // '' means "Latest"
    // params from dynamic loader (optional)
    _params;
    @api
    get params() {
        return this._params;
    }
    set params(value) {
        this._params = value || {};
        // Descriptive context wiring for dynamic loader usage:
        // - recordId/contextRecordId: the page context record (RR or IA)
        // - investmentId: resolved IA id (if parent already knows it)
        // - version/rrLogframeVersion: optional version hints
        if (this._params.recordId && !this.recordId) {
            this.recordId = this._params.recordId;
        }
        if (this._params.contextRecordId && !this.recordId) {
            this.recordId = this._params.contextRecordId;
        }
        if (this._params.investmentId && !this.investmentId) {
            this.investmentId = this._params.investmentId;
        }
        if (this._params.version && !this.selectedVersion) {
            this.selectedVersion = String(this._params.version);
            this.explicitVersionProvided = true;
        }
        if (this._params.contextObjectApiName && !this.contextObjectApiName) {
            this.contextObjectApiName = this._params.contextObjectApiName;
        }
        if (this._params.rrLogframeVersion !== undefined && this._params.rrLogframeVersion !== null) {
            this.rrDefaultVersion = String(this._params.rrLogframeVersion).trim();
            this.rrDefaultLoaded = true;
        }

        // Recompute effective IDs/defaults after params are injected.
        this._recomputeEffectiveId();
        this._attemptSetDefaultVersion();
    }

    // server data
    @track outcomes = [];
    @track outputs = [];
    @track indicators = [];
    @track fieldsMap = [];

    // ui / state
    @track draftValues = [];
    @track draftValuesOutputInd = [];
    @track draftValuesOutputMile = [];
    @track isModalOpen = false;
    @track isModalSubindicatorOpen = false;
    @track isModalOutputOpen = false;
    @track outcomeTitleChange = '';
    @track outputTitleChange = '';
    @track disaggregationChange = '';
    @track isEditableLogframe; // server opinion
    @track versionOptions = [];

    // columns
    indicatorColumnsStart;
    indicatorColumnsEnd;
    dynamicColumns;
    indicatorColumns;
    milestoneColumns;

    // internal state
    effectiveInvestmentId;
    resolvedInvestmentId; // IA id resolved directly from recordId (RR or IA)
    urlInvestmentId;
    rrInvestmentId;
    _selectedIndicatorRow;
    recordIdToBeRenamed;
    recordIndicatorIdToUpdate;

    wiredOutputs;
    liveVersion;   // IA.uNI_LogframeVersion__c
    latestVersion; // first (newest) returned by getAvailableLogframeVersions

    // context-based default version selection
    contextObjectApiName;
    rrDefaultVersion;
    iaDefaultLoaded = false;
    rrDefaultLoaded = false;
    explicitVersionProvided = false;

    // years handling
    projectYears = 0;   // effective years actually used to render columns
    lastProjectYears = 0; // 🔹 new – to avoid rebuilding columns multiple times

    lfYears = 0;        // years coming from the Logframe DTO
    contextYears = null;// years coming from context record (RR override)

    get displayVersion() {
        return (this.selectedVersion && this.selectedVersion.trim())
            ? this.selectedVersion
            : 'Latest (most recent)';
    }

    // concrete version to use for creates
    get currentVersion() {
        return (this.selectedVersion && this.selectedVersion.trim())
            ? this.selectedVersion
            : (this.latestVersion || this.liveVersion || '1');
    }

    // unified editability: editable if server says so, OR we’re viewing a non-live version
    get canEdit() {
        const baseEditable = !!this.isEditableLogframe;

        // Match MilestoneTab behavior: in RR context, allow editing only when
        // the selected version is different from the IA live version.
        if (this.contextObjectApiName === 'uNI_ReprogrammingRequest__c') {
            const ia = this._normalizeVersion(this.liveVersion);
            const selected = this._normalizeVersion(this.selectedVersion || this.version);
            if (ia && selected) {
                return ia !== selected;
            }
            const rr = this._normalizeVersion(this.rrDefaultVersion);
            if (ia && rr) {
                return ia !== rr;
            }
            // If we can't compare yet, fall back to server signal.
            return baseEditable;
        }

        // Default (IA context): respect server editability rules.
        return baseEditable;
    }

    get isButtonDisabled() {
        return !this.canEdit;
    }

    // ===== URL / context resolution =====
    @wire(CurrentPageReference)
    getStateParameters(pageRef) {
        if (pageRef) {
            const state = pageRef.state || {};
            const attrs = pageRef.attributes || {};
            console.log('[Logframe] pageRef.state', JSON.stringify(state));
            console.log('[Logframe] pageRef.attributes', JSON.stringify(attrs));
            // Experience Cloud may supply recordId in attributes or state; prefer explicit c__recordId when provided.
            this.urlInvestmentId =
                state.c__recordId ||
                state.recordId ||
                attrs.recordId ||
                null;
            if (!this.recordId && this.urlInvestmentId) {
                // In Experience Cloud, recordId may not be provided; require c__recordId in the URL.
                this.recordId = this.urlInvestmentId;
                console.log('[Logframe] recordId set from c__recordId', this.recordId);
            }

            const urlVersion = state.version || state.c__version || null;
            if (urlVersion && urlVersion !== this.selectedVersion) {
                this.selectedVersion = String(urlVersion);
                this.explicitVersionProvided = true;
            }
            this._recomputeEffectiveId();
        }
    }

    _recomputeEffectiveId() {
        const contextInvestmentId =
            (this.contextObjectApiName === 'IndividualApplication')
                ? this.recordId
                : (this.contextObjectApiName === 'uNI_ReprogrammingRequest__c'
                    ? this.rrInvestmentId
                    : null);

        const candidate =
            this.investmentId ||
            this.resolvedInvestmentId ||
            this.urlInvestmentId ||
            contextInvestmentId;

        if (this.effectiveInvestmentId !== candidate) {
            this.effectiveInvestmentId = candidate;
            console.log(
                '[Logframe] effectiveInvestmentId set to',
                this.effectiveInvestmentId,
                'contextObjectApiName=',
                this.contextObjectApiName,
                'recordId=',
                this.recordId,
                'urlInvestmentId=',
                this.urlInvestmentId,
                'rrInvestmentId=',
                this.rrInvestmentId
            );
        }

        if (!this.selectedVersion && this.version) {
            this.selectedVersion = String(this.version);
            this.explicitVersionProvided = true;
        }
    }

    // Resolve IA id directly from recordId to avoid dependency on object-name context.
    // This mirrors BudgetTab's approach and keeps behavior unchanged when recordId is already IA.
    @wire(resolveInvestmentId, { contextId: '$recordId' })
    wiredResolvedInvestment({ data, error }) {
        if (data !== undefined) {
            this.resolvedInvestmentId = data;
            this._recomputeEffectiveId();
        } else if (error) {
            console.error('Error resolving IA from recordId', error);
        }
    }

    // === Wire IA to read live version ===
    // ---- Determine context object type ----
    @wire(getObjectApiName, { recordId: '$recordId' })
    wiredObjectType({ data, error }) {
        if (data) {
            this.contextObjectApiName = data;
            console.log('[Logframe] contextObjectApiName', this.contextObjectApiName, 'recordId', this.recordId);
            this._attemptSetDefaultVersion();
        } else if (error) {
            console.error('Error resolving context object type', error);
        }
    }

    get rrRecordId() {
        return this.contextObjectApiName === 'uNI_ReprogrammingRequest__c'
            ? this.recordId
            : null;
    }

    // ---- Get default version from Reprogramming Request ----
    @wire(getRecord, { recordId: '$rrRecordId', fields: [RR_LOGFRAME_VERSION] })
    wiredRR({ data, error }) {
        if (data) {
            this.rrDefaultVersion = getFieldValue(data, RR_LOGFRAME_VERSION);
            this.rrDefaultLoaded = true;
            console.log('[Logframe] rrDefaultVersion', this.rrDefaultVersion, 'rrRecordId', this.rrRecordId);
            this._attemptSetDefaultVersion();
        } else if (error) {
            console.error('getRecord (RR version) error', error);
        }
    }

    // ---- Resolve IA (Investment) from Reprogramming Request ----
    @wire(getRecord, { recordId: '$rrRecordId', fields: [RR_INVESTMENT_FIELD] })
    wiredRRInvestment({ data, error }) {
        if (data) {
            this.rrInvestmentId = getFieldValue(data, RR_INVESTMENT_FIELD);
            console.log('[Logframe] rrInvestmentId', this.rrInvestmentId, 'rrRecordId', this.rrRecordId);
            this._recomputeEffectiveId();
        } else if (error) {
            console.error('getRecord (RR investment) error', error);
        }
    }

    // === NEW: wire context-based years (Reprogramming Request override)
    @wire(getProjectYearsForContext, { contextId: '$recordId' })
    wiredContextYears({ data, error }) {
        if (data != null) {
            this.contextYears = data;
            this.applyProjectYears();
        } else if (error) {
            // It's fine if this errors when context is not a RR; just log for debugging.
            console.log('getProjectYearsForContext error or not RR:', error);
        }
    }

    // ===== Versions list for combobox =====
    @wire(getAvailableLogframeVersions, { applicationId: '$effectiveInvestmentId' })
    wiredVersions({ data, error }) {
        if (data) {
            const opts = [{ label: 'Latest (most recent)', value: '' }];
            data.forEach(v => { if (v) opts.push({ label: v, value: v }); });
            this.versionOptions = opts;
            this.latestVersion = (data.length > 0 ? data[0] : undefined);

            if (this.selectedVersion === undefined) this.selectedVersion = '';
            if (this.selectedVersion && !this.versionOptions.some(o => o.value === this.selectedVersion)) {
                this.selectedVersion = this.latestVersion || '';
            }
        } else if (error) {
            console.error('getAvailableLogframeVersions error', error);
            this.versionOptions = [{ label: 'Latest (most recent)', value: '' }];
            this.latestVersion = undefined;
            if (this.selectedVersion === undefined) this.selectedVersion = '';
        }
    }


    // ===== Main wire (uses resolved parent + version) =====
    @wire(getRelatedRecordsByVersion, {
        applicationId: '$effectiveInvestmentId',
        version: '$selectedVersion'
    })
    wiredResult(result) {
        this.wiredOutputs = result;
        const { data, error } = result;

        if (data) {
            this.outcomes = data.outcomes;
            this.outputs = data.outputs;
            this.indicators = data.indicators;
            this.fieldsMap = data.fieldsMap;
            this.isEditableLogframe = data.isEditableLogframe;
            // Live version is returned by Apex to avoid UI API errors for external users.
            this.liveVersion = data.liveVersion;
            this.iaDefaultLoaded = true;
            this._attemptSetDefaultVersion();

            const lfYears = data.projectyears || 0;
            const ctxYears = this.contextYears || 0; // we set this in the IA/reprogramming wire
            this.recomputeProjectYears(lfYears, ctxYears);

            // this.appendColumns(data.projectyears);
            this.setMilestoneColumns();
        }

        if (error) {
            console.error('getRelatedRecordsByVersion error', error);
        }
    }


    // 🔹 Compute effective project years, only rebuild columns when it *changes*
    recomputeProjectYears(lfYears, contextYears) {
        const lfY = Number(lfYears) || 0;
        const ctxY = Number(contextYears) || 0;

        const effective = Math.max(lfY, ctxY);
        this.projectYears = effective;

        console.log(
            '[Logframe] recomputeProjectYears → lfYears =',
            lfY,
            'contextYears =',
            ctxY,
            'projectYears (effective) =',
            this.projectYears
        );

        // ALWAYS rebuild – editability & years may have changed
        this.appendColumns(this.projectYears);
        this.setMilestoneColumns();
    }



    // ===== Effective years resolver & column rebuild =====
    applyProjectYears() {
        // Prefer RR override when present; else fall back to LF years
        const next = (this.contextYears != null) ? this.contextYears : (this.lfYears || 0);

        if (next !== this.projectYears) {
            this.projectYears = next;
        }

        console.log(
            '[Logframe] lfYears =',
            this.lfYears,
            'contextYears =',
            this.contextYears,
            'projectYears (effective) =',
            this.projectYears
        );

        // Always rebuild because canEdit & year count can change
        this.appendColumns(this.projectYears);
        this.setMilestoneColumns();
    }

    // ===== Public API to change version at runtime =====
    @api
    setLogframeVersion(v) {
        const newV = (v || '').toString();
        if (newV !== this.selectedVersion) {
            this.selectedVersion = newV; // re-runs the @wire automatically
        }
    }

    // ===== Combobox handler =====
    handleVersionChange(event) {
        this.selectedVersion = event.detail.value || ''; // '' = Latest
        this.explicitVersionProvided = true;
    }

    _attemptSetDefaultVersion() {
        if (!this.contextObjectApiName || this.explicitVersionProvided) {
            return;
        }

        if (this.contextObjectApiName === 'uNI_ReprogrammingRequest__c') {
            if (!this.rrDefaultLoaded) {
                return;
            }
            if (this.rrDefaultVersion) {
                this.selectedVersion = this.rrDefaultVersion;
            } else if (this.latestVersion) {
                this.selectedVersion = this.latestVersion;
            }
            return;
        }

        if (this.contextObjectApiName === 'IndividualApplication') {
            if (!this.iaDefaultLoaded) {
                return;
            }
            if (this.liveVersion) {
                this.selectedVersion = this.liveVersion;
            } else if (this.latestVersion) {
                this.selectedVersion = this.latestVersion;
            }
            return;
        }
    }

    _normalizeVersion(val) {
        if (val === null || val === undefined) return '';
        return String(val).trim();
    }

    appendColumns(columnCount) {
        const editable = this.canEdit; // 🔑 true = not read-only

        // --- fixed columns before the year targets ---
        this.indicatorColumnsStart = [
            { label: 'Indicator Number & Heading', fieldName: 'uNI_Indicator_Heading__c', editable, initialWidth: 250 },
            { label: 'SMART Indicators', fieldName: 'uNI_Smart_Indicator__c', editable, initialWidth: 250 },
            { label: 'Means of verification / Data sources', fieldName: 'uNI_MeansofVerificationDataSources__c', editable, initialWidth: 250 },
            { label: 'Assumptions, rationale for indicator use', fieldName: 'uNI_AssumptionsRationale__c', editable, initialWidth: 250 },
            { label: 'Reporting Frequency', fieldName: 'uNI_ReportingFrequency__c', editable, initialWidth: 250 },
            { label: 'Indicator Numerator', fieldName: 'uNI_IndicatorNumerator__c', editable, initialWidth: 250 },
            { label: 'Indicator Denominator', fieldName: 'uNI_IndicatorDenominator__c', editable, initialWidth: 250 },
            { label: 'Disaggregation (if applicable)', fieldName: 'uNI_Disaggregation__c', editable, initialWidth: 250 },
            { label: 'Baseline', fieldName: 'uNI_Baseline__c', editable, initialWidth: 250 }
        ];

        // --- dynamic Year 1..N targets ---
        this.dynamicColumns = Array.from({ length: columnCount || 0 }, (_, index) => ({
            label: `Year ${index + 1} Target`,
            fieldName: `uNI_Year${index + 1}Target__c`,
            editable,
            initialWidth: 150
        }));

        // --- fixed columns after the year targets (NO actions here) ---
        this.indicatorColumnsEnd = [
            { label: 'End Of Project Target', fieldName: 'uNI_End_Of_Project_Target__c', editable, initialWidth: 150 },
            { label: 'Post Grant', fieldName: 'uNI_Post_Grant__c', editable, initialWidth: 150 },
            { label: 'Comment', fieldName: 'uNI_Comments__c', editable, initialWidth: 350 }
        ];

        // --- action column (delete / add sub-indicator), ONLY when editable ---
        const actionColumn = {
            type: 'action',
            typeAttributes: {
                rowActions: [
                    { label: 'Add Sub Indicator', name: 'add subindicator', iconName: 'utility:add' },
                    { label: 'Delete', name: 'delete indicator', iconName: 'utility:delete' }
                ],
                menuAlignment: 'right'
            },
            cellAttributes: { alignment: 'right' },
            initialWidth: 80
        };

        this.indicatorColumns = [
            ...this.indicatorColumnsStart,
            ...this.dynamicColumns,
            ...this.indicatorColumnsEnd,
            ...(editable ? [actionColumn] : [])   // 👈 only push actions if not read-only
        ];
    }




    setMilestoneColumns() {
        const editable = this.canEdit; // use unified edit flag

        const cols = [
            {
                label: 'Milestone Number & Heading',
                fieldName: 'uNI_Milestone_Heading__c',
                editable,
                wrapText: true
            },
            {
                label: 'Date',
                fieldName: 'uNI_Milestone_Date__c',
                type: 'date-local',
                editable,
                typeAttributes: { day: '2-digit', month: '2-digit', year: 'numeric' }
            },
            {
                label: 'Description',
                fieldName: 'uNI_Comments__c',
                editable,
                wrapText: true
            }
        ];

        // Only show Delete button when editable
        if (editable) {
            cols.push({
                type: 'button',
                typeAttributes: {
                    name: 'delete milestone',
                    variant: 'brand-outline',
                    iconName: 'utility:delete',
                    class: 'custom-button'
                },
                cellAttributes: { alignment: 'right' },
                initialWidth: 80
            });
        }

        this.milestoneColumns = cols;
    }



    // ===== Helpers =====
    getRecordIndex(recordId, type) {
        if (type === 'Output') return this.outputs.findIndex(r => r.Id === recordId);
        if (type === 'Outcome') return this.outcomes.findIndex(r => r.Id === recordId);
        return -1;
    }

    findMilestonesOutputIndexById(outputId) {
        const specificOutput = this.outputs.find(o => o.Id === outputId);
        return specificOutput ? (specificOutput.Milestones__r ? specificOutput.Milestones__r.length : 0) : 0;
    }

    async getIndicatorIndex(applicationId, parentIndicatorId, type) {
        try {
            return await getIndicatorIndexFromParentId({ applicationId, parentIndicatorId, type });
        } catch (e) {
            console.error('Error fetching indicator index:', e);
            return -1;
        }
    }

    get formattedStartDate() {
        if (!this.fieldsMap.ProjectDurationStart) return '';
        const d = new Date(this.fieldsMap.ProjectDurationStart);
        if (isNaN(d)) return 'Invalid Date';
        const m = d.toLocaleString('en-GB', { month: 'long' });
        const yy = d.getFullYear().toString().slice(-2);
        return `${m} -${yy}`;
    }
    get formattedEndDate() {
        if (!this.fieldsMap.ProjectDurationEnd) return '';
        const d = new Date(this.fieldsMap.ProjectDurationEnd);
        if (isNaN(d)) return 'Invalid Date';
        const m = d.toLocaleString('en-GB', { month: 'long' });
        const yy = d.getFullYear().toString().slice(-2);
        return `${m} -${yy}`;
    }

    // ===== Actions: add / rename / delete =====
    handleMakeReadOnly() {
        setLogframeAsReadOnly({ recordId: this.recordId, version: this.currentVersion })
            .then(() => refreshApex(this.wiredOutputs))
            .then(() => this.showReadOnlyToast())
            .catch(e => console.error('Error making read only logframe :', e));
    }

    handleOpenModal(e) {
        this.recordIdToBeRenamed = e.target.dataset.id;
        this.isModalOpen = true;
    }
    handleOpenModalOutput(e) {
        this.recordIdToBeRenamed = e.target.dataset.id;
        this.isModalOutputOpen = true;
    }
    handleCloseModal() {
        this.isModalOpen = false;
        this.isModalOutputOpen = false;
        this.isModalSubindicatorOpen = false;
        this._selectedIndicatorRow = null;
        this.disaggregationChange = '';
    }
    handleOpenSubindicatorModal(e) {
        const row = e.detail.row;
        this.recordIndicatorIdToUpdate = row.Id;
        this._selectedIndicatorRow = row;
        this.isModalSubindicatorOpen = true;
    }

    handleOutcomeTitleChange(e) { this.outcomeTitleChange = e.target.value; }
    handleOutputTitleChange(e) { this.outputTitleChange = e.target.value; }
    handleDisaggregationChange(e) { this.disaggregationChange = e.target.value; }

    handleAddOutput() {
        const title = `Output ${this.outputs.length + 1}`;
        const type = 'Output';
        const recordId = this.effectiveInvestmentId;
        const operation = 'Create';
        const version = this.currentVersion;
        createUpdateRecord({ recordId, type, title, operation, version })
            .then(() => refreshApex(this.wiredOutputs))
            .then(() => this.showSuccessInsertToast())
            .catch(e => console.error('Error creating output:', e));
    }

    handleAddOutcome() {
        const title = `Outcome ${this.outcomes.length + 1}`;
        const type = 'Outcome';
        const recordId = this.effectiveInvestmentId;
        const operation = 'Create';
        const version = this.currentVersion;
        createUpdateRecord({ recordId, type, title, operation, version })
            .then(() => refreshApex(this.wiredOutputs))
            .then(() => this.showSuccessInsertToast())
            .catch(e => console.error('Error creating outcome:', e));
    }

    handleAddGoal() {
        const title = 'Goal (Impact): ';
        const type = 'Outcome';
        const recordId = this.effectiveInvestmentId;
        const operation = 'Create';
        const version = this.currentVersion;
        createUpdateRecord({ recordId, type, title, operation, version })
            .then(() => refreshApex(this.wiredOutputs))
            .then(() => this.showSuccessInsertToast())
            .catch(e => console.error('Error creating outcome:', e));
    }

async handleAddOutcomeIndicator(e) {
    const parentId = e.target.dataset.id;
    const type = 'Outcome';

    // Outcome index (Outcome 1, Outcome 2, etc.)
    const index = this.getRecordIndex(parentId, type);
    const parentNumber = index + 1;           // 1, 2, 3...

    
    const seq = this.getNextIndicatorSeq(parentId, type);  // uses headings

    const heading = `Indicator P ${parentNumber}.${seq}`;
    const version = this.currentVersion;

    createIndicatorRecord({ parentId, heading, type, subIndicator: false, version })
        .then(() => refreshApex(this.wiredOutputs))
        .then(() => this.showSuccessInsertToast())
        .catch(err => console.error('Error creating indicator:', err));
}

async handleAddOutputIndicator(e) {
    const parentId = e.target.dataset.id;
    const type = 'Output';

    const index = this.getRecordIndex(parentId, type);
    const parentNumber = index + 1;

    const seq = this.getNextIndicatorSeq(parentId, type);

    const heading = `Indicator O ${parentNumber}.${seq}`;
    const version = this.currentVersion;

    createIndicatorRecord({ parentId, heading, type, subIndicator: false, version })
        .then(() => refreshApex(this.wiredOutputs))
        .then(() => this.showSuccessInsertToast())
        .catch(err => console.error('Error creating indicator:', err));
}


    handleAddOutputMilestone(e) {
        const parentId = e.target.dataset.id;
        const type = 'Output';
        const index = this.getRecordIndex(parentId, type);
        const milestoneIndex = this.findMilestonesOutputIndexById(parentId) + 1;
        const heading = `Milestone O ${index + 1}.${milestoneIndex}`;
        const version = this.currentVersion;
        createMilestoneRecord({ parentId, heading, type, version })
            .then(() => refreshApex(this.wiredOutputs))
            .then(() => this.showSuccessInsertToast())
            .catch(err => console.error('Error creating milestone:', err));
    }

    handleSaveOutcome() {
        const type = 'Outcome';
        const index = this.getRecordIndex(this.recordIdToBeRenamed, type) + 1;
        const title = 'Outcome ' + index + ': ' + this.outcomeTitleChange;
        const recordIdToUpdate = this.recordIdToBeRenamed;
        const operation = 'Update';
        createUpdateRecord({ recordIdToUpdate, type, title, operation, version: this.currentVersion })
            .then(() => refreshApex(this.wiredOutputs))
            .then(() => this.showSuccessUpdateToast())
            .catch(e => console.error('Error updating outcome title:', e));
        this.outcomeTitleChange = '';
        this.handleCloseModal();
    }

    handleSaveOutput() {
        const type = 'Output';
        const index = this.getRecordIndex(this.recordIdToBeRenamed, type) + 1;
        const title = 'Output ' + index + ': ' + this.outputTitleChange;
        const recordIdToUpdate = this.recordIdToBeRenamed;
        const operation = 'Update';
        createUpdateRecord({ recordIdToUpdate, type, title, operation: 'Update', version: this.currentVersion })
            .then(() => refreshApex(this.wiredOutputs))
            .then(() => this.showSuccessUpdateToast())
            .catch(e => console.error('Error updating output title:', e));
        this.outputTitleChange = '';
        this.handleCloseModal();
    }

    // ===== Save handlers =====
    handleSave(event) {
        const parentId = event.target.dataset.id;
        const type = 'Outcome';
        const dataTable = this.template.querySelector(`lightning-datatable[data-table-id="${parentId}"]`);
        if (!dataTable) {
            this.dispatchEvent(new ShowToastEvent({
                title: 'Error',
                message: 'Could not find the Outcome indicators table.',
                variant: 'error'
            }));
            return;
        }
        const draftValues = JSON.stringify(event.detail.draftValues || []);
        const allRecords = JSON.stringify(dataTable.data || []);
        saveRecords({ dataTableRecords: allRecords, updatedValues: draftValues, parentId, type })
            .then(() => refreshApex(this.wiredOutputs))
            .then(() => this.showSuccessUpdateToast())
            .catch(error => {
                this.dispatchEvent(new ShowToastEvent({
                    title: 'Error updating records',
                    message: (error && error.body && error.body.message) || error.message || 'Unknown error',
                    variant: 'error'
                }));
            })
            .finally(() => { this.draftValues = []; });
    }

    handleSaveOutputIndicators(event) {
        const parentId = event.target.dataset.id;
        const type = 'Output';
        const dataTable = this.template.querySelector(`lightning-datatable[data-table-id="${parentId}"]`);
        if (!dataTable) {
            this.dispatchEvent(new ShowToastEvent({
                title: 'Error',
                message: 'Could not find the Output indicators table.',
                variant: 'error'
            }));
            return;
        }
        const draftValues = JSON.stringify(event.detail.draftValues || []);
        const allRecords = JSON.stringify(dataTable.data || []);
        saveRecords({ dataTableRecords: allRecords, updatedValues: draftValues, parentId, type })
            .then(() => refreshApex(this.wiredOutputs))
            .then(() => this.showSuccessUpdateToast())
            .catch(error => {
                this.dispatchEvent(new ShowToastEvent({
                    title: 'Error updating records',
                    message: (error && error.body && error.body.message) || error.message || 'Unknown error',
                    variant: 'error'
                }));
            })
            .finally(() => { this.draftValuesOutputInd = []; });
    }

    handleSaveMilestones(event) {
        const parentId = event.target.dataset.id;
        const tableId = event.target.dataset.tableId;
        const type = 'OutputMilestone';
        const dataTable = this.template.querySelector(`lightning-datatable[data-table-id="${tableId}"]`);
        if (!dataTable) {
            this.dispatchEvent(new ShowToastEvent({
                title: 'Error',
                message: 'Could not find the Output milestones table.',
                variant: 'error'
            }));
            return;
        }

        let draftValues = event.detail.draftValues || [];
        draftValues = draftValues.map(r => {
            if (r.uNI_Milestone_Date__c) {
                r.uNI_Milestone_Date__c = r.uNI_Milestone_Date__c.split('T')[0];
            }
            return r;
        });

        const draftValuesStr = JSON.stringify(draftValues);
        const allRecords = JSON.stringify(dataTable.data || []);
        saveRecords({ dataTableRecords: allRecords, updatedValues: draftValuesStr, parentId, type })
            .then(() => refreshApex(this.wiredOutputs))
            .then(() => this.showSuccessUpdateToast())
            .catch(error => {
                this.dispatchEvent(new ShowToastEvent({
                    title: 'Error updating records',
                    message: (error && error.body && error.body.message) || error.message || 'Unknown error',
                    variant: 'error'
                }));
            })
            .finally(() => { this.draftValuesOutputMile = []; });
    }

    // ===== Delete / row actions =====
    handleDeleteOutcome(e) {
        const type = 'Outcome';
        const recordIdToDelete = e.target.dataset.id;
        deleteRecord({ recordIdToDelete, type })
            .then(() => refreshApex(this.wiredOutputs))
            .then(() => this.showSuccessDeleteToast())
            .catch(err => console.error('Error deleting outcome :', err));
    }
    handleDeleteOutput(e) {
        const type = 'Output';
        const recordIdToDelete = e.target.dataset.id;
        deleteRecord({ recordIdToDelete, type })
            .then(() => refreshApex(this.wiredOutputs))
            .then(() => this.showSuccessDeleteToast())
            .catch(err => console.error('Error deleting output :', err));
    }

    handleRowAction(e) {
        const actionName = e.detail.action.name;
        const row = e.detail.row;
        switch (actionName) {
            case 'delete milestone':
            case 'delete indicator':
                this.deleteRow(row);
                break;
            case 'add subindicator':
                this.handleOpenSubindicatorModal(e);
                break;
            default:
        }
    }
    handleRowAction2(e) { this.handleRowAction(e); }

    deleteRow(row) {
        deleteMilestonesAndIndicators({ recordId: row.Id })
            .then(() => refreshApex(this.wiredOutputs))
            .then(() => this.showSuccessDeleteToast())
            .catch(error => {
                this.dispatchEvent(new ShowToastEvent({
                    title: 'Error deleting record',
                    message: (error && error.body && error.body.message) || error.message || 'Unknown error',
                    variant: 'error'
                }));
            });
    }

    // ===== Subindicator creation from modal =====
    // ===== Subindicator creation from modal =====
    addSubIndicator() {
        const row = this._selectedIndicatorRow;
        if (!row) return;

        const parentId = row.uNI_Outcome__c || row.uNI_Output__c;
        const type = row.uNI_Outcome__c ? 'Outcome' : 'Output';
        
        // OLD CODE: const heading = row.uNI_Indicator_Heading__c;
        // NEW CODE: Generate the incremented heading (e.g. 1.1.1, 1.1.2)
        const heading = this.generateSubIndicatorHeading(row);
        
        const disaggregation = this.disaggregationChange || row.uNI_Disaggregation__c || '';

        createIndicatorRecord({ 
            parentId, 
            heading, 
            type, 
            subIndicator: true, 
            disaggregation, 
            version: this.currentVersion 
        })
        .then(() => refreshApex(this.wiredOutputs))
        .then(() => this.showSuccessInsertToast())
        .catch(err => console.error('Error creating sub-indicator:', err))
        .finally(() => this.handleCloseModal());
    }

    // ===== Toasts =====
    showSuccessInsertToast() {
        this.dispatchEvent(new ShowToastEvent({ title: 'Success', message: 'The entry has been added successfully.', variant: 'success', mode: 'dismissable' }));
    }
    showReadOnlyToast() {
        this.dispatchEvent(new ShowToastEvent({ title: 'Success', message: 'The form has been submitted, now the view is in Read-only mode.', variant: 'success', mode: 'dismissable' }));
    }
    showSuccessUpdateToast() {
        this.dispatchEvent(new ShowToastEvent({ title: 'Success', message: 'The entry has been updated successfully.', variant: 'success', mode: 'dismissable' }));
    }
    showSuccessDeleteToast() {
        this.dispatchEvent(new ShowToastEvent({ title: 'Success', message: 'The entry has been deleted successfully.', variant: 'success', mode: 'dismissable' }));
    }


    // 🔹 Add this helper inside LogframeManagement (under helpers section is fine)
getNextIndicatorSeq(parentId, type) {
    // Filter indicators that belong to this parent Outcome/Output
    const records = (this.indicators || []).filter(ind => {
        if (type === 'Outcome') {
            return ind.uNI_Outcome__c === parentId;
        } else if (type === 'Output') {
            return ind.uNI_Output__c === parentId;
        }
        return false;
    });

    // Collect the distinct ".X" parts from headings like "Indicator P 1.3"
    const usedSeq = new Set();
    records.forEach(ind => {
        const heading = ind.uNI_Indicator_Heading__c || '';
        const match = heading.match(/\s[OP]\s\d+\.(\d+)$/); 
        //             matches "Indicator P 1.3" / "Indicator O 2.5"
        if (match && match[1]) {
            const seqNum = parseInt(match[1], 10);
            if (!isNaN(seqNum)) {
                usedSeq.add(seqNum);
            }
        }
    });

    // We want the next **missing** integer, starting at 1
    let next = 1;
    while (usedSeq.has(next)) {
        next++;
    }
    return next;
}
generateSubIndicatorHeading(parentRow) {
        const parentHeading = (parentRow.uNI_Indicator_Heading__c || '').trim();
        if (!parentHeading) return 'New Sub-Indicator';

        // The prefix we are looking for (e.g., "Indicator P 1.1" becomes "Indicator P 1.1.")
        const prefix = parentHeading + '.';
        let maxSeq = 0;

        // Loop through all indicators to find existing sub-indicators of this parent
        this.indicators.forEach(ind => {
            const currentHeading = (ind.uNI_Indicator_Heading__c || '').trim();
            
            // Check if this indicator is a child of the parent (starts with "ParentHeading.")
            if (currentHeading.startsWith(prefix)) {
                // Extract the suffix (the part after the dot)
                const suffix = currentHeading.substring(prefix.length);
                
                // We only care if the suffix is a number (e.g. "1", "2")
                // This ignores deeper nesting like "1.1" if we are currently at level "1"
                // but handles the immediate children.
                if (/^\d+$/.test(suffix)) {
                    const num = parseInt(suffix, 10);
                    if (num > maxSeq) {
                        maxSeq = num;
                    }
                }
            }
        });

        // Return ParentHeading + "." + (Max + 1)
        return prefix + (maxSeq + 1);
    }

}
