// import { LightningElement } from 'lwc';

import { LightningElement, api, wire, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';
import { getObjectInfo } from 'lightning/uiObjectInfoApi';
import userId from '@salesforce/user/Id';

// --- FUNDING OPPORTUNITY FIELDS ---
import Status from '@salesforce/schema/FundingOpportunity.Status';
import uNI_AmiActionOnwer__c from '@salesforce/schema/FundingOpportunity.uNI_AmiActionOnwer__c';
import uNI_AmIGAM__c from '@salesforce/schema/FundingOpportunity.uNI_AmIGAM__c'; // FO GAM
import uNI_AmILeadAuthor__c from '@salesforce/schema/FundingOpportunity.uNI_AmILeadAuthor__c';
import uNI_AmIDirector__c from '@salesforce/schema/FundingOpportunity.uNI_AmIDirector__c';
import uNI_Assessment_Status__c from '@salesforce/schema/FundingOpportunity.uNI_Assessment_Status__c';
import Status__c from '@salesforce/schema/FundingOpportunity.Status__c';
import uNI_GrantApplicationManager__c from '@salesforce/schema/FundingOpportunity.uNI_GrantApplicationManager__c';
import uNI_DelegatedGAM__c from '@salesforce/schema/FundingOpportunity.uNI_DelegatedGAM__c';
import uNI_AmiInvitedReviewer__c from '@salesforce/schema/FundingOpportunity.uNI_AmiInvitedReviewer__c';
import uNI_AcceptedReviewer__c from '@salesforce/schema/FundingOpportunity.uNI_AcceptedReviewer__c';
import uNI_Director_Comments__c from '@salesforce/schema/FundingOpportunity.uNI_Director_Comments__c';
import uNI_StrategyComment__c from '@salesforce/schema/FundingOpportunity.uNI_StrategyComment__c';
import uNI_AMiSL__c from '@salesforce/schema/FundingOpportunity.uNI_AmISL__c';

// --- INDIVIDUAL APPLICATION FIELDS ---
import RT_DevName from '@salesforce/schema/IndividualApplication.RecordType.DeveloperName';
import IA_RecordTypeId from '@salesforce/schema/IndividualApplication.RecordTypeId';
import IA_Status from '@salesforce/schema/IndividualApplication.Status';
import IA_AmIGAM from '@salesforce/schema/IndividualApplication.uNI_AmIGAM__c'; // Alias for IA GAM
import uNI_InvestmentStatus__c from '@salesforce/schema/IndividualApplication.uNI_InvestmentStatus__c';
import uNI_ClosureInitiated__c from '@salesforce/schema/IndividualApplication.uNI_ClosureInitiated__c';
import uNI_isLogframeCreated__c from '@salesforce/schema/IndividualApplication.uNI_isLogframeCreated__c';
import uNI_IsQuestionFinalizedInCFP__c from '@salesforce/schema/IndividualApplication.uNI_IsQuestionFinalizedInCFP__c';
import uNI_AllL1QuestionAnswered__c from '@salesforce/schema/IndividualApplication.uNI_AllL1QuestionAnswered__c';
import uNI_AllL2QuestionsAnswered__c from '@salesforce/schema/IndividualApplication.uNI_AllL2QuestionsAnswered__c';
import uNI_AllL3SecAnswered__c from '@salesforce/schema/IndividualApplication.uNI_AllL3SecAnswered__c';
import uNI_AllL3PrcAnswered__c from '@salesforce/schema/IndividualApplication.uNI_AllL3PrcAnswered__c';
import uNI_JRCReviewCompleted__c from '@salesforce/schema/IndividualApplication.uNI_JRCReviewCompleted__c';
import uNI_Stage__c from '@salesforce/schema/IndividualApplication.uNI_Stage__c';
import uNI_IsUserPMOrPO__c from '@salesforce/schema/IndividualApplication.uNI_IsUserPMOrPO__c';
import uNI_IsUserPM__c from '@salesforce/schema/IndividualApplication.uNI_IsUserPM__c';
import uNI_IsUserPO__c from '@salesforce/schema/IndividualApplication.uNI_IsUserPO__c';
import uNI_CurrentActionOwner__c from '@salesforce/schema/IndividualApplication.uNI_CurrentActionOwner__c';
import uNI_IsStage3PackageSubmitted__c from '@salesforce/schema/IndividualApplication.uNI_IsStage3PackageSubmitted__c';
import uNI_IsStage3PTPackageSubmitted__c from '@salesforce/schema/IndividualApplication.uNI_IsStage3PTPackageSubmitted__c';
import uNI_OMTReviewerIds__c from '@salesforce/schema/IndividualApplication.uNI_OMTReviewerIds__c';
import uNI_IsPRCReviewStarted__c from '@salesforce/schema/IndividualApplication.uNI_IsPRCReviewStarted__c';
import uNI_IsStage3FilesSelected__c from '@salesforce/schema/IndividualApplication.uNI_IsStage3FilesSelected__c';
import uNI_OMTReviewStatus__c from '@salesforce/schema/IndividualApplication.uNI_OMTReviewStatus__c';
import uNI_PRCReviewStatus__c from '@salesforce/schema/IndividualApplication.uNI_PRCReviewStatus__c';
import uNI_IsUserPT__c from '@salesforce/schema/IndividualApplication.uNI_IsUserPT__c';
import uNI_ResubmitStage2Package__c from '@salesforce/schema/IndividualApplication.uNI_ResubmitStage2Package__c';
import uNI_IsStage2PackageSubmitted__c from '@salesforce/schema/IndividualApplication.uNI_IsStage2PackageSubmitted__c';
import uNI_isPRCReviewDateConfirmed__c from '@salesforce/schema/IndividualApplication.uNI_isPRCReviewDateConfirmed__c';
import uNI_isOMTReviewDateConfirmed__c from '@salesforce/schema/IndividualApplication.uNI_isOMTReviewDateConfirmed__c';
import uNI_IsStage1PackageSubmitted__c from '@salesforce/schema/IndividualApplication.uNI_IsStage1PackageSubmitted__c';
import uNI_IsIKOCompleted__c from '@salesforce/schema/IndividualApplication.uNI_IsIKOCompleted__c';
import uNI_isProjectTeamIdentified__c from '@salesforce/schema/IndividualApplication.uNI_isProjectTeamIdentified__c';
import uNI_isGadTimelineDeveloped__c from '@salesforce/schema/IndividualApplication.uNI_isGadTimelineDeveloped__c';
import uNI_IsProjectParameterCreatedForGAD__c from '@salesforce/schema/IndividualApplication.uNI_IsProjectParameterCreatedForGAD__c';
import uNI_IsEKOCompleted__c from '@salesforce/schema/IndividualApplication.uNI_IsEKOCompleted__c';
import uNI_SupplierRegistrationStatus__c from '@salesforce/schema/IndividualApplication.uNI_SupplierRegistrationStatus__c';
import uNI_IsSupplierNumberProcessComplete__c from '@salesforce/schema/IndividualApplication.uNI_IsSupplierNumberProcessComplete__c';
import uNI_IsCapacityAssessmentStarted__c from '@salesforce/schema/IndividualApplication.uNI_IsCapacityAssessmentStarted__c';
import uNI_IsCapacitySkipped__c from '@salesforce/schema/IndividualApplication.uNI_IsCapacitySkipped__c';
import uNI_Show_Request_FENSA_Assessment__c from '@salesforce/schema/IndividualApplication.uNI_Show_Request_FENSA_Assessment__c';
import uNI_CurrentRiskRegisterVersion__c from '@salesforce/schema/IndividualApplication.uNI_CurrentRiskRegisterVersion__c';
import uNI_IsPPFStarted__c from '@salesforce/schema/IndividualApplication.uNI_IsPPFStarted__c';
import uNI_IsPPFskipped__c from '@salesforce/schema/IndividualApplication.uNI_IsPPFskipped__c';
// --- ADD THESE NEW IMPORTS ---
import uNI_IsStage4PTPackageSubmitted__c from '@salesforce/schema/IndividualApplication.uNI_IsStage4PTPackageSubmitted__c';
import uNI_IsStage4PackageSubmitted__c from '@salesforce/schema/IndividualApplication.uNI_IsStage4PackageSubmitted__c';
import uNI_HasAllPTClearedSMTPackage__c from '@salesforce/schema/IndividualApplication.uNI_HasAllPTClearedSMTPackage__c';
import uNI_IsApprovedbyDirectorPD__c from '@salesforce/schema/IndividualApplication.uNI_IsApprovedbyDirectorPD__c';
import uNI_IsApprovedBySeniorLegalOfficer__c from '@salesforce/schema/IndividualApplication.uNI_IsApprovedBySeniorLegalOfficer__c';
import uNI_IsUserSelectedSMT__c from '@salesforce/schema/IndividualApplication.uNI_IsUserSelectedSMT__c';
import uNI_IsSMTReviewStopped__c from '@salesforce/schema/IndividualApplication.uNI_IsSMTReviewStopped__c';
import uNI_EDOutcome__c from '@salesforce/schema/IndividualApplication.uNI_EDOutcome__c';
import uNI_IsEBRequiredDecisionTaken__c from '@salesforce/schema/IndividualApplication.uNI_IsEBRequiredDecisionTaken__c';
import uNI_EBVoteRequiredOrNot__c from '@salesforce/schema/IndividualApplication.uNI_EBVoteRequiredOrNot__c';
import uNI_IsGADCancelled__c from '@salesforce/schema/IndividualApplication.uNI_IsGADCancelled__c';
import uNI_IsEBReviewDone__c from '@salesforce/schema/IndividualApplication.uNI_IsEBReviewDone__c';
import uNI_IsEBReviewStarted__c from '@salesforce/schema/IndividualApplication.uNI_IsEBReviewStarted__c';
import uNI_IsUserGAM__c from '@salesforce/schema/IndividualApplication.uNI_IsUserGAM__c';
import uNI_IsUserDirectorPD__c from '@salesforce/schema/IndividualApplication.uNI_IsUserDirectorPD__c';
import uNI_IsUserED__c from '@salesforce/schema/IndividualApplication.uNI_IsUserED__c';
import uNI_IsUserEDAssistant__c from '@salesforce/schema/IndividualApplication.uNI_IsUserEDAssistant__c';
import uNI_IsStage1Defined__c from '@salesforce/schema/IndividualApplication.uNI_isStage1Defined__c';
import uNI_isStage2Defined__c from '@salesforce/schema/IndividualApplication.uNI_isStage2Defined__c';
import uNI_IsUserCurrentActionOwner__c from '@salesforce/schema/IndividualApplication.uNI_IsUserCurrentActionOwner__c';
import uNI_IsUserThirdactionPending__c from '@salesforce/schema/IndividualApplication.uNI_IsUserThirdactionPending__c';
import uNI_IsSubmittedByDirectorAndLegal__c from '@salesforce/schema/IndividualApplication.uNI_IsSubmittedByDirectorAndLegal__c';
import uNI_IsUserSecondaryActionPending__c from '@salesforce/schema/IndividualApplication.uNI_IsUserSecondaryActionPending__c';
import uNI_SecondaryActionOwner__c from '@salesforce/schema/IndividualApplication.uNI_SecondaryActionOwner__c';


// --- REPROGRAMMING REQUEST FIELDS ---
import RR_uNI_Status__c from '@salesforce/schema/uNI_ReprogrammingRequest__c.uNI_Status__c';
import RR_uNI_CurrentActionOwner__c from '@salesforce/schema/uNI_ReprogrammingRequest__c.uNI_CurrentActionOwner__c';
import RR_uNI_EBVoteRequiredOrNot__c from '@salesforce/schema/uNI_ReprogrammingRequest__c.uNI_EBVoteRequiredOrNot__c';
import RR_uNI_EDOutcome__c from '@salesforce/schema/uNI_ReprogrammingRequest__c.uNI_EDOutcome__c';
import RR_uNI_HasAllPTClearedSMTPackage__c from '@salesforce/schema/uNI_ReprogrammingRequest__c.uNI_HasAllPTClearedSMTPackage__c';
import RR_uNI_IsApprovedBySeniorLegalOfficer__c from '@salesforce/schema/uNI_ReprogrammingRequest__c.uNI_IsApprovedBySeniorLegalOfficer__c';
import RR_uNI_IsApprovedbyDirectorPD__c from '@salesforce/schema/uNI_ReprogrammingRequest__c.uNI_IsApprovedbyDirectorPD__c';
import RR_uNI_IsEBRequiredDecisionTaken__c from '@salesforce/schema/uNI_ReprogrammingRequest__c.uNI_IsEBRequiredDecisionTaken__c';
import RR_uNI_IsEBReviewDone__c from '@salesforce/schema/uNI_ReprogrammingRequest__c.uNI_IsEBReviewDone__c';
import RR_uNI_IsEBReviewStarted__c from '@salesforce/schema/uNI_ReprogrammingRequest__c.uNI_IsEBReviewStarted__c';
import RR_uNI_IsPRCReviewStarted__c from '@salesforce/schema/uNI_ReprogrammingRequest__c.uNI_IsPRCReviewStarted__c';
import RR_uNI_IsSMTReviewStopped__c from '@salesforce/schema/uNI_ReprogrammingRequest__c.uNI_IsSMTReviewStopped__c';
import RR_uNI_IsStage1PackageSubmitted__c from '@salesforce/schema/uNI_ReprogrammingRequest__c.uNI_IsStage1PackageSubmitted__c';
import RR_uNI_IsStage2PackageSubmitted__c from '@salesforce/schema/uNI_ReprogrammingRequest__c.uNI_IsStage2PackageSubmitted__c';
import RR_uNI_IsStage3FilesSelected__c from '@salesforce/schema/uNI_ReprogrammingRequest__c.uNI_IsStage3FilesSelected__c';
import RR_uNI_IsStage3PTPackageSubmitted__c from '@salesforce/schema/uNI_ReprogrammingRequest__c.uNI_IsStage3PTPackageSubmitted__c';
import RR_uNI_IsStage3PackageSubmitted__c from '@salesforce/schema/uNI_ReprogrammingRequest__c.uNI_IsStage3PackageSubmitted__c';
import RR_uNI_IsStage4PTPackageSubmitted__c from '@salesforce/schema/uNI_ReprogrammingRequest__c.uNI_IsStage4PTPackageSubmitted__c';
import RR_uNI_IsStage4PackageSubmitted__c from '@salesforce/schema/uNI_ReprogrammingRequest__c.uNI_IsStage4PackageSubmitted__c';
import RR_uNI_OMTReviewStatus__c from '@salesforce/schema/uNI_ReprogrammingRequest__c.uNI_OMTReviewStatus__c';
import RR_uNI_OMTReviewerIds__c from '@salesforce/schema/uNI_ReprogrammingRequest__c.uNI_OMTReviewerIds__c';
import RR_uNI_PRCReviewStatus__c from '@salesforce/schema/uNI_ReprogrammingRequest__c.uNI_PRCReviewStatus__c';
import RR_uNI_ResubmitStage2Package__c from '@salesforce/schema/uNI_ReprogrammingRequest__c.uNI_ResubmitStage2Package__c';
import RR_uNI_SecondaryActionOwner__c from '@salesforce/schema/uNI_ReprogrammingRequest__c.uNI_SecondaryActionOwner__c';
import RR_uNI_Stage__c from '@salesforce/schema/uNI_ReprogrammingRequest__c.uNI_Stage__c';
import RR_uNI_isOMTReviewDateConfirmed__c from '@salesforce/schema/uNI_ReprogrammingRequest__c.uNI_isOMTReviewDateConfirmed__c';
import RR_uNI_isPRCReviewDateConfirmed__c from '@salesforce/schema/uNI_ReprogrammingRequest__c.uNI_isPRCReviewDateConfirmed__c';
import RR_uNI_isStage1Defined__c from '@salesforce/schema/uNI_ReprogrammingRequest__c.uNI_isStage1Defined__c';
import RR_uNI_IsSubmittedbyDirectorAndLegal__c from '@salesforce/schema/uNI_ReprogrammingRequest__c.uNI_IsSubmittedbyDirectorAndLegal__c';
import RR_uNI_IsProjectParameterCreatedForRep__c from '@salesforce/schema/uNI_ReprogrammingRequest__c.uNI_IsProjectParameterCreatedForRep__c';
import RR_uNI_IsUserActionOwner__c from '@salesforce/schema/uNI_ReprogrammingRequest__c.uNI_IsUserActionOwner__c';
import RR_uNI_IsUserPMOrPO__c from '@salesforce/schema/uNI_ReprogrammingRequest__c.uNI_IsUserPMOrPO__c';
import RR_uNI_IsUserSecondaryOwner__c from '@salesforce/schema/uNI_ReprogrammingRequest__c.uNI_IsUserSecondaryOwner__c';
import RR_RT_DevName from '@salesforce/schema/uNI_ReprogrammingRequest__c.RecordType.DeveloperName';
import RR_RecordTypeId from '@salesforce/schema/uNI_ReprogrammingRequest__c.RecordTypeId';
import IA_OBJECT from '@salesforce/schema/IndividualApplication';
import RR_OBJECT from '@salesforce/schema/uNI_ReprogrammingRequest__c';
import PROFILE_NAME from '@salesforce/schema/User.Profile.Name';

// --- USER FIELDS ---
import USER_TITLE from '@salesforce/schema/User.Title';

// Toggle this for browser console logs (not an @api input).
const DEBUG = true;
const IA_RECORDTYPE_DEVNAMES = {
    GAD: 'uNI_GAD',
    INVESTMENT: 'uNI_Investment1',
    PROPOSAL: 'uNI_ProposalApplication'
};
const RR_RECORDTYPE_DEVNAMES = {
    MATERIAL_EB: 'uNI_MaterialEB'
};

const FO_RECORD_FIELDS = [
    uNI_AmiActionOnwer__c,
    Status,
    uNI_Assessment_Status__c,
    uNI_AmIGAM__c,
    uNI_AmIDirector__c,
    uNI_AmiInvitedReviewer__c,
    uNI_AmILeadAuthor__c,
    Status__c,
    uNI_GrantApplicationManager__c,
    uNI_DelegatedGAM__c,
    uNI_AcceptedReviewer__c,
    uNI_Director_Comments__c,
    uNI_StrategyComment__c,
    uNI_AMiSL__c
];

const IA_RECORD_FIELDS = [
    IA_RecordTypeId,
    RT_DevName,
    IA_Status,
    IA_AmIGAM,
    uNI_InvestmentStatus__c,
    uNI_ClosureInitiated__c,
    uNI_isLogframeCreated__c,
    uNI_IsQuestionFinalizedInCFP__c,
    uNI_Stage__c,
    uNI_IsUserPMOrPO__c,
    uNI_IsUserPM__c,
    uNI_IsUserPO__c,
    uNI_CurrentActionOwner__c,
    uNI_IsStage3PackageSubmitted__c,
    uNI_IsStage3PTPackageSubmitted__c,
    uNI_OMTReviewerIds__c,
    uNI_IsPRCReviewStarted__c,
    uNI_IsStage3FilesSelected__c,
    uNI_OMTReviewStatus__c,
    uNI_PRCReviewStatus__c,
    uNI_IsUserPT__c,
    uNI_ResubmitStage2Package__c,
    uNI_IsStage2PackageSubmitted__c,
    uNI_isPRCReviewDateConfirmed__c,
    uNI_isOMTReviewDateConfirmed__c,
    uNI_IsStage1PackageSubmitted__c,
    uNI_IsIKOCompleted__c,
    uNI_isProjectTeamIdentified__c,
    uNI_isGadTimelineDeveloped__c,
    uNI_IsProjectParameterCreatedForGAD__c,
    uNI_IsEKOCompleted__c,
    uNI_SupplierRegistrationStatus__c,
    uNI_IsSupplierNumberProcessComplete__c,
    uNI_IsCapacityAssessmentStarted__c,
    uNI_IsCapacitySkipped__c,
    uNI_Show_Request_FENSA_Assessment__c,
    uNI_CurrentRiskRegisterVersion__c,
    uNI_IsPPFStarted__c,
    uNI_IsPPFskipped__c,
    uNI_IsStage4PTPackageSubmitted__c,
    uNI_IsStage4PackageSubmitted__c,
    uNI_HasAllPTClearedSMTPackage__c,
    uNI_IsApprovedbyDirectorPD__c,
    uNI_IsApprovedBySeniorLegalOfficer__c,
    uNI_IsUserSelectedSMT__c,
    uNI_IsSMTReviewStopped__c,
    uNI_EDOutcome__c,
    uNI_IsEBRequiredDecisionTaken__c,
    uNI_EBVoteRequiredOrNot__c,
    uNI_IsGADCancelled__c,
    uNI_IsEBReviewDone__c,
    uNI_IsEBReviewStarted__c,
    uNI_IsUserGAM__c,
    uNI_IsUserDirectorPD__c,
    uNI_IsUserED__c,
    uNI_IsUserEDAssistant__c,
    uNI_IsStage1Defined__c,
    uNI_isStage2Defined__c,
    uNI_IsUserCurrentActionOwner__c,
    uNI_IsSubmittedByDirectorAndLegal__c,
    uNI_IsUserSecondaryActionPending__c,
    uNI_SecondaryActionOwner__c,
    uNI_AllL1QuestionAnswered__c,
    uNI_AllL2QuestionsAnswered__c,
    uNI_AllL3SecAnswered__c,
    uNI_AllL3PrcAnswered__c,
    uNI_JRCReviewCompleted__c
];

const RR_RECORD_FIELDS = [
    RR_RecordTypeId,
    RR_RT_DevName,
    RR_uNI_Status__c,
    RR_uNI_CurrentActionOwner__c,
    RR_uNI_EBVoteRequiredOrNot__c,
    RR_uNI_EDOutcome__c,
    RR_uNI_HasAllPTClearedSMTPackage__c,
    RR_uNI_IsApprovedBySeniorLegalOfficer__c,
    RR_uNI_IsApprovedbyDirectorPD__c,
    RR_uNI_IsEBRequiredDecisionTaken__c,
    RR_uNI_IsEBReviewDone__c,
    RR_uNI_IsEBReviewStarted__c,
    RR_uNI_IsPRCReviewStarted__c,
    RR_uNI_IsSMTReviewStopped__c,
    RR_uNI_IsStage1PackageSubmitted__c,
    RR_uNI_IsStage2PackageSubmitted__c,
    RR_uNI_IsStage3FilesSelected__c,
    RR_uNI_IsStage3PTPackageSubmitted__c,
    RR_uNI_IsStage3PackageSubmitted__c,
    RR_uNI_IsStage4PTPackageSubmitted__c,
    RR_uNI_IsStage4PackageSubmitted__c,
    RR_uNI_IsSubmittedbyDirectorAndLegal__c,
    RR_uNI_OMTReviewStatus__c,
    RR_uNI_OMTReviewerIds__c,
    RR_uNI_PRCReviewStatus__c,
    RR_uNI_ResubmitStage2Package__c,
    RR_uNI_SecondaryActionOwner__c,
    RR_uNI_Stage__c,
    RR_uNI_isOMTReviewDateConfirmed__c,
    RR_uNI_isPRCReviewDateConfirmed__c,
    RR_uNI_isStage1Defined__c,
    RR_uNI_IsProjectParameterCreatedForRep__c,
    RR_uNI_IsUserActionOwner__c,
    RR_uNI_IsUserPMOrPO__c,
    RR_uNI_IsUserSecondaryOwner__c
];


export default class UNI_ButtonListClone extends NavigationMixin(LightningElement) {

    _recordId;
    @api recordId;
    _objectApiName;
    

    @api
    get objectApiName() {
        return this._objectApiName;
    }
    set objectApiName(value) {
        this._objectApiName = value;
        if (this.isDebugEnabled()) {
            // eslint-disable-next-line no-console
            console.warn('@@ [uNI_ButtonListClone] objectApiName set', value);
        }
    }
    debug = DEBUG;
    hasRendered = false;

    @track isFlowOpen = false;
    @track isRecordForm = false;
    @track showFeedbackForm = false;

    @track selectedFlow;
    @track flowHeader = '';
    @track inputVariables = [];
    @track recordObjectApiName;
    @track recordFields = [];
    @track allmenus = [];
    @track currentUserTitle;
    @track currentUserProfile;
    iaRecordTypeById = {};
    rrRecordTypeById = {};
    recordData;

    @wire(getRecord, { recordId: userId, fields: [USER_TITLE, PROFILE_NAME] })
    wiredUser({ error, data }) {
        if (data) {
            this.currentUserTitle = getFieldValue(data, USER_TITLE);
            this.currentUserProfile = getFieldValue(data, PROFILE_NAME);
        }
    }

    connectedCallback() {
        // Use console.warn so it is visible even with console filters.
        // eslint-disable-next-line no-console
        console.warn('@@ [uNI_ButtonListClone] connected', {
            debug: this.debug,
            recordId: this.recordId,
            objectApiName: this.objectApiName
        });
    }

    renderedCallback() {
        if (this.hasRendered) {
            return;
        }
        this.hasRendered = true;
        // eslint-disable-next-line no-console
        console.warn('@@ [uNI_ButtonListClone] rendered', {
            recordId: this.recordId,
            objectApiName: this.objectApiName
        });
    }

    @wire(getObjectInfo, { objectApiName: IA_OBJECT })
    wiredIaObjectInfo({ data }) {
        if (data && data.recordTypeInfos) {
            this.iaRecordTypeById = {};
            Object.values(data.recordTypeInfos).forEach(info => {
                if (info && info.recordTypeId) {
                    this.iaRecordTypeById[info.recordTypeId] = info.developerName;
                }
            });
            if (this.recordData && this.objectApiName === 'IndividualApplication') {
                this.filterIndividualApplicationActions(this.recordData);
                this.allmenus = this.ACTION_CONFIG[this.objectApiName]?.menus || [];
            }
        }
    }

    @wire(getObjectInfo, { objectApiName: RR_OBJECT })
    wiredRrObjectInfo({ data }) {
        if (data && data.recordTypeInfos) {
            this.rrRecordTypeById = {};
            Object.values(data.recordTypeInfos).forEach(info => {
                if (info && info.recordTypeId) {
                    this.rrRecordTypeById[info.recordTypeId] = info.developerName;
                }
            });
            if (this.recordData && this.objectApiName === 'uNI_ReprogrammingRequest__c') {
                this.filterReprogrammingActions(this.recordData);
                this.allmenus = this.ACTION_CONFIG[this.objectApiName]?.menus || [];
            }
        }
    }

    // 🔹 CENTRAL CONFIG
    ACTION_CONFIG = {
        FundingOpportunity: {
            menus: [
                {
                    label: 'Call for proposals',
                    actions: [
                        { label: 'Add Call Translations', value: 'uNI_Translations', type: 'flow' },
                        { label: 'Edit Related Donors', value: 'uNI_EditRelatedDonors', type: 'flow' },
                        { label: 'Edit Call and Proposal Form', value: 'uNI_ReviewAssessment', type: 'LWC' },
                        { label: 'Review Call and Proposal Form', value: 'uNI_ReviewAssessment', type: 'LWC' },
                        { label: 'Submit Draft for Final Review', value: 'uNI_SubmitDraftCallforProposal', type: 'flow' },
                        { label: 'Publish call', value: 'uNI_Publish', type: 'flow' },
                        { label: 'Add Meeting Notes', value: 'uNI_MeetingNotes', type: 'flow' },
                        { label: 'Add Important Dates', value: 'uNI_AddImportantDates', type: 'record', objectApi: 'uNI_ImportantDates__c', fields: ['uNI_EventDate__c', 'uNI_EventDescription__c'] },
                        { label: 'View Applications Report', value: 'viewApplicationsReport', type: 'report', reportId: '00OFS000004Wymj2AC', filterParamName: 'fv0' }
                    ]
                },
                {
                    label: 'Proposal Review',
                    actions: [
                        { label: 'Review Assessment Form', value: 'reviewLevel1Assessment', type: 'LWC' },
                        { label: 'Add Reviewer', value: 'uNI_AddReviewer', type: 'flow', flowApi: 'uNI_ProposalInviteReviewer' },
                        { label: 'Accept Review', value: 'uNI_InternalReviewerAcceptance', type: 'flow', flowApi: 'uNI_InternalReviewerAcceptance' },
                        { label: 'Inform Board Relation', value: 'uNI_EmailForBoardRelations', type: 'flow', flowApi: 'uNI_EmailForBoardRelations' },
                        { label: 'Update EB Voting Timeline', value: 'uNI_ProposalGADVotingStatus', type: 'flow', flowApi: 'uNI_ProposalGADVotingStatus' },
                        { label: 'Submit Form To Director', value: 'uNI_SubmitFormDirector', type: 'flow', flowApi: 'uNI_SubmitFormDirector' }

                    ]
                },
                {
                    label: 'Persona Actions',
                    actions: [
                        { label: 'Edit Strategy Leads', value: 'uNI_EditStrategyLeads', type: 'flow', flowApi: 'uNI_EditStrategyLeads' },
                        { label: 'Edit Call Authors', value: 'uNI_EditCallAuthors', type: 'flow' },
                        { label: 'Edit GAM', value: 'uNI_DelegateGAMrole', type: 'flow' },
                        { label: 'Edit Proposal Reviewers', value: 'uNI_AddReviewer', type: 'flow', flowApi: 'uNI_ProposalInviteReviewer' },
                        { label: 'Delegate Approval', value: 'uNI_DelegateApproval', type: 'flow' }
                    ]
                },
                {
                    label: 'Feedbacks',
                    actions: [
                        { label: 'Provide Call For Proposal Feedback', value: 'uNI_FeedbackForm', type: 'LWC' }
                    ]
                }
            ]
        },
        IndividualApplication: {
            menus: [
                {
                    label: 'Manage',
                    actions: [
                        {
                            label: 'Start Financial Audit',
                            value: 'startFinancialAudit',
                            type: 'flow',
                            flowApi: 'uNI_Financial_Audit_Initiate_Process'
                        },
                        {
                            label: 'Initiate Financial Audit',
                            value: 'initiateFinancialAudit',
                            type: 'flow',
                            flowApi: 'uNI_Financial_Audit_Initiate_Process'
                        },
                        { label: 'Assessment Response', value: 'Assessment_Response', type: 'placeholder' },
                        { label: 'Assign Reviewers', value: 'addReviewer', type: 'flow', flowApi: 'DUMMY_FLOW_API' },
                        
                        { label: 'Update Management Action', value: 'startClosure', type: 'placeholder' },
                        {
                            label: 'Add Reviewer',
                            value: 'addReviewer',
                            type: 'flow',
                            flowApi: 'DUMMY_FLOW_API'
                        },
                        {
                            label: 'Cancel GAD',
                            value: 'cancelGad',
                            type: 'flow',
                            flowApi: 'uNI_CancelGAD'
                        },
                        {
                            label: 'Capacity Assessment',
                            value: 'capacityAssessment',
                            type: 'flow',
                            flowApi: 'uNI_CreateCapacityAssessment'
                        },
                        {
                            label: 'Clear Package as Legal',
                            value: 'clearPackageAsLegal',
                            type: 'flow',
                            flowApi: 'uNI_GADSMTReview'
                        },
                        {
                            label: 'Clear package for SMT Review',
                            value: 'clearPackageForSmtReview',
                            type: 'flow',
                            flowApi: 'uNI_GADSMTReview'
                        },
                        {
                            label: 'Clear the GAD Package As Director',
                            value: 'clearGadPackageAsDirector',
                            type: 'flow',
                            flowApi: 'uNI_GADSMTReview'
                        },
                        {
                            label: 'Clear the GAD Package As ED',
                            value: 'clearGadPackageAsEd',
                            type: 'flow',
                            flowApi: 'uNI_GADSMTReview'
                        },
                        {
                            label: 'Clear the GAD Package SMT',
                            value: 'clearGadPackageAsSmt',
                            type: 'flow',
                            flowApi: 'uNI_GADSMTReview'
                        },

                        {
                            label: 'Confirm No EB Review Required',
                            value: 'confirmNoEbReviewRequired',
                            type: 'flow',
                            flowApi: 'uNI_GADNoEbRequiredFlow'
                        },
                        {
                            label: 'Confirm OMT meeting date',
                            value: 'confirmOmtMeetingDate',
                            type: 'flow',
                            flowApi: 'uNI_SetOMTReviewDate'
                        },
                        {
                            label: 'Confirm PRC review date',
                            value: 'confirmPrcReviewDate',
                            type: 'flow',
                            flowApi: 'uNI_SetPRCReviewDate'
                        },
                        {
                            label: 'Submit Closure',
                            value: 'createClosure',
                            type: 'flow',
                            flowApi: 'uNI_LogClosure'
                        },

                        {
                            label: 'Define Stage 1',
                            value: 'defineStage1',
                            type: 'flow',
                            flowApi: 'uNI_GADApprovalFlow'
                        },
                        {
                            label: 'Define Stage 2',
                            value: 'defineStage2',
                            type: 'flow',
                            flowApi: 'uNI_GADApprovalFlow'
                        },
                        {
                            label: 'Define Stage 3',
                            value: 'defineStage3',
                            type: 'flow',
                            flowApi: 'uNI_GADApprovalFlow'
                        },
                        {
                            label: 'Start Stage 3',
                            value: 'startStage3',
                            type: 'flow',
                            flowApi: 'uNI_GADApprovalFlow'
                        },
                        {
                            label: 'Develop GAD Timeline',
                            value: 'developGadTimeline',
                            type: 'flow',
                            flowApi: 'uNI_MaintainAndDevelopGADTimeline'
                        },
                        {
                            label: 'Timeline',
                            value: 'editGadTimeline',
                            type: 'flow',
                            flowApi: 'uNI_MaintainAndDevelopGADTimeline'
                        },
                        {
                            label: 'Edit GAD Timeline',
                            value: 'editGadTimeline',
                            type: 'flow',
                            flowApi: 'uNI_MaintainAndDevelopGADTimeline'
                        },

                        {
                            label: 'Edit Stage 1',
                            value: 'editStage1',
                            type: 'flow',
                            flowApi: 'uNI_GADStageChange'
                        },
                        {
                            label: 'Edit Stage 2',
                            value: 'editStage2',
                            type: 'flow',
                            flowApi: 'uNI_GADStageChange'
                        },
                        {
                            label: 'Edit Stage 3',
                            value: 'editStage3',
                            type: 'flow',
                            flowApi: 'uNI_GADStageChange'
                        },
                        {
                            label: 'Edit Stage 3 Package (PT)',
                            value: 'editStage3PackagePt',
                            type: 'flow',
                            flowApi: 'uNI_GADStageChange'
                        },
                        {
                            label: 'Edit Stage 3 Package(PT)',
                            value: 'editStage3PackagePt',
                            type: 'flow',
                            flowApi: 'uNI_GADStageChange'
                        },
                        {
                            label: 'Edit Stage 4',
                            value: 'editStage4',
                            type: 'flow',
                            flowApi: 'uNI_GADStageChange'
                        },
                        {
                            label: 'Edit Stage 4 Package (PT)',
                            value: 'editStage4PackagePt',
                            type: 'flow',
                            flowApi: 'uNI_GADStageChange'
                        },
                        {
                            label: 'Edit Stage 4 Package(PT)',
                            value: 'editStage4PackagePt',
                            type: 'flow',
                            flowApi: 'uNI_GADStageChange'
                        },
                       
                        {
                            label: 'Mark EB Review As Not Required',
                            value: 'markEbReviewAsNotRequired',
                            type: 'flow',
                            flowApi: 'uNI_GADNoEbRequiredFlow'
                        },
                        {
                            label: 'Mark EB Voting as concluded',
                            value: 'markEbVotingAsConcluded',
                            type: 'flow',
                            flowApi: 'uNI_GAMDecisionOnGADEBVoting'
                        },
                        {
                            label: 'Mark EKO as Completed',
                            value: 'markEkoAsCompleted',
                            type: 'flow',
                            flowApi: 'uNI_GADApprovalFlow'
                        },
                        {
                            label: 'Mark IKO as Completed',
                            value: 'markIkoAsCompleted',
                            type: 'flow',
                            flowApi: 'uNI_GADApprovalFlow'
                        },
                        {
                            label: 'Move to Stage 2',
                            value: 'moveToStage2',
                            type: 'flow',
                            flowApi: 'uNI_GADApprovalFlow'
                        },
                        { label: 'Create Closure', value: 'createClosure', type: 'flow', flowApi: 'uNI_LogClosure' },
                        { label: 'Create Logframe', value: 'createLogframe', type: 'flow', flowApi: 'uNI_CreateLogframeRecordFlow' },
                        { label: 'Notify Proponent', value: 'notifyProponent', type: 'url', url: '/lightning/cmp/c__YourOmniScriptComponent' },
                        { label: 'Score Proposal Assessment', value: 'uNI_ScoreAssessmentNewTab', type: 'LWC' },
                      
                        { label: 'Complete Assessment', value: 'completeAssessment', type: 'flow', flowApi: 'uNI_ChangeIndividualApplicationReviewLevel' },
                                                { label: 'New Risk Register', value: 'uNI_RiskRegisterNewTab', type: 'LWC' },
                        { label: 'View L3 Scores', value: 'uNI_ViewL3Scores', type: 'LWC' },
                        { label: 'Log Annual Report', value: 'uNI_Log_Annual_Report', type: 'placeholder' },
                        { label: 'Person(s) reviewing',value: 'uNI_AddmembertoIA', type: 'flow', flowApi: 'uNI_AddmembertoIA' },
                        { label: 'Create Contributor User', value: 'uNI_Create_Contributor_User', type: 'placeholder' },
                        { label: 'Provide Proposal Feedback', value: 'uNI_ProvideProposalFeedback', type: 'placeholder' },
                        { label: 'Report Incident', value: 'Report_Incident', type: 'placeholder' },
                        // { label: 'Edit Implementer and Contributor', value: 'editImplementerAndContributor', type: 'flow', flowApi: 'uNI_EditContributor' },
    {
                            label: 'Prepare for SMT Clearance',
                            value: 'prepareForSmtClearance',
                            type: 'flow',
                            flowApi: 'uNI_GADSMTReview'
                        },
                        {
                            label: 'Project Parameters',
                            value: 'projectParameters',
                            type: 'flow',
                            flowApi: 'uNI_Project_Parameters_GAD'
                        },
                      
                        {
                            label: 'Report outcomes from OMT',
                            value: 'reportOutcomesFromOmt',
                            type: 'flow',
                            flowApi: 'uNI_GADOMTReview'
                        },
                       
                        {
                            label: 'Return to stage 2',
                            value: 'returnToStage2',
                            type: 'flow',
                            flowApi: 'uNI_ReturnToStage2'
                        },
                        {
                            label: 'Select PRC and Submit for Feedback',
                            value: 'selectPrcAndSubmitForFeedback',
                            type: 'flow',
                            flowApi: 'uNI_GADPRCReview'
                        },
                        {
                            label: 'Start EB Review',
                            value: 'startEbReview',
                            type: 'flow',
                            flowApi: 'uNI_GADEBReview'
                        },
                        {
                            label: 'Start OMT Review',
                            value: 'startOmtReview',
                            type: 'flow',
                            flowApi: 'uNI_GADOMTReview'
                        },
                                                {
                            label: 'PPF',
                            value: 'startPpf',
                            type: 'flow',
                            flowApi: 'uNI_CreatePPF'
                        },
                        {
                            label: 'Start PRC Review',
                            value: 'startPrcReview',
                            type: 'flow',
                            flowApi: 'uNI_GADPRCReview'
                        },
                        {
                            label: 'Start Stage 4',
                            value: 'startStage4',
                            type: 'flow',
                            flowApi: 'uNI_GADApprovalFlow'
                        },
                        {
                            label: 'Start Supplier Registration',
                            value: 'startSupplierRegistration',
                            type: 'flow',
                            flowApi: 'uNI_GADSupplierRegisteration'
                        },
                        {
                            label: 'Stop SMT Review',
                            value: 'stopSmtReview',
                            type: 'flow',
                            flowApi: 'uNI_GADStopORContinueSMTReview'
                        },
                        {
                            label: 'Submit Closure',
                            value: 'submitClosure',
                            type: 'flow',
                            flowApi: 'uNI_LogClosure'
                        },
                        {
                            label: 'Submit For EB Review',
                            value: 'submitForEbReview',
                            type: 'flow',
                            flowApi: 'uNI_GADEBReview'
                        },
                        {
                            label: 'Submit PRC Feedback',
                            value: 'submitPrcFeedback',
                            type: 'flow',
                            flowApi: 'uNI_GADPRCReview'
                        },
                        {
                            label: 'Submit for ED Clearance',
                            value: 'submitForEdClearance',
                            type: 'flow',
                            flowApi: 'uNI_GADSMTReview'
                        },
                        {
                            label: 'Submit for SMT Clearance',
                            value: 'submitForSmtClearance',
                            type: 'flow',
                            flowApi: 'uNI_GADSMTReview'
                        },
                       /* {
                            label: 'Submit to PRC for review',
                            value: 'submitToPrcForReview',
                            type: 'flow',
                            flowApi: 'uNI_GADPRCReview'
                        }, */
                        {
                            label: 'Submit to SMT members',
                            value: 'submitToSmtMembers',
                            type: 'flow',
                            flowApi: 'uNI_GADStopORContinueSMTReview'
                        },
                        {
                            label: 'Upload Additional Files',
                            value: 'uploadAdditionalFiles',
                            type: 'flow',
                            flowApi: 'uNI_UploadAdditionalFilestoPackage'
                        },
                        {
                            label: 'Upload ED Signed Face Sheet',
                            value: 'uploadEdSignedFaceSheet',
                            type: 'flow',
                            flowApi: 'uNI_PostEBVoteEndedFlow'
                        },
                        {
                            label: 'Upload Gantt Chart',
                            value: 'uploadGanttChart',
                            type: 'flow',
                            flowApi: 'DUMMY_FLOW_API'
                        },
                        {
                            label: 'Upload Pre-Grantee Signed FaceSheet',
                            value: 'uploadPreGranteeSignedFaceSheet',
                            type: 'flow',
                            flowApi: 'uNI_PostEBVoteEndedFlow'
                        },
                        {
                            label: 'Upload Stage 1 package',
                            value: 'uploadStage1Package',
                            type: 'flow',
                            flowApi: 'uNI_GADApprovalFlow'
                        },
                        {
                            label: 'Upload Stage 2 package',
                            value: 'uploadStage2Package',
                            type: 'flow',
                            flowApi: 'uNI_GADApprovalFlow'
                        },
                        {
                            label: 'Upload Stage 3 Package (PT)',
                            value: 'uploadStage3PackagePt',
                            type: 'flow',
                            flowApi: 'uNI_UploadPTFiles'
                        },
                        {
                            label: 'Upload Stage 3 Package (Pre-grantee)',
                            value: 'uploadStage3PackagePreGrantee',
                            type: 'flow',
                            flowApi: 'uNI_GADApprovalFlow'
                        },
                        {
                            label: 'Upload Stage 3 Package(PT)',
                            value: 'uploadStage3PackagePt',
                            type: 'flow',
                            flowApi: 'uNI_UploadPTFiles'
                        },
                        {
                            label: 'Upload Stage 3 Package(Pre-grantee)',
                            value: 'uploadStage3PackagePreGrantee',
                            type: 'flow',
                            flowApi: 'uNI_GADApprovalFlow'
                        },
                        {
                            label: 'Upload Stage 4 Package (PT)',
                            value: 'uploadStage4PackagePt',
                            type: 'flow',
                            flowApi: 'uNI_UploadPTFiles'
                        },
                        {
                            label: 'Upload Stage 4 Package (Pre-Grantee)',
                            value: 'uploadStage4PackagePreGrantee',
                            type: 'flow',
                            flowApi: 'uNI_GADApprovalFlow'
                        },
                        {
                            label: 'Upload Stage 4 Package(PT)',
                            value: 'uploadStage4PackagePt',
                            type: 'flow',
                            flowApi: 'uNI_UploadPTFiles'
                        },
                        {
                            label: 'Upload Stage 4 Package(Pre-Grantee)',
                            value: 'uploadStage4PackagePreGrantee',
                            type: 'flow',
                            flowApi: 'uNI_GADApprovalFlow'
                        },
 
            
                        { label: 'Request FENSA Assessment', value: 'requestFensaAssessment', type: 'flow', flowApi: 'uNI_Request_FENSA_Assessment' },
                        { label: 'Update Risk Register', value: 'uNI_RiskRegisterNewTab', type: 'LWC' },
                        { label: 'Risk Register', value: 'Risk_Register', type: 'placeholder' },
                        { label: 'New Risk Register Version', value: 'uNI_NewRiskRegisterVersion', type: 'placeholder' },
                        { label: 'View/Add Mgmt Action', value: 'uNI_ViewAddMgmtActionBtn', type: 'placeholder' },
            
                        { label: 'Submit FENSA Request', value: 'Submit_FENSA', type: 'placeholder' },
    
    
                        { label: 'Proposal Assessment Report', value: 'uNI_ProposalAssessmentReport', type: 'placeholder' },
                        { label: 'Provide GAD Feedback', value: 'Provide_GAD_Feedback', type: 'placeholder' },
                       

                        // --- GENERIC BUTTONS ---
                        
                       
                        { label: 'Notify Proponent', value: 'notifyProponent', type: 'url', url: '/lightning/cmp/c__YourOmniScriptComponent' },
                        { label: 'Score Proposal Assessment', value: 'uNI_ScoreAssessmentNewTab', type: 'LWC' },
                        { label: 'Complete Assessment', value: 'completeAssessment', type: 'flow', flowApi: 'uNI_ChangeIndividualApplicationReviewLevel' },
                                                { label: 'New Risk Register', value: 'uNI_RiskRegisterNewTab', type: 'LWC' }


                    ]
                },
                {
                    label: 'Administer',
                    actions: [
                        { label: 'PT Members', value: 'editPTMembers', type: 'flow', flowApi: 'uNI_AddMembersToGAD' },
                        { label: 'Edit Implementer Accounts', value: 'editImplementerAccounts', type: 'flow', flowApi: 'uNI_EditContributor' },
                        { label: 'Edit Implementer and Contributor', value: 'editImplementerAndContributor', type: 'flow', flowApi: 'uNI_EditContributor' }
                    ]
                }

            ]
        },
      uNI_ReprogrammingRequest__c: {
            menus: [
                {
                    label: 'Manage',
                    actions: [
                        {
                            label: 'Review Reprogramming Request',
                            value: 'reviewReprogrammingRequest',
                            type: 'flow',
                            flowApi: 'uNI_ReturnReprogrammingRequest'
                        },
                       {
                            label: 'Clear Package as Legal',
                            value: 'clearPackageAsLegal',
                            type: 'flow',
                            flowApi: 'uNI_GADSMTReview'
                        },
                        {
                            label: 'Clear package for SMT Review',
                            value: 'clearPackageForSmtReview',
                            type: 'flow',
                            flowApi: 'uNI_GADSMTReview'
                        },
                        {
                            label: 'Clear the Package As Director',
                            value: 'clearGadPackageAsDirector',
                            type: 'flow',
                            flowApi: 'uNI_GADSMTReview'
                        },
                        {
                            label: 'Clear the Package As ED',
                            value: 'clearGadPackageAsEd',
                            type: 'flow',
                            flowApi: 'uNI_GADSMTReview'
                        },
                        {
                            label: 'Clear the Package SMT',
                            value: 'clearGadPackageAsSmt',
                            type: 'flow',
                            flowApi: 'uNI_GADSMTReview'
                        },

                        {
                            label: 'Confirm No EB Review Required',
                            value: 'confirmNoEbReviewRequired',
                            type: 'flow',
                            flowApi: 'uNI_GADNoEbRequiredFlow'
                        },
                        {
                            label: 'Confirm OMT meeting date',
                            value: 'confirmOmtMeetingDate',
                            type: 'flow',
                            flowApi: 'uNI_SetOMTReviewDateForReprogramming'
                        },
                        {
                            label: 'Confirm PRC review date',
                            value: 'confirmPrcReviewDate',
                            type: 'flow',
                            flowApi: 'uNI_SetPRCReviewDateForReprogramming'
                        },
                        {
                            label: 'Submit Closure',
                            value: 'createClosure',
                            type: 'flow',
                            flowApi: 'uNI_LogClosure'
                        },

                        {
                            label: 'Define Stage 1',
                            value: 'defineStage1',
                            type: 'flow',
                            flowApi: 'uNI_ReprogrammingApprovalFlow'
                        },
                        {
                            label: 'Define Stage 2',
                            value: 'defineStage2',
                            type: 'flow',
                            flowApi: 'uNI_ReprogrammingApprovalFlow'
                        },
                        {
                            label: 'Define Stage 3',
                            value: 'defineStage3',
                            type: 'flow',
                            flowApi: 'uNI_ReprogrammingApprovalFlow'
                        },
                        {
                            label: 'Start Stage 3',
                            value: 'startStage3',
                            type: 'flow',
                            flowApi: 'uNI_ReprogrammingApprovalFlow'
                        },
                       
                        {
                            label: 'Edit Stage 1',
                            value: 'editStage1',
                            type: 'flow',
                            flowApi: 'uNI_GADStageChange'
                        },
                        {
                            label: 'Edit Stage 2',
                            value: 'editStage2',
                            type: 'flow',
                            flowApi: 'uNI_GADStageChange'
                        },
                        {
                            label: 'Edit Stage 3',
                            value: 'editStage3',
                            type: 'flow',
                            flowApi: 'uNI_GADStageChange'
                        },
                        {
                            label: 'Edit Stage 3 Package (PT)',
                            value: 'editStage3PackagePt',
                            type: 'flow',
                            flowApi: 'uNI_GADStageChange'
                        },
                        {
                            label: 'Edit Stage 4',
                            value: 'editStage4',
                            type: 'flow',
                            flowApi: 'uNI_GADStageChange'
                        },
                        {
                            label: 'Edit Stage 4 Package (PT)',
                            value: 'editStage4PackagePt',
                            type: 'flow',
                            flowApi: 'uNI_GADStageChange'
                        },
                       
                        {
                            label: 'Mark EB Review As Not Required',
                            value: 'markEbReviewAsNotRequired',
                            type: 'flow',
                            flowApi: 'uNI_GADNoEbRequiredFlow'
                        },
                        {
                            label: 'Mark EB Voting as concluded',
                            value: 'markEbVotingAsConcluded',
                            type: 'flow',
                            flowApi: 'uNI_GAMDecisionOnGADEBVoting'
                        },
                       
                        {
                            label: 'Move to Stage 2',
                            value: 'moveToStage2',
                            type: 'flow',
                            flowApi: 'uNI_ReprogrammingApprovalFlow'
                        },
                       
                       // { label: 'Edit Implementer and Contributor', value: 'editImplementerAndContributor', type: 'flow', flowApi: 'uNI_EditContributor' },
    {
                            label: 'Prepare for SMT Clearance',
                            value: 'prepareForSmtClearance',
                            type: 'flow',
                            flowApi: 'uNI_GADSMTReview'
                        },
                        {
                            label: 'Project Parameters',
                            value: 'projectParameters',
                            type: 'flow',
                            flowApi: 'uNI_ProjectParamtersForReprogramming'
                        },
                      
                        {
                            label: 'Report outcomes from OMT',
                            value: 'reportOutcomesFromOmt',
                            type: 'flow',
                            flowApi: 'uNI_GADOMTReview'
                        },
                       
                        {
                            label: 'Return to stage 2',
                            value: 'returnToStage2',
                            type: 'flow',
                            flowApi: 'uNI_ReturnToStage2'
                        },
                        {
                            label: 'Select PRC and Submit for Feedback',
                            value: 'selectPrcAndSubmitForFeedback',
                            type: 'flow',
                            flowApi: 'uNI_GADPRCReview'
                        },
                        {
                            label: 'Start EB Review',
                            value: 'startEbReview',
                            type: 'flow',
                            flowApi: 'uNI_ReprogrammingEBReview'
                        },
                        {
                            label: 'Start OMT Review',
                            value: 'startOmtReview',
                            type: 'flow',
                            flowApi: 'uNI_GADOMTReview'
                        },
                        {
                            label: 'Start PPF',
                            value: 'startPpf',
                            type: 'flow',
                            flowApi: 'uNI_CreatePPF'
                        },
                        {
                            label: 'Start PRC Review',
                            value: 'startPrcReview',
                            type: 'flow',
                            flowApi: 'uNI_GADPRCReview'
                        },
                        {
                            label: 'Start Stage 4',
                            value: 'startStage4',
                            type: 'flow',
                            flowApi: 'uNI_ReprogrammingApprovalFlow'
                        },
                        
                        {
                            label: 'Stop SMT Review',
                            value: 'stopSmtReview',
                            type: 'flow',
                            flowApi: 'uNI_ReprogrammingStopOrContinueSMTReview'
                        },
                        
                        {
                            label: 'Submit For EB Review',
                            value: 'submitForEbReview',
                            type: 'flow',
                            flowApi: 'uNI_ReprogrammingEBReview'
                        },
                        {
                            label: 'Submit PRC Feedback',
                            value: 'submitPrcFeedback',
                            type: 'flow',
                            flowApi: 'uNI_GADPRCReview'
                        },
                        {
                            label: 'Submit for ED Clearance',
                            value: 'submitForEdClearance',
                            type: 'flow',
                            flowApi: 'uNI_GADSMTReview'
                        },
                        {
                            label: 'Submit for SMT Clearance',
                            value: 'submitForSmtClearance',
                            type: 'flow',
                            flowApi: 'uNI_GADSMTReview'
                        },
                        // {
                        //     label: 'Submit to PRC for review',
                        //     value: 'submitToPrcForReview',
                        //     type: 'flow',
                        //     flowApi: 'uNI_GADPRCReview'
                        // },
                        {
                            label: 'Submit to SMT members',
                            value: 'submitToSmtMembers',
                            type: 'flow',
                            flowApi: 'uNI_ReprogrammingStopOrContinueSMTReview'
                        },
                        {
                            label: 'Upload Additional Files',
                            value: 'uploadAdditionalFiles',
                            type: 'flow',
                            flowApi: 'uNI_UploadAdditionalFilesToPackageForReprogramming'
                        },
                        {
                            label: 'Upload ED Signed Face Sheet',
                            value: 'uploadEdSignedFaceSheet',
                            type: 'flow',
                            flowApi: 'uNI_PostEBVoteEndedFlow'
                        },
                       
                        {
                            label: 'Upload Pre-Grantee Signed FaceSheet',
                            value: 'uploadPreGranteeSignedFaceSheet',
                            type: 'flow',
                            flowApi: 'uNI_PostEBVoteEndedFlow'
                        },
                        {
                            label: 'Upload Stage 1 package',
                            value: 'uploadStage1Package',
                            type: 'flow',
                            flowApi: 'uNI_ReprogrammingApprovalFlow'
                        },
                        {
                            label: 'Upload Stage 2 package',
                            value: 'uploadStage2Package',
                            type: 'flow',
                            flowApi: 'uNI_ReprogrammingApprovalFlow'
                        },
                        {
                            label: 'Upload Stage 3 Package (PT)',
                            value: 'uploadStage3PackagePt',
                            type: 'flow',
                            flowApi: 'uNI_UploadPTFiles'
                        },
                        {
                            label: 'Upload Stage 3 Package (Pre-grantee)',
                            value: 'uploadStage3PackagePreGrantee',
                            type: 'flow',
                            flowApi: 'uNI_ReprogrammingApprovalFlow'
                        },
                        {
                            label: 'Upload Stage 4 Package (PT)',
                            value: 'uploadStage4PackagePt',
                            type: 'flow',
                            flowApi: 'uNI_UploadPTFiles'
                        },
                        {
                            label: 'Upload Stage 4 Package (Pre-Grantee)',
                            value: 'uploadStage4PackagePreGrantee',
                            type: 'flow',
                            flowApi: 'uNI_ReprogrammingApprovalFlow'
                        }
            
            
                    
                       
                       
                    ]
                }
            ]
        }
    };
    /*
    get menus() {
        var allmenus = this.ACTION_CONFIG[this.objectApiName]?.menus;
        console.log(JSON.stringify(allmenus));
        return this.ACTION_CONFIG[this.objectApiName]?.menus || [];
    }*/

    // 🔹 ACTION HANDLER
    handleAction(event) {
        // First check in actions

        const selectedValue = event.detail.value;

        const menuLabel = event.currentTarget.dataset.menu;
        console.log('@@in handleaction' + '@sel:' + selectedValue + '@menu:' + menuLabel);
        // Find the correct menu
        let objMenus = this.ACTION_CONFIG[this.objectApiName]?.menus;
        console.log('@@objMenus' + JSON.stringify(objMenus));
        const menu = objMenus.find(m => m.label === menuLabel);

        if (!menu) {
            console.error('Menu not found:', menuLabel);
            return;
        }
        console.log('@@in menuAction' + JSON.stringify(menu.actions));

        // Find the action inside that menu
        const selected = menu.actions.find(
            a => a.value === selectedValue
        );

        console.log('selected: ' + JSON.stringify(selected));

        if (selected.type === 'report') {
            const reportUrl = `/lightning/r/Report/${selected.reportId}/view?${selected.filterParamName}=${this.recordId}`;
            window.open(reportUrl, '_blank');
        }
        if (selected.type === 'flow') {
            this.selectedFlow = selected.flowApi || selected.value;
            this.inputVariables = [
                {
                    name: 'recordId',
                    type: 'String',
                    value: this.recordId
                }
            ];
            this.isFlowOpen = true;
            this.isRecordForm = false;
            this.flowHeader = selected.label;
        } else if (selected.type === 'record') {
            this.recordObjectApiName = selected.objectApi;
            this.recordFields = selected.fields || ['Name'];
            this.selectedFlow = selected.label;
            this.isRecordForm = true;
            this.isFlowOpen = true;
        }
        if (selected.type === 'url') {
            // Opens the URL in a new tab
            this[NavigationMixin.Navigate]({
                type: 'standard__webPage',
                attributes: {
                    url: selected.url
                }
            });
            return; 
        }
        else if (selected.type === 'LWC') {
            if (selected.value === 'uNI_FeedbackForm') {
                this.showFeedbackForm = true;
                return;
            }

            if (selected.value === 'uNI_ScoreAssessmentNewTab') {
                const targetUrl = `/lightning/cmp/c__uNI_IndividualAssessmentSubmission?c__recordId=${encodeURIComponent(this.recordId)}`;
                window.open(targetUrl, '_blank');
                return;
            }

            if (selected.value === 'uNI_ReviewAssessment') {
                const pageRef = {
                    type: 'standard__component',
                    attributes: {
                        componentName: 'c__uNI_AssessmentReviewContainer'
                    },
                    state: {
                        c__recordId: this.recordId
                    }
                };
                this[NavigationMixin.GenerateUrl](pageRef).then(url => {
                    window.open(url, '_blank');
                });
            } else if (selected.value === 'reviewLevel1Assessment') {
                console.log('record Id inside l1' + this.recordId);
                const pageRef = {
                    type: 'standard__component',
                    attributes: {
                        componentName: 'c__uNI_ReviewLevelAssessmentContainer'
                    },
                    state: {
                        c__recordId: this.recordId
                    }
                };
                this[NavigationMixin.GenerateUrl](pageRef).then(url => {
                    window.open(url, '_blank');
                });
            } else {
                const pageRef = {
                    type: 'standard__component',
                    attributes: {
                        componentName: selected.component || 'c__' + selected.value
                    },
                    state: {
                        c__recordId: this.recordId
                    }
                };
                this[NavigationMixin.GenerateUrl](pageRef).then(url => {
                    window.open(url, '_blank');
                });
            }
        }
    }

    handleSubmit(event) {
        console.log('in submit');
        event.preventDefault();
        const fields = event.detail.fields;
        fields.uNI_CallForProposals__c = this.recordId;
        this.template.querySelector('lightning-record-edit-form').submit(fields);
    }

    handleRecordSuccess(event) {
        const recordId = event.detail.id;
        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Success',
                message: `Record created successfully! `,
                variant: 'success'
            })
        );
        this.isRecordForm = false;
        this.isFlowOpen = false;
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: this.recordId,
                objectApiName: this.objectApiName,
                actionName: 'view'
            }
        });
    }

    closeFlow() {
        this.isFlowOpen = false;
        this.showFeedbackForm = false;
    }

    get wiredRecordFields() {
        if (!this.objectApiName) {
            return null;
        }
        if (this.objectApiName === 'FundingOpportunity') {
            return FO_RECORD_FIELDS;
        }
        if (this.objectApiName === 'IndividualApplication') {
            return IA_RECORD_FIELDS;
        }
        if (this.objectApiName === 'uNI_ReprogrammingRequest__c') {
            return RR_RECORD_FIELDS;
        }
        return null;
    }

    @wire(getRecord, {
        recordId: '$recordId',
        fields: '$wiredRecordFields'
    })
    wiredRecord({ error, data }) {
        // eslint-disable-next-line no-console
        console.warn('@@ [uNI_ButtonListClone] wiredRecord', {
            recordId: this.recordId,
            objectApiName: this.objectApiName,
            hasData: !!data,
            hasError: !!error
        });
        if (data) {
            // eslint-disable-next-line no-console
            console.warn('@@ [uNI_ButtonListClone] record loaded for', this.objectApiName);
            this.recordData = data;
            if (this.isDebugEnabled()) {
                console.log('@@ [uNI_ButtonListClone] record type raw', {
                    iaRtId: getFieldValue(data, IA_RecordTypeId),
                    iaRtDev: getFieldValue(data, RT_DevName),
                    rrRtId: getFieldValue(data, RR_RecordTypeId),
                    rrRtDev: getFieldValue(data, RR_RT_DevName)
                });
            }

            // ============================================
            // 1. LOGIC FOR FUNDING OPPORTUNITY
            // ============================================
            if (this.objectApiName === 'FundingOpportunity') {
                const status = getFieldValue(data, Status);
                const isSL = getFieldValue(data, uNI_AMiSL__c);
                const isGam = getFieldValue(data, uNI_AmIGAM__c);
                const IsLead = getFieldValue(data, uNI_AmILeadAuthor__c);
                const IsActionOwner = getFieldValue(data, uNI_AmiActionOnwer__c) || false;
                const FormStatus = getFieldValue(data, Status__c) || '';
                const assessmentStatus = getFieldValue(data, uNI_Assessment_Status__c) || '';
                const isDir = getFieldValue(data, uNI_AmIDirector__c) || false;
                const isInvitedReviewer = getFieldValue(data, uNI_AmiInvitedReviewer__c) || false;
                const isAcceptedReviewer = getFieldValue(data, uNI_AcceptedReviewer__c) || false;
                const gamUserId = getFieldValue(data, uNI_GrantApplicationManager__c) || '';
                const isOrginalGam = (userId === gamUserId);
                const isGAMDelegated = getFieldValue(data, uNI_DelegatedGAM__c) || '';

                this.ACTION_CONFIG.FundingOpportunity.menus.forEach(menu => {
                    menu.actions = menu.actions.filter(action => {
                        // Visibility: New call in development + (Action Owner or GAM or Strategy Lead).
                        if (action.label === 'Submit Draft for Final Review') return (status === 'New call in development' && (IsActionOwner || isGam || isSL));
                        // Visibility: Under Review + Action Owner.
                        if (action.label === 'Delegate Approval') return (status === 'Under Review' && IsActionOwner);
                        // Visibility: New call in development + Lead Author.
                        if (action.label === 'Add Call Translations') return (status === 'New call in development' && IsLead);
                        // Visibility: GAM only.
                        if (action.label === 'Add Important Dates') return isGam;
                        // Visibility: Original GAM and no delegated GAM yet.
                        if (action.label === 'Delegate GAM Role') return (isOrginalGam && (isGAMDelegated == null || isGAMDelegated == undefined));
                        // Visibility: GAM or Lead Author.
                        if (action.label === 'Add Meeting Notes') return (isGam || IsLead);
                        // Visibility: New call in development + (SL or GAM) + form status in editable states.
                        if (action.label === 'Edit Call and Proposal Form') return ((status === 'New call in development') && (isSL || isGam) && (FormStatus === '' || FormStatus === null || FormStatus === 'Draft' || FormStatus === 'Returned' || FormStatus === 'Approved with Comments' || FormStatus === 'Pending Director Review'));
                        // Visibility: Under Review + Action Owner OR Ready to Publish + GAM.
                        if (action.label === 'Review Call and Proposal Form') return ((status === 'Under Review' && IsActionOwner) || (status === 'Ready to Publish' && isGam));
                        // Visibility: Strategy Lead or GAM.
                        if (action.label === 'Edit Strategy Leads') return isSL || isGam;
                        // Visibility: Strategy Lead or GAM.
                        if (action.label === 'Edit Call Authors') return isSL || isGam;
                        // Visibility: GAM only.
                        if (action.label === 'Edit GAM') return isGam;
                        // Visibility: Ready to Publish + GAM.
                        if (action.label === 'Publish call') return status === 'Ready to Publish' && isGam;
                        // Visibility: GAM (Draft In Progress) OR Director (Pending Director Review).
                        if (action.label === 'Review Assessment Form') return ((isGam && assessmentStatus === 'Draft In Progress') || (isDir && assessmentStatus === 'Pending Director Review'));
                        // Visibility: GAM only.
                        if (action.label === 'Add Reviewer') return isGam;
                        // Visibility: GAM + assessment status Draft In Progress.
                        if (action.label === 'Submit Form To Director') return isGam && assessmentStatus === 'Draft In Progress';
                        // Visibility: invited reviewer who has not accepted.
                        if (action.label === 'Accept Review') return isInvitedReviewer && !isAcceptedReviewer;
                        // Visibility: Call Closed.
                        if (action.label === 'Inform Board Relation' || action.label === 'Update EB Voting Timeline') return status === 'Call Closed';
                        // Visibility: Active call.
                        if (action.label === 'Provide Call For Proposal Feedback') return status === 'Active';
                        // Visibility: GAM + status in New call/Under Review/Ready to Publish.
                        if (action.label === 'Edit Related Donors') return (isGam && (status === 'New call in development' || status === 'Under Review' || status === 'Ready to Publish'));
                        return true;
                    });
                });
            }

            // ============================================
            // 2. LOGIC FOR INDIVIDUAL APPLICATION
            // ============================================
            else if (this.objectApiName === 'IndividualApplication') {
                console.log('@@ [uNI_ButtonListClone] Applying IndividualApplication filters');
                //try {
                    this.filterIndividualApplicationActions(data);
               // } catch (e) {
                  //  console.error('@@ [uNI_ButtonListClone] IA filter error', e);
               // }
            }
            else if (this.objectApiName === 'uNI_ReprogrammingRequest__c') {
                console.log('@@ [uNI_ButtonListClone] Applying ReprogrammingRequest filters');
                try {
                    this.filterReprogrammingActions(data);
                } catch (e) {
                    console.error('@@ [uNI_ButtonListClone] Reprogramming filter error', e);
                }
            }

            // Apply filtered menus to the track variable
            this.allmenus = this.ACTION_CONFIG[this.objectApiName]?.menus || [];

        } else if (error) {
            console.error('@@ [uNI_ButtonListClone] Error loading record:', error);
            this.allmenus = this.ACTION_CONFIG[this.objectApiName]?.menus || [];
        }
    }
  /*  @wire(getRecord, {
        recordId: '$recordId',
        fields: [
            uNI_AmiActionOnwer__c,
            Status,
            uNI_Assessment_Status__c,
            uNI_AmIGAM__c,
            uNI_AmIDirector__c,
            uNI_AmiInvitedReviewer__c,
            uNI_AmILeadAuthor__c,
            Status__c,
            uNI_GrantApplicationManager__c,
            uNI_DelegatedGAM__c,
            uNI_AcceptedReviewer__c,
            uNI_Director_Comments__c,
            uNI_StrategyComment__c,
            uNI_AMiSL__c
        ]
    })
    wiredRecord({ error, data }) {
        console.log('@@ in wire1');
        if (data) {
            console.log('@@ in wire ifff');
            this.actions = this.filterActions(data, this.actions);
            this.assessmentActions = this.filterActions(data, this.assessmentActions);
            this.personaActions = this.filterActions(data, this.personaActions);
            this.feedbacks = this.filterActions(data, this.feedbacks);
        } else if (error) {
            console.error('Error loading record:', error);
        }
    } */

    /* filterActions(data, actionList = this.actions) {
        console.log('@@ in filter actions');
        let available = [];
        const statusVal = getFieldValue(record, Status) || '';
        const IsActionOwner = getFieldValue(record, uNI_AmiActionOnwer__c) || false;
        const IsLead = getFieldValue(record, uNI_AmILeadAuthor__c) || false;
        const isGam = getFieldValue(record, uNI_AmIGAM__c) || false;
        const isDir = getFieldValue(record, uNI_AmIDirector__c) || false;
        const isInvitedReviewer = getFieldValue(record, uNI_AmiInvitedReviewer__c) || false;
        const FormStatus = getFieldValue(record, Status__c) || '';
        const assessmentStatus = getFieldValue(record, uNI_Assessment_Status__c) || '';
        const gamUserId = getFieldValue(record, uNI_GrantApplicationManager__c) || '';
        const isOrginalGam = (userId === gamUserId);
        const isGAMDelegated = getFieldValue(record, uNI_DelegatedGAM__c) || '';
        const isAcceptedReviewer = getFieldValue(record, uNI_AcceptedReviewer__c) || false;
        const directorComments = getFieldValue(record, uNI_Director_Comments__c);
        const strategyComments = getFieldValue(record, uNI_StrategyComment__c);
        const isSL = getFieldValue(record, uNI_AMiSL__c);
        console.log('actionlist'+ JSON.stringify(actionList));
        for (let action of actionList) {
            console.log('@@action'+action);
            let show = true;

            switch (action.label) {
                case 'Submit Draft for Final Review':
                    show = (statusVal == 'New call in development' && (IsActionOwner || isGam || isSL));
                    break;
                case 'Delegate Approval':
                    show = (statusVal == 'Under Review') && IsActionOwner;
                    break;
                case 'Add Call Translations':
                    show = (statusVal == 'New call in development' && IsLead);
                    break;
                case 'Add Important Dates':
                    show = isGam;
                    break;
                case 'Delegate GAM Role':
                    show = isOrginalGam && (isGAMDelegated == null || isGAMDelegated == undefined);
                    break;
                case 'Add Meeting Notes':
                    show = (isGam || IsLead);
                    break;
                case 'Edit Call and Proposal Form':
                    show = ((statusVal == 'New call in development') && (isSL || isGam) && (FormStatus == '' || FormStatus == 'Draft' || FormStatus == 'Returned' || FormStatus == 'Approved with Comments' || FormStatus == null || FormStatus == 'Pending Director Review'));
                    break;
                case 'Review Call and Proposal Form':
                    show = (statusVal == 'Under Review' && IsActionOwner) || (statusVal == 'Ready to Publish' && isGam);
                    break;
                case 'Edit Strategy Leads':
                    show = ((isSL || isGam));
                    break;
                case 'Edit Call Authors':
                    show = ((isSL || isGam));
                    break;
                case 'Edit GAM':
                    show = isGam;
                    break;
                case 'Publish call':
                    show = (statusVal == 'Ready to Publish' && isGam);
                    break;
                case 'Review Assessment Form':
                    show = (isGam && assessmentStatus === 'Draft In Progress') || (isDir && assessmentStatus === 'Pending Director Review');
                    break;
                case 'Add Reviewer':
                    show = isGam;
                    break;
                case 'Submit Form To Director':
                    show = isGam && assessmentStatus === 'Draft In Progress';
                    break;
                case 'Accept Review':
                    show = (isInvitedReviewer && !isAcceptedReviewer);
                    break;
                case 'Inform Board Relation':
                case 'Update EB Voting Timeline':
                    show = (statusVal === 'Call Expired');
                    break;
                case 'Provide Call For Proposal Feedback':
                    show = (statusVal === 'Active'); // Always show feedback button
                    break;
                    case 'Edit Related Donors':
                    show = (isGam) && (statusVal === 'New call in development' || statusVal === 'Under Review' || statusVal === 'Ready to Publish'); // Always show feedback button
                    break;
                default:
                    show = true;
                    break;
            }

            console.log(action.value + '@' + show);
            if (show) {
                available.push(action);
            }
        }

        return available;
    } */

    handleFlowStatus(event) {
        if (event.detail.status === "FINISHED") {
            this.isFlowOpen = false;
            this[NavigationMixin.Navigate]({
                type: 'standard__recordPage',
                attributes: {
                    recordId: this.recordId,
                    objectApiName: this.objectApiName,
                    actionName: 'view'
                }
            });
            setTimeout(() => {
                this[NavigationMixin.Navigate]({
                    type: 'standard__recordPage',
                    attributes: {
                        recordId: this.recordId,
                        objectApiName: this.objectApiName,
                        actionName: 'view'
                    }
                });
            }, 500);

            this.dispatchEvent(new ShowToastEvent({
                title: 'Success',
                variant: 'success'
            }));
        }
    }


    filterIndividualApplicationActions(data) {
        // eslint-disable-next-line no-console
        console.warn('@@ [uNI_ButtonListClone] filterIndividualApplicationActions start');
        const rtDevName = getFieldValue(data, RT_DevName);
        const iaRtId = getFieldValue(data, IA_RecordTypeId);
        const resolvedIaRtDevName = rtDevName || this.iaRecordTypeById[iaRtId];

        const isIaGad = resolvedIaRtDevName === IA_RECORDTYPE_DEVNAMES.GAD;
        const isIaInvestment = resolvedIaRtDevName === IA_RECORDTYPE_DEVNAMES.INVESTMENT;
        const isIaProposal = resolvedIaRtDevName === IA_RECORDTYPE_DEVNAMES.PROPOSAL;

        // --- 1. GAD VARIABLES ---
        const stage = getFieldValue(data, uNI_Stage__c);
        const isPMPO = getFieldValue(data, uNI_IsUserPMOrPO__c);
        const actionOwner = getFieldValue(data, uNI_CurrentActionOwner__c);
        const stage3Submitted = getFieldValue(data, uNI_IsStage3PackageSubmitted__c);
        const omtReviewerIds = getFieldValue(data, uNI_OMTReviewerIds__c);
        const prcReviewStarted = getFieldValue(data, uNI_IsPRCReviewStarted__c);
        const stage3FilesSelected = getFieldValue(data, uNI_IsStage3FilesSelected__c);
        const omtStatus = getFieldValue(data, uNI_OMTReviewStatus__c);
        const prcStatus = getFieldValue(data, uNI_PRCReviewStatus__c);
        const isPT = getFieldValue(data, uNI_IsUserPT__c);
        const resubmitStage2 = getFieldValue(data, uNI_ResubmitStage2Package__c);
        const stage2Submitted = getFieldValue(data, uNI_IsStage2PackageSubmitted__c);
        const prcDateConfirmed = getFieldValue(data, uNI_isPRCReviewDateConfirmed__c);
        const omtDateConfirmed = getFieldValue(data, uNI_isOMTReviewDateConfirmed__c);
        const stage1Submitted = getFieldValue(data, uNI_IsStage1PackageSubmitted__c);
        const isIKO = getFieldValue(data, uNI_IsIKOCompleted__c);
        const projectTeamID = getFieldValue(data, uNI_isProjectTeamIdentified__c);
        const timelineDev = getFieldValue(data, uNI_isGadTimelineDeveloped__c);
        const projParams = getFieldValue(data, uNI_IsProjectParameterCreatedForGAD__c);
        const isEKO = getFieldValue(data, uNI_IsEKOCompleted__c);
        const supplierStatus = getFieldValue(data, uNI_SupplierRegistrationStatus__c);
        const supplierProcessComplete = getFieldValue(data, uNI_IsSupplierNumberProcessComplete__c);
        const capAssessStarted = getFieldValue(data, uNI_IsCapacityAssessmentStarted__c);
        const capSkipped = getFieldValue(data, uNI_IsCapacitySkipped__c);
        const showFensa = getFieldValue(data, uNI_Show_Request_FENSA_Assessment__c);
        const riskVersion = Number(getFieldValue(data, uNI_CurrentRiskRegisterVersion__c)) || 0;
        const ppfStarted = getFieldValue(data, uNI_IsPPFStarted__c);
        const ppfSkipped = getFieldValue(data, uNI_IsPPFskipped__c);

        // --- 2. GENERIC VARIABLES ---
        const iaStatus = getFieldValue(data, IA_Status);
        const investmentStatus = getFieldValue(data, uNI_InvestmentStatus__c);
        const closureInitiated = getFieldValue(data, uNI_ClosureInitiated__c);
        const logframeCreated = getFieldValue(data, uNI_isLogframeCreated__c);
        const questionsFinalized = getFieldValue(data, uNI_IsQuestionFinalizedInCFP__c);
        const amIGAM = getFieldValue(data, IA_AmIGAM);
        const allL1 = getFieldValue(data, uNI_AllL1QuestionAnswered__c);
        const allL2 = getFieldValue(data, uNI_AllL2QuestionsAnswered__c);
        const allL3Sec = getFieldValue(data, uNI_AllL3SecAnswered__c);
        const allL3Prc = getFieldValue(data, uNI_AllL3PrcAnswered__c);
        const jrcReviewCompleted = getFieldValue(data, uNI_JRCReviewCompleted__c);

        const stage4PTSubmitted = getFieldValue(data, uNI_IsStage4PTPackageSubmitted__c);
        const stage4Submitted = getFieldValue(data, uNI_IsStage4PackageSubmitted__c);
        const hasAllPTCleared = getFieldValue(data, uNI_HasAllPTClearedSMTPackage__c);
        const approvedByDirPD = getFieldValue(data, uNI_IsApprovedbyDirectorPD__c);
        const approvedByLegal = getFieldValue(data, uNI_IsApprovedBySeniorLegalOfficer__c);
        const isSelectedSMT = getFieldValue(data, uNI_IsUserSelectedSMT__c);
        const smtStopped = getFieldValue(data, uNI_IsSMTReviewStopped__c);
        const edOutcome = getFieldValue(data, uNI_EDOutcome__c);
        const ebDecisionTaken = getFieldValue(data, uNI_IsEBRequiredDecisionTaken__c);
        const gadCancelled = getFieldValue(data, uNI_IsGADCancelled__c);
        const ebReviewDone = getFieldValue(data, uNI_IsEBReviewDone__c);
        const ebReviewStarted = getFieldValue(data, uNI_IsEBReviewStarted__c);
        const isUserGAM = getFieldValue(data, uNI_IsUserGAM__c);
        const isUserDirectorPD = getFieldValue(data, uNI_IsUserDirectorPD__c);
        const isUserED = getFieldValue(data, uNI_IsUserED__c);
        const isUserEDAssistant = getFieldValue(data, uNI_IsUserEDAssistant__c);
        const isStage1Defined = getFieldValue(data, uNI_IsStage1Defined__c);
        const isStage2Defined = getFieldValue(data, uNI_isStage2Defined__c);
        const isCurrentUserActionOwner = getFieldValue(data, uNI_IsUserCurrentActionOwner__c);
        const isUserSecondaryActionPending=getFieldValue(data, uNI_IsUserSecondaryActionPending__c);
        const isUserThirdactionPending=getFieldValue(data, uNI_IsUserThirdactionPending__c);
        const isSysAdmin = (this.currentUserProfile && this.currentUserProfile.includes('System Administrator'));

        this.ACTION_CONFIG.IndividualApplication.menus.forEach(menu => {
            const originalLabels = menu.actions.map(action => action.label);
            menu.actions = menu.actions.filter(action => {
                const label = action.label;

                // Visibility: always shown (common menu entries).
                if (label === 'Administer' || label === 'Manage' || label === 'Report Incident') {
                    return true;
                }

                // --- Proposal Application ---
                // Visibility: Proposal record type only.
                if (label === 'Add Reviewer') {
                    return isIaProposal;
                }
                // Visibility: Proposal record type only.
                else if (label === 'Assessment Response') {
                    return isIaProposal;
                }
                // Visibility: Proposal record type only.
                else if (label === 'Assign Reviewers') {
                    return isIaProposal;
                }
                else if (label === 'Complete Assessment') {
                    // Visibility: Proposal record type + status-specific completion flags.
                    if (!isIaProposal) return false;
                    if (iaStatus === 'Level 1 Review' && allL1) return true;
                    if (iaStatus === 'Level 2 Review' && allL2) return true;
                    if (iaStatus === 'Level 3 Review' && jrcReviewCompleted) return true;
                    return false;
                }
                // Visibility: Proposal record type only.
                else if (label === 'Person(s) reviewing') {
                    return isIaProposal;
                }
                // Visibility: Proposal record type only.
                else if (label === 'Proposal Assessment Report') {
                    return isIaProposal;
                }
                // Visibility: Proposal record type only.
                else if (label === 'Provide Proposal Feedback') {
                    return isIaProposal;
                }
                else if (label === 'Score Proposal Assessment' || label === 'Score Assessment') {
                    // Visibility: Proposal record type + questions finalized + in review levels (not Ready for EB Review).
                    if (!isIaProposal) return false;
                    const validStatuses = ['Level 1 Review', 'Level 2 Review', 'Level 3 Review'];
                    return (questionsFinalized && validStatuses.includes(iaStatus) && iaStatus !== 'Ready for EB Review');
                }
                // Visibility: Proposal record type only.
                else if (label === 'View L3 Scores') {
                    return isIaProposal;
                }

                // --- Investment ---
                else if (label === 'Create Closure') {
                    // Visibility: Investment record type + Actively Closing + closure not initiated.
                    return isIaInvestment && investmentStatus === 'Actively Closing' && !closureInitiated;
                }
                else if (label === 'Create Contributor User') {
                    // Visibility: Investment record type only.
                    return isIaInvestment;
                }
                else if (label === 'Create Logframe') {
                    // Visibility: Investment record type + logframe not created yet.
                    return isIaInvestment && !logframeCreated;
                }
                else if (label === 'Edit Implementer Accounts') {
                    // Visibility: Investment record type only.
                    return isIaInvestment;
                }
                else if (label === 'Edit Implementer and Contributor') {
                    // Visibility: Investment record type only.
                    return isIaInvestment;
                }
                else if (label === 'Initiate Financial Audit') {
                    // Visibility: Investment record type only.
                    return isIaInvestment;
                }
                else if (label === 'Start Financial Audit') {
                    // Visibility: Investment record type only.
                    return isIaInvestment;
                }
                else if (label === 'New Risk Register') {
                    // Visibility: Investment record type + no risk register yet.
                    return isIaInvestment && (riskVersion === 0);
                }
                else if (label === 'Update Risk Register') {
                    // Visibility: Investment record type + existing risk register.
                    return isIaInvestment && (riskVersion !== 0);
                }
                else if (label === 'Submit Closure') {
                    // Visibility: Investment record type only.
                    return isIaInvestment;
                }
                else if (label === 'Submit FENSA Request') {
                    // Visibility: Investment record type only.
                    return isIaInvestment;
                }
                else if (label === 'Upload Gantt Chart') {
                    // Visibility: Investment record type only.
                    return isIaInvestment;
                }

                // --- GAD ---
                else if (label === 'Cancel GAD') {
                    // Visibility: GAD + PM/PO + not cancelled + not Grant Agreement Signed.
                    return isIaGad && isPMPO && !gadCancelled && stage !== 'Grant Agreement Signed';
                }
                else if (label === 'Capacity Assessment') {
                    // Visibility: GAD + PM/PO + capacity assessment not started or skipped.
                    return isIaGad && isPMPO && !capAssessStarted && !capSkipped;
                }
                else if (label === 'Clear Package as Legal') {
                    // Visibility: GAD record type (no additional gating here).
                    return isIaGad && isCurrentUserActionOwner && actionOwner=='Senior Legal Officer';
                }
                else if (label === 'Clear package for SMT Review') {
                    // Visibility: GAD + PT + action owner + PT action owner + not all PT cleared.
                    return isIaGad && isPT && isCurrentUserActionOwner && !hasAllPTCleared && actionOwner === 'PT';
                }
                else if (label === 'Clear the GAD Package As Director') {
                    // Visibility: GAD + Director PD action owner + current user title Director PD + EB decision not taken.
                    return isIaGad && actionOwner === 'Director PD' && this.currentUserTitle === 'Director PD' && !ebDecisionTaken;
                }
                else if (label === 'Clear the GAD Package As ED') {
                    // Visibility: GAD + ED action owner + Stage 4 + ED or ED Assistant title.
                    return isIaGad && actionOwner === 'ED' && stage === 'Stage 4' && (this.currentUserTitle === 'ED' || this.currentUserTitle === 'ED Assistant');
                }
                else if (label === 'Clear the GAD Package SMT') {
                    // Visibility: GAD + selected SMT user + SMT action owner + SMT review not stopped.
                    return isIaGad && isSelectedSMT && actionOwner === 'SMT' && !smtStopped;
                }
                else if (label === 'Confirm No EB Review Required') {
                    // Visibility: GAD + EB decision taken + Director PD action owner + Stage 5 + Director PD or current action owner.
                    return isIaGad && ebDecisionTaken && actionOwner === 'Director PD' && stage === 'Stage 5' && (isUserDirectorPD || isCurrentUserActionOwner);
                }
                else if (label === 'Confirm OMT meeting date') {
                    // Visibility: GAD + PM/PO + Stage 2 + Stage 2 submitted + OMT date not confirmed.
                    return isIaGad && isPMPO && stage === 'Stage 2' && stage2Submitted && !omtDateConfirmed;
                }
                else if (label === 'Confirm PRC review date') {
                    // Visibility: GAD + PM/PO + Stage 2 + Stage 2 submitted + PRC date not confirmed.
                    return isIaGad && isPMPO && stage === 'Stage 2' && stage2Submitted && !prcDateConfirmed;
                }
                else if (label === 'Define Stage 1') {
                    // Visibility: GAD record type (no additional gating).
                    return isIaGad && isPMPO && stage === 'Stage 1' && actionOwner === 'PM/PO' && !stage1Submitted && isEKO;
                }
                else if (label === 'Define Stage 2') {
                    // Visibility: GAD + PM/PO + Stage 2 + PM/PO action owner + Stage 2 not submitted.
                    return isIaGad && isPMPO && stage === 'Stage 2' && actionOwner === 'PM/PO' && !isStage2Defined;
                }
                else if (label === 'Define Stage 3') {
                    // Visibility: GAD + PM/PO + Stage 3 + OMT/PRC completed + Stage 3 files not selected.
                    return isIaGad && isPMPO && stage === 'Stage 3' && omtStatus === 'Completed' && prcStatus === 'Complete' && !stage3FilesSelected;
                }
                else if (label === 'Develop GAD Timeline') {
                    // Visibility: GAD + PM/PO + timeline not developed.
                   
                    return isIaGad && isPMPO && !timelineDev;
                }
                else if (label === 'Edit GAD Timeline') {
                    // Visibility: GAD record type (no additional gating).
                    return  isIaGad && isPMPO && timelineDev;
                }
                else if (label === 'Edit PT Members') {
                    // Visibility: GAD record type (no additional gating).
                    return isIaGad;
                }
                else if (label === 'Edit Stage 1') {
                    // Visibility: GAD + PM/PO + Stage 1 defined + Stage 1.
                    return isIaGad && isPMPO && isStage1Defined && stage === 'Stage 1';
                }
                else if (label === 'Edit Stage 2') {
                    // Visibility: GAD + PM/PO + Pre-Grantee action owner + Stage 2.
                    return isIaGad && isPMPO && isStage2Defined && stage === 'Stage 2';
                }
                else if (label === 'Edit Stage 3') {
                    // Visibility: GAD + Stage 3 + PM/PO + Stage 3 files selected.
                    return isIaGad && stage === 'Stage 3' && isPMPO && stage3FilesSelected;
                }
                else if (label === 'Edit Stage 3 Package (PT)' || label === 'Edit Stage 3 Package(PT)') {
                    // Visibility: GAD + Stage 3 + PM/PO + Stage 3 files selected.
                    return isIaGad && stage === 'Stage 3' && isPMPO && stage3FilesSelected;
                }
                else if (label === 'Edit Stage 4') {
                    // Visibility: GAD + PM/PO + Stage 4.
                    return isIaGad && isPMPO && stage === 'Stage 4';
                }
                else if (label === 'Edit Stage 4 Package (PT)' || label === 'Edit Stage 4 Package(PT)') {
                    // Visibility: GAD + PM/PO + Stage 4.
                    return isIaGad && isPMPO && stage === 'Stage 4';
                }
                else if (label === 'Mark EB Review As Not Required') {
                    // Visibility: GAD + Stage 5 + PM/PO + PM/PO action owner.
                    return isIaGad && stage === 'Stage 5' && isPMPO && actionOwner === 'PM/PO';
                }
                else if (label === 'Mark EB Voting as concluded') {
                    // Visibility: GAD + GAM user + Stage 5 + EB review started but not done.
                    return isIaGad && isUserGAM && stage === 'Stage 5' && !ebReviewDone && ebReviewStarted;
                }
                else if (label === 'Mark EKO as Completed') {
                    // Visibility: GAD + PM/PO + Stage 1 + IKO completed + EKO not completed.
                    return isIaGad && isPMPO && stage === 'Stage 1' && isIKO && !isEKO;
                }
                else if (label === 'Mark IKO as Completed') {
                    // Visibility: GAD + PT + Stage 1 + project team, timeline, and params set.
                    return isIaGad && isPT && stage === 'Stage 1' && !isIKO && projectTeamID && timelineDev && projParams;
                }
                else if (label === 'Move to Stage 2') {
                    // Visibility: GAD + Stage 1 + Stage 1 submitted + PM/PO.
                    return isIaGad && stage === 'Stage 1' && stage1Submitted && isPMPO;
                }
                else if (label === 'PPF') {
                    // Visibility: GAD + PM/PO + PPF not started or skipped.
                    return isIaGad && isPMPO && !ppfStarted && !ppfSkipped;
                }
                else if (label === 'Prepare for SMT Clearance') {
                    // Visibility: GAD + Stage 4 + PM/PO + Stage 4 submitted + PM/PO action owner + not all PT cleared.
                    return isIaGad && stage === 'Stage 4' && isPMPO && stage4Submitted && actionOwner === 'PM/PO' && !hasAllPTCleared;
                }
                else if (label === 'Project Parameters') {
                    // Visibility: GAD + PM/PO or System Admin.
                    return (isIaGad|| isIaInvestment) && (isPMPO || isSysAdmin);
                }
                else if (label === 'Provide GAD Feedback') {
                    // Visibility: GAD record type (no additional gating).
                    return isIaGad;
                }
                else if (label === 'PT Members') {
                    // Visibility: GAD record type (no additional gating).
                    return isIaGad;
                }
                else if (label === 'Report outcomes from OMT') {
                    // Visibility: GAD + PM/PO + OMT reviewers set + OMT not completed.
                    return isIaGad && isPMPO && omtReviewerIds != null && omtStatus !== 'Completed';
                }
                else if (label === 'Request FENSA Assessment') {
                    // Visibility: GAD + user not Risk Manager + FENSA not already requested.
                    return isIaGad && this.currentUserTitle !== 'Risk Manager' && !showFensa;
                }
                else if (label === 'Return to stage 2') {
                    // Visibility: GAD + Stage 3 + PM/PO + resubmit Stage 2 not already requested.
                    return isIaGad && stage === 'Stage 3' && isPMPO && !resubmitStage2;
                }
                else if (label === 'Select PRC and Submit for Feedback') {
                    // Visibility: GAD + GAM + Stage 3 + GAM action owner.
                    return isIaGad && amIGAM && stage === 'Stage 3' && actionOwner === 'GAM';
                }
                else if (label === 'Start EB Review') {
                    // Visibility: GAD + GAM + Stage 5 + EB decision taken + EB review not started + GAM action owner.
                    return isIaGad && isUserGAM && stage === 'Stage 5' && !ebReviewStarted && ebDecisionTaken && actionOwner === 'GAM';
                }
                else if (label === 'Start OMT Review') {
                    // Visibility: GAD + PM/PO + Stage 3 + not submitted + OMT reviewers set.
                    return isIaGad && isPMPO && stage === 'Stage 3' && omtReviewerIds == null;
                }
                else if (label === 'Start PRC Review') {
                    // Visibility: GAD + PM/PO + Stage 3 + not submitted + PRC not started.
                    return isIaGad && stage === 'Stage 3'  && isPMPO && !prcReviewStarted;
                }
                else if (label === 'Start Stage 3') {
                    // Visibility: GAD record type (no additional gating).
                    return isIaGad && stage==='Stage 2' && isPMPO && prcStatus=='Completed' &&  omtStatus === 'Completed'  ;
                }
                else if (label === 'Start Stage 4') {
                    // Visibility: GAD + PM/PO + Stage 3 + OMT/PRC complete + Stage 3 submitted.
                    return isIaGad && isPMPO && omtStatus === 'Completed' && prcStatus === 'Complete' && stage === 'Stage 3' && stage3Submitted;
                }
                else if (label === 'Start Supplier Registration') {
                    // Visibility: GAD + supplier registration required + not completed + PM/PO.
                    return isIaGad && supplierStatus !== 'NA' && !supplierProcessComplete && isPMPO;
                }
                else if (label === 'Stop SMT Review') {
                    // Visibility: GAD + PT + SMT action owner + SMT review not stopped.
                    return isIaGad && isPT && actionOwner === 'SMT' && !smtStopped;
                }
                else if (label === 'Submit For EB Review') {
                    // Visibility: GAD + PM/PO + Stage 5 + EB decision not taken.
                    return isIaGad && isPMPO && stage === 'Stage 5' && !ebDecisionTaken;
                }
                else if (label === 'Submit for ED Clearance') {
                    // Visibility: GAD + PM/PO + PM/PO action owner + Stage 4 + Director + Legal approved.
                    return isIaGad && isPMPO && actionOwner === 'PM/PO' && approvedByDirPD && stage === 'Stage 4' && approvedByLegal;
                }
                else if (label === 'Submit for SMT Clearance') {
                    // Visibility: GAD + PM/PO + Stage 4 + (PM/PO action owner OR all PT cleared) + not yet approved by Director/Legal.
                    return isIaGad && isPMPO && (actionOwner === 'PM/PO' || hasAllPTCleared) && !approvedByDirPD && !approvedByLegal && stage === 'Stage 4';
                }
                else if (label === 'Submit PRC Feedback') {
                    // Visibility: GAD record type (no additional gating).
                    return isIaGad && stage==='Stage 3' && actionOwner==='PRC' && IsActionOwner;
                }
                else if (label === 'Submit to PRC for review') {
                    // Visibility: GAD record type (no additional gating).
                    return isIaGad && stage==='Stage 3' && actionOwner==='GAM';
                }
                else if (label === 'Submit to SMT members') {
                    // Visibility: GAD + PT + SMT review stopped + PT action owner.
                    return isIaGad && isPT && smtStopped && actionOwner === 'PT';
                }
                else if (label === 'Timeline') {
                    // Visibility: GAD + PM/PO + timeline developed.
                    return isIaGad && isPMPO && timelineDev;
                }
                else if (label === 'Upload Additional Files') {
                    // Visibility: GAD + (PT + SMT stopped + Stage 4) OR (PM/PO + ED pending changes + Stage 5 + EB decision not taken).
                    return isIaGad && ((isPT && smtStopped && stage === 'Stage 4') || (isPMPO && edOutcome === 'Clear the Package With Pending Changes' && stage === 'Stage 5' && !ebDecisionTaken));
                }
                else if (label === 'Upload ED Signed Face Sheet') {
                    // Visibility: GAD + current action owner + ED/ED Assistant + Pending ED countersignature.
                    return isIaGad && isCurrentUserActionOwner && (isUserED || isUserEDAssistant) && stage === 'Pending ED countersignature';
                }
                else if (label === 'Upload Pre-Grantee Signed FaceSheet') {
                    // Visibility: GAD + PM/PO + Agreement ready for signature.
                    return isIaGad && isPMPO && stage === 'Agreement ready for signature';
                }
                else if (label === 'Upload Stage 1 package') {
                    // Visibility: GAD record type (no additional gating).
                    return isIaGad && isPT && stage=='Stage 1' && isStage1Defined && !stage1Submitted;
                }
                else if (label === 'Upload Stage 2 package') {
                    // Visibility: GAD + PT + (Stage 2 + Pre-Grantee action owner) OR resubmit Stage 2.
                    return isIaGad && isPT && ((stage === 'Stage 2' && actionOwner === 'Pre-Grantee') || resubmitStage2);
                }
                else if (label === 'Upload Stage 3 Package (Pre-grantee)' || label === 'Upload Stage 3 Package(Pre-grantee)') {
                    // Visibility: GAD + PT + Stage 3 + not submitted + OMT/PRC complete + Stage 3 files selected.
                    return isIaGad && isPT && stage === 'Stage 3' && !stage3Submitted && omtStatus === 'Completed' && prcStatus === 'Complete' && stage3FilesSelected;
                }
                else if (label === 'Upload Stage 3 Package (PT)' || label === 'Upload Stage 3 Package(PT)') {
                    // Visibility: GAD + PM/PO + Stage 3 + OMT/PRC complete + Stage 3 files selected.
                    return isIaGad && isPMPO && stage === 'Stage 3' && omtStatus === 'Completed' && prcStatus === 'Complete' && stage3FilesSelected;
                }
                else if (label === 'Upload Stage 4 Package (Pre-Grantee)' || label === 'Upload Stage 4 Package(Pre-Grantee)') {
                    // Visibility: GAD + PT + Stage 4 + Stage 4 not submitted.
                    return isIaGad && isPT && stage === 'Stage 4' && !stage4Submitted;
                }
                else if (label === 'Upload Stage 4 Package (PT)' || label === 'Upload Stage 4 Package(PT)') {
                    // Visibility: GAD + PM/PO + Stage 4 + PT package not submitted.
                    return isIaGad && isPMPO && stage === 'Stage 4' && !stage4PTSubmitted;
                }
                else if (label === 'Start First Disbursement') {
                    // Visibility: GAD record type (no additional gating).
                    return isIaGad;
                }

                return false;
            });

            if (this.isDebugEnabled()) {
                const visibleLabels = menu.actions.map(action => action.label);
                const hiddenLabels = originalLabels.filter(label => !visibleLabels.includes(label));
                // eslint-disable-next-line no-console
                console.warn('@@ [uNI_ButtonListClone] IA menu decisions', {
                    objectApiName: this.objectApiName,
                    menu: menu.label,
                    recordType: resolvedIaRtDevName || rtDevName || iaRtId,
                    visible: visibleLabels,
                    hidden: hiddenLabels
                });
            }
        });
    }




    filterReprogrammingActions(data) {
        // eslint-disable-next-line no-console
        console.warn('@@ [uNI_ButtonListClone] filterReprogrammingActions start');
        const rrRtDevName = getFieldValue(data, RR_RT_DevName);
        const rrRtId = getFieldValue(data, RR_RecordTypeId);
        const resolvedRrRtDevName = rrRtDevName || this.rrRecordTypeById[rrRtId];
        const isMaterialEb = resolvedRrRtDevName === RR_RECORDTYPE_DEVNAMES.MATERIAL_EB;

        const rrStage = getFieldValue(data, RR_uNI_Stage__c);
        const rrStatus = getFieldValue(data, RR_uNI_Status__c);
        const rrActionOwner = getFieldValue(data, RR_uNI_CurrentActionOwner__c);
        const rrSecondaryOwner = getFieldValue(data, RR_uNI_SecondaryActionOwner__c);
        const rrIsActionOwner = getFieldValue(data, RR_uNI_IsUserActionOwner__c);
        const rrIsSecondaryOwner = getFieldValue(data, RR_uNI_IsUserSecondaryOwner__c);
        const rrIsPMPO = getFieldValue(data, RR_uNI_IsUserPMOrPO__c);
        const rrStage3Submitted = getFieldValue(data, RR_uNI_IsStage3PackageSubmitted__c);
        const rrStage3PTSubmitted = getFieldValue(data, RR_uNI_IsStage3PTPackageSubmitted__c);
        const rrOmtReviewerIds = getFieldValue(data, RR_uNI_OMTReviewerIds__c);
        const rrPrcReviewStarted = getFieldValue(data, RR_uNI_IsPRCReviewStarted__c);
        const rrStage3FilesSelected = getFieldValue(data, RR_uNI_IsStage3FilesSelected__c);
        const rrOmtStatus = getFieldValue(data, RR_uNI_OMTReviewStatus__c);
        const rrPrcStatus = getFieldValue(data, RR_uNI_PRCReviewStatus__c);
        const rrResubmitStage2 = getFieldValue(data, RR_uNI_ResubmitStage2Package__c);
        const rrStage2Submitted = getFieldValue(data, RR_uNI_IsStage2PackageSubmitted__c);
        const rrStage1Submitted = getFieldValue(data, RR_uNI_IsStage1PackageSubmitted__c);
        const rrPrcDateConfirmed = getFieldValue(data, RR_uNI_isPRCReviewDateConfirmed__c);
        const rrOmtDateConfirmed = getFieldValue(data, RR_uNI_isOMTReviewDateConfirmed__c);
        const rrStage4Submitted = getFieldValue(data, RR_uNI_IsStage4PackageSubmitted__c);
        const rrStage4PTSubmitted = getFieldValue(data, RR_uNI_IsStage4PTPackageSubmitted__c);
        const rrHasAllPTCleared = getFieldValue(data, RR_uNI_HasAllPTClearedSMTPackage__c);
        const rrApprovedByDirPD = getFieldValue(data, RR_uNI_IsApprovedbyDirectorPD__c);
        const rrApprovedByLegal = getFieldValue(data, RR_uNI_IsApprovedBySeniorLegalOfficer__c);
        const rrSmtStopped = getFieldValue(data, RR_uNI_IsSMTReviewStopped__c);
        const rrEdOutcome = getFieldValue(data, RR_uNI_EDOutcome__c);
        const rrEbDecisionTaken = getFieldValue(data, RR_uNI_IsEBRequiredDecisionTaken__c);
        const rrEbReviewDone = getFieldValue(data, RR_uNI_IsEBReviewDone__c);
        const rrEbReviewStarted = getFieldValue(data, RR_uNI_IsEBReviewStarted__c);
        const rrProjParams = getFieldValue(data, RR_uNI_IsProjectParameterCreatedForRep__c);
        const rrIsStage1Defined = getFieldValue(data, RR_uNI_isStage1Defined__c);

        const rrIsPT = rrIsSecondaryOwner;

        this.ACTION_CONFIG.uNI_ReprogrammingRequest__c.menus.forEach(menu => {
            const originalLabels = menu.actions.map(action => action.label);
            menu.actions = menu.actions.filter(action => {
                const label = action.label;

                // Visibility: Reprogramming buttons only apply to Material EB record type.
                if (!isMaterialEb) {
                    return false;
                }

                // Visibility: always shown (menu headers/anchors).
                if (label === 'Manage') {
                    return true;
                }

                // Visibility: always shown for Material EB.
                if (label === 'Review Reprogramming Request') {
                    return rrIsPMPO && rrStatus === 'Requested';
                }
                else if (label === 'Edit Implementer and Contributor') {
                    // Visibility: always shown for Material EB.
                    return true;
                }
                else if (label === 'Define Stage 3') {
                    // Visibility: PM/PO + Stage 3 + OMT/PRC complete + Stage 3 files not selected.
                    return rrIsPMPO && rrStage === 'Stage 3' && rrOmtStatus === 'Completed' && rrPrcStatus === 'Complete' && !rrStage3FilesSelected;
                }
                else if (label === 'Edit GAD Timeline') {
                    // Visibility: PM/PO only.
                    return rrIsPMPO;
                }
                else if (label === 'Edit Stage 3 Package (PT)') {
                    // Visibility: PM/PO + Stage 3 + Stage 3 files selected.
                    return rrStage === 'Stage 3' && rrIsPMPO && rrStage3FilesSelected;
                }
                else if (label === 'Edit Stage 4 Package (PT)') {
                    // Visibility: PM/PO + Stage 4.
                    return rrStage === 'Stage 4' && rrIsPMPO;
                }
                else if (label === 'Submit PRC Feedback') {
                    // Visibility: Stage 3 + PRC action owner + user is action owner.
                    return rrStage === 'Stage 3' && rrActionOwner === 'PRC' && rrIsActionOwner;
                }
                else if (label === 'Submit to PRC for review') {
                    // Visibility: PM/PO only.
                    return rrIsPMPO;
                }
                else if (label === 'Upload Stage 3 Package (Pre-grantee)') {
                    // Visibility: PT + Stage 3 + not submitted + OMT/PRC complete + Stage 3 files selected.
                    return rrIsPT && rrStage === 'Stage 3' && !rrStage3Submitted && rrOmtStatus === 'Completed' && rrPrcStatus === 'Complete' && rrStage3FilesSelected;
                }
                else if (label === 'Upload Stage 3 Package (PT)') {
                    // Visibility: PM/PO + Stage 3 + OMT/PRC complete + Stage 3 files selected.
                    return rrIsPMPO && rrStage === 'Stage 3' && rrOmtStatus === 'Completed' && rrPrcStatus === 'Complete' && rrStage3FilesSelected;
                }
                else if (label === 'Upload Stage 4 Package (Pre-Grantee)') {
                    // Visibility: PT + Stage 4 + Stage 4 not submitted.
                    return rrIsPT && rrStage === 'Stage 4' && !rrStage4Submitted;
                }
                else if (label === 'Upload Stage 4 Package (PT)') {
                    // Visibility: PM/PO + Stage 4 + PT package not submitted.
                    return rrIsPMPO && rrStage === 'Stage 4' && !rrStage4PTSubmitted;
                }
                else if (label === 'Clear Package as Legal') {
                    // Visibility: Secondary owner is Senior Legal Officer + user title matches.
                    return rrSecondaryOwner === 'Senior Legal Officer' && this.currentUserTitle === 'Senior Legal Officer';
                }
                else if (label === 'Clear package for SMT Review') {
                    // Visibility: PT + PT action owner + not all PT cleared.
                    return rrIsPT && rrActionOwner === 'PT' && !rrHasAllPTCleared;
                }
                else if (label === 'Clear the GAD Package As Director') {
                    // Visibility: Director PD action owner + Director PD title + EB decision not taken.
                    return rrActionOwner === 'Director PD' && this.currentUserTitle === 'Director PD' && !rrEbDecisionTaken;
                }
                else if (label === 'Clear the GAD Package As ED') {
                    // Visibility: ED action owner + Stage 4 + ED/ED Assistant title.
                    return rrActionOwner === 'ED' && rrStage === 'Stage 4' && (this.currentUserTitle === 'ED' || this.currentUserTitle === 'ED Assistant');
                }
                else if (label === 'Clear the GAD Package SMT') {
                    // Visibility: SMT action owner + SMT review not stopped.
                    return rrActionOwner === 'SMT' && !rrSmtStopped;
                }
                else if (label === 'Confirm No EB Review Required') {
                    // Visibility: EB decision taken + Director PD action owner + Stage 5 + Director PD title.
                    return rrEbDecisionTaken && rrActionOwner === 'Director PD' && rrStage === 'Stage 5' && this.currentUserTitle === 'Director PD';
                }
                else if (label === 'Confirm OMT meeting date') {
                    // Visibility: PM/PO + Stage 2 + Stage 2 submitted + OMT date not confirmed.
                    return rrIsPMPO && rrStage === 'Stage 2' && rrStage2Submitted && !rrOmtDateConfirmed;
                }
                else if (label === 'Confirm PRC review date') {
                    // Visibility: PM/PO + Stage 2 + Stage 2 submitted + PRC date not confirmed.
                    return rrIsPMPO && rrStage === 'Stage 2' && rrStage2Submitted && !rrPrcDateConfirmed;
                }
                else if (label === 'Define Stage 1') {
                    // Visibility: PM/PO + Stage 1 + Stage 1 defined + project parameters not created.
                    return rrIsPMPO && rrStage === 'Stage 1' && rrIsStage1Defined && !rrProjParams;
                }
                else if (label === 'Define Stage 2') {
                    // Visibility: PM/PO + Stage 2 + PM/PO action owner + Stage 2 not submitted.
                    return rrIsPMPO && rrStage === 'Stage 2' && rrActionOwner === 'PM/PO' && !rrStage2Submitted;
                }
                else if (label === 'Develop GAD Timeline') {
                    // Visibility: PM/PO only.
                    return rrIsPMPO;
                }
                else if (label === 'Edit Stage 1') {
                    // Visibility: PM/PO + Stage 1 + Stage 1 defined.
                    return rrIsPMPO && rrIsStage1Defined && rrStage === 'Stage 1';
                }
                else if (label === 'Edit Stage 2') {
                    // Visibility: PM/PO + Pre-Grantee action owner + Stage 2.
                    return rrIsPMPO && rrActionOwner === 'Pre-Grantee' && rrStage === 'Stage 2';
                }
                else if (label === 'Edit Stage 3') {
                    // Visibility: PM/PO + Stage 3 + Stage 3 files selected.
                    return rrStage === 'Stage 3' && rrIsPMPO && rrStage3FilesSelected;
                }
                else if (label === 'Edit Stage 4') {
                    // Visibility: PM/PO + Stage 4.
                    return rrIsPMPO && rrStage === 'Stage 4';
                }
                else if (label === 'Mark EB Review As Not Required') {
                    // Visibility: PM/PO + Stage 5 + PM/PO action owner.
                    return rrStage === 'Stage 5' && rrIsPMPO && rrActionOwner === 'PM/PO';
                }
                else if (label === 'Mark EB Voting as concluded') {
                    // Visibility: GAM action owner + Stage 5 + EB review started but not done.
                    return rrActionOwner === 'GAM' && rrStage === 'Stage 5' && !rrEbReviewDone && rrEbReviewStarted;
                }
                else if (label === 'Mark EKO as Completed') {
                    // Visibility: PM/PO + Stage 1.
                    return rrIsPMPO && rrStage === 'Stage 1';
                }
                else if (label === 'Mark IKO as Completed') {
                    // Visibility: PT + Stage 1 + project parameters present.
                    return rrIsPT && rrStage === 'Stage 1' && rrProjParams;
                }
                else if (label === 'Move to Stage 2') {
                    // Visibility: PM/PO + Stage 1 + Stage 1 submitted.
                    return rrStage === 'Stage 1' && rrStage1Submitted && rrIsPMPO;
                }
                else if (label === 'Prepare for SMT Clearance') {
                    // Visibility: PM/PO + Stage 4 + Stage 4 submitted + PM/PO action owner + not all PT cleared.
                    return rrStage === 'Stage 4' && rrIsPMPO && rrStage4Submitted && rrActionOwner === 'PM/PO' && !rrHasAllPTCleared;
                }
                else if (label === 'Project Parameters') {
                    // Visibility: PM/PO only.
                    return rrIsPMPO;
                }
                else if (label === 'Report outcomes from OMT') {
                    // Visibility: PM/PO + OMT reviewers set + OMT not completed.
                    return rrIsPMPO && rrOmtReviewerIds != null && rrOmtStatus !== 'Completed';
                }
                else if (label === 'Return to stage 2') {
                    // Visibility: PM/PO + Stage 3 + resubmit Stage 2 not already requested.
                    return rrStage === 'Stage 3' && rrIsPMPO && !rrResubmitStage2;
                }
                else if (label === 'Select PRC and Submit for Feedback') {
                    // Visibility: GAM action owner + Stage 3.
                    return rrStage === 'Stage 3' && rrActionOwner === 'GAM';
                }
                else if (label === 'Start EB Review') {
                    // Visibility: GAM action owner + Stage 5 + EB decision taken + EB review not started.
                    return rrStage === 'Stage 5' && !rrEbReviewStarted && rrEbDecisionTaken && rrActionOwner === 'GAM';
                }
                else if (label === 'Start OMT Review') {
                    // Visibility: PM/PO + Stage 3 + not submitted + OMT reviewers set.
                    return rrIsPMPO && rrStage === 'Stage 3' && !rrStage3Submitted && rrOmtReviewerIds != null;
                }
                else if (label === 'Start PRC Review') {
                    // Visibility: PM/PO + Stage 3 + not submitted + PRC not started.
                    return rrStage === 'Stage 3' && !rrStage3Submitted && rrIsPMPO && !rrPrcReviewStarted;
                }
                else if (label === 'Start Stage 4') {
                    // Visibility: PM/PO + Stage 3 + OMT/PRC complete + Stage 3 submitted.
                    return rrIsPMPO && rrOmtStatus === 'Completed' && rrPrcStatus === 'Complete' && rrStage === 'Stage 3' && rrStage3Submitted;
                }
                else if (label === 'Start Supplier Registration') {
                    // Visibility: PM/PO only.
                    return rrIsPMPO;
                }
                else if (label === 'Stop SMT Review') {
                    // Visibility: PT + SMT action owner + SMT review not stopped.
                    return rrIsPT && rrActionOwner === 'SMT' && !rrSmtStopped;
                }
                else if (label === 'Submit For EB Review') {
                    // Visibility: PM/PO + Stage 5 + EB decision not taken.
                    return rrIsPMPO && rrStage === 'Stage 5' && !rrEbDecisionTaken;
                }
                else if (label === 'Submit for ED Clearance') {
                    // Visibility: PM/PO + PM/PO action owner + Stage 4 + Director + Legal approved.
                    return rrIsPMPO && rrActionOwner === 'PM/PO' && rrApprovedByDirPD && rrStage === 'Stage 4' && rrApprovedByLegal;
                }
                else if (label === 'Submit for SMT Clearance') {
                    // Visibility: PM/PO + Stage 4 + (PM/PO action owner OR all PT cleared) + not yet approved by Director/Legal.
                    return rrIsPMPO && (rrActionOwner === 'PM/PO' || rrHasAllPTCleared) && !rrApprovedByDirPD && !rrApprovedByLegal && rrStage === 'Stage 4';
                }
                else if (label === 'Submit to SMT members') {
                    // Visibility: PT + SMT review stopped + PT action owner.
                    return rrIsPT && rrSmtStopped && rrActionOwner === 'PT';
                }
                else if (label === 'Upload Additional Files') {
                    // Visibility: (PT + SMT stopped + Stage 4) OR (PM/PO + ED pending changes + Stage 5 + EB decision not taken).
                    return (rrIsPT && rrSmtStopped && rrStage === 'Stage 4') || (rrIsPMPO && rrEdOutcome === 'Clear the Package With Pending Changes' && rrStage === 'Stage 5' && !rrEbDecisionTaken);
                }
                else if (label === 'Upload ED Signed Face Sheet') {
                    // Visibility: ED action owner + Pending ED countersignature.
                    return rrActionOwner === 'ED' && rrStage === 'Pending ED countersignature';
                }
                else if (label === 'Upload Pre-Grantee Signed FaceSheet') {
                    // Visibility: PM/PO + Agreement ready for signature.
                    return rrIsPMPO && rrStage === 'Agreement ready for signature';
                }
                else if (label === 'Upload Stage 1 package') {
                    // Visibility: Stage 1 + project params + Stage 1 defined + action owner in Grantee/PT or PT user.
                    return rrStage === 'Stage 1' &&
                        rrProjParams &&
                        rrIsStage1Defined &&
                        (rrActionOwner === 'Grantee' || rrActionOwner === 'PT' || rrIsPT);
                }
                else if (label === 'Upload Stage 2 package') {
                    // Visibility: PT + (Stage 2 + Pre-Grantee action owner) OR resubmit Stage 2.
                    return rrIsPT && ((rrStage === 'Stage 2' && rrActionOwner === 'Pre-Grantee') || rrResubmitStage2);
                }

                return false;
            });

            if (this.isDebugEnabled()) {
                const visibleLabels = menu.actions.map(action => action.label);
                const hiddenLabels = originalLabels.filter(label => !visibleLabels.includes(label));
                // eslint-disable-next-line no-console
                console.warn('@@ [uNI_ButtonListClone] RR menu decisions', {
                    objectApiName: this.objectApiName,
                    menu: menu.label,
                    recordType: resolvedRrRtDevName || rrRtDevName || rrRtId,
                    visible: visibleLabels,
                    hidden: hiddenLabels
                });
            }
        });
    }


    isDebugEnabled() {
        return this.debug === true || this.debug === 'true' || this.debug === 'TRUE';
    }

    logDebug(...args) {
        if (this.isDebugEnabled()) {
            // eslint-disable-next-line no-console
            console.log(...args);
        }
    }
}
