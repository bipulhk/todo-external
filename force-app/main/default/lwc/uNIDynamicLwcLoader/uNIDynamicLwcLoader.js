import { LightningElement, api } from 'lwc';

export default class UNIDynamicLwcLoader extends LightningElement {

    @api lwcName;
    @api lwcParams;
    lwcParams = {recordId: this._recordId, version: this.version }
    opsLwcParams = JSON.stringify(this.lwcParams)
    connectedCallback() {
        console.log('dynamic loader  : ', this.opsLwcParams);
    }

   /* set lwcName(value) {
    this._lwcName = value;
    console.log('Dynamic LWC loading component:', value);
    }
     get lwcName() {
    return this._lwcName;
     }

    // Or simply log in renderedCallback (runs after render)
    renderedCallback() {
        console.log('Current lwcName:', this.lwcName);
    } */
}