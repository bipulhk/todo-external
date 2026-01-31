// uNI_AnnualReport
// Purpose: Annual Report container that builds tabbed navigation and wires key AR fields.
// Context: Annual Report record page; resolves recordId from page state/path.
// Output: Tab metadata for child LWCs (Budget, Finance, Risks, etc.).
import { LightningElement, track, api, wire } from 'lwc';
import getYearToReport from '@salesforce/apex/uNI_AnnualReportController.getYearToReport';
import { CurrentPageReference } from 'lightning/navigation';
import { getRecord } from 'lightning/uiRecordApi';

const FIELDS = [
    'uNI_Annual_Report__c.uNI_Individual_Application__c',
    'uNI_Annual_Report__c.uNI_BudgetFrom__c',
    'uNI_Annual_Report__c.uNI_ReprogrammingRequest__c',
    'uNI_Annual_Report__c.uNI_RelatedDisbursement__c'
];

export default class UNI_AnnualReport extends LightningElement {
    _recordId;
    recordIdForWire; // reactive property for wire service

    @api
    get recordId() {
        return this._recordId;
    }
    set recordId(value) {
        this._recordId = value;
        this.recordIdForWire = value; // update reactive property for wire
    }

    @track tabs = [];
    @track applicationId;
    @track activeTab;
    @track budgetFrom;
    @track reprogrammingRequest;
    @track relatedDisbursement;

    @wire(getRecord, { recordId: '$recordIdForWire', fields: FIELDS })
    wiredRecord({ error, data }) {
        if (data) {
            this.applicationId = data.fields.uNI_Individual_Application__c.value;
            this.budgetFrom = data.fields.uNI_BudgetFrom__c && data.fields.uNI_BudgetFrom__c.value;
            this.reprogrammingRequest = data.fields.uNI_ReprogrammingRequest__c && data.fields.uNI_ReprogrammingRequest__c.value;
            this.relatedDisbursement = data.fields.uNI_RelatedDisbursement__c && data.fields.uNI_RelatedDisbursement__c.value;

            console.log('Annual Report fields:',
                'budgetFrom=', this.budgetFrom,
                'reprogrammingRequest=', this.reprogrammingRequest,
                'relatedDisbursement=', this.relatedDisbursement);

            console.log('Application Id @@@@:', this.applicationId);
            this.initTabs();
        } else if (error) {
            console.error(error);
        }
    }

    // Wire CurrentPageReference to get recordId from URL or page state
    @wire(CurrentPageReference)
    getStateParameters(pageRef) {
        if (pageRef && pageRef.state) {
            const idFromState = pageRef.state.recordId || pageRef.state.c__recordId || pageRef.state.id || null;
            if (idFromState && idFromState !== this._recordId) {
                this._recordId = idFromState;
                this.recordIdForWire = idFromState; // update reactive property for wire
                // this.initTabs();
            }
        }
        // fallback: parse recordId from URL path if not found in state
        if (!this._recordId && window.location.pathname) {
            const regex = /\/uni-annual-report\/([a-zA-Z0-9]{15,18})(?:\/|$)/;
            const match = window.location.pathname.match(regex);
            if (match) {
                this._recordId = match[1];
                this.recordIdForWire = match[1]; // update reactive property for wire
                // this.initTabs();
            }
        }
    }

    initTabs() {
        if (!this._recordId) {
            return;
        }
        const previousActiveId = this.activeTab && this.activeTab.id;
        this.tabs = [
            { id: 'tab1', label: 'Overview', lwcName: 'c-u-n-i-annual-report-overview', recordId: this._recordId },
            { id: 'tab2', label: 'Milestones', lwcName: 'c-u-n-i-milestones', recordId: this._recordId },
            { id: 'tab3', label: 'Indicators', lwcName: 'c-u-n-i-indicators', recordId: this._recordId },
            { id: 'tab4', label: 'Budget', lwcName: 'uNI_ARBudget', recordId: this._recordId },
            { id: 'tab5', label: 'Finance', lwcName: 'uNI_FinalcialAuditAnnualReport', recordId: this.applicationId },
            { id: 'tab6', label: 'Management Actions', lwcName: 'uNI_ManagementActionAnnualReport', recordId: this.applicationId },
            { id: 'tab7', label: 'Incidents', lwcName: 'uNI_IncidentMgmtAnnualReport', recordId: this.applicationId },
            { id: 'tab8', label: 'Risk', lwcName: 'uNI_RiskRegisterLWC', recordId: this.applicationId },
            // Add other tabs as needed
        ];
        const resolvedActiveId = this.tabs.some(tab => tab.id === previousActiveId)
            ? previousActiveId
            : this.tabs[0].id;
        this.activeTab = this.tabs.find(tab => tab.id === resolvedActiveId) || this.tabs[0];
        this._applyTabClasses(resolvedActiveId);
    }

    // Wire getYearToReport only when recordIdForWire is set
    @wire(getYearToReport, { recordId: '$recordIdForWire' })
    wiredResult({ data, error }) {
        if (data) {
            this.outcomes = data.outcomes;
            this.outputs = data.outputs;
            this.indicators = data.indicators;
            this.fieldsMap = data.fieldsMap;
            console.log(this.outcomes);
            console.log(this.outputs);
            this.isEditableLogframe = data.isEditableLogframe;
            console.log('@@@ is editable ' + this.isEditableLogframe);
            console.log('@@@ is _recordId ' + this._recordId);
        }
        if (error) {
            console.error(error);
        }
    }

    handleTabClick(event) {
        const tabId = event.currentTarget.dataset.id;
        this.activeTab = this.tabs.find(tab => tab.id === tabId);
        this._applyTabClasses(tabId);
        if (this.activeTab) {
            console.log('active tab recordId params:', this.activeTab.recordId);
        }
    }

    _applyTabClasses(activeId) {
        if (!this.tabs || !this.tabs.length) {
            return;
        }
        this.tabs = this.tabs.map(tab => ({
            ...tab,
            cssClass: tab.id === activeId ? 'tab-button active' : 'tab-button'
        }));
    }
}