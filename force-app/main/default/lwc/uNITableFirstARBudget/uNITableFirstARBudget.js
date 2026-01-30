import { LightningElement, api, track, wire } from 'lwc';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';
import { updateRecord } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

import IA_LOOKUP from '@salesforce/schema/uNI_Annual_Report__c.uNI_Individual_Application__c';

import MAX_GRANT from '@salesforce/schema/IndividualApplication.uNI_MaximumFundingCeiling__c';
import TOTAL_FUNDS from '@salesforce/schema/IndividualApplication.uNI_FundsAvailableAfterReportingPeriod__c';

import AR_ID from '@salesforce/schema/uNI_Annual_Report__c.Id';
import ANY_FUNDS_FIELD from '@salesforce/schema/uNI_Annual_Report__c.uNI_AnyFundsReceived__c';
import BALANCE_FIELD from '@salesforce/schema/uNI_Annual_Report__c.uNI_Balance__c';

export default class UNITableFirstARBudget extends LightningElement {
    @api recordId;

    @track grantValue = 0;
    @track totalFundsReceived = 0;
    @track anyFundsReceived = 0;
    @track balance = 0;
    @track IARecordId;

    dataLoaded = false;

    // STEP 1: Fetch IA Lookup Id from Annual Report
    @wire(getRecord, { recordId: '$recordId', fields: [IA_LOOKUP] })
    wiredAR({ data, error }) {
        if (data) {
            this.IARecordId = getFieldValue(data, IA_LOOKUP);
        } else if (error) {
            console.error('Error fetching AR data:', error);
        }
    }

    // STEP 2: Fetch IA fields once IARecordId is available
    @wire(getRecord, {
        recordId: '$IARecordId',
        fields: [MAX_GRANT, TOTAL_FUNDS]
    })
    wiredIA({ data, error }) {
        if (data) {
            this.grantValue = getFieldValue(data, MAX_GRANT) || 0;
            this.totalFundsReceived = getFieldValue(data, TOTAL_FUNDS) || 0;
            this.calculateBalance();
            this.dataLoaded = true;
        } else if (error) {
            console.error('Error fetching IA data:', error);
        }
    }

    handleFundsChange(event) {
        this.anyFundsReceived = Number(event.target.value) || 0;
        this.calculateBalance();
    }

    calculateBalance() {
        this.balance = this.grantValue - (this.totalFundsReceived + this.anyFundsReceived);
    }

    handleSave() {
        const fields = {};
        fields[AR_ID.fieldApiName] = this.recordId;
        fields[ANY_FUNDS_FIELD.fieldApiName] = this.anyFundsReceived;
        fields[BALANCE_FIELD.fieldApiName] = this.balance;

        updateRecord({ fields })
            .then(() => {
                this.showToast('Success', 'Budget updated successfully!', 'success');
            })
            .catch(error => {
                console.error('Update failed', error);
                this.showToast('Error', 'Failed to update budget', 'error');
            });
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}