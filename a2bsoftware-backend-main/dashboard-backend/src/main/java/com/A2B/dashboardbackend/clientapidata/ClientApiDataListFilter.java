package com.A2B.dashboardbackend.clientapidata;

import java.util.UUID;

public record ClientApiDataListFilter(String search, Integer approvedFilter, UUID countryId) {
}
