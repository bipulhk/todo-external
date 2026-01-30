import { LightningElement, api, track } from 'lwc';
import getTableData from '@salesforce/apex/uNI_TableSecondARBudgetController.getTableData';
import saveTableData from '@salesforce/apex/uNI_TableSecondARBudgetController.saveTableData';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class UNITableSecondARBudget extends LightningElement {
    @api recordId;
    
    @track annualReport = {};
    @track disbursements = [];
    @track yearLabel = '';
    
    isLoading = true;
    isSaving = false;
    dataLoaded = false;

    connectedCallback() {
        this.fetchData();
    }

    fetchData() {
        this.isLoading = true;
        getTableData({ recordId: this.recordId })
            .then(result => {
                this.annualReport = { ...result.annualReport };
                this.disbursements = result.disbursements.map(d => ({...d}));
                this.yearLabel = this.annualReport.uNI_Year_Formula__c || 'Year';
                this.dataLoaded = true;
                this.isLoading = false;
            })
            .catch(error => {
                this.showToast('Error', 'Error loading table data', 'error');
                this.isLoading = false;
            });
    }

    handleArChange(event) {
        const field = event.target.dataset.field;
        let value = parseFloat(event.target.value);
        if (isNaN(value)) value = 0;
        this.annualReport[field] = value;
    }

    handleDisbursementChange(event) {
        const id = event.target.dataset.id;
        let value = parseFloat(event.target.value);
        if (isNaN(value)) value = 0;

        const index = this.disbursements.findIndex(d => d.Id === id);
        if (index !== -1) {
            this.disbursements[index].amount = value;
        }
    }

    get totalDisbursements() {
        return this.disbursements.reduce((sum, d) => sum + (d.amount || 0), 0);
    }

    // Calculates Total Income: Sum of Disbursements + Interest + Other Income
    get totalIncome() {
        const interest = this.annualReport.uNI_Interest_income__c || 0;
        const otherInc = this.annualReport.uNI_Other_income_including_ERC_fees__c || 0;
        return this.totalDisbursements + interest + otherInc;
    }

    get totalExpended() {
        const grantExp = this.annualReport.uNI_Grant_expenses_including_ERC_fees__c || 0;
        const otherOut = this.annualReport.uNI_Other_funds_out__c || 0;
        return grantExp + otherOut;
    }

    get fundsAvailable() {
        return this.totalIncome - this.totalExpended;
    }

    handleSave() {
        this.isSaving = true;
        const arToSave = {
            Id: this.annualReport.Id,
            uNI_Interest_income__c: this.annualReport.uNI_Interest_income__c,
            uNI_Other_income_including_ERC_fees__c: this.annualReport.uNI_Other_income_including_ERC_fees__c,
            uNI_Grant_expenses_including_ERC_fees__c: this.annualReport.uNI_Grant_expenses_including_ERC_fees__c,
            uNI_Other_funds_out__c: this.annualReport.uNI_Other_funds_out__c
        };

        saveTableData({ 
            arData: arToSave, 
            disbursementsJson: JSON.stringify(this.disbursements) 
        })
        .then(() => {
            this.showToast('Success', 'Budget data saved successfully', 'success');
            this.isSaving = false;
        })
        .catch(error => {
            this.showToast('Error', 'Error saving data: ' + (error.body ? error.body.message : error.message), 'error');
            this.isSaving = false;
        });
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({
            title: title,
            message: message,
            variant: variant
        }));
    }
}