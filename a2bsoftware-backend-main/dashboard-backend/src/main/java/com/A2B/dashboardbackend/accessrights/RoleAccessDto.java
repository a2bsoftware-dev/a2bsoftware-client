package com.A2B.dashboardbackend.accessrights;

import java.util.List;
import java.util.UUID;

public record RoleAccessDto(UUID id, String name, List<Integer> accessRightIds) {
}
