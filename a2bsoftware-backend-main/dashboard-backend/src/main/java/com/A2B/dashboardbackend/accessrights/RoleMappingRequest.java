package com.A2B.dashboardbackend.accessrights;

import java.util.List;
import java.util.UUID;

public record RoleMappingRequest(UUID roleId, List<Integer> accessRightIds) {
}
