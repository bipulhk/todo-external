import { LightningElement, api, track, wire } from 'lwc';
import getTableData from '@salesforce/apex/uNI_TableFiveARBudgetController.getTableData';
import saveTable from '@salesforce/apex/uNI_TableFiveARBudgetController.saveTable';
import { getRecord } from 'lightning/uiRecordApi';

const AR_FIELDS = [
    'uNI_Annual_Report__c.uNI_BudgetFrom__c',
    'uNI_Annual_Report__c.uNI_ReprogrammingRequest__c',
    'uNI_Annual_Report__c.uNI_RelatedDisbursement__c',
    'uNI_Annual_Report__c.uNI_Status__c'
];

export default class UNITableFiveARBudget extends LightningElement {
    @api recordId;

    @track loading = false;
    @track error = '';
    @track saveMessage = '';

    @track columns = [];
    @track table = {
        rows: [],
        summaryOutputs: [],
        summaryCross: {},
        summaryTotal: {}
    };

    @track yearLabel = '';
    @track effectiveRecordId;
    @track budgetFrom;
    @track reprogrammingRequest;
    @track relatedDisbursement;
    @track arStatus;

    MAX_OUTPUTS = 15;
    pendingChanges = {};

    @wire(getRecord, { recordId: '$recordId', fields: AR_FIELDS })
    wiredAR({ data, error }) {
        if (data) {
            this.budgetFrom =
                data.fields.uNI_BudgetFrom__c &&
                data.fields.uNI_BudgetFrom__c.value;
            this.reprogrammingRequest =
                data.fields.uNI_ReprogrammingRequest__c &&
                data.fields.uNI_ReprogrammingRequest__c.value;
            this.relatedDisbursement =
                data.fields.uNI_RelatedDisbursement__c &&
                data.fields.uNI_RelatedDisbursement__c.value;
            this.arStatus =
                data.fields.uNI_Status__c && data.fields.uNI_Status__c.value;

            const target =
                this.budgetFrom === 'Disbursement'
                    ? this.relatedDisbursement
                    : this.budgetFrom === 'Reprogramming'
                        ? this.reprogrammingRequest
                        : this.recordId;

            if (target && target !== this.effectiveRecordId) {
                this.effectiveRecordId = target;
                this.loadData();
            }
        } else if (error) {
            // keep loading errors surfaced via loadData
            console.error('[Table5] Error fetching AR fields', error);
        }
    }

    connectedCallback() {
        if (this.recordId) {
            this.effectiveRecordId = this.recordId;
            this.loadData();
        }
    }

    get hasData() {
        return this.table.rows && this.table.rows.length > 0;
    }

    get isReadOnly() {
        return this.arStatus !== 'In Progress';
    }

    get saveDisabled() {
        return this.loading || this.isReadOnly;
    }

    buildColumns(count) {
        const cols = [];
        const limit = Math.min(this.MAX_OUTPUTS, count || 0);
        for (let i = 1; i <= limit; i++) {
            const base = `output-${i}`;
            cols.push({
                key: base,
                label: `Output ${i}`,
                index: i,
                budgetKey: `${base}-budget`,
                actualKey: `${base}-actual`,
                varianceKey: `${base}-variance`,
                pctKey: `${base}-pct`
            });
        }
        return cols;
    }

    loadData() {
        this.loading = true;
        this.error = '';
        this.saveMessage = '';

        const recIdToUse = this.effectiveRecordId || this.recordId;
        if (!recIdToUse) {
            this.error = 'Missing recordId';
            this.loading = false;
            return;
        }

        getTableData({ recordId: recIdToUse })
            .then(res => {
                this.yearLabel =
                    res && res.disbursementYear
                        ? `Year (${res.disbursementYear})`
                        : 'Year';
                let outputsCount = res ? res.numberOfOutputs : null;
                // Fallback only when the server couldn't determine the count
                if ((outputsCount === null || outputsCount === undefined) && res.expenseTypes && res.expenseTypes.length) {
                    outputsCount = this.deriveOutputsFromData(res.expenseTypes);
                }
                outputsCount = Math.min(this.MAX_OUTPUTS, outputsCount || 0);

                this.columns = this.buildColumns(outputsCount);
                const rows = (res.expenseTypes || []).map((rec, idx) =>
                    this.hydrateRow(rec, outputsCount, idx)
                );
                const summary = this.computeSummary(rows, outputsCount);

                this.table = {
                    rows,
                    summaryOutputs: summary.outputs,
                    summaryCross: summary.cross,
                    summaryTotal: summary.total
                };
                this.pendingChanges = {};
                this.loading = false;
            })
            .catch(err => {
                this.loading = false;
                this.error = this.normalizeError(err);
            });
    }

