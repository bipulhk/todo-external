import { LightningElement, wire, track, api } from 'lwc';
import { CurrentPageReference } from 'lightning/navigation';
import { NavigationMixin } from 'lightning/navigation';
import getReprogrammingRequests from '@salesforce/apex/uNI_ReprogrammingRequestController.getReprogrammingRequests';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';

export default class UNI_ReprogrammingRequestsPortal extends NavigationMixin(LightningElement) {
    // API input
    _recordId;
    
    // Component state
    @track reprogrammingRequests = [];
    @track error;
    @track isLoading = false;
    @track showNewModal = false;
    @track isSaving = false;
    // Wire result reference for refresh
    _wiredResult;
    @wire(CurrentPageReference)
    getStateParams(pageRef) {
        if (!pageRef) return;
        const st = pageRef.state || {};
        const fromState = st.recordId || st.c__recordId || st.id || st.c__id || null;
        const fromUrl = this._fallbackFromUrl();
        const resolved = fromState || fromUrl || null;
        if (resolved && resolved !== this._recordId) {
            // eslint-disable-next-line no-console
            console.log('Resolved recordId =', resolved);
            this.recordId = resolved;
        }
    }
    _fallbackFromUrl() {
        try {
            const qs = new URLSearchParams(window.location.search || '');
            const qId = qs.get('c__recordId') || qs.get('recordId') || qs.get('c__id') || qs.get('id');
            if (qId && this._looksLikeSfId(qId)) return qId;

            const parts = (window.location.pathname || '').split('/');
            if (parts.length > 3 && this._looksLikeSfId(parts[3])) return parts[3];

            const anyId = parts.find(p => this._looksLikeSfId(p));
            return anyId || null;
        } catch {
            return null;
        }
    }
    _looksLikeSfId(v) {
        return /^[a-zA-Z0-9]{15}([a-zA-Z0-9]{3})?$/.test(String(v).trim());
    }

    // Column definitions
    baseColumns = [
        {
            label: 'Id',
            fieldName: 'recordLink',
            type: 'url',
            typeAttributes: { label: { fieldName: 'Name' }, target: '_self' },
            sortable: true
        },
        { label: 'Status', fieldName: 'uNI_Status__c', type: 'text', sortable: true },
        { label: 'Type of Reprogramming', fieldName: 'uNI_TypeOfReprogramming__c', type: 'text', sortable: true },
        { label: 'Approved By', fieldName: 'uNI_ApprovedBy__c', type: 'text', sortable: true },
        { label: 'Approved Date', fieldName: 'uNI_ApprovedDate__c', type: 'date', sortable: true }
    ];

    @track computedColumns = this.baseColumns;

    // Placeholder for flow API name - configurable via property or label
    @api flowApiName = 'UNI_CreateReprogrammingRequest'; // Default placeholder

    // Getters and setters for recordId
    @api
    get recordId() { return this._recordId; }
    set recordId(val) {
        const newVal = (val || '').trim();
        if (newVal && newVal !== this._recordId) {
            this._recordId = newVal;
            this.loadReprogrammingRequests();
        }
    }

