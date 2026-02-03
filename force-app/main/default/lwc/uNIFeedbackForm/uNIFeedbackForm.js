import { LightningElement, api, track, wire } from 'lwc';
import { getRecord } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { CloseActionScreenEvent } from 'lightning/actions';
import initializeFeedback from '@salesforce/apex/uNI_FeedbackFormController.initializeFeedback';
import saveDraft from '@salesforce/apex/uNI_FeedbackFormController.saveDraft';
import submitFeedback from '@salesforce/apex/uNI_FeedbackFormController.submitFeedback';

export default class FeedbackSurveyForm extends LightningElement {
    @api recordId;
    @api processType; // Now this will be passed from parent component
    
    @track feedbackResponses = [];
    @track isLoading = true;
    @track isSaving = false;
    @track isSubmitted = false;
    @track submittedBy = '';
    @track submittedDate = null;
    @track errorMessage = '';

    objectApiName;

    get hasValidRecordId() {
        return typeof this.recordId === 'string' &&
            (this.recordId.length === 15 || this.recordId.length === 18);
    }

    get recordIdForWire() {
        return this.hasValidRecordId ? this.recordId : undefined;
    }

    connectedCallback() {
        console.log('🔗 Component connected');
        console.log('  recordId:', this.recordId);
        console.log('  processType:', this.processType);
        
        // If processType is already provided, load feedback directly
        if (this.processType) {
            console.log('✅ ProcessType provided by parent, loading feedback...');
            this.loadFeedback();
        } else {
            console.log('⚠️ ProcessType not provided, will auto-detect from record');
            // Will be handled by @wire if needed for backwards compatibility
        }
    }

    // Load record to determine object type (only used when processType is not provided)
    @wire(getRecord, { recordId: '$recordIdForWire', fields: ['Id'] })
    wiredRecord({ error, data }) {
        // Only auto-detect if processType wasn't already provided
        if (this.processType) {
            console.log('📋 ProcessType already set, skipping auto-detection');
            return;
        }

        if (!this.hasValidRecordId) {
            console.log('[FeedbackForm] Skipping getRecord; invalid recordId:', this.recordId);
            return;
        }

        console.log('🔗 Wired record ID:', this.recordId);

        if (data) {
            this.objectApiName = data.apiName;
            console.log('📄 Object API Name:', this.objectApiName);

            if (this.objectApiName === 'IndividualApplication') {
                // For IndividualApplication without processType, let Apex detect
                console.log('📘 Delegating RecordType detection to Apex for IndividualApplication');
                this.processType = null; // Let Apex detect it
                this.loadFeedback();
            } else {
                // For other supported objects, determine process type directly
                this.determineProcessTypeByObject(this.objectApiName);
            }
        } else if (error) {
            const errorBody = error?.body;
            const errorMessages = Array.isArray(errorBody)
                ? errorBody.map(entry => entry.message).join('; ')
                : errorBody?.message;
            const errorCodes = Array.isArray(errorBody)
                ? errorBody.map(entry => entry.errorCode).join('; ')
                : errorBody?.errorCode;

            console.error('[FeedbackForm] getRecord error details', {
                recordId: this.recordId,
                hasValidRecordId: this.hasValidRecordId,
                processType: this.processType,
                status: error?.status,
                statusText: error?.statusText,
                errorCode: errorCodes,
                message: errorMessages || error?.message
            });
            console.error('❌ Error loading record:', error);
            this.showToast('Error', 'Could not load record info', 'error');
            this.isLoading = false;
        }
    }

    // Determine process type for other objects (backwards compatibility)
    determineProcessTypeByObject(objectApiName) {
        const mapByObject = {
            'Program': 'AFI',
            'FundingOpportunity': 'Calls For Proposals',
            'uNI_DonorAgreement__c': 'Donor Agreement'
        };

        this.processType = mapByObject[objectApiName] || null;
        console.log('🧭 Determined processType (object-based):', this.processType);

        if (!this.processType) {
            this.showToast('Error', `Unknown process type for object ${objectApiName}`, 'error');
            this.isLoading = false;
            return;
        }

        this.loadFeedback();
    }

