package com.A2B.dashboardbackend.projects;

public record ProjectStatisticsDto(
        int complete,
        int disqualify,
        int quotaFull,
        int securityTerm,
        int hits,
        int redirect,
        double epc,
        String abendond,
        int completeSurvey,
        String ir,
        int loi
) {
    public static ProjectStatisticsDto empty() {
        return new ProjectStatisticsDto(0, 0, 0, 0, 0, 0, 0d, "0.00", 0, "0.00", 15);
    }
}
