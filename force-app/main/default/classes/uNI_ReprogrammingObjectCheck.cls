/**
 * ――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――
 * Class Name      : uNI_ReprogrammingObjectCheck
 * Author          : <YourName>
 * Created Date    : Jan 8, 2026
 * Last Modified By: <YourName>
 * Last Modified On: Jan 8, 2026
 * Description     : This class returns the object api of the recordId , used to get the object name from an recordId called from a flow
 
 *  
 * Change History  :
 *  Date          │   Author     │   Change
 * ――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――
 *  Jan 8, 2026  │ <YourName>   │ Initial version
 * ――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――
 */


public with sharing class uNI_ReprogrammingObjectCheck {
    public class Input {
        @InvocableVariable(required=true)
        public Id recordId;
    }
    public class Output {
        @InvocableVariable
        public String objectApiName;
    }

    @InvocableMethod(label='Get Object API Name from Record Id')
    public static List<Output> run(List<Input> inputs) {
        List<Output> results = new List<Output>();
        for (Input i : inputs) {
            Output o = new Output();
            if (i == null || i.recordId == null) {
                o.objectApiName = null;
            } else {
                o.objectApiName = String.valueOf(i.recordId.getSObjectType());
            }
            results.add(o);
        }
        return results;
    }

    @AuraEnabled(cacheable=true)
    public static String getObjectApiName(Id recordId) {
        if (recordId == null) {
            return null;
        }
        return String.valueOf(recordId.getSObjectType());
    }
}