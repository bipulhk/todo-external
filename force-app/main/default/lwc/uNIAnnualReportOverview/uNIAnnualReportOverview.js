import { LightningElement, api, wire } from 'lwc';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';
import { refreshApex } from '@salesforce/apex';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

// -----------------------------
// Individual Application fields
// -----------------------------
import ACC_ID from '@salesforce/schema/IndividualApplication.AccountId';
import IA_ID from '@salesforce/schema/IndividualApplication.Id';
import PROJECT_START from '@salesforce/schema/IndividualApplication.uNI_ImplementationStartDate__c';
import PROJECT_END from '@salesforce/schema/IndividualApplication.uNI_InvestmentEndDate__c';
import PROJECT_NAME from '@salesforce/schema/IndividualApplication.uNI_ProjectName__c';
import MAX_CEILING from '@salesforce/schema/IndividualApplication.uNI_MaximumFundingCeiling__c';

// --------------------
// Annual Report fields
// --------------------
import AR_START_DATE from '@salesforce/schema/uNI_Annual_Report__c.uNI_PeriodStartDate__c';
import AR_END_DATE from '@salesforce/schema/uNI_Annual_Report__c.uNI_PeriodEndDate__c';
import IA from '@salesforce/schema/uNI_Annual_Report__c.uNI_Individual_Application__c';
import AR_YEAR from '@salesforce/schema/uNI_Annual_Report__c.uNI_Year_Formula__c';
import SUBMIT_DATE from '@salesforce/schema/uNI_Annual_Report__c.uNI_DateSubmittedtoUnitaid__c';
import APROVE_DATE from '@salesforce/schema/uNI_Annual_Report__c.uNI_DateReportApproved__c';
import AR_APPROVER from '@salesforce/schema/uNI_Annual_Report__c.uNI_ApprovedByUserName__c';

import getFXRates from '@salesforce/apex/UNI_FXController.getFXRates';
import createFXRate from '@salesforce/apex/UNI_FXController.createFXRate';

import { updateRecord } from 'lightning/uiRecordApi';
import { deleteRecord } from 'lightning/uiRecordApi';
import { getPicklistValues, getObjectInfo } from 'lightning/uiObjectInfoApi';
import FX_OBJECT from '@salesforce/schema/uNI_ForeignExchangeRates__c';
import FUNC_CURR_FIELD from '@salesforce/schema/uNI_ForeignExchangeRates__c.uNI_FunctionalCurrency__c';
import REPT_CURR_FIELD from '@salesforce/schema/uNI_ForeignExchangeRates__c.uNI_ReportingCurrency__c';
import FX_ID from '@salesforce/schema/uNI_ForeignExchangeRates__c.Id';
import BUDGET_FX from '@salesforce/schema/uNI_ForeignExchangeRates__c.uNI_BudgetingForex__c';
import REPORT_FX from '@salesforce/schema/uNI_ForeignExchangeRates__c.uNI_ReportingForex__c';

// --------------------
// Financial Accounting fields
// --------------------
import getFinancialAccounting from '@salesforce/apex/UNI_FXController.getFinancialAccounting';
import saveFinancialAccounting from '@salesforce/apex/UNI_FXController.saveFinancialAccounting';
import deleteFinancialAccounting from '@salesforce/apex/UNI_FXController.deleteFinancialAccounting';

import FA_OBJECT from '@salesforce/schema/uNI_FinancialAccounting__c';
import TYPE_FIELD from '@salesforce/schema/uNI_FinancialAccounting__c.uNI_Type__c';
import RANK_FIELD from '@salesforce/schema/uNI_FinancialAccounting__c.uNI_Rank__c';
import ACCOUNT_METHOD_FIELD from '@salesforce/schema/uNI_FinancialAccounting__c.uNI_AccountingMethod__c';
import getSummaryBudgets from '@salesforce/apex/UNI_FXController.getSummaryBudgets';
import FUNC_CURR_FA_FIELD from '@salesforce/schema/uNI_FinancialAccounting__c.uNI_FunctionalCurrency__c';
import SB_FIELD from '@salesforce/schema/uNI_FinancialAccounting__c.uNI_SummaryBudget__c';
import FA_ID from '@salesforce/schema/uNI_FinancialAccounting__c.Id';

