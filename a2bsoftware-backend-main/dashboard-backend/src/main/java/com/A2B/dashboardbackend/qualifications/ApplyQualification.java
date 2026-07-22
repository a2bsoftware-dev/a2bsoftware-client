package com.A2B.dashboardbackend.qualifications;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.UuidGenerator;

import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "apply_qualifications")
public class ApplyQualification {

    @Id
    @UuidGenerator(style = UuidGenerator.Style.VERSION_7)
    private UUID id;

    @Column(name = "project_id")
    private UUID projectId;

    @Column(name = "question_id")
    private UUID questionId;

    /** Null means the whole question applies without pinning a specific option. */
    @Column(name = "option_id")
    private UUID optionId;
}
