// uNI_AnnualAndFlashReports
// Purpose: Lists Annual and Flash reports for an Individual Application.
// Context: IA record page; resolves recordId from page state/path.
// Data source: uNI_AnnualAndFlashReportsController.getReports (isFlash true/false).
import { api, LightningElement, wire } from 'lwc';
import { CurrentPageReference, NavigationMixin } from 'lightning/navigation';
import getReports from '@salesforce/apex/uNI_AnnualAndFlashReportsController.getReports';

const COLUMNS = [
    {
        label: 'Name',
        fieldName: 'recordUrl',
        type: 'url',
        typeAttributes: { label: { fieldName: 'Name' }, target: '_self' }
    },
    { label: 'Year', fieldName: 'uNI_Year_to_report__c' },
    { label: 'Status', fieldName: 'uNI_Status__c' },
    { label: 'Type', fieldName: 'uNI_ReportType__c' }
];

export default class UNI_AnnualAndFlashReports extends NavigationMixin(LightningElement) {
    @api recordId;
    _recordIdFromPage;

    columns = COLUMNS;
    annualReports = [];
    flashReports = [];
    annualError;
    flashError;
    annualErrorMessage;
    flashErrorMessage;

    @wire(CurrentPageReference)
    getStateParameters(pageRef) {
        if (pageRef?.state) {
            this._recordIdFromPage =
                pageRef.state.recordId ||
                pageRef.state.c__recordId ||
                pageRef.state.id ||
                null;
        }

        if (!this._recordIdFromPage && window.location.search) {
            const params = new URLSearchParams(window.location.search);
            this._recordIdFromPage =
                params.get('recordId') ||
                params.get('c__recordId') ||
                params.get('id') ||
                null;
        }

        if (!this._recordIdFromPage && window.location.pathname) {
            const regex = /\/individualapplication\/([a-zA-Z0-9]{15,18})(?:\/|$)/;
            const match = window.location.pathname.match(regex);
            if (match) {
                this._recordIdFromPage = match[1];
            }
        }
    }

    get effectiveRecordId() {
        return this.recordId || this._recordIdFromPage || null;
    }

    @wire(getReports, { recordId: '$effectiveRecordId', isFlash: false })
    wiredAnnual({ data, error }) {
        if (data) {
            this.setAnnualReports(data);
            this.annualError = undefined;
            this.annualErrorMessage = undefined;
        } else if (error) {
            this.annualReports = [];
            this.annualError = error;
            this.annualErrorMessage = this.normalizeError(error);
            // Log full error for debugging
            // eslint-disable-next-line no-console
            console.error('Annual reports load error', error);
        }
    }

    @wire(getReports, { recordId: '$effectiveRecordId', isFlash: true })
    wiredFlash({ data, error }) {
        if (data) {
            this.setFlashReports(data);
            this.flashError = undefined;
            this.flashErrorMessage = undefined;
        } else if (error) {
            this.flashReports = [];
            this.flashError = error;
            this.flashErrorMessage = this.normalizeError(error);
            // eslint-disable-next-line no-console
            console.error('Flash reports load error', error);
        }
    }

    async setAnnualReports(data) {
        this.annualReports = await this.decorateRows(data);
    }

    async setFlashReports(data) {
        this.flashReports = await this.decorateRows(data);
    }

    async decorateRows(data) {
        const rows = data || [];
        if (!rows.length) return [];

        const urlPromises = rows.map((row) => (
            this[NavigationMixin.GenerateUrl]({
                type: 'standard__recordPage',
                attributes: {
                    recordId: row.Id,
                    objectApiName: 'uNI_Annual_Report__c',
                    actionName: 'view'
                }
            }).catch(() => `/${row.Id}`)
        ));

        const urls = await Promise.all(urlPromises);
        return rows.map((row, index) => ({
            ...row,
            recordUrl: urls[index]
        }));
    }

    normalizeError(error) {
        if (Array.isArray(error?.body)) {
            return error.body.map((e) => e.message).join(', ');
        }
        return error?.body?.message || error?.message || 'Unknown error';
    }

}
