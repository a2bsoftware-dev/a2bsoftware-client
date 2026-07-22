package com.A2B.dashboardbackend.projects;

import java.util.UUID;

public record SurveyDetailRowDto(
        UUID id,
        UUID pid,
        UUID gid,
        String vendorName,
        String projectName,
        String clientName,
        String startIpAddress,
        String endIpAddress,
        String startTime,
        String endTime,
        String startDate,
        String endDate,
        String refId,
        String userId,
        String loi,
        String status,
        String countryName
) {
}
