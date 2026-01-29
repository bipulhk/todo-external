public with sharing class uNI_AnnualReportYearChoices {
    public class Request {
        @InvocableVariable(required=true)
        public Date implementationStartDate;

        @InvocableVariable(required=true)
        public Date implementationEndDate;
    }

    public class Response {
        @InvocableVariable
        public String year;
    }

    @InvocableMethod(label='Get Annual Report Year Choices')
    public static List<Response> getYearChoices(List<Request> requests) {
        List<Response> results = new List<Response>();
        Integer currentYear = Date.today().year();

        for (Request req : requests) {
            if (req == null || req.implementationStartDate == null || req.implementationEndDate == null) {
                continue;
            }

            Integer startYear = req.implementationStartDate.year();
            Integer endYear = req.implementationEndDate.year();
            Integer firstSelectableYear = (startYear > currentYear) ? startYear : currentYear;

            for (Integer yearValue = firstSelectableYear; yearValue <= endYear; yearValue++) {
                Response res = new Response();
                res.year = String.valueOf(yearValue);
                results.add(res);
            }
        }

        return results;
    }
}