import { LightningElement, track, api, wire } from 'lwc';
import { CurrentPageReference } from 'lightning/navigation';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';

// Default version field on IndividualApplication
import VERSION_FIELD from '@salesforce/schema/IndividualApplication.uNI_LogframeVersion__c';
import RR_VERSION_FIELD from '@salesforce/schema/uNI_ReprogrammingRequest__c.uNI_LogframeVersion__c';

// Apex to fetch available versions
import getAvailableLogframeVersions from '@salesforce/apex/uNI_LogframeController.getAvailableLogframeVersions';
// Apex to resolve investment ID
import resolveInvestmentId from '@salesforce/apex/uNI_LogframeController.resolveInvestmentId';
import getObjectApiName from '@salesforce/apex/uNI_ReprogrammingObjectCheck.getObjectApiName';


export default class UNI_MilestoneTab extends LightningElement {
    _recordId;
    recordIdForWire; // reactive property for wire
    effectiveInvestmentId; // resolved investment ID

    @track tabs = [];
    @track activeTab;
    @track version; // selected/active version

    @track logframeVersionOptions = [];
    @track versionLoadError;
    @track contextObjectApiName;
    iaDefaultVersion;
    rrDefaultVersion;
    iaDefaultLoaded = false;
    rrDefaultLoaded = false;
    defaultAttempted = false;
    mostRecentVersion;

    @api
    get recordId() {
        return this._recordId;
    }
    set recordId(value) {
        this._recordId = value;
        this.recordIdForWire = value;
        this._recomputeEffectiveId();
    }


    @wire(CurrentPageReference)
    getStateParams(pageRef) {
        if (!pageRef) return;
        const st = pageRef.state || {};
        const fromState = st.recordId || st.c__recordId || st.id || st.c__id || null;
        const fromUrl = this._fallbackFromUrl();
        const resolved = fromState || fromUrl || null;
        if (resolved && resolved !== this._recordId) {
            this.recordId = resolved;
        }
    }
    _fallbackFromUrl() {
        try {
            const qs = new URLSearchParams(window.location.search || '');
            const qId = qs.get('c__recordId') || qs.get('recordId') || qs.get('c__id') || qs.get('id');
            if (qId && this._looksLikeSfId(qId)) return qId;

            const parts = (window.location.pathname || '').split('/');
            if (parts.length > 3 && this._looksLikeSfId(parts[3])) return parts[3];

            const anyId = parts.find(p => this._looksLikeSfId(p));
            return anyId || null;
        } catch {
            return null;
        }
    }
    _looksLikeSfId(v) {
        return /^[a-zA-Z0-9]{15}([a-zA-Z0-9]{3})?$/.test(String(v).trim());
    }

    // ---- Get recordId from URL/pageRef (for community / app page) ----
    @wire(CurrentPageReference)
    getStateParameters(pageRef) {
        if (pageRef && pageRef.state) {
            const idFromState =
                pageRef.state.recordId ||
                pageRef.state.c__recordId ||
                pageRef.state.id ||
                null;

            if (idFromState && idFromState !== this._recordId) {
                this._recordId = idFromState;
                this.recordIdForWire = idFromState;
                this._recomputeEffectiveId();
            }
        }
    }


    // ---- Resolve parent Investment from arbitrary context record ----
    @wire(resolveInvestmentId, { contextId: '$recordIdForWire' })
    wiredResolved({ data }) {
        if (data !== undefined) {
            this.effectiveInvestmentId = data; // could be null
            this.initTabs();
        }
    }

    // ---- Determine context object type ----
    @wire(getObjectApiName, { recordId: '$recordIdForWire' })
    wiredObjectType({ data, error }) {
        if (data) {
            this.contextObjectApiName = data;
            this._attemptSetDefaultVersion();
        } else if (error) {
            console.error('Error resolving context object type', error);
        }
    }

    _recomputeEffectiveId() {
        // If we have a resolved investment ID from the wire adapter, use it
        // Otherwise, fall back to the recordId
        if (!this.effectiveInvestmentId) {
            this.effectiveInvestmentId = this._recordId;
        }
        this.initTabs();
    }

    // ---- Get default version from IndividualApplication ----
    @wire(getRecord, {
        recordId: '$effectiveInvestmentId',
        fields: [VERSION_FIELD]
    })
    wiredIA({ data, error }) {
        if (data) {
            this.iaDefaultVersion = getFieldValue(data, VERSION_FIELD);
            this.iaDefaultLoaded = true;
            this._attemptSetDefaultVersion();
        } else if (error) {
            // Optional: log error
            console.error('Error loading IA for version', error);
        }
    }

    get rrRecordId() {
        return this.contextObjectApiName === 'uNI_ReprogrammingRequest__c'
            ? this.recordIdForWire
            : null;
    }