    hydrateRow(rec, outputsCount, idx) {
        const row = {
            key: rec.Id || rec.id || `row-${idx}`,
            recId: rec.Id || rec.id,
            name: rec.Name || rec.uNI_CostType__c || '',
            outputs: []
        };

        for (let i = 1; i <= outputsCount; i++) {
            const budget = this.toNumberSafe(
                rec[`uNI_ProjectedExpenseOutput${i}__c`]
            );
            const actualApi = `uNI_Table5ActualOutput${i}__c`;
            const actual = this.toNumberSafe(rec[actualApi]);
            row.outputs.push(
                this.buildCell(budget, actual, actualApi, i, row.key)
            );
        }

        const crossBudget = this.toNumberSafe(
            rec.uNI_ProjectedExpenseCrossCutting__c
        );
        const crossActual = this.toNumberSafe(rec.uNI_Table5ActualCrossCutting__c);
        row.cross = this.buildCell(
            crossBudget,
            crossActual,
            'uNI_Table5ActualCrossCutting__c',
            'cross',
            row.key
        );

        row.total = this.computeRowTotal(row.outputs, row.cross);
        return row;
    }

    buildCell(budget, actual, actualApi, index, rowKey) {
        const variance = actual - budget;
        return {
            budget,
            actual,
            variance,
            pct:
                budget === 0
                    ? ''
                    : `${((actual / budget) * 100).toFixed(2)}%`,
            actualApi,
            index,
            keyBudget: `o${index}-proj-${rowKey}`,
            keyActual: `o${index}-act-${rowKey}`,
            keyVar: `o${index}-var-${rowKey}`,
            keyPct: `o${index}-pct-${rowKey}`
        };
    }

    computeRowTotal(outputs, cross) {
        let budget = 0;
        let actual = 0;
        outputs.forEach(cell => {
            budget += this.toNumberSafe(cell.budget) || 0;
            actual += this.toNumberSafe(cell.actual) || 0;
        });
        budget += this.toNumberSafe(cross.budget) || 0;
        actual += this.toNumberSafe(cross.actual) || 0;
        const variance = actual - budget;
        return {
            budget,
            actual,
            variance,
            pct: budget === 0 ? '' : `${((actual / budget) * 100).toFixed(2)}%`
        };
    }

    computeSummary(rows, outputsCount) {
        const outputs = [];
        for (let i = 1; i <= outputsCount; i++) {
            let budget = 0;
            let actual = 0;
            rows.forEach(r => {
                budget += this.toNumberSafe(r.outputs[i - 1]?.budget) || 0;
                actual += this.toNumberSafe(r.outputs[i - 1]?.actual) || 0;
            });
            const variance = actual - budget;
            const base = `sum-${i}`;
            outputs.push({
                key: base,
                keyBudget: `${base}-proj`,
                keyActual: `${base}-act`,
                keyVar: `${base}-var`,
                keyPct: `${base}-pct`,
                label: `Output ${i}`,
                budget,
                actual,
                variance,
                pct: budget === 0 ? '' : `${((actual / budget) * 100).toFixed(2)}%`
            });
        }

        let crossBudget = 0;
        let crossActual = 0;
        rows.forEach(r => {
            crossBudget += this.toNumberSafe(r.cross?.budget) || 0;
            crossActual += this.toNumberSafe(r.cross?.actual) || 0;
        });
        const crossVariance = crossActual - crossBudget;

        let totalBudget = 0;
        let totalActual = 0;
        rows.forEach(r => {
            totalBudget += this.toNumberSafe(r.total?.budget) || 0;
            totalActual += this.toNumberSafe(r.total?.actual) || 0;
        });
        const totalVariance = totalActual - totalBudget;

        return {
            outputs,
            cross: {
                budget: crossBudget,
                actual: crossActual,
                variance: crossVariance,
                pct:
                    crossBudget === 0
                        ? ''
                        : `${((crossActual / crossBudget) * 100).toFixed(2)}%`
            },
            total: {
                budget: totalBudget,
                actual: totalActual,
                variance: totalVariance,
                pct:
                    totalBudget === 0
                        ? ''
                        : `${((totalActual / totalBudget) * 100).toFixed(2)}%`
            }
        };
    }

