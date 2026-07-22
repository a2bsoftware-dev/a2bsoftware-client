package com.A2B.dashboardbackend.vendors;

import java.util.UUID;

public record VendorSaveRequest(
        UUID id,
        String vendorName,
        String contactPerson,
        String contact,
        String email,
        String paymentTerms,
        String completeLink,
        String disqualifyLink,
        String qoutafullLink,
        String securityTermlink
) {
}
