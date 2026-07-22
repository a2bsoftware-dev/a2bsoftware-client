package com.A2B.dashboardbackend.clientapidata;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record ZampliaResponse<T>(boolean success, ZampliaResult<T> result) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ZampliaResult<T>(List<T> data) {
    }

    public List<T> dataOrEmpty() {
        return success && result != null && result.data() != null ? result.data() : List.of();
    }
}
