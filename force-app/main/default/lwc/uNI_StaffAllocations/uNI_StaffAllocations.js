import { LightningElement, api, track, wire } from 'lwc';
import getIndividualApplication from '@salesforce/apex/UNI_StaffAllocationsCtrl.getIndividualApplication';
import getOutputPicklist from '@salesforce/apex/UNI_StaffAllocationsCtrl.getOutputPicklist';
import getStaffAllocations from '@salesforce/apex/UNI_StaffAllocationsCtrl.getStaffAllocations';
import upsertStaffAllocations from '@salesforce/apex/UNI_StaffAllocationsCtrl.upsertStaffAllocations';
import submitStaffAllocations from '@salesforce/apex/UNI_StaffAllocationsCtrl.submitStaffAllocations';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { CurrentPageReference } from 'lightning/navigation';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';
import IA_LOGFRAME_VERSION from '@salesforce/schema/IndividualApplication.uNI_LogframeVersion__c';

export default class UNIDynamicYearTable extends LightningElement {
    @track baseColumns1 = ['Output', 'Expense Type'];
    @track baseColumns2 = ['Position Title', 'Country', 'Employing Organization'];
    @track summaryColumns = ['LOE', 'Total Salary', 'Cost per LOE', '% of Allowances & Fringe'];

    @track expenseTypeOptions = [
        { label: 'Project staff - HQ', value: 'Project staff - HQ' },
        { label: 'Project support staff - HQ', value: 'Project support staff - HQ' },
        { label: 'Project Staff - Country', value: 'Project Staff - Country' },
        { label: 'Project support staff - Country', value: 'Project support staff - Country' },
        { label: 'Project staff support-country', value: 'Project staff support-country' },
        { label: 'Project Staff-country', value: 'Project Staff-country' }
    ];

    @track yearGroups = [];
    @track tableData = [];
    @track outputOptions = [];
    @track columnsReady = false;
    @track isSubmitted = false;

    @api recordId;
    @api version;   // 🔹 version passed from parent (logframe/budget version)

    // params is what comes from <lwc:component params={lwcParams}>
    _params;
    @api
    get params() {
        return this._params;
    }
    set params(value) {
        this._params = value || {};
        console.log('StaffAlloc: params set =>', JSON.stringify(this._params));

        if (this._params.recordId) {
            this.recordId = this._params.recordId;
        }
        if (this._params.version) {
            this.version = this._params.version;
        }

        console.log(
            'StaffAlloc: after params set, recordId =',
            this.recordId,
            'version =',
            this.version
        );

        // 🔹 Re-initialize whenever recordId/version arrive or change
        if (this.recordId) {
            this.initialize();
        }
    }

    connectedCallback() {
        // In case this component is used directly on a record page
        if (this.recordId) {
            this.initialize();
        }
    }

    iaRecord;
    @wire(getRecord, { recordId: '$recordId', fields: [IA_LOGFRAME_VERSION] })
    wiredIARecord({ error, data }) {
        if (data) {
            this.iaRecord = data;
        } else if (error) {
            console.error('StaffAlloc: error loading IA logframe version', error);
            this.iaRecord = undefined;
        }
    }

    @wire(CurrentPageReference)
    getStateParameters(currentPageReference) {
        if (!currentPageReference) {
            return;
        }

        const state = currentPageReference.state || {};
        const attrs = currentPageReference.attributes || {};

        const possibleRecordId =
            this.recordId ||
            state.recordId ||
            attrs.recordId ||
            state.c__recordId;

        if (!this.recordId && possibleRecordId) {
            this.recordId = possibleRecordId;
            console.log('StaffAlloc: recordId resolved from page ref =>', this.recordId);
            this.initialize();
        }

        if (!this.version && state.c__version) {
            this.version = state.c__version;
            console.log('StaffAlloc: version resolved from page ref =>', this.version);
        }
    }

    // ---------- Initialization ----------

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

    get isReadOnly() {
        return this.isSubmitted && !this.isVersionAhead;
    }

    get showActionButtons() {
        return !this.isReadOnly;
    }

    async initialize() {
        try {
            if (!this.recordId) {
                console.log('StaffAlloc: initialize called without recordId');
                return;
            }

            console.log('StaffAlloc initialize: IA =', this.recordId, 'version =', this.version);

            const appData = await getIndividualApplication({ recordId: this.recordId });
            const {
                uNI_GADStartDate__c,uNI_ImplementationStartDate__c,
                uNI_Project_Year__c,uNI_ImplementationEndDate__c,
                uNI_Staff_Allocation_Status__c
            } = appData;

            this.isSubmitted = (uNI_Staff_Allocation_Status__c === 'Submitted');

            const startYear = uNI_ImplementationStartDate__c
                ? new Date(uNI_ImplementationStartDate__c).getFullYear()
                : new Date().getFullYear();
                console.log('StaffAlloc sYears =', uNI_ImplementationStartDate__c , startYear);
               const endYear = uNI_ImplementationEndDate__c
                ? new Date(uNI_ImplementationEndDate__c).getFullYear()
                : new Date().getFullYear();
                console.log('StaffAlloc eYears =', uNI_ImplementationEndDate__c, endYear);
            const totalYears = endYear-startYear; 
           // const totalYears = uNI_Project_Year__c ? parseInt(uNI_Project_Year__c, 10) : 0;
        console.log('StaffAlloc tYears =', totalYears);

            const years = [];
            for (let i = 0; i <= totalYears; i++) {
                const year = startYear + i;
                years.push({ id: 'year_' + year, year: year, label: `Year${i + 1}_${year}` });
            }
            this.yearGroups = years;

            const outputs = await getOutputPicklist({
                recordId: this.recordId,
                version: this.version
            });
            this.outputOptions = outputs.map(o => ({ label: o.label, value: o.value }));

            const existingRows = await getStaffAllocations({
                individualAppId: this.recordId,
                version: this.version           // 🔹 filter by version
            });

            this.tableData = existingRows.length > 0
                ? existingRows.map(r => this.mapRowFromBackend(r))
                : [this.createEmptyRow()];

            this.columnsReady = true;
        } catch (err) {
            console.error('StaffAlloc: Initialization error:', err);
        }
    }

