import { LightningElement, api, track, wire } from 'lwc';
import getTableData from '@salesforce/apex/uNI_TableSixARBudgetController.getTableData';
import { getRecord } from 'lightning/uiRecordApi';

const AR_FIELDS = [
    'uNI_Annual_Report__c.uNI_BudgetFrom__c',
    'uNI_Annual_Report__c.uNI_ReprogrammingRequest__c',
    'uNI_Annual_Report__c.uNI_RelatedDisbursement__c'
];

export default class UNITableSixARBudget extends LightningElement {
    @api recordId;
    @track loading = false;
    @track error = '';

    @track rows = [];
    @track summary = { budget: 0, actual: 0, variance: 0, pct: '' };
    yearLabel = '';
    @track effectiveRecordId;

    @track budgetFrom;
    @track reprogrammingRequest;
    @track relatedDisbursement;

    MAX_OUTPUTS = 15;

    @wire(getRecord, { recordId: '$recordId', fields: AR_FIELDS })
    wiredAR({ data, error }) {
        if (data) {
            this.budgetFrom = data.fields.uNI_BudgetFrom__c && data.fields.uNI_BudgetFrom__c.value;
            this.reprogrammingRequest = data.fields.uNI_ReprogrammingRequest__c && data.fields.uNI_ReprogrammingRequest__c.value;
            this.relatedDisbursement = data.fields.uNI_RelatedDisbursement__c && data.fields.uNI_RelatedDisbursement__c.value;
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
            console.error('[Table6] Error fetching AR fields', error);
        }
    }

    connectedCallback() {
        if (this.recordId) {
            this.effectiveRecordId = this.recordId;
            this.loadData();
        }
    }

    loadData() {
        this.loading = true;
        this.error = '';

        const recIdToUse = this.effectiveRecordId || this.recordId;
        if (!recIdToUse) {
            this.error = 'Missing recordId';
            this.loading = false;
            return;
        }

        getTableData({ recordId: recIdToUse })
            .then((res) => {
                this.yearLabel = res && res.disbursementYear ? `Year (${res.disbursementYear})` : 'Year';
                let outputsCount = Math.min(this.MAX_OUTPUTS, res.numberOfOutputs || 0);
                // Fallback: derive outputs count from data if server returns 0
                if (!outputsCount && res.expenseTypes && res.expenseTypes.length) {
                    outputsCount = this.deriveOutputsFromData(res.expenseTypes);
                }
                console.log('[Table6] outputsCount resolved to', outputsCount, 'controller count', res.numberOfOutputs);
                const rows = this.buildOutputRows(res.expenseTypes || [], outputsCount);
                this.rows = rows;
                this.summary = this.computeSummary(rows);
                this.loading = false;
            })
            .catch((err) => {
                this.loading = false;
                this.error = this.normalizeError(err);
            });
    }

    buildOutputRows(expenseTypes, outputsCount) {
        const rows = [];
        for (let i = 1; i <= outputsCount; i++) {
            let budget = 0;
            let actual = 0;
            expenseTypes.forEach((rec) => {
                budget += this.toNumberSafe(rec[`uNI_ProjectedExpenseOutput${i}__c`]) || 0;
                actual += this.toNumberSafe(rec[`uNI_ProjectedExpenseOutput${i}AR__c`]) || 0;
            });
            const variance = actual - budget;
            const pct = budget === 0 ? '' : `${((actual / budget) * 100).toFixed(2)}%`;
            rows.push({
                key: `out-${i}`,
                label: `Output ${i}`,
                budget,
                actual,
                variance,
                pct,
                yearBudget: budget,
                yearActual: actual,
                yearVariance: variance,
                yearPct: pct
            });
        }
        // Cross-cutting row (always include, even if zero)
        let crossBudget = 0;
        let crossActual = 0;
        expenseTypes.forEach((rec) => {
            crossBudget += this.toNumberSafe(rec.uNI_ProjectedExpenseCrossCutting__c) || 0;
            crossActual += this.toNumberSafe(rec.uNI_ProjectedExpenseCrossCuttingAR__c) || 0;
        });
        const crossVariance = crossActual - crossBudget;
        const crossPct = crossBudget === 0 ? '' : `${((crossActual / crossBudget) * 100).toFixed(2)}%`;
        rows.push({
            key: 'cross',
            label: 'Cross-cutting',
            budget: crossBudget,
            actual: crossActual,
            variance: crossVariance,
            pct: crossPct,
            yearBudget: crossBudget,
            yearActual: crossActual,
            yearVariance: crossVariance,
            yearPct: crossPct
        });
        return rows;
    }

    deriveOutputsFromData(list) {
        let maxIdx = 0;
        list.forEach((rec) => {
            for (let i = 1; i <= this.MAX_OUTPUTS; i++) {
                if (rec[`uNI_ProjectedExpenseOutput${i}__c`] !== null && rec[`uNI_ProjectedExpenseOutput${i}__c`] !== undefined) {
                    maxIdx = Math.max(maxIdx, i);
                }
                if (rec[`uNI_ProjectedExpenseOutput${i}AR__c`] !== null && rec[`uNI_ProjectedExpenseOutput${i}AR__c`] !== undefined) {
                    maxIdx = Math.max(maxIdx, i);
                }
            }
        });
        return maxIdx;
    }

    computeSummary(rows) {
        let budget = 0;
        let actual = 0;
        rows.forEach((r) => {
            budget += this.toNumberSafe(r.budget) || 0;
            actual += this.toNumberSafe(r.actual) || 0;
        });
        const variance = actual - budget;
        const pct = budget === 0 ? '' : `${((actual / budget) * 100).toFixed(2)}%`;
        return { budget, actual, variance, pct };
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