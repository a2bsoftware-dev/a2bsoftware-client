package com.A2B.dashboardbackend.projects;

public enum ProjectSurveyStatus {
    DROP(0, "Drop"),
    COMPLETE(1, "Complete"),
    DISQUALIFY(2, "Disqualify"),
    QUOTA_FULL(3, "quotaFull"),
    SECURITY_TERM(4, "securityTerm");

    private final int code;
    private final String label;

    ProjectSurveyStatus(int code, String label) {
        this.code = code;
        this.label = label;
    }

    public int getCode() {
        return code;
    }

    public String getLabel() {
        return label;
    }

    public static String labelFor(Integer statusCode) {
        if (statusCode == null) {
            return DROP.label;
        }
        for (ProjectSurveyStatus status : values()) {
            if (status.code == statusCode) {
                return status.label;
            }
        }
        return DROP.label;
    }
}
