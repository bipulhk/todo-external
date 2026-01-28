import { LightningElement, api, track, wire } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { CurrentPageReference } from 'lightning/navigation';
import getRates from '@salesforce/apex/uNI_ForeignExchangeRateController.getRates';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { deleteRecord } from 'lightning/uiRecordApi';
import { refreshApex } from '@salesforce/apex';

const ROW_ACTIONS = [
    { label: 'Edit', name: 'edit' },
    { label: 'Delete', name: 'delete' }
];

const COLUMNS = [
    {
        label: 'Name',
        fieldName: 'recordLink',
        type: 'url',
        typeAttributes: {
            label: { fieldName: 'Name' },
            target: '_blank'
        }
    },
    { label: 'Partner Organization', fieldName: 'uNI_PartnerOrganization__c' },
    { label: 'Country', fieldName: 'uNI_Country__c' },
    { label: 'Local Currency', fieldName: 'uNI_LocalCurrency__c' },
    { label: 'Forex in US', fieldName: 'uNI_ForexInUS__c' },
    { label: 'Source', fieldName: 'uNI_Source__c' },
    { label: 'Version', fieldName: 'uNI_Version__c' },
    {
        type: 'action',
        typeAttributes: {
            rowActions: ROW_ACTIONS,
            menuAlignment: 'right'
        }
    }
];

export default class UNIForeignExchangeRatesTable extends NavigationMixin(LightningElement) {
    @api recordId;
    @api version;

    _params;
    @api
    get params() {
        return this._params;
    }
    set params(value) {
        this._params = value || {};
        console.log('FX: params set =>', JSON.stringify(this._params));

        if (this._params.recordId) {
            this.recordId = this._params.recordId;
        }
        if (this._params.version) {
            this.version = this._params.version;
        }

        console.log('FX: after params set, recordId =', this.recordId, 'version =', this.version);
    }

    @track data;
    @track error;
    @track isLoading = false;
    @track rowCount = 0;

    // Modal state
    @track showNewModal = false;
    @track isSaving = false;

    columns = COLUMNS;

    // IMPORTANT: store wired result so refreshApex works
    _wiredRatesResult;

    connectedCallback() {
        console.log('FX connectedCallback, recordId:', this.recordId, 'version:', this.version);
        // no need to call loadRates here; wire will handle if recordId/version is set
        // but keeping it is fine; it can cause double fetch though.
        // We'll keep it OFF to avoid duplicates.
        // this.loadRates();
    }

    @wire(CurrentPageReference)
    getStateParameters(currentPageReference) {
        if (!currentPageReference) return;

        const state = currentPageReference.state || {};
        const attrs = currentPageReference.attributes || {};

        const possibleRecordId =
            this.recordId ||
            state.recordId ||
            attrs.recordId ||
            state.c__recordId;

        if (!this.recordId && possibleRecordId) {
            this.recordId = possibleRecordId;
            console.log('FX: recordId resolved from page ref =>', this.recordId);
        }

        if (!this.version && state.c__version) {
            this.version = state.c__version;
            console.log('FX: version resolved from page ref =>', this.version);
        }
    }

