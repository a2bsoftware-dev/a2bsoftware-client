package com.A2B.dashboardbackend.projects;

import java.util.UUID;

public interface PidStatusCount {
    UUID getPid();

    Integer getStatus();

    Long getTotal();
}
