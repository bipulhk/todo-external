import { LightningElement, api, track, wire } from 'lwc';
import getMilestoneData from '@salesforce/apex/uNI_sd_MilestoneController.getMilestoneData';
import saveMilestoneRecords from '@salesforce/apex/uNI_sd_MilestoneController.saveMilestoneRecords';
import submitMilestones from '@salesforce/apex/uNI_sd_MilestoneController.submitMilestones';
import deleteMilestoneRecord from '@salesforce/apex/uNI_sd_MilestoneController.deleteMilestoneRecord';
import { RefreshEvent } from 'lightning/refresh';
import { getRecord, getFieldValue, getRecordNotifyChange } from 'lightning/uiRecordApi';
import { NavigationMixin, CurrentPageReference } from 'lightning/navigation';
import IA_LOGFRAME_VERSION from '@salesforce/schema/IndividualApplication.uNI_LogframeVersion__c';
import RR_LOGFRAME_VERSION from '@salesforce/schema/uNI_ReprogrammingRequest__c.uNI_LogframeVersion__c';
import getObjectApiName
    from '@salesforce/apex/uNI_ReprogrammingObjectCheck.getObjectApiName';


import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class UNISdMilestoneTimeline extends NavigationMixin(LightningElement) {
    _params;
    @api
    get params() {
        return this._params;
    }
    set params(value) {
        if (!value) {
            return;
        }
        let parsed = value;
        if (typeof value === 'string') {
            try {
                parsed = JSON.parse(value);
            } catch {
                parsed = null;
            }
        }
        if (!parsed) {
            return;
        }
        this._params = parsed;
        if (parsed.recordId) {
            this.recordId = parsed.recordId;
        }
        if (parsed.version !== undefined) {
            this.version = parsed.version;
        }
    }
    _recordId;
    @api
    get recordId() {
        return this._recordId;
    }
    set recordId(value) {
        if (value === this._recordId) {
            return;
        }
        this._recordId = value;
        if (this._recordId) {
            this.fetchData(this._version);
        }
    }
    _version;
    _versionProvided = false;
    @api
    get version() {
        return this._version;
    }
    set version(value) {
        this._versionProvided = true;
        const next = value !== undefined && value !== null ? String(value).trim() : null;
        if (next === this._version) {
            return;
        }
        this._version = next;
        if (this.recordId) {
            this.activeVersion = this._version;
            this.fetchData(this._version);
        }
    }

    get showVersionPicker() {
        return !this._versionProvided;
    }

    @track loading = false;
    @track summaryData;
    @track versionOptions = [];
    @track activeVersion;
    @track isEditable = false;
    baseEditable = false;
    contextRecordId;
    contextObjectApiName;
    iaRecord;
    rrDefaultVersion;
/* -------------------- GETTERS FOR SUMMARY DATES ----------------------- */
    get addDisabled() {
        return !this.isEditable;
    }
    get formattedStartDate() {
        if (!this.summaryData || !this.summaryData.ProjectDurationStart) {
            return '';
        }
        // Format YYYY-MM-DD string to "Month, Year" (e.g., "October, 2025")
        try {
            const parts = this.summaryData.ProjectDurationStart.split('-');
            if (parts.length === 3) {
                const date = new Date(parts[0], parts[1] - 1, parts[2]); 
                return date.toLocaleDateString('default', { month: 'long', year: 'numeric' });
            }
            return this.summaryData.ProjectDurationStart;
        } catch (e) {
            return this.summaryData.ProjectDurationStart;
        }
    }

    get formattedEndDate() {
        if (!this.summaryData || !this.summaryData.ProjectDurationEnd) {
            return '';
        }
        try {
            const parts = this.summaryData.ProjectDurationEnd.split('-');
            if (parts.length === 3) {
                const date = new Date(parts[0], parts[1] - 1, parts[2]);
                return date.toLocaleDateString('default', { month: 'long', year: 'numeric' });
            }
            return this.summaryData.ProjectDurationEnd;
        } catch (e) {
            return this.summaryData.ProjectDurationEnd;
        }
    }
    // final structure used by the template
    @track yearGroupings = [];

    columns = [];
    draftValues = [];

    // status modal state
    showStatusModal = false;
    statusRecordId;
    statusCurrentValue = '';

    statusOptions = [
        { label: 'Completed', value: 'Completed' },
        { label: 'Significant progress', value: 'Significant progress' },
        { label: 'Limited progress', value: 'Limited progress' },
        { label: 'Not started', value: 'Not started' }
    ];

    connectedCallback() {
        if (this.recordId) {
            this.fetchData();
        }
    }

    /* -------------------- DATA FETCH + TRANSFORM -------------------------- */

    fetchData(selectedVersion) {
        this.loading = true;

        return getMilestoneData({
            recordId: this.recordId,
            selectedVersion: selectedVersion || null
        })
            .then((result) => {
                this.summaryData = result.summaryData || null;

                // versioning
                this.versionOptions = (result.versionOptions || []).map((v) => ({
                    label: v.label,
                    value: v.value
                }));
                this.activeVersion =
                    result.activeVersion ||
                    (this.versionOptions.length ? this.versionOptions[0].value : null);

                this.baseEditable = !!result.isEditable;
                this.isEditable = this._computeIsEditable();

                // ---- FLATTEN outputGroupings then regroup by year ----
                const allRows = [];
                const outputGroupings = result.outputGroupings || [];

                outputGroupings.forEach((g) => {
                    const parentName = g.name;
                    (g.milestones || []).forEach((m, idx) => {
                        const row = { ...m };

                        // stable Id for datatable
                        if (!row.Id) {
                            row.Id = `temp_${g.id}_${idx}_${Date.now()}`;
                        }

                        // parent output / outcome name column
                        row.parentOutputName = parentName;

                        // normalise fields
                        row.uNI_Milestone_Heading__c =
                            row.uNI_Milestone_Heading__c || '';
                        row.uNI_Milestone_Date__c =
                            row.uNI_Milestone_Date__c || null;
                        row.uNI_CompletionDate__c =
                            row.uNI_CompletionDate__c || null;
                        row.uNI_Status__c = row.uNI_Status__c || 'Not started';
                        row.uNI_Comments__c = row.uNI_Comments__c || '';
                        row.uNI_Description__c = row.uNI_Description__c || '';

                        // behind schedule decoration
                        row.rowClass = row.uNI_BehindSchedule__c ? 'behind' : '';
                        row.behindDisplay = row.uNI_BehindSchedule__c ? 'Yes' : 'No';
                        row.behindStyle = row.uNI_BehindSchedule__c
                            ? 'background-color:#FFB7C5; color:black; font-weight:bold; text-align:center;'
                            : 'background-color:#e7f5e7; color:#2E844A; font-weight:bold; text-align:center;';

                        // year from due date (YYYY from ISO string)
                        let yearKey = 'No Due Date';
                        if (row.uNI_Milestone_Date__c) {
                            yearKey = String(
                                row.uNI_Milestone_Date__c
                            ).slice(0, 4);
                        }
                        row.yearKey = yearKey;

                        allRows.push(row);
                    });
                });

                // group by yearKey
                const yearMap = new Map();
                allRows.forEach((row) => {
                    if (!yearMap.has(row.yearKey)) {
                        yearMap.set(row.yearKey, []);
                    }
                    yearMap.get(row.yearKey).push(row);
                });

                // sort years ascending (No Due Date at the end)
                const yearKeys = Array.from(yearMap.keys()).sort((a, b) => {
                    if (a === 'No Due Date') return 1;
                    if (b === 'No Due Date') return -1;
                    return a.localeCompare(b);
                });

                this.yearGroupings = yearKeys.map((yk) => {
                    const rows = yearMap.get(yk);

                    // sort rows by Due Date then heading
                    rows.sort((r1, r2) => {
                        const d1 = r1.uNI_Milestone_Date__c || '';
                        const d2 = r2.uNI_Milestone_Date__c || '';
                        if (d1 === d2) {
                            const h1 = r1.uNI_Milestone_Heading__c || '';
                            const h2 = r2.uNI_Milestone_Heading__c || '';
                            return h1.localeCompare(h2);
                        }
                        return d1.localeCompare(d2);
                    });

                    return {
                        year: yk,
                        yearLabel: yk === 'No Due Date' ? 'No Due Date' : `Year ${yk}`,
                        milestones: rows
                    };
                });

                // columns depend on editability
                this.columns = this.buildColumns(this.isEditable);
                this.draftValues = [];
            })
            .catch((err) => {
                this.showToast(
                    'Error loading milestones',
                    this.getErrorMessage(err),
                    'error'
                );
                this.yearGroupings = [];
            })
            .finally(() => {
                this.loading = false;
            });
    }

    @wire(CurrentPageReference)
    getStateParameters(currentPageReference) {
        if (!currentPageReference) {
            return;
        }

        const state = currentPageReference.state || {};
        const attrs = currentPageReference.attributes || {};

        const contextId =
            state.recordId ||
            attrs.recordId ||
            state.c__recordId ||
            null;
        if (contextId && contextId !== this.contextRecordId) {
            this.contextRecordId = contextId;
            this._applyReadOnlyGuard();
        }
    }

    @wire(getObjectApiName, { recordId: '$contextRecordId' })
    wiredObjectType({ data, error }) {
        if (data) {
            this.contextObjectApiName = data;
            this._applyReadOnlyGuard();
        } else if (error) {
            console.error('MilestoneTimeline: error resolving context object type', error);
        }
    }

    get rrRecordId() {
        return this.contextObjectApiName === 'uNI_ReprogrammingRequest__c'
            ? this.contextRecordId
            : null;
    }

    @wire(getRecord, { recordId: '$recordId', fields: [IA_LOGFRAME_VERSION] })
    wiredIARecord({ data, error }) {
        if (data) {
            this.iaRecord = data;
        } else if (error) {
            console.error('MilestoneTimeline: error loading IA logframe version', error);
            this.iaRecord = undefined;
        }
        this._applyReadOnlyGuard();
    }

    @wire(getRecord, { recordId: '$rrRecordId', fields: [RR_LOGFRAME_VERSION] })
    wiredRRRecord({ data, error }) {
        if (data) {
            this.rrDefaultVersion = getFieldValue(data, RR_LOGFRAME_VERSION);
        } else if (error) {
            console.error('MilestoneTimeline: error loading RR logframe version', error);
        }
        this._applyReadOnlyGuard();
    }

    get iaLogframeVersion() {
        return getFieldValue(this.iaRecord, IA_LOGFRAME_VERSION);
    }

    _computeIsEditable() {
        const base = !!this.baseEditable;
        if (this.contextObjectApiName === 'uNI_ReprogrammingRequest__c') {
            const ia = this._normalizeVersion(this.iaLogframeVersion);
            const selected = this._normalizeVersion(
                this.activeVersion || this._version
            );
            if (ia && selected) {
                return ia !== selected;
            }
            const rr = this._normalizeVersion(this.rrDefaultVersion);
            if (ia && rr) {
                return ia !== rr;
            }
            return base;
        }
        return base;
    }

    _applyReadOnlyGuard() {
        const next = this._computeIsEditable();
        if (next !== this.isEditable) {
            this.isEditable = next;
            this.columns = this.buildColumns(this.isEditable);
        }
    }

    _normalizeVersion(val) {
        if (val === undefined || val === null) return '';
        return String(val).trim();
    }

    /* --------------------------- COLUMNS --------------------------------- */

    buildColumns(isEditable) {
        const commonTextCellAttrs = (tooltipField) => ({
            class: { fieldName: 'rowClass' },
            title: { fieldName: tooltipField }
        });

        const actions = [];
        if (isEditable) {
            actions.push({
                label: 'Delete',
                name: 'delete',
                iconName: 'utility:delete'
            });
        }

        const cols = [
            {
                label: 'Milestone Number & Heading',
                fieldName: 'uNI_Milestone_Heading__c',
                type: 'text',
                editable: isEditable,
                cellAttributes: commonTextCellAttrs('uNI_Milestone_Heading__c'),
                wrapText: true
            },
            
            {
                label: 'Milestone Title',                 // NEW column (right after heading)
                fieldName: 'uNI_Milestone_Title__c',      // field API name with uNI_ prefix
                editable: isEditable,                               // set to false if you don't want inline edits
                wrapText: true,
                initialWidth: 200
            },
             {
                label: 'Description',
                fieldName: 'uNI_Description__c',
                type: 'text',
                editable: isEditable,
                cellAttributes: commonTextCellAttrs('uNI_Description__c'),
                wrapText: true
            },
            {
                label: 'Output',
                fieldName: 'parentOutputName',
                type: 'text',
                editable: false,
                cellAttributes: {
                    class: { fieldName: 'rowClass' }
                }
            },

            {
                label: 'Due Date',
                fieldName: 'uNI_Milestone_Date__c',
                type: 'date-local',
                typeAttributes: {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                },
                editable: isEditable,
                cellAttributes: { class: { fieldName: 'rowClass' } }
            },
            {
                label: 'Completion Date',
                fieldName: 'uNI_CompletionDate__c',
                type: 'date-local',
                typeAttributes: {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                },
                editable: isEditable,
                cellAttributes: { class: { fieldName: 'rowClass' } }
            },
            {
                label: 'Status',
                fieldName: 'uNI_Status__c',
                type: 'button',
                initialWidth: 190,
                typeAttributes: {
                    label: { fieldName: 'uNI_Status__c' },
                    name: 'edit_status',
                    variant: 'base',
                    iconName: 'utility:edit',
                    iconPosition: 'right',
                    disabled: !isEditable
                },
                cellAttributes: {
                    class: { fieldName: 'rowClass' },
                    alignment: 'left'
                }
            },
            {
                label: 'Behind schedule',
                fieldName: 'behindDisplay',
                type: 'text',
                editable: false,
                cellAttributes: {
                    style: { fieldName: 'behindStyle' },
                    class: { fieldName: 'rowClass' }
                }
            },
           
            {
                label: 'Comments',
                fieldName: 'uNI_Comments__c',
                type: 'text',
                editable: isEditable,
                cellAttributes: commonTextCellAttrs('uNI_Comments__c'),
                wrapText: true
            }
        ];

        if (isEditable) {
            cols.push({
                type: 'action',
                typeAttributes: {
                    rowActions: actions,
                    menuAlignment: 'right'
                }
            });
        }

        return cols;
    }

    /* --------------------- VERSION CHANGE -------------------------------- */

    onVersionChange(event) {
        const selected = event.detail.value;
        this.activeVersion = selected;
        this.fetchData(selected);
    }

    /* --------------------- INLINE SAVE ----------------------------------- */

    handleSave(event) {
        const drafts = event.detail.draftValues || [];
        if (!drafts.length) {
            this.showToast('Info', 'No changes to save.', 'info');
            return;
        }

        this.loading = true;

        saveMilestoneRecords({ recordsToUpdate: drafts })
            .then(() => {
                this.showToast('Success', 'Milestones updated.', 'success');
                this.draftValues = [];
                return this.fetchData(this.activeVersion);
            })
            .catch((err) => {
                this.showToast(
                    'Error saving milestones',
                    this.getErrorMessage(err),
                    'error'
                );
            })
            .finally(() => {
                this.loading = false;
            });
    }

    handleCancel() {
        this.draftValues = [];
    }

    /* --------------------- ROW ACTIONS ----------------------------------- */

    handleRowAction(event) {
        const actionName = event.detail.action.name;
        const row = event.detail.row;

        switch (actionName) {
            case 'delete': {
                const confirmed = confirm(
                    'Are you sure you want to delete this milestone?'
                );
                if (!confirmed) {
                    return;
                }

                this.loading = true;
                deleteMilestoneRecord({ recordId: row.Id })
                    .then(() => {
                        this.showToast('Success', 'Milestone deleted.', 'success');
                        return this.fetchData(this.activeVersion);
                    })
                    .catch((err) => {
                        this.showToast(
                            'Error deleting milestone',
                            this.getErrorMessage(err),
                            'error'
                        );
                    })
                    .finally(() => {
                        this.loading = false;
                    });
                break;
            }

            case 'edit_status':
                this.openStatusModal(row);
                break;

            default:
        }
    }

    /* --------------------- SUBMIT & LOCK --------------------------------- */

    handleSubmitMilestones() {
        const confirmed = confirm(
            'Are you sure you want to submit? This will lock all milestones for this version and cannot be undone.'
        );
        if (!confirmed) {
            return;
        }

        this.loading = true;

        submitMilestones({
            recordId: this.recordId,
            activeVersion: this.activeVersion
        })
            .then(() => {
                this.showToast(
                    'Success',
                    'Milestones submitted. This version is now locked and read-only.',
                    'success'
                );
                getRecordNotifyChange([{ recordId: this.recordId }]);
                this.dispatchEvent(new RefreshEvent());
                this[NavigationMixin.Navigate]({
                    type: 'standard__recordPage',
                    attributes: {
                        recordId: this.recordId,
                        actionName: 'view'
                    }
                });
                return this.fetchData(this.activeVersion);
            })
            .catch((err) => {
                this.showToast(
                    'Error submitting milestones',
                    this.getErrorMessage(err),
                    'error'
                );
            })
            .finally(() => {
                this.loading = false;
            });
    }

    get submitDisabled() {
        return !this.isEditable;
    }

    /* --------------------- STATUS MODAL ---------------------------------- */

    openStatusModal(row) {
        this.statusRecordId = row.Id;
        this.statusCurrentValue = row.uNI_Status__c || 'Not started';
        this.showStatusModal = true;
    }

    closeStatusModal() {
        this.showStatusModal = false;
        this.statusRecordId = undefined;
        this.statusCurrentValue = '';
    }

    handleStatusChange(event) {
        this.statusCurrentValue = event.detail.value;
    }

    handleStatusSave() {
        if (!this.statusRecordId || !this.statusCurrentValue) {
            this.closeStatusModal();
            return;
        }

        this.loading = true;

        saveMilestoneRecords({
            recordsToUpdate: [
                {
                    Id: this.statusRecordId,
                    uNI_Status__c: this.statusCurrentValue
                }
            ]
        })
            .then(() => {
                this.showToast('Success', 'Status updated.', 'success');
                return this.fetchData(this.activeVersion);
            })
            .catch((err) => {
                this.showToast(
                    'Error updating status',
                    this.getErrorMessage(err),
                    'error'
                );
            })
            .finally(() => {
                this.loading = false;
                this.closeStatusModal();
            });
    }

    /* --------------------- UTILITIES ------------------------------------- */

    showToast(title, message, variant = 'info') {
        this.dispatchEvent(
            new ShowToastEvent({
                title,
                message,
                variant
            })
        );
    }

    getErrorMessage(err) {
        if (!err) return 'Unknown error';
        if (err.body) {
            if (Array.isArray(err.body)) {
                return err.body.map((b) => b.message).join('; ');
            }
            if (err.body.message) {
                return err.body.message;
            }
            if (err.body.output && Array.isArray(err.body.output.errors)) {
                return err.body.output.errors
                    .map((e) => e.message)
                    .join('; ');
            }
        }
        return JSON.stringify(err);
    }
}
