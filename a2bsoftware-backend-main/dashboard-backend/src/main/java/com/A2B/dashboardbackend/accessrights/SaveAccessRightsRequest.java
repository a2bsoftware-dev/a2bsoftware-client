package com.A2B.dashboardbackend.accessrights;

import java.util.List;

public record SaveAccessRightsRequest(List<RoleMappingRequest> roleMappings) {
}
