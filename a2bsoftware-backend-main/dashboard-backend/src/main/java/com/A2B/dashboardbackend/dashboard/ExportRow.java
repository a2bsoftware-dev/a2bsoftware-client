package com.A2B.dashboardbackend.dashboard;

import com.fasterxml.jackson.annotation.JsonProperty;

public record ExportRow(
        String pid,
        String gid,
        String vendorName,
        @JsonProperty("project_name") String projectName,
        String clientName,
        @JsonProperty("start_ip_address") String startIpAddress,
        @JsonProperty("end_ip_address") String endIpAddress,
        @JsonProperty("start_time") String startTime,
        @JsonProperty("end_time") String endTime,
        @JsonProperty("start_date") String startDate,
        @JsonProperty("end_date") String endDate,
        @JsonProperty("ref_id") String refId,
        @JsonProperty("user_id") String userId,
        @JsonProperty("country_name") String countryName,
        @JsonProperty("client_cpi") Double clientCpi,
        @JsonProperty("vendor_cpi") Double vendorCpi,
        Double profit
) {
}