    // Load feedback questions and existing responses
    loadFeedback() {
        console.log('🚀 Loading feedback with:');
        console.log('  recordId:', this.recordId);
        console.log('  processType:', this.processType || 'null (will be auto-detected by Apex)');

        this.isLoading = true;
        this.errorMessage = '';

        initializeFeedback({
            recordId: this.recordId,
            processType: this.processType || '' // Pass empty string if null, Apex will detect
        })
            .then(data => {
                console.log('✅ Feedback data loaded:', data);
                
                if (data) {
                    // Update processType from Apex response (in case it was auto-detected)
                    this.processType = data.processType;
                    console.log('📋 ProcessType from Apex:', this.processType);
                    
                    if (data.isSubmitted) {
                        this.isSubmitted = true;
                        this.submittedBy = data.submittedBy;
                        this.submittedDate = data.submittedDate;
                    }

                    this.feedbackResponses = data.questions.map(q => ({
                        feedbackId: q.feedbackId,
                        responseId: q.responseId,
                        category: q.category,
                        questionText: q.questionText,
                        sequence: q.sequence,
                        responseValue: q.responseValue || ''
                    }));
                    
                    console.log('📝 Loaded', this.feedbackResponses.length, 'questions');
                }
                this.isLoading = false;
            })
            .catch(error => {
                console.error('❌ Error loading feedback:', error);
                this.errorMessage = error.body?.message || error.message || 'Error loading feedback form';
                this.isLoading = false;
                this.showToast('Error', this.errorMessage, 'error');
            });
    }

    // Handle text input changes
    handleResponseChange(event) {
        const feedbackId = event.target.name;
        const newValue = event.target.value;
        console.log('✏️ Response changed for feedback:', feedbackId);

        this.feedbackResponses = this.feedbackResponses.map(resp =>
            resp.feedbackId === feedbackId ? { ...resp, responseValue: newValue } : resp
        );
    }

    // Save draft
    handleSaveDraft() {
        console.log('💾 Saving draft...');
        this.isSaving = true;

        const responsesToSave = this.feedbackResponses.map(resp => ({
            feedbackId: resp.feedbackId,
            responseId: resp.responseId,
            responseValue: resp.responseValue || ''
        }));

        console.log('📤 Sending to saveDraft:', responsesToSave);

        saveDraft({
            recordId: this.recordId,
            processType: this.processType || '',
            responsesJson: JSON.stringify(responsesToSave)
        })
            .then(() => {
                console.log('✅ Draft saved successfully');
                this.showToast('Success', 'Draft saved successfully', 'success');
                this.isSaving = false;
                this.loadFeedback();
            })
            .catch(error => {
                console.error('❌ Error saving draft:', error);
                this.showToast('Error', error.body?.message || error.message || 'Error saving draft', 'error');
                this.isSaving = false;
            });
    }

    // Submit feedback
    handleSubmit() {
        console.log('📨 Attempting to submit feedback...');

        const hasContent = this.feedbackResponses.some(resp =>
            resp.responseValue && resp.responseValue.trim().length > 0
        );

        if (!hasContent) {
            this.showToast('Warning', 'Please provide at least one feedback response before submitting.', 'warning');
            return;
        }

        if (!confirm('Are you sure you want to submit?')) {
            return;
        }

        this.isSaving = true;

        const responsesToSubmit = this.feedbackResponses.map(resp => ({
            feedbackId: resp.feedbackId,
            responseId: resp.responseId,
            responseValue: resp.responseValue || ''
        }));

        console.log('📤 Sending to submitFeedback:', responsesToSubmit);

        submitFeedback({
            recordId: this.recordId,
            processType: this.processType || '',
            responsesJson: JSON.stringify(responsesToSubmit)
        })
            .then(() => {
                console.log('✅ Feedback submitted successfully');
                this.showToast('Success', 'Feedback submitted successfully! Thank you for your input.', 'success');
                this.isSaving = false;
                this.isSubmitted = true;

                // Dispatch custom event to notify parent
                this.dispatchEvent(new CustomEvent('feedbacksubmitted'));

                setTimeout(() => {
                    this.closeModal();
                }, 2000);
            })
            .catch(error => {
                console.error('❌ Error submitting feedback:', error);
                this.showToast('Error', error.body?.message || error.message || 'Error submitting feedback', 'error');
                this.isSaving = false;
            });
    }

    // Show toast notification
    showToast(title, message, variant) {
        this.dispatchEvent(
            new ShowToastEvent({ title, message, variant })
        );
    }

    // Close modal
    closeModal() {
        // Dispatch custom event to notify parent
        this.dispatchEvent(new CustomEvent('close'));
        
        // Also dispatch standard action close event (for quick actions)
        this.dispatchEvent(new CloseActionScreenEvent());
    }

    // Format submitted date
    get formattedSubmittedDate() {
        return this.submittedDate ? new Date(this.submittedDate).toLocaleString() : '';
    }
}