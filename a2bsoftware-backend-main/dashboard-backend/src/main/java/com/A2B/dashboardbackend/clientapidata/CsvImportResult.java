package com.A2B.dashboardbackend.clientapidata;

import java.util.List;

public record CsvImportResult(int created, int updated, List<String> errors) {
}
