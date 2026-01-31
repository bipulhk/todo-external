import { LightningElement, track, api, wire } from 'lwc';
import { CurrentPageReference } from 'lightning/navigation';

export default class UNI_InvestmentPortalPage extends LightningElement {
    _recordId;
    @track tabs = [];
    @track activeTab;
    _recordIdLogged = false;

    connectedCallback() {
        this.initTabs();
    }

    @api
    get recordId() {
        return this._recordId;
    }
    set recordId(value) {
        this._recordId = value;
        this._logRecordId('api');
        this.initTabs();
    }

    @wire(CurrentPageReference)
    getStateParameters(pageRef) {
        if (pageRef && pageRef.state) {
            const idFromState = pageRef.state.recordId || pageRef.state.c__recordId || pageRef.state.id || null;
            if (idFromState && idFromState !== this._recordId) {
                this._recordId = idFromState;
                this._logRecordId('state');
                this.initTabs();
            }
        }
        if (pageRef && pageRef.attributes && pageRef.attributes.recordId) {
            const idFromAttributes = pageRef.attributes.recordId;
            if (idFromAttributes && idFromAttributes !== this._recordId) {
                this._recordId = idFromAttributes;
                this._logRecordId('attributes');
                this.initTabs();
            }
        }
        if (!this._recordId && window.location.pathname) {
            const match = window.location.pathname.match(/\/([a-zA-Z0-9]{15,18})(?:\/|$)/);
            if (match) {
                this._recordId = match[1];
                this._logRecordId('path');
                this.initTabs();
            }
        }
    }

    get tabsForRender() {
        return this.tabs;
    }

    initTabs() {
        if (!this._recordId) {
            this._logRecordId('initTabs-missing');
            return;
        }
        const previousActiveId = this.activeTab && this.activeTab.id;
        this.tabs = [
            { id: 'tab1', label: 'Details', lwcName: 'uNIInvestmentOverviewPage', recordId: this._recordId },
            { id: 'tab2', label: 'Proposal', lwcName: 'c-u-n-i-investment-proposal', recordId: this._recordId },
            { id: 'tab3', label: 'GAD', lwcName: 'c-u-n-i-investment-gad', recordId: this._recordId },
            { id: 'tab4', label: 'Implementation', lwcName: 'c-u-n-i-investment-implementation', recordId: this._recordId }
        ];
        const resolvedActiveId = this.tabs.some(tab => tab.id === previousActiveId)
            ? previousActiveId
            : this.tabs[0].id;
        this.activeTab = this.tabs.find(tab => tab.id === resolvedActiveId) || this.tabs[0];
        this._applyTabClasses(resolvedActiveId);
    }

    handleTabClick(event) {
        const tabId = event.currentTarget.dataset.id;
        this.activeTab = this.tabs.find(tab => tab.id === tabId);
        this._applyTabClasses(tabId);
    }

    _applyTabClasses(activeId) {
        if (!this.tabs || !this.tabs.length) {
            return;
        }
        this.tabs = this.tabs.map(tab => ({
            ...tab,
            cssClass: tab.id === activeId ? 'tab-button active' : 'tab-button'
        }));
    }

    _logRecordId(source) {
        if (this._recordIdLogged && source !== 'initTabs-missing') {
            return;
        }
        console.log('[uNI_InvestmentPortalPage] recordId', this._recordId, 'source=', source);
        if (this._recordId) {
            this._recordIdLogged = true;
        }
    }
}
