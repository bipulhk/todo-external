// uNI_AnnualReportsListCommPortal
// Purpose: Community list view of Annual Reports for a given Individual Application (IA).
// IA resolution order: @api iaId -> pageRef state/attributes -> URL query params -> @api recordId.
// Data source: uNI_AnnualReportsListCommPortalCtlr.getReportsByApplication(applicationId).
// Output: datatable with record URLs for Experience Cloud (site-relative).
import { LightningElement, wire, track, api } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { CurrentPageReference } from 'lightning/navigation';
import getReportsByApplication from '@salesforce/apex/uNI_AnnualReportsListCommPortalCtlr.getReportsByApplication';

export default class UNI_AnnualReportTable extends NavigationMixin(LightningElement) {
    @api iaId;
    @api recordId;

    @track reports = [];
    @track error;
    isLoading = true;
    showFlowModal = false;
    flowTitle = 'Create Annual Report';

    _effectiveIaId;

    connectedCallback() {
        this.tryResolveFromUrl();
        setTimeout(() => this.tryResolveFromUrl(), 0);
        console.log('[AnnualReportTable] connectedCallback');
    }

    @wire(CurrentPageReference)
    setEffectiveFromPageRef(pageRef) {
        const resolved = this.resolveIaId(pageRef);
        this.setEffective(resolved, '[wire(CurrentPageReference)]');
    }

    tryResolveFromUrl() {
        const resolved = this.resolveIaId();
        this.setEffective(resolved, '[tryResolveFromUrl]');
    }

    setEffective(candidate) {
        if (candidate && candidate !== this._effectiveIaId) {
            this._effectiveIaId = candidate;
            this.isLoading = true;
            console.log('[AnnualReportTable] effective IA:', this._effectiveIaId);
        } else if (!candidate) {
            this.isLoading = false;
            console.warn('[AnnualReportTable] No IA Id resolved from page or URL');
        }
    }

    resolveIaId(pageRef) {
        if (this.iaId) return this.iaId;

        if (pageRef) {
            const state = pageRef.state || {};
            const fromState =
                state.iaId || state.c__iaId ||
                state.recordId || state.c__recordId || state.id || null;

            const fromAttributes = pageRef.attributes && pageRef.attributes.recordId
                ? pageRef.attributes.recordId
                : null;

            if (fromState) return fromState;
            if (fromAttributes) return fromAttributes;
        }

        try {
            const params = new URLSearchParams(window.location.search || '');
            const fromQuery =
                params.get('iaId') || params.get('c__iaId') ||
                params.get('recordId') || params.get('c__recordId') || params.get('id');
            if (fromQuery) return fromQuery;
        } catch (e) {}

        return this.recordId || null;
    }

    // ---- Data wire ----
    @wire(getReportsByApplication, { applicationId: '$_effectiveIaId' })
    async wiredReports({ data, error }) {
        if (!this._effectiveIaId) {
            this.isLoading = false;
            console.warn('[AnnualReportTable] Skipping Apex call: missing IA Id');
            return;
        }

        if (data) {
            // Build community-safe record URLs
            // (generateUrl returns site-relative URLs in Experience Cloud)
            this.isLoading = true;
            const rows = Array.isArray(data) ? data : [];
            console.log('[AnnualReportTable] Loaded rows:', rows.length);
            const urls = await Promise.all(
                rows.map(r =>
                    this[NavigationMixin.GenerateUrl]({
                        type: 'standard__recordPage',
                        attributes: {
                            recordId: r.Id,
                            actionName: 'view'
                        }
                    })
                )
            );
            this.reports = rows.map((r, i) => ({ ...r, recordUrl: urls[i] || '#' }));
            this.error = undefined;
            this.isLoading = false;
        } else if (error) {
            this.error = error;
            this.reports = [];
            this.isLoading = false;
            console.error('[AnnualReportTable] Apex error:', JSON.stringify(error));
        }
    }

    // ---- Template helpers ----
    get hasRecords() {
        return Array.isArray(this.reports) && this.reports.length > 0;
    }
    get isEmpty() {
        return !this.isLoading && !this.hasRecords && !this.error;
    }
    get effectiveIaId() {
        return this._effectiveIaId;
    }
    get disableCreateButtons() {
        return !this._effectiveIaId;
    }

    // ---- Flow launch ----
    get flowInputVariables() {
        return [
            {
                name: 'recordId',
                type: 'String',
                value: this._effectiveIaId
            }
        ];
    }

    handleCreateAnnualReport() {
        this.flowTitle = 'Create Annual Report';
        this.showFlowModal = true;
    }

    handleCreateFlashReport() {
        this.flowTitle = 'Create Flash Report';
        this.showFlowModal = true;
    }

    closeFlowModal() {
        this.showFlowModal = false;
    }

    handleFlowStatusChange(event) {
        if (event.detail.status === 'FINISHED') {
            this.showFlowModal = false;
        }
    }

    // ---- Datatable columns (Name is a URL with label) ----
    get columns() {
        return [
            {
                label: 'Name',
                fieldName: 'recordUrl',
                type: 'url',
                sortable: false,
                typeAttributes: {
                    label: { fieldName: 'Name' },
                    target: '_self' // open inside the community
                }
            },
            {
                label: 'Date Submitted',
                fieldName: 'uNI_DateSubmittedtoUnitaid__c',
                type: 'date',
                sortable: true,
                typeAttributes: { day: '2-digit', month: 'short', year: 'numeric' }
            },
            { label: 'Status', fieldName: 'uNI_Status__c', type: 'text', sortable: true }
        ];
    }
}
