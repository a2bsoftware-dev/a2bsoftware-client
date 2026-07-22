package com.A2B.dashboardbackend.clientapidata;

import java.util.UUID;

public record ApiSettingsSaveRequest(String apiName, UUID clientId) {
}
