package com.A2B.dashboardbackend.qualifications;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface QuestionRepository extends JpaRepository<Question, UUID> {

    List<Question> findByProjectId(UUID projectId);

    void deleteByProjectId(UUID projectId);
}
