package com.A2B.dashboardbackend.clientapidata;

import java.util.UUID;

public record ClientApiDataRowDto(
        UUID id,
        String surveyId,
        String projectName,
        Integer reqComplete,
        Integer loi,
        Integer ir,
        Double cpc,
        Double vendorCpi,
        String surveyLink,
        String surveyTestLink,
        UUID languageId,
        UUID countryId,
        String countryName,
        UUID clientId,
        String clientName,
        UUID projectManagerId,
        String projectManager,
        UUID salesManagerId,
        String salesManagers,
        Integer approved,
        Integer topSurvey,
        Integer statusId,
        String status,
        String createdAt
) {
}
