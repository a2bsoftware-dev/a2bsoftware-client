package com.A2B.dashboardbackend.dashboard;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/survey-informations")
    public Map<String, Object> getTodaySurveyInformations() {
        return Map.of("success", true, "surveyInformations", dashboardService.getTodaySurveyInformations());
    }

    @GetMapping("/project-status")
    public Map<String, Object> getProjectStatus() {
        return Map.of("success", true, "projectStatus", dashboardService.getProjectStatus());
    }

    @GetMapping("/monthly-statistics")
    public Map<String, Object> getMonthlyStatistics() {
        return Map.of("success", true, "monthlyStastics", dashboardService.getMonthlyStatistics());
    }

    @PostMapping("/export")
    public ResponseEntity<byte[]> exportDailyStatistics(@RequestBody List<ExportRow> rows) {
        byte[] csv = dashboardService.buildCsv(rows).getBytes(StandardCharsets.UTF_8);
        String filename = "daily_survey_export_" + System.currentTimeMillis() + ".csv";
        log.info("Exporting {} rows to {}", rows.size(), filename);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csv);
    }
}