// --------------------
// Co-funding (Table 6)
// --------------------
import getCoFunding from '@salesforce/apex/UNI_FXController.getCoFunding';
import saveCoFunding from '@salesforce/apex/UNI_FXController.saveCoFunding';
import deleteCoFunding from '@salesforce/apex/UNI_FXController.deleteCoFunding';

import CF_OBJECT from '@salesforce/schema/uNI_Budget_Summary_Source_of_Funding__c';
import CF_ID from '@salesforce/schema/uNI_Budget_Summary_Source_of_Funding__c.Id';
import CF_SOURCE from '@salesforce/schema/uNI_Budget_Summary_Source_of_Funding__c.uNI_SourcesOfCofunding__c';
import CF_STATUS from '@salesforce/schema/uNI_Budget_Summary_Source_of_Funding__c.uNI_UpdateOnStatus__c';

import NAME_FIELD from '@salesforce/schema/Account.Name';

export default class UNIAnnualReportOverview extends LightningElement {
    // Inputs
    @api recordId;
    @api params;
    @api annualReportId;

    fxRates = [];
    isLoadingFX = false;
    wiredFXResult;

    editedRecords = {};
    functionalCurrencyOptions = [];
    reportingCurrencyOptions = [];
    fxObjectInfo;

    faRecords = [];
    isLoadingFA = false;
    wiredFAResult;
    faEditedRecords = {};
    typeOptions = [];
    rankOptions = [];
    accMethodOptions = [];
    faFuncCurrencyOptions = [];
    summaryBudgetOptions = [];

    // Table 6 - Co-funding
    coFundingRecords = [];
    wiredCoFundResult;
    coFundingEdited = {};
    isLoadingCF = false;

    selectedReportingCurrency;

    // Resolved Annual Report Id
    get resolvedARId() {
        return this.params || this.recordId;
    }

    // -------------------------
    // Field lists for getRecord
    // -------------------------
    static IA_FIELDS = [ACC_ID, IA_ID, PROJECT_START, PROJECT_END, PROJECT_NAME, MAX_CEILING];
    static AR_FIELDS = [AR_START_DATE, AR_END_DATE, AR_YEAR, AR_APPROVER, IA, SUBMIT_DATE, APROVE_DATE];

    // -------------------------
    // Wire: Annual Report
    // -------------------------
    @wire(getRecord, { recordId: '$resolvedARId', fields: UNIAnnualReportOverview.AR_FIELDS })
    arRecord;

    // Safe getters for AR fields
    get arYear() { return getFieldValue(this.arRecord?.data, AR_YEAR); }
    get arApprover() {
        const value = getFieldValue(this.arRecord?.data, AR_APPROVER);
        return value ? value : 'TBD';
    }
    get arPeriodStart() { return getFieldValue(this.arRecord?.data, AR_START_DATE); }
    get arPeriodEnd() { return getFieldValue(this.arRecord?.data, AR_END_DATE); }
    get iaId1() { return getFieldValue(this.arRecord?.data, IA); }
    get arPeriod() {
        const start = this.arPeriodStart;
        const end = this.arPeriodEnd;
        if (!start || !end) return null;
        const formatDate = (dateStr) => {
            const date = new Date(dateStr);
            const day = String(date.getDate()).padStart(2, '0');
            const month = date.toLocaleString('en-US', { month: 'short' });
            const year = date.getFullYear();
            return `${day}. ${month}. ${year}`;
        };
        return `${formatDate(start)} – ${formatDate(end)}`;
    }
    get arAprDate() {
        const value = getFieldValue(this.arRecord?.data, APROVE_DATE);
        return value ? this.formatDate(value) : 'TBD';
    }
    get arSubDate() {
        const value = getFieldValue(this.arRecord?.data, SUBMIT_DATE);
        return value ? this.formatDate(value) : 'TBD';
    }

    // -------------------------
    // Wire: Individual Application
    // -------------------------
    @wire(getRecord, { recordId: '$iaId1', fields: UNIAnnualReportOverview.IA_FIELDS })
    iaRecord;