    // ---- Get default version from Reprogramming Request ----
    @wire(getRecord, {
        recordId: '$rrRecordId',
        fields: [RR_VERSION_FIELD]
    })
    wiredRR({ data, error }) {
        if (data) {
            this.rrDefaultVersion = getFieldValue(data, RR_VERSION_FIELD);
            this.rrDefaultLoaded = true;
            this._attemptSetDefaultVersion();
        } else if (error) {
            console.error('Error loading Reprogramming Request for version', error);
        }
    }

    _attemptSetDefaultVersion() {
        if (!this.contextObjectApiName) {
            return;
        }
        if (this.version) {
            return;
        }

        if (this.contextObjectApiName === 'uNI_ReprogrammingRequest__c') {
            if (!this.rrDefaultLoaded) {
                return;
            }
            if (this.rrDefaultVersion) {
                this.version = this.rrDefaultVersion;
                this.initTabs();
            }
            this.defaultAttempted = true;
            if (!this.version && this.mostRecentVersion) {
                this.version = this.mostRecentVersion;
                this.initTabs();
            }
            return;
        }

        if (this.contextObjectApiName === 'IndividualApplication') {
            if (!this.iaDefaultLoaded) {
                return;
            }
            if (this.iaDefaultVersion) {
                this.version = this.iaDefaultVersion;
                this.initTabs();
            }
            this.defaultAttempted = true;
            if (!this.version && this.mostRecentVersion) {
                this.version = this.mostRecentVersion;
                this.initTabs();
            }
            return;
        }

        // Any other context: mark attempted so versions list can fallback
        this.defaultAttempted = true;
        if (!this.version && this.mostRecentVersion) {
            this.version = this.mostRecentVersion;
            this.initTabs();
        }
    }

    // ---- Get list of available logframe versions ----
    @wire(getAvailableLogframeVersions, {
        applicationId: '$effectiveInvestmentId'
    })
    wiredVersions({ data, error }) {

        if (data) {
            // Normalize to strings then sort numerically descending to get the most recent (largest) version first
            const normalized = data
                .filter(v => v !== null && v !== undefined && v !== '')
                .map(v => String(v).trim());

            // Build options (unsorted for labels), but compute most recent using a numeric-aware sort
            this.logframeVersionOptions = normalized.map(v => ({
                label: v,
                value: v
            }));

            // Determine the most recent (largest) version
            const mostRecent = [...normalized]
                .sort((a, b) => {
                    const na = Number(a);
                    const nb = Number(b);
                    // If both are valid numbers, compare numerically
                    if (!Number.isNaN(na) && !Number.isNaN(nb)) {
                        return nb - na;
                    }
                    // Fallback to localeCompare for non-numeric strings (descending)
                    return String(b).localeCompare(String(a), undefined, { numeric: true, sensitivity: 'base' });
                })[0];
            this.mostRecentVersion = mostRecent;

            // If no version selected yet, default to:
            // 1) IA version if set and exists in the options
            // 2) else the most recent (largest) version
            if (!this.version && this.defaultAttempted) {
                const iaVersionCandidate = this.version; // current selected if any (should be null here)
                const iaFromWire = null; // IA default is handled in wiredIA; here we enforce most recent if not set

                if (this.logframeVersionOptions.length > 0) {
                    // If IA already set it earlier and it's present, keep it; else use mostRecent
                    const hasIa = iaVersionCandidate && this.logframeVersionOptions.some(o => o.value === iaVersionCandidate);
                    this.version = hasIa ? iaVersionCandidate : mostRecent;
                }
                this.initTabs();
            } else if (this.version) {
                // Ensure current selection exists; if not, fallback to most recent
                const exists = this.logframeVersionOptions.some(o => o.value === this.version);
                if (!exists && mostRecent) {
                    this.version = mostRecent;
                    this.initTabs();
                }
            }
        } else if (error) {
            this.versionLoadError = error;
            console.error('Error loading versions', error);
        }
    }

    // ---- Handle picklist change ----
    handleVersionChange(event) {
        this.version = event.detail.value;
        this.initTabs();
    }

    // ---- Tabs setup ----
    initTabs() {
        if (!this.effectiveInvestmentId) {
            return;
        }

        const params = {
            recordId: this.effectiveInvestmentId,
            version: this.version // this is what you selected in combobox
        };

        this.tabs = [
            {
                id: 'tab1',
                label: 'By Output',
                lwcName: 'uNI_sd_milestoneTracker',
                params
            },
            {
                id: 'tab2',
                label: 'Chronological',
                lwcName: 'uNI_sd_milestoneTimeline',
                params
            }
        ];

        // Preserve active tab if possible
        if (this.activeTab) {
            const existing = this.tabs.find(t => t.id === this.activeTab.id);
            this.activeTab = existing || this.tabs[0];
        } else {
            this.activeTab = this.tabs[0];
        }
    }

    // ---- Tab click handler ----
    handleTabClick(event) {
        const tabId = event.currentTarget.dataset.id;
        this.activeTab = this.tabs.find(tab => tab.id === tabId);
        console.log('active tab params:', JSON.stringify(this.activeTab.params));
    }
}