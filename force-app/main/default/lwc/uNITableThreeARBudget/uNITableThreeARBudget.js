import { LightningElement, api, track, wire } from 'lwc';
import getTableData from '@salesforce/apex/uNI_TableThreeARBudgetController.getTableData';
import saveTable from '@salesforce/apex/uNI_TableThreeARBudgetController.saveTable';
import { getRecord } from 'lightning/uiRecordApi';

const AR_FIELDS = [
    'uNI_Annual_Report__c.uNI_BudgetFrom__c',
    'uNI_Annual_Report__c.uNI_ReprogrammingRequest__c',
    'uNI_Annual_Report__c.uNI_RelatedDisbursement__c',
    'uNI_Annual_Report__c.uNI_Status__c'
];

export default class UNI_TableThreeARBudget extends LightningElement {
    @api recordId;
    @api params = {};
    @track loading = false;
    @track error = '';
    @track saveMessage = '';
    @track budgetFrom;
    @track reprogrammingRequest;
    @track relatedDisbursement;
    @track arStatus;
    @track effectiveRecordId;
    annualreportId = this.recordId;
    MAX_OUTPUTS = 15;
    columns = [];

    @track table = {
        expenseTypes: [],
        summaryOutputs: [],
        summaryCrosscutting: {}
    };

    pendingChanges = {};

    @wire(getRecord, { recordId: '$recordId', fields: AR_FIELDS })
    wiredAnnualReport({ error, data }) {
        if (data) {
            this.budgetFrom = data.fields.uNI_BudgetFrom__c && data.fields.uNI_BudgetFrom__c.value;
            this.reprogrammingRequest = data.fields.uNI_ReprogrammingRequest__c && data.fields.uNI_ReprogrammingRequest__c.value;
            this.relatedDisbursement = data.fields.uNI_RelatedDisbursement__c && data.fields.uNI_RelatedDisbursement__c.value;
            this.arStatus = data.fields.uNI_Status__c && data.fields.uNI_Status__c.value;

            console.log('AR Budget fields (Table3):',
                'budgetFrom=', this.budgetFrom,
                'reprogrammingRequest=', this.reprogrammingRequest,
                'relatedDisbursement=', this.relatedDisbursement);

            // choose effective recordId based on source
            const target =
                this.budgetFrom === 'Disbursement'
                    ? this.relatedDisbursement
                    : this.budgetFrom === 'Reprogramming'
                        ? this.reprogrammingRequest
                        : this.recordId;

            console.log('AR Budget effective recordId:', target);
            if (target && target !== this.effectiveRecordId) {
                this.effectiveRecordId = target;
                this.loadData();
            }
            // track annual report id for rollup save
            this.annualreportId = this.recordId;
        } else if (error) {
            // keep existing error surface for table data; log field fetch issues
            console.error('Error fetching AR fields for Table3', error);
        }
    }

    connectedCallback() {
        console.log('Table Three AR Budget Params:', this.params._recordId);
        console.log(this.params)
        this.effectiveRecordId = this.recordId;
        if (this.effectiveRecordId) {
            this.loadData();
        }
    }

    get hasData() {
        return this.table.expenseTypes && this.table.expenseTypes.length > 0;
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

        if (!this.effectiveRecordId) {
            this.error = 'Missing recordId';
            return;
        }

        console.log('Table3 AR loadData for recordId:', this.effectiveRecordId);

        getTableData({ recordId: this.effectiveRecordId })
            .then((res) => {
                console.log('Table3 AR expenseTypes fetched:', JSON.stringify(res && res.expenseTypes ? res.expenseTypes : []));
                let outputsCount = res ? res.numberOfOutputs : null;
                // Fallback only when the server couldn't determine the count
                if ((outputsCount === null || outputsCount === undefined) && res.expenseTypes && res.expenseTypes.length) {
                    outputsCount = this.deriveOutputsFromData(res.expenseTypes);
                }
                outputsCount = Math.min(this.MAX_OUTPUTS, outputsCount || 0);
                console.log('Table3 AR outputsCount:', outputsCount);
                this.columns = this.buildColumns(outputsCount);

                const rows = (res.expenseTypes || []).map((rec, idx) => this.hydrateRow(rec, outputsCount, idx));
                const summary = this.computeSummary(rows, outputsCount);
                console.log('Table3 AR summary outputs:', JSON.stringify(summary.outputs), 'cross:', JSON.stringify(summary.crosscutting));
                this.logGrandTotals(summary);

                this.table = {
                    expenseTypes: rows,
                    summaryOutputs: summary.outputs,
                    summaryCrosscutting: summary.crosscutting
                };
                this.pendingChanges = {};
                this.loading = false;
            })
            .catch((err) => {
                this.loading = false;
                this.error = this.normalizeError(err);
            });
    }

