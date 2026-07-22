package com.A2B.dashboardbackend.qualifications;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ApplyQualificationRepository extends JpaRepository<ApplyQualification, UUID> {

    void deleteByProjectId(UUID projectId);
}
