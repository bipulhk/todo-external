import { LightningElement, track, api, wire } from 'lwc';
import { CurrentPageReference } from 'lightning/navigation';

export default class UNIProposalSubtab extends LightningElement {
    _recordId;
    _recordIdLogged = false;

    @api params;
    @track tabs = [];
    @track activeTab;

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

    get resolvedRecordId() {
        if (this.params) {
            if (typeof this.params === 'string') {
                return this.params;
            }
            if (typeof this.params === 'object') {
                return this.params.recordId || this.params.id || this.params.c__recordId || null;
            }
        }
        return this._recordId;
    }

    get tabsForRender() {
        return this.tabs;
    }

    initTabs() {
        const previousActiveId = this.activeTab && this.activeTab.id;
        this.tabs = [
            { id: 'info', label: 'Proposal Information' },
            { id: 'form', label: 'Proposal Form' },
            { id: 'files', label: 'Proposal Files' },
            { id: 'assessment-form', label: 'Proposal Assessment Form' },
            { id: 'assessment-files', label: 'Proposal Assessment Files' }
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
        // eslint-disable-next-line no-console
        console.log('[uNIProposalSubtab] recordId', this._recordId, 'source=', source);
        if (this._recordId) {
            this._recordIdLogged = true;
        }
    }

    get isInfoTab() {
        return this.activeTab && this.activeTab.id === 'info';
    }

    get isProposalFormTab() {
        return this.activeTab && this.activeTab.id === 'form';
    }

    get isProposalFilesTab() {
        return this.activeTab && this.activeTab.id === 'files';
    }

    get isAssessmentFormTab() {
        return this.activeTab && this.activeTab.id === 'assessment-form';
    }

    get isAssessmentFilesTab() {
        return this.activeTab && this.activeTab.id === 'assessment-files';
    }
}
