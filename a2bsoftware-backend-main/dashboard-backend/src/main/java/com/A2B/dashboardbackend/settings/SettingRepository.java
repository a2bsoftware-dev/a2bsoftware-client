package com.A2B.dashboardbackend.settings;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface SettingRepository extends JpaRepository<Setting, UUID> {

    Optional<Setting> findByParam(String param);
}
