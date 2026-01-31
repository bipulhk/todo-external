import { LightningElement, api } from 'lwc';
export default class UNIInvestmentOverviewPage extends LightningElement {
    @api recordId;
    @api params;
    _logged = false;

    get resolvedInvestmentId() {
        return this.params || this.recordId;
    }

    connectedCallback() {
        this._logRecordId('connectedCallback');
    }

    renderedCallback() {
        this._logRecordId('renderedCallback');
    }

    _logRecordId(source) {
        if (this._logged && this.resolvedInvestmentId) {
            return;
        }
        console.log('[uNIInvestmentOverviewPage] recordId', this.recordId, 'params', this.params, 'resolved', this.resolvedInvestmentId, 'source=', source);
        if (this.resolvedInvestmentId) {
            this._logged = true;
        }
    }
}
