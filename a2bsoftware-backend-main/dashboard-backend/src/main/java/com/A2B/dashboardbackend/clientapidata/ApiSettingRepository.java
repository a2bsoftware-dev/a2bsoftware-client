package com.A2B.dashboardbackend.clientapidata;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ApiSettingRepository extends JpaRepository<ApiSetting, UUID> {

    Optional<ApiSetting> findTopByOrderByIdAsc();
}
