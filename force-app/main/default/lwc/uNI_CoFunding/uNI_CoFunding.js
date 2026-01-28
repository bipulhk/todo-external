import { LightningElement, track, api, wire } from 'lwc';
import saveCoFundingRecords from '@salesforce/apex/uNI_CoFundingController.saveCoFundingRecords';
import getFundingSources from '@salesforce/apex/uNI_CoFundingController.getFundingSources';
import upsertFundingSources from '@salesforce/apex/uNI_CoFundingController.upsertFundingSources';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { CurrentPageReference } from 'lightning/navigation';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';
import IA_LOGFRAME_VERSION from '@salesforce/schema/IndividualApplication.uNI_LogframeVersion__c';

export default class CoFundingTable extends LightningElement {
    @track rows = [];
    @api recordId;
    @api version;   // 🔹 version passed from parent (logframe/budget version)

    @track totalRow = { inKind: 0, cash: 0, total: 0 };
    @track isEditable = true;

    _params;
    @api
    get params() {
        return this._params;
    }
    set params(value) {
        this._params = value || {};
        console.log('CoFunding: params set =>', JSON.stringify(this._params));

        if (this._params.recordId) {
            this.recordId = this._params.recordId;
        }
        if (this._params.version) {
            this.version = this._params.version;
        }

        console.log(
            'CoFunding: after params set, recordId =',
            this.recordId,
            'version =',
            this.version
        );

        // 🔹 Reload data whenever recordId/version change via params
        if (this.recordId) {
            this.loadData();
        }
    }

    @wire(CurrentPageReference)
    getStateParameters(currentPageReference) {
        if (!currentPageReference) {
            return;
        }

        const state = currentPageReference.state || {};
        const attrs = currentPageReference.attributes || {};

        const possibleRecordId =
            this.recordId ||
            state.recordId ||
            attrs.recordId ||
            state.c__recordId;

        if (!this.recordId && possibleRecordId) {
            this.recordId = possibleRecordId;
            console.log('CoFunding: recordId resolved from page ref =>', this.recordId);
            this.loadData();
        }

        if (!this.version && state.c__version) {
            this.version = state.c__version;
            console.log('CoFunding: version resolved from page ref =>', this.version);
        }
    }

    connectedCallback() {
        // In case recordId is set via @api (not via params) we still load
        if (this.recordId) {
            this.loadData();
        }
    }

    iaRecord;
    @wire(getRecord, { recordId: '$recordId', fields: [IA_LOGFRAME_VERSION] })
    wiredIARecord({ data, error }) {
        if (data) {
            this.iaRecord = data;
        } else if (error) {
            console.error('CoFunding: error loading IA logframe version', error);
            this.iaRecord = undefined;
        }
    }

    get iaLogframeVersion() {
        return getFieldValue(this.iaRecord, IA_LOGFRAME_VERSION);
    }

    parseVersion(value) {
        if (value === undefined || value === null || value === '') {
            return null;
        }
        const parsed = parseInt(value, 10);
        return isNaN(parsed) ? null : parsed;
    }

    get isVersionAhead() {
        const passedVersion = this.parseVersion(this.version);
        const currentVersion = this.parseVersion(this.iaLogframeVersion);
        if (passedVersion === null || currentVersion === null) {
            return false;
        }
        return passedVersion > currentVersion;
    }

    get showSaveButton() {
        return this.isEditable || this.isVersionAhead;
    }

    get isReadOnly() {
        return !this.showSaveButton;
    }

    async loadData() {
        try {
            if (!this.recordId) {
                console.log('CoFunding: loadData called but recordId is not set yet.');
                return;
            }
            console.log('CoFunding: loadData recordId =', this.recordId, 'version =', this.version);

            const result = await getFundingSources({
                individualAppId: this.recordId,
                version: this.version          // 🔹 pass version to Apex
            });

            this.rows = result.map(r => ({
                id: r.Id,
                source: r.Name,
                inKind: r.uNI_InKinds__c,
                cash: r.uNI_Cash__c,
                total: r.uNI_Total__c,
                indApp: this.recordId,
                comments: r.uNI_Comments__c
            }));
            this.recalculateTotals();
        } catch (err) {
            console.error('CoFunding: Error loading data', err);
        }
    }

    addRow() {
        console.log('CoFunding: addRow, IA id =', this.recordId);
        this.rows = [
            ...this.rows,
            {
                id: 'temp_' + Date.now(),
                source: '',
                inKind: 0,
                cash: 0,
                total: 0,
                indApp: this.recordId,
                comments: ''
            }
        ];
    }

    removeRow(event) {
        const index = event.currentTarget.dataset.index;
        this.rows.splice(index, 1);
        this.rows = [...this.rows];
        this.recalculateTotals();
    }

    handleChange(event) {
        const index = event.target.dataset.index;
        const field = event.target.dataset.field;
        this.rows[index][field] = event.target.value;

        if (field === 'inKind' || field === 'cash') {
            const inKind = parseFloat(this.rows[index].inKind) || 0;
            const cash = parseFloat(this.rows[index].cash) || 0;
            this.rows[index].total = inKind + cash;
        }
        this.rows = [...this.rows];
        this.recalculateTotals();
    }

    async saveRecords() {
        try {
            const payload = JSON.stringify(this.rows);
            console.log('CoFunding: saveRecords payload =', payload);
            console.log('CoFunding: IA =', this.recordId, 'version =', this.version);

            await upsertFundingSources({
                jsonData: payload,
                individualAppId: this.recordId,
                version: this.version         // 🔹 pass version to Apex
            });

            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Success',
                    message: 'Records saved successfully!',
                    variant: 'success'
                })
            );

            // Optionally reload from server
            // await this.loadData();
        } catch (err) {
            console.error('CoFunding: Save error', err);
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error saving records',
                    message: err.body?.message || err.message,
                    variant: 'error'
                })
            );
        }
    }

    // old method still here if you ever use saveRecords1; it ignores version
    saveRecords1() {
        console.log('CoFunding: saveRecords1, IA =', this.recordId);
        saveCoFundingRecords({ coFundingList: this.rows })
            .then(() => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Success',
                        message: 'Records saved successfully!',
                        variant: 'success'
                    })
                );
            })
            .catch(error => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Error saving records',
                        message: error.body.message,
                        variant: 'error'
                    })
                );
            });
    }

    recalculateTotals() {
        let inKindSum = 0,
            cashSum = 0,
            totalSum = 0;
        this.rows.forEach(r => {
            inKindSum += parseFloat(r.inKind) || 0;
            cashSum += parseFloat(r.cash) || 0;
            totalSum += parseFloat(r.total) || 0;
        });
        this.totalRow = {
            inKind: inKindSum,
            cash: cashSum,
            total: totalSum
        };
    }
}