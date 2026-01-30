import { LightningElement, api, track, wire } from 'lwc';
import getTableData from '@salesforce/apex/uNI_TableFourARBudgetController.getTableData';
import saveTable from '@salesforce/apex/uNI_TableFourARBudgetController.saveTable';
import { getRecord } from 'lightning/uiRecordApi';

const AR_FIELDS = [
    'uNI_Annual_Report__c.uNI_BudgetFrom__c',
    'uNI_Annual_Report__c.uNI_ReprogrammingRequest__c',
    'uNI_Annual_Report__c.uNI_RelatedDisbursement__c',
    'uNI_Annual_Report__c.uNI_Status__c'
];

export default class UNITableFourARBudget extends LightningElement {
    @api recordId;
    @track loading = false;
    @track error = '';

    @track rows = [];
    @track summary = { outputs: [], cross: {}, total: {} };
    yearLabel = '';
    @track effectiveRecordId;
    countryNames = {};

    @track budgetFrom;
    @track reprogrammingRequest;
    @track relatedDisbursement;
    @track saveMessage = '';
    @track arStatus;

    MAX_OUTPUTS = 15;
    columns = [];
    pendingChanges = {};

    @wire(getRecord, { recordId: '$recordId', fields: AR_FIELDS })
    wiredAR({ data, error }) {
        if (data) {
            this.budgetFrom = data.fields.uNI_BudgetFrom__c && data.fields.uNI_BudgetFrom__c.value;
            this.reprogrammingRequest = data.fields.uNI_ReprogrammingRequest__c && data.fields.uNI_ReprogrammingRequest__c.value;
            this.relatedDisbursement = data.fields.uNI_RelatedDisbursement__c && data.fields.uNI_RelatedDisbursement__c.value;
            this.arStatus = data.fields.uNI_Status__c && data.fields.uNI_Status__c.value;
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
            console.error('[Table4] Error fetching AR fields', error);
        }
    }

    connectedCallback() {
        if (this.recordId) {
            this.effectiveRecordId = this.recordId;
            this.loadData();
        }
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

        const recIdToUse = this.effectiveRecordId || this.recordId;
        if (!recIdToUse) {
            this.error = 'Missing recordId';
            this.loading = false;
            return;
        }

        getTableData({ recordId: recIdToUse })
            .then((res) => {
                this.yearLabel = res && res.disbursementYear ? `Year (${res.disbursementYear})` : 'Year';
                if (!res.expenseTypes || !res.expenseTypes.length) {
                    console.log('[Table4] no expenseTypes returned, skipping state update');
                    this.loading = false;
                    this.rows = [];
                    return;
                }
                let outputsCount = Math.min(this.MAX_OUTPUTS, res.numberOfOutputs || 0);
                // Fallback: derive outputs count from data if server returns 0
                if (!outputsCount && res.expenseTypes && res.expenseTypes.length) {
                    outputsCount = this.deriveOutputsFromData(res.expenseTypes);
                }

                this.countryNames = res.countryNames || {};
                console.log('[Table4] outputsCount resolved:', outputsCount, 'controller:', res.numberOfOutputs);
                console.log('[Table4] sample expenseTypes:', JSON.stringify((res.expenseTypes || []).slice(0, 3)));

                this.columns = this.buildColumns(outputsCount);
                const rows = this.buildCountryRows(res.expenseTypes || [], outputsCount);
                this.rows = rows;
                this.logBudgetsByCountry(rows, outputsCount);
                this.summary = this.computeSummary(rows, outputsCount);
                console.log('[Table4] summary:', JSON.stringify(this.summary));
                this.pendingChanges = {};
                this.saveMessage = '';
                this.loading = false;
            })
            .catch((err) => {
                this.loading = false;
                this.error = this.normalizeError(err);
            });
    }

