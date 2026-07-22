package com.A2B.dashboardbackend.clients;

import java.util.UUID;

public record ClientSaveRequest(
        UUID id,
        String clientName,
        String contactPerson,
        String contact,
        String email,
        String paymentTerms
) {
}
