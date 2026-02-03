import { LightningElement, track, api, wire } from 'lwc';
import { CurrentPageReference } from 'lightning/navigation';

export default class UNIInvestmentSubtab extends LightningElement {
    _recordId;
    _recordIdLogged = false;

    @api params;
    @track tabs = [];
    @track activeTab;

    @track finalizedTabs = [];
    @track activeFinalizedTab;

    @track grantTabs = [];
    @track activeGrantTab;

    connectedCallback() {
        this.initTabs();
        this.initFinalizedTabs();
        this.initGrantTabs();
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
        return this.tabs.filter(tab => !tab.isMoreItem);
    }

    get moreTabs() {
        return this.tabs.filter(tab => tab.isMoreItem);
    }

    get hasMoreTabs() {
        return this.moreTabs.length > 0;
    }

    get moreMenuClass() {
        return this.isMoreTab ? 'more-menu active' : 'more-menu';
    }

    initTabs() {
        const previousActiveId = this.activeTab && this.activeTab.id;
        const primaryTabs = [
            { id: 'finalized', label: 'Finalized Package' },
            { id: 'logframe', label: 'Logframe' },
            { id: 'milestones', label: 'Milestones' },
            { id: 'gantt', label: 'Gantt Chart' },
            { id: 'budget', label: 'Budget' },
            { id: 'disbursements', label: 'Disbursements' },
            { id: 'reports', label: 'Reports' },
            { id: 'reprogramming', label: 'Reprogramming' },
            { id: 'incidents', label: 'Incidents' },
            { id: 'management', label: 'Management Actions' },
            { id: 'risk', label: 'Risk Register' },
            { id: 'closure', label: 'Closure' },
            { id: 'audit', label: 'Audit' }
        ];
        const moreTabs = [
            { id: 'more-resources', label: 'Other Resources', isMoreItem: true }
        ];

        this.tabs = [...primaryTabs, ...moreTabs].map(tab => ({
            ...tab,
            isMoreItem: tab.isMoreItem || false
        }));

        const resolvedActiveId = this.tabs.some(tab => tab.id === previousActiveId)
            ? previousActiveId
            : this.tabs[0].id;
        this.activeTab = this.tabs.find(tab => tab.id === resolvedActiveId) || this.tabs[0];
        this._applyTabClasses(resolvedActiveId);
    }

    initFinalizedTabs() {
        const previousActiveId = this.activeFinalizedTab && this.activeFinalizedTab.id;
        this.finalizedTabs = [
            { id: 'grant', label: 'Grant Package' },
            { id: 'grantee', label: 'Grantee Signed Facesheet' },
            { id: 'ed', label: 'ED Signed Facesheet' }
        ];
        const resolvedActiveId = this.finalizedTabs.some(tab => tab.id === previousActiveId)
            ? previousActiveId
            : this.finalizedTabs[0].id;
        this.activeFinalizedTab = this.finalizedTabs.find(tab => tab.id === resolvedActiveId) || this.finalizedTabs[0];
        this._applyFinalizedTabClasses(resolvedActiveId);
    }

    initGrantTabs() {
        const previousActiveId = this.activeGrantTab && this.activeGrantTab.id;
        this.grantTabs = [
            { id: 'required', label: 'Required Files' },
            { id: 'supporting', label: 'Supporting Docs' }
        ];
        const resolvedActiveId = this.grantTabs.some(tab => tab.id === previousActiveId)
            ? previousActiveId
            : this.grantTabs[0].id;
        this.activeGrantTab = this.grantTabs.find(tab => tab.id === resolvedActiveId) || this.grantTabs[0];
        this._applyGrantTabClasses(resolvedActiveId);
    }

    handlePrimaryTabClick(event) {
        const tabId = event.currentTarget.dataset.id;
        this.activeTab = this.tabs.find(tab => tab.id === tabId);
        this._applyTabClasses(tabId);
    }

