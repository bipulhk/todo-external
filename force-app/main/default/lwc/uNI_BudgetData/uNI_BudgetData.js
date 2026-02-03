import { LightningElement, track, api, wire } from 'lwc';
import getBudgetData from '@salesforce/apex/uNI_BudgetDataController.getBudgetData';
import saveBudgetData from '@salesforce/apex/uNI_BudgetDataController.saveBudgetData';
import saveSelectedColumns from '@salesforce/apex/uNI_BudgetDataController.saveSelectedColumnsV2';
import { CurrentPageReference } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';
import IA_LOGFRAME_VERSION from '@salesforce/schema/IndividualApplication.uNI_LogframeVersion__c';
import RR_LOGFRAME_VERSION from '@salesforce/schema/uNI_ReprogrammingRequest__c.uNI_LogframeVersion__c';
import getObjectApiName
    from '@salesforce/apex/uNI_ReprogrammingObjectCheck.getObjectApiName';

export default class BudgetTable extends LightningElement {
    @api recordId;
    @track rows = [];
    @track outputOptions = [];
    @track orgNames = [];
    @track yearOptions = [];
    @track fundingSources = [];
    @track expenseTypeOptions = [];
    @track expenseGroupOptions = [];
    @track stageGateOptions = [];
    @track countryOptions =[];
    // UI state
    @track selectedColumns = [];     // values selected by user from multi-select
    @track availableColumns = [];    // options for multi-select picklist
    @track showTable = false;
    @track submitPop = false;        // when true, show data table; else show multi-select and Generate button
    @track isLoading = false;
    originalLabelStr = '';
    customLabelStr = '';
    allowedBudget=0;
    actualBudget=0;

    originalLabelList = [];
    customLabelList = [];
    isReadOnly = false;
    baseReadOnly = false;
    isError = false;
    _version;
    _params;
    contextRecordId;
    contextObjectApiName;
    rrDefaultVersion;
    rrDefaultLoaded = false;

    @api
    get version() {
        return this._version;
    }
    set version(value) {
        this._version = value;
        this.updateReadOnlyState();
    }

    @api
    get params() {
        return this._params;
    }
    set params(value) {
        this._params = value || {};
        console.log('BudgetTable: params set =>', JSON.stringify(this._params));

        if (this._params.recordId) {
            this.recordId = this._params.recordId;
        }
        if (this._params.version) {
            this.version = this._params.version;
        }
        // Context comes from uNI_BudgetTab when loaded via the dynamic LWC loader.
        // This ensures RR-vs-IA behavior is enforced even without CurrentPageReference.
        if (this._params.contextRecordId) {
            this.contextRecordId = this._params.contextRecordId;
        }
        if (this._params.contextObjectApiName) {
            this.contextObjectApiName = this._params.contextObjectApiName;
        }
        // Parent can pass RR version to avoid timing issues with UI API wires.
        if (this._params.rrLogframeVersion !== undefined && this._params.rrLogframeVersion !== null) {
            this.rrDefaultVersion = String(this._params.rrLogframeVersion).trim();
            this.rrDefaultLoaded = true;
        }
        if (this._params.contextRecordId || this._params.contextObjectApiName) {
            this.updateReadOnlyState();
        }

        console.log(
            'BudgetTable: after params set, recordId =',
            this.recordId,
            'version =',
            this.version
        );

        if (this.recordId) {
            this.loadData();
        }
    }
    fieldLabels = {
            activity: 'Activity',
            subActivity: 'Sub Activity',
            output: 'Output',
            country: 'Country',
            countrySNU: 'Country SNU',
            year: 'Year',
            expenseGroup: 'Expense Group',
            fundingSrc: 'Funding Source',
            stageGate: 'Stage Gate',
            expenseType: 'Expense Type',
            // Stage Gate & Funding

            // Cost fields
            unitCost: 'Unit Cost',
            numUnits: 'No of Units',
            percentUnitaid: 'Percent UniTaid',
            totalCost: 'Total Cost',

            description: 'Description',
            assumptions: 'Assumptions',

            // ----------------------
            // Grouping 1 (Option A)
            // ----------------------
            grp1ACostVal: 'Cost (total, US$)',

            // ----------------------
            // Grouping 1 (Option B)
            // ----------------------
            grp1BCostPerUnitVal: 'Cost (per unit, US$)',
            grp1BMeasUnitVal: 'Measurement Unit',
            grp1BNoOfUnitsVal: 'Number of Units',
            grp1BMultiplierVal: 'Multiplier',
            grp1BTotalVal: 'Cost (total, US$)',

            // ----------------------
            // Grouping 2: Complementary
            // ----------------------
            grp2CostPerUnit: 'Cost (total, US$)',
            grp2PercUnitaid: 'Cost (% allocated to Unitaid)',
            grp2PercCoFunding: 'Cost (% allocated to co-funding)',
            grp2USDUnitaid: 'Cost (total Unitaid, US$)',
            grp2USDCoFunding: 'Cost (total co-funding, US$)',
            grp2totalProj: 'Cost (total project, US$)'
        // add all fields here
    };

    @wire(CurrentPageReference)
    getStateParameters(currentPageReference) {
        if (!currentPageReference) {
            return;
        }

        const state = currentPageReference.state || {};
        const attrs = currentPageReference.attributes || {};

        const contextId =
            state.recordId ||
            attrs.recordId ||
            state.c__recordId ||
            null;
        if (contextId && contextId !== this.contextRecordId) {
            this.contextRecordId = contextId;
            this.updateReadOnlyState();
        }

        const possibleRecordId = 
            this.recordId ||
            state.recordId ||
            attrs.recordId ||
            state.c__recordId;

        if (!this.recordId && possibleRecordId) {
            this.recordId = possibleRecordId;
            console.log('BudgetTable: recordId resolved from page ref =>', this.recordId);
        }

        if (!this.version && state.c__version) {
            this.version = state.c__version;
            console.log('BudgetTable: version resolved from page ref =>', this.version);
        }
    }
        
