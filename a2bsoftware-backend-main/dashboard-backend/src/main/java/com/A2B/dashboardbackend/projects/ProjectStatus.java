package com.A2B.dashboardbackend.projects;

import java.util.LinkedHashMap;
import java.util.Map;

public enum ProjectStatus {
    BIDDING(1, "Bidding"),
    TESTING(2, "Testing"),
    RUNNING(3, "Running"),
    HOLD(4, "Hold"),
    COMPLETED(5, "Completed"),
    AWAITING_IDS(6, "Awaiting-Ids"),
    CLOSED(7, "Closed");

    private final int code;
    private final String label;

    ProjectStatus(int code, String label) {
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
            return BIDDING.label;
        }
        for (ProjectStatus status : values()) {
            if (status.code == statusCode) {
                return status.label;
            }
        }
        return BIDDING.label;
    }

    public static Map<String, String> asOptionsMap() {
        Map<String, String> options = new LinkedHashMap<>();
        for (ProjectStatus status : values()) {
            options.put(String.valueOf(status.code), status.label);
        }
        return options;
    }
}
