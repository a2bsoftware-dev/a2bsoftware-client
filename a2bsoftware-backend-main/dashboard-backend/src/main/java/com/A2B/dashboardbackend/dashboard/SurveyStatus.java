package com.A2B.dashboardbackend.dashboard;

public enum SurveyStatus {
    DROP(0, "Drop"),
    COMPLETE(1, "complete"),
    DISQUALIFY(2, "disqualify"),
    QUOTA_FULL(3, "quotaFull"),
    SECURITY_TERM(4, "securityTerm");

    private final int code;
    private final String label;

    SurveyStatus(int code, String label) {
        this.code = code;
        this.label = label;
    }

    public static String labelFor(Object statusValue) {
        if (!(statusValue instanceof Number number)) {
            return null;
        }
        for (SurveyStatus status : values()) {
            if (status.code == number.intValue()) {
                return status.label;
            }
        }
        return null;
    }
}