    // ✅ Define the expense group → type mapping
    EXPENSE_TYPE_MAP = {
        'Health commodities and health equipment': [
            'Medicines',
            'Reagents',
            'Consumables',
            'Other health products',
            'Diagnostics equipment',
            'Other health equipment',
            'Equipment maintenance and service'
        ],
        'Procurement and supply chain': [
            'Procurement agent and handling fees',
            'Freight and insurance',
            'Quality assurance and controls',
            'Customs duties and clearance',
            'Warehouse and storage',
            'In-country distribution',
            'Other procurement and supply chain expenses',
            'Product regulation related expenses'
        ],
        'Travel related': [
            'Transportation',
            'Per diem',
            'Meeting venues expenses',
            'Other travel-related expenses',
            'Training-related',
            'Technical assistance and capacity building',
            'Monitoring and evaluation',
            'Project supervision /consortium oversight',
            'Meetings and advocacy workshops'
        ],
        'External professional services': [
            'Consultants',
            'Commercial contracts with key service delivery partners',
            'Study related professional services',
            'Other subcontracted services',
            'Sub-awards to service delivery partners'
        ],
        'Equipment other than health': [
            'IT & telecommunication equipment',
            'Vehicle and transports',
            'Infrastructure',
            'Other equipment',
            'Equipment running costs (e.g. airtime, fuel, maintenance services)'
        ],
        'Communications materials and publications': [
            'Printed communication materials',
            'Television, radio spots, social media, website',
            'Other communication events',
            'Other communication materials and publications'
        ],
        'Project staff': [
            'Project staff - HQ',
            'Project staff - Country',
            'Project support staff - HQ',
            'Project support staff - Country'
        ],
        'Other project expenses': [
            'In-country general administrative',
            'Other project support',
            'Climate and health pilots',
            'Community and civil society engagement'
        ],
        'Grant financial audit': ['Audit fees'],
        'General administrative expense': [
            'Head office administration expenses - itemized',
            'Head office overhead recovery rate - % based'
        ]
    };

    selectedValues = [];
    iaRecord;

    @wire(getRecord, { recordId: '$recordId', fields: [IA_LOGFRAME_VERSION] })
    wiredIARecord({ data, error }) {
        if (data) {
            this.iaRecord = data;
        } else if (error) {
            console.error('BudgetTable: error loading IA logframe version', error);
            this.iaRecord = undefined;
        }
        this.updateReadOnlyState();
    }

    // ---- Determine context object type ----
    @wire(getObjectApiName, { recordId: '$contextRecordId' })
    wiredObjectType({ data, error }) {
        if (data) {
            this.contextObjectApiName = data;
            this.updateReadOnlyState();
        } else if (error) {
            console.error('BudgetTable: error resolving context object type', error);
        }
    }

    get rrRecordId() {
        return this.contextObjectApiName === 'uNI_ReprogrammingRequest__c'
            ? this.contextRecordId
            : null;
    }

