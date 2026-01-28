import { LightningElement, api, track } from 'lwc';
import getMilestoneData from '@salesforce/apex/uNI_sd_MilestoneController.getMilestoneData';
import createMilestoneRecord from '@salesforce/apex/uNI_sd_MilestoneController.createMilestoneRecord';
import saveMilestoneRecords from '@salesforce/apex/uNI_sd_MilestoneController.saveMilestoneRecords';
import submitMilestones from '@salesforce/apex/uNI_sd_MilestoneController.submitMilestones';
import deleteMilestoneRecord from '@salesforce/apex/uNI_sd_MilestoneController.deleteMilestoneRecord';
import { NavigationMixin } from 'lightning/navigation'; // <--- MUST BE HERE
import { RefreshEvent } from 'lightning/refresh';
import { getRecordNotifyChange } from 'lightning/uiRecordApi';



import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class UniSdMilestoneTracker extends NavigationMixin(LightningElement) {
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

    // required by lightning-datatable
    keyField = 'Id';

    
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
    @track loading = false;
    @track summaryData = null;
    @track versionOptions = [];
    @track activeVersion = null;
    @track outputGroupings = [];
    @track isEditable = false;

    columns = [];
    draftValues = [];

    connectedCallback() {
        if (this.recordId) {
            this.fetchData();
        }
    }

    showStatusModal = false;
    statusRecordId;
    statusCurrentValue = '';


    statusOptions = [
        { label: 'Completed', value: 'Completed' },
        { label: 'Significant progress', value: 'Significant progress' },
        { label: 'Limited progress', value: 'Limited progress' },
        { label: 'Not started', value: 'Not started' }
    ];


    fetchData(selectedVersion) {
        this.loading = true;
        return getMilestoneData({
            recordId: this.recordId,
            selectedVersion: selectedVersion || null
        })
            .then((result) => {
                // summary data
                this.summaryData = result.summaryData || null;

                // versions and active
                this.versionOptions = (result.versionOptions || []).map(v => ({
                    label: v.label,
                    value: v.value
                }));
                this.activeVersion =
                    result.activeVersion ||
                    (this.versionOptions.length ? this.versionOptions[0].value : null);

                // editable flag
                this.isEditable = !!result.isEditable;

                // build groups and rows
                this.outputGroupings = (result.outputGroupings || []).map((g, groupIdx) => {
                    const milestones = (g.milestones || []).map((m, idx) => {
                        const row = { ...m };

                        // guarantee Id for datatable key-field
                        if (!row.Id) {
                            row.Id = `temp_${groupIdx}_${idx}_${Date.now()}`;
                        }

                        // highlight if behind schedule
                        row.rowClass = row.uNI_BehindSchedule__c ? 'behind' : '';

                        row.uNI_Milestone_Heading__c = row.uNI_Milestone_Heading__c || '';
                        row.uNI_Milestone_Date__c = row.uNI_Milestone_Date__c || null;
                        row.uNI_CompletionDate__c = row.uNI_CompletionDate__c || null;
                        row.uNI_Status__c = row.uNI_Status__c || '';
                        row.uNI_Comments__c = row.uNI_Comments__c || '';
                        row.uNI_Description__c = row.uNI_Description__c || '';
                        // text + style for Behind schedule column
                        row.behindDisplay = row.uNI_BehindSchedule__c ? 'Yes' : 'No';
                        row.behindStyle = row.uNI_BehindSchedule__c
                            ? 'background-color:#FFB7C5; color:black; font-weight:bold; text-align:center;'
                            : 'background-color:#e7f5e7; color:#2E844A; font-weight:bold; text-align:center;';


                        return row;
                    });

                    return {
                        id: g.id,
                        name: g.name,
                        milestones
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
                this.outputGroupings = [];
            })
            .finally(() => {
                this.loading = false;
            });
    }

buildColumns(isEditable) {
    const commonTextCellAttrs = (tooltipField) => ({
        class: { fieldName: 'rowClass' },
        title: { fieldName: tooltipField }
    });

    // Row actions (only Delete now)
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

        // 👇 NEW Status column: text + pencil in the SAME cell
        {
             label: 'Status',
    fieldName: 'uNI_Status__c',
    type: 'button',
    initialWidth: 190,   // tweak if needed so text+pencil stay on ONE line
    typeAttributes: {
        label: { fieldName: 'uNI_Status__c' }, // what you see in the cell
        name: 'edit_status',                   // used in handleRowAction
        variant: 'base',                       // subtle text-style button
        iconName: 'utility:edit',
        iconPosition: 'right',                 // 👈 pencil at the END
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




    /**************************************************************************
     * Version change
     **************************************************************************/
    onVersionChange(event) {
        const selected = event.detail.value;
        this.activeVersion = selected;
        this.fetchData(selected);
    }

    /**************************************************************************
     * Add Milestone – NOW fully implemented with refresh
     **************************************************************************/
    handleAddMilestone(event) {
        const groupId = event.currentTarget.dataset.groupid;
        const group = this.outputGroupings.find((g) => g.id === groupId);

        if (!group) {
            this.showToast('Error', 'Unable to determine milestone group.', 'error');
            return;
        }

        // Determine parent type (Output vs Crosscutting Outcome)
        const parentType = group.name === 'Crosscutting' ? 'Outcome' : 'Output';

        // Derive output/outcome number from group name, e.g. "Output 1" -> "1"
        let parentNumber = '1';
        const match = group.name.match(/(\d+)/);
        if (match && match[1]) {
            parentNumber = match[1];
        }

        // Determine next sequence for this parent: parse existing headings like "Milestone O 1.3"
        let maxSeq = 0;
        group.milestones.forEach((m) => {
            const heading = m.uNI_Milestone_Heading__c || '';
            const hMatch = heading.match(/(\d+)\.(\d+)$/); // captures "1.3" at end
            if (hMatch && hMatch[1] === parentNumber) {
                const seq = parseInt(hMatch[2], 10);
                if (!isNaN(seq) && seq > maxSeq) {
                    maxSeq = seq;
                }
            }
        });

        const nextSeq = maxSeq + 1;

        // Build new heading like "Milestone O 1.6"
        const heading = `Milestone O ${parentNumber}.${nextSeq}`;

        this.loading = true;
        createMilestoneRecord({
            parentId: groupId,
            parentType: parentType,
            heading: heading,
            activeVersion: this.activeVersion
        })
            .then(() => {
                this.showToast(
                    'Success',
                    `Milestone "${heading}" was created.`,
                    'success'
                );
                // IMPORTANT: re-fetch data so new record appears immediately
                return this.fetchData(this.activeVersion);
            })
            .catch((err) => {
                this.showToast(
                    'Error creating milestone',
                    this.getErrorMessage(err),
                    'error'
                );
            })
            .finally(() => {
                this.loading = false;
            });
    }

    /**************************************************************************
     * Inline Save – fully implemented with refresh
     **************************************************************************/
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
                // re-fetch fresh data
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

    /**************************************************************************
     * Row actions (Delete)
     **************************************************************************/
    /**************************************************************************
 * Row actions (Delete) – Phase 5
 **************************************************************************/
   handleRowAction(event) {
    const actionName = event.detail.action.name;
    const row = event.detail.row;

    switch (actionName) {
        case 'delete':
            const confirmed = confirm('Are you sure you want to delete this milestone?');
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

        case 'edit_status':   // 👈 triggered by the pencil button
            this.openStatusModal(row);
            break;

        default:
        // no-op
    }
}




    /**************************************************************************
     * Submit Milestones button (if you wired it in the HTML)
     **************************************************************************/
    handleSubmitMilestones() {
        // Confirmation to prevent accidental submission
        const confirmed = confirm(
            'Are you sure you want to submit? This will lock all milestones for this version and cannot be undone.'
        );
        if (!confirmed) {
            // User cancelled – no changes
            return;
        }

        this.loading = true;

        submitMilestones({
            recordId: this.recordId,
            activeVersion: this.activeVersion
        })
            .then(() => {
                // Success toast
                this.showToast(
                    'Success',
                    'Milestones submitted. This version is now locked and read-only.',
                    'success'
                );
getRecordNotifyChange([{ recordId: this.recordId }]);

                // 2. Fire standard Refresh Event (Updates related lists/header)
                this.dispatchEvent(new RefreshEvent());

                // 3. Force Page Navigation (Hard refresh simulation)
                this[NavigationMixin.Navigate]({
                    type: 'standard__recordPage',
                    attributes: {
                        recordId: this.recordId,
                        actionName: 'view'
                    }
                });
                // Refresh data so isEditable becomes false and UI goes read-only
                return this.fetchData(this.activeVersion);
            })
            .catch((err) => {
                // Error toast
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


    /**************************************************************************
     * Getter used in HTML so we don’t use "!" in template
     **************************************************************************/
    get addDisabled() {
        return !this.isEditable;
    }

    /**************************************************************************
     * Utilities
     **************************************************************************/
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
                return err.body.output.errors.map((e) => e.message).join('; ');
            }
        }
        return JSON.stringify(err);
    }

    handleCancel() {
        this.draftValues = [];
    }

    handleStatusPicklistChange(event) {
        const { id, value } = event.detail;
        if (!id || !value) return;

        this.loading = true;

        saveMilestoneRecords({
            recordsToUpdate: [{ Id: id, uNI_Status__c: value }]
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
            });
    }

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



}