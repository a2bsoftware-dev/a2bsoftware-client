package com.A2B.dashboardbackend.projects;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface StartSurveyInformationRepository
        extends JpaRepository<StartSurveyInformation, UUID>, JpaSpecificationExecutor<StartSurveyInformation> {

    List<StartSurveyInformation> findByPid(UUID pid);

    @Query("""
            SELECT s.pid AS pid, s.status AS status, COUNT(s) AS total
            FROM StartSurveyInformation s
            WHERE s.pid IN :pids
            GROUP BY s.pid, s.status
            """)
    List<PidStatusCount> countByPidAndStatusIn(@Param("pids") List<UUID> pids);
}
