package com.A2B.dashboardbackend.settings;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class SettingsService {

    private final SettingRepository settingRepository;

    @Value("${app.upload-dir:uploads}")
    private String uploadDir;

    public SettingsService(SettingRepository settingRepository) {
        this.settingRepository = settingRepository;
    }

    public List<Setting> listSettings() {
        return settingRepository.findAll();
    }

    public void updateSettings(Map<String, Object> body) {
        for (Map.Entry<String, Object> entry : body.entrySet()) {
            Setting setting = settingRepository.findByParam(entry.getKey()).orElseGet(() -> {
                Setting created = new Setting();
                created.setParam(entry.getKey());
                return created;
            });

            Object rawValue = entry.getValue();
            String value = rawValue instanceof Boolean bool ? (bool ? "1" : "0")
                    : rawValue != null ? String.valueOf(rawValue) : "";
            setting.setValue(value);
            settingRepository.save(setting);
        }

        log.info("Settings updated: {}", body.keySet());
    }

    public String storeUpload(MultipartFile file) {
        try {
            Path dir = Path.of(uploadDir);
            Files.createDirectories(dir);

            String safeName = System.currentTimeMillis() + "_" + file.getOriginalFilename().replaceAll("\\s+", "_");
            Path target = dir.resolve(safeName);
            file.transferTo(target);

            log.info("Stored branding upload: {}", safeName);
            return "/uploads/" + safeName;
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to store uploaded file", e);
        }
    }
}
