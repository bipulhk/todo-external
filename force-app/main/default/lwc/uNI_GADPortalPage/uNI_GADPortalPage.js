import { LightningElement, track, api, wire } from 'lwc';
import { CurrentPageReference } from 'lightning/navigation';

export default class UNI_GADPortalPage extends LightningElement {
    _recordId;
    _recordIdLogged = false;

    @track tabs = [];
    @track activeTab;
    @track showFeedbackModal = false;

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
        if (!this._recordId) {
            this._logRecordId('initTabs-missing');
            return;
        }

        const previousActiveId = this.activeTab && this.activeTab.id;
        const primaryTabs = [
            { id: 'feedback', label: 'Feedback Matrix' },
            { id: 'stage1', label: 'Stage 1' },
            { id: 'stage2', label: 'Stage 2' },
            { id: 'stage3', label: 'Stage 3' },
            { id: 'omt', label: 'OMT Review' },
            { id: 'stage4', label: 'Stage 4' },
            { id: 'stage5', label: 'Stage 5' }
        ];
        const moreTabs = [
            { id: 'more-resources', label: 'Resources', isMoreItem: true }
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

    handleTabClick(event) {
        const tabId = event.currentTarget.dataset.id;
        this.activeTab = this.tabs.find(tab => tab.id === tabId);
        this._applyTabClasses(tabId);
    }

    handleMoreSelect(event) {
        const tabId = event.detail.value;
        this.activeTab = this.tabs.find(tab => tab.id === tabId);
        this._applyTabClasses(tabId);
    }

    handleProvideFeedback() {
        this.showFeedbackModal = true;
    }

    handleFeedbackClose() {
        this.showFeedbackModal = false;
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

    _logRecordId(source) {
        if (this._recordIdLogged && source !== 'initTabs-missing') {
            return;
        }
        console.log('[uNI_GADPortalPage] recordId', this._recordId, 'source=', source);
        if (this._recordId) {
            this._recordIdLogged = true;
        }
    }

    get isFeedbackMatrix() {
        return this.activeTab && this.activeTab.id === 'feedback';
    }

    get isStage1() {
        return this.activeTab && this.activeTab.id === 'stage1';
    }

    get isStage2() {
        return this.activeTab && this.activeTab.id === 'stage2';
    }

    get isStage3() {
        return this.activeTab && this.activeTab.id === 'stage3';
    }

    get isOmtReview() {
        return this.activeTab && this.activeTab.id === 'omt';
    }

    get isStage4() {
        return this.activeTab && this.activeTab.id === 'stage4';
    }

    get isStage5() {
        return this.activeTab && this.activeTab.id === 'stage5';
    }

    get isMoreTab() {
        return this.activeTab && this.activeTab.id && this.activeTab.id.startsWith('more-');
    }
}
