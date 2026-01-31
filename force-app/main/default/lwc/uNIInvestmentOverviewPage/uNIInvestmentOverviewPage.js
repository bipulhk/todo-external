import { LightningElement, api, wire } from 'lwc';
import getProjectTeam from '@salesforce/apex/uNI_ProjectTeamController.getProjectTeam';
import getImplementingPartners from '@salesforce/apex/uNI_ProjectTeamController.getImplementingPartners';
export default class UNIInvestmentOverviewPage extends LightningElement {
    @api recordId;
    @api params;
    _logged = false;
    projectTeam = null;
    projectTeamError;
    implementingPartners = null;
    implementingPartnersError;
    columns = [
        { label: 'User', fieldName: 'userName', wrapText: true },
        { label: 'Role', fieldName: 'role', wrapText: true }
    ];

    get resolvedInvestmentId() {
        return this.params || this.recordId;
    }

    connectedCallback() {
        this._logRecordId('connectedCallback');
    }

    renderedCallback() {
        this._logRecordId('renderedCallback');
    }

    @wire(getProjectTeam, { investmentId: '$resolvedInvestmentId' })
    wiredProjectTeam({ data, error }) {
        if (data) {
            console.log('[uNIInvestmentOverviewPage] ProjectTeam rows', data.length, 'investmentId', this.resolvedInvestmentId);
            this.projectTeam = data.map((row, index) => ({
                ...row,
                rowNumber: index + 1
            }));
            this.projectTeamError = undefined;
        } else if (error) {
            this.projectTeam = [];
            this.projectTeamError = error;
            console.error('[uNIInvestmentOverviewPage] ProjectTeam load error', JSON.stringify(error));
        }
    }

    @wire(getImplementingPartners, { investmentId: '$resolvedInvestmentId' })
    wiredImplementingPartners({ data, error }) {
        if (data) {
            console.log('[uNIInvestmentOverviewPage] ImplementingPartners rows', data.length, 'investmentId', this.resolvedInvestmentId);
            this.implementingPartners = data.map((row, index) => ({
                ...row,
                rowNumber: index + 1
            }));
            this.implementingPartnersError = undefined;
        } else if (error) {
            this.implementingPartners = [];
            this.implementingPartnersError = error;
            console.error('[uNIInvestmentOverviewPage] ImplementingPartners load error', JSON.stringify(error));
        }
    }

    get projectTeamCount() {
        return this.projectTeam ? this.projectTeam.length : 0;
    }

    get isProjectTeamLoading() {
        return !!this.resolvedInvestmentId && this.projectTeam === null && !this.projectTeamError;
    }

    get implementingPartnersCount() {
        return this.implementingPartners ? this.implementingPartners.length : 0;
    }

    get isImplementingPartnersLoading() {
        return !!this.resolvedInvestmentId && this.implementingPartners === null && !this.implementingPartnersError;
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
