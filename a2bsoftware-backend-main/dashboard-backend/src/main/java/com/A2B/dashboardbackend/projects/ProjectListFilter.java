package com.A2B.dashboardbackend.projects;

import java.util.UUID;

public record ProjectListFilter(
        UUID id,
        UUID parentProjectId,
        String projectName,
        Integer status,
        UUID clientId,
        UUID projectManagerId,
        UUID countryId,
        UUID salesManagerId
) {
}
