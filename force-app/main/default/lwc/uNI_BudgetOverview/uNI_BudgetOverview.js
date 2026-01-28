import { LightningElement, wire, api } from 'lwc';
import saveTable1 from '@salesforce/apex/uNI_BudgetOverviewController.saveTable1';
import getTables from '@salesforce/apex/uNI_BudgetOverviewController.getTables';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { CloseActionScreenEvent } from 'lightning/actions';
import { CurrentPageReference } from 'lightning/navigation';
import { getRecord } from 'lightning/uiRecordApi';

export default class uNI_BudgetOverviewController extends LightningElement {
    @api table1 = {};
    @api table2 = {};
    @api table3 = {};
    @api table4 = {};
    @api table5 = {};
    @api table6 = {};
    allTables = [];
    isLoading = false;
    isSubmitted = false;
    isBDDraft = false;
    isOverviewDraft= false;
    isReadOnly = true;
    baseReadOnly = false;
    iaRecord;

    _recordId;
    _version;

    @api
    get recordId() {
        return this._recordId;
    }
    set recordId(value) {
        if (value === this._recordId) {
            return;
        }
        this._recordId = value;
        if (this._recordId) {
            this.loadData();
        }
    }

    @api
    get version() {
        return this._version;
    }
    set version(value) {
        if (value === this._version) {
            return;
        }
        this._version = value;
        this.updateReadOnlyState();
        if (this.recordId) {
            this.loadData();
        }
    }

    // params is what comes from <lwc:component params={lwcParams}>
    _params;
    @api
    get params() {
        return this._params;
    }
    set params(value) {
        this._params = value || {};
        console.log('FX: params set =>', JSON.stringify(this._params));

        // Copy into the real reactive props
        if (this._params.recordId) {
            this.recordId = this._params.recordId;
        }
        if (this._params.version) {
            this.version = this._params.version;
        }

        console.log(
            'FX: after params set, recordId =',
            this.recordId,
            'version =',
            this.version
        ); 
    }

    handleSubmit() {
        console.log('in submit');
        this.apexSave('Submitted');
    }

    handleSave() {
        this.apexSave('Saved');
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
            console.log('FX: recordId resolved from page ref =>', this.recordId);
        }