    hydrateRow(rec, outputsCount, idx) {
        const row = { ...rec };
        row.key = rec.Id || rec.id || `row-${idx}`;
        row.rowIndex = idx;
        // Prefer record name for the expense group label, fallback to cost type
        row.displayName = rec.Name || rec.uNI_CostType__c || '';
        row.outputs = [];

        for (let i = 1; i <= outputsCount; i++) {
            const projectedApi = `uNI_ProjectedExpenseOutput${i}__c`;
            const actualApi = `uNI_ProjectedExpenseOutput${i}AR__c`;
            const projNum = this.toNumberSafe(rec[projectedApi]);
            const actNum = this.toNumberSafe(rec[actualApi]);
            row.outputs.push(this.buildCell(this.formatNumber(projNum), this.formatNumber(actNum), projectedApi, actualApi, i));
        }

        row.crosscutting = this.buildCell(
            this.formatNumber(this.toNumberSafe(rec.uNI_ProjectedExpenseCrossCutting__c)),
            this.formatNumber(this.toNumberSafe(rec.uNI_ProjectedExpenseCrossCuttingAR__c)),
            'uNI_ProjectedExpenseCrossCutting__c',
            'uNI_ProjectedExpenseCrossCuttingAR__c',
            'cross'
        );

        return row;
    }

    buildCell(projected, actual, projectedApi, actualApi, index) {
        const cell = {
            projectedApi,
            actualApi,
            index,
            keyProj: `o${index}-proj`,
            keyAct: `o${index}-act`,
            keyVar: `o${index}-var`,
            keyPct: `o${index}-pct`,
            projected,
            actual,
            variance: '',
            variancePct: ''
        };
        this.recomputeCell(cell);
        return cell;
    }

    recomputeCell(cell) {
        const projNum = this.toNumberSafe(cell.projected) || 0;
        const actNum = this.toNumberSafe(cell.actual) || 0;
        const variance = actNum - projNum;
        cell.variance = variance;
        // % implemented = Actual / Budget
        cell.variancePct = projNum === 0 ? '' : `${((actNum / projNum) * 100).toFixed(2)}%`;
    }

    computeSummary(rows, outputsCount) {
        const outputs = [];
        const limit = Math.min(this.MAX_OUTPUTS, outputsCount || 0);

        for (let i = 1; i <= limit; i++) {
            let proj = 0;
            let act = 0;
            rows.forEach((r) => {
                const cell = r.outputs[i - 1];
                if (cell) {
                    proj += this.toNumberSafe(cell.projected) || 0;
                    act += this.toNumberSafe(cell.actual) || 0;
                }
            });
            const variance = act - proj;
            const keyBase = `sum-${i}`;
            outputs.push({
                key: keyBase,
                keyProj: `${keyBase}-proj`,
                keyAct: `${keyBase}-act`,
                keyVar: `${keyBase}-var`,
                keyPct: `${keyBase}-pct`,
                label: `Output ${i}`,
                projected: proj,
                actual: act,
                variance: variance,
                projectedDisplay: this.formatNumber(proj),
                actualDisplay: this.formatNumber(act),
                varianceDisplay: this.formatNumber(variance),
                variancePct: proj === 0 ? '' : `${((act / proj) * 100).toFixed(2)}%`
            });
        }

        let crossProj = 0;
        let crossAct = 0;
        rows.forEach((r) => {
            crossProj += this.toNumberSafe(r.crosscutting.projected) || 0;
            crossAct += this.toNumberSafe(r.crosscutting.actual) || 0;
        });
        const crossVar = crossAct - crossProj;

        return {
            outputs,
            crosscutting: {
                keyProj: 'cross-proj',
                keyAct: 'cross-act',
                keyVar: 'cross-var',
                keyPct: 'cross-pct',
                projected: crossProj,
                actual: crossAct,
                variance: crossVar,
                projectedDisplay: this.formatNumber(crossProj),
                actualDisplay: this.formatNumber(crossAct),
                varianceDisplay: this.formatNumber(crossVar),
                variancePct: crossProj === 0 ? '' : `${((crossAct / crossProj) * 100).toFixed(2)}%`
            }
        };
    }