    handleMoreSelect(event) {
        const tabId = event.detail.value;
        this.activeTab = this.tabs.find(tab => tab.id === tabId);
        this._applyTabClasses(tabId);
    }

    handleFinalizedTabClick(event) {
        const tabId = event.currentTarget.dataset.id;
        this.activeFinalizedTab = this.finalizedTabs.find(tab => tab.id === tabId);
        this._applyFinalizedTabClasses(tabId);
    }

    handleGrantTabClick(event) {
        const tabId = event.currentTarget.dataset.id;
        this.activeGrantTab = this.grantTabs.find(tab => tab.id === tabId);
        this._applyGrantTabClasses(tabId);
    }

    _applyTabClasses(activeId) {
        if (!this.tabs || !this.tabs.length) {
            return;
        }
        this.tabs = this.tabs.map(tab => ({
            ...tab,
            cssClass: !tab.isMoreItem && tab.id === activeId ? 'tab-button active' : 'tab-button'
        }));
    }

    _applyFinalizedTabClasses(activeId) {
        if (!this.finalizedTabs || !this.finalizedTabs.length) {
            return;
        }
        this.finalizedTabs = this.finalizedTabs.map(tab => ({
            ...tab,
            cssClass: tab.id === activeId ? 'subtab-button active' : 'subtab-button'
        }));
    }

    _applyGrantTabClasses(activeId) {
        if (!this.grantTabs || !this.grantTabs.length) {
            return;
        }
        this.grantTabs = this.grantTabs.map(tab => ({
            ...tab,
            cssClass: tab.id === activeId ? 'subtab-button active' : 'subtab-button'
        }));
    }

    _logRecordId(source) {
        if (this._recordIdLogged && source !== 'initTabs-missing') {
            return;
        }
        // eslint-disable-next-line no-console
        console.log('[uNIInvestmentSubtab] recordId', this._recordId, 'source=', source);
        if (this._recordId) {
            this._recordIdLogged = true;
        }
    }

    get isFinalizedTab() {
        return this.activeTab && this.activeTab.id === 'finalized';
    }

    get isLogframeTab() {
        return this.activeTab && this.activeTab.id === 'logframe';
    }

    get isMilestonesTab() {
        return this.activeTab && this.activeTab.id === 'milestones';
    }

    get isGanttTab() {
        return this.activeTab && this.activeTab.id === 'gantt';
    }

    get isBudgetTab() {
        return this.activeTab && this.activeTab.id === 'budget';
    }

    get isDisbursementsTab() {
        return this.activeTab && this.activeTab.id === 'disbursements';
    }

    get isReportsTab() {
        return this.activeTab && this.activeTab.id === 'reports';
    }

    get isReprogrammingTab() {
        return this.activeTab && this.activeTab.id === 'reprogramming';
    }

    get isIncidentsTab() {
        return this.activeTab && this.activeTab.id === 'incidents';
    }

    get isManagementTab() {
        return this.activeTab && this.activeTab.id === 'management';
    }

    get isRiskTab() {
        return this.activeTab && this.activeTab.id === 'risk';
    }

    get isClosureTab() {
        return this.activeTab && this.activeTab.id === 'closure';
    }

    get isAuditTab() {
        return this.activeTab && this.activeTab.id === 'audit';
    }

    get isMoreTab() {
        return this.activeTab && this.activeTab.id && this.activeTab.id.startsWith('more-');
    }

    get isGrantPackageTab() {
        return this.activeFinalizedTab && this.activeFinalizedTab.id === 'grant';
    }

    get isGranteeFacesheetTab() {
        return this.activeFinalizedTab && this.activeFinalizedTab.id === 'grantee';
    }

    get isEdFacesheetTab() {
        return this.activeFinalizedTab && this.activeFinalizedTab.id === 'ed';
    }

    get isRequiredFilesTab() {
        return this.activeGrantTab && this.activeGrantTab.id === 'required';
    }

    get isSupportingDocsTab() {
        return this.activeGrantTab && this.activeGrantTab.id === 'supporting';
    }
}
