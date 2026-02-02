import { LightningElement, api, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';

import { NavigationMixin, CurrentPageReference } from 'lightning/navigation';
import hasDraftIncident from '@salesforce/apex/uNI_IncidentTodoController.hasDraftIncident';
import getCurrentUserTitle from '@salesforce/apex/uNI_IncidentTodoController.getCurrentUserTitle';
import findAnnualReportId from '@salesforce/apex/uNI_AnnualReportController.findAnnualReportId';

import ANNUAL_REPORT_NUMBER_FIELD from '@salesforce/schema/IndividualApplication.uNI_AnnualReportNumber__c';

import getGranteeStageInfo from '@salesforce/apex/uNI_GADPortalHelper.getGranteeStageInfo';

export default class UNI_Incidentbutton extends NavigationMixin(LightningElement) {
    @api buttonLabel = 'Report Incident';
    @api buttonVariant = 'brand';
    @api flowApiName = 'Incident_Reporting_Flow';
    @api modalTitle = 'Incident Flow';
    @api buttonLabel3 = 'Add Contributor';
    @api flowApiName3 = 'uNI_New_Contributor_and_User_Creation';
    @track showFlowModal3 = false;
    @track isAddContributorDisabled = false;
    @api recordId;
    @track isGrantee = false;
    @track isGranteeOrContributor = false;
    @track gad_stage;
    @track gad_showFlowModal = false;
    currentFlowToBeRun;
    showStage2Button = false;
    showStage3Button = false;
    showStage4Button = false;
    showEbVoteButton = false;
    isGAD = false;
    isInvestment=false;
    showRaiseDisbursementRequestButton = true;
    showPRCReviewButton = false;
    showGenericModal=false;
    genericModalHeading='';

    @track showFlowModal = false;
    _recordIdFromPage;



closeGenericModal(){
    this.showGenericModal=false;
     window.location.reload();
}

handleGenericModalStatusChange(){
     const status = evt?.detail?.status;
        if (status === 'FINISHED' || status === 'FINISHED_SCREEN') {
            this.showFlowModal = false;
            this.showFlowModal3 = false;
            this.showGenericModal=false;
        }
}




@wire(CurrentPageReference)
    getStateParameters(pageRef) {
        console.log(' get state paramter started ');
        // 1. Resolve the Record ID from the Page URL or State
        if (pageRef && pageRef.state) {
            this._recordIdFromPage =
                pageRef.state.recordId ||
                pageRef.state.c__recordId ||
                pageRef.state.id ||
                null;
        }

        // 2. If not in state, look at the URL string manually
        if (!this._recordIdFromPage && window.location.pathname) {
            const regex = /\/individualapplication\/([a-zA-Z0-9]{15,18})(?:\/|$)/;
            const match = window.location.pathname.match(regex);
            if (match) {
                this._recordIdFromPage = match[1];
            }
        }

        // 3. Existing Incident Check
        this.checkForDrafts();
        
        // 4. CRITICAL: Load GAD Data (This makes the buttons hide/show)
        console.log('calling gad data ');
        console.log('componenet loaded.  ');

        this.loadGadData(); 
    }

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

     
    @wire(getRecord, { recordId: '$effectiveRecordId', fields: [ANNUAL_REPORT_NUMBER_FIELD] })
    iaRecord;

    // Getter for annual report number
    get annualReportNumber() {
        return getFieldValue(this.iaRecord.data, ANNUAL_REPORT_NUMBER_FIELD);
    }


    checkForDrafts() {
        if (this.effectiveRecordId) {
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
    }

    get effectiveRecordId() {
        return this.recordId || this._recordIdFromPage || null;
    }

    get flowInputVariables() {
        return [
            {
                name: 'recordId',
                type: 'String',
                value: this.effectiveRecordId
            }
        ];
    }

    handleLaunch() {
        if (!this.effectiveRecordId) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Record Id not found',
                    message: 'This button must be placed on an IndividualApplication record page.',
                    variant: 'error'
                })
            );
            return;
        }
        this.showFlowModal = true;
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

    handleLaunch3() {
        if (!this.effectiveRecordId) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Record Id not found',
                    message: 'This button must be placed on an IndividualApplication record page.',
                    variant: 'error'
                })
            );
            return;
        }
        this.showFlowModal3 = true;
    }

    get effectiveRecordId() {
        return this.recordId || this._recordIdFromPage || null;
    }

    handleOpenRiskRegister() {
        if (!this.effectiveRecordId) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Record Id not found',
                    message: 'Cannot open Risk Register without a record Id.',
                    variant: 'error'
                })
            );
            return;
        }

        // Build the correct community-relative URL
        const url = '/s/risk-register?recordId=' + this.effectiveRecordId;

        // Use NavigationMixin to resolve the full community URL
        this[NavigationMixin.GenerateUrl]({
            type: 'standard__webPage',
            attributes: { url }
        }).then((generatedUrl) => {
            // Open in a new browser tab
            window.open(generatedUrl, '_blank');
        });
    }

    handleOpenManagementActions() {
        if (!this.effectiveRecordId) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Record Id not found',
                    message: 'Cannot open Management Actions without a record Id.',
                    variant: 'error'
                })
            );
            return;
        }

        // Build the correct community-relative URL
        const url = '/s/management-actions?recordId=' + this.effectiveRecordId;

        // Resolve and open in new tab
        this[NavigationMixin.GenerateUrl]({
            type: 'standard__webPage',
            attributes: { url }
        }).then((generatedUrl) => {
            window.open(generatedUrl, '_blank');
        });
    }

    handleOpenReprogrammingRequests() {
        if (!this.effectiveRecordId) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Record Id not found',
                    message: 'Cannot open Reprogramming Requests without a record Id.',
                    variant: 'error'
                })
            );
            return;
        }

        // Build the correct community-relative URL
        const url = '/s/reprogramming-requests?recordId=' + this.effectiveRecordId;

        // Resolve and open in new tab
        this[NavigationMixin.GenerateUrl]({
            type: 'standard__webPage',
            attributes: { url }
        }).then((generatedUrl) => {
            window.open(generatedUrl, '_blank');
        });
    }

    handleCreateDisbursementRequest(){
        this.genericModalHeading='Create Disbursement Request';
        this.flowApiName3='uNI_DisbursementRequestFlow';
        this.showGenericModal=true;
    }


    async handleOpenAnnualReport() {
        /* Previous logic kept for reference:
        this.isLoading = true;
        try {
            const arId = await findAnnualReportId({
                individualApplicationId: this.effectiveRecordId,
                reportNumber: this.annualReportNumber
            });

            if (arId) {
                this[NavigationMixin.Navigate]({
                    type: 'standard__recordPage',
                    attributes: {
                        recordId: arId,
                        objectApiName: 'Annual_Report__c',
                        actionName: 'view'
                    }
                });
            } else {
                this.dispatchEvent(new ShowToastEvent({
                    title: 'No Annual Report Found',
                    message: `No Annual Report found for Report #${this.annualReportNumber}.`,
                    variant: 'warning'
                }));
            }
        } catch (error) {
            this.dispatchEvent(new ShowToastEvent({
                title: 'Error Opening Annual Report',
                message: error?.body?.message || error.message,
                variant: 'error'
            }));
        } finally {
            this.isLoading = false;
        }
        */

        if (!this.effectiveRecordId) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Record Id not found',
                    message: 'Cannot open Annual Report without a record Id.',
                    variant: 'error'
                })
            );
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
            this.dispatchEvent(new ShowToastEvent({
                title: 'Error Opening Annual Report',
                message: error?.body?.message || error.message,
                variant: 'error'
            }));
        }
    }

 /*   loadGadData() {
        if (!this.effectiveRecordId) return;

        getGranteeStageInfo({ recordId: this.effectiveRecordId })
            .then(result => {
                this.isGrantee = (result.isGrantee == 'true' || result.isGrantee == true);
                
                const isContributor = (result.isContributor == 'true' || result.isContributor == true);
                this.isGranteeOrContributor = this.isGrantee || isContributor;

                this.isGAD = (result.isGAD == 'true' || result.isGAD == true);
                this.gad_stage = result.stage;

                this.showStage2Button = this.isGranteeOrContributor && ((this.gad_stage === 'Stage 2' && !result.uNI_IsStage2PackageSubmitted__c) || this.convertValueToBoolean(result.uNI_ResubmitStage2Package__c));
                this.showStage3Button = this.isGranteeOrContributor && (this.gad_stage === 'Stage 3' && !result.uNI_IsStage3PackageSubmitted__c);
                this.showStage4Button = this.isGranteeOrContributor && (this.gad_stage === 'Stage 4' && !result.uNI_IsStage4PackageSubmitted__c);

                this.showEbVoteButton = result.isPendingEbVote; 
                this.showPRCReviewButton = result.IsUserPRCAndOwner && result.IsUserPRCLead;
            })
            .catch(error => {
                console.error('Error fetching grantee info:', error);
            });
    } */
    loadGadData() {
        // LOG 1: Check if function is triggering and sees an ID
        console.log('%c DEBUG 1: loadGadData started. effectiveRecordId: ' + this.effectiveRecordId, 'background: #222; color: #bada55');

        if (!this.effectiveRecordId) {
            console.log('DEBUG: No record ID found, stopping GAD check.');
            return;
        }

        getGranteeStageInfo({ recordId: this.effectiveRecordId })
            .then(result => {
                // LOG 2: See exactly what Apex returns
                console.log('%c DEBUG 2: Full API Result: ', 'background: #222; color: #bada55', JSON.stringify(result));
                console.log(
                    '%c DEBUG 2.1: User context => userEmail=' +
                        result.userEmail +
                        ', isGrantee=' +
                        result.isGrantee +
                        ', isContributor=' +
                        result.isContributor,
                    'background: #111827; color: #fbbf24'
                );
                
                // Logic
                this.isGrantee = (result.isGrantee == 'true' || result.isGrantee == true);
                
                const isContributor = (result.isContributor == 'true' || result.isContributor == true);
                this.isGranteeOrContributor = this.isGrantee || isContributor;

                this.isGAD = (result.isGAD == 'true' || result.isGAD == true);
                this.isInvestment=(result.isInvestment == 'true' || result.isInvestment == true);
                this.gad_stage = result.stage;

                // LOG 3: See what the system thinks isGAD is after calculation
                console.log('%c DEBUG 3: Final isGAD Value: ' + this.isGAD, 'background: red; color: white');
                console.log(
                    '%c DEBUG 3.1: Reprogramming button visibility => isGranteeOrContributor=' +
                        this.isGranteeOrContributor +
                        ', isInvestment=' +
                        this.isInvestment +
                        ', visible=' +
                        (this.isGranteeOrContributor && this.isInvestment),
                    'background: #1f2937; color: #f9fafb'
                );
                console.log(
                    '%c DEBUG 3.2: Incident button visibility => isGranteeOrContributor=' +
                        this.isGranteeOrContributor +
                        ', isInvestment=' +
                        this.isInvestment +
                        ', showIncidentButton=' +
                        (this.isGranteeOrContributor && this.isInvestment),
                    'background: #0f172a; color: #38bdf8'
                );

                // Button visibility logic
                this.showStage2Button = this.isGranteeOrContributor && ((this.gad_stage === 'Stage 2' && !result.uNI_IsStage2PackageSubmitted__c) || this.convertValueToBoolean(result.uNI_ResubmitStage2Package__c));
                this.showStage3Button = this.isGranteeOrContributor && (this.gad_stage === 'Stage 3' && !result.uNI_IsStage3PackageSubmitted__c);
                this.showStage4Button = this.isGranteeOrContributor && (this.gad_stage === 'Stage 4' && !result.uNI_IsStage4PackageSubmitted__c);

                this.showEbVoteButton = result.isPendingEbVote; 
                this.showPRCReviewButton = result.IsUserPRCAndOwner && result.IsUserPRCLead;
            })
            .catch(error => {
                // LOG 4: Check for errors
                console.error('DEBUG ERROR: Error fetching grantee info:', error);
            });
    }

    convertValueToBoolean(variable){
        if(variable=='true'|| variable==true){
            return true;
        }
        if(variable=='false'||variable==false){
            return false;
        }
        return false;
    }

    handleFlowLaunch_GAD() {
        this.currentFlowToBeRun= 'uNI_GADApprovalFlow';
        this.gad_showFlowModal=true;
    }

    handleEBVoteFlowLaunch_GAD(){
        this.currentFlowToBeRun= 'uNI_GADEBReview';
        this.gad_showFlowModal=true;
    }

    handleRaiseDisbursement_GAD(){
         this.currentFlowToBeRun= 'uNI_DisbursementRequestFlow';
        this.gad_showFlowModal=true;
    }

    handlePRCFeedbackLaunch_GAD(){
        this.currentFlowToBeRun= 'uNI_GADPRCReview';
        this.gad_showFlowModal=true;
    }

    cancelFlowSubmit_GAD(){
        this.gad_showFlowModal=false;
    }

    handleGadStatusChange(event) {
        if (event.detail.status === "FINISHED_SCREEN"|| event.detail.status === "FINISHED") {
            this.gad_showFlowModal = false;
        }
    }

}
