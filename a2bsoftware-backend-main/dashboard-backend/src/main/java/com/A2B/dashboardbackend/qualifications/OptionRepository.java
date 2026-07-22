package com.A2B.dashboardbackend.qualifications;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface OptionRepository extends JpaRepository<Option, UUID> {

    List<Option> findByQuestionIdIn(Collection<UUID> questionIds);

    void deleteByQuestionIdIn(Collection<UUID> questionIds);
}