    // --------------------
    // Wire: FX data
    // --------------------
    @wire(getFXRates, { iaId: '$iaIdValue' })
    wiredFX(result) {
        this.wiredFXResult = result;
        if (result.data) {
            this.fxRates = result.data.map(fx => ({
                ...fx,
                difference: fx.uNI_Difference__c != null ? fx.uNI_Difference__c.toFixed(2) + '%' : ''
            }));

            if (this.fxRates.length > 0 && this.fxRates[0].uNI_ReportingCurrency__c) {
                this.selectedReportingCurrency = this.fxRates[0].uNI_ReportingCurrency__c;
            }
        } else if (result.error) {
            console.error('FX load error: ', result.error);
            this.showToast('Error', 'Failed to load FX rates', 'error');
        }
    }

    @wire(getFinancialAccounting, { iaId: '$iaIdValue' })
    wiredFA(result) {
        this.wiredFAResult = result;
        if (result.data) {
            this.faRecords = result.data.map((rec, index) => ({
                ...rec,
                implementer: index === 0 ? 'Lead Implementer' : 'Implementer ' + index
            }));
        } else if (result.error) {
            console.error('Error loading FA records: ', result.error);
        }
    }

    @wire(getSummaryBudgets, { iaId: '$iaIdValue' })
    wiredSummaryBudgets({ data, error }) {
        if (data) {
            console.log('Summary Budgets loaded:', data);
            this.summaryBudgetOptions = data.map(sb => ({
                label: sb.Name,
                value: sb.Id
            }));
            console.log('Summary Budget options:', this.summaryBudgetOptions);
        } else if (error) {
            console.error('Error loading Summary Budget options: ', error);
        }
    }

    @wire(getCoFunding, { iaId: '$iaIdValue' })
    wiredCoFund(result) {
        this.wiredCoFundResult = result;
        if (result.data) {
            this.coFundingRecords = result.data;
        } else if (result.error) {
            console.error('Co-funding load error:', result.error);
        }
    }

    @wire(getObjectInfo, { objectApiName: FA_OBJECT })
    faObjectInfo;

    @wire(getPicklistValues, {
        recordTypeId: '$faObjectInfo.data.defaultRecordTypeId',
        fieldApiName: TYPE_FIELD
    })
    wiredTypeOptions({ data }) {
        if (data) this.typeOptions = data.values;
    }

    @wire(getPicklistValues, {
        recordTypeId: '$faObjectInfo.data.defaultRecordTypeId',
        fieldApiName: RANK_FIELD
    })
    wiredRankOptions({ data }) {
        if (data) this.rankOptions = data.values;
    }

    @wire(getPicklistValues, {
        recordTypeId: '$faObjectInfo.data.defaultRecordTypeId',
        fieldApiName: ACCOUNT_METHOD_FIELD
    })
    wiredAccMethodOptions({ data }) {
        if (data) this.accMethodOptions = data.values;
    }

    @wire(getPicklistValues, {
        recordTypeId: '$faObjectInfo.data.defaultRecordTypeId',
        fieldApiName: FUNC_CURR_FA_FIELD
    })
    wiredFACurrencyOptions({ data }) {
        if (data) this.faFuncCurrencyOptions = data.values;
    }

    @wire(getObjectInfo, { objectApiName: FX_OBJECT })
    wiredObjectInfo({ data, error }) {
        if (data) {
            this.fxObjectInfo = data;
        } else if (error) {
            console.error('Error fetching object info:', error);
        }
    }

    @wire(getPicklistValues, {
        recordTypeId: '$fxObjectInfo.defaultRecordTypeId',
        fieldApiName: FUNC_CURR_FIELD
    })
    wiredFunctionalCurrency({ data, error }) {
        if (data) {
            this.functionalCurrencyOptions = data.values.map(item => ({
                label: item.label,
                value: item.value
            }));
        } else if (error) {
            console.error('Error fetching functional currency picklist:', error);
        }
    }

    @wire(getPicklistValues, {
        recordTypeId: '$fxObjectInfo.defaultRecordTypeId',
        fieldApiName: REPT_CURR_FIELD
    })
    wiredReportingCurrency({ data, error }) {
        if (data) {
            this.reportingCurrencyOptions = data.values.map(item => ({
                label: item.label,
                value: item.value
            }));
        } else if (error) {
            console.error('Error fetching reporting currency picklist:', error);
        }
    }