    mapRowFromBackend(rec) {
        // Build year-wise cells from the SObject fields
        const yearGroups = this.yearGroups.map((y, idx) => ({
            id: y.id,
            LOE: rec['LOE' + (idx + 1) + '__c'] || 0,
            Month: rec['month' + (idx + 1) + '__c'] || 0,
            Salary: rec['Fully_loaded_salary' + (idx + 1) + '__c'] || 0,
            YearLabel: rec['Year' + (idx + 1) + '__c'] || 0
        }));

        return {
            id: rec.Id,
            output: rec.uNI_Outputs__c,
            expenseType: rec.Expense_Type__c,
            positionTitle: rec.Position_title__c,
            country: rec.Country__c,
            employingOrg: rec.Employing_organization__c,
            allocatedPer: rec.of_Allowances_Fringe__c,
            LOESumm: rec.LOE__c || 0,
            salSumm: rec.Total_Salary__c || 0,
            costPerLOE: rec.Cost_per_LOE__c || 0,
            yearGroups
        };
    }


    addRow() {
        this.tableData = [...this.tableData, this.createEmptyRow()];
    }

    createEmptyRow() {
        const yearGroups = this.yearGroups.map(y => ({
            id: y.id,
            LOE: 0,
            Month: 0,
            Salary: 0,
            YearLabel: 0
        }));
        return {
            id: 'temp_' + Date.now(),
            output: '',
            expenseType: '',
            positionTitle: '',
            country: '',
            employingOrg: '',
            allocatedPer: 0,
            LOESumm: 0,
            salSumm: 0,
            costPerLOE: 0,
            yearGroups
        };
    }

    handleFieldChange(event) {
        const { index, field } = event.target.dataset;
        this.tableData[index][field] = event.target.value;
    }

    handleYearChange(event) {
        const { index, yearId, field } = event.target.dataset;
        const value = parseFloat(event.target.value) || 0;

        const row = this.tableData[index];
        const yearGroup = row.yearGroups.find(y => y.id === yearId);
        if (yearGroup) {
            yearGroup[field] = value;
        }

        row.LOESumm = row.yearGroups
            .reduce((s, y) => s + (parseFloat(y.LOE) || 0), 0)
            .toFixed(2);
        row.salSumm = row.yearGroups
            .reduce((s, y) => s + (parseFloat(y.YearLabel) || 0), 0)
            .toFixed(2);
        row.costPerLOE = (parseFloat(row.LOESumm) * parseFloat(row.salSumm)).toFixed(2);

        this.tableData = [...this.tableData];
    }

    async handleSave() {
        await this.saveData('Saved');
    }

    async handleSubmit() {
        try {
            await this.saveData('Submitted');
            await submitStaffAllocations({ recordId: this.recordId });
            this.isSubmitted = true;

            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Submitted',
                    message: 'Staff Allocations submitted successfully!',
                    variant: 'success'
                })
            );
        } catch (err) {
            console.error('StaffAlloc: Submit error:', err);
        }
    }

    async saveData(status) {
        try {
            const payload = this.tableData.map(row => {
                const rec = {
                    Id: row.id,
                    uNI_IndividualApplications__c: this.recordId,
                    uNI_Outputs__c: row.output,
                    Expense_Type__c: row.expenseType,
                    Position_title__c: row.positionTitle,
                    Country__c: row.country,
                    Employing_organization__c: row.employingOrg,
                    of_Allowances_Fringe__c: row.allocatedPer,
                    LOE__c: parseFloat(row.LOESumm) || 0,
                    Total_Salary__c: parseFloat(row.salSumm) || 0,
                    Cost_per_LOE__c: parseFloat(row.costPerLOE) || 0
                };

                row.yearGroups.forEach((y, idx) => {
                    rec[`LOE${idx + 1}__c`] = parseFloat(y.LOE) || 0;
                    rec[`month${idx + 1}__c`] = parseFloat(y.Month) || 0;
                    rec[`Fully_loaded_salary${idx + 1}__c`] = parseFloat(y.Salary) || 0;
                    rec[`Year${idx + 1}__c`] = parseFloat(y.YearLabel) || 0;
                });

                return rec;
            });

            await upsertStaffAllocations({
                jsonData: JSON.stringify(payload),
                version: this.version      // 🔹 stamp this version
            });

            await this.initialize();

            if (status === 'Saved') {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Saved',
                        message: 'Staff Allocations saved successfully!',
                        variant: 'success'
                    })
                );
            }
        } catch (err) {
            console.error('StaffAlloc: Save error:', err);
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error saving data',
                    message: err.body?.message || err.message,
                    variant: 'error'
                })
            );
        }
    }
}