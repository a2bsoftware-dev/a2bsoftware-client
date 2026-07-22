package com.A2B.dashboardbackend.projects;

import java.util.UUID;

public record ProjectListItemDto(
        UUID id,
        UUID parentProjectId,
        String projectName,
        String surveyLink,
        String countryName,
        String clientName,
        String projectManager,
        String salesManagers,
        String startDateCreated,
        int hits,
        int complete,
        int disqualify,
        int quotaFull,
        int securityTerm,
        int drop,
        String abendond,
        String ir,
        Integer loi,
        Integer statusId,
        String status,
        Integer copyForClient
) {
}
