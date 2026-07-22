package com.A2B.dashboardbackend.clientapidata;

import java.util.List;
import java.util.UUID;

public record BulkOperationRequest(List<UUID> projectIds, Integer type) {
}