    buildCountryRows(expenseTypes, outputsCount) {
        const map = new Map();
        const getBucket = (country) => {
            if (!country) return null; // skip unspecified buckets
            const key = country;
            const label = this.countryNames[country] || country;
            if (!map.has(key)) {
                map.set(key, {
                    key,
                    label,
                    outputs: Array.from({ length: outputsCount }, (_, idx) => ({
                        projected: 0,
                        actual: 0,
                        variance: 0,
                        pct: ''
                    })),
                    cross: { projected: 0, actual: 0, variance: 0, pct: '' },
                    varianceAnalysis: ''
                });
            }
            return map.get(key);
        };

        expenseTypes.forEach((rec) => {
            const firstCountry = this.getFirstCountry(rec, outputsCount);
            for (let i = 1; i <= outputsCount; i++) {
                const countryVal = rec[`uNI_Output${i}Country__c`];
                const bucket = getBucket(countryVal);
                const proj = this.toNumberSafe(rec[`uNI_ProjectedExpenseOutput${i}__c`]) || 0;
                const act = this.toNumberSafe(rec[`uNI_Output${i}CountryActual__c`]) || 0;
                if (bucket) {
                    bucket.outputs[i - 1].projected += proj;
                    bucket.outputs[i - 1].actual += act;
                    if (!bucket.outputs[i - 1].recId) {
                        bucket.outputs[i - 1].recId = rec.Id;
                        bucket.outputs[i - 1].actualField = `uNI_Output${i}CountryActual__c`;
                        bucket.outputs[i - 1].index = i;
                    }
                }
            }
            const crossCountry = rec.uNI_CrosscuttingCountry__c || firstCountry;
            const crossBucket = getBucket(crossCountry);
            if (crossBucket) {
                crossBucket.cross.projected += this.toNumberSafe(rec.uNI_ProjectedExpenseCrossCutting__c) || 0;
                crossBucket.cross.actual += this.toNumberSafe(rec.uNI_CrosscuttingCountryActual__c) || 0;
                if (!crossBucket.cross.recId) {
                    crossBucket.cross.recId = rec.Id;
                    crossBucket.cross.actualField = 'uNI_CrosscuttingCountryActual__c';
                }
                if (rec.uNI_VarianceAnalysisAR__c) {
                    crossBucket.varianceAnalysis = rec.uNI_VarianceAnalysisAR__c;
                }
            }
        });

        const rows = [];
        map.forEach((bucket) => {
            let totalProj = 0;
            let totalAct = 0;
            bucket.outputs.forEach((cell, idx) => {
                cell.variance = cell.actual - cell.projected;
                cell.pct = cell.projected === 0 ? '' : `${((cell.actual / cell.projected) * 100).toFixed(2)}%`;
                cell.keyProj = `o${idx + 1}-proj-${bucket.key}`;
                cell.keyAct = `o${idx + 1}-act-${bucket.key}`;
                cell.keyVar = `o${idx + 1}-var-${bucket.key}`;
                cell.keyPct = `o${idx + 1}-pct-${bucket.key}`;
                totalProj += cell.projected;
                totalAct += cell.actual;
            });
            bucket.cross.variance = bucket.cross.actual - bucket.cross.projected;
            bucket.cross.pct = bucket.cross.projected === 0 ? '' : `${((bucket.cross.actual / bucket.cross.projected) * 100).toFixed(2)}%`;
            totalProj += bucket.cross.projected;
            totalAct += bucket.cross.actual;
            const totalVar = totalAct - totalProj;
            const totalPct = totalProj === 0 ? '' : `${((totalAct / totalProj) * 100).toFixed(2)}%`;

            rows.push({
                key: bucket.key,
                label: bucket.label,
                outputs: bucket.outputs,
                cross: bucket.cross,
                total: { projected: totalProj, actual: totalAct, variance: totalVar, pct: totalPct },
                varianceAnalysis: bucket.varianceAnalysis
            });
        });

        return rows;
    }

    logBudgetsByCountry(rows, outputsCount) {
        if (!rows || rows.length === 0) return;
        const payload = rows.map((r) => {
            const outputs = {};
            for (let i = 1; i <= outputsCount; i++) {
                outputs[`output${i}`] = this.toNumberSafe(r.outputs[i - 1]?.projected) || 0;
            }
            return {
                country: r.label,
                outputs,
                crosscutting: this.toNumberSafe(r.cross?.projected) || 0,
                total: this.toNumberSafe(r.total?.projected) || 0
            };
        });
        console.log('[Table4] budgets by country/output:', JSON.stringify(payload));
    }