    // ---- Get RR logframe version when on Reprogramming Request ----
    @wire(getRecord, { recordId: '$rrRecordId', fields: [RR_LOGFRAME_VERSION] })
    wiredRRRecord({ data, error }) {
        if (data) {
            this.rrDefaultVersion = getFieldValue(data, RR_LOGFRAME_VERSION);
            this.rrDefaultLoaded = true;
            this.updateReadOnlyState();
        } else if (error) {
            console.error('BudgetTable: error loading RR logframe version', error);
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

    updateReadOnlyState() {
        // Debug snapshot to explain why a version is editable/read-only.
        const dbg = (label, extra) => {
            // eslint-disable-next-line no-console
            console.log(
                `BudgetTable[${label}] context=${this.contextObjectApiName} ` +
                `recordId=${this.recordId} version=${this.version} ` +
                `rrVersion=${this.rrDefaultVersion} iaVersion=${this.iaLogframeVersion} ` +
                `baseReadOnly=${this.baseReadOnly} extra=${extra || ''}`
            );
        };

        if (this.contextObjectApiName === 'uNI_ReprogrammingRequest__c') {
            const ia = this._normalizeVersion(this.iaLogframeVersion);
            const rr = this._normalizeVersion(this.rrDefaultVersion);
            const selected = this._normalizeVersion(this.version);

            // In RR context, only allow edits for the RR's own version.
            // If viewing any other version (including v1), force read-only.
            if (rr && selected && selected !== rr) {
                this.isReadOnly = true;
                dbg('rrContext:nonRRVersion', 'lock non-RR version');
                return;
            }

            // If RR version equals IA version, never allow edits (drafting stays on IA only).
            if (ia && rr && ia === rr) {
                this.isReadOnly = true;
                dbg('rrContext:rrEqualsIa', 'lock when RR=IA');
                return;
            }
        }
        const versionAhead = this.isVersionAhead;
        const locked = this.baseReadOnly && !versionAhead;
        this.isReadOnly = locked ? true : false;
        dbg('final', `versionAhead=${versionAhead} locked=${locked}`);
    }

    _normalizeVersion(val) {
        if (val === undefined || val === null) return '';
        return String(val).trim();
    }

    @track rawOptions = [
    { originalLabel: 'Output', name: 'Output', type: 'root', required: true },
    { originalLabel: 'Stage Gate', name: 'Stage Gate', type: 'root', required: false },
    { originalLabel: 'Activity', name: 'Activity', type: 'root', required: false },
    { originalLabel: 'Sub-Activity', name: 'Sub-Activity', type: 'root', required: false },
    { originalLabel: 'Organization', name: 'Organization', type: 'root', required: true },
    { originalLabel: 'Country', name: 'Country', type: 'root', required: true },
    { originalLabel: 'Country SNU', name: 'Country SNU', type: 'root', required: false },
    { originalLabel: 'Year', name: 'Year', type: 'root', required: true },
    { originalLabel: 'Expense Group', name: 'Expense Group', type: 'root', required: true },
    { originalLabel: 'Expense Type', name: 'Expense Type', type: 'root', required: false },
    { originalLabel: 'Funding Source', name: 'Funding Source', type: 'root', required: false },

    // Grouping 1 (Option A)
    { originalLabel: 'Grouping 1 (Option A)', name: 'Grouping 1 (Option A)', type: 'group', required: false },
    { originalLabel: 'Cost (total, US$)', name: 'Cost (total, US$)', type: 'child', required: false },

    // Grouping 1 (Option B)
    { originalLabel: 'Grouping 1 (Option B)', name: 'Grouping 1 (Option B)', type: 'group', required: false },
    { originalLabel: 'Cost (per unit, US$)', name: 'Cost (per unit, US$)', type: 'child', required: false },
    { originalLabel: 'Measurement Unit', name: 'Measurement Unit', type: 'child', required: false },
    { originalLabel: 'Number of Units', name: 'Number of Units', type: 'child', required: false },
    { originalLabel: 'Multiplier', name: 'Multiplier', type: 'child', required: false },
    { originalLabel: 'Cost (total, US$)', name: 'Cost (total, US$)', type: 'child', required: false },

    // Grouping 2: Complementary
    { originalLabel: 'Grouping 2: Complementary', name: 'Grouping 2: Complementary', type: 'group', required: false },
    { originalLabel: 'Cost (total, US$)', name: 'Cost (total, US$)', type: 'child', required: false },
    { originalLabel: 'Cost (% allocated to Unitaid)', name: 'Cost (% allocated to Unitaid)', type: 'child', required: false },
    { originalLabel: 'Cost (% allocated to co-funding)', name: 'Cost (% allocated to co-funding)', type: 'child', required: false },
    { originalLabel: 'Cost (total Unitaid, US$)', name: 'Cost (total Unitaid, US$)', type: 'child', required: false },
    { originalLabel: 'Cost (total co-funding, US$)', name: 'Cost (total co-funding, US$)', type: 'child', required: false },
    { originalLabel: 'Cost (total project, US$)', name: 'Cost (total project, US$)', type: 'child', required: false },

    // Independent custom fields
    { originalLabel: 'Custom 1 - Text',  customLabel: 'Custom 1 - Text',  name: 'Custom 1 - Text',  type: 'root', isCustom: 'custom', index: 1,  required: false },
    { originalLabel: 'Custom 2 - Text',  customLabel: 'Custom 2 - Text',  name: 'Custom 2 - Text',  type: 'root', isCustom: 'custom', index: 2,  required: false },
    { originalLabel: 'Custom 3 - Text',  customLabel: 'Custom 3 - Text',  name: 'Custom 3 - Text',  type: 'root', isCustom: 'custom', index: 3,  required: false },
    { originalLabel: 'Custom 4 - %',     customLabel: 'Custom 4 - %',     name: 'Custom 4 - %',     type: 'root', isCustom: 'custom', index: 4,  required: false },
    { originalLabel: 'Custom 5 - %',     customLabel: 'Custom 5 - %',     name: 'Custom 5 - %',     type: 'root', isCustom: 'custom', index: 5,  required: false },
    { originalLabel: 'Custom 6 - %',     customLabel: 'Custom 6 - %',     name: 'Custom 6 - %',     type: 'root', isCustom: 'custom', index: 6,  required: false },
    { originalLabel: 'Custom 7 - US$',   customLabel: 'Custom 7 - US$',   name: 'Custom 7 - US$',   type: 'root', isCustom: 'custom', index: 7,  required: false },
    { originalLabel: 'Custom 8 - US$',   customLabel: 'Custom 8 - US$',   name: 'Custom 8 - US$',   type: 'root', isCustom: 'custom', index: 8,  required: false },
    { originalLabel: 'Custom 9 - US$',   customLabel: 'Custom 9 - US$',   name: 'Custom 9 - US$',   type: 'root', isCustom: 'custom', index: 9,  required: false },
    { originalLabel: 'Custom 10 - #',    customLabel: 'Custom 10 - #',    name: 'Custom 10 - #',    type: 'root', isCustom: 'custom', index: 10, required: false },
    { originalLabel: 'Custom 11 - #',    customLabel: 'Custom 11 - #',    name: 'Custom 11 - #',    type: 'root', isCustom: 'custom', index: 11, required: false },
    { originalLabel: 'Custom 12 - #',    customLabel: 'Custom 12 - #',    name: 'Custom 12 - #',    type: 'root', isCustom: 'custom', index: 12, required: false }

];

    
// Will be populated by groupedOptions getter
    groupToChildrenMap = {};
    childValues = new Set();

        // --- Add these tracked properties ---
    @track showRenameModal = false;
    @track customColumns = [];

    initRow(row) {
        // 1. Prepopulate expense group
        const group = row.expenseGroup || null;
        row.expenseGroup = group;
        console.log('@@expense group1'+ group);
        console.log(JSON.stringify(this.EXPENSE_TYPE_MAP[group]));
        // 2. Populate dependent expense type options based on group
        if(this.EXPENSE_TYPE_MAP[group]==undefined)
            return row;
        row.expenseTypeOptions = (this.EXPENSE_TYPE_MAP[group]).map(type => ({
                        label: type,
                        value: type
                    }));
                console.log('@@expense group2'+ JSON.stringify(row.expenseTypeOptions));

        // 3. Prepopulate expense type ONLY if it exists in valid options
        if (
            row.expenseType &&
            row.expenseTypeOptions.some(opt => opt.value === row.expenseType)
        ) {
              console.log('@@expense group3'+ JSON.stringify(row.expenseTypeOptions));
        } else {
              console.log('@@expense group4'+ JSON.stringify(row.expenseType));
            row.expenseType = null;
        }

        return row;
    }

    // --- Opens rename modal ---
    openRenameModal() {
        // Filter only Custom 1–10 entries from rawOptions
        console.log('x1');
        this.customColumns = this.rawOptions
        .filter(opt => opt.originalLabel.startsWith('Custom '))
        .map(opt => ({
            name: opt.name,
            originalLabel: opt.originalLabel,
            newLabel: opt.customLabel || opt.originalLabel
        }));
    this.showRenameModal = true;
        /*
        this.customColumns = this.rawOptions
            .filter(opt => opt.name.startsWith('Custom '))
            .map(opt => ({ name: opt.name, newLabel: opt.name }));
        console.log('thisopenRenameModal');
        this.showRenameModal = true;*/
        console.log('thisopenRenameModal'+this.showRenameModal);
        console.log('orginal names'+ JSON.stringify(this.rawOptions));
    }

    // --- Close modal ---
    closeRenameModal() {
        this.showRenameModal = false;
    }

    // --- Handle label input changes ---
    handleLabelChange(event) {
        const oldName = event.target.dataset.name;
        const newLabel = event.target.value;
        this.customColumns = this.customColumns.map(col =>
            col.name === oldName ? { ...col, newLabel } : col
        );
    }

    // --- Save renamed labels back into rawOptions ---
    saveRenamedLabels() {
        this.customColumns.forEach(col => {
        const item = this.rawOptions.find(opt => opt.originalLabel === col.originalLabel);
        if (item) {
            item.customLabel = col.newLabel; // ✅ store separately
        }
    });

    this.showRenameModal = false;
    this.dispatchEvent(
        new ShowToastEvent({
            title: 'Success',
            message: 'Custom column labels updated successfully.',
            variant: 'success'
        })
    );
    }

    /**
     * Build options so that each group header is followed by its child options.
     * Child option values are unique by prefixing with the parent group's value.
     */
    get groupedOptions() {
        /*const result = [];
        let currentGroup = null;
        this.groupToChildrenMap = {};
        this.childValues = new Set();

        this.rawOptions.forEach(item => {
            // treat strings that start with 'Grouping' as group headers
           if (item.type === 'group') {
                currentGroup = item.name;
                this.groupToChildrenMap[currentGroup] = [];
                result.push({
                    label: `🌟 ${item.name}`,
                    value: item.name,
                    // keep a class for potential styling
                    class: 'root-option'
                });
             } else if (item.type === 'child' && currentGroup) {
                // child of currentGroup
                const childVal = `${currentGroup}__${item.name}`;
                this.groupToChildrenMap[currentGroup].push(childVal);
                this.childValues.add(childVal);
                result.push({
                    label: `\u2003\u2022 ${item.name}`, // some indentation + bullet
                    value: childVal,
                    disabled: true,
                    class: 'child-option'
                });
            } else {
                // standalone root-level item (not inside any group)
                result.push({ label: item.name, value: item.name, class: 'root-option' });
            }
        });

        return result;
        */

         const result = [];
        let currentGroup = null;
        this.groupToChildrenMap = {};
        this.childValues = new Set();

        this.rawOptions.forEach(item => {
            const displayLabel = item.customLabel || item.originalLabel;

            if (item.type === 'group') {
                currentGroup = displayLabel;
                this.groupToChildrenMap[currentGroup] = [];
                result.push({
                    label: `🌟 ${displayLabel}`,
                    value: displayLabel,
                    class: 'root-option'
                });
            } else if (item.type === 'child' && currentGroup) {
                const childVal = `${currentGroup}__${displayLabel}`;
                this.groupToChildrenMap[currentGroup].push(childVal);
                this.childValues.add(childVal);
                result.push({
                    label: `\u2003\u2022 ${displayLabel}`,
                    value: childVal,
                    disabled: true,
                    class: 'child-option'
                });
            } else {
                result.push({
                    label: displayLabel,
                    value: displayLabel,
                    class: 'root-option'
                });
            }
        });
        return result;
    }

    /**
     * When user changes selection, enforce rules:
     *  - child items cannot be directly selected (remove them if present)
     *  - selecting a group auto-selects its children
     *  - deselecting a group removes its children
     *  - preserve visual order by building selectedValues from groupedOptions order
     */
    handleChange(event) {
    // Build the grouped options (also ensures maps/sets are populated)
    const options = this.groupedOptions;

    // Use a set for efficient add/delete operations from the incoming selection
    const incoming = new Set(event.detail.value || []);

    // 1) Remove any direct child selections (child items are not allowed)
    this.childValues.forEach(child => {
        if (incoming.has(child)) {
            incoming.delete(child);
        }
    });

    // 2) Enforce mutual exclusion between Grouping 1 (Option A) and (Option B)
    const groupA = 'Grouping 1 (Option A)';
    const groupB = 'Grouping 1 (Option B)';

    if (incoming.has(groupA) && incoming.has(groupB)) {
        // if both are selected, keep the newly selected one
        const lastSelected = event.detail.value[event.detail.value.length - 1];
        if (lastSelected === groupA) {
            incoming.delete(groupB);
        } else {
            incoming.delete(groupA);
        }
    }

    // 3) For each group, if selected then add its children; if not selected remove them
    Object.keys(this.groupToChildrenMap).forEach(group => {
        const children = this.groupToChildrenMap[group] || [];
        if (incoming.has(group)) {
            children.forEach(c => incoming.add(c));
        } else {
            children.forEach(c => incoming.delete(c));
        }
    });

    // 4) Build selectedValues following the exact order of groupedOptions.
    // This guarantees selected panel shows parent immediately followed by its children.
    const orderedSelected = [];
    for (const opt of options) {
        if (incoming.has(opt.value)) {
            orderedSelected.push(opt.value);
        }
    }
    console.log('@@order'+ JSON.stringify(orderedSelected));
    this.selectedColumns = orderedSelected;
    console.log('@@order rawoptions'+ JSON.stringify(this.rawOptions));
    this.originalLabelList=[];
    this.customLabelList=[];
    this.rawOptions
    .filter(opt => opt.isCustom === 'custom')
    .sort((a, b) => a.index - b.index)
    .forEach(opt => {
        this.originalLabelList.push(opt.originalLabel);
        this.customLabelList.push(opt.customLabel);
        });

    // Join with |||
    this.originalLabelStr = this.originalLabelList.join('|||');
    this.customLabelStr   = this.customLabelList.join('|||');

    console.log('Original Labels String:', this.originalLabelStr);
    console.log('Custom Labels String:', this.customLabelStr);
}

    /**
     * Add styling inside shadow DOM to grey out / visually disable child items.
     * We append the style only once.
     */
    renderedCallback() {

        const upBtn = this.template.querySelector('button[title="Move selection up"]');
        const downBtn = this.template.querySelector('button[title="Move selection down"]');
        
        if (upBtn) upBtn.style.display = 'none';
        if (downBtn) downBtn.style.display = 'none';
        
        if (this._styleInjected) {
            return;
        }
        this._styleInjected = true;

        // append style to the component's template root (shadow DOM)
        const css = document.createElement('style');
        css.textContent = `
            /* Target option titles that begin with our indent bullet (\u2003\u2022) */
            .slds-dueling-list__options [title^="\u2003\u2022"] {
                color: #6b6b6b !important;
                opacity: 0.7;
                pointer-events: none;
            }
            /* Make the text slightly muted */
            .slds-dueling-list__options [title^="\u2003\u2022"] span {
                opacity: 0.7;
            }
        `;
        this.template.appendChild(css);
    }
    connectedCallback() {
        if (this.recordId) {
            this.loadData();
        }
        // prepare available columns list (matches the text labels stored in Budget_Data__c)
        this.availableColumns = [
            { label: 'Organization name', value: 'Organization name' },
            { label: 'Country', value: 'Country' },
            { label: 'Years', value: 'Years' },
            { label: 'Expense group', value: 'Expense group' },
            { label: 'Expense type', value: 'Expense type' },

            { label: 'Unit cost', value: 'Unit cost' },
            { label: 'Number of units', value: 'Number of units' },
            { label: '% Allocated to Unitaid', value: '% Allocated to Unitaid' },
            { label: 'Total costs in US$', value: 'Total costs in US$' },
            { label: 'Description', value: 'Description' },
            { label: 'Assumptions', value: 'Assumptions' }
        ];
    }

    async loadData() {
        console.log('@@load data, showTable =', this.showTable, 'IA =', this.recordId, 'version =', this.version);
        if (!this.recordId) {
            console.log('BudgetTable: loadData called without recordId, skipping.');
            return;
        }
        this.isLoading = true;
        try {
            const result = await getBudgetData({
                parentId: this.recordId,
                version: this.version
            });
            console.log(
                'BudgetTable: loadData result -> recordId',
                this.recordId,
                'version',
                this.version,
                'orgNames',
                result?.orgNames ? result.orgNames.length : 0,
                'selectedColumns',
                result?.selectedColumns ? result.selectedColumns.length : 0,
                'status',
                result?.status
            );
            this.fundingSources = result.fundingSources || [];
            this.expenseGroupOptions = result.expenseGroupOptions || [];
            this.expenseTypeOptions = result.expenseTypeOptions || [];
            console.log('@@this result status'+result.status);
            this.baseReadOnly = result.status === 'Submitted';
            this.updateReadOnlyState();

            // result contains: data, outputOptions, expenseTypeOptions, yearOptions, selectedColumns, showTable
            const data = (result.data || []);
            
            this.rows = data.map(r => {
            console.log('@@row'+r.expenseType);
            const row = {
                id: r.id,
                output: r.output,
                activity: r.activity,
                subActivity: r.subActivity,
                orgName: r.orgName,
                country: r.country,
                countrySNU: r.countrySNU,
                year: r.year,
                expenseGroup: r.expenseGroup,
                fundingSrc: r.fundingSrc,
                stageGate: r.stageGate,
                expenseType: r.expenseType,
                // Stage Gate & Funding

                // Cost fields
                unitCost: r.unitCost,
                numUnits: r.numUnits,
                percentUnitaid: r.percentUnitaid,
                totalCost: r.totalCost,

                description: r.description,
                assumptions: r.assumptions,

                // ----------------------
                // Grouping 1 (Option A)
                // ----------------------
                grp1ACostVal: r.grp1ACost,

                // ----------------------
                // Grouping 1 (Option B)
                // ----------------------
                grp1BCostPerUnitVal: r.grp1BCostPerUnitVal,
                grp1BMeasUnitVal: r.grp1BMeasUnitVal,
                grp1BNoOfUnitsVal: r.grp1BNoOfUnitsVal,
                grp1BMultiplierVal: r.grp1BMultiplierVal,
                grp1BTotalVal: r.grp2CostPerUnit,

                // ----------------------
                // Grouping 2: Complementary
                // ----------------------
                grp2CostPerUnit: r.grp2CostPerUnit,
                grp2PercUnitaid: r.grp2PercUnitaid,
                grp2PercCoFunding: r.grp2PercCoFunding,
                grp2USDUnitaid: r.grp2USDUnitaid,
                grp2USDCoFunding: r.grp2USDCoFunding,
                grp2totalProj: r.grp2totalProj,
                custom1Val  : r.custom1Val,
                custom2Val  : r.custom2Val,
                custom3Val  : r.custom3Val,
                custom4Val  : r.custom4Val,
                custom5Val  : r.custom5Val,
                custom6Val  : r.custom6Val,
                custom7Val  : r.custom7Val,
                custom8Val  : r.custom8Val,
                custom9Val  : r.custom9Val,
                custom10Val : r.custom10Val,
                custom11Val : r.custom11Val,
                custom12Val : r.custom12Val

            };
            row.totalCost = this.calculateTotalCost(row);
            console.log('befor add');
            return this.initRow(row);
        });
        console.log(JSON.stringify(result));
            this.orgNames = result.orgNames || [];
            this.outputOptions = result.outputOptions || [];
            this.yearOptions = (result.yearOptions || []).map(y => ({ label: y, value: y }));
            this.expenseTypeOptions = result.expenseTypeOptions || [];
            this.expenseGroupOptions = result.expenseGroupOptions || [];
            this.stageGateOptions = result.stageGateOptions || [];
            
            this.countryOptions = result.countryOptions || [];
            console.log('sel Columns X '+this.selectedColumns);
            // selectedColumns comes from parent Budget_Data__c (split in apex)
            this.selectedColumns = result.selectedColumns || [];
            console.log('sel Columns y'+this.selectedColumns);
            this.showTable = this.showTable==true? true:  (result.showTable || (this.selectedColumns && this.selectedColumns.length > 0));
            console.log('@@showtable1'+this.showTable);
            // Update visibility flags for each optional column (used by template)
            this.updateColumnFlags();
            console.log('@@exp group'+this.showExpenseGroup+'@'+this.showExpenseType);
            this.expenseGroupOptions = Object.keys(this.EXPENSE_TYPE_MAP).map(key => ({
                label: key,
                value: key
            }));
             // --- Custom columns ---
        for (let i = 1; i <= 12; i++) {
            this[`custom${i}`] = false;
            this[`custom${i}Label`] = `Custom ${i}`; // default fallback
        }
        this.allowedBudget=result.allowedBudget!=null? result.allowedBudget:0;
        this.custom1  = result.custom1;
        this.custom2  = result.custom2;
        this.custom3  = result.custom3;
        this.custom4  = result.custom4;
        this.custom5  = result.custom5;
        this.custom6  = result.custom6;
        this.custom7  = result.custom7;
        this.custom8  = result.custom8;
        this.custom9  = result.custom9;
        this.custom10 = result.custom10;
        this.custom11 = result.custom11;
        this.custom12 = result.custom12;
        this.custom1Label  = result.custom1Label;
        this.custom2Label  = result.custom2Label;
        this.custom3Label  = result.custom3Label;
        this.custom4Label  = result.custom4Label;
        this.custom5Label  = result.custom5Label;
        this.custom6Label  = result.custom6Label;
        this.custom7Label  = result.custom7Label;
        this.custom8Label  = result.custom8Label;
        this.custom9Label  = result.custom9Label;
        this.custom10Label = result.custom10Label;
        this.custom11Label = result.custom11Label;
        this.custom12Label = result.custom12Label;

        

        } catch (error) {
            console.error(error);
        } finally {
            this.isLoading = false;
        }
    }
    
    // Update boolean flags used in template to show/hide optional td cells
    updateColumnFlags() {
        const selected = this.selectedColumns || [];

        // --- Standard columns ---
        this.showOrgName = selected.includes('Organization') || selected.includes('Organization name');
        this.showAct = selected.includes('Activity');
        this.showSubAct = selected.includes('Sub-Activity');
        this.showCountry = selected.includes('Country');
        this.showCountrySNU = selected.includes('Country SNU');
        this.showYears = selected.includes('Year') || selected.includes('Years');
        this.showExpenseGroup = selected.includes('Expense Group');
        this.showExpenseType = selected.includes('Expense Type');
        this.showUnitCost = selected.includes('Unit cost');
        this.showNumUnits = selected.includes('Number of units');
        this.showPercentUnitaid = selected.includes('% Allocated to Unitaid');
        this.showTotalCosts = selected.includes('Total costs in US$');
        this.showDescription = selected.includes('Description');
        this.showAssumptions = selected.includes('Assumptions');
        this.stageGate = selected.includes('Stage Gate');
        this.fundingSource = selected.includes('Funding Source');

        this.grp1ACost = selected.includes('Grouping 1 (Option A)__Cost (total, US$)');
        this.grp1BCostPerUnit = selected.includes('Grouping 1 (Option B)__Cost (per unit, US$)');
        this.grp1BMeasUnit = selected.includes('Grouping 1 (Option B)__Measurement Unit');
        this.grp1BNoOfUnits = selected.includes('Grouping 1 (Option B)__Number of Units');
        this.grp1BMultiplier = selected.includes('Grouping 1 (Option B)__Multiplier');
        this.grp1BTotal = selected.includes('Grouping 1 (Option B)__Cost (total, US$)');

        this.grp2CostPerUnit = selected.includes('Grouping 2: Complementary__Cost (total, US$)');
        this.grp2PercUnitaid = selected.includes('Grouping 2: Complementary__Cost (% allocated to Unitaid)');
        this.grp2PercCoFunding = selected.includes('Grouping 2: Complementary__Cost (% allocated to co-funding)');
        this.grp2USDUnitaid = selected.includes('Grouping 2: Complementary__Cost (total Unitaid, US$)');
        this.grp2USDCoFunding = selected.includes('Grouping 2: Complementary__Cost (total co-funding, US$)');
        this.grp2totalProj = selected.includes('Grouping 2: Complementary__Cost (total project, US$)');

       


        /*
        this.rawOptions
            .filter(opt => opt.originalLabel && opt.originalLabel.startsWith('Custom '))
            .forEach(opt => {
                const match = opt.originalLabel.match(/^Custom\s*(\d+)\b/);
                if (match) {
                    const idx = parseInt(match[1], 10);
                    if (idx >= 1 && idx <= 12) {
                        const displayLabel = opt.customLabel || opt.originalLabel;
                        // Visibility flag
                        const isSelected = selected.includes(displayLabel);
                        this[`custom${idx}`] = !!isSelected;
                        console.log('@@displ'+ displayLabel+'@'+ JSON.stringify(selected)+'@'+isSelected+'@'+ this.custom1);

                        // Label text for table header
                        this[`custom${idx}Label`] = displayLabel;
                    }
                }
            });
        */
        // Ensure at least one row exists
        if (!this.rows || this.rows.length === 0) {
            this.addRow();
        }
    }
   
    // --- Add this helper method ---
    calculateTotalCost(row) {
        const unitCost = parseFloat(row.unitCost) || 0;
        const numUnits = parseFloat(row.numUnits) || 0;
        const percentUnitaid = parseFloat(row.percentUnitaid) || 0;
        const total = (unitCost * numUnits) * (percentUnitaid / 100);
        return total ? parseFloat(total.toFixed(2)) : 0;
    }

    // user changes the multi-select
    handleColumnsChange(event) {
        this.selectedColumns = event.detail.value;
        //this.selectedValues = event.detail.value;
    }

    // Generate table button clicked — save selected columns and switch to table
    async handleGenerateTable() {
        if (!this.selectedColumns || this.selectedColumns.length === 0) {
            this.dispatchEvent(new ShowToastEvent({
                title: 'Validation',
                message: 'Please select at least one column to generate the table.',
                variant: 'warning'
            }));
            return;
        }
        try {
            console.log('original and custom ablel'+ this.customLabelStr+'@'+this.originalLabelStr);
            // Persist selected columns to uNI_BudgetDataColumns__c (multi-select stored as ';' delimited string).
            await saveSelectedColumns({ parentId: this.recordId, selectedColumns: this.selectedColumns,customOriginalLabels: this.originalLabelStr, customUpdatedLabels: this.customLabelStr });
            console.log('ehjbjh'+this.selectedColumns);
            this.showTable = true;
            this.updateColumnFlags();
            // load budget rows now (if any)
            await this.loadData();
            this.dispatchEvent(new ShowToastEvent({
                title: 'Generated',
                message: 'Table generated successfully.',
                variant: 'success'
            }));
        } catch (err) {
            console.error('Error generating table', err);
            this.dispatchEvent(new ShowToastEvent({
                title: 'Error',
                message: err.body?.message || err.message || 'Could not generate table',
                variant: 'error'
            }));
        }
    }

    handleInputChange(event) {
        const rowId = event.target.dataset.id;
        const field = event.target.name || event.target.dataset.field;
        const value = event.detail && event.detail.value !== undefined ? event.detail.value : event.target.value;
        console.log('@@rowId'+rowId+'@'+field+'@'+field+'@'+value);
        this.rows = this.rows.map(row => {
            if (row.id === rowId) {
                const updatedRow = { ...row, [field]: value };
                 //  Dependent picklist logic:
                if (field === 'expenseGroup') {
                    // reset expense type when group changes
                    updatedRow.expenseType = '';
                    console.log('@value'+value);
                    console.log(JSON.stringify(this.EXPENSE_TYPE_MAP));
                    // update available expense types for this row
                    updatedRow.expenseTypeOptions = (this.EXPENSE_TYPE_MAP[value]).map(type => ({
                        label: type,
                        value: type
                    }));
                }
               
               
            console.log(JSON.stringify(updatedRow));
                 // --- Convert all dependent numeric fields safely ---
            const grp1BCostPerUnitVal = parseFloat(updatedRow.grp1BCostPerUnitVal) || 0;
            const grp1BNoOfUnitsVal   = parseFloat(updatedRow.grp1BNoOfUnitsVal) || 0;
            const grp1BMultiplierVal  = parseFloat(updatedRow.grp1BMultiplierVal) || 0;
            const grp1ACostVal        = parseFloat(updatedRow.grp1ACostVal) || 0;
            const grp1BTotalVal       = parseFloat(updatedRow.grp1BTotalVal) || 0;
            const grp2PercUnitaidVal  = parseFloat(updatedRow.grp2PercUnitaid) || 0;
            const grp2PercCoFundingVal= parseFloat(updatedRow.grp2PercCoFunding) || 0;
            const grp2CostPerUnitVal  = parseFloat(updatedRow.grp2CostPerUnit) || 0;


            if (field.startsWith('custom')) {
                updatedRow[`${field}Val`] = value;
            }
            console.log('@@@field'+field);
            // --- Rule 1: grp1BTotal = grp1BCostPerUnit * grp1BNoOfUnits * grp1BMultiplier ---
            // Also update grp2CostPerUnit with same value
            if (['grp1BCostPerUnitVal', 'grp1BNoOfUnitsVal', 'grp1BMultiplierVal'].includes(field)) {
                const calcTotal = grp1BCostPerUnitVal * grp1BNoOfUnitsVal * grp1BMultiplierVal;
                updatedRow.grp1BTotalVal = calcTotal ? calcTotal.toFixed(2) : 0;
                updatedRow.grp2CostPerUnit = updatedRow.grp1BTotalVal;
                console.log('@@@field2'+field+'@'+grp1BTotalVal+'@@'+updatedRow.grp1BTotalVal+'@'+updatedRow.grp2CostPerUnit);

            }
            console.log('@@@field'+field);
            // --- Rule 2: grp2CostPerUnit = grp1ACostVal OR grp1BTotal ---
            if (['grp1ACostVal'].includes(field)) {
                if (grp1ACostVal > 0) {
                    updatedRow.grp2CostPerUnit = grp1ACostVal.toFixed(2);
                }
            }

            // --- Rule 3: grp2PercUnitaid + grp2PercCoFunding = 100 ---
            if (['grp2PercUnitaid', 'grp2PercCoFunding'].includes(field)) {
                let unitaid = grp2PercUnitaidVal;
                let cofund  = grp2PercCoFundingVal;

                if (field === 'grp2PercUnitaid') {
                    unitaid = Math.min(100, Math.max(0, unitaid));
                    cofund = 100 - unitaid;
                } else if (field === 'grp2PercCoFunding') {
                    cofund = Math.min(100, Math.max(0, cofund));
                    unitaid = 100 - cofund;
                }

                updatedRow.grp2PercUnitaid = unitaid;
                updatedRow.grp2PercCoFunding = cofund;
            }

            // --- Rule 4: grp2USDUnitaid = (grp2PercUnitaid / 100) * grp2CostPerUnit ---
            const percUnitaid = parseFloat(updatedRow.grp2PercUnitaid) || 0;
            const costPerUnit = parseFloat(updatedRow.grp2CostPerUnit) || 0;
            updatedRow.grp2USDUnitaid = ((percUnitaid / 100) * costPerUnit).toFixed(2);

            // --- Rule 5: grp2USDCoFunding = (grp2PercCoFunding / 100) * grp2CostPerUnit ---
            const percCoFunding = parseFloat(updatedRow.grp2PercCoFunding) || 0;
            updatedRow.grp2USDCoFunding = ((percCoFunding / 100) * costPerUnit).toFixed(2);

            // --- Rule 6: grp2totalProj = grp1BTotal + grp1ACostVal + grp2USDUnitaid ---
            const totalProj =
                //(parseFloat(updatedRow.grp1BTotal) || 0) +
                //(parseFloat(updatedRow.grp1ACost) || 0) +
                (parseFloat(updatedRow.grp2USDUnitaid) || parseFloat(updatedRow.grp1ACostVal) || parseFloat(updatedRow.grp1BTotalVal) || 0);
            updatedRow.grp2totalProj = totalProj.toFixed(2);

                // Auto-calculate totalCost whenever dependent fields change
                if (['unitCost', 'numUnits', 'percentUnitaid'].includes(field)) {
                    updatedRow.totalCost = this.calculateTotalCost(updatedRow);
                }
                console.log('@@update row'+JSON.stringify(updatedRow));
                return updatedRow;
            }
            console.log('@@totalcostxx'+ row.grp2totalProj);
            return row;
        });

        // Validation for total cost

        const totalCostSum = this.rows.reduce(
            (sum, r) => sum + (parseFloat(r.grp2totalProj) || 0),
            0
        );
        console.log('@@total cost'+totalCostSum);
        this.actualBudget=totalCostSum;
        let maxBudget = this.allowedBudget;
        if (totalCostSum > this.allowedBudget) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error',
                    message: `Total cost cannot exceed ${maxBudget} USD`,
                    variant: 'error'
                })
            );
        }
    }


    addRow() {
        const newRow = {
            id: 'temp_' + Date.now(),
            output: '',
            activity: '',
            subActivity: '',
            orgName: '',
            stageGate: '',
            country: '',
            countrySNU: '',
            year: '',
            expenseGroup: '',
            expenseType: '',
            unitCost: null,
            numUnits: null,
            percentUnitaid: null,
            totalCost: null,
            description: '',
            assumptions: ''
        };
        this.rows = [...this.rows, newRow];
    }
    handleSubmitPop(){
            this.submitPop=true;
        }
    handleSubmit(){
        this.submitPop=false;
        this.validateData('Submitted');
    }
    closeModal() {
            this.submitPop=false;
        }
    handleSave() {
        this.validateData('Draft');
        //this.apexSave('Draft');
    }

    validateData(status){
        console.log('in validate data');
        var requiredColumns = {
            output: { flag: true }, // always shown
            activity: { flag: this.showAct },
            subActivity: { flag: this.showSubAct },
            stageGate: { flag: this.stageGate },
            expenseGroup: { flag: true },
            expenseType: { flag: this.showExpenseType },
            orgName: { flag: true },
            country: { flag: true },
            countrySNU: { flag: this.showCountrySNU },
            year: { flag: true },
            fundingSrc: { flag: this.fundingSource },

            // Group 1 fields
            grp1ACostVal: { flag: this.grp1ACost },
            grp1BCostPerUnitVal: { flag: this.grp1BCostPerUnit },
            grp1BMeasUnitVal: { flag: this.grp1BMeasUnit },
            grp1BNoOfUnitsVal: { flag: this.grp1BNoOfUnits },
            grp1BMultiplierVal: { flag: this.grp1BMultiplier },
            grp1BTotalVal: { flag: this.grp1BTotal },

            // Group 2 fields
            grp2CostPerUnit: { flag: this.grp2CostPerUnit },
            grp2PercUnitaid: { flag: this.grp2PercUnitaid },
            grp2PercCoFunding: { flag: this.grp2PercCoFunding },
            grp2USDUnitaid: { flag: this.grp2USDUnitaid },
            grp2USDCoFunding: { flag: this.grp2USDCoFunding },
            grp2totalProj: { flag: true }, // always visible

            // Custom columns
            custom1Val: { flag: this.custom1 },
            custom2Val: { flag: this.custom2 },
            custom3Val: { flag: this.custom3 },
            custom4Val: { flag: this.custom4 },
            custom5Val: { flag: this.custom5 },
            custom6Val: { flag: this.custom6 },
            custom7Val: { flag: this.custom7 },
            custom8Val: { flag: this.custom8 },
            custom9Val: { flag: this.custom9 },
            custom10Val: { flag: this.custom10 },
            custom11Val: { flag: this.custom11 },
            custom12Val: { flag: this.custom12 }
        };
        console.log('in validatee before errors');
        this.validateRows(requiredColumns,status);
        console.log('in validate after errors'+ this.isError);
        if (this.isError) {
            //this.showToast('Validation Error', errors.join('\n'), 'error');
            return;
        }else{
            this.apexSave(status);
        }
    }

    validateRows(requiredColumns,status) {
        console.log('in validate');
        let errors = [];
        this.isError = false;
        this.rows.forEach((row,index) => {
            if(!this.isError){
                let rowNumber = index + 1;
                for (let field in requiredColumns) {
                    if(!this.isError){
                        const isVisible = requiredColumns[field].flag;
                        const labelVal = this.fieldLabels[field] || field;
                        console.log('@@issvisible'+ isVisible+'@'+labelVal+'@'+row[field]);
                        if(isVisible && (labelVal=='Cost (% allocated to Unitaid)'))
                        {
                            console.log('@@in visible');
                        }
                        if(isVisible && (labelVal=='Cost (% allocated to Unitaid)' || labelVal=='Cost (% allocated to co-funding)') && row[field] != null && row[field] != undefined && row[field] != '' && (row[field]<0 || row[field]>100)) 
                        {
                            this.isError=true;
                            this.showToast('Validation Error', `Row ${rowNumber}: Invalid value for ${labelVal}`, 'error');
                        }  
                        if(status=='Submitted'){
                            if(!field.startsWith('custom')){
                            if (isVisible && (row[field] === null || row[field] === undefined || row[field] === '')) {
                                //errors.push(`Row ${rowNumber}: Missing value for ${field}`);
                                this.isError=true;
                                this.showToast('Validation Error', `Row ${rowNumber}: Missing value for ${labelVal}`, 'error');
                            }}
                        }
                    }
                    else
                    {
                        return;
                    }
                    console.log('field check complete');
                }
            }else
                    {
                        return;
                    }
             console.log('row check complete');       
        });
        // Validation for total cost

        const totalCostSum = this.rows.reduce(
            (sum, r) => sum + (parseFloat(r.grp2totalProj) || 0),
            0
        );
        console.log('@@total cost'+totalCostSum);
        this.actualBudget=totalCostSum;
        let maxBudget = this.allowedBudget;
        if (totalCostSum > maxBudget) {
            this.isError=true;
            this.showToast('Validation Error', `Total cost cannot exceed ${maxBudget} USD`, 'error');
            return ;
        }
        console.log('all rows complete');
       return ;
    }

    showToast(title, message, variant) {
        this.dispatchEvent(
            new ShowToastEvent({
                title,
                message,
                variant
            })
        );
    }

    async apexSave(status) {
        try {
            console.log('@@status', status);
            await saveBudgetData({
                parentId: this.recordId,
                budgetDataJSON: JSON.stringify(this.rows),
                status: status,
                actualBudget: parseFloat(this.actualBudget),
                version: this.version
            });
            const msg = status === 'Submitted' ? 'submitted' : 'saved';
            this.baseReadOnly = status === 'Submitted';
            this.updateReadOnlyState();

            this.dispatchEvent(new ShowToastEvent({
                title: 'Success',
                message: 'Budget data ' + msg + ' successfully!',
                variant: 'success'
            }));
            await this.loadData(); // reload to pick up IDs and persisted data
        } catch (err) {
            console.error('Save error', err);
            this.dispatchEvent(new ShowToastEvent({
                title: 'Error saving data',
                message: err.body?.message || err.message,
                variant: 'error'
            }));
        }
    }
}