    // Handle Co-funding field changes
    handleCFFieldChange(event) {
        const recId = event.target.dataset.id;
        const field = event.target.dataset.field;
        const value = event.target.value;

        console.log('CF Field Change:', { recId, field, value });

        if (!this.coFundingEdited[recId]) {
            this.coFundingEdited[recId] = {};
        }
        this.coFundingEdited[recId][field] = value;
        
        console.log('CF Edited Records:', JSON.stringify(this.coFundingEdited));
    }

    handleAddCF() {
        if (!this.iaIdValue) {
            this.showToast('Warning', 'IA Id missing!', 'warning');
            return;
        }

        this.isLoadingCF = true;
        const newRec = {
            sobjectType: 'uNI_Budget_Summary_Source_of_Funding__c',
            uNI_IndividualApplication__c: this.iaIdValue
        };

        saveCoFunding({ coFunding: newRec })
            .then(() => {
                this.showToast('Success', 'Co-funding record created', 'success');
                return refreshApex(this.wiredCoFundResult);
            })
            .catch(error => {
                console.error('Error creating co-funding:', error);
                this.showToast('Error', 'Failed to create: ' + (error.body?.message || error.message), 'error');
            })
            .finally(() => this.isLoadingCF = false);
    }

    handleSaveCF(event) {
        const recId = event.currentTarget.dataset.id;
        const changes = this.coFundingEdited[recId];
        
        console.log('=== SAVE CF DEBUG ===');
        console.log('Record ID:', recId);
        console.log('Changes:', JSON.stringify(changes));
        console.log('IA ID:', this.iaIdValue);
        
        if (!changes) {
            this.showToast('Info', 'No changes to save', 'info');
            return;
        }

        if (!this.iaIdValue) {
            this.showToast('Error', 'Individual Application ID is missing', 'error');
            return;
        }

        // Build the complete record with IA reference
        const coFundingRecord = {
            Id: recId,
            uNI_IndividualApplication__c: this.iaIdValue, // Always include IA reference
            ...changes
        };

        console.log('Sending to Apex:', JSON.stringify(coFundingRecord));

        this.isLoadingCF = true;
        
        saveCoFunding({ coFunding: coFundingRecord })
            .then(() => {
                this.showToast('Success', 'Co-funding record saved', 'success');
                return refreshApex(this.wiredCoFundResult);
            })
            .catch(error => {
                console.error('Error saving co-funding:', error);
                console.error('Error body:', JSON.stringify(error.body));
                
                let errorMessage = 'Unknown error';
                if (error.body) {
                    if (error.body.message) {
                        errorMessage = error.body.message;
                    } else if (error.body.pageErrors && error.body.pageErrors.length > 0) {
                        errorMessage = error.body.pageErrors[0].message;
                    }
                }
                
                this.showToast('Error', 'Failed to save: ' + errorMessage, 'error');
            })
            .finally(() => {
                delete this.coFundingEdited[recId];
                this.isLoadingCF = false;
            });
    }

    handleDeleteCF(event) {
        const recId = event.currentTarget.dataset.id;

        if (!confirm('Delete this row?')) return;

        this.isLoadingCF = true;
        deleteCoFunding({ recordId: recId })
            .then(() => {
                this.showToast('Success', 'Co-funding record deleted', 'success');
                return refreshApex(this.wiredCoFundResult);
            })
            .catch(error => {
                console.error('Error deleting co-funding:', error);
                this.showToast('Error', 'Failed to delete: ' + (error.body?.message || error.message), 'error');
            })
            .finally(() => this.isLoadingCF = false);
    }

    handleAddFX() {
        if (!this.iaIdValue) {
            console.warn('Cannot create FX — IA Id not ready yet');
            this.showToast('Warning', 'Individual Application ID not available yet', 'warning');
            return;
        }

        if (!this.selectedReportingCurrency) {
            this.showToast('Warning', 'Please select a Reporting Currency first', 'warning');
            return;
        }

        this.isLoadingFX = true;

        const newFX = {
            sobjectType: 'uNI_ForeignExchangeRates__c',
            uNI_IndividualApplication__c: this.iaIdValue,
            uNI_UsedIn__c: 'Annual Report',
            uNI_ReportingCurrency__c: this.selectedReportingCurrency
        };

        createFXRate({ fx: newFX })
            .then(() => {
                this.showToast('Success', 'Foreign Exchange Rate created. Please fill in the details and click Save.', 'success');
                return refreshApex(this.wiredFXResult);
            })
            .catch(error => {
                console.error('Error creating FX rate record:', error);
                let errorMessage = 'Unknown error occurred';

                if (error.body) {
                    if (error.body.message) {
                        errorMessage = error.body.message;
                    } else if (error.body.pageErrors && error.body.pageErrors.length > 0) {
                        errorMessage = error.body.pageErrors[0].message;
                    } else if (error.body.fieldErrors) {
                        errorMessage = JSON.stringify(error.body.fieldErrors);
                    }
                } else if (error.message) {
                    errorMessage = error.message;
                }

                this.showToast('Error', 'Error creating FX rate: ' + errorMessage, 'error');
            })
            .finally(() => {
                this.isLoadingFX = false;
            });
    }