    // ---------- Data loading (wire) ----------
    @wire(getRates, {
        individualApplicationId: '$recordId',
        version: '$version'
    })
    wiredRates(result) {
        // store for refreshApex
        this._wiredRatesResult = result;

        const { data, error } = result;

        if (data) {
            console.log(
                'FX: Wire data =>',
                data.length,
                ' recordId=',
                this.recordId,
                ' version=',
                this.version
            );

            const processed = data.map((row) => ({
                ...row,
                recordLink: '/' + row.Id
            }));

            this.data = processed;
            this.rowCount = processed.length;
            this.error = undefined;
        } else if (error) {
            console.error('FX: Wire error =>', JSON.parse(JSON.stringify(error)));
            this.error = error;
            this.data = undefined;
            this.rowCount = 0;

            const message =
                error && error.body && error.body.message
                    ? error.body.message
                    : 'Unknown error';

            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error loading Foreign Exchange Rates',
                    message,
                    variant: 'error'
                })
            );
        }
    }

    // ---------- Imperative refresh (optional button) ----------
    // Keep this for manual refresh (works even if wire cache gets weird)
    loadRates() {
        if (!this.recordId) {
            console.log('FX: loadRates called but recordId is not set yet.');
            return;
        }

        this.isLoading = true;

        getRates({
            individualApplicationId: this.recordId,
            version: this.version
        })
            .then((result) => {
                const processed = (result || []).map((row) => ({
                    ...row,
                    recordLink: '/' + row.Id
                }));
                this.data = processed;
                this.rowCount = processed.length;
                this.error = undefined;
            })
            .catch((error) => {
                this.error = error;
                this.data = undefined;
                this.rowCount = 0;

                const message =
                    error && error.body && error.body.message
                        ? error.body.message
                        : 'Unknown error';

                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Error loading Foreign Exchange Rates',
                        message,
                        variant: 'error'
                    })
                );
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    async refreshTable() {
        // best-effort refresh: prefer wire refresh, fallback to imperative
        try {
            if (this._wiredRatesResult) {
                await refreshApex(this._wiredRatesResult);
                return;
            }
        } catch (e) {
            // eslint-disable-next-line no-console
            console.warn('FX: refreshApex failed, falling back to loadRates()', e);
        }
        this.loadRates();
    }

    // ---------- Row actions ----------
    handleRowAction(event) {
        const actionName = event.detail.action.name;
        const row = event.detail.row;

        switch (actionName) {
            case 'edit':
                this.handleEditRow(row);
                break;
            case 'delete':
                this.handleDeleteRow(row);
                break;
            default:
        }
    }

    handleEditRow(row) {
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: row.Id,
                objectApiName: 'uNI_ForeignExchangeRates__c',
                actionName: 'edit'
            }
        });
    }

    handleDeleteRow(row) {
        if (!row || !row.Id) return;

        this.isLoading = true;

        deleteRecord(row.Id)
            .then(() => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Record deleted',
                        message: 'Foreign Exchange Rate record was deleted.',
                        variant: 'success'
                    })
                );

                // same pattern as your Management Actions: delay + refreshApex
                setTimeout(() => {
                    this.refreshTable();
                }, 300);
            })
            .catch((error) => {
                const message =
                    error && error.body && error.body.message
                        ? error.body.message
                        : 'Unknown error';

                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Error deleting record',
                        message,
                        variant: 'error'
                    })
                );
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    // ---------- Top buttons ----------
    handleNew() {
        if (!this.recordId) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Cannot create record',
                    message: 'No Individual Application Id available.',
                    variant: 'error'
                })
            );
            return;
        }
        this.showNewModal = true;
    }

    handleCloseNewModal() {
        this.showNewModal = false;
        this.isSaving = false;
    }

    // IMPORTANT: intercept submit to ensure defaults are included even though fields are hidden
    handleCreateSubmit(event) {
        event.preventDefault();
        this.isSaving = true;

        const fields = event.detail.fields;
        fields.uNI_IndividualApplication__c = this.recordId;

        if (this.version) {
            fields.uNI_Version__c = this.version;
        }

        this.template.querySelector('lightning-record-edit-form').submit(fields);
    }

    handleNewSuccess() {
        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Record created',
                message: 'Foreign Exchange Rate record was created.',
                variant: 'success'
            })
        );

        this.showNewModal = false;
        this.isSaving = false;

        // Delay then refresh wire (same as your reference component)
        setTimeout(() => {
            this.refreshTable();
        }, 300);
    }

    handleNewError(event) {
        this.isSaving = false;

        const message =
            event?.detail?.message ||
            event?.detail?.detail ||
            'Error creating record.';

        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Create failed',
                message,
                variant: 'error'
            })
        );
    }

    handleRefresh() {
        console.log('FX: manual refresh button clicked');
        // Use wire refresh first
        this.refreshTable();
    }
}