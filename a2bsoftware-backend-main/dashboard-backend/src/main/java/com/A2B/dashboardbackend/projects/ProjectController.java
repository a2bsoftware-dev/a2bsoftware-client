package com.A2B.dashboardbackend.projects;

import com.A2B.dashboardbackend.common.PagedResult;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/projects")
public class ProjectController {

    private final ProjectService projectService;

    public ProjectController(ProjectService projectService) {
        this.projectService = projectService;
    }

    @GetMapping
    public Map<String, Object> listProjects(
            @RequestParam(defaultValue = "1") int pageNo,
            @RequestParam(defaultValue = "10") int maxPerPage,
            @RequestParam(required = false) UUID id,
            @RequestParam(required = false) UUID parentProjectId,
            @RequestParam(required = false) String projectName,
            @RequestParam(required = false) Integer status,
            @RequestParam(required = false) UUID clientId,
            @RequestParam(required = false) UUID projectManagerId,
            @RequestParam(required = false) UUID countryId,
            @RequestParam(required = false) UUID salesManagerId
    ) {
        ProjectListFilter filter = new ProjectListFilter(id, parentProjectId, projectName, status, clientId,
                projectManagerId, countryId, salesManagerId);
        PagedResult<ProjectListItemDto> result = projectService.listProjects(filter, pageNo, maxPerPage);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("projects", result.items());
        response.put("total", result.total());
        return response;
    }

    @GetMapping("/filter-options")
    public Map<String, Object> getFilterOptions() {
        Map<String, Object> response = new HashMap<>(projectService.getFilterOptions());
        response.put("success", true);
        return response;
    }

    @GetMapping("/form-data")
    public Map<String, Object> getFormData(@RequestParam(required = false) UUID id) {
        Map<String, Object> response = new HashMap<>(projectService.getFormData(id));
        response.put("success", true);
        return response;
    }

    @PostMapping
    public Map<String, Object> createProject(@RequestBody ProjectSaveRequest request) {
        ProjectSaveResult result = projectService.saveProject(request);
        return Map.of("success", result.success(), "message", result.message());
    }

    @PutMapping("/{id}")
    public Map<String, Object> updateProject(@PathVariable UUID id, @RequestBody ProjectSaveRequest request) {
        ProjectSaveRequest withId = new ProjectSaveRequest(id, request.projectName(), request.parentProjectId(),
                request.studyType(), request.countryId(), request.languageId(), request.currencyId(), request.cpc(),
                request.vendorCpi(), request.surveyLink(), request.surveyTestLink(), request.reqComplete(),
                request.loi(), request.ir(), request.clientId(), request.projectManagerId(), request.salesManagerId(),
                request.notes(), request.projectBrief(), request.status(), request.allDevicesIds(), request.allChecklistIds());
        ProjectSaveResult result = projectService.saveProject(withId);
        return Map.of("success", result.success(), "message", result.message());
    }

    @PatchMapping("/{id}/status")
    public Map<String, Object> updateStatus(@PathVariable UUID id, @RequestParam Integer statusId) {
        String statusLabel = projectService.updateStatus(id, statusId);
        return Map.of("success", true, "message", "Status was successfully changed", "status", statusLabel);
    }

    @DeleteMapping("/{id}")
    public Map<String, Object> deleteProject(@PathVariable UUID id) {
        projectService.deleteProject(id);
        return Map.of("success", true, "message", "Project is successfully deleted");
    }

    @PostMapping("/{id}/copy")
    public Map<String, Object> copyProject(@PathVariable UUID id) {
        Project copy = projectService.copyProject(id);
        return Map.of("success", true, "message", "Project was successfully duplicated", "project", copy);
    }

    @GetMapping("/survey-filter-options")
    public Map<String, Object> getSurveyFilterOptions() {
        Map<String, Object> response = new HashMap<>(projectService.getSurveyFilterOptions());
        response.put("success", true);
        return response;
    }

    @GetMapping("/survey-details")
    public Map<String, Object> listSurveyDetails(
            @RequestParam(defaultValue = "1") int pageNo,
            @RequestParam(defaultValue = "10") int maxPerPage,
            @RequestParam(required = false) UUID projectId,
            @RequestParam(required = false) Integer status,
            @RequestParam(required = false) UUID gid,
            @RequestParam(required = false) UUID countryId
    ) {
        SurveyDetailFilter filter = new SurveyDetailFilter(projectId, status, gid, countryId);
        PagedResult<SurveyDetailRowDto> result = projectService.listSurveyDetails(filter, pageNo, maxPerPage);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("surveyInformations", result.items());
        response.put("total", result.total());
        return response;
    }

    @GetMapping("/survey-details/export")
    public ResponseEntity<byte[]> exportSurveyDetails(
            @RequestParam(required = false) UUID projectId,
            @RequestParam(required = false) Integer status,
            @RequestParam(required = false) UUID gid,
            @RequestParam(required = false) UUID countryId
    ) {
        SurveyDetailFilter filter = new SurveyDetailFilter(projectId, status, gid, countryId);
        var rows = projectService.listSurveyDetailsForExport(filter);
        byte[] csv = projectService.buildSurveyDetailsCsv(rows).getBytes(StandardCharsets.UTF_8);
        String filename = "survey_details_project_" + (projectId != null ? projectId : "all") + ".csv";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csv);
    }
}
