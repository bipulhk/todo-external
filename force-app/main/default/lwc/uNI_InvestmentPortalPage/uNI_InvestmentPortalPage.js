import { LightningElement, track, api, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { NavigationMixin, CurrentPageReference } from 'lightning/navigation';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';

// --- Apex (same sources as uNI_Incidentbutton for shared behavior) ---
import hasDraftIncident from '@salesforce/apex/uNI_IncidentTodoController.hasDraftIncident';
import getCurrentUserTitle from '@salesforce/apex/uNI_IncidentTodoController.getCurrentUserTitle';
import getGranteeStageInfo from '@salesforce/apex/uNI_GADPortalHelper.getGranteeStageInfo';

// --- IndividualApplication fields for header display ---
import PROJECT_NAME from '@salesforce/schema/IndividualApplication.uNI_ProjectName__c';

export default class UNI_InvestmentPortalPage extends NavigationMixin(LightningElement) {
    _recordId;
    @track tabs = [];
    @track activeTab;
    _recordIdLogged = false;

    // --- Action menu state (mirrors uNI_Incidentbutton, excluding GAD stage buttons) ---
    @api buttonLabel = 'Report Incident';
    @api flowApiName = 'Incident_Reporting_Flow';
    @api modalTitle = 'Report Incident';
    @api buttonLabel3 = 'Add Contributor';
    @api flowApiName3 = 'uNI_New_Contributor_and_User_Creation';

    @track showFlowModal = false;
    @track showFlowModal3 = false;
    @track showGenericModal = false;
    @track isAddContributorDisabled = false;
    @track isGrantee = false;
    @track isGranteeOrContributor = false;
    @track isInvestment = false;
    genericModalHeading = '';

    connectedCallback() {
        this.initTabs();
    }

    @api
    get recordId() {
        return this._recordId;
    }
    set recordId(value) {
        this._recordId = value;
        this._logRecordId('api');
        this.initTabs();
        this._refreshActionContext();
    }

    @wire(CurrentPageReference)
    getStateParameters(pageRef) {
        if (pageRef && pageRef.state) {
            const idFromState = pageRef.state.recordId || pageRef.state.c__recordId || pageRef.state.id || null;
            if (idFromState && idFromState !== this._recordId) {
                this._recordId = idFromState;
                this._logRecordId('state');
                this.initTabs();
                this._refreshActionContext();
            }
        }
        if (pageRef && pageRef.attributes && pageRef.attributes.recordId) {
            const idFromAttributes = pageRef.attributes.recordId;
            if (idFromAttributes && idFromAttributes !== this._recordId) {
                this._recordId = idFromAttributes;
                this._logRecordId('attributes');
                this.initTabs();
                this._refreshActionContext();
            }
        }
        if (!this._recordId && window.location.pathname) {
            const match = window.location.pathname.match(/\/([a-zA-Z0-9]{15,18})(?:\/|$)/);
            if (match) {
                this._recordId = match[1];
                this._logRecordId('path');
                this.initTabs();
                this._refreshActionContext();
            }
        }
    }

    get tabsForRender() {
        return this.tabs;
    }

    initTabs() {
        if (!this._recordId) {
            this._logRecordId('initTabs-missing');
            return;
        }
        const previousActiveId = this.activeTab && this.activeTab.id;
        this.tabs = [
            { id: 'tab1', label: 'Details', lwcName: 'uNIInvestmentOverviewPage', recordId: this._recordId },
            { id: 'tab2', label: 'Proposal', lwcName: 'c-u-n-i-investment-proposal', recordId: this._recordId },
            { id: 'tab3', label: 'GAD', lwcName: 'c-u-n-i-investment-gad', recordId: this._recordId },
            { id: 'tab4', label: 'Implementation', lwcName: 'c-u-n-i-investment-implementation', recordId: this._recordId }
        ];
        const resolvedActiveId = this.tabs.some(tab => tab.id === previousActiveId)
            ? previousActiveId
            : this.tabs[0].id;
        this.activeTab = this.tabs.find(tab => tab.id === resolvedActiveId) || this.tabs[0];
        this._applyTabClasses(resolvedActiveId);
    }

    handleTabClick(event) {
        const tabId = event.currentTarget.dataset.id;
        this.activeTab = this.tabs.find(tab => tab.id === tabId);
        this._applyTabClasses(tabId);
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

    _logRecordId(source) {
        if (this._recordIdLogged && source !== 'initTabs-missing') {
            return;
        }
        console.log('[uNI_InvestmentPortalPage] recordId', this._recordId, 'source=', source);
        if (this._recordId) {
            this._recordIdLogged = true;
        }
    }

    // ------------------------------
    // Action menu (Incidentbutton)
    // ------------------------------

    // Header display: Project Name from IndividualApplication.
    get recordIdForWire() {
        return this._recordId && /^[a-zA-Z0-9]{15,18}$/.test(this._recordId) ? this._recordId : undefined;
    }

    @wire(getRecord, { recordId: '$recordIdForWire', fields: [PROJECT_NAME] })
    projectRecord;

    get projectTitle() {
        const value = getFieldValue(this.projectRecord?.data, PROJECT_NAME);
        return value ? value : 'Investment Portal';
    }

    // Fetch user title to disable Add Contributor for Contributors (same as uNI_Incidentbutton).
    @wire(getCurrentUserTitle)
    wiredUserTitle({ error, data }) {
        if (data) {
            if (data === 'Contributor') {
                this.isAddContributorDisabled = true;
            }
        } else if (error) {
            console.error('Error fetching user title:', error);
            this.isAddContributorDisabled = true;
        }
    }

    // Action menu list (visibility rules match uNI_Incidentbutton, minus GAD stage actions).
    get actionMenuItems() {
        const items = [];

        // Add Contributor: visible for Grantee/Contributor users.
        if (this.isGranteeOrContributor) {
            items.push({
                label: this.buttonLabel3,
                value: 'addContributor',
                disabled: this.isAddContributorDisabled
            });
        }

        // Investment-only actions (same visibility as the buttons in uNI_Incidentbutton).
        if (this.isGranteeOrContributor && this.isInvestment) {
            items.push(
                { label: this.buttonLabel, value: 'reportIncident' },
                { label: 'Risk Register', value: 'riskRegister' },
                { label: 'Management Actions', value: 'managementActions' },
                { label: 'Reprogramming', value: 'reprogramming' },
                { label: 'Open Annual Report', value: 'openAnnualReport' }
            );
        }

        // Raise Disbursement Request: Grantee only (inside Investment context).
        if (this.isGrantee && this.isInvestment) {
            items.push({ label: 'Raise Disbursement Request', value: 'raiseDisbursement' });
        }

        return items;
    }

    get hasActionMenu() {
        return this.actionMenuItems.length > 0;
    }

    // Resolve the record id used by actions and flows.
    get effectiveRecordId() {
        return this._recordId || null;
    }

    // Flow inputs used by multiple action modals.
    get flowInputVariables() {
        return [
            {
                name: 'recordId',
                type: 'String',
                value: this.effectiveRecordId
            }
        ];
    }

    // Fetch draft incident status and GAD context for visibility checks.
    _refreshActionContext() {
        if (!this.effectiveRecordId) {
            return;
        }
        this._checkForDrafts();
        this._loadGadData();
    }

    _checkForDrafts() {
        if (!this.effectiveRecordId) {
            return;
        }
        hasDraftIncident({ individualApplicationId: this.effectiveRecordId })
            .then(result => {
                if (result) {
                    this.buttonLabel = 'Continue Reporting Incident';
                }
            })
            .catch(error => {
                console.error('Error checking for draft incidents:', error);
            });
    }

    _loadGadData() {
        if (!this.effectiveRecordId) {
            return;
        }
        getGranteeStageInfo({ recordId: this.effectiveRecordId })
            .then(result => {
                // Visibility logic copied from uNI_Incidentbutton (only fields needed here).
                this.isGrantee = (result.isGrantee == 'true' || result.isGrantee == true);

                const isContributor = (result.isContributor == 'true' || result.isContributor == true);
                this.isGranteeOrContributor = this.isGrantee || isContributor;

                this.isInvestment = (result.isInvestment == 'true' || result.isInvestment == true);
            })
            .catch(error => {
                console.error('Error fetching grantee info:', error);
            });
    }

    // Handle action menu selection (same actions as uNI_Incidentbutton).
    handleActionSelect(event) {
        const action = event.detail.value;
        switch (action) {
            case 'addContributor':
                this._handleAddContributor();
                break;
            case 'reportIncident':
                this._handleReportIncident();
                break;
            case 'riskRegister':
                this._handleOpenRiskRegister();
                break;
            case 'managementActions':
                this._handleOpenManagementActions();
                break;
            case 'reprogramming':
                this._handleOpenReprogrammingRequests();
                break;
            case 'openAnnualReport':
                this._handleOpenAnnualReport();
                break;
            case 'raiseDisbursement':
                this._handleCreateDisbursementRequest();
                break;
            default:
                break;
        }
    }

    // ------------------------------
    // Action handlers (from uNI_Incidentbutton)
    // ------------------------------

    _handleReportIncident() {
        if (!this.effectiveRecordId) {
            this._showToast('Record Id not found', 'This action requires an IndividualApplication record.', 'error');
            return;
        }
        this.showFlowModal = true;
    }

    _handleAddContributor() {
        if (!this.effectiveRecordId) {
            this._showToast('Record Id not found', 'This action requires an IndividualApplication record.', 'error');
            return;
        }
        this.showFlowModal3 = true;
    }

    closeModal() {
        this.showFlowModal = false;
        this.showFlowModal3 = false;
        window.location.reload();
    }

    handleStatusChange(evt) {
        const status = evt?.detail?.status;
        if (status === 'FINISHED' || status === 'FINISHED_SCREEN') {
            this.showFlowModal = false;
            this.showFlowModal3 = false;
        }
    }

    closeGenericModal() {
        this.showGenericModal = false;
        window.location.reload();
    }

    handleGenericModalStatusChange(evt) {
        const status = evt?.detail?.status;
        if (status === 'FINISHED' || status === 'FINISHED_SCREEN') {
            this.showFlowModal = false;
            this.showFlowModal3 = false;
            this.showGenericModal = false;
        }
    }

    _handleOpenRiskRegister() {
        if (!this.effectiveRecordId) {
            this._showToast('Record Id not found', 'Cannot open Risk Register without a record Id.', 'error');
            return;
        }

        // Community-relative URL (same as uNI_Incidentbutton).
        const url = '/s/risk-register?recordId=' + this.effectiveRecordId;
        this[NavigationMixin.GenerateUrl]({
            type: 'standard__webPage',
            attributes: { url }
        }).then((generatedUrl) => {
            window.open(generatedUrl, '_blank');
        });
    }

    _handleOpenManagementActions() {
        if (!this.effectiveRecordId) {
            this._showToast('Record Id not found', 'Cannot open Management Actions without a record Id.', 'error');
            return;
        }

        const url = '/s/management-actions?recordId=' + this.effectiveRecordId;
        this[NavigationMixin.GenerateUrl]({
            type: 'standard__webPage',
            attributes: { url }
        }).then((generatedUrl) => {
            window.open(generatedUrl, '_blank');
        });
    }

    _handleOpenReprogrammingRequests() {
        if (!this.effectiveRecordId) {
            this._showToast('Record Id not found', 'Cannot open Reprogramming Requests without a record Id.', 'error');
            return;
        }

        const url = '/s/reprogramming-requests?recordId=' + this.effectiveRecordId;
        this[NavigationMixin.GenerateUrl]({
            type: 'standard__webPage',
            attributes: { url }
        }).then((generatedUrl) => {
            window.open(generatedUrl, '_blank');
        });
    }

    _handleCreateDisbursementRequest() {
        this.genericModalHeading = 'Create Disbursement Request';
        this.flowApiName3 = 'uNI_DisbursementRequestFlow';
        this.showGenericModal = true;
    }

    async _handleOpenAnnualReport() {
        if (!this.effectiveRecordId) {
            this._showToast('Record Id not found', 'Cannot open Annual Report without a record Id.', 'error');
            return;
        }

        const url = `/s/annual-report?recordId=${this.effectiveRecordId}`;
        try {
            const generatedUrl = await this[NavigationMixin.GenerateUrl]({
                type: 'standard__webPage',
                attributes: { url }
            });
            window.open(generatedUrl, '_blank');
        } catch (error) {
            this._showToast('Error Opening Annual Report', error?.body?.message || error.message, 'error');
        }
    }

    _showToast(title, message, variant) {
        this.dispatchEvent(
            new ShowToastEvent({
                title,
                message,
                variant
            })
        );
    }
}
