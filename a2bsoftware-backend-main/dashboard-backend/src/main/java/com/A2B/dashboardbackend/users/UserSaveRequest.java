package com.A2B.dashboardbackend.users;

import java.util.UUID;

public record UserSaveRequest(
        UUID id,
        String userName,
        String mobile,
        String email,
        String checkPassword,
        UUID roleId
) {
}