    // Load data when recordId changes
    loadReprogrammingRequests() {
        if (!this._recordId) {
            this.reprogrammingRequests = [];
            return;
        }
        this.isLoading = true;
        this.error = undefined;
        // Reset data to prevent stale info during reload
        this.reprogrammingRequests = [];
        
        // Call the Apex method
        getReprogrammingRequests({ investmentId: this._recordId })
            .then(async result => {
                const rows = result || [];
                const mapped = await Promise.all(
                    rows.map(async r => ({
                        ...r,
                        recordLink: await this._buildRecordLink(r.Id)
                    }))
                );
                this.reprogrammingRequests = mapped;
                this.error = undefined;
            })
            .catch(error => {
                this.error = error;
                this.reprogrammingRequests = [];
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    async _buildRecordLink(recordId) {
        if (!recordId) return '';
        try {
            return await this[NavigationMixin.GenerateUrl]({
                type: 'standard__recordPage',
                attributes: {
                    recordId,
                    actionName: 'view'
                }
            });
        } catch (e) {
            return `/s/detail/${recordId}`;
        }
    }

    // Sort handler
    sortedBy = 'LastModifiedDate';
    sortedDirection = 'desc';

    handleSort(event) {
        this.sortedBy = event.detail.fieldName;
        this.sortedDirection = event.detail.sortDirection;
        this.reprogrammingRequests = this.sortData(this.sortedBy, this.sortedDirection);
    }

    sortData(fieldname, direction) {
        const cloneData = [...this.reprogrammingRequests];
        cloneData.sort((a, b) => {
            let valA = a[fieldname];
            let valB = b[fieldname];

            // handle null or undefined values
            valA = valA ? valA : '';
            valB = valB ? valB : '';

            // if it's a date, convert to timestamp for accurate sorting
            if (fieldname.includes('Date')) {
                valA = valA ? new Date(valA).getTime() : 0;
                valB = valB ? new Date(valB).getTime() : 0;
            }

            let result = 0;
            if (valA > valB) result = 1;
            else if (valA < valB) result = -1;

            return direction === 'asc' ? result : -result;
        });
        return cloneData;
    }

    get hasData() { 
        return this.reprogrammingRequests && this.reprogrammingRequests.length > 0; 
    }

    // Modal handlers
    openNewModal() { 
        this.showNewModal = true; 
        // Defer starting the flow until the lightning-flow element is rendered
        // Use a microtask to ensure template re-render completes
        Promise.resolve().then(() => {
            const flowElement = this.template.querySelector('lightning-flow');
            if (!flowElement) {
                // Try one more time on next tick if not yet in DOM
                setTimeout(() => this.startFlowInModal(), 0);
            } else {
                this.startFlowInModal();
            }
        });
    }

    closeNewModal() { 
        this.showNewModal = false; 
    }

    // Start the flow inside the modal once the lightning-flow element is available
    startFlowInModal() {
        // Check if flow API name is provided
        if (!this.flowApiName || this.flowApiName.trim() === '') {
            this.dispatchEvent(new ShowToastEvent({
                title: 'Configuration Error',
                message: 'No Flow API Name configured for the New button. Please set the flowApiName property.',
                variant: 'error'
            }));
            return;
        }

        // Build flow input: pass only the recordId variable to the flow
        const inputVariables = [];
        if (this._recordId) {
            inputVariables.push({ name: 'recordId', type: 'String', value: this._recordId });
        } else {
            this.dispatchEvent(new ShowToastEvent({
                title: 'Missing Context',
                message: 'No recordId was resolved to pass to the flow.',
                variant: 'error'
            }));
            return;
        }

        // Launch the flow using lightning-flow inside the modal
        const flowElement = this.template.querySelector('lightning-flow');
        if (flowElement) {
            try {
                flowElement.startFlow(this.flowApiName, inputVariables);
            } catch (e) {
                this.dispatchEvent(new ShowToastEvent({
                    title: 'Flow Launch Error',
                    message: 'Could not launch flow. Please check component configuration.',
                    variant: 'error'
                }));
            }
        } else {
            // If still not present, retry shortly
            setTimeout(() => {
                const retryEl = this.template.querySelector('lightning-flow');
                if (retryEl) {
                    retryEl.startFlow(this.flowApiName, inputVariables);
                } else {
                    this.dispatchEvent(new ShowToastEvent({
                        title: 'Flow Launch Error',
                        message: 'Flow container not available.',
                        variant: 'error'
                    }));
                }
            }, 0);
        }
    }

    // Handle flow status changes (keep modal open unless finished)
    handleFlowFinished(event) {
        // Some flows emit intermediate status changes like 'STARTED', 'PAUSED', 'WAITING'
        // Only close the modal when the flow has actually finished
        const status = event && event.detail ? event.detail.status : undefined;
        if (status === 'FINISHED' || status === 'FINISHED_SCREEN') {
            this.closeNewModal();
            // Immediately refresh table data after flow completion
            try {
                // If wired context exists use it, otherwise trigger an explicit reload
                if (this._wiredResult) {
                    refreshApex(this._wiredResult);
                } else {
                    this.loadReprogrammingRequests();
                }
            } catch (e) {
                // Fallback to explicit load in case refreshApex throws
                this.loadReprogrammingRequests();
            }
        }
    }

    // Navigate to record on row click (kept for any future non-URL columns)
    handleRowClick(event) {
        const recordId = event.detail.row && (event.detail.row.Id || event.detail.row.Id__c || event.detail.row.id);
        if (!recordId) return;
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId,
                actionName: 'view'
            }
        });
    }
}
