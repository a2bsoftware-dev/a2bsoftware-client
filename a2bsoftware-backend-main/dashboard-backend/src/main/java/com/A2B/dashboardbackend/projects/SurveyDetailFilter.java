package com.A2B.dashboardbackend.projects;

import java.util.UUID;

public record SurveyDetailFilter(
        UUID projectId,
        Integer status,
        UUID gid,
        UUID countryId
) {
}
