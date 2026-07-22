package com.A2B.dashboardbackend.projects;

import java.util.List;
import java.util.UUID;

public record ProjectSaveRequest(
        UUID id,
        String projectName,
        UUID parentProjectId,
        Integer studyType,
        UUID countryId,
        UUID languageId,
        UUID currencyId,
        Double cpc,
        Double vendorCpi,
        String surveyLink,
        String surveyTestLink,
        Integer reqComplete,
        Integer loi,
        Integer ir,
        UUID clientId,
        UUID projectManagerId,
        UUID salesManagerId,
        String notes,
        String projectBrief,
        Integer status,
        List<String> allDevicesIds,
        List<String> allChecklistIds
) {
}
