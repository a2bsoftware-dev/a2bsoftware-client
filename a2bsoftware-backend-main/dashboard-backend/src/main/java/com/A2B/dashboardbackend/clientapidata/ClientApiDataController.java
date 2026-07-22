package com.A2B.dashboardbackend.clientapidata;

import com.A2B.dashboardbackend.common.PagedResult;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/client-api-data")
public class ClientApiDataController {

    private final ClientApiDataService service;

    public ClientApiDataController(ClientApiDataService service) {
        this.service = service;
    }

    @GetMapping
    public Map<String, Object> listCampaigns(
            @RequestParam(defaultValue = "1") int pageNo,
            @RequestParam(defaultValue = "10") int maxPerPage,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Integer approvedFilter,
            @RequestParam(required = false) UUID countryId,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) String sortDir
    ) {
        ClientApiDataListFilter filter = new ClientApiDataListFilter(search, approvedFilter, countryId);
        PagedResult<ClientApiDataRowDto> result = service.listCampaigns(filter, pageNo, maxPerPage, sortBy, sortDir);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("clientData", result.items());
        response.put("total", result.total());
        return response;
    }

    @GetMapping("/form-data")
    public Map<String, Object> getFormData() {
        Map<String, Object> response = new HashMap<>(service.getFormData());
        response.put("success", true);
        return response;
    }

    @PostMapping("/settings")
    public Map<String, Object> saveApiSettings(@RequestBody ApiSettingsSaveRequest request) {
        service.saveApiSettings(request);
        return Map.of("success", true, "message", "Settings was successfully changed");
    }

    @PostMapping
    public Map<String, Object> createCampaign(@RequestBody ClientApiDataSaveRequest request) {
        ClientApiDataSaveResult result = service.saveCampaign(request);
        return Map.of("success", result.success(), "message", result.message());
    }

    @PutMapping("/{id}")
    public Map<String, Object> updateCampaign(@PathVariable UUID id, @RequestBody ClientApiDataSaveRequest request) {
        ClientApiDataSaveRequest withId = new ClientApiDataSaveRequest(id, request.surveyId(), request.projectName(),
                request.reqComplete(), request.loi(), request.ir(), request.cpc(), request.surveyLink(),
                request.languageId(), request.countryId(), request.approved());
        ClientApiDataSaveResult result = service.saveCampaign(withId);
        return Map.of("success", result.success(), "message", result.message());
    }

    @PostMapping("/bulk-operation")
    public Map<String, Object> bulkOperation(@RequestBody BulkOperationRequest request) {
        String message = service.bulkOperation(request);
        return Map.of("success", true, "message", message);
    }

    @DeleteMapping("/{id}")
    public Map<String, Object> deleteCampaign(@PathVariable UUID id) {
        String message = service.bulkOperation(new BulkOperationRequest(List.of(id), 1));
        return Map.of("success", true, "message", message);
    }

    @PostMapping("/sync")
    public Map<String, Object> syncFeed(@RequestParam(required = false) UUID countryId) {
        log.info("Syncing Zamplia survey feed (countryId={})", countryId);
        String message = service.syncFeed(countryId);
        return Map.of("success", true, "message", message);
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportCsv(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Integer approvedFilter,
            @RequestParam(required = false) UUID countryId
    ) {
        ClientApiDataListFilter filter = new ClientApiDataListFilter(search, approvedFilter, countryId);
        List<ClientApiDataRowDto> rows = service.listCampaignsForExport(filter);
        byte[] csv = service.buildCsv(rows).getBytes(StandardCharsets.UTF_8);
        String filename = "client_api_data_export_" + System.currentTimeMillis() + ".csv";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csv);
    }

    @PostMapping("/import")
    public Map<String, Object> importCsv(@RequestPart("file") MultipartFile file) {
        CsvImportResult result = service.importCsv(file);
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("created", result.created());
        response.put("updated", result.updated());
        response.put("skipped", result.errors().size());
        response.put("errors", result.errors());
        return response;
    }

    @GetMapping("/qualifications")
    public Map<String, Object> previewQualifications(@RequestParam String surveyId, @RequestParam(required = false) UUID languageId) {
        List<QualificationPreviewDto> qualifications = service.previewQualifications(surveyId, languageId);
        return Map.of("success", true, "qualifications", qualifications);
    }

    @PostMapping("/{id}/import-qualifications")
    public Map<String, Object> importQualifications(@PathVariable UUID id, @RequestParam String surveyId,
                                                      @RequestParam(required = false) UUID languageId) {
        String message = service.importQualifications(id, surveyId, languageId);
        return Map.of("success", true, "message", message);
    }
}