    computeSummary(rows, outputsCount) {
        const outputs = [];
        for (let i = 0; i < outputsCount; i++) {
            let proj = 0;
            let act = 0;
            rows.forEach((r) => {
                proj += this.toNumberSafe(r.outputs[i]?.projected) || 0;
                act += this.toNumberSafe(r.outputs[i]?.actual) || 0;
            });
            const variance = act - proj;
            const keyBase = `sum-${i + 1}`;
            outputs.push({
                key: keyBase,
                keyProj: `${keyBase}-proj`,
                keyAct: `${keyBase}-act`,
                keyVar: `${keyBase}-var`,
                keyPct: `${keyBase}-pct`,
                label: `Output ${i + 1}`,
                projected: proj,
                actual: act,
                variance,
                pct: proj === 0 ? '' : `${((act / proj) * 100).toFixed(2)}%`
            });
        }

        let crossProj = 0;
        let crossAct = 0;
        rows.forEach((r) => {
            crossProj += this.toNumberSafe(r.cross.projected) || 0;
            crossAct += this.toNumberSafe(r.cross.actual) || 0;
        });
        const crossVar = crossAct - crossProj;

        let totalProj = 0;
        let totalAct = 0;
        rows.forEach((r) => {
            totalProj += this.toNumberSafe(r.total.projected) || 0;
            totalAct += this.toNumberSafe(r.total.actual) || 0;
        });
        const totalVar = totalAct - totalProj;

        return {
            outputs,
            cross: {
                projected: crossProj,
                actual: crossAct,
                variance: crossVar,
                pct: crossProj === 0 ? '' : `${((crossAct / crossProj) * 100).toFixed(2)}%`
            },
            total: {
                projected: totalProj,
                actual: totalAct,
                variance: totalVar,
                pct: totalProj === 0 ? '' : `${((totalAct / totalProj) * 100).toFixed(2)}%`
            }
        };
    }

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

    getFirstCountry(rec, outputsCount) {
        for (let i = 1; i <= outputsCount; i++) {
            const c = rec[`uNI_Output${i}Country__c`];
            if (c) {
                return c;
            }
        }
        return rec.uNI_CrosscuttingCountry__c || null;
    }

    get isReadOnly() {
        return this.arStatus !== 'In Progress';
    }

    get saveDisabled() {
        return this.loading || this.isReadOnly;
    }

    handleActualChange(evt) {
        const recId = evt.target.dataset.recId;
        const field = evt.target.dataset.field;
        const bucketKey = evt.target.dataset.bucket;
        const outputIndex = evt.target.dataset.output;
        const value = evt.target.value;
        if (!recId || !field) return;

        if (!this.pendingChanges[recId]) {
            this.pendingChanges[recId] = {};
        }
        this.pendingChanges[recId][field] = value;

        // update local rows
        const rowsCopy = this.rows.map((r) => {
            if (r.key !== bucketKey) return r;
            const updatedRow = { ...r, outputs: r.outputs.map((o) => ({ ...o })), cross: { ...r.cross } };
            if (outputIndex === 'cross') {
                updatedRow.cross.actual = Number(value);
                updatedRow.cross.variance = updatedRow.cross.actual - updatedRow.cross.projected;
                updatedRow.cross.pct =
                    updatedRow.cross.projected === 0 ? '' : `${((updatedRow.cross.actual / updatedRow.cross.projected) * 100).toFixed(2)}%`;
            } else {
                const idx = Number(outputIndex) - 1;
                const cell = updatedRow.outputs[idx];
                if (cell) {
                    cell.actual = Number(value);
                    cell.variance = cell.actual - cell.projected;
                    cell.pct = cell.projected === 0 ? '' : `${((cell.actual / cell.projected) * 100).toFixed(2)}%`;
                }
            }
            // recompute row totals
            let totalProj = 0;
            let totalAct = 0;
            updatedRow.outputs.forEach((cell) => {
                totalProj += this.toNumberSafe(cell.projected) || 0;
                totalAct += this.toNumberSafe(cell.actual) || 0;
            });
            totalProj += this.toNumberSafe(updatedRow.cross.projected) || 0;
            totalAct += this.toNumberSafe(updatedRow.cross.actual) || 0;
            updatedRow.total = {
                projected: totalProj,
                actual: totalAct,
                variance: totalAct - totalProj,
                pct: totalProj === 0 ? '' : `${((totalAct / totalProj) * 100).toFixed(2)}%`
            };
            return updatedRow;
        });

        this.rows = rowsCopy;
        this.summary = this.computeSummary(rowsCopy, this.columns.length);
    }

    handleSave() {
        this.error = '';
        this.saveMessage = '';
        const payload = Object.keys(this.pendingChanges || {}).map((id) => ({
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
            .catch((err) => {
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