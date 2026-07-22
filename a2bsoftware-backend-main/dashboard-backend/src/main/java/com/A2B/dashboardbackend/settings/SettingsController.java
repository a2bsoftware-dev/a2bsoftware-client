package com.A2B.dashboardbackend.settings;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/settings")
public class SettingsController {

    private final SettingsService settingsService;

    public SettingsController(SettingsService settingsService) {
        this.settingsService = settingsService;
    }

    @GetMapping
    public Map<String, Object> listSettings() {
        return Map.of("success", true, "settings", settingsService.listSettings());
    }

    @PostMapping
    public Map<String, Object> updateSettings(@RequestBody Map<String, Object> body) {
        settingsService.updateSettings(body);
        return Map.of("success", true, "message", "Record is successfully submitted");
    }

    @PostMapping("/upload")
    public Map<String, Object> upload(@RequestPart("file") MultipartFile file) {
        String relativeUrl = settingsService.storeUpload(file);
        return Map.of("success", true, "media", relativeUrl, "mediaLink", relativeUrl);
    }
}