    handleAddFA() {
        if (!this.iaIdValue) {
            this.showToast('Warning', 'IA Id not available yet', 'warning');
            return;
        }

        console.log('Creating FA record with IA ID:', this.iaIdValue);

        this.isLoadingFA = true;

        const newFA = {
            sobjectType: 'uNI_FinancialAccounting__c',
            uNI_Investments__c: this.iaIdValue
        };

        saveFinancialAccounting({ faRecord: newFA })
            .then((recordId) => {
                console.log('FA record created with ID:', recordId);
                this.showToast('Success', 'Implementer record created. Please fill in the details and click Save.', 'success');
                return refreshApex(this.wiredFAResult);
            })
            .catch(error => {
                console.error('Error creating FA:', error);
                this.showToast('Error', 'Failed to create: ' + (error.body?.message || error.message), 'error');
            })
            .finally(() => this.isLoadingFA = false);
    }

    handleFAFieldChange(event) {
        const recId = event.target.dataset.id;
        const field = event.target.dataset.field;
        const value = event.target.value;

        console.log('FA Field Change:', { recId, field, value });

        if (!this.faEditedRecords[recId]) {
            this.faEditedRecords[recId] = {};
        }
        this.faEditedRecords[recId][field] = value;
        
        console.log('FA Edited Records:', JSON.stringify(this.faEditedRecords));
    }

    handleSaveFA(event) {
        const recId = event.currentTarget.dataset.id;
        const changes = this.faEditedRecords[recId];
        
        console.log('=== SAVE FA DEBUG ===');
        console.log('Record ID:', recId);
        console.log('Changes:', JSON.stringify(changes));
        console.log('IA ID:', this.iaIdValue);
        
        if (!changes) {
            this.showToast('Info', 'No changes to save', 'info');
            return;
        }

        // Build the complete record for save
        const faRecord = {
            Id: recId,
            uNI_Investments__c: this.iaIdValue, // Ensure IA reference is included
            ...changes
        };

        console.log('Sending to Apex:', JSON.stringify(faRecord));

        this.isLoadingFA = true;

        saveFinancialAccounting({ faRecord: faRecord })
            .then(() => {
                this.showToast('Success', 'Financial Accounting record saved', 'success');
                return refreshApex(this.wiredFAResult);
            })
            .catch(error => {
                console.error('Error saving FA:', error);
                console.error('Error body:', JSON.stringify(error.body));
                
                let errorMessage = 'Unknown error';
                if (error.body) {
                    if (error.body.message) {
                        errorMessage = error.body.message;
                    } else if (error.body.pageErrors && error.body.pageErrors.length > 0) {
                        errorMessage = error.body.pageErrors[0].message;
                    }
                }
                
                this.showToast('Error', 'Failed to save: ' + errorMessage, 'error');
            })
            .finally(() => {
                delete this.faEditedRecords[recId];
                this.isLoadingFA = false;
            });
    }

    handleDeleteFA(event) {
        const recId = event.currentTarget.dataset.id;
        
        if (!confirm('Delete this implementer record?')) return;
        
        this.isLoadingFA = true;

        deleteFinancialAccounting({ recordId: recId })
            .then(() => {
                this.showToast('Success', 'Implementer record deleted', 'success');
                return refreshApex(this.wiredFAResult);
            })
            .catch(error => {
                console.error('Error deleting FA:', error);
                this.showToast('Error', 'Failed to delete: ' + (error.body?.message || error.message), 'error');
            })
            .finally(() => this.isLoadingFA = false);
    }

