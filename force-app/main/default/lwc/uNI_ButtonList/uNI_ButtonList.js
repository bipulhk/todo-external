import { LightningElement, api, wire, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';
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
import uNI_Stage__c from '@salesforce/schema/IndividualApplication.uNI_Stage__c';
import uNI_IsUserPMOrPO__c from '@salesforce/schema/IndividualApplication.uNI_IsUserPMOrPO__c';
import uNI_CurrentActionOwner__c from '@salesforce/schema/IndividualApplication.uNI_CurrentActionOwner__c';
import uNI_IsStage3PackageSubmitted__c from '@salesforce/schema/IndividualApplication.uNI_IsStage3PackageSubmitted__c';
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
import uNI_IsGADCancelled__c from '@salesforce/schema/IndividualApplication.uNI_IsGADCancelled__c';
import uNI_IsEBReviewDone__c from '@salesforce/schema/IndividualApplication.uNI_IsEBReviewDone__c';
import uNI_IsEBReviewStarted__c from '@salesforce/schema/IndividualApplication.uNI_IsEBReviewStarted__c';
import uNI_IsUserGAM__c from '@salesforce/schema/IndividualApplication.uNI_IsUserGAM__c';
import uNI_IsUserDirectorPD__c from '@salesforce/schema/IndividualApplication.uNI_IsUserDirectorPD__c';
import uNI_IsUserED__c from '@salesforce/schema/IndividualApplication.uNI_IsUserED__c';
import uNI_IsUserEDAssistant__c from '@salesforce/schema/IndividualApplication.uNI_IsUserEDAssistant__c';
import uNI_IsStage1Defined__c from '@salesforce/schema/IndividualApplication.uNI_isStage1Defined__c';
import uNI_IsUserCurrentActionOwner__c from '@salesforce/schema/IndividualApplication.uNI_IsUserCurrentActionOwner__c';
import PROFILE_NAME from '@salesforce/schema/User.Profile.Name';

// --- USER FIELDS ---
import USER_TITLE from '@salesforce/schema/User.Title';


export default class UniButtonList extends NavigationMixin(LightningElement) {

    @api recordId;
    @api objectApiName;

    @track isFlowOpen = false;
    @track isRecordForm = false;
    @track showFeedbackForm = false;

    @track selectedFlow;
    @track flowHeader = '';
    @track inputVariables = [];
    @track recordObjectApiName;
    @track recordFields = [];
    @track allmenus;
    @track currentUserTitle;
    @track currentUserProfile;

    @wire(getRecord, { recordId: userId, fields: [USER_TITLE, PROFILE_NAME] })
    wiredUser({ error, data }) {
        if (data) {
            this.currentUserTitle = getFieldValue(data, USER_TITLE);
            this.currentUserProfile = getFieldValue(data, PROFILE_NAME);
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
                        { label: 'Start Reprogramming', value: 'startReprogramming', type: 'placeholder' },
                        {
                            label: 'Start Financial Audit',
                            value: 'startFinancialAudit',
                            type: 'flow',
                            flowApi: 'uNI_Financial_Audit_Initiate_Process'
                        },
                        
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
                            label: 'Develop GAD Timeline',
                            value: 'developGadTimeline',
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
                        { label: 'Complete Assessment', value: 'completeAssessment', type: 'flow', flowApi: 'uNI_Change_Individual_Application_Review_Level' },
                        { label: 'Proceed to GAD Creation', value: 'proceedToGad', type: 'flow', flowApi: 'uNI_Approved_Application_To_GAD' },
                        { label: 'New Risk Register', value: 'uNI_RiskRegisterNewTab', type: 'LWC' },
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
                        {
                            label: 'Submit to PRC for review',
                            value: 'submitToPrcForReview',
                            type: 'flow',
                            flowApi: 'uNI_GADPRCReview'
                        },
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
 
            
                        { label: 'Request FENSA Assessment', value: 'requestFensaAssessment', type: 'flow', flowApi: 'uNI_Request_FENSA_Assessment' },
                        { label: 'Update Risk Register', value: 'uNI_RiskRegisterNewTab', type: 'LWC' },
                       

                        // --- GENERIC BUTTONS ---
                        
                       
                        { label: 'Notify Proponent', value: 'notifyProponent', type: 'url', url: '/lightning/cmp/c__YourOmniScriptComponent' },
                        { label: 'Score Proposal Assessment', value: 'uNI_ScoreAssessmentNewTab', type: 'LWC' },
                        { label: 'Complete Assessment', value: 'completeAssessment', type: 'flow', flowApi: 'uNI_Change_Individual_Application_Review_Level' },
                        { label: 'Proceed to GAD Creation', value: 'proceedToGad', type: 'flow', flowApi: 'uNI_Approved_Application_To_GAD' },
                        { label: 'New Risk Register', value: 'uNI_RiskRegisterNewTab', type: 'LWC' }


                    ]
                },
                {
                    label: 'Administer',
                    actions: [
                        { label: 'Edit PT Members', value: 'editPTMembers', type: 'flow', flowApi: 'uNI_AddmembertoIA' },
                        { label: 'Edit Implementer Accounts', value: 'editImplementerAccounts', type: 'flow', flowApi: 'uNI_EditContributor' }
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
                        {
                            label: 'Submit to PRC for review',
                            value: 'submitToPrcForReview',
                            type: 'flow',
                            flowApi: 'uNI_GADPRCReview'
                        },
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
@wire(getRecord, {
        recordId: '$recordId',
        fields: [
            // --- Existing FundingOpportunity Fields ---
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
            uNI_AMiSL__c,

            // --- NEW IndividualApplication Fields ---
            IA_Status, 
            IA_AmIGAM,
            uNI_InvestmentStatus__c, 
            uNI_ClosureInitiated__c, 
            uNI_isLogframeCreated__c, 
            uNI_IsQuestionFinalizedInCFP__c, 
             RT_DevName, IA_Status, IA_AmIGAM,
            uNI_Stage__c, uNI_IsUserPMOrPO__c, uNI_CurrentActionOwner__c,
            uNI_IsStage3PackageSubmitted__c, uNI_OMTReviewerIds__c,
            uNI_IsStage3FilesSelected__c, uNI_OMTReviewStatus__c, uNI_PRCReviewStatus__c,
            uNI_IsUserPT__c, uNI_ResubmitStage2Package__c, uNI_IsStage2PackageSubmitted__c,
            uNI_isPRCReviewDateConfirmed__c, uNI_isOMTReviewDateConfirmed__c, uNI_IsStage1PackageSubmitted__c,
            uNI_IsIKOCompleted__c, uNI_isProjectTeamIdentified__c, uNI_isGadTimelineDeveloped__c,
            uNI_IsProjectParameterCreatedForGAD__c, uNI_IsEKOCompleted__c, uNI_SupplierRegistrationStatus__c,
            uNI_IsSupplierNumberProcessComplete__c, uNI_IsCapacityAssessmentStarted__c, uNI_IsCapacitySkipped__c,
            uNI_Show_Request_FENSA_Assessment__c, uNI_CurrentRiskRegisterVersion__c, uNI_IsPPFStarted__c,
            uNI_IsPPFskipped__c, uNI_InvestmentStatus__c, uNI_ClosureInitiated__c,
            uNI_isLogframeCreated__c, uNI_IsQuestionFinalizedInCFP__c,uNI_IsStage4PTPackageSubmitted__c, uNI_IsStage4PackageSubmitted__c,
            uNI_HasAllPTClearedSMTPackage__c, uNI_IsApprovedbyDirectorPD__c,
            uNI_IsApprovedBySeniorLegalOfficer__c, uNI_IsUserSelectedSMT__c,
            uNI_IsSMTReviewStopped__c, uNI_EDOutcome__c, uNI_IsEBRequiredDecisionTaken__c,
            uNI_IsGADCancelled__c, uNI_IsEBReviewDone__c, uNI_IsEBReviewStarted__c,
            uNI_IsUserGAM__c, uNI_IsUserDirectorPD__c, uNI_IsUserED__c,
            uNI_IsUserEDAssistant__c, uNI_IsStage1Defined__c, uNI_IsUserCurrentActionOwner__c,
            
            // Note: uNI_AmIGAM__c is already listed above, so we reuse it
            uNI_AllL1QuestionAnswered__c,
            uNI_AllL2QuestionsAnswered__c,
            uNI_AllL3SecAnswered__c,
            uNI_AllL3PrcAnswered__c
        ]
    })
    wiredRecord({ error, data }) {
        console.log('@@ in wire1');
        if (data) {
            console.log('@@ in wire ifff - Object: ' + this.objectApiName);

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
                        if (action.label === 'Submit Draft for Final Review') return (status === 'New call in development' && (IsActionOwner || isGam || isSL));
                        if (action.label === 'Delegate Approval') return (status === 'Under Review' && IsActionOwner);
                        if (action.label === 'Add Call Translations') return (status === 'New call in development' && IsLead);
                        if (action.label === 'Add Important Dates') return isGam;
                        if (action.label === 'Delegate GAM Role') return (isOrginalGam && (isGAMDelegated == null || isGAMDelegated == undefined));
                        if (action.label === 'Add Meeting Notes') return (isGam || IsLead);
                        if (action.label === 'Edit Call and Proposal Form') return ((status === 'New call in development') && (isSL || isGam) && (FormStatus === '' || FormStatus === null || FormStatus === 'Draft' || FormStatus === 'Returned' || FormStatus === 'Approved with Comments' || FormStatus === 'Pending Director Review'));
                        if (action.label === 'Review Call and Proposal Form') return ((status === 'Under Review' && IsActionOwner) || (status === 'Ready to Publish' && isGam));
                        if (action.label === 'Edit Strategy Leads') return isSL || isGam;
                        if (action.label === 'Edit Call Authors') return isSL || isGam;
                        if (action.label === 'Edit GAM') return isGam;
                        if (action.label === 'Publish call') return status === 'Ready to Publish' && isGam;
                        if (action.label === 'Review Assessment Form') return ((isGam && assessmentStatus === 'Draft In Progress') || (isDir && assessmentStatus === 'Pending Director Review'));
                        if (action.label === 'Add Reviewer') return isGam;
                        if (action.label === 'Submit Form To Director') return isGam && assessmentStatus === 'Draft In Progress';
                        if (action.label === 'Accept Review') return isInvitedReviewer && !isAcceptedReviewer;
                        if (action.label === 'Inform Board Relation' || action.label === 'Update EB Voting Timeline') return status === 'Call Closed';
                        if (action.label === 'Provide Call For Proposal Feedback') return status === 'Active';
                        if (action.label === 'Edit Related Donors') return (isGam && (status === 'New call in development' || status === 'Under Review' || status === 'Ready to Publish'));
                        return true;
                    });
                });
            }

            // ============================================
            // 2. LOGIC FOR INDIVIDUAL APPLICATION
            // ============================================
            else if (this.objectApiName === 'IndividualApplication') {
                
                const iaStatus = getFieldValue(data, IA_Status);
                const investmentStatus = getFieldValue(data, uNI_InvestmentStatus__c);
                const closureInitiated = getFieldValue(data, uNI_ClosureInitiated__c);
                const logframeCreated = getFieldValue(data, uNI_isLogframeCreated__c);
                const questionsFinalized = getFieldValue(data, uNI_IsQuestionFinalizedInCFP__c);
                const amIGAM = getFieldValue(data, uNI_AmIGAM__c); // Reused
                const allL1 = getFieldValue(data, uNI_AllL1QuestionAnswered__c);
                const allL2 = getFieldValue(data, uNI_AllL2QuestionsAnswered__c);
                const allL3Sec = getFieldValue(data, uNI_AllL3SecAnswered__c);
                const allL3Prc = getFieldValue(data, uNI_AllL3PrcAnswered__c);

                this.ACTION_CONFIG.IndividualApplication.menus.forEach(menu => {
                    menu.actions = menu.actions.filter(action => {
                        // 1. Create Closure
                        if (action.label === 'Create Closure') return (investmentStatus === 'Actively Closing' && closureInitiated === false);
                        console.log( 'recieved logfram value '+logframeCreated);
                        // 2. Create Logframe
                        if (action.label === 'Create Logframe') return (logframeCreated === false);
                        
                        // 3. Notify Proponent
                        if (action.label === 'Notify Proponent') return (iaStatus === 'Ready for EB Review');
                        
                        // 4. Score Proposal Assessment
                        if (action.label === 'Score Proposal Assessment') {
                            const validStatuses = ['Level 1 Review', 'Level 2 Review', 'Level 3 Review'];
                            return (questionsFinalized === true && validStatuses.includes(iaStatus) && iaStatus !== 'Ready for EB Review');
                        }
                        
                        // 5. Complete Assessment
                        if (action.label === 'Complete Assessment') {
                            if (!amIGAM) return false; // Must be GAM
                            if (iaStatus === 'Level 1 Review' && allL1) return true;
                            if (iaStatus === 'Level 2 Review' && allL2) return true;
                            if (iaStatus === 'Level 3 Review' && allL3Sec && allL3Prc) return true;
                            return false;
                        }

                        // Always Visible Actions
                        if (action.label === 'Proceed to GAD Creation' || 
                            action.label === 'New Risk Register' || 
                            action.label === 'Edit Implementer and Contributor') {
                            return true;
                        }

                        return true; // Default
                    });
                });
            }
            else if(this.objectApiName === 'uNI_ReprogrammingRequest__c'){
          //      this.ACTION_CONFIG.uNI_ReprogrammingRequest__c.menus.forEach(menu => {
                //    menu.actions =true;});
                
            }

            // Apply filtered menus to the track variable
            this.allmenus = this.ACTION_CONFIG[this.objectApiName]?.menus;

        } else if (error) {
            console.error('Error loading record:', error);
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

    // 🔹 RECORD DATA (FundingOpportunity only)
    /*  @wire(getRecord, {
          recordId: '$recordId',
          fields: [
              Status,
              uNI_AmiActionOnwer__c,
              uNI_AmIGAM__c,
              uNI_AmILeadAuthor__c,
              uNI_AmIDirector__c,
              uNI_Assessment_Status__c
          ]
      }) */
    wiredRecord({ data }) {
        console.log('@@in wired Record');
        // if (!data || this.objectApiName !== 'FundingOpportunity' && this.objectApiName !== 'IndividualApplication') return;

        if (this.objectApiName == 'FundingOpportunity') {
            const status = getFieldValue(data, Status);
            const isSL = getFieldValue(data, uNI_AMiSL__c);
            const isGam = getFieldValue(data, uNI_AmIGAM__c);
            const IsLead = getFieldValue(data, uNI_AmILeadAuthor__c);
            const isDir = getFieldValue(data, uNI_AmIDirector__c) || false;
            const isInvitedReviewer = getFieldValue(data, uNI_AmiInvitedReviewer__c) || false;
            const FormStatus = getFieldValue(data, Status__c) || '';
            const assessmentStatus = getFieldValue(data, uNI_Assessment_Status__c) || '';
            const gamUserId = getFieldValue(data, uNI_GrantApplicationManager__c) || '';
            const isOrginalGam = (userId === gamUserId);
            const isGAMDelegated = getFieldValue(data, uNI_DelegatedGAM__c) || '';
            const isAcceptedReviewer = getFieldValue(data, uNI_AcceptedReviewer__c) || false;
            const directorComments = getFieldValue(data, uNI_Director_Comments__c);
            const strategyComments = getFieldValue(data, uNI_StrategyComment__c);
            const IsActionOwner = getFieldValue(data, uNI_AmiActionOnwer__c) || false;

            /*
            this.ACTION_CONFIG.FundingOpportunity.menus.forEach(menu => {
                menu.actions = menu.actions.filter(a => {
                    if (a.label === 'Publish call') {
                        return status === 'Ready to Publish' && isGAM;
                    }
                    if (a.label === 'Add Call Translations') {
                        return isLead;
                    }
                    return true;
                });
            });*/

            this.ACTION_CONFIG.FundingOpportunity.menus.forEach(menu => {
                menu.actions = menu.actions.filter(action => {

                    if (action.label === 'Submit Draft for Final Review') {
                        return (status === 'New call in development' && (IsActionOwner || isGam || isSL));
                    }

                    else if (action.label === 'Delegate Approval') {
                        return (status === 'Under Review' && IsActionOwner);
                    }

                    else if (action.label === 'Add Call Translations') {
                        return (status === 'New call in development' && IsLead);
                    }

                    else if (action.label === 'Add Important Dates') {
                        return isGam;
                    }

                    else if (action.label === 'Delegate GAM Role') {
                        return (isOrginalGam && (isGAMDelegated == null));
                    }

                    else if (action.label === 'Add Meeting Notes') {
                        return (isGam || IsLead);
                    }

                    else if (action.label === 'Edit Call and Proposal Form') {
                        return (
                            (status === 'New call in development' &&
                                (isSL || isGam) &&
                                (
                                    FormStatus === '' ||
                                    FormStatus === null ||
                                    FormStatus === 'Draft' ||
                                    FormStatus === 'Returned' ||
                                    FormStatus === 'Approved with Comments' ||
                                    FormStatus === 'Pending Director Review'
                                ))
                        );
                    }

                    else if (action.label === 'Review Call and Proposal Form') {
                        return (
                            (status === 'Under Review' && IsActionOwner) ||
                            (status === 'Ready to Publish' && isGam)
                        );
                    }

                    else if (action.label === 'Edit Strategy Leads') {
                        return isSL || isGam;
                    }

                    else if (action.label === 'Edit Call Authors') {
                        return isSL || isGam;
                    }

                    else if (action.label === 'Edit GAM') {
                        return isGam;
                    }

                    else if (action.label === 'Publish call') {
                        return status === 'Ready to Publish' && isGam;
                    }

                    else if (action.label === 'Review Assessment Form') {
                        return (
                            (isGam && assessmentStatus === 'Draft In Progress') ||
                            (isDir && assessmentStatus === 'Pending Director Review')
                        );
                    }

                    else if (action.label === 'Add Reviewer') {
                        return isGam;
                    }

                    else if (action.label === 'Submit Form To Director') {
                        return isGam && assessmentStatus === 'Draft In Progress';
                    }

                    else if (action.label === 'Accept Review') {
                        return isInvitedReviewer && !isAcceptedReviewer;
                    }

                    else if (
                        action.label === 'Inform Board Relation' ||
                        action.label === 'Update EB Voting Timeline'
                    ) {
                        console.log('Status : ',status);
                        return status === 'Call Closed';
                    }

                    else if (action.label === 'Provide Call For Proposal Feedback') {
                        return status === 'Active';
                    }

                    else if (action.label === 'Edit Related Donors') {
                        return (
                            isGam &&
                            (
                                status === 'New call in development' ||
                                status === 'Under Review' ||
                                status === 'Ready to Publish'
                            )
                        );
                    }

                    return true; // default
                });
            });
        }
        else if (this.objectApiName == 'IndividialApplication') {


            this.ACTION_CONFIG.IndividialApplication.menus.forEach(menu => {
                menu.actions = menu.actions.filter(action => {
                    return true; // default
                });
            });
        }
        else if (this.objectApiName == 'uNI_ReprogrammingRequest__c') {


            this.ACTION_CONFIG.uNI_ReprogrammingRequest__c.menus.forEach(menu => {
                menu.actions = menu.actions.filter(action => {
                    return true; // default
                });
            });
        }
        this.allmenus = this.ACTION_CONFIG[this.objectApiName]?.menus;
        console.log('@@all menus' + JSON.stringify(this.allmenus));
    }


    filterIndividualApplicationActions(data) {
        // --- 1. GAD VARIABLES ---
        const rtDevName = getFieldValue(data, RT_DevName);
        const isGAD = (rtDevName === 'uNI_GAD');
        const stage = getFieldValue(data, uNI_Stage__c);
        const isPMPO = getFieldValue(data, uNI_IsUserPMOrPO__c);
        const actionOwner = getFieldValue(data, uNI_CurrentActionOwner__c);
        const stage3Submitted = getFieldValue(data, uNI_IsStage3PackageSubmitted__c); // Checked API name
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
        const riskVersion = getFieldValue(data, uNI_CurrentRiskRegisterVersion__c);
        const ppfStarted = getFieldValue(data, uNI_IsPPFStarted__c);
        const ppfSkipped = getFieldValue(data, uNI_IsPPFskipped__c);

        // --- 2. GENERIC VARIABLES ---
        const iaStatus = getFieldValue(data, IA_Status);
        const investmentStatus = getFieldValue(data, uNI_InvestmentStatus__c);
        const closureInitiated = getFieldValue(data, uNI_ClosureInitiated__c);
        const logframeCreated = getFieldValue(data, uNI_isLogframeCreated__c);
        console.log('[uNI_ButtonList] logframeCreated', logframeCreated);
        const questionsFinalized = getFieldValue(data, uNI_IsQuestionFinalizedInCFP__c);
        const amIGAM = getFieldValue(data, IA_AmIGAM); // Uses correct Alias
        const allL1 = getFieldValue(data, uNI_AllL1QuestionAnswered__c);
        const allL2 = getFieldValue(data, uNI_AllL2QuestionsAnswered__c);
        const allL3Sec = getFieldValue(data, uNI_AllL3SecAnswered__c);
        const allL3Prc = getFieldValue(data, uNI_AllL3PrcAnswered__c);
        
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
        const isCurrentUserActionOwner = getFieldValue(data, uNI_IsUserCurrentActionOwner__c);
        const isSysAdmin = (this.currentUserProfile && this.currentUserProfile.includes('System Administrator'));

        this.ACTION_CONFIG.IndividualApplication.menus.forEach(menu => {
            menu.actions = menu.actions.filter(action => {
                
                // Hide GAD buttons if not GAD record
                const gadButtons = [
                    'Edit Stage 4','Select PRC and Submit for Feedback','Start OMT Review','Start PRC Review',
                    'Edit Stage 3','Upload Stage 3 Package(PT)','Upload Stage 3 Package(Pre-grantee)',
                    'Return to stage 2','Define Stage 3','Edit Stage 2','Upload Stage 2 package','Define Stage 2',
                    'Confirm PRC review date','Confirm OMT meeting date','Move to Stage 2','Mark IKO as Completed',
                    'Mark EKO as Completed','Develop GAD Timeline','Timeline','Start Supplier Registration',
                    'Capacity Assessment','Request FENSA Assessment','Update Risk Register','PPF'
                ];

                if (!isGAD && gadButtons.includes(action.label)) {
                    return false;
                }

                switch (action.label) {
                    // --- GAD LOGIC ---
                    case 'Edit Stage 4': return isPMPO && stage === 'Stage 4';
                    case 'Select PRC and Submit for Feedback': return amIGAM && stage === 'Stage 3' && actionOwner === 'GAM';
                    case 'Start OMT Review': return isPMPO && stage === 'Stage 3' && !stage3Submitted && omtReviewerIds != null;
                    case 'Start PRC Review': return stage === 'Stage 3' && !stage3Submitted && isPMPO && !prcReviewStarted;
                    case 'Edit Stage 3': return stage === 'Stage 3' && isPMPO && stage3FilesSelected;
                    case 'Upload Stage 3 Package(PT)': return isPMPO && stage === 'Stage 3' && omtStatus === 'Completed' && prcStatus === 'Complete' && stage3FilesSelected;
                    case 'Upload Stage 3 Package(Pre-grantee)': return isPT && stage === 'Stage 3' && !stage3Submitted && omtStatus === 'Completed' && prcStatus === 'Complete' && stage3FilesSelected;
                    case 'Return to stage 2': return stage === 'Stage 3' && isPMPO && !resubmitStage2;
                    case 'Define Stage 3': return isPMPO && stage === 'Stage 3' && omtStatus === 'Completed' && prcStatus === 'Complete' && !stage3FilesSelected;
                    case 'Edit Stage 2': return isPMPO && actionOwner === 'Pre-Grantee' && stage === 'Stage 2';
                    case 'Upload Stage 2 package': return isPT && ((stage === 'Stage 2' && actionOwner === 'Pre-Grantee') || resubmitStage2);
                    case 'Define Stage 2': return isPMPO && stage === 'Stage 2' && actionOwner === 'PM/PO' && !stage2Submitted;
                    case 'Confirm PRC review date': return isPMPO && stage === 'Stage 2' && stage2Submitted && !prcDateConfirmed;
                    case 'Confirm OMT meeting date': return isPMPO && stage === 'Stage 2' && stage2Submitted && !omtDateConfirmed;
                    case 'Move to Stage 2': return stage === 'Stage 1' && stage1Submitted && isPMPO;
                    case 'Mark IKO as Completed': return isPT && stage === 'Stage 1' && !isIKO && projectTeamID && timelineDev && projParams;
                    case 'Mark EKO as Completed': return isPMPO && stage === 'Stage 1' && isIKO && !isEKO;
                    case 'Develop GAD Timeline': return isPMPO && !timelineDev;
                    case 'Timeline': return isPMPO && timelineDev;
                    case 'Start Supplier Registration': return supplierStatus !== 'NA' && !supplierProcessComplete && isPMPO;
                    case 'Capacity Assessment': return isPMPO && !capAssessStarted && !capSkipped;
                    case 'Request FENSA Assessment': return this.currentUserTitle !== 'Risk Manager' && !showFensa;
                    case 'Update Risk Register': return (isGAD && riskVersion != 0) || (!isGAD); // GAD Logic vs Generic (Generic is always visible)
                    case 'PPF': return isPMPO && !ppfStarted && !ppfSkipped;

                    // --- GENERIC LOGIC ---
                    case 'Create Closure': return (investmentStatus === 'Actively Closing' && !closureInitiated);
                    case 'Create Logframe': return (!logframeCreated);
                    case 'Notify Proponent': return (iaStatus === 'Ready for EB Review');
                    case 'Score Proposal Assessment': 
                        const validStatuses = ['Level 1 Review', 'Level 2 Review', 'Level 3 Review'];
                        return (questionsFinalized && validStatuses.includes(iaStatus) && iaStatus !== 'Ready for EB Review');
                    case 'Complete Assessment':
                        if (!amIGAM) return false;
                        if (iaStatus === 'Level 1 Review' && allL1) return true;
                        if (iaStatus === 'Level 2 Review' && allL2) return true;
                        if (iaStatus === 'Level 3 Review' && allL3Sec && allL3Prc) return true;
                        return false;
                    
                    // Always Visible (Generic or Administer)
                    case 'Proceed to GAD Creation': return true;
                    case 'New Risk Register': return true;
                    case 'Edit Implementer and Contributor': return true;
                    // --- GROUP B BUTTON LOGIC ---
                    case 'Report outcomes from OMT': return isPMPO && omtReviewerIds != null && omtStatus !== 'Completed';
                    case 'Start Stage 4': return isPMPO && omtStatus === 'Completed' && prcStatus === 'Complete' && stage === 'Stage 3' && stage3Submitted;
                    case 'Upload Stage 4 Package(PT)': return isPMPO && stage === 'Stage 4' && !stage4PTSubmitted;
                    case 'Upload Stage 4 Package(Pre-Grantee)': return isPT && stage === 'Stage 4' && !stage4Submitted;
                    case 'Prepare for SMT Clearance': return stage === 'Stage 4' && isPMPO && stage4Submitted && actionOwner === 'PM/PO' && !hasAllPTCleared;
                    case 'Clear package for SMT Review': return isPT && isCurrentUserActionOwner && !hasAllPTCleared && actionOwner === 'PT';
                    case 'Submit for SMT Clearance': return isPMPO && (actionOwner === 'PM/PO' || hasAllPTCleared) && !approvedByDirPD && !approvedByLegal && stage === 'Stage 4';
                    case 'Clear the GAD Package SMT': return isSelectedSMT && actionOwner === 'SMT' && !smtStopped;
                    case 'Stop SMT Review': return isPT && actionOwner === 'SMT' && !smtStopped;
                    case 'Upload Additional Files': 
                        return (isPT && smtStopped && stage === 'Stage 4') || 
                               (isPMPO && edOutcome === 'Clear the Package With Pending Changes' && stage === 'Stage 5' && !ebDecisionTaken);
                    case 'Submit to SMT members': return isPT && smtStopped && actionOwner === 'PT';
                    case 'Submit for ED Clearance': return isPMPO && actionOwner === 'PM/PO' && approvedByDirPD && stage === 'Stage 4' && approvedByLegal;
                    case 'Clear the GAD Package As Director': return actionOwner === 'Director PD' && this.currentUserTitle === 'Director PD' && !ebDecisionTaken;
                    case 'Clear the GAD Package As ED': return actionOwner === 'ED' && stage === 'Stage 4' && (this.currentUserTitle === 'ED' || this.currentUserTitle === 'ED Assistant');
                    case 'Cancel GAD': return isPMPO && !gadCancelled && stage !== 'Grant Agreement Signed';
                    case 'Mark EB Review As Not Required': return stage === 'Stage 5' && isPMPO && actionOwner === 'PM/PO';
                    case 'Upload Pre-Grantee Signed FaceSheet': return isPMPO && stage === 'Agreement ready for signature';
                    case 'Confirm No EB Review Required': return ebDecisionTaken && actionOwner === 'Director PD' && stage === 'Stage 5' && (isUserDirectorPD || isCurrentUserActionOwner);
                    case 'Upload ED Signed Face Sheet': return isCurrentUserActionOwner && (isUserED || isUserEDAssistant) && stage === 'Pending ED countersignature';
                    case 'Submit For EB Review': return isPMPO && stage === 'Stage 5' && !ebDecisionTaken;
                    case 'Mark EB Voting as concluded': return isUserGAM && stage === 'Stage 5' && !ebReviewDone && ebReviewStarted;
                    case 'Start EB Review': return isUserGAM && stage === 'Stage 5' && !ebReviewStarted && ebDecisionTaken && actionOwner === 'GAM'; // Note: 'Is EB Vote Required' assumed true if decision taken/user flow active
                    case 'Edit Stage 1': return isPMPO && isStage1Defined && stage === 'Stage 1';
                    case 'Project Parameters': return isPMPO || isSysAdmin;

                    default: return true;
                }
            });
        });
    }
}