        if (!this.version && state.c__version) {
            this.version = state.c__version;
            console.log('FX: version resolved from page ref =>', this.version);
        }
    }

    apexSave(overviewStatus) {
        const table5Payload = this.prepareBudgetRecordsPerColumn();
        console.log('table5', JSON.stringify(table5Payload));

        const payload1 = JSON.stringify(this.table1);
        const payload2 = JSON.stringify(this.table3);
        const payload3 = JSON.stringify(table5Payload);

        console.log('@@save1 tables', payload1);

        if (!this.recordId) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Missing context',
                    message: 'Record Id is required to save budget data.',
                    variant: 'error'
                })
            );
            return;
        }
        console.log('@@my overview status'+overviewStatus);
        saveTable1({
            indAppId: this.recordId,
            version: this.version,
            table1Json: payload1,
            table3Json: payload2,
            table5Json: payload3,
            statusVal: overviewStatus
        })
            .then(() => {
                console.log('@@save1 tables');
                if (overviewStatus === 'Submitted') {
                    this.isSubmitted = true;
                }
                console.log('@@save table submit status'+ this.isSubmitted);
                this.baseReadOnly = this.isSubmitted;
                console.log('@@save table2 submit status'+ this.baseReadOnly);

                this.updateReadOnlyState();
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Success',
                        message: 'Budget ' + overviewStatus + ' successfully!',
                        variant: 'success'
                    })
                );
            })
            .catch(error => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Error saving data',
                        message: error.body?.message || error.message,
                        variant: 'error'
                    })
                );
            });
    }

    recalculateTable5() {
        console.log('in here1 ');
        console.log('@@recordId', this.recordId);
        console.log(JSON.stringify(this.table5.consMembers));

        // --- 1. Row Totals ---
        this.table5.consMembers.forEach(row => {
            let rowTotal = 0;
            rowTotal += parseFloat(row.LeadOrganizationVal) || 0;

            for (let i = 1; i <= 8; i++) {
                if (row.hasOwnProperty('subImp' + i)) {
                    rowTotal += parseFloat(row['subImp' + i]) || 0;
                }
            }
            row.totalVal = rowTotal;
        });
        console.log('in here2');

        // --- 2. Column Totals ---
        let totals = {
            LeadOrganizationVal: 0,
            rowTotal: 0
        };
        for (let i = 1; i <= 8; i++) {
            totals['subImp' + i] = 0;
        }
        console.log('in here3 ');

        this.table5.consMembers.forEach(r => {
            totals.LeadOrganizationVal += parseFloat(r.LeadOrganizationVal) || 0;
            for (let i = 1; i <= 8; i++) {
                if (r.hasOwnProperty('subImp' + i)) {
                    totals['subImp' + i] += parseFloat(r['subImp' + i]) || 0;
                }
            }
            totals.rowTotal += parseFloat(r.totalVal) || 0;
        });

        this.table5.consMembTotal = totals;
        console.log('in here4 ');

        // --- 3. Percentages ---
        let percentages = {};
        let grandTotal = totals.rowTotal || 0;

        if (grandTotal > 0) {
            percentages.LeadOrganizationVal =
                (totals.LeadOrganizationVal / grandTotal) * 100;
            for (let i = 1; i <= 8; i++) {
                if (totals['subImp' + i] !== undefined) {
                    percentages['subImp' + i] =
                        (totals['subImp' + i] / grandTotal) * 100;
                }
            }
            percentages.rowTotal = 100;
        } else {
            percentages.LeadOrganizationVal = 0;
            for (let i = 1; i <= 8; i++) {
                percentages['subImp' + i] = 0;
            }
            percentages.rowTotal = 0;
        }
        console.log('in here5 ');

        this.table5.consMembPerc = percentages;

        // ensure reactivity
        this.table5 = { ...this.table5 };

        const recs = this.prepareBudgetRecordsPerColumn();
        console.log('the recs');
        console.log(JSON.stringify(recs));
    }

    handleTableRowChange(event) {
        const rowIndex = event.target.dataset.index;
        const field = event.target.dataset.api;
        const value = event.target.value;
        const tablename = event.target.dataset.tablename;

        if (tablename === 'table1') {
            let updatedExpenseTypes = JSON.parse(
                JSON.stringify(this.table1.expenseTypes)
            );

            // Update field
            updatedExpenseTypes[rowIndex][field] = value;

            // Fields contributing to totals
            const fields = [
                'uNI_Output1__c',
                'uNI_Output2__c',
                'uNI_Output3__c',
                'uNI_Output4__c',
                'uNI_Output5__c',
                'uNI_Output6__c',
                'uNI_Output7__c',
                'uNI_Output8__c',
                'uNI_Output9__c',
                'uNI_Output10__c',
                'uNI_Output11__c',
                'uNI_Output12__c',
                'uNI_Output13__c',
                'uNI_Output14__c',
                'uNI_Output15__c',
                'uNI_Cross_Cutting__c',
                'uNI_Output1Narrative__c',
                'uNI_Output2Narrative__c',
                'uNI_Output3Narrative__c',
                'uNI_Output4Narrative__c',
                'uNI_Output5Narrative__c',
                'uNI_Output6Narrative__c',
                'uNI_Output7Narrative__c',
                'uNI_Output8Narrative__c',
                'uNI_Output9Narrative__c',
                'uNI_Output10Narrative__c',
                'uNI_Output11Narrative__c',
                'uNI_Output12Narrative__c',
                'uNI_Output13Narrative__c',
                'uNI_Output14Narrative__c',
                'uNI_Output15Narrative__c',
                'uNI_CrossCuttingNarrative__c'
            ];

            // Row total
            let rowTotal = 0;
            fields.forEach(f => {
                let val = updatedExpenseTypes[rowIndex]?.[f];
                if (val !== undefined && val !== null && val !== '') {
                    rowTotal += parseFloat(val) || 0;
                }
            });
            updatedExpenseTypes[rowIndex]['uNI_Output_Totals__c'] = rowTotal;

            // Column totals (summary row)
            let updatedExpSummary = { ...this.table1.expSummary };
            fields.forEach(f => {
                let columnTotal = 0;
                updatedExpenseTypes.forEach(r => {
                    let val = r?.[f];
                    if (val !== undefined && val !== null && val !== '') {
                        columnTotal += parseFloat(val) || 0;
                    }
                });
                updatedExpSummary[f] = columnTotal;
            });

            // Grand total across all rows
            let grandTotal = 0;
            updatedExpenseTypes.forEach(r => {
                if (r?.uNI_Output_Totals__c) {
                    grandTotal += parseFloat(r.uNI_Output_Totals__c) || 0;
                }
            });
            updatedExpSummary['uNI_Output_Totals__c'] = grandTotal;

            // Percentages per row
            updatedExpenseTypes = updatedExpenseTypes.map(r => {
                const rowTotalVal = parseFloat(r?.uNI_Output_Totals__c) || 0;
                const percent =
                    grandTotal > 0
                        ? ((rowTotalVal / grandTotal) * 100).toFixed(2)
                        : 0;
                return { ...r, uNI_ExpensePercent__c: percent };
            });

            this.table1 = {
                ...this.table1,
                expenseTypes: updatedExpenseTypes,
                expSummary: updatedExpSummary
            };

            console.log(
                'Updated table1 with uNI_ExpensePercent__c => ',
                JSON.stringify(this.table1)
            );
        }

        if (tablename === 'table3') {
            let updatePOTypes = JSON.parse(
                JSON.stringify(this.table3.portOutputs)
            );
            updatePOTypes[rowIndex][field] = value;

            this.table3 = {
                ...this.table3,
                portOutputs: updatePOTypes
            };

            this.recalculateTable3();
        }

        if (tablename === 'table5') {
            const idx = parseInt(event.target.dataset.index, 10);
            const subno = event.target.dataset.subno;

            const isNarrative =
                event.target.tagName.toLowerCase() === 'lightning-textarea';

            let fieldName;
            if (subno === '0') {
                fieldName = isNarrative
                    ? 'LeadOrganizationNarr'
                    : 'LeadOrganizationVal';
            } else {
                fieldName = isNarrative
                    ? `subImp${subno}Narr`
                    : `subImp${subno}`;
            }

            const val = isNarrative
                ? event.target.value
                : parseFloat(event.target.value) || 0;

            this.table5.consMembers[idx][fieldName] = val;

            if (!isNarrative) {
                this.recalculateTable5();
            } else {
                console.log('@@in narratives');
                console.log(JSON.stringify(this.table5));
                this.table5 = { ...this.table5 };
            }
        }
    }

    connectedCallback() {
        console.log('record idd in connected callback', this.recordId);
        if (this.recordId) {
            this.loadData();
        }
    }

    @wire(getRecord, { recordId: '$recordId', fields: [] })
    wiredIARecord() {
        // wire retained for potential refresh callbacks
    }

    updateReadOnlyState() {
        if (this.isBDDraft) {
            console.log('BudgetOverview: isBDDraft -> forcing read-only');
            this.isReadOnly = true;
            return;
        }
        this.isReadOnly = this.baseReadOnly;
        console.log(
            'BudgetOverview: updateReadOnlyState -> isReadOnly =',
            this.isReadOnly,
            'baseReadOnly =',
            this.baseReadOnly
        );
    }

    async loadData() {
        if (!this.recordId) {
            return;
        }
        console.log('@@load data', this.showTable);
        this.isLoading = true;
        try {
            const result = await getTables({
                indAppId: this.recordId,
                version: this.version
            });
            console.log('@@stautsval'+ result.overviewStatus);
            this.isSubmitted = result.overviewStatus === 'Submitted';
            this.baseReadOnly= this.isSubmitted;
            this.isBDDraft =
                result.status === 'Draft' || result.status === 'In Progress';
                this.isOverviewDraft =
                result.overviewStatus === 'Saved' ||  result.overviewStatus === '';
            console.log(
                'BudgetOverview: status result =',
                result.status,
                'isBDDraft =',
                this.isBDDraft
            );
            this.updateReadOnlyState();
            const resultDataVal = result.data;
            this._wiredData = result;
            console.log('@@resultval', JSON.stringify(result));

            if (resultDataVal) {
                const allTables = JSON.parse(JSON.stringify(resultDataVal));
                console.log(JSON.stringify(allTables));

                if (allTables && allTables.length > 0) {
                    if (allTables.length > 0) this.table1 = allTables[0];
                    if (allTables.length > 1) this.table2 = allTables[1];
                    if (allTables.length > 2) this.table3 = allTables[2];
                    if (allTables.length > 3) this.table4 = allTables[3];
                    if (allTables.length > 4) this.table5 = allTables[4];
                    if (allTables.length > 5) this.table6 = allTables[5];
                }

                console.log(this.recordId);
                console.log('table1', JSON.stringify(this.table1.colwraps));
                console.log(this.table1.expSummary.uNI_Cross_Cutting__c);

                this.recalculateTable1();
                this.recalculateTable3();
                this.recalculateTable5();
            } else if (result.error) {
                // could toast error here if you want
            }
        } catch (error) {
            console.error(error);
        } finally {
            this.isLoading = false;
        }
    }

    // keep wire in case you later want reactive loading; body is commented
    @wire(getTables, { indAppId: '$recordId', version: '$version' })
    wiredQuestions(result) {
        // intentionally unused; using imperative loadData() instead
    }

    prepareBudgetRecordsPerColumn1() {
        const rows = this.table5?.consMembers || [];
        if (rows.length === 0) return [];

        const colwraps = this.table5?.colwraps || [];
        const maxOutputs = Math.min(rows.length, 15);

        const idRow = rows[0];

        const columns = [];
        columns.push({
            colKey: 'LeadOrganizationVal',
            narrKey: 'LeadOrganizationNarr',
            idKey: 'LeadOrganizationValId',
            meta: colwraps[0] || {},
            isLead: true
        });

        for (let i = 1; i <= 8; i++) {
            if (this.table5?.[`isSubImp${i}`]) {
                columns.push({
                    colKey: `subImp${i}`,
                    narrKey: `subImp${i}Narr`,
                    idKey: `subImp${i}Id`,
                    meta: colwraps[i] || {},
                    isLead: false
                });
            }
        }

        const records = columns.map(col => {
            const rec = {};

            if (idRow && idRow[col.idKey]) {
                rec.Id = idRow[col.idKey];
            }

            const meta = col.meta || {};
            if (meta.Name) rec.Name = meta.Name;
            if (meta.uNI_CallForProposals__c)
                rec.uNI_CallForProposals__c = meta.uNI_CallForProposals__c;
            if (meta.Expense_type__c)
                rec.Expense_type__c = meta.Expense_type__c;
            if (col.isLead) rec.is_Lead_Organization__c = true;

            for (let rowIdx = 1; rowIdx < maxOutputs; rowIdx++) {
                const outputNumber = rowIdx;
                const row = rows[rowIdx] || {};

                const valueFieldApi =
                    row.outputAPI || `uNI_Output_${outputNumber}__c`;
                rec[valueFieldApi] = this._safeNumber(row[col.colKey]);

                const narrFieldApi = `uNI_Output${outputNumber}Narrative__c`;
                rec[narrFieldApi] = row[col.narrKey] || '';
            }

            return rec;
        });

        return records;
    }

    recalculateTable1() {
        let updatedExpenseTypes = JSON.parse(
            JSON.stringify(this.table1.expenseTypes)
        );

        let grandTotal = 0;
        updatedExpenseTypes.forEach(r => {
            if (r?.uNI_Output_Totals__c) {
                grandTotal += parseFloat(r.uNI_Output_Totals__c) || 0;
            }
        });

        updatedExpenseTypes = updatedExpenseTypes.map(r => {
            const rowTotalVal = parseFloat(r?.uNI_Output_Totals__c) || 0;
            const percent =
                grandTotal > 0
                    ? ((rowTotalVal / grandTotal) * 100).toFixed(2)
                    : 0;
            return { ...r, uNI_ExpensePercent__c: percent };
        });

        // Clone summary safely
        let expSummary = { ...this.table1.expSummary };

        // 1️⃣ Calculate total exactly like Apex
        const total =
            (parseFloat(expSummary.uNI_Output1__c) || 0) +
            (parseFloat(expSummary.uNI_Output2__c) || 0) +
            (parseFloat(expSummary.uNI_Output3__c) || 0) +
            (parseFloat(expSummary.uNI_Output4__c) || 0) +
            (parseFloat(expSummary.uNI_Output5__c) || 0) +
            (parseFloat(expSummary.uNI_Output6__c) || 0) +
            (parseFloat(expSummary.uNI_Output7__c) || 0) +
            (parseFloat(expSummary.uNI_Output8__c) || 0) +
            (parseFloat(expSummary.uNI_Output9__c) || 0) +
            (parseFloat(expSummary.uNI_Output10__c) || 0) +
            (parseFloat(expSummary.uNI_Output11__c) || 0) +
            (parseFloat(expSummary.uNI_Output12__c) || 0) +
            (parseFloat(expSummary.uNI_Output13__c) || 0) +
            (parseFloat(expSummary.uNI_Output14__c) || 0) +
            (parseFloat(expSummary.uNI_Output15__c) || 0) +
            (parseFloat(expSummary.uNI_Cross_Cutting__c) || 0);

        // 2️⃣ Set total on summary
        expSummary.uNI_Output_Totals__c = total;

        this.table1 = {
            ...this.table1,
            expenseTypes: updatedExpenseTypes,
            expSummary:expSummary
        };

    }

    recalculateTable3() {
        let updatePOTypes = JSON.parse(
            JSON.stringify(this.table3.portOutputs)
        );

        const fields = [
            'uNI_Year1__c',
            'uNI_Year2__c',
            'uNI_Year3__c',
            'uNI_Year4__c',
            'uNI_Year5__c',
            'uNI_Year6__c',
            'uNI_Year7__c',
            'uNI_Year8__c'
        ];

        // Row totals
        updatePOTypes.forEach(r => {
            let rowTotal = 0;
            fields.forEach(f => {
                let val = r?.[f];
                if (val !== undefined && val !== null && val !== '') {
                    rowTotal += parseFloat(val) || 0;
                }
            });
            r.uNI_total__c = rowTotal;
        });

        // Column totals
        let updatedExpSummary = { ...this.table3.portOutputSummary };
        fields.forEach(f => {
            let columnTotal = 0;
            updatePOTypes.forEach(r => {
                let val = r?.[f];
                if (val !== undefined && val !== null && val !== '') {
                    columnTotal += parseFloat(val) || 0;
                }
            });
            updatedExpSummary[f] = columnTotal;
        });

        // Grand total
        let grandTotal = updatePOTypes.reduce(
            (sum, r) => sum + (parseFloat(r.uNI_total__c) || 0),
            0
        );
        updatedExpSummary['uNI_total__c'] = grandTotal;

        // Row percentages
        updatePOTypes = updatePOTypes.map(r => {
            const percent =
                grandTotal > 0
                    ? ((r.uNI_total__c / grandTotal) * 100).toFixed(2)
                    : 0;
            return { ...r, uNI_YearsPercent__c: percent };
        });

        this.table3 = {
            ...this.table3,
            portOutputs: updatePOTypes,
            portOutputSummary: updatedExpSummary
        };
    }

    _safeNumber(val) {
        if (val === undefined || val === null || val === '') return 0;
        const num = parseFloat(val);
        return isNaN(num) ? 0 : num;
    }

    prepareBudgetRecordsPerColumn() {
        const rows = this.table5?.consMembers || [];
        const colwraps = this.table5?.colwraps || [];
        const maxOutputs = Math.min(rows.length, 15);

        const columns = [];
        columns.push({
            colKey: 'LeadOrganizationVal',
            narrKey: 'LeadOrganizationNarr',
            idKey: 'LeadOrganizationValId',
            meta: colwraps[0] || {},
            isLead: true
        });

        const idRow = rows[0];

        for (let i = 1; i <= 8; i++) {
            if (this.table5?.[`isSubImp${i}`]) {
                columns.push({
                    colKey: `subImp${i}`,
                    narrKey: `subImp${i}Narr`,
                    idKey: `subImp${i}Id`,
                    meta: colwraps[i] || {},
                    isLead: false
                });
            }
        }

        const records = columns.map(col => {
            const rec = {};

            if (idRow && idRow[col.idKey]) {
                rec.Id = idRow[col.idKey];
            }

            const meta = col.meta || {};
            const possibleId = meta.Id || meta.recordId || meta.id;
            if (possibleId) rec.Id = possibleId;

            if (meta.Name) rec.Name = meta.Name;
            if (meta.uNI_CallForProposals__c)
                rec.uNI_CallForProposals__c = meta.uNI_CallForProposals__c;
            if (meta.Expense_type__c)
                rec.Expense_type__c = meta.Expense_type__c;

            for (let rowIdx = 0; rowIdx < maxOutputs; rowIdx++) {
                const outputNumber = rowIdx + 1;
                const row = rows[rowIdx] || {};

                const valueFieldApi =
                    row.outputAPI || `uNI_Output_${outputNumber}__c`;
                console.log('my row', JSON.stringify(row));

                const rawVal = row[col.colKey];
                rec[valueFieldApi] =
                    rawVal === undefined || rawVal === null
                        ? 0
                        : parseFloat(rawVal) || 0;

                const narrFieldApi = `uNI_Output${outputNumber}Narrative__c`;
                rec[narrFieldApi] = row[col.narrKey] || '';
            }

            return rec;
        });

        return records;
    }
}