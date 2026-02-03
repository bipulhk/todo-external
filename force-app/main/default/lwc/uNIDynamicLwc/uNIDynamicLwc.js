import { LightningElement, api, track } from 'lwc';

export default class UNIDynamicLwc extends LightningElement {

    @api lwcName;
    @api lwcParams;

    @track componentConstructor;

  // Watch for changes to lwcName to dynamically import the component
  async renderedCallback() {
    if (this.lwcName) {
      await this.loadComponent(this.lwcName);
    }
  }
  get lwcParamString()
  {
    return this.lwcParams;

  }

  async loadComponent(lwcName) {
    try {
      let importPath = this.getImportPath(lwcName);
    console.log('importPath ' + importPath);
      if (!importPath) {
        console.error(`No import path found for component: ${lwcName}`);
        this.componentConstructor = null;
        return;
      }

      let module = await import(importPath);
          console.log('module ' + module);

      this.componentConstructor = module.default;
    } catch (error) {
      console.error('Error importing component:', error);
      this.componentConstructor = null;
    }
  }

  getImportPath(lwcName) {
    // Map kebab-case lwcName to module import paths (PascalCase folder names)
    const map = {
      'c-u-n-i-annual-report-overview': 'c/uNIAnnualReportOverview',
      'c-u-n-i-milestones': 'c/uNIMilestones',
      'c-u-n-i-indicators': 'c/uNIIndicators',
      'uNI_FinalcialAuditAnnualReport': 'c/uNI_FinalcialAuditAnnualReport',
      'uNI_ManagementActionAnnualReport': 'c/uNI_ManagementActionAnnualReport',
      'uNI_IncidentMgmtAnnualReport': 'c/uNI_IncidentMgmtAnnualReport',
      'uNI_ARBudget' : 'c/uNI_ARBudget', 
      'uNI_RiskRegisterLWC': 'c/uNI_RiskRegisterLWC',
      'c-u-n-i-audit': 'c/uNIAudit',
      'uNI_FERatesv': 'c/uNI_FERatesv',
      'uNI_BudgetOverview' : 'c/uNI_BudgetOverview',
      'uNI_BudgetData' : 'c/uNI_BudgetData',
      'uNI_CoFunding' : 'c/uNI_CoFunding',
      'uNI_StaffAllocations' : 'c/uNI_StaffAllocations', 
      'uNI_sd_milestoneTracker' : 'c/uNI_sd_milestoneTracker',
      'uNI_sd_milestoneTimeline' : 'c/uNI_sd_milestoneTimeline',
      'uNIInvestmentOverviewPage': 'c/uNIInvestmentOverviewPage',
      'c-u-n-i-investment-proposal': 'c/uNIProposalSubtab',
      'c-u-n-i-investment-implementation': 'c/uNIInvestmentSubtab'
    };

    return map[lwcName];
  }
}
