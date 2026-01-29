// uNI_AnnualReportBtn
// Purpose: Renders Annual/Flash report action buttons and launches configured flows.
// Context: Annual Report record page (recordId resolved from page state/path).
// Behavior: Hides actions for Submitted/Approved, disables for Contributor users.
import { LightningElement, api, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import STATUS from '@salesforce/schema/uNI_Annual_Report__c.uNI_Status__c';
import REPORT_TYPE from '@salesforce/schema/uNI_Annual_Report__c.uNI_ReportType__c';
import { getRecord, getFieldValue, getRecordNotifyChange } from 'lightning/uiRecordApi'; 
import { CurrentPageReference } from 'lightning/navigation';
import getCurrentUserTitle from '@salesforce/apex/uNI_ContributorUserController.getCurrentUserTitle';

export default class UNI_AnnualReportBtn extends LightningElement {
    @api buttonLabel = 'Submit Report';
    @api buttonVariant = 'brand';
    @api flowApiName = 'uNI_Annual_Report_Update';
    @api modalTitle = 'Submit Report';
    @api flashFlowApiNamePrimary = 'uNI_Flash_Report_Submit';
    @api flashFlowApiNameSecondary = 'uNI_Upload_Flash_Report_Files';
    @api flashButtonLabelPrimary = 'Submit Flash Report';
    @api flashButtonLabelSecondary = 'Upload Report Files';
    @track isButtonDisabled = false;
    @api recordId;
    @track showFlowModal = false;
    _recordIdFromPage;
    currentFlowApiName;
    currentModalTitle;
    arRecord;

    @wire(CurrentPageReference)
    getStateParameters(pageRef) {
        if (pageRef?.state) {
            this._recordIdFromPage =
                pageRef.state.recordId ||
                pageRef.state.c__recordId ||
                pageRef.state.id ||
                null;
        }
        if (!this._recordIdFromPage && window.location.pathname) {
            const regex = /\/uni-annual-report\/([a-zA-Z0-9]{15,18})(?:\/|$)/;
            const match = window.location.pathname.match(regex);
            if (match) this._recordIdFromPage = match[1];
        }
    }

    get effectiveRecordId() {
        return this.recordId || this._recordIdFromPage || null;
    } 
    

    @wire(getCurrentUserTitle)
    wiredUserTitle({ error, data }) {
        if (data) {
            this.isButtonDisabled = (data === 'Contributor');
        } else if (error) {
            // If there's an error, log it and disable the button as a safeguard.
            // eslint-disable-next-line no-console
            console.error('Error fetching user title:', JSON.stringify(error));
            this.isButtonDisabled = true;
        }
    }

    @wire(getRecord, { recordId: '$effectiveRecordId', fields: [STATUS, REPORT_TYPE] })
    wiredRecord({ data, error }) {
        if (data) {
            this.arRecord = data;
            this.logState('record loaded');
        } else if (error) {
            this.arRecord = undefined;
            // eslint-disable-next-line no-console
            console.error('AnnualReportBtn: getRecord error', error);
        }
    }

    get arStatus() { return getFieldValue(this.arRecord, STATUS); }
    get reportType() { return getFieldValue(this.arRecord, REPORT_TYPE); }
    get normalizedReportType() {
        return (this.reportType || '').trim().toLowerCase();
    }
    get isFlashReport() { return this.normalizedReportType.includes('flash'); }
    get hasFlashFlowConfig() {
        return !!(this.flashFlowApiNamePrimary || this.flashFlowApiNameSecondary);
    }

    get canShowActions() {
        if (!this.arRecord) return false;
        return !(this.arStatus === 'Submitted' || this.arStatus === 'Approved');
    }

    get showNonFlashButton() {
        return this.canShowActions && !this.isFlashReport;
    }

    get showFlashButtons() {
        return this.canShowActions && this.isFlashReport;
    }

    get flashPrimaryFlowName() {
        return this.flashFlowApiNamePrimary || this.flowApiName;
    }

    get flashSecondaryFlowName() {
        return this.flashFlowApiNameSecondary;
    }

    get flashPrimaryDisabled() {
        return this.isButtonDisabled || !this.flashPrimaryFlowName;
    }

    get flashSecondaryDisabled() {
        return this.isButtonDisabled || !this.flashSecondaryFlowName;
    }

    get flowInputVariables() {
        return [{ name: 'recordId', type: 'String', value: this.effectiveRecordId }];
    }

    handleLaunch(event) {
        const flowName = event?.currentTarget?.dataset?.flow || this.flowApiName;
        const modalTitle = event?.currentTarget?.dataset?.modal || event?.currentTarget?.dataset?.label || this.modalTitle;
        if (!this.effectiveRecordId) {
            this.dispatchEvent(new ShowToastEvent({
                title: 'Record Id not found',
                message: 'This button must be placed on an Annual_Report record page.',
                variant: 'error'
            }));
            return;
        }
        if (!flowName) {
            this.dispatchEvent(new ShowToastEvent({
                title: 'Flow not configured',
                message: 'No flow API name is configured for this action.',
                variant: 'error'
            }));
            return;
        }
        this.currentFlowApiName = flowName;
        this.currentModalTitle = modalTitle || this.modalTitle;
        this.showFlowModal = true;
    }

    closeModal() {
        this.showFlowModal = false;
    }

    async handleStatusChange(evt) {
        const status = evt?.detail?.status;
        if (status === 'FINISHED' || status === 'FINISHED_SCREEN') {
            this.showFlowModal = false;

            // ✅ Tell LDS that this record changed so @wire(getRecord...) refreshes
            await getRecordNotifyChange([{ recordId: this.effectiveRecordId }]);

            // (Optional) toast
            this.dispatchEvent(new ShowToastEvent({
                title: 'Report updated',
                message: 'Annual Report status refreshed.',
                variant: 'success'
            }));
        }
    }

    logState(reason) {
        // eslint-disable-next-line no-console
        console.error('AnnualReportBtn state:', {
            reason,
            recordId: this.effectiveRecordId,
            reportType: this.reportType,
            normalizedReportType: this.normalizedReportType,
            status: this.arStatus,
            isFlashReport: this.isFlashReport,
            canShowActions: this.canShowActions,
            flashFlowApiNamePrimary: this.flashFlowApiNamePrimary,
            flashFlowApiNameSecondary: this.flashFlowApiNameSecondary,
            flashPrimaryFlowName: this.flashPrimaryFlowName,
            flashSecondaryFlowName: this.flashSecondaryFlowName
        });

        if (this.isFlashReport && !this.hasFlashFlowConfig) {
            // eslint-disable-next-line no-console
            console.error('AnnualReportBtn: Flash report detected but no Flash flow API names are configured.');
        }
        if (!this.reportType) {
            // eslint-disable-next-line no-console
            console.error('AnnualReportBtn: Report type is empty; buttons are gated by report type.');
        }
    }
}
