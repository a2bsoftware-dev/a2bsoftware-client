package com.A2B.dashboardbackend.clientapidata;

import java.util.UUID;

public record ClientApiDataSaveRequest(
        UUID id,
        String surveyId,
        String projectName,
        Integer reqComplete,
        Integer loi,
        Integer ir,
        Double cpc,
        String surveyLink,
        UUID languageId,
        UUID countryId,
        Integer approved
) {
}