    // --------------------
    // IA Safe Getters
    // --------------------
    get iaAccountId() { return getFieldValue(this.iaRecord?.data, ACC_ID); }
    get iaIdValue() { return getFieldValue(this.iaRecord?.data, IA_ID); }
    get projectStartDate() {
        const dateStr = getFieldValue(this.iaRecord?.data, PROJECT_START);
        return dateStr ? this.formatDate(dateStr) : '';
    }
    get projectEndDate() {
        const dateStr = getFieldValue(this.iaRecord?.data, PROJECT_END);
        return dateStr ? this.formatDate(dateStr) : '';
    }
    get maxFundingCeiling() {
        const value = getFieldValue(this.iaRecord?.data, MAX_CEILING);
        return value ? value : 'N/A';
    }
    get projectName() { return getFieldValue(this.iaRecord?.data, PROJECT_NAME); }

    formatDate(dateInput) {
        const date = new Date(dateInput);
        if (isNaN(date)) return '';
        const day = String(date.getDate()).padStart(2, '0');
        const month = date.toLocaleString('en-US', { month: 'short' });
        const year = date.getFullYear();
        return `${day}. ${month}. ${year}`;
    }

    // -------------------------
    // Wire: Account
    // -------------------------
    @wire(getRecord, { recordId: '$iaAccountId', fields: [NAME_FIELD] })
    accRecord;
    get accName() { return getFieldValue(this.accRecord?.data, NAME_FIELD); }

    get hasIa() { return !!this.iaRecord?.data; }
    get iaLoading() { return this.iaRecord && !this.iaRecord.data && !this.iaRecord.error; }
    get iaError() { return this.iaRecord?.error; }
    get hasAr() { return !!this.arRecord?.data; }
    get arLoading() { return this.arRecord && !this.arRecord.data && !this.arRecord.error; }
    get arError() { return this.arRecord?.error; }

    handleReportingCurrencyChange(event) {
        this.selectedReportingCurrency = event.target.value;
    }

    handleFieldChange(event) {
        const recordId = event.target.dataset.id;
        const fieldName = event.target.dataset.field;
        const value = event.target.value;

        if (!this.editedRecords[recordId]) {
            this.editedRecords[recordId] = {};
        }
        this.editedRecords[recordId][fieldName] = value;
    }

    handleSaveFX(event) {
        const recordId = event.currentTarget.dataset.id;

        if (!this.editedRecords[recordId]) {
            this.showToast('Info', 'No changes to save', 'info');
            return;
        }

        this.isLoadingFX = true;

        const fields = {
            [FX_ID.fieldApiName]: recordId
        };

        Object.keys(this.editedRecords[recordId]).forEach(key => {
            fields[key] = this.editedRecords[recordId][key];
        });

        const recordInput = { fields };

        updateRecord(recordInput)
            .then(() => {
                this.showToast('Success', 'Record updated successfully', 'success');
                delete this.editedRecords[recordId];
                return refreshApex(this.wiredFXResult);
            })
            .catch(error => {
                console.error('Error updating record:', error);
                let errorMessage = 'Unknown error occurred';
                if (error.body && error.body.message) {
                    errorMessage = error.body.message;
                }
                this.showToast('Error', 'Error updating: ' + errorMessage, 'error');
            })
            .finally(() => {
                this.isLoadingFX = false;
            });
    }

    handleDeleteFX(event) {
        const recordId = event.currentTarget.dataset.id;

        if (!confirm('Are you sure you want to delete this record?')) {
            return;
        }

        this.isLoadingFX = true;

        deleteRecord(recordId)
            .then(() => {
                this.showToast('Success', 'Record deleted successfully', 'success');
                delete this.editedRecords[recordId];
                return refreshApex(this.wiredFXResult);
            })
            .catch(error => {
                console.error('Error deleting record:', error);
                let errorMessage = 'Unknown error occurred';
                if (error.body && error.body.message) {
                    errorMessage = error.body.message;
                }
                this.showToast('Error', 'Error deleting: ' + errorMessage, 'error');
            })
            .finally(() => {
                this.isLoadingFX = false;
            });
    }

    showToast(title, message, variant) {
        const event = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant
        });
        this.dispatchEvent(event);
    }
}