    // derive number of outputs from any non-null projected/actual fields
    deriveOutputsFromData(list) {
        let maxIdx = 0;
        list.forEach((rec) => {
            for (let i = 1; i <= this.MAX_OUTPUTS; i++) {
                const projKey = `uNI_ProjectedExpenseOutput${i}__c`;
                const actKey = `uNI_ProjectedExpenseOutput${i}AR__c`;
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

    logGrandTotals(summary) {
        if (!summary) return;
        const hasOutputs = summary.outputs && summary.outputs.length > 0;
        const hasCross =
            summary.crosscutting &&
            (this.toNumberSafe(summary.crosscutting.projected) || this.toNumberSafe(summary.crosscutting.actual));
        if (!hasOutputs && !hasCross) {
            // skip logging when we don't yet have data
            return;
        }
        const { totalBudget, totalActual } = this.computeGrandTotals(summary);
        // suppress log if everything is still zero
        if (totalBudget === 0 && totalActual === 0) {
            return;
        }
        console.log(
            `[Table3] Grand totals across all outputs + cross-cutting -> Budget: ${totalBudget}, Actual: ${totalActual}`
        );
    }

    computeGrandTotals(summary) {
        const outputsBudget = (summary.outputs || []).reduce((sum, o) => sum + (this.toNumberSafe(o.projected) || 0), 0);
        const outputsActual = (summary.outputs || []).reduce((sum, o) => sum + (this.toNumberSafe(o.actual) || 0), 0);
        const crossBudget = this.toNumberSafe(summary.crosscutting?.projected) || 0;
        const crossActual = this.toNumberSafe(summary.crosscutting?.actual) || 0;
        return {
            totalBudget: outputsBudget + crossBudget,
            totalActual: outputsActual + crossActual
        };
    }

    handleActualChange(evt) {
        const rowIndex = Number(evt.target.dataset.index);
        const outputIndex = evt.target.dataset.output;
        const api = evt.target.dataset.api;
        const val = evt.target.value;

        const rows = [...this.table.expenseTypes];
        const row = rows[rowIndex];
        if (!row) {
            return;
        }

        const recId = row.Id || row.id || row.key;
        if (!this.pendingChanges[recId]) {
            this.pendingChanges[recId] = {};
        }
        this.pendingChanges[recId][api] = val;

        if (outputIndex === 'cross') {
            row.crosscutting.actual = val;
            this.recomputeCell(row.crosscutting);
            row[api] = val;
        } else {
            const idx = Number(outputIndex) - 1;
            const cell = row.outputs[idx];
            if (cell) {
                cell.actual = val;
                this.recomputeCell(cell);
                row[api] = val;
            }
        }

        rows[rowIndex] = row;
        const summary = this.computeSummary(rows, this.columns.length);
        this.table = {
            expenseTypes: rows,
            summaryOutputs: summary.outputs,
            summaryCrosscutting: summary.crosscutting
        };
        this.logGrandTotals(summary);
    }

    handleNarrativeChange(evt) {
        const rowIndex = Number(evt.target.dataset.index);
        const api = evt.target.dataset.api;
        const val = evt.target.value;

        const rows = [...this.table.expenseTypes];
        const row = rows[rowIndex];
        if (!row) {
            return;
        }

        const recId = row.Id || row.id || row.key;
        if (!this.pendingChanges[recId]) {
            this.pendingChanges[recId] = {};
        }
        this.pendingChanges[recId][api] = val;
        row[api] = val;

        rows[rowIndex] = row;
        this.table = { ...this.table, expenseTypes: rows };
    }

    handleSave() {
        this.error = '';
        this.saveMessage = '';

        const payload = Object.keys(this.pendingChanges || {}).map((id) => ({
            id,
            updates: this.pendingChanges[id]
        }));

        // Always compute totals for rollup
        const freshSummary = this.computeSummary(this.table.expenseTypes || [], this.columns.length);
        const totals = this.computeGrandTotals(freshSummary);

        this.loading = true;
        saveTable({
            updatesJson: JSON.stringify(payload),
            annualReportId: this.annualreportId || this.recordId,
            overallTarget: totals.totalBudget,
            overallSpent: totals.totalActual,
            fundsUtilized: totals.totalActual,
            targetAmountForPeriod: totals.totalBudget
        })
            .then(() => {
                this.saveMessage = 'Saved successfully';
                this.pendingChanges = {};
                this.loadData();
            })
            .catch((err) => {
                this.loading = false;
                this.error = this.normalizeError(err);
            });
    }

    toNumberSafe(val) {
        if (val === null || val === undefined || val === '') {
            return null;
        }
        if (typeof val === 'number') {
            return val;
        }
        let s = String(val).replace(/,/g, '').replace(/'/g, '').trim();
        if (s === '') {
            return null;
        }
        const n = Number(s);
        return Number.isNaN(n) ? null : n;
    }

    formatNumber(val) {
        if (val === null || val === undefined || val === '') {
            return '';
        }
        try {
            return Number(val).toFixed(2);
        } catch (e) {
            return String(val);
        }
    }

    normalizeError(err) {
        if (!err) return 'Unknown error';
        if (err.body && err.body.message) return err.body.message;
        if (err.message) return err.message;
        return JSON.stringify(err);
    }
}