    deriveOutputsFromData(list) {
        let maxIdx = 0;
        list.forEach(rec => {
            for (let i = 1; i <= this.MAX_OUTPUTS; i++) {
                const projKey = `uNI_ProjectedExpenseOutput${i}__c`;
                const actKey = `uNI_Table5ActualOutput${i}__c`;
                if (rec[projKey] !== null && rec[projKey] !== undefined) {
                    maxIdx = Math.max(maxIdx, i);
                }
                if (rec[actKey] !== null && rec[actKey] !== undefined) {
                    maxIdx = Math.max(maxIdx, i);
                }
            }
        });
        return maxIdx;
    }

    handleActualChange(evt) {
        const recId = evt.target.dataset.recId;
        const field = evt.target.dataset.api;
        const outputIndex = evt.target.dataset.output;
        const rowKey = evt.target.dataset.rowKey;
        const value = evt.target.value;
        if (!recId || !field) return;

        if (!this.pendingChanges[recId]) {
            this.pendingChanges[recId] = {};
        }
        this.pendingChanges[recId][field] = value;

        // update local rows
        const rows = this.table.rows.map(r => {
            if (r.key !== rowKey) return r;
            const updatedRow = {
                ...r,
                outputs: r.outputs.map(o => ({ ...o })),
                cross: { ...r.cross }
            };

            if (outputIndex === 'cross') {
                updatedRow.cross.actual = Number(value);
                updatedRow.cross.variance =
                    updatedRow.cross.actual - updatedRow.cross.budget;
                updatedRow.cross.pct =
                    updatedRow.cross.budget === 0
                        ? ''
                        : `${(
                              (updatedRow.cross.actual /
                                  updatedRow.cross.budget) *
                              100
                          ).toFixed(2)}%`;
            } else {
                const idx = Number(outputIndex) - 1;
                const cell = updatedRow.outputs[idx];
                if (cell) {
                    cell.actual = Number(value);
                    cell.variance = cell.actual - cell.budget;
                    cell.pct =
                        cell.budget === 0
                            ? ''
                            : `${((cell.actual / cell.budget) * 100).toFixed(2)}%`;
                }
            }

            updatedRow.total = this.computeRowTotal(
                updatedRow.outputs,
                updatedRow.cross
            );
            return updatedRow;
        });

        const summary = this.computeSummary(rows, this.columns.length);
        this.table = {
            rows,
            summaryOutputs: summary.outputs,
            summaryCross: summary.cross,
            summaryTotal: summary.total
        };
    }

    handleSave() {
        this.error = '';
        this.saveMessage = '';
        const payload = Object.keys(this.pendingChanges || {}).map(id => ({
            id,
            updates: this.pendingChanges[id]
        }));
        if (payload.length === 0) {
            this.saveMessage = 'No changes to save';
            return;
        }
        this.loading = true;
        saveTable({ updatesJson: JSON.stringify(payload) })
            .then(() => {
                this.saveMessage = 'Saved successfully';
                this.pendingChanges = {};
                this.loadData();
            })
            .catch(err => {
                this.loading = false;
                this.error = this.normalizeError(err);
            });
    }

    toNumberSafe(val) {
        if (val === null || val === undefined || val === '') {
            return 0;
        }
        if (typeof val === 'number') {
            return val;
        }
        const num = Number(String(val).replace(/[,']/g, '').trim());
        return Number.isNaN(num) ? 0 : num;
    }

    normalizeError(err) {
        if (!err) return 'Unknown error';
        if (err.body && err.body.message) return err.body.message;
        if (err.message) return err.message;
        return JSON.stringify(err);
    }